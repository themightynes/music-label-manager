// Pure grouping logic for the Save & Load browser. Groups the flat
// GET /api/saves summary list into per-playthrough buckets keyed by the
// gameId embedded in each snapshot (extracted server-side in getGameSaves).

export type SaveSummary = {
  id: string;
  name: string;
  week: number;
  isAutosave: boolean | null;
  createdAt: string;
  updatedAt: string;
  money: number | null;
  reputation: number | null;
  gameId: string | null;
  musicLabelName?: string | null;
};

export type SaveGroup = {
  /** gameId, or 'unknown' for legacy saves whose snapshot lacks one */
  key: string;
  label: string;
  isCurrent: boolean;
  /** max updatedAt across the group's saves (ISO string) */
  lastPlayedAt: string;
  /** sorted updatedAt desc */
  manualSaves: SaveSummary[];
  /** sorted week desc, tiebreak updatedAt desc */
  autosaves: SaveSummary[];
};

export const UNKNOWN_GROUP_KEY = 'unknown';
const UNKNOWN_GROUP_LABEL = 'Unknown Label';

/**
 * Group saves by playthrough. Ordering: the current game's group first,
 * then by most recently played. Saves with no gameId collapse into a
 * single trailing "Unknown Label" group. Groups whose labels collide are
 * disambiguated with their latest week.
 */
export function groupSaves(
  saves: SaveSummary[],
  currentGameId: string | null | undefined
): SaveGroup[] {
  const byKey = new Map<string, SaveSummary[]>();
  for (const save of saves) {
    const key = save.gameId ?? UNKNOWN_GROUP_KEY;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.push(save);
    } else {
      byKey.set(key, [save]);
    }
  }

  const groups: SaveGroup[] = [];
  byKey.forEach((bucket, key) => {
    const manualSaves = bucket
      .filter(save => !save.isAutosave)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const autosaves = bucket
      .filter(save => save.isAutosave)
      .sort((a, b) => b.week - a.week || b.updatedAt.localeCompare(a.updatedAt));
    const lastPlayedAt = bucket.reduce(
      (max, save) => (save.updatedAt > max ? save.updatedAt : max),
      bucket[0].updatedAt
    );
    groups.push({
      key,
      label:
        key === UNKNOWN_GROUP_KEY
          ? UNKNOWN_GROUP_LABEL
          : bucket.find(save => save.musicLabelName)?.musicLabelName ?? UNKNOWN_GROUP_LABEL,
      isCurrent: !!currentGameId && key === currentGameId,
      lastPlayedAt,
      manualSaves,
      autosaves,
    });
  });

  groups.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if ((a.key === UNKNOWN_GROUP_KEY) !== (b.key === UNKNOWN_GROUP_KEY)) {
      return a.key === UNKNOWN_GROUP_KEY ? 1 : -1;
    }
    return b.lastPlayedAt.localeCompare(a.lastPlayedAt);
  });

  // Disambiguate colliding labels (two playthroughs named the same) with
  // each group's latest week so the headers stay distinguishable.
  const labelCounts = new Map<string, number>();
  for (const group of groups) {
    labelCounts.set(group.label, (labelCounts.get(group.label) ?? 0) + 1);
  }
  for (const group of groups) {
    if ((labelCounts.get(group.label) ?? 0) > 1) {
      const maxWeek = Math.max(
        0,
        ...group.manualSaves.map(save => save.week),
        ...group.autosaves.map(save => save.week)
      );
      group.label = `${group.label} · Week ${maxWeek}`;
    }
  }

  return groups;
}
