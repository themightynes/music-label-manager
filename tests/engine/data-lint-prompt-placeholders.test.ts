/**
 * Data lint — meeting prompt placeholders must be resolvable.
 *
 * Placeholder-fix follow-up (2026-07-20, designer ruling): the client resolves
 * `{artistName}` / `{songTitle}` in meeting prompts from whichever context the
 * surface has (client/src/utils/meetingPromptPlaceholders.ts) — the player's
 * artist pick (user_selected scope) or the triggering happening's names
 * (reactiveContext, attached route-side in server/routes/executives.ts). Its
 * generic fallbacks ("your artist" / "the song") exist ONLY as a production
 * crash-safety net; content must never actually depend on them. This lint is
 * the authoring-time guarantee: a placeholder may only appear where the game
 * can ALWAYS supply the real name.
 *
 * Context contract (from deriveWeekHappenings, shared/engine/weekHappenings.ts):
 *  - every happening type ('chart_debut', 'release_out', 'mood_crater',
 *    'recent_signing') carries artistName;
 *  - ONLY 'chart_debut' carries songTitle (chart_entries.songTitle).
 *
 * Rules per weekly_action:
 *  1. Prompt fields may only use the known placeholders {artistName} /
 *     {songTitle} — any other {token} is a typo or an unsupported template.
 *  2. {artistName} in `prompt` requires target_scope 'user_selected' (player
 *     pick supplies it) OR any reactive_trigger (happening supplies it).
 *  3. {songTitle} in `prompt` requires a reactive_trigger that carries a song
 *     — today that is exactly 'chart_debut'.
 *  4. `prompt_before_selection` renders BEFORE the artist pick exists, so it
 *     may contain no placeholders at all.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { HAPPENING_TYPES } from '@shared/types/gameTypes';

const actions = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'actions.json'), 'utf-8'),
);

const KNOWN_PLACEHOLDERS = new Set(['artistName', 'songTitle']);

/** Happening types whose derived context carries songTitle (weekHappenings.ts). */
const SONG_BEARING_TRIGGERS: ReadonlySet<string> = new Set(['chart_debut']);

const PLACEHOLDER_TOKEN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

function placeholdersIn(text: string | undefined): string[] {
  if (!text) return [];
  return Array.from(text.matchAll(PLACEHOLDER_TOKEN), (m) => m[1]);
}

describe('data-lint: meeting prompt placeholders are always resolvable', () => {
  const meetings: any[] = actions.weekly_actions;

  it('sanity: the catalog is non-empty and someone uses a placeholder (lint is live)', () => {
    expect(meetings.length).toBeGreaterThan(0);
    const anyUse = meetings.some(
      (m) => placeholdersIn(m.prompt).length > 0,
    );
    expect(anyUse).toBe(true);
  });

  it('prompts use only the known placeholders {artistName} / {songTitle}', () => {
    const violations: string[] = [];
    for (const m of meetings) {
      for (const field of ['prompt', 'prompt_before_selection'] as const) {
        for (const token of placeholdersIn(m[field])) {
          if (!KNOWN_PLACEHOLDERS.has(token)) {
            violations.push(`${m.id}.${field}: unknown placeholder {${token}}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('{artistName} in prompt only where an artist is guaranteed (user_selected or reactive)', () => {
    const violations: string[] = [];
    for (const m of meetings) {
      if (!placeholdersIn(m.prompt).includes('artistName')) continue;
      const userPicks = m.target_scope === 'user_selected';
      const reactive =
        typeof m.reactive_trigger === 'string' &&
        (HAPPENING_TYPES as readonly string[]).includes(m.reactive_trigger);
      if (!userPicks && !reactive) {
        violations.push(
          `${m.id}: {artistName} in prompt but target_scope=${m.target_scope ?? 'global'} and no reactive_trigger — nothing supplies the name`,
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it('{songTitle} in prompt only on song-bearing reactive triggers (chart_debut)', () => {
    const violations: string[] = [];
    for (const m of meetings) {
      if (!placeholdersIn(m.prompt).includes('songTitle')) continue;
      if (!SONG_BEARING_TRIGGERS.has(m.reactive_trigger)) {
        violations.push(
          `${m.id}: {songTitle} in prompt but reactive_trigger=${m.reactive_trigger ?? '(none)'} carries no songTitle`,
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it('prompt_before_selection carries no placeholders (renders before any pick exists)', () => {
    const violations: string[] = [];
    for (const m of meetings) {
      const tokens = placeholdersIn(m.prompt_before_selection);
      if (tokens.length) {
        violations.push(`${m.id}.prompt_before_selection: {${tokens.join('}, {')}}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
