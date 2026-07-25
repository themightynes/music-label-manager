/**
 * Meeting prompt placeholder resolution — {artistName}/{songTitle}.
 *
 * Fixes the renderer limitation where global-scope REACTIVE meetings rendered
 * their placeholders literally (the reactive happening knows which artist/song
 * triggered the meeting, but the templating layer never received it). The three
 * affected meetings in data/actions.json are pinned here so a regression (or a
 * newly authored placeholder without context threading) goes red, not literal.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { resolveMeetingPromptPlaceholders } from '../../client/src/utils/meetingPromptPlaceholders';

const LITERAL_PLACEHOLDER = /\{(artistName|songTitle)\}/;

describe('resolveMeetingPromptPlaceholders', () => {
  it('substitutes {artistName} with the provided artist name', () => {
    expect(
      resolveMeetingPromptPlaceholders('Talk to {artistName} today.', { artistName: 'Aurora' })
    ).toBe('Talk to Aurora today.');
  });

  it('substitutes {songTitle} with the provided song title', () => {
    expect(
      resolveMeetingPromptPlaceholders('After {songTitle} charted, everything changed.', {
        songTitle: 'Neon Nights',
      })
    ).toBe('After Neon Nights charted, everything changed.');
  });

  it('substitutes both placeholders in one prompt', () => {
    expect(
      resolveMeetingPromptPlaceholders('{artistName} heard {songTitle} on the radio.', {
        artistName: 'Aurora',
        songTitle: 'Neon Nights',
      })
    ).toBe('Aurora heard Neon Nights on the radio.');
  });

  it('falls back to the artist possessive for {songTitle} when only the artist is known', () => {
    expect(
      resolveMeetingPromptPlaceholders('After {songTitle} charted.', { artistName: 'Aurora' })
    ).toBe("After Aurora's song charted.");
  });

  it('falls back to neutral prose when no context is available — never literal braces', () => {
    const resolved = resolveMeetingPromptPlaceholders(
      '{artistName} is worried about {songTitle}.',
      {}
    );
    expect(resolved).toBe('your artist is worried about the song.');
    expect(resolved).not.toMatch(LITERAL_PLACEHOLDER);
  });

  it('leaves a placeholder-free prompt byte-identical (non-reactive meetings unchanged)', () => {
    const prompt = 'A generic prompt with {braces} that are not placeholders.';
    expect(resolveMeetingPromptPlaceholders(prompt, {})).toBe(prompt);
    expect(resolveMeetingPromptPlaceholders(prompt, { artistName: 'Aurora' })).toBe(prompt);
  });

  it('replaces every occurrence, not just the first', () => {
    expect(
      resolveMeetingPromptPlaceholders('{artistName}, {artistName}!', { artistName: 'Aurora' })
    ).toBe('Aurora, Aurora!');
  });
});

describe('affected global reactive meetings in data/actions.json', () => {
  const actionsPath = path.resolve(__dirname, '../../data/actions.json');
  const actionsData = JSON.parse(fs.readFileSync(actionsPath, 'utf-8'));
  const actions: any[] = actionsData.weekly_actions ?? actionsData.actions ?? [];

  // The three global-scope reactive meetings whose prompts carry placeholders
  // that used to render literally (renderer limitation, fixed 2026-07-20).
  const AFFECTED_IDS = [
    'one_that_got_away_again',
    'chart_debut_one_hour_window',
    'old_tweets_surface',
  ];

  for (const id of AFFECTED_IDS) {
    it(`${id}: prompt resolves without literal placeholders (full + empty context)`, () => {
      const meeting = actions.find((a) => a.id === id);
      expect(meeting, `meeting ${id} must exist in data/actions.json`).toBeTruthy();
      expect(meeting.target_scope).toBe('global');
      expect(meeting.reactive_trigger).toBeTruthy();

      // With the reactive happening's names threaded through.
      const full = resolveMeetingPromptPlaceholders(meeting.prompt, {
        artistName: 'Aurora',
        songTitle: 'Neon Nights',
      });
      expect(full).not.toMatch(LITERAL_PLACEHOLDER);

      // Even if the server couldn't resolve names, fallbacks must hold.
      const empty = resolveMeetingPromptPlaceholders(meeting.prompt, {});
      expect(empty).not.toMatch(LITERAL_PLACEHOLDER);
    });
  }
});
