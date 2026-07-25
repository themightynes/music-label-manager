/**
 * Autonomous resolution skips a head_ar who is BUSY on an A&R office op
 * (2026-07-25 playtest finding, item 1).
 *
 * Sending Mac scouting consumes the exec for the week — the client grays his
 * card out (executiveAutoSelect.ts / ExecutiveCard.tsx exclusions) — but the
 * server-side resolveAutonomousExecMeetings treated any un-acted non-CEO exec
 * as "neglected" and resolved a meeting for him anyway ("made a decision on
 * his own" in the weekly summary).
 *
 * The fix snapshots `arOfficeSlotUsed` at the TOP of advanceWeek — critically,
 * BEFORE processAROfficeWeekly completes the op and clears the flag
 * (AROfficeProcessor.ts sets it false) — and excludes head_ar from the
 * autonomous candidate filter when it was set. This test drives a real
 * advance against a persisted game with TWO neglected execs and asserts:
 *   - slot used  → head_ar produces NO autonomous outcome (no delayed bank),
 *     while the equally-neglected cmo still resolves (filter isn't over-broad);
 *   - slot free  → head_ar resolves as before (regression guard).
 *
 * NEVER import server/db — the engine gets DatabaseStorage(testDb).
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import crypto from 'crypto';
import { GameEngine } from '@shared/engine/game-engine';
import * as schema from '@shared/schema';
import { DatabaseStorage } from '../../server/storage';
import { createTestDatabase, clearDatabase, setupDatabase } from '../helpers/test-db';
import {
  createGameData,
  makeGameState,
  AUTONOMOUS_MEETING_POOL,
  withAutonomousPool,
  type TestDb,
} from './golden-master-fixtures';

const GAME_ID = '00000000-0000-4000-8000-0000000000f3';

let db: TestDb;

/** Autonomous delayed-effect banks on flags for one role (keyed `role-…-delayed`). */
function autonomousBanks(flags: Record<string, any>, roleId: string): Array<[string, any]> {
  return Object.entries(flags || {}).filter(([k, v]) =>
    k.startsWith(`role-${roleId}-autonomous`) && k.endsWith('-delayed') && v && typeof v === 'object',
  );
}

async function seedGame(arOfficeSlotUsed: boolean) {
  await db.insert(schema.gameStates).values({
    id: GAME_ID,
    currentWeek: 4,
    money: 500000,
    reputation: 10,
    venueAccess: 'clubs',
    rngSeed: `golden-${GAME_ID}`,
  });
  await db.insert(schema.artists).values({
    id: crypto.randomUUID(),
    gameId: GAME_ID,
    name: 'Busy Act',
    archetype: 'Workhorse',
    genre: 'pop',
    talent: 60,
    workEthic: 70,
    popularity: 50,
    temperament: 50,
    energy: 50,
    mood: 50,
    signed: true,
  });
  // Loyalty 85: stays LOYAL through one neglect-decay week, so picks are the
  // deterministic AUTO-safe ones and every pool choice banks a delayed effect.
  for (const role of ['head_ar', 'cmo'] as const) {
    await db.insert(schema.executives).values({
      id: crypto.randomUUID(),
      gameId: GAME_ID,
      role,
      level: 1,
      mood: 50,
      loyalty: 85,
      lastActionWeek: 0,
    });
  }

  const storage = new DatabaseStorage(db);
  const gameData = withAutonomousPool(createGameData(storage), AUTONOMOUS_MEETING_POOL);
  const gameState = makeGameState(GAME_ID, {
    id: GAME_ID,
    currentWeek: 4,
    ...(arOfficeSlotUsed
      ? { arOfficeSlotUsed: true, arOfficeSourcingType: 'active_scouting' }
      : {}),
  });
  const engine = new GameEngine(gameState, gameData, storage, `golden-${GAME_ID}`);
  return { engine, gameState };
}

describe('autonomous resolution vs. the A&R office slot (2026-07-25 item 1)', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('head_ar on an A&R op makes NO autonomous call — other neglected execs still do', async () => {
    const { engine, gameState } = await seedGame(true);

    await (db as any).transaction(async (tx: any) => {
      await engine.advanceWeek([], tx, { sideEventChoice: null });
    });

    expect(gameState.currentWeek).toBe(5);
    // The op completed this advance (slot freed) — proving the exclusion read a
    // pre-clear snapshot, not the already-cleared flag.
    expect((gameState as any).arOfficeSlotUsed).toBe(false);

    // Busy head_ar: no autonomous outcome of any kind.
    expect(autonomousBanks(gameState.flags, 'head_ar')).toHaveLength(0);
    // Neglected cmo still self-resolved his offered meeting (filter not over-broad).
    const cmoBanks = autonomousBanks(gameState.flags, 'cmo');
    expect(cmoBanks).toHaveLength(1);
    expect(cmoBanks[0][0]).toContain('-autonomous-auto_cmo-w4-');
  });

  it('regression guard: with the slot free, head_ar autonomously resolves as before', async () => {
    const { engine, gameState } = await seedGame(false);

    await (db as any).transaction(async (tx: any) => {
      await engine.advanceWeek([], tx, { sideEventChoice: null });
    });

    const arBanks = autonomousBanks(gameState.flags, 'head_ar');
    expect(arBanks).toHaveLength(1);
    expect(arBanks[0][0]).toContain('-autonomous-auto_ar-w4-');
    expect(autonomousBanks(gameState.flags, 'cmo')).toHaveLength(1);
  });
});
