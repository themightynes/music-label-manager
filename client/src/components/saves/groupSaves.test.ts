import { describe, it, expect } from 'vitest';
import { groupSaves, UNKNOWN_GROUP_KEY, type SaveSummary } from './groupSaves';

let idCounter = 0;
function makeSave(overrides: Partial<SaveSummary> = {}): SaveSummary {
  idCounter += 1;
  return {
    id: `save-${idCounter}`,
    name: `Save ${idCounter}`,
    week: 1,
    isAutosave: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    money: 1000,
    reputation: 10,
    gameId: 'game-a',
    musicLabelName: 'Label A',
    ...overrides,
  };
}

describe('groupSaves', () => {
  it('returns empty for no saves', () => {
    expect(groupSaves([], 'game-a')).toEqual([]);
  });

  it('groups saves by gameId with the label name as group label', () => {
    const groups = groupSaves(
      [
        makeSave({ gameId: 'game-a', musicLabelName: 'Label A' }),
        makeSave({ gameId: 'game-b', musicLabelName: 'Label B' }),
        makeSave({ gameId: 'game-a', musicLabelName: 'Label A' }),
      ],
      null
    );
    expect(groups).toHaveLength(2);
    const labels = groups.map(g => g.label).sort();
    expect(labels).toEqual(['Label A', 'Label B']);
    expect(groups.find(g => g.key === 'game-a')?.manualSaves).toHaveLength(2);
  });

  it('pins the current game group first even when another was played later', () => {
    const groups = groupSaves(
      [
        makeSave({ gameId: 'game-old', musicLabelName: 'Old', updatedAt: '2026-07-20T00:00:00.000Z' }),
        makeSave({ gameId: 'game-cur', musicLabelName: 'Current', updatedAt: '2026-07-01T00:00:00.000Z' }),
      ],
      'game-cur'
    );
    expect(groups[0].key).toBe('game-cur');
    expect(groups[0].isCurrent).toBe(true);
    expect(groups[1].isCurrent).toBe(false);
  });

  it('orders non-current groups by most recently played', () => {
    const groups = groupSaves(
      [
        makeSave({ gameId: 'g1', musicLabelName: 'One', updatedAt: '2026-07-05T00:00:00.000Z' }),
        makeSave({ gameId: 'g2', musicLabelName: 'Two', updatedAt: '2026-07-15T00:00:00.000Z' }),
        makeSave({ gameId: 'g3', musicLabelName: 'Three', updatedAt: '2026-07-10T00:00:00.000Z' }),
      ],
      null
    );
    expect(groups.map(g => g.key)).toEqual(['g2', 'g3', 'g1']);
  });

  it('splits manual saves and autosaves with their own sort orders', () => {
    const groups = groupSaves(
      [
        makeSave({ id: 'm1', isAutosave: false, updatedAt: '2026-07-02T00:00:00.000Z' }),
        makeSave({ id: 'm2', isAutosave: false, updatedAt: '2026-07-04T00:00:00.000Z' }),
        makeSave({ id: 'a1', isAutosave: true, week: 5, updatedAt: '2026-07-03T00:00:00.000Z' }),
        makeSave({ id: 'a2', isAutosave: true, week: 7, updatedAt: '2026-07-01T00:00:00.000Z' }),
      ],
      null
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].manualSaves.map(s => s.id)).toEqual(['m2', 'm1']); // updatedAt desc
    expect(groups[0].autosaves.map(s => s.id)).toEqual(['a2', 'a1']); // week desc
  });

  it('buckets null-gameId saves into a trailing Unknown Label group', () => {
    const groups = groupSaves(
      [
        makeSave({ gameId: null, musicLabelName: null, updatedAt: '2026-07-30T00:00:00.000Z' }),
        makeSave({ gameId: 'game-a', updatedAt: '2026-07-01T00:00:00.000Z' }),
      ],
      null
    );
    expect(groups).toHaveLength(2);
    expect(groups[groups.length - 1].key).toBe(UNKNOWN_GROUP_KEY);
    expect(groups[groups.length - 1].label).toBe('Unknown Label');
  });

  it('computes lastPlayedAt as the max updatedAt in the group', () => {
    const groups = groupSaves(
      [
        makeSave({ updatedAt: '2026-07-02T00:00:00.000Z' }),
        makeSave({ updatedAt: '2026-07-09T00:00:00.000Z' }),
        makeSave({ updatedAt: '2026-07-05T00:00:00.000Z' }),
      ],
      null
    );
    expect(groups[0].lastPlayedAt).toBe('2026-07-09T00:00:00.000Z');
  });

  it('disambiguates colliding label names with the latest week', () => {
    const groups = groupSaves(
      [
        makeSave({ gameId: 'g1', musicLabelName: 'Same Name', week: 12 }),
        makeSave({ gameId: 'g2', musicLabelName: 'Same Name', week: 30 }),
      ],
      null
    );
    const labels = groups.map(g => g.label).sort();
    expect(labels).toEqual(['Same Name · Week 12', 'Same Name · Week 30']);
  });

  it('handles a group with only autosaves', () => {
    const groups = groupSaves([makeSave({ isAutosave: true, week: 3 })], null);
    expect(groups[0].manualSaves).toEqual([]);
    expect(groups[0].autosaves).toHaveLength(1);
  });
});
