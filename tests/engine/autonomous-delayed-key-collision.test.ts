/**
 * Autonomous delayed-effect key-collision regression (Delegation arc, FIX 2).
 *
 * ActionProcessor keys a choice's delayed-effect flag as
 * `${action.targetId}-${choiceId}-delayed`. Before FIX 2 the autonomous synthetic
 * action used a week-agnostic `targetId: role-${roleId}-autonomous`, so a neglected
 * exec autonomously resolving the SAME meeting+choice in consecutive weeks reused
 * the SAME flag key. Because resolveAutonomousExecMeetings (PHASE 1) runs BEFORE
 * processDelayedEffects within a single advance, week N+1's bank OVERWROTE week N's
 * un-consumed bank (bumping triggerWeek N+1 → N+2) and week N's delayed payoff
 * silently never landed.
 *
 * FIX 2 scopes the targetId by meeting id + offered week
 * (`role-${roleId}-autonomous-${meetingId}-w${offeredWeek}`) so the two banks get
 * distinct keys and BOTH fire. This test drives two consecutive advances against
 * ONE persisted game (a loyal head_ar that always self-resolves auto_ar → ar_safe,
 * whose delayed effect is `{ reputation: 1 }`) and asserts:
 *   - after advance 1 (week 4→5): exactly one autonomous bank, key contains `-w4-`,
 *     triggerWeek 6;
 *   - after advance 2 (week 5→6): the week-4 bank FIRED (consumed at week 6, a
 *     delayed_effect change present) while a SEPARATE `-w5-` bank (triggerWeek 7)
 *     banked for next week.
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

const GAME_ID = '00000000-0000-4000-8000-0000000000f2';

let db: TestDb;

/** Only the autonomous delayed-effect banks on flags (keyed `role-…-delayed`). */
function autonomousBanks(flags: Record<string, any>): Array<[string, any]> {
  return Object.entries(flags || {}).filter(([k, v]) =>
    k.startsWith('role-head_ar-autonomous') && k.endsWith('-delayed') && v && typeof v === 'object',
  );
}

describe('autonomous delayed-effect key collision (Delegation FIX 2)', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    db = createTestDatabase();
    await clearDatabase(db);
  });

  it('same exec + meeting + choice two consecutive weeks → week N delayed effect fires at N+1 while N+1 banks separately', async () => {
    // Seed one game, one signed artist, one LOYAL head_ar (75 → AUTO-safe → ar_safe).
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
      name: 'Collision Act',
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
    await db.insert(schema.executives).values({
      id: crypto.randomUUID(),
      gameId: GAME_ID,
      role: 'head_ar',
      level: 1,
      mood: 50,
      loyalty: 75,
      lastActionWeek: 0,
    });

    const storage = new DatabaseStorage(db);
    const gameData = withAutonomousPool(createGameData(storage), AUTONOMOUS_MEETING_POOL);
    // ONE in-memory gameState carried across both advances (flags persist on it).
    const gameState = makeGameState(GAME_ID, { id: GAME_ID, currentWeek: 4 });
    const engine = new GameEngine(gameState, gameData, storage, `golden-${GAME_ID}`);

    await (db as any).transaction(async (tx: any) => {
      // --- Advance 1: week 4 → 5. Banks week-4's ar_safe delayed reputation. ---
      await engine.advanceWeek([], tx, { sideEventChoice: null });
      expect(gameState.currentWeek).toBe(5);

      const banks1 = autonomousBanks(gameState.flags);
      expect(banks1).toHaveLength(1);
      const [key1, bank1] = banks1[0];
      expect(key1).toContain('-autonomous-auto_ar-w4-');
      expect(key1.endsWith('-delayed')).toBe(true);
      expect(bank1.triggerWeek).toBe(6);
      expect(bank1.effects).toEqual({ reputation: 1 });

      // --- Advance 2: week 5 → 6. The week-4 bank FIRES (triggerWeek 6 === now);
      // a distinct week-5 bank banks for triggerWeek 7. Old code would have
      // overwritten the week-4 bank in PHASE 1 before it could fire. ---
      const result2 = await engine.advanceWeek([], tx, { sideEventChoice: null });
      expect(gameState.currentWeek).toBe(6);

      // The week-4 delayed effect actually landed this advance.
      const delayedFired = (result2.summary.changes as any[]).filter((c) => c.type === 'delayed_effect');
      expect(delayedFired.length).toBeGreaterThanOrEqual(1);
      expect(
        delayedFired.some((c) => (c.appliedEffects || {}).reputation === 1),
      ).toBe(true);

      const banks2 = autonomousBanks(gameState.flags);
      // Only the fresh week-5 bank remains — the week-4 key was consumed, NOT clobbered.
      expect(banks2).toHaveLength(1);
      const [key2, bank2] = banks2[0];
      expect(key2).toContain('-autonomous-auto_ar-w5-');
      expect(key2).not.toBe(key1);
      expect(bank2.triggerWeek).toBe(7);
      expect(bank2.effects).toEqual({ reputation: 1 });
    });
  });
});
