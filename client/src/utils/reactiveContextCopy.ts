import type { HappeningType } from '../../../shared/types/gameTypes';

/**
 * Tier 2 (PR-2) — "why now" copy formatter.
 *
 * Shared by `MeetingSelector` (carousel card) and `AutoSelectReviewPanel` (AUTO
 * review row): both consumers render the same reason line when a meeting's
 * `reactiveContext` is present. Kept in one place so the two surfaces can't
 * drift on wording (spec §2 / §"Urgency indicator" amendment).
 *
 * The reveal is the payoff — this line answers "why now", never restating the
 * meeting's own prompt or effects. Falls back to a generic phrasing when the
 * optional artist/song name is absent (e.g. `mood_crater` context server-side
 * failed to resolve an artist name).
 */
export interface ReactiveContextLike {
  trigger: HappeningType;
  artistName?: string;
  songTitle?: string;
}

export function formatWhyNow(context: ReactiveContextLike): string {
  switch (context.trigger) {
    case 'chart_debut':
      return context.songTitle
        ? `Because "${context.songTitle}" hit the charts last week`
        : 'Because a song hit the charts last week';
    case 'release_out':
      return context.artistName
        ? `Because ${context.artistName}'s release went out last week`
        : 'Because a release went out last week';
    case 'mood_crater':
      return context.artistName
        ? `Because ${context.artistName} is in crisis`
        : 'Because an artist is in crisis';
    case 'recent_signing':
      return context.artistName
        ? `Because ${context.artistName} signed last week`
        : 'Because a new artist signed last week';
    default: {
      // Exhaustiveness guard: a new HappeningType without copy here is a
      // compile error, not a silent generic fallback.
      const exhaustive: never = context.trigger;
      return exhaustive;
    }
  }
}
