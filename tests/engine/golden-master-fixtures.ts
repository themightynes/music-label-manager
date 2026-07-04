/**
 * Golden-master fixtures & normalizer for GameEngine.advanceWeek characterization.
 *
 * Phase 2 PR-2. This is the safety net that PRs 3–13 must keep byte-identical.
 *
 * Design notes (verified against the tree 2026-07-02):
 * - The engine is constructed `(gameState, gameData, storage, seed)`. We ALWAYS pin
 *   an explicit `seed` (fixed per scenario) so the seeded RNG stream is stable even
 *   though the constructor would otherwise derive it from `${gameState.id}-${currentWeek}`.
 * - `advanceWeek(actions, dbTransaction)` reads several row sets through `gameData.*`
 *   (getReleasedSongs / getReleasesByGame / getPlannedReleases / getSongsByRelease /
 *   getActiveRecordingProjects / getArtistById), which the production `ServerGameData`
 *   delegates to the storage layer. We therefore build a HYBRID gameData: the config
 *   methods return the real balance JSON (same as the existing integration mocks) and
 *   the row methods delegate to the SAME `DatabaseStorage` passed to the engine, so
 *   every read hits the test DB and exercises the real query code.
 * - `advanceProjectStages` reads projects DIRECTLY off the passed `dbTransaction`
 *   (`dbTransaction.select().from(projects)`) and early-returns with a
 *   `[PROJECT ADVANCEMENT] No database transaction provided` warning when none is
 *   passed. Production (gameLoop.ts:227) wraps the call in `db.transaction` and passes
 *   `tx`. We mirror that: every scenario runs advanceWeek inside a real
 *   `db.transaction`, passing `tx`, so the tx-threaded paths (stage advancement,
 *   emails, exec-decay, A&R) are all exercised.
 */

import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '@shared/schema';
import type { DatabaseStorage } from '../../server/storage';

export type TestDb = NodePgDatabase<typeof schema> & { $client: Pool };

// ---------------------------------------------------------------------------
// gameData: real config + storage-backed row reads
// ---------------------------------------------------------------------------

/**
 * Builds a gameData object that mirrors ServerGameData's split:
 *   - config methods read the real balance JSON synchronously (same as the
 *     existing integration-test mock)
 *   - row/entity methods delegate to the passed `storage` (DatabaseStorage bound
 *     to the test DB), so releases/songs/projects/artists reads go through the
 *     real query code against seeded rows.
 *
 * getAllArtists returns [] on purpose: the A&R scenario seeds its "catalog" of
 * signable artists through this override (see seedArOfficeScenario), which lets us
 * pin exactly which artist A&R discovers without depending on data/artists JSON.
 */
