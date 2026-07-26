/**
 * C105 — schedule_event enqueue dedupe.
 *
 * A re-drawable meeting (no cooldown, e.g. machine_that_listens) can apply the
 * same schedule_event effect in two different weeks; before the dedupe guard
 * the same verdict crisis banked twice in flags.scheduled_events. This suite
 * pins the guard AS IMPLEMENTED:
 *  - a second enqueue of an already-QUEUED eventId is skipped (no queue growth,
 *    no foreshadow summary change, concise console note);
 *  - an eventId currently promoted into flags.pending_side_event (unresolved
 *    crisis) is also skipped;
 *  - DIFFERENT eventIds still both queue (single-draw path byte-identical).
 *
 * DB-free, driving ActionProcessor.applyEffects directly (same pattern as
 * scheduled-events-queue.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProcessor } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';

function buildCtx(gameState: any): WeekContext {
  return {
    gameState,
    summary: { week: gameState.currentWeek, changes: [], events: [], revenue: 0, expenses: 0, streams: 0 } as any,
    gameData: {} as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
  } as WeekContext;
}

describe('applyEffects schedule_event — C105 enqueue dedupe', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('double-draw of the SAME eventId across two weeks banks exactly one entry', async () => {
    const gameState: any = { id: 'g', currentWeek: 10, flags: {} };
    const processor = new ActionProcessor();

    // Week 10: first draw queues normally.
    const ctx1 = buildCtx(gameState);
    await processor.applyEffects(
      ctx1,
      { schedule_event: { event_id: 'scheduled_mac_machine_verdict', defer_weeks: 3 } },
      'artist-1', 'predetermined', 'machine_that_listens', 'stake_mac_against_it'
    );
    expect(gameState.flags.scheduled_events).toHaveLength(1);
    expect(ctx1.summary.changes.filter((c: any) => c.type === 'meeting')).toHaveLength(1);

    // Week 11: same meeting re-drawn, same choice — duplicate must be skipped.
    gameState.currentWeek = 11;
    const ctx2 = buildCtx(gameState);
    await processor.applyEffects(
      ctx2,
      { schedule_event: { event_id: 'scheduled_mac_machine_verdict', defer_weeks: 3 } },
      'artist-1', 'predetermined', 'machine_that_listens', 'stake_mac_against_it'
    );

    expect(gameState.flags.scheduled_events).toHaveLength(1);
    // The surviving entry is the FIRST one (landsOnWeek from week 10, not 11).
    expect(gameState.flags.scheduled_events[0]).toEqual({
      eventId: 'scheduled_mac_machine_verdict',
      landsOnWeek: 13,
      source: 'machine_that_listens',
      artistId: 'artist-1',
    });
    // No foreshadow change for the skipped duplicate.
    expect(ctx2.summary.changes.filter((c: any) => c.type === 'meeting')).toHaveLength(0);
    // Concise console note.
    expect(
      logSpy.mock.calls.some((call) =>
        String(call[0]).includes('duplicate enqueue skipped')
      )
    ).toBe(true);
  });

  it('DIFFERENT eventIds both queue (single-draw path untouched)', async () => {
    const gameState: any = { id: 'g', currentWeek: 5, flags: {} };
    const processor = new ActionProcessor();
    const ctx = buildCtx(gameState);
    await processor.applyEffects(ctx, { schedule_event: { event_id: 'verdict_a', defer_weeks: 2 } }, undefined, 'global', 'm1', 'c1');
    await processor.applyEffects(ctx, { schedule_event: { event_id: 'verdict_b', defer_weeks: 4 } }, undefined, 'global', 'm2', 'c2');
    expect(gameState.flags.scheduled_events.map((e: any) => e.eventId)).toEqual(['verdict_a', 'verdict_b']);
    expect(ctx.summary.changes.filter((c: any) => c.type === 'meeting')).toHaveLength(2);
  });

  it('an eventId already promoted into pending_side_event (unresolved crisis) is not re-queued', async () => {
    const gameState: any = {
      id: 'g',
      currentWeek: 14,
      flags: { pending_side_event: { eventId: 'scheduled_mac_machine_verdict', week: 13 } },
    };
    const ctx = buildCtx(gameState);
    await new ActionProcessor().applyEffects(
      ctx,
      { schedule_event: { event_id: 'scheduled_mac_machine_verdict', defer_weeks: 3 } },
      undefined, 'global', 'machine_that_listens', 'stake_mac_against_it'
    );
    expect(gameState.flags.scheduled_events).toBeUndefined();
    expect(ctx.summary.changes).toEqual([]);
  });

  it('a DIFFERENT eventId still queues while an unrelated crisis occupies the pending slot', async () => {
    const gameState: any = {
      id: 'g',
      currentWeek: 14,
      flags: { pending_side_event: { eventId: 'some_other_crisis', week: 13 } },
    };
    const ctx = buildCtx(gameState);
    await new ActionProcessor().applyEffects(
      ctx,
      { schedule_event: { event_id: 'fresh_verdict', defer_weeks: 1 } },
      undefined, 'global', 'm', 'c'
    );
    expect(gameState.flags.scheduled_events).toHaveLength(1);
    expect(gameState.flags.scheduled_events[0].eventId).toBe('fresh_verdict');
  });
});
