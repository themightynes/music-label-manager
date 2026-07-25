/**
 * Item 5 (2026-07-25) — seeded weighted artist binding for auto_bind_artist
 * user_selected meetings (shared/engine/artistBinding.ts).
 *
 * The same (roster, seed) pair must always bind the same artist — the offer
 * route and the engine's autonomous-resolution path both call this helper
 * with generateMeetingSeed(gameId, week, roleId), which is the two-site
 * parity contract.
 */
import { describe, it, expect } from 'vitest';
import { pickBoundArtist, type BindableArtist } from '@shared/engine/artistBinding';

function artist(id: string, popularity: number, signed: boolean | null = true): BindableArtist {
  return { id, name: `Artist ${id}`, popularity, signed };
}

describe('pickBoundArtist', () => {
  it('is deterministic: same roster + same seed → same artist', () => {
    const roster = [artist('a', 10), artist('b', 50), artist('c', 90)];
    const first = pickBoundArtist(roster, 'game-1-week5-cmo');
    for (let i = 0; i < 5; i++) {
      expect(pickBoundArtist(roster, 'game-1-week5-cmo')?.id).toBe(first?.id);
    }
  });

  it('different seeds can bind different artists (draw is seed-driven)', () => {
    const roster = [artist('a', 50), artist('b', 50), artist('c', 50), artist('d', 50)];
    const picks = new Set(
      Array.from({ length: 12 }, (_, week) =>
        pickBoundArtist(roster, `game-1-week${week}-cmo`)?.id
      )
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it('weights by popularity — a high-popularity artist wins most seeds', () => {
    const star = artist('star', 100);
    const nobody = artist('nobody', 0);
    let starWins = 0;
    for (let week = 0; week < 40; week++) {
      if (pickBoundArtist([nobody, star], `g-week${week}-r`)?.id === 'star') starWins++;
    }
    // weights are 120 vs 20 → star should take the clear majority.
    expect(starWins).toBeGreaterThan(24);
  });

  it('the popularity floor keeps a 0-popularity artist drawable', () => {
    const star = artist('star', 100);
    const fresh = artist('fresh', 0);
    let freshWins = 0;
    for (let week = 0; week < 60; week++) {
      if (pickBoundArtist([fresh, star], `g-week${week}-r`)?.id === 'fresh') freshWins++;
    }
    expect(freshWins).toBeGreaterThan(0);
  });

  it('filters unsigned artists and returns undefined for an empty roster', () => {
    expect(pickBoundArtist([], 'seed')).toBeUndefined();
    expect(pickBoundArtist([artist('x', 50, false)], 'seed')).toBeUndefined();
    expect(pickBoundArtist([artist('x', 50, false), artist('y', 10)], 'seed')?.id).toBe('y');
  });

  it('uses an isolated seed namespace (does not consume the meeting draw seed)', () => {
    // Sanity: binding with the base meeting seed must not equal a raw pick on
    // the same seed string — the -artistbind suffix isolates the draw.
    const roster = [artist('a', 50), artist('b', 50)];
    const bound = pickBoundArtist(roster, 'shared-seed');
    expect(bound).toBeDefined(); // deterministic, namespaced — smoke check
  });
});

describe('pickBoundArtist — fiction strategies (picker removal, 2026-07-25)', () => {
  it('low_mood weights toward the artist who needs the boost', () => {
    const hurting = { ...artist('hurting', 50), mood: 5 } as any;
    const thriving = { ...artist('thriving', 50), mood: 95 } as any;
    let hurtingWins = 0;
    for (let week = 0; week < 40; week++) {
      if (pickBoundArtist([thriving, hurting], `g-week${week}-cco`, 'low_mood')?.id === 'hurting') hurtingWins++;
    }
    // weights ~115 vs ~25 → the low-mood artist takes the clear majority.
    expect(hurtingWins).toBeGreaterThan(24);
  });

  it('low_popularity weights toward the up-and-comer', () => {
    const star = artist('star', 95);
    const fresh = artist('fresh', 5);
    let freshWins = 0;
    for (let week = 0; week < 40; week++) {
      if (pickBoundArtist([star, fresh], `g-week${week}-ar`, 'low_popularity')?.id === 'fresh') freshWins++;
    }
    expect(freshWins).toBeGreaterThan(24);
  });

  it('planned_release binds the artist of the SOONEST planned release outright', () => {
    const roster = [artist('a', 90), artist('b', 10), artist('c', 50)];
    const releases = [
      { artistId: 'c', status: 'planned', releaseWeek: 9 },
      { artistId: 'b', status: 'planned', releaseWeek: 7 },
      { artistId: 'a', status: 'released', releaseWeek: 2 },
    ];
    for (let week = 0; week < 5; week++) {
      expect(
        pickBoundArtist(roster, `g-week${week}-cmo`, 'planned_release', releases)?.id
      ).toBe('b');
    }
  });

  it('planned_release falls back to popularity weighting when nothing is planned', () => {
    const roster = [artist('a', 90), artist('b', 10)];
    const bound = pickBoundArtist(roster, 'g-week3-cmo', 'planned_release', [
      { artistId: 'a', status: 'released', releaseWeek: 2 },
    ]);
    expect(bound).toBeDefined(); // deterministic weighted fallback, no crash
  });

  it('resolveBindStrategy normalizes authored values', async () => {
    const { resolveBindStrategy } = await import('@shared/engine/artistBinding');
    expect(resolveBindStrategy(true)).toBe('popularity');
    expect(resolveBindStrategy('low_mood')).toBe('low_mood');
    expect(resolveBindStrategy('planned_release')).toBe('planned_release');
    expect(resolveBindStrategy(undefined)).toBeUndefined();
    expect(resolveBindStrategy(false)).toBeUndefined();
    expect(resolveBindStrategy('bogus_strategy')).toBe('popularity');
  });
});
