/**
 * PENDING-DECISIONS #9 (2026-07-12) — milestone-sourced Creative Capital.
 *
 * GameEngine.applyChartMilestoneBonuses grows a small CC trickle riding the
 * SAME once-per-song chart-milestone flags as the reputation bonuses:
 *   - cc_top10_bonus  (default 1): the week a song FIRST enters the top 10
 *   - cc_number_one_bonus (default 2): the week a song FIRST reaches No. 1
 *   - NO-STACK RULE: a #1 debut (both milestones the same week) grants
 *     max(cc_top10_bonus, cc_number_one_bonus), NOT the sum — unlike the
 *     reputation bonuses, which stack both on a same-week double.
 *   - Clamp: Math.max(0, ...) mirroring ActionProcessor's creative_capital
 *     handling. There is NO upper CC cap in the engine (audited: floor 0 only).
 *   - Config-driven: knobs read from progression.json reputation_system
 *     .creative_capital_milestones (overridden per test here).
 *
 * These drive the REAL private method via runtime access (the established
 * pattern — see game-engine-tier-unlock-history.test.ts), with a mock gameData
 * exposing getBalanceConfigSync. DB-free; competitor rows and chart bookkeeping
 * integration are covered by the golden-master suite.
 */
import { describe, it, expect } from 'vitest';
import { GameEngine } from '@shared/engine/game-engine';

interface CcKnobs {
  cc_top10_bonus?: number;
  cc_number_one_bonus?: number;
}

function buildEngine(opts: {
  creativeCapital?: number;
  flags?: Record<string, any>;
  ccKnobs?: CcKnobs | undefined;
  hitSingleBonus?: number;
  numberOneBonus?: number;
}) {
  const gameState: any = {
    id: 'cc-milestone-game',
    currentWeek: 10,
    reputation: 50,
    creativeCapital: opts.creativeCapital ?? 5,
    flags: opts.flags ?? {},
  };
  const gameData: any = {
    getBalanceConfigSync: () => ({
      reputation_system: {
        hit_single_bonus: opts.hitSingleBonus ?? 5,
        number_one_bonus: opts.numberOneBonus ?? 10,
        reputation_gain_scaling: 1.0,
        ...(opts.ccKnobs !== undefined ? { creative_capital_milestones: opts.ccKnobs } : {}),
      },
    }),
  };
  const engine = new GameEngine(gameState, gameData, undefined, 'cc-milestone-seed');
  return { engine, gameState };
}

function makeSummary(): any {
  return { week: 10, changes: [], revenue: 0, expenses: 0, streams: 0 };
}

function entry(songId: string, position: number, songTitle = 'Neon Nights') {
  return { songId, songTitle, position, isCompetitorSong: false };
}

function apply(engine: GameEngine, entries: any[], summary: any) {
  (engine as any).applyChartMilestoneBonuses(entries, summary);
}

function ccChanges(summary: any) {
  return (summary.changes as any[]).filter((c) => c.type === 'creative_capital');
}

