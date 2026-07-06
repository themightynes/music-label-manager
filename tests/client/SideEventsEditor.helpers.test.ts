/**
 * Unit tests for the pure helpers extracted from SideEventsEditor.tsx (content-editor
 * slice 3). Mirrors slice 2's precedent (tests/client/ActionsViewer.requires-helper.test.ts)
 * of testing pure logic without mounting the component — GameLayout pulls Clerk/store
 * deps that aren't worth wiring up here.
 */
import { describe, it, expect } from 'vitest';
import { SIDE_EVENT_CATEGORIES } from '@shared/types/gameTypes';
import { newEventTemplate, getCategoryOptions, slugifyIdFromPromptWords } from '@/admin/SideEventsEditor';

describe('newEventTemplate', () => {
  it('produces a valid starter event with one choice and an editable id', () => {
    const event = newEventTemplate(1720000000000);
    expect(event.id).toBe('event_1720000000000');
    expect(event.role_hint).toBe('');
    expect(event.category).toBe('industry_drama');
    expect(event.prompt).toBe('');
    expect(event.choices).toHaveLength(1);
    expect(event.choices[0].effects_immediate).toEqual({});
    expect(event.choices[0].effects_delayed).toEqual({});
  });

  it('generates a fresh id per call by default (Date.now())', () => {
    const a = newEventTemplate();
    const b = newEventTemplate();
    expect(a.id).toMatch(/^event_\d+$/);
    expect(b.id).toMatch(/^event_\d+$/);
  });
});

describe('getCategoryOptions', () => {
  it('returns one option per SIDE_EVENT_CATEGORIES entry, each carrying its weight', () => {
    const options = getCategoryOptions();
    expect(options).toHaveLength(SIDE_EVENT_CATEGORIES.length);
    for (const cat of SIDE_EVENT_CATEGORIES) {
      const opt = options.find((o) => o.value === cat);
      expect(opt).toBeTruthy();
      expect(typeof opt!.weight).toBe('number');
    }
  });
});

/**
 * Content-editor slice 4 (playtest feedback): the creation dialog derives its
 * default event id from the first ~4 words of the prompt, editable thereafter.
 */
describe('slugifyIdFromPromptWords', () => {
  it('slugifies the first 4 words of the prompt by default', () => {
    expect(slugifyIdFromPromptWords('A rival label tries to poach your artist')).toBe('a_rival_label_tries');
  });

  it('uses the whole prompt when it has fewer words than the word count', () => {
    expect(slugifyIdFromPromptWords('Short prompt')).toBe('short_prompt');
  });

  it('respects a custom word count', () => {
    expect(slugifyIdFromPromptWords('One two three four five six', 2)).toBe('one_two');
  });

  it('returns an empty string for an empty prompt', () => {
    expect(slugifyIdFromPromptWords('')).toBe('');
  });

  it('collapses extra whitespace between words', () => {
    expect(slugifyIdFromPromptWords('  Multiple    spaces   here   now  ')).toBe('multiple_spaces_here_now');
  });
});