export function createGameData(storage: DatabaseStorage, catalogArtists: any[] = []): any {
  const balanceDir = path.join(process.cwd(), 'data', 'balance');
  const economy = JSON.parse(fs.readFileSync(path.join(balanceDir, 'economy.json'), 'utf-8'));
  const progression = JSON.parse(fs.readFileSync(path.join(balanceDir, 'progression.json'), 'utf-8'));
  const config = JSON.parse(fs.readFileSync(path.join(balanceDir, 'config.json'), 'utf-8'));
  const markets = JSON.parse(fs.readFileSync(path.join(balanceDir, 'markets.json'), 'utf-8'));
  const quality = JSON.parse(fs.readFileSync(path.join(balanceDir, 'quality.json'), 'utf-8'));

  markets.venue_capacities = progression.access_tier_system.venue_access;

  // market_formulas (streaming/press/awareness/chart config) lives in markets.json.
  // The real ServerGameData.getBalanceConfigSync returns the FULL balance including it;
  // the release/lead-single/catalog paths read it via getStreamingConfigSync etc.
  const marketFormulas = markets.market_formulas;

  const balance = {
    economy,
    time_progression: {
      campaign_length_weeks: 52,
      week_duration: 7,
    },
    market_formulas: marketFormulas,
    time_investment_system: quality.time_investment_system,
    // The multiplicative song-quality path (calculateBudgetQualityMultiplier)
    // reads these from quality.json in production. The fixtures previously
    // omitted them, so the budget-quality multiplier threw and the recording
    // scenario generated ZERO songs (a pinned no-op). Wiring the real config in
    // lets the recording-week scenario actually exercise the quality path.
    quality_system: quality.quality_system,
    producer_tier_system: quality.producer_tier_system,
    ...config,
  };
  const streaming = marketFormulas?.streaming_calculation;
  const press = marketFormulas?.press_coverage;

  return {
    // --- config (synchronous, deterministic) ---
    getBalanceConfigSync: () => balance,
    getBalanceConfig: async () => balance,
    getTourConfigSync: () => ({
      sell_through_base: 0.7,
      reputation_modifier: 1.0,
      local_popularity_weight: 1.0,
      ticket_price_base: 20,
      ticket_price_per_capacity: 0.01,
      merch_percentage: 0.25,
      revenue_per_fan: 25,
      base_attendance: 100,
      sell_through_range: 0.3,
      costs: { small: 5000, medium: 15000, large: 40000 },
    }),
    getAccessTiersSync: () => progression.access_tier_system,
    getMarketConfigSync: () => markets,
    getEventConfigSync: () => ({ weekly_chance: 0, event_types: [] }),
    getWeeklyBurnRangeSync: () => balance.economy?.weekly_burn_range || [1500, 2500],
    getProgressionThresholdsSync: () => progression,
    getProducerTierSystemSync: () => progression.producer_tiers || {},
    getTimeInvestmentSystemSync: () => quality.time_investment_system,
    getMarketFormulasSync: () => marketFormulas,
    // Mirror ServerGameData.getStreamingConfigSync (server/data/gameData.ts:454)
    getStreamingConfigSync: () => ({
      quality_weight: streaming.quality_weight,
      playlist_weight: streaming.playlist_weight,
      reputation_weight: streaming.reputation_weight,
      marketing_weight: streaming.marketing_weight,
      popularity_weight: streaming.popularity_weight,
      first_week_multiplier: streaming.first_week_multiplier,
      base_streams_per_point: 1000,
      star_power_amplification: streaming.star_power_amplification,
      ongoing_streams: streaming.ongoing_streams,
    }),
    // Mirror ServerGameData.getPressConfigSync (server/data/gameData.ts:468)
    getPressConfigSync: () => ({
      base_chance: press.base_chance,
      pr_spend_modifier: press.pr_spend_modifier,
      reputation_modifier: press.reputation_modifier,
      story_flag_bonus: press.story_flag_bonus,
      max_pickups_per_release: press.max_pickups_per_release,
    }),
    getPressCoverageConfigSync: () => ({
      base_chance: press.base_chance,
      pr_spend_modifier: press.pr_spend_modifier,
      reputation_modifier: press.reputation_modifier,
      story_flag_bonus: press.story_flag_bonus,
      max_pickups_per_release: press.max_pickups_per_release,
    }),
    getAvailableProducerTiers: () => ['local'],
    getAllExecutives: async () => [],
    getAllRoles: async () => [],
    getAllEvents: async () => [],

    // --- signable-artist catalog (A&R discovery pool) ---
    getAllArtists: async () => catalogArtists,

    // --- row / entity reads (delegate to storage against the test DB) ---
    getReleasedSongs: async (gameId: string) => storage.getReleasedSongs(gameId),
    getReleasesByGame: async (gameId: string, tx?: any) => storage.getReleasesByGame(gameId, tx),
    getPlannedReleases: async (gameId: string, week: number, tx?: any) =>
      storage.getPlannedReleases(gameId, week, tx),
    getSongsByRelease: async (releaseId: string, tx?: any) => storage.getSongsByRelease(releaseId, tx),
    getSongsByProject: async (projectId: string) => storage.getSongsByProject(projectId),
    getActiveRecordingProjects: async (gameId: string, tx?: any) => {
      const dbCtx = tx || (storage as any).db;
      const rows = await dbCtx
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.gameId, gameId));
      return rows.filter(
        (p: any) => p.stage === 'production' && ['Single', 'EP'].includes(p.type),
      );
    },
    getArtistById: async (artistId: string) => storage.getArtist(artistId),

    // --- writes (delegate to storage) ---
    createSong: async (song: any, tx?: any) => storage.createSong(song),
    updateSongs: async (updates: any[], tx?: any) => storage.updateSongs(updates, tx),
    updateProject: async (projectId: string, updates: any, tx?: any) => {
      const dbCtx = tx || (storage as any).db;
      const [updated] = await dbCtx
        .update(schema.projects)
        .set(updates)
        .where(eq(schema.projects.id, projectId))
        .returning();
      return updated;
    },
    updateReleaseStatus: async (releaseId: string, status: string, metadata?: any, tx?: any) =>
      storage.updateReleaseStatus(releaseId, status, metadata, tx),
    createReleaseSong: async (rs: any) => storage.createReleaseSong(rs),

    // --- role/action content (used by the actions scenario) ---
    getRoleById: async (roleId: string) => ({ id: roleId, name: `Role ${roleId}` }),
    getActionById: async (actionId: string) => ({ id: actionId, target_scope: 'global' }),
    getChoiceById: async (_actionId: string, choiceId: string) => ({
      id: choiceId,
      // Exec-meetings-revival PR-2: real actions.json choices always carry a label
      // (enforced by the dataLoader schema); mirror that here so the 'meeting'
      // change entry's choiceLabel field is realistic rather than undefined.
      label: `Choice ${choiceId}`,
      // Fixed, deterministic effects — no RNG involved.
      effects_immediate: { money: -1000, reputation: 2 },
      effects_delayed: {},
    }),
    getMarketingCosts: async (_type: string) => ({ min: 2000, max: 4000 }),
  };
}