describe('chart-milestone Creative Capital grants (GameEngine.applyChartMilestoneBonuses)', () => {
  it('first top-10 entry grants cc_top10_bonus and pushes a creative_capital change entry', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 5, ccKnobs: { cc_top10_bonus: 1, cc_number_one_bonus: 2 } });
    const summary = makeSummary();

    apply(engine, [entry('song-1', 8)], summary);

    expect(gameState.creativeCapital).toBe(6);
    const cc = ccChanges(summary);
    expect(cc).toHaveLength(1);
    expect(cc[0].amount).toBe(1);
    expect(cc[0].description).toContain('Neon Nights');
  });

  it('a #1 debut (first top-10 AND first #1 same week) grants the HIGHER knob, not the sum (no-stack rule)', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 5, ccKnobs: { cc_top10_bonus: 1, cc_number_one_bonus: 2 } });
    const summary = makeSummary();

    apply(engine, [entry('song-1', 1)], summary);

    // max(1, 2) = 2 — NOT 3. (Reputation, by contrast, stacks 5 + 10 = 15.)
    expect(gameState.creativeCapital).toBe(7);
    const cc = ccChanges(summary);
    expect(cc).toHaveLength(1);
    expect(cc[0].amount).toBe(2);
  });

  it('no-stack picks the higher knob even when cc_top10_bonus is configured LARGER than cc_number_one_bonus', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 0, ccKnobs: { cc_top10_bonus: 7, cc_number_one_bonus: 2 } });
    const summary = makeSummary();

    apply(engine, [entry('song-1', 1)], summary);

    expect(gameState.creativeCapital).toBe(7); // max(7, 2), not 9
  });

  it('a climb 15 -> 8 -> 1 grants cc_top10_bonus once, then cc_number_one_bonus once, then never again', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 0, ccKnobs: { cc_top10_bonus: 1, cc_number_one_bonus: 2 } });

    apply(engine, [entry('song-1', 15)], makeSummary());
    expect(gameState.creativeCapital).toBe(0); // outside top 10 — nothing fires

    apply(engine, [entry('song-1', 8)], makeSummary());
    expect(gameState.creativeCapital).toBe(1); // first top-10 entry

    apply(engine, [entry('song-1', 1)], makeSummary());
    expect(gameState.creativeCapital).toBe(3); // first #1 (top-10 already fired → only +2)

    const week4 = makeSummary();
    apply(engine, [entry('song-1', 1)], week4);
    expect(gameState.creativeCapital).toBe(3); // both milestones spent — no re-grant
    expect(ccChanges(week4)).toHaveLength(0);
  });

  it('a song HOLDING #1 a second week grants nothing (once-per-song-per-milestone)', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 0, ccKnobs: { cc_top10_bonus: 1, cc_number_one_bonus: 2 } });

    apply(engine, [entry('song-1', 1)], makeSummary());
    expect(gameState.creativeCapital).toBe(2);

    const week2 = makeSummary();
    apply(engine, [entry('song-1', 1)], week2);
    expect(gameState.creativeCapital).toBe(2);
    expect(ccChanges(week2)).toHaveLength(0);
  });

  it('two different songs earn grants independently in the same week', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 0, ccKnobs: { cc_top10_bonus: 1, cc_number_one_bonus: 2 } });
    const summary = makeSummary();

    apply(engine, [entry('song-a', 1, 'Song A'), entry('song-b', 9, 'Song B')], summary);

    expect(gameState.creativeCapital).toBe(3); // 2 (#1 debut, no-stack) + 1 (top-10)
    expect(ccChanges(summary)).toHaveLength(2);
  });

  it('is config-driven: overridden knobs are honored', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 0, ccKnobs: { cc_top10_bonus: 4, cc_number_one_bonus: 9 } });

    apply(engine, [entry('song-1', 10)], makeSummary());
    expect(gameState.creativeCapital).toBe(4);

    apply(engine, [entry('song-1', 1)], makeSummary());
    expect(gameState.creativeCapital).toBe(13);
  });

  it('falls back to defaults (+1 top-10, +2 #1) when the config block is absent', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 0, ccKnobs: undefined });

    apply(engine, [entry('song-1', 6)], makeSummary());
    expect(gameState.creativeCapital).toBe(1);

    apply(engine, [entry('song-1', 1)], makeSummary());
    expect(gameState.creativeCapital).toBe(3);
  });

  it('zeroed knobs grant nothing and push no change entry (kill-switch)', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 5, ccKnobs: { cc_top10_bonus: 0, cc_number_one_bonus: 0 } });
    const summary = makeSummary();

    apply(engine, [entry('song-1', 1)], summary);

    expect(gameState.creativeCapital).toBe(5);
    expect(ccChanges(summary)).toHaveLength(0);
    // ...but the once-fired flags STILL persist (flag save is not gated on the
    // bonus amount), so re-enabling the knobs later cannot retro-fire old milestones.
    expect((gameState.flags as any).chartMilestones['song-1']).toEqual({ hitTop10: true, hitNumberOne: true });
  });

  it('clamps at the 0 floor and tolerates an undefined starting creativeCapital (no upper cap exists)', () => {
    const { engine, gameState } = buildEngine({ ccKnobs: { cc_top10_bonus: 1, cc_number_one_bonus: 2 } });
    delete (gameState as any).creativeCapital;

    apply(engine, [entry('song-1', 3)], makeSummary());
    expect(gameState.creativeCapital).toBe(1); // (undefined || 0) + 1, floored at 0
  });

  it('does not disturb the reputation milestone grants (rep still stacks on a #1 debut)', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 0, ccKnobs: { cc_top10_bonus: 1, cc_number_one_bonus: 2 } });
    const summary = makeSummary();

    apply(engine, [entry('song-1', 1)], summary);

    // Reputation: 50 + (5 + 10) — the rep channel keeps its documented stacking.
    expect(gameState.reputation).toBe(65);
    expect(summary.reputationChanges.global).toBe(15);
  });

  it('skips competitor rows and null positions (no CC for NPC chart performance)', () => {
    const { engine, gameState } = buildEngine({ creativeCapital: 0, ccKnobs: { cc_top10_bonus: 1, cc_number_one_bonus: 2 } });
    const summary = makeSummary();

    apply(
      engine,
      [
        { songId: 'song-npc', songTitle: 'Rival Hit', position: 1, isCompetitorSong: true },
        { songId: null, songTitle: 'No Id', position: 2, isCompetitorSong: false },
        { songId: 'song-off', songTitle: 'Off Chart', position: null, isCompetitorSong: false },
      ],
      summary,
    );

    expect(gameState.creativeCapital).toBe(0);
    expect(ccChanges(summary)).toHaveLength(0);
  });
});
