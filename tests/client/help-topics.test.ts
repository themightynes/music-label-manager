/**
 * Structure + voice guards for the About-page Help content module
 * (client/src/lib/helpTopics.ts, about-help slice 1).
 *
 * The copy is a data-only contract with players. These tests pin its SHAPE
 * (7 topics in journey order, required fields non-empty, paragraph/rule counts)
 * and its VOICE constraints (fork-E precedent from the awareness arc: no engine
 * numbers — multipliers, decay rates, thresholds, percentages — leak into copy).
 */
import { describe, it, expect } from 'vitest';
import { HELP_TOPICS, HELP_PREAMBLE, type HelpTopic } from '@/lib/helpTopics';

const EXPECTED_IDS = [
  'weekly-grind',
  'three-currencies',
  'executive-team',
  'getting-heard',
  'putting-out-a-record',
  'on-the-road',
  'reading-the-charts',
] as const;

/** Every string a topic contributes to player-facing copy, flattened. */
function topicText(t: HelpTopic): string {
  return [t.title, t.hook, t.tldr, ...t.body, ...t.rules, ...(t.veteranNotes ?? [])].join('\n');
}

const ALL_TEXT = [
  HELP_PREAMBLE.title,
  ...HELP_PREAMBLE.body,
  ...HELP_TOPICS.map(topicText),
].join('\n');

describe('helpTopics — structure', () => {
  it('has exactly 7 topics, in the expected journey order', () => {
    expect(HELP_TOPICS).toHaveLength(EXPECTED_IDS.length);
    expect(HELP_TOPICS.map(t => t.id)).toEqual([...EXPECTED_IDS]);
  });

  it('has unique ids', () => {
    const ids = HELP_TOPICS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has all required fields non-empty on every topic', () => {
    for (const t of HELP_TOPICS) {
      expect(t.id.trim(), `id for ${t.id}`).not.toBe('');
      expect(t.title.trim(), `title for ${t.id}`).not.toBe('');
      expect(t.hook.trim(), `hook for ${t.id}`).not.toBe('');
      expect(t.tldr.trim(), `tldr for ${t.id}`).not.toBe('');
      for (const p of t.body) expect(p.trim(), `body paragraph for ${t.id}`).not.toBe('');
      for (const r of t.rules) expect(r.trim(), `rule for ${t.id}`).not.toBe('');
      for (const n of t.veteranNotes ?? []) expect(n.trim(), `veteran note for ${t.id}`).not.toBe('');
    }
  });

  it('has ids in kebab-case', () => {
    for (const t of HELP_TOPICS) {
      expect(t.id, `id ${t.id}`).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });

  it('has 2-4 body paragraphs per topic', () => {
    for (const t of HELP_TOPICS) {
      expect(t.body.length, `body count for ${t.id}`).toBeGreaterThanOrEqual(2);
      expect(t.body.length, `body count for ${t.id}`).toBeLessThanOrEqual(4);
    }
  });

  it('has 2-3 rules per topic', () => {
    for (const t of HELP_TOPICS) {
      expect(t.rules.length, `rule count for ${t.id}`).toBeGreaterThanOrEqual(2);
      expect(t.rules.length, `rule count for ${t.id}`).toBeLessThanOrEqual(3);
    }
  });

  it('has a non-empty preamble', () => {
    expect(HELP_PREAMBLE.title.trim()).not.toBe('');
    expect(HELP_PREAMBLE.body.length).toBeGreaterThanOrEqual(1);
    for (const p of HELP_PREAMBLE.body) expect(p.trim()).not.toBe('');
  });
});

describe('helpTopics — voice leakage guards (fork-E precedent)', () => {
  it('has no multiplier-number leakage (e.g. "2x", "1.5×")', () => {
    // Matches a number immediately followed by x/×, the multiplier tell.
    expect(ALL_TEXT).not.toMatch(/\d+(\.\d+)?\s*[x×]/i);
  });

  it('has no engine-jargon leakage', () => {
    expect(ALL_TEXT).not.toMatch(/multiplier|decay rate|RNG|seed|config|threshold/i);
  });

  it('has no percentages anywhere', () => {
    expect(ALL_TEXT).not.toContain('%');
  });

  it('only uses plainly-visible game numbers (52, focus-slot counts, Top 100)', () => {
    // Allowlist: the campaign length, the 3/4 focus slots, and "Top 100" are the
    // only bare numbers the voice rules permit. Any OTHER numeral is a leak.
    const ALLOWED = new Set(['52', '100', '3', '4']);
    const numbers = ALL_TEXT.match(/\d+(\.\d+)?/g) ?? [];
    const offenders = numbers.filter(n => !ALLOWED.has(n));
    expect(offenders, `unexpected numerals in copy: ${offenders.join(', ')}`).toEqual([]);
  });
});

describe('helpTopics — consistency spot-check', () => {
  it('getting-heard names both hype and awareness', () => {
    const topic = HELP_TOPICS.find(t => t.id === 'getting-heard');
    expect(topic).toBeDefined();
    const text = topicText(topic!).toLowerCase();
    expect(text).toContain('hype');
    expect(text).toContain('awareness');
  });
});
