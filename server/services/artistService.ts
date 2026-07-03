/**
 * artistService.ts
 *
 * Backend service for signing an artist to the roster. Extracted from the fat
 * sign handler in server/routes/artists.ts (Phase 1, PR-18):
 *   - POST /api/game/:gameId/artists  (was routes/artists.ts:165-287)
 *
 * Follows the class+singleton convention of gameCreationService.ts /
 * releasePlanningService.ts. The service throws coded ArtistServiceError
 * instances; the route layer keeps ALL HTTP status mapping (each error carries
 * the exact JSON body the route must send).
 *
 * HARDENING (PR-18), addressing findings B1/B2/B5/B6 in
 * AR_OFFICE_DISCOVERY_SIGNING_CODE_REVIEW_2026-07-02.md:
 *   B1 — Signing cost and stats are now DERIVED SERVER-SIDE from
 *        data/artists.json keyed by the discovered record's content id, with
 *        the discovered record's own stats as fallback. Client-supplied
 *        signingCost / talent / popularity / weeklyCost / archetype / genre are
 *        IGNORED. Only presentation fields the client legitimately owns
 *        (signedWeek, signed) plus the name (for confirmation) pass through.
 *        Also: the artist MUST be present in flags.ar_office_discovered_artists
 *        (ARTIST_NOT_DISCOVERED otherwise) — you can no longer fabricate one.
 *   B2 — createArtist + money deduction + flags update now run in ONE db
 *        transaction, recomputing flags from a FRESH read inside the tx so a
 *        concurrent flags write is not lost.
 *   B5 — The 3-artist roster cap is now enforced server-side (ROSTER_FULL).
 *   B6 — The dead, off-by-one `signed_artists_count` flag write is DELETED.
 */
import { eq } from 'drizzle-orm';
import { db as dbSingleton } from '../db';
import { storage } from '../storage';
import { serverGameData } from '../data/gameData';
import { artists, gameStates, emails, type GameState } from '@shared/schema';

// HARDCODED: roster cap should live in balance config
const ROSTER_CAP = 3;

/**
 * A coded error whose `body` is the EXACT JSON payload the route returns for
 * this failure mode, and whose `status` is the HTTP status the route sends.
 * The route layer maps: res.status(err.status).json(err.body).
 */
export class ArtistServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly body: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'ArtistServiceError';
  }
}

export class ArtistService {
  constructor(private db = dbSingleton) {}

