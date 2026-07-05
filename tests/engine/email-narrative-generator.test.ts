/**
 * Email Narrative Phase 1 — generator voice/mood/metadata/determinism coverage.
 *
 * Verifies that generateEmails produces distinct executive voices, mood-varied
 * subjects/sign-offs, the guide's per-exec metadata fields, and byte-identical
 * output for identical inputs (no RNG, no Math.random()).
 */
import { describe, it, expect } from 'vitest';
import { generateEmails, type ExecutiveMoodMap } from '@shared/engine/EmailGenerator';
import type { WeekSummary, GameChange, ChartUpdate } from '@shared/types/gameTypes';

const GAME_ID = 'game-narrative-1';

function summary(overrides: Partial<WeekSummary> = {}): WeekSummary {
  return {
    week: 7,
    revenue: 0,
    expenses: 0,
    changes: [],
    ...overrides,
  } as unknown as WeekSummary;
}

const DISCOVERED_ARTIST = {
  id: 'art_9',
  name: 'Nova Reign',
  archetype: 'Visionary',
  talent: 82,
  genre: 'Alt-Pop',
  bio: 'A bedroom-pop prodigy.',
  signingCost: 30000,
  weeklyCost: 1200,
};

function discoverySummary(): WeekSummary {
  return summary({
    arOffice: {
      completed: true,
      discoveredArtistId: 'art_9',
      sourcingType: 'active',
    },
  } as any);
}

describe('EmailGenerator narrative — A&R discovery voice + mood', () => {
  const genFor = (moods: ExecutiveMoodMap) =>
    generateEmails({
      gameId: GAME_ID,
      weekSummary: discoverySummary(),
      discoveredArtist: DISCOVERED_ARTIST,
      executiveMoods: moods,
    }).find((e) => e.category === 'ar')!;

  it('emits an A&R email from Mac with narrative body + metadata', () => {
    const email = genFor({ head_ar: 90 });
    expect(email).toBeDefined();
    expect(email.sender).toContain('Marcus');
    const body = email.body as Record<string, any>;
    expect(typeof body.narrativeBody).toBe('string');
    expect(body.narrativeBody).toContain('Nova Reign');
    expect(body.signOff).toContain('Mac');
  });

  it('includes the guide A&R metadata fields', () => {
    const email = genFor({ head_ar: 90 });
    const meta = email.metadata as Record<string, any>;
    expect(meta.scoutingLocation).toBeTruthy();
    expect(meta.macMoodLevel).toBe(90);
    expect(meta.moodBand).toBe('excellent');
    expect(typeof meta.isLateNightEmail).toBe('boolean');
    expect(meta).toHaveProperty('isTuesdayException');
  });

  it('varies subject/sign-off by mood band', () => {
    const excellent = genFor({ head_ar: 95 });
    const terrible = genFor({ head_ar: 5 });
    const exBody = excellent.body as Record<string, any>;
    const trBody = terrible.body as Record<string, any>;

    // Excellent Mac signs "Trust the ears" / "hunt continues"; terrible "Doing my best".
    expect(exBody.signOff).not.toBe(trBody.signOff);
    expect(trBody.signOff).toContain('Doing my best');
    // Excellent Mac is a late-night email with a timestamp quirk; terrible is not.
    expect(exBody.quirk).toBeTruthy();
    expect(exBody.narrativeBody).not.toBe(trBody.narrativeBody);
  });
});

