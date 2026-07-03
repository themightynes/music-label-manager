/**
 * B6 (Phase 2 engine-seams PR-9, decision D3) + stage-machine unit coverage.
 *
 * PR-9 deleted the no-op processNewlyRecordedProjects / processProjectSongRecording
 * pass and re-wired its "recording completed - ready for release" notification into
 * SongGenerationProcessor.generateWeeklyProjectSongs — fired when a project's last
 * song is generated. The golden master's recording-week scenario captures this, but
 * these unit tests pin the notification behavior DIRECTLY (fires on completion,
 * stays silent mid-recording) so a future refactor can't silently drop it.
 *
 * The gameData reuses the golden-master fixtures' createGameData (real sync balance
 * getters + real FinancialSystem validation) augmented with quality.json's
 * quality_system / producer_tier_system (the fixtures balance omits them and the
 * budget-quality multiplier would otherwise throw — see song-quality.test.ts).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import seedrandom from 'seedrandom';
import { FinancialSystem } from '@shared/engine/FinancialSystem';
import { SongGenerationProcessor } from '@shared/engine/processors/SongGenerationProcessor';
import type { WeekContext } from '@shared/engine/processors/types';
import type { WeekSummary } from '@shared/types/gameTypes';
import { createGameData } from './golden-master-fixtures';

const quality = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'quality.json'), 'utf-8'),
);
const baseGameData = createGameData({} as any, []);
const fullBalance = {
  ...baseGameData.getBalanceConfigSync(),
  quality_system: quality.quality_system,
  producer_tier_system: quality.producer_tier_system,
};

const ARTIST = { id: 'artist-1', name: 'Recorder', talent: 60, workEthic: 70, popularity: 50, mood: 50, genre: 'pop' };

/**
 * Builds a WeekContext whose gameData stubs the writes (createSong / updateProject)
 * and returns the fixed ARTIST, over a seeded RNG so generateSong is deterministic.
 */
function makeCtx(seed: string): { ctx: WeekContext; summary: WeekSummary } {
  const rng = seedrandom(seed);
  const gameData: any = {
    ...baseGameData,
    getBalanceConfigSync: () => fullBalance,
    getArtistById: async () => ARTIST,
    createSong: async (song: any) => song,
    updateProject: async () => {},
  };
  const financialSystem = new FinancialSystem(gameData, rng as any);
  const summary = { changes: [] } as unknown as WeekSummary;
  const ctx: WeekContext = {
    gameState: { id: 'game-1', currentWeek: 3 } as any,
    summary,
    gameData,
    storage: {},
    financialSystem,
    getRandom: (min: number, max: number) => min + rng() * (max - min),
  };
  return { ctx, summary };
}

const proc = new SongGenerationProcessor();

describe('SongGenerationProcessor — B6 recording-complete notification (D3)', () => {
  it('fires a per-song "ready for release" unlock notification when the project completes', async () => {
    const { ctx, summary } = makeCtx('B6-complete');
    // Single, songCount 2, 0 created -> getSongsPerWeek('Single')=2 -> both generated -> completes.
    const project = {
      id: 'proj-1',
      gameId: 'game-1',
      artistId: ARTIST.id,
      title: 'Debut Single',
      type: 'Single',
      songCount: 2,
      songsCreated: 0,
      producerTier: 'local',
      timeInvestment: 'standard',
      budgetPerSong: 4000,
      totalCost: 8000,
    };

    await proc.generateWeeklyProjectSongs(ctx, project, summary);

    const unlocks = summary.changes.filter(
      (c: any) => c.type === 'unlock' && /recording completed - ready for release/.test(c.description),
    );
    expect(unlocks).toHaveLength(2);
    // Shape matches the deleted processProjectSongRecording pass exactly.
    for (const u of unlocks) {
      expect(u).toMatchObject({ type: 'unlock', amount: 0 });
      expect(u.description).toMatch(/^🎵 ".+" recording completed - ready for release$/);
    }
    // Completion economic summary still fires too.
    expect(
      summary.changes.some(
        (c: any) => c.type === 'project_complete' && /Recording completed for Debut Single/.test(c.description),
      ),
    ).toBe(true);
  });

  it('does NOT fire the notification while a project is still recording', async () => {
    const { ctx, summary } = makeCtx('B6-partial');
    // EP, songCount 5, 0 created -> getSongsPerWeek('EP')=3 -> 3 generated, 2 remaining -> NOT complete.
    const project = {
      id: 'proj-2',
      gameId: 'game-1',
      artistId: ARTIST.id,
      title: 'Big EP',
      type: 'EP',
      songCount: 5,
      songsCreated: 0,
      producerTier: 'local',
      timeInvestment: 'standard',
      budgetPerSong: 4000,
      totalCost: 20000,
    };

    await proc.generateWeeklyProjectSongs(ctx, project, summary);

    expect(project.songsCreated).toBe(3);
    const unlocks = summary.changes.filter(
      (c: any) => c.type === 'unlock' && /ready for release/.test(c.description),
    );
    expect(unlocks).toHaveLength(0);
  });

  it('stamps recordedAt at creation (songs are born recorded, B6/D3)', async () => {
    const { ctx } = makeCtx('recordedAt');
    const song = proc.generateSong(
      ctx,
      { id: 'p', gameId: 'game-1', artistId: ARTIST.id, title: 'X', type: 'Single', songCount: 1, budgetPerSong: 4000, producerTier: 'local', timeInvestment: 'standard' },
      ARTIST,
    );
    expect(song.isRecorded).toBe(true);
    expect(song.recordedAt).toBeInstanceOf(Date);
  });
});

describe('SongGenerationProcessor — stage/rate helpers', () => {
  it('getSongsPerWeek: Single=2, EP=3, default=2', () => {
    expect(proc.getSongsPerWeek('Single')).toBe(2);
    expect(proc.getSongsPerWeek('EP')).toBe(3);
    expect(proc.getSongsPerWeek('Anything')).toBe(2);
  });

  it('shouldGenerateProjectSongs: only Single/EP in production with songs remaining', () => {
    expect(proc.shouldGenerateProjectSongs({ type: 'Single', stage: 'production', songCount: 2, songsCreated: 0 })).toBe(true);
    expect(proc.shouldGenerateProjectSongs({ type: 'EP', stage: 'production', songCount: 3, songsCreated: 3 })).toBe(false); // all created
    expect(proc.shouldGenerateProjectSongs({ type: 'Single', stage: 'planning', songCount: 2, songsCreated: 0 })).toBe(false); // wrong stage
    expect(proc.shouldGenerateProjectSongs({ type: 'Mini-Tour', stage: 'production', songCount: 1, songsCreated: 0 })).toBe(false); // wrong type
  });
});
