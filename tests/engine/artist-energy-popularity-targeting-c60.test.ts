import { describe, it, expect, vi } from 'vitest';
import { ActionProcessor } from '@shared/engine/processors/ActionProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import { createTestWeekSummary, createTestDBArtist } from '../helpers/test-factories';

/**
 * C60 regression: applyEffects's `artist_energy` and `artist_popularity` cases
 * ignored the `artistId` parameter and always applied to every signed artist,
 * unlike `artist_mood` (which already respected per-artist targeting). This
 * surfaced via DELAYED effects — processDelayedEffects threads a real artistId
 * through to applyEffects for artist-dialogue-originated delayed effects
 * (server/routes/artists.ts:141-153), but the switch cases discarded it.
 *
 * These tests pin:
 *  (a) artist_energy WITH artistId -> only the targeted artist changes
 *  (b) artist_popularity WITH artistId -> only the targeted artist changes
 *  (c) both WITHOUT artistId -> all signed artists change (backward-compat pin
 *      for role-meeting global effects, which legitimately target the roster)
 */

function buildContext(overrides: Partial<WeekContext> = {}): WeekContext {
  const gameState: any = {
    id: 'test-game-state',
    currentWeek: 5,
    reputation: 50,
    creativeCapital: 10,
    flags: {},
  };

  return {
    gameState,
    summary: createTestWeekSummary({ week: 5 }),
    gameData: {} as any,
    storage: {} as any,
    financialSystem: {} as any,
    getRandom: () => 0.5,
    ...overrides,
  };
}

function buildStorageWithArtists() {
  const artists = [
    createTestDBArtist({ id: 'artist_nova', name: 'Nova', signed: true }),
    createTestDBArtist({ id: 'artist_diego', name: 'Diego', signed: true }),
    createTestDBArtist({ id: 'artist_luna', name: 'Luna', signed: true }),
  ];
  return {
    getArtistsByGame: vi.fn().mockResolvedValue(artists),
  };
}

describe('ActionProcessor.applyEffects — artist_energy targeting (C60)', () => {
  it('applies only to the targeted artist when artistId is present (delayed effect)', async () => {
    const processor = new ActionProcessor();
    const storage = buildStorageWithArtists();
    const ctx = buildContext({ storage: storage as any });

    await processor.applyEffects(ctx, { artist_energy: 10 }, 'artist_nova', 'dialogue', 'scene_1', 'choice_1');

    expect(ctx.summary.artistChanges).toBeDefined();
    expect((ctx.summary.artistChanges as any)['artist_nova']?.energy).toBe(10);
    expect((ctx.summary.artistChanges as any)['artist_diego']).toBeUndefined();
    expect((ctx.summary.artistChanges as any)['artist_luna']).toBeUndefined();

    // Targeted path must not need to load the roster at all.
    expect(storage.getArtistsByGame).not.toHaveBeenCalled();
  });

  it('applies to ALL signed artists when artistId is absent (global role-meeting effect)', async () => {
    const processor = new ActionProcessor();
    const storage = buildStorageWithArtists();
    const ctx = buildContext({ storage: storage as any });

    await processor.applyEffects(ctx, { artist_energy: -5 }, undefined, 'global');

    expect((ctx.summary.artistChanges as any)['artist_nova']?.energy).toBe(-5);
    expect((ctx.summary.artistChanges as any)['artist_diego']?.energy).toBe(-5);
    expect((ctx.summary.artistChanges as any)['artist_luna']?.energy).toBe(-5);
    expect(storage.getArtistsByGame).toHaveBeenCalled();
  });
});

describe('ActionProcessor.applyEffects — artist_popularity targeting (C60)', () => {
  it('applies only to the targeted artist when artistId is present (delayed effect)', async () => {
    const processor = new ActionProcessor();
    const storage = buildStorageWithArtists();
    const ctx = buildContext({ storage: storage as any });

    await processor.applyEffects(ctx, { artist_popularity: 4 }, 'artist_diego', 'dialogue', 'scene_2', 'choice_2');

    expect((ctx.summary.artistChanges as any)['artist_diego']?.popularity).toBe(4);
    expect((ctx.summary.artistChanges as any)['artist_nova']).toBeUndefined();
    expect((ctx.summary.artistChanges as any)['artist_luna']).toBeUndefined();

    expect(storage.getArtistsByGame).not.toHaveBeenCalled();
  });

  it('applies to ALL signed artists when artistId is absent (global role-meeting effect)', async () => {
    const processor = new ActionProcessor();
    const storage = buildStorageWithArtists();
    const ctx = buildContext({ storage: storage as any });

    await processor.applyEffects(ctx, { artist_popularity: 2 }, undefined, 'global');

    expect((ctx.summary.artistChanges as any)['artist_nova']?.popularity).toBe(2);
    expect((ctx.summary.artistChanges as any)['artist_diego']?.popularity).toBe(2);
    expect((ctx.summary.artistChanges as any)['artist_luna']?.popularity).toBe(2);
    expect(storage.getArtistsByGame).toHaveBeenCalled();
  });
});

describe('ActionProcessor.processDelayedEffects — artist_energy/popularity threading (C60)', () => {
  it('threads artistId from a delayed flag through to applyEffects, targeting only that artist', async () => {
    const processor = new ActionProcessor();
    const storage = buildStorageWithArtists();
    const ctx = buildContext({ storage: storage as any });

    ctx.gameState.flags = {
      'artist_dialogue_choice-delayed': {
        triggerWeek: 5,
        artistId: 'artist_luna',
        targetScope: 'dialogue',
        meetingName: 'scene_x',
        choiceId: 'choice_x',
        effects: { artist_energy: 7, artist_popularity: 3 },
      },
    };

    await processor.processDelayedEffects(ctx);

    expect((ctx.summary.artistChanges as any)['artist_luna']?.energy).toBe(7);
    expect((ctx.summary.artistChanges as any)['artist_luna']?.popularity).toBe(3);
    expect((ctx.summary.artistChanges as any)['artist_nova']).toBeUndefined();
    expect((ctx.summary.artistChanges as any)['artist_diego']).toBeUndefined();
  });
});
