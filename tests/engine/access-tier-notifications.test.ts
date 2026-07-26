/**
 * C61 — direction-aware access-tier notifications
 * (ProgressionProcessor.updateAccessTiers).
 *
 * Reputation losses are x3 on the 0-700 scale, so tier DOWNGRADES are
 * player-reachable. The legacy notification fired "… Access Upgraded" on ANY
 * tier change to a non-'none' tier (a downgrade announced an upgrade), and a
 * drop all the way to 'none' announced nothing. This suite pins the fix:
 *  - upgrades keep the exact legacy "… Access Upgraded" strings (golden master
 *    depends on them) and still stamp tierUnlockHistory;
 *  - downgrades emit "… Access Downgraded" (never "Upgraded") and do NOT stamp
 *    tierUnlockHistory;
 *  - a drop to 'none' emits "… Access Lost";
 *  - a fresh game (undefined → 'none') stays silent, as before;
 *  - downgrade/lost notifications are GATED on the previous tier being stamped
 *    in tierUnlockHistory ("only announce losing what we announced you
 *    gained") — a raw-seeded, never-earned tier downgrades silently, which is
 *    what keeps the golden master byte-identical.
 */
import { describe, it, expect } from 'vitest';
import { ProgressionProcessor } from '@shared/engine/processors/ProgressionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';

const TIERS = {
  playlist_access: {
    none: { threshold: 0 },
    niche: { threshold: 10 },
    mid: { threshold: 50 },
    flagship: { threshold: 90 },
  },
  press_access: {
    none: { threshold: 0 },
    blogs: { threshold: 10 },
    mid_tier: { threshold: 50 },
    national: { threshold: 90 },
  },
  venue_access: {
    none: { threshold: 0 },
    clubs: { threshold: 5 },
    theaters: { threshold: 20 },
    arenas: { threshold: 45 },
  },
};

function buildCtx(overrides: {
  reputation: number;
  playlistAccess?: string;
  pressAccess?: string;
  venueAccess?: string;
  tierUnlockHistory?: Record<string, any>;
}): WeekContext {
  const gameState: any = {
    id: 'game-tiers',
    currentWeek: 15,
    reputation: overrides.reputation,
    playlistAccess: overrides.playlistAccess,
    pressAccess: overrides.pressAccess,
    venueAccess: overrides.venueAccess,
  };
  if (overrides.tierUnlockHistory) gameState.tierUnlockHistory = overrides.tierUnlockHistory;
  return {
    gameState,
    summary: { week: 15, changes: [], reputationChanges: {} } as any,
    gameData: { getAccessTiersSync: () => TIERS } as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
  } as WeekContext;
}