// ---------------------------------------------------------------------------
// gameState factory (mutable object the engine advances in place)
// ---------------------------------------------------------------------------

export function makeGameState(seededId: string, overrides: Record<string, any> = {}): any {
  return {
    id: seededId,
    currentWeek: 1,
    money: 500000,
    reputation: 10,
    creativeCapital: 0,
    focusSlots: 3,
    usedFocusSlots: 0,
    playlistAccess: 'none',
    pressAccess: 'none',
    venueAccess: 'clubs',
    campaignCompleted: false,
    flags: {},
    weeklyStats: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Normalizer — strips nondeterminism so snapshots are byte-stable across runs
// ---------------------------------------------------------------------------

// Keys whose values are DB-generated UUIDs or FK ids: replace with a placeholder
// (presence preserved, value neutralized) so a new run with fresh UUIDs matches.
const ID_KEYS = new Set([
  'id',
  'gameId',
  'game_id',
  'artistId',
  'artist_id',
  'songId',
  'song_id',
  'releaseId',
  'release_id',
  'projectId',
  'project_id',
  'targetId',
  'target_id',
  'choiceId',
  'choice_id',
  'senderRoleId',
  'discoveredArtistId',
  'leadSingleId',
  'ar_office_discovered_artist_id',
]);

// Wall-clock fields the engine/storage stamp with `new Date()` — never stable.
const TIMESTAMP_KEYS = new Set([
  'createdAt',
  'created_at',
  'updatedAt',
  'updated_at',
  'recordedAt',
  'recorded_at',
  'releasedAt',
  'released_at',
  'generatedAt',
  'generated_at',
  'discoveryTime', // sim-time week now (PR-1) but keep normalized for safety
  'ar_office_discovery_time',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Recursively normalizes a value so byte-identical snapshots survive fresh UUIDs,
 * wall-clock stamps, and nested metadata JSONB. Rules:
 *   - Date objects  -> '<timestamp>'
 *   - keys in TIMESTAMP_KEYS -> '<timestamp>' (regardless of value)
 *   - keys in ID_KEYS -> '<id>' if the value looks like a UUID / non-null id
 *   - any string matching a bare UUID -> '<uuid>'
 *   - any string matching an ISO datetime -> '<timestamp>'
 *   - arrays & plain objects recursed; object keys sorted for stable ordering
 */
export function normalize(value: any): any {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) return '<timestamp>';

  if (typeof value === 'string') {
    if (UUID_RE.test(value)) return '<uuid>';
    if (ISO_DATE_RE.test(value)) return '<timestamp>';
    return value;
  }

  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map((v) => normalize(v));

  // Some maps are keyed by DB UUIDs (e.g. summary.artistChanges keyed by artistId).
  // Those keys change every run, so normalize them to stable placeholders. When a
  // map has multiple UUID keys we assign deterministic aliases by SORTING on the
  // normalized VALUE (id-independent) so ordering never depends on the raw UUID.
  const rawKeys = Object.keys(value);
  const uuidKeys = rawKeys.filter((k) => UUID_RE.test(k));
  const keyAlias = new Map<string, string>();
  if (uuidKeys.length > 0) {
    const ranked = uuidKeys
      .map((k) => ({ k, v: JSON.stringify(normalize(value[k])) }))
      .sort((a, b) => (a.v < b.v ? -1 : a.v > b.v ? 1 : 0));
    ranked.forEach((entry, i) => {
      keyAlias.set(entry.k, uuidKeys.length === 1 ? '<uuid-key>' : `<uuid-key-${i}>`);
    });
  }

  const out: Record<string, any> = {};
  for (const key of rawKeys.sort()) {
    const raw = value[key];
    const outKey = keyAlias.get(key) ?? key;

    if (TIMESTAMP_KEYS.has(key)) {
      out[outKey] = raw === null || raw === undefined ? raw : '<timestamp>';
      continue;
    }
    if (ID_KEYS.has(key)) {
      out[outKey] = raw === null || raw === undefined ? raw : '<id>';
      continue;
    }
    out[outKey] = normalize(raw);
  }
  return out;
}

/** Normalizes an array of DB rows and sorts by a stable natural key (NOT id). */
export function normalizeRows(rows: any[], sortKey: (r: any) => string): any[] {
  const normalized = rows.map((r) => normalize(r));
  // Sort by the natural key computed from the ORIGINAL row (pre-normalization),
  // paired so the stable order is independent of DB return order.
  return rows
    .map((r, i) => ({ key: sortKey(r), norm: normalized[i] }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((x) => x.norm);
}

// ---------------------------------------------------------------------------
// Read back + digest all persisted rows for a game (post-advanceWeek)
// ---------------------------------------------------------------------------

export async function readDigest(db: TestDb, gameId: string) {
  const [artists, projects, songs, releases, releaseSongsRows, executives, emails, charts] =
    await Promise.all([
      db.select().from(schema.artists).where(eq(schema.artists.gameId, gameId)),
      db.select().from(schema.projects).where(eq(schema.projects.gameId, gameId)),
      db.select().from(schema.songs).where(eq(schema.songs.gameId, gameId)),
      db.select().from(schema.releases).where(eq(schema.releases.gameId, gameId)),
      db
        .select()
        .from(schema.releaseSongs)
        .innerJoin(schema.songs, eq(schema.releaseSongs.songId, schema.songs.id))
        .where(eq(schema.songs.gameId, gameId)),
      db.select().from(schema.executives).where(eq(schema.executives.gameId, gameId)),
      db.select().from(schema.emails).where(eq(schema.emails.gameId, gameId)),
      db.select().from(schema.chartEntries).where(eq(schema.chartEntries.gameId, gameId)),
    ]);

  return {
    artists: normalizeRows(artists, (r) => `${r.name}`),
    projects: normalizeRows(projects, (r) => `${r.title}|${r.type}`),
    songs: normalizeRows(songs, (r) => `${r.title}|${r.createdWeek ?? ''}`),
    releases: normalizeRows(releases, (r) => `${r.title}|${r.type}`),
    releaseSongs: normalizeRows(
      // innerJoin returns { release_songs, songs }; digest the junction row keyed by song title
      releaseSongsRows.map((row: any) => ({ ...row.release_songs, _songTitle: row.songs.title })),
      (r) => `${r._songTitle}|${r.trackNumber}`,
    ),
    executives: normalizeRows(executives, (r) => `${r.role}`),
    emails: normalizeRows(emails, (r) => `${r.week}|${r.category}|${r.subject}`),
    charts: digestCharts(charts),
  };
}

/**
 * Charts digest — compacted to avoid snapshot bloat (§6).
 *
 * processWeeklyCharts persists a full ~100-row competitor field EVERY week
 * (seeded, deterministic, but structurally identical across scenarios). Dumping
 * all of it costs ~1,500 lines of noise per suite and swamps the signal.
 *
 * Instead we snapshot:
 *   - PLAYER song entries in FULL (the characterization-relevant rows), and
 *   - a stable AGGREGATE fingerprint of the competitor field (count + a
 *     deterministic checksum over sorted position|streams) so any change to
 *     competitor generation still flips the snapshot.
 */
function digestCharts(charts: any[]) {
  const playerRows = charts.filter((r) => !r.isCompetitorSong);
  const competitorRows = charts.filter((r) => r.isCompetitorSong);

  const competitorFingerprint = competitorRows
    .map((r) => `${r.position ?? 'x'}:${r.streams}`)
    .sort()
    .join(',');
  // Cheap, stable 32-bit checksum (order-independent after sort above).
  let checksum = 0;
  for (let i = 0; i < competitorFingerprint.length; i++) {
    checksum = (checksum * 31 + competitorFingerprint.charCodeAt(i)) | 0;
  }

  return {
    playerEntries: normalizeRows(playerRows, (r) => `${r.position ?? ''}|${r.streams}`),
    competitorCount: competitorRows.length,
    competitorChecksum: checksum,
  };
}

/**
 * Compacts a WeekSummary before snapshotting: the `chartUpdates` array carries the
 * same ~100-entry competitor field as the charts digest (bloat). Replace it with
 * player entries in full + a competitor fingerprint, matching digestCharts. All
 * other summary fields are preserved verbatim (then normalized by the caller).
 */
export function compactSummary(summary: any): any {
  if (!summary || !Array.isArray(summary.chartUpdates)) return summary;
  const updates = summary.chartUpdates;
  const player = updates.filter((u: any) => !u.isCompetitorSong);
  const competitors = updates.filter((u: any) => u.isCompetitorSong);
  const fp = competitors
    .map((u: any) => `${u.position ?? 'x'}:${u.songTitle}`)
    .sort()
    .join(',');
  let checksum = 0;
  for (let i = 0; i < fp.length; i++) checksum = (checksum * 31 + fp.charCodeAt(i)) | 0;

  return {
    ...summary,
    chartUpdates: {
      playerEntries: player,
      competitorCount: competitors.length,
      competitorChecksum: checksum,
    },
  };
}

// ---------------------------------------------------------------------------
// gameState delta (before vs after: only changed fields, normalized)
// ---------------------------------------------------------------------------

export function stateDelta(before: any, after: any): Record<string, any> {
  const delta: Record<string, any> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of Array.from(keys).sort()) {
    const b = JSON.stringify(normalize(before[key]));
    const a = JSON.stringify(normalize(after[key]));
    if (b !== a) {
      delta[key] = { before: normalize(before[key]), after: normalize(after[key]) };
    }
  }
  return delta;
}

/** Shallow-clones the gameState fields we care about for delta comparison. */
export function snapshotState(gs: any): Record<string, any> {
  return JSON.parse(
    JSON.stringify({
      currentWeek: gs.currentWeek,
      money: gs.money,
      reputation: gs.reputation,
      creativeCapital: gs.creativeCapital,
      focusSlots: gs.focusSlots,
      usedFocusSlots: gs.usedFocusSlots,
      playlistAccess: gs.playlistAccess,
      pressAccess: gs.pressAccess,
      venueAccess: gs.venueAccess,
      campaignCompleted: gs.campaignCompleted,
      arOfficeSlotUsed: gs.arOfficeSlotUsed,
      arOfficeSourcingType: gs.arOfficeSourcingType,
      flags: gs.flags,
    }),
  );
}
