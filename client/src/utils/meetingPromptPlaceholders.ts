/**
 * Meeting prompt placeholder resolution ({artistName} / {songTitle}).
 *
 * Fixes the renderer limitation where global-scope REACTIVE meetings (e.g.
 * `one_that_got_away_again`, `chart_debut_one_hour_window`,
 * `old_tweets_surface` in data/actions.json) rendered their placeholders
 * literally: those meetings fire because a specific happening occurred, and
 * the server attaches that happening's names on the selected meeting as
 * `reactiveContext` (server/routes/executives.ts) — but the templating layer
 * only ever knew about the user_selected artist pick. This helper is the one
 * place prompt placeholders resolve, fed by whichever context a surface has:
 * the player-picked artist (user_selected) OR the reactive happening's
 * artist/song (global reactive).
 *
 * Fallback contract: literal `{artistName}` / `{songTitle}` must NEVER reach
 * the player. When a name is missing (e.g. the server couldn't resolve one),
 * we degrade to neutral prose — `{songTitle}` prefers the artist possessive
 * ("Aurora's song") before the fully generic "the song".
 *
 * The fallbacks are a PRODUCTION crash-safety net only — content is forbidden
 * from depending on them. Authoring-time guarantee lives in
 * tests/engine/data-lint-prompt-placeholders.test.ts (a placeholder may only
 * appear where context is always supplied); at runtime, hitting a fallback in
 * dev logs a loud console.error so the content/context bug is caught during
 * playtesting instead of hiding behind vague copy.
 */

export interface PromptPlaceholderContext {
  artistName?: string;
  songTitle?: string;
}

const ARTIST_PLACEHOLDER = /\{artistName\}/g;
const SONG_PLACEHOLDER = /\{songTitle\}/g;

export function resolveMeetingPromptPlaceholders(
  prompt: string,
  context: PromptPlaceholderContext = {}
): string {
  const { artistName, songTitle } = context;

  if (import.meta.env.DEV) {
    if (!artistName && ARTIST_PLACEHOLDER.test(prompt)) {
      console.error(
        '[meetingPromptPlaceholders] {artistName} hit its generic fallback — the prompt uses a placeholder no context supplies. ' +
          'This is a content/context bug (see tests/engine/data-lint-prompt-placeholders.test.ts). Prompt: ' +
          prompt.slice(0, 120),
      );
    }
    if (!songTitle && SONG_PLACEHOLDER.test(prompt)) {
      console.error(
        '[meetingPromptPlaceholders] {songTitle} hit its fallback — only chart_debut-reactive meetings may use it. ' +
          'This is a content/context bug (see tests/engine/data-lint-prompt-placeholders.test.ts). Prompt: ' +
          prompt.slice(0, 120),
      );
    }
    // .test() on a /g/ regex advances lastIndex — reset so the replaces below
    // and later calls always scan from the start.
    ARTIST_PLACEHOLDER.lastIndex = 0;
    SONG_PLACEHOLDER.lastIndex = 0;
  }

  const artistText = artistName || 'your artist';
  const songText = songTitle || (artistName ? `${artistName}'s song` : 'the song');

  return prompt
    .replace(ARTIST_PLACEHOLDER, artistText)
    .replace(SONG_PLACEHOLDER, songText);
}
