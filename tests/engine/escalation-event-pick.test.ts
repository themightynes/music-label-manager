import { describe, it, expect } from 'vitest';
import {
  ESCALATION_EVENT_BY_ROLE,
  pickEscalationEventId,
} from '@shared/utils/executiveDelegation';
import { seededRandomPick } from '@shared/utils/seededRandom';

/**
 * Executive Delegation arc (Tier 2, §5.6 — v3 array routing) — THE ESCALATION
 * PICKER UNIT GUARD. Pure, no DB (sibling of the data-lint escalation suite).
 *
 * pickEscalationEventId routes a role to ONE event id out of its authored
 * pool via the engine's ISOLATED seeded-pick primitive (seededRandomPick —
 * the same one the autonomous tie-break uses; never ctx.getRandom). This
 * suite pins:
 *   1. Singleton pools (the SHIPPED state) always return their only element —
 *      byte-identical to the pre-array single-id map, regardless of seed.
 *   2. Multi-event pools (the v3 future state, exercised via an injected
 *      synthetic pool) pick deterministically per seed, agree with
 *      seededRandomPick, and different seeds can select different elements.
 *   3. Unknown roles / empty pools return undefined (defensive no-op, matches
 *      the engine's `if (escalationEventId)` guard).
 */

describe('pickEscalationEventId (escalation v3 array routing)', () => {
  it('shipped map: every pool is a singleton (byte-identical-behavior guard until v3 content lands)', () => {
    // If this fails, second events landed — DELETE this test and make sure the
    // golden master was re-validated for the affected fixtures.
    for (const [role, pool] of Object.entries(ESCALATION_EVENT_BY_ROLE)) {
      expect(pool.length, `role ${role} pool should be a singleton for now`).toBe(1);
    }
  });

  it('a singleton pool returns its only element for ANY seed (deterministic, seed-independent)', () => {
    for (const [role, pool] of Object.entries(ESCALATION_EVENT_BY_ROLE)) {
      for (const seed of ['game1-week3', 'game1-week4', 'other-game-week99', '']) {
        expect(pickEscalationEventId(role, `${seed}-${role}-escalation-event`)).toBe(pool[0]);
      }
    }
  });

  it('a two-element pool picks deterministically per seed and matches seededRandomPick', () => {
    const syntheticPools = {
      head_ar: ['escalation_ar_botched_signing', 'escalation_ar_second_strike'],
    } as const;

    const seedA = 'game-abc-week5-head_ar-escalation-event';
    const seedB = 'game-abc-week9-head_ar-escalation-event';

    const pickA = pickEscalationEventId('head_ar', seedA, [], syntheticPools);
    const pickB = pickEscalationEventId('head_ar', seedB, [], syntheticPools);

    // Deterministic: same (role, seed, pool) → same pick, every time.
    expect(pickA).toBe(pickEscalationEventId('head_ar', seedA, [], syntheticPools));
    expect(pickB).toBe(pickEscalationEventId('head_ar', seedB, [], syntheticPools));

    // Membership: whatever is picked comes from the pool.
    expect(syntheticPools.head_ar).toContain(pickA);
    expect(syntheticPools.head_ar).toContain(pickB);

    // Same primitive as the autonomous tie-break: agrees with seededRandomPick.
    expect(pickA).toBe(seededRandomPick([...syntheticPools.head_ar], seedA));
    expect(pickB).toBe(seededRandomPick([...syntheticPools.head_ar], seedB));

    // Seed-sensitivity: across a spread of seeds BOTH elements are reachable
    // (i.e. the pick is not degenerate on one element).
    const seen = new Set<string>();
    for (let week = 1; week <= 40; week++) {
      const pick = pickEscalationEventId('head_ar', `game-abc-week${week}-head_ar-escalation-event`, [], syntheticPools);
      if (pick) seen.add(pick);
    }
    expect(seen).toEqual(new Set(syntheticPools.head_ar));
  });

  it('unknown role or empty pool returns undefined (engine treats it as a no-op)', () => {
    expect(pickEscalationEventId('ceo', 'seed')).toBeUndefined();
    expect(pickEscalationEventId('not_a_role', 'seed')).toBeUndefined();
    expect(pickEscalationEventId('head_ar', 'seed', [], { head_ar: [] })).toBeUndefined();
  });

  // Engine-verbs Slice 14 (M12b — escalation last-seen filter).
  describe('last-seen filter (seen param)', () => {
    const twoPool = {
      head_ar: ['escalation_ar_botched_signing', 'escalation_ar_second_strike'],
    } as const;

    it('filters seen ids out of the pool before the pick (forced pick from a two-pool)', () => {
      // With one of two seen, the pick is FORCED to the unseen one, for any seed.
      for (const seed of ['s1', 's2', 'game-week9', '']) {
        expect(
          pickEscalationEventId('head_ar', seed, ['escalation_ar_botched_signing'], twoPool)
        ).toBe('escalation_ar_second_strike');
        expect(
          pickEscalationEventId('head_ar', seed, ['escalation_ar_second_strike'], twoPool)
        ).toBe('escalation_ar_botched_signing');
      }
    });

    it('NEVER filters to empty: a fully-seen pool falls back to the whole pool', () => {
      const seed = 'game-abc-week5-head_ar-escalation-event';
      const allSeen = [...twoPool.head_ar];
      // Falls back to the full pool → same result as an unfiltered pick.
      expect(pickEscalationEventId('head_ar', seed, allSeen, twoPool)).toBe(
        pickEscalationEventId('head_ar', seed, [], twoPool)
      );
      // Shipped singleton pools: the single event already seen still resolves.
      for (const [role, pool] of Object.entries(ESCALATION_EVENT_BY_ROLE)) {
        expect(pickEscalationEventId(role, 'any-seed', [...pool])).toBe(pool[0]);
      }
    });

    it('ids not in the pool are ignored by the filter (stale history is harmless)', () => {
      expect(
        pickEscalationEventId('head_ar', 'seed-x', ['escalation_cmo_narrative_lost'], twoPool)
      ).toBe(pickEscalationEventId('head_ar', 'seed-x', [], twoPool));
    });

    it('default seen ([]) preserves the pre-slice behavior byte-for-byte', () => {
      for (const [role, pool] of Object.entries(ESCALATION_EVENT_BY_ROLE)) {
        expect(pickEscalationEventId(role, `seed-${role}`)).toBe(pool[0]);
      }
    });
  });
});