describe('EmailGenerator narrative — distinct voices per exec', () => {
  it('the same "tier unlock" scenario reads differently from Sam vs Pat vs Dante', () => {
    const press: GameChange = { type: 'unlock', description: 'Mid-Tier Press Access', amount: 0 } as any;
    const playlist: GameChange = { type: 'unlock', description: 'Mid-Tier Playlist Access', amount: 0 } as any;
    const producer: GameChange = { type: 'unlock', description: 'Mid-Tier Producer Tier', amount: 0 } as any;

    const emails = generateEmails({
      gameId: GAME_ID,
      weekSummary: summary({ changes: [press, playlist, producer] }),
      executiveMoods: { cmo: 70, head_distribution: 70, cco: 70 },
    });

    const pressEmail = emails.find((e) => e.subject.includes('Press Tier'))!;
    const playlistEmail = emails.find((e) => e.subject.includes('Playlist Tier'))!;
    const producerEmail = emails.find((e) => e.subject.includes('Producer Access'))!;

    expect(pressEmail.sender).toContain('Samara');
    expect(playlistEmail.sender).toContain('Patricia');
    expect(producerEmail.sender).toContain('Dante');

    const pressBody = (pressEmail.body as any).narrativeBody as string;
    const playlistBody = (playlistEmail.body as any).narrativeBody as string;
    const producerBody = (producerEmail.body as any).narrativeBody as string;

    // Distinct voices: Sam = "narrative control", Pat = "No action required",
    // Dante = "universe rewards alignment".
    expect(pressBody).toContain('narrative control');
    expect(playlistBody).toContain('No action required');
    expect(producerBody).toContain('universe rewards alignment');
    expect(pressBody).not.toBe(playlistBody);
    expect(producerBody).not.toBe(playlistBody);
  });
});

describe('EmailGenerator narrative — chart email (Sam) mood variation', () => {
  const chart: ChartUpdate = {
    songTitle: 'Neon Ghost',
    artistName: 'Nova Reign',
    position: 4,
    movement: 0,
    weeksOnChart: 1,
    peakPosition: 4,
    isDebut: true,
  } as any;

  const genFor = (mood: number) =>
    generateEmails({
      gameId: GAME_ID,
      weekSummary: summary(),
      chartUpdates: [chart],
      executiveMoods: { cmo: mood },
    }).find((e) => e.category === 'chart')!;

  it('excellent vs terrible produce different subject and sign-off', () => {
    const excellent = genFor(90);
    const terrible = genFor(5);
    expect(excellent.subject).not.toBe(terrible.subject);
    expect((excellent.body as any).signOff).toContain('own the narrative');
    expect((terrible.body as any).signOff).toContain('Calls not being returned');
  });

  it('carries narrativeType metadata reflecting mood', () => {
    expect((genFor(90).metadata as any).narrativeType).toBe('offensive');
    expect((genFor(50).metadata as any).narrativeType).toBe('neutral');
    expect((genFor(10).metadata as any).narrativeType).toBe('defensive');
  });
});

describe('EmailGenerator narrative — tour email keeps legacy fields + adds voice', () => {
  const completion: GameChange = {
    type: 'project_complete',
    description: 'Quantum Leap Showcase tour completed - $20,000 gross, $12,000 net profit',
    amount: 0,
    projectId: 'tour-1',
    grossRevenue: 20000,
    totalCosts: 8000,
    netProfit: 12000,
  } as any;

  it('preserves netProfit/totalCosts and net preview (existing contract)', () => {
    const email = generateEmails({
      gameId: GAME_ID,
      weekSummary: summary({ changes: [completion] }),
      executiveMoods: { head_distribution: 85 },
    }).find((e) => e.subject.includes('Tour Metrics'))!;
    const body = email.body as Record<string, any>;
    expect(body.grossRevenue).toBe(20000);
    expect(body.totalCosts).toBe(8000);
    expect(body.netProfit).toBe(12000);
    expect(email.preview).toContain('Net profit');
    expect(body.narrativeBody).toContain('Dr. Williams');
  });
});

describe('EmailGenerator narrative — determinism', () => {
  it('produces byte-identical emails for identical inputs', () => {
    const build = () =>
      generateEmails({
        gameId: GAME_ID,
        weekSummary: discoverySummary(),
        discoveredArtist: DISCOVERED_ARTIST,
        chartUpdates: [
          {
            songTitle: 'Neon Ghost',
            artistName: 'Nova Reign',
            position: 1,
            movement: 0,
            weeksOnChart: 1,
            peakPosition: 1,
            isDebut: true,
          } as any,
        ],
        executiveMoods: { head_ar: 90, cmo: 30, head_distribution: 55 },
      });

    const first = build();
    const second = build();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('falls back to neutral band when no moods supplied (still valid)', () => {
    const emails = generateEmails({
      gameId: GAME_ID,
      weekSummary: discoverySummary(),
      discoveredArtist: DISCOVERED_ARTIST,
    });
    const ar = emails.find((e) => e.category === 'ar')!;
    expect((ar.metadata as any).moodBand).toBe('neutral');
  });
});