  /**
   * Sign an artist to the roster: resolve the discovered-pool record, derive
   * cost/stats server-side, enforce funds + roster cap + duplicate-name guards,
   * then in a single transaction create the artist, deduct the derived cost, and
   * update the discovered/pending-fee flags. Generates the welcome email
   * (non-fatally) after the transaction commits.
   *
   * `gameState` is the owner-verified game row (from requireGameOwner). Returns
   * the created artist row (the route wraps it as res.json(artist)).
   */
  async signArtist(userId: string | undefined, gameId: string, gameState: GameState, body: any) {
    const flags = (gameState.flags || {}) as Record<string, any>;
    const discoveredPool: any[] = Array.isArray(flags.ar_office_discovered_artists)
      ? flags.ar_office_discovered_artists
      : [];

    // 1. Resolve the discovered record: match by content id first, then by
    //    name (case-insensitive) as a fallback (identity is fragile — the pool
    //    carries both id and name).
    const requestedId = body?.id;
    const requestedNameLc = String(body?.name || '').toLowerCase();
    const discovered =
      (requestedId && discoveredPool.find((a) => a?.id === requestedId)) ||
      (requestedNameLc && discoveredPool.find((a) => String(a?.name || '').toLowerCase() === requestedNameLc)) ||
      null;

    if (!discovered) {
      throw new ArtistServiceError('ARTIST_NOT_DISCOVERED', 400, {
        error: 'ARTIST_NOT_DISCOVERED',
        message: 'Artist is not in your discovered pool',
      });
    }

    // 2. Derive cost + stats server-side. data/artists.json is authoritative;
    //    fall back to the discovered record's own stats for fields JSON lacks.
    //    Client-supplied signingCost/talent/popularity/weeklyCost/archetype/
    //    genre are IGNORED (B1).
    const jsonArtists = await serverGameData.getAllArtists();
    const jsonRecord: any = jsonArtists.find((a: any) => a.id === discovered.id) || {};

    const signingCost = Number(jsonRecord.signingCost ?? discovered.signingCost ?? 0);
    const weeklyCost = Number(jsonRecord.weeklyCost ?? discovered.weeklyCost ?? 1200);
    const talent = Number(jsonRecord.talent ?? discovered.talent ?? 50);
    const popularity = Number(jsonRecord.popularity ?? discovered.popularity ?? 0);
    const archetype = String(jsonRecord.archetype ?? discovered.archetype ?? 'Unknown');
    const genre = jsonRecord.genre ?? discovered.genre ?? null;
    const name = String(discovered.name ?? jsonRecord.name ?? body?.name ?? 'Unknown');

    // 3. Roster cap (B5). HARDCODED: 3 — see ROSTER_CAP above.
    const existing = await storage.getArtistsByGame(gameId);
    if (existing.length >= ROSTER_CAP) {
      throw new ArtistServiceError('ROSTER_FULL', 409, {
        error: 'ROSTER_FULL',
        message: 'Roster is full (3 artists max)',
      });
    }

    // 4. Duplicate-name guard (case-insensitive), preserved from the original.
    const nameLc = name.toLowerCase();
    if (nameLc && existing.some((a) => (a.name || '').toLowerCase() === nameLc)) {
      throw new ArtistServiceError('DUPLICATE_ARTIST', 409, {
        code: 'DUPLICATE_ARTIST',
        message: 'This artist is already signed to your roster.',
      });
    }

    // 5. Funds check against the DERIVED cost (preserving original status/body).
    if ((gameState.money || 0) < signingCost) {
      throw new ArtistServiceError('INSUFFICIENT_FUNDS', 400, {
        message: 'Insufficient funds to sign artist',
      });
    }

    // 6. Atomic: create artist + deduct money + update flags in one tx (B2).
    //    Flags are recomputed from a FRESH read inside the tx so a concurrent
    //    write is not clobbered by the stale snapshot.
    const artist = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(artists)
        .values({
          gameId,
          // Presentation fields the client legitimately owns.
          name,
          signedWeek: body?.signedWeek ?? gameState.currentWeek ?? 1,
          signed: body?.signed ?? true,
          // Server-derived economic + stat fields.
          signingCost,
          weeklyCost,
          talent,
          popularity,
          archetype,
          genre,
        })
        .returning();

      // Deduct the derived cost.
      if (signingCost > 0) {
        await tx
          .update(gameStates)
          .set({ money: Math.max(0, (gameState.money || 0) - signingCost) })
          .where(eq(gameStates.id, gameId));
      }

      // Recompute flags from a fresh read INSIDE the transaction.
      const [freshGame] = await tx.select().from(gameStates).where(eq(gameStates.id, gameId));
      const freshFlags = (freshGame?.flags || {}) as Record<string, any>;

      // B6: the dead, off-by-one `signed_artists_count` write is intentionally
      // NOT re-added here — it was never read anywhere.

      // Append the pending signing fee (only when there is a cost).
      if (signingCost > 0) {
        if (!Array.isArray(freshFlags.pending_signing_fees)) {
          freshFlags.pending_signing_fees = [];
        }
        freshFlags.pending_signing_fees.push({
          artistId: created.id,
          name: created.name,
          amount: signingCost,
          week: gameState.currentWeek || 1,
          recordedAt: new Date().toISOString(),
        });
      }

      // Remove this artist from the discovered collection by content id / name.
      if (Array.isArray(freshFlags.ar_office_discovered_artists)) {
        const signedNameLc = String(created.name || '').toLowerCase();
        freshFlags.ar_office_discovered_artists = freshFlags.ar_office_discovered_artists.filter((a: any) => {
          const aNameLc = String(a?.name || '').toLowerCase();
          return (discovered.id ? a.id !== discovered.id : true) && aNameLc !== signedNameLc;
        });
      }

      // Legacy cleanup: clear the persisted singular discovered fields when they
      // point at this artist.
      if (freshFlags.ar_office_discovered_artist_id && freshFlags.ar_office_discovered_artist_id === discovered.id) {
        delete freshFlags.ar_office_discovered_artist_id;
        delete freshFlags.ar_office_discovered_artist_info;
      }

      await tx.update(gameStates).set({ flags: freshFlags as any }).where(eq(gameStates.id, gameId));

      return created;
    });

    // 7. Welcome email (non-fatal, preserved behavior). Uses the label name off
    //    the game state; failures are logged but do not fail the signing.
    try {
      const labelDisplay =
        (gameState as any).labelName || (gameState as any).musicLabel?.name || 'your label';
      const emailBody = {
        artistId: artist.id,
        name: artist.name,
        archetype: artist.archetype ?? 'Unknown',
        talent: artist.talent ?? 0,
        genre: artist.genre ?? null,
        signingCost,
        weeklyCost: artist.weeklyCost ?? null,
      };

      await storage.createEmail({
        gameId,
        week: gameState.currentWeek ?? 1,
        category: 'ar',
        sender: 'Marcus "Mac" Rodriguez',
        senderRoleId: 'head_ar',
        subject: `Artist Signed – ${artist.name}`,
        preview: `${artist.name} has officially signed with ${labelDisplay}!`,
        body: emailBody,
        metadata: emailBody,
        isRead: false,
      });
      console.log(`[ARTIST SIGNING] Generated welcome email for ${artist.name}`);
    } catch (emailError) {
      console.error('[ARTIST SIGNING] Failed to generate welcome email:', emailError);
      // Don't fail the signing if email generation fails.
    }

    return artist;
  }
}

// Export singleton instance
export const artistService = new ArtistService();