describe('updateAccessTiers — C61 direction-aware notifications', () => {
  it('UPGRADE keeps the exact legacy strings and stamps tierUnlockHistory', () => {
    const ctx = buildCtx({ reputation: 55, playlistAccess: 'niche', pressAccess: 'blogs', venueAccess: 'theaters' });
    const changes = new ProgressionProcessor().updateAccessTiers(ctx);

    expect(ctx.gameState.playlistAccess).toBe('mid');
    expect(ctx.gameState.pressAccess).toBe('mid_tier');
    const playlist = changes.find((c) => c.description.includes('Playlist'));
    const press = changes.find((c) => c.description.includes('Press'));
    expect(playlist).toEqual({
      type: 'unlock',
      description: '🎵 Playlist Access Upgraded: Mid-Tier playlists unlocked! Your releases can now reach wider audiences.',
      amount: 0,
    });
    expect(press).toEqual({
      type: 'unlock',
      description: '📰 Press Access Upgraded: Mid-Tier Press coverage unlocked! Your projects will get better media attention.',
      amount: 0,
    });
    const gs: any = ctx.gameState;
    expect(gs.tierUnlockHistory.playlist.mid).toBe(15);
    expect(gs.tierUnlockHistory.press.mid_tier).toBe(15);
  });

  it('DOWNGRADE announces "Downgraded" (never "Upgraded") and does NOT stamp unlock history', () => {
    // mid (thr 50) → niche (thr 10) after a reputation drop to 30.
    const ctx = buildCtx({
      reputation: 30,
      playlistAccess: 'mid',
      pressAccess: 'mid_tier',
      venueAccess: 'theaters',
      // Previously-earned tiers are stamped — the downgrade must notify.
      tierUnlockHistory: { playlist: { mid: 5 }, press: { mid_tier: 5 }, venue: { theaters: 5 } },
    });
    const changes = new ProgressionProcessor().updateAccessTiers(ctx);

    expect(ctx.gameState.playlistAccess).toBe('niche');
    expect(ctx.gameState.pressAccess).toBe('blogs');
    expect(ctx.gameState.venueAccess).toBe('theaters'); // 30 >= 20 — unchanged, no notification

    const playlist = changes.find((c) => c.description.includes('Playlist'));
    const press = changes.find((c) => c.description.includes('Press'));
    expect(playlist!.description).toContain('Playlist Access Downgraded');
    expect(playlist!.description).toContain('Niche');
    expect(playlist!.description).not.toContain('Upgraded');
    expect(press!.description).toContain('Press Access Downgraded');
    expect(changes.filter((c) => c.description.includes('Venue'))).toHaveLength(0);

    // Downgrades never write unlock history.
    const gs: any = ctx.gameState;
    expect(gs.tierUnlockHistory.playlist?.niche).toBeUndefined();
    expect(gs.tierUnlockHistory.press?.blogs).toBeUndefined();
  });

  it('drop all the way to none announces "… Access Lost" (was silent)', () => {
    const ctx = buildCtx({
      reputation: 2,
      playlistAccess: 'niche',
      pressAccess: 'blogs',
      venueAccess: 'clubs',
      tierUnlockHistory: { playlist: { niche: 3 }, press: { blogs: 3 }, venue: { clubs: 3 } },
    });
    const changes = new ProgressionProcessor().updateAccessTiers(ctx);

    expect(ctx.gameState.playlistAccess).toBe('none');
    expect(ctx.gameState.pressAccess).toBe('none');
    expect(ctx.gameState.venueAccess).toBe('none');
    expect(changes.find((c) => c.description.includes('Playlist'))!.description).toContain('Playlist Access Lost');
    expect(changes.find((c) => c.description.includes('Press'))!.description).toContain('Press Access Lost');
    expect(changes.find((c) => c.description.includes('Venue'))!.description).toContain('Venue Access Lost');
    for (const c of changes) {
      expect(c.description).not.toContain('Upgraded');
    }
  });

  it('fresh game (accessors unset → assigned "none") stays silent, matching legacy behavior', () => {
    const ctx = buildCtx({ reputation: 0 });
    const changes = new ProgressionProcessor().updateAccessTiers(ctx);
    expect(ctx.gameState.playlistAccess).toBe('none');
    expect(changes).toEqual([]);
  });

  it('a NEVER-EARNED (unstamped) tier downgrades silently — pins golden-master compatibility', () => {
    // Golden-master shape: raw-seeded venueAccess 'clubs' with reputation below
    // the clubs threshold and no tierUnlockHistory stamp. The tier still steps
    // down, but no lie and no new notification either (legacy silence preserved).
    const ctx = buildCtx({ reputation: 3, venueAccess: 'clubs' });
    const changes = new ProgressionProcessor().updateAccessTiers(ctx);
    expect(ctx.gameState.venueAccess).toBe('none');
    expect(changes.filter((c) => c.description.includes('Venue'))).toHaveLength(0);
  });

  it('unchanged tiers emit nothing', () => {
    const ctx = buildCtx({ reputation: 55, playlistAccess: 'mid', pressAccess: 'mid_tier', venueAccess: 'arenas' });
    // venue: 55 >= 45 keeps arenas; playlist/press already at their 55-rep tier.
    const changes = new ProgressionProcessor().updateAccessTiers(ctx);
    expect(changes).toEqual([]);
  });
});
