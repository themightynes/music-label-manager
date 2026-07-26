/**
 * C55 safe slice — email-failure observability flag.
 *
 * GameEngine.generateAndPersistEmails deliberately SWALLOWS failures (the week
 * commits without its emails; rethrow-vs-log is a pending designer ruling).
 * This suite pins the new structured signal: on any generation/persistence
 * failure the week summary carries `emailGenerationFailed: true`, and on the
 * success / no-email paths the field is never set (snapshot-safe).
 *
 * DB-free: drives the private method via runtime access (established pattern),
 * with the EmailGenerator module mocked for deterministic failure injection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameEngine } from '@shared/engine/game-engine';
import type { WeekSummary } from '@shared/types/gameTypes';

const { generateEmailsMock } = vi.hoisted(() => ({ generateEmailsMock: vi.fn() }));

vi.mock('@shared/engine/EmailGenerator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/engine/EmailGenerator')>();
  return { ...actual, generateEmails: generateEmailsMock };
});

const FAKE_EMAIL = {
  gameId: 'email-flag-game',
  week: 10,
  category: 'financial',
  sender: 'System',
  senderRoleId: null,
  subject: 'Test',
  preview: 'Test',
  body: {},
  metadata: {},
  isRead: false,
};

function buildGameData() {
  return {
    getBalanceConfigSync: () => ({ reputation_system: { reputation_gain_scaling: 1.0 } }),
    getAccessTiersSync: () => ({
      venue_access: {
        none: { threshold: 0, capacity_range: [0, 50], guarantee_multiplier: 0.3 },
        clubs: { threshold: 5, capacity_range: [50, 500], guarantee_multiplier: 0.7 },
        theaters: { threshold: 20, capacity_range: [500, 2000], guarantee_multiplier: 1.0 },
        arenas: { threshold: 45, capacity_range: [2000, 20000], guarantee_multiplier: 1.5 },
      },
    }),
    getTourConfigSync: () => ({
      sell_through_base: 0.15,
      reputation_modifier: 0.05,
      local_popularity_weight: 0.6,
      merch_percentage: 0.15,
      ticket_price_base: 25,
      ticket_price_per_capacity: 0.03,
    }),
    getAllArtists: async () => [],
  } as any;
}

function buildEngine(storage: any) {
  const gameState: any = {
    id: 'email-flag-game',
    currentWeek: 10,
    reputation: 50,
    flags: {},
  };
  return new GameEngine(gameState, buildGameData(), storage, 'email-flag-seed');
}

function makeSummary(): WeekSummary {
  return { week: 10, changes: [], revenue: 0, expenses: 0, reputationChanges: {}, events: [] };
}

describe('generateAndPersistEmails — C55 emailGenerationFailed flag', () => {
  beforeEach(() => {
    generateEmailsMock.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('sets summary.emailGenerationFailed when email GENERATION throws (swallow semantics preserved — no rethrow)', async () => {
    generateEmailsMock.mockImplementation(() => {
      throw new Error('generator exploded');
    });
    const engine = buildEngine({ createEmails: vi.fn() });
    const summary = makeSummary();
    await expect((engine as any).generateAndPersistEmails(summary)).resolves.toBeUndefined();
    expect(summary.emailGenerationFailed).toBe(true);
  });

  it('sets summary.emailGenerationFailed when PERSISTENCE rejects', async () => {
    generateEmailsMock.mockReturnValue([FAKE_EMAIL]);
    const createEmails = vi.fn().mockRejectedValue(new Error('db down'));
    const engine = buildEngine({ createEmails });
    const summary = makeSummary();
    await expect((engine as any).generateAndPersistEmails(summary)).resolves.toBeUndefined();
    expect(createEmails).toHaveBeenCalled();
    expect(summary.emailGenerationFailed).toBe(true);
  });

  it('does NOT set the flag on success (snapshot-safe: field absent, not false)', async () => {
    generateEmailsMock.mockReturnValue([FAKE_EMAIL]);
    const engine = buildEngine({ createEmails: vi.fn().mockResolvedValue(undefined) });
    const summary = makeSummary();
    await (engine as any).generateAndPersistEmails(summary);
    expect('emailGenerationFailed' in summary).toBe(false);
    expect((summary as any).generatedEmails).toBe(1);
  });

  it('does NOT set the flag when zero emails are generated (early return, not a failure)', async () => {
    generateEmailsMock.mockReturnValue([]);
    const engine = buildEngine({ createEmails: vi.fn() });
    const summary = makeSummary();
    await (engine as any).generateAndPersistEmails(summary);
    expect('emailGenerationFailed' in summary).toBe(false);
  });

  it('does NOT set the flag when storage.createEmails is unavailable (skip path, before the try)', async () => {
    generateEmailsMock.mockReturnValue([FAKE_EMAIL]);
    const engine = buildEngine({});
    const summary = makeSummary();
    await (engine as any).generateAndPersistEmails(summary);
    expect('emailGenerationFailed' in summary).toBe(false);
  });
});
