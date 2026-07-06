/**
 * Unit tests for lintSideEvents (content-editor slice 3, spec §2.3).
 *
 * Mirrors tests/client/contentLint.test.ts's style (slice 2) for the meetings lint
 * mirror. Each hard-block class must fire, the real data/events.json must lint
 * clean against the real event_weights table, and the weakly-dominant pair that
 * exists TODAY in real data (royalty_discrepancy: negotiate vs audit) must NOT be
 * flagged — side events deliberately have no dominance check (see the
 * function-level comment in contentLint.ts).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SIDE_EVENT_CATEGORIES } from '@shared/types/gameTypes';
import { EventsConfigSchema, type SideEventContract } from '@shared/api/contracts';
import { lintSideEvents } from '@/admin/contentLint';

function baseEvent(overrides: Partial<SideEventContract> = {}): SideEventContract {
  return {
    id: 'event_1',
    role_hint: 'Test Role',
    category: 'industry_drama',
    prompt: 'A thing happens.',
    choices: [
      {
        id: 'choice_1',
        label: 'Choice 1',
        effects_immediate: { money: 100 },
        effects_delayed: {},
      },
    ],
    ...overrides,
  } as SideEventContract;
}

const REAL_WEIGHTS: Record<string, number> = {
  sync_licensing: 0.15,
  copyright_issues: 0.1,
  platform_opportunities: 0.2,
  industry_drama: 0.15,
  technical_problems: 0.1,
  business_opportunities: 0.15,
  artist_personal: 0.15,
};

describe('lintSideEvents — clean fixture', () => {
  it('returns [] for a valid single event/choice', () => {
    expect(lintSideEvents([baseEvent()], REAL_WEIGHTS)).toEqual([]);
  });
});

describe('lintSideEvents — hard-block classes', () => {
  it('flags a non-canonical effect key', () => {
    const event = baseEvent({
      choices: [
        {
          id: 'choice_1',
          label: 'Choice 1',
          effects_immediate: { totally_made_up_key: 5 } as any,
          effects_delayed: {},
        },
      ],
    });
    const issues = lintSideEvents([event], REAL_WEIGHTS);
    expect(issues.some((i) => i.message.includes('totally_made_up_key'))).toBe(true);
  });

  it('flags a category not in SIDE_EVENT_CATEGORIES', () => {
    const event = baseEvent({ category: 'not_a_real_category' as any });
    const issues = lintSideEvents([event], REAL_WEIGHTS);
    expect(issues.some((i) => i.message.includes('not_a_real_category'))).toBe(true);
  });

  it('flags a category missing from the passed eventWeights table', () => {
    const event = baseEvent({ category: 'artist_personal' });
    const weightsWithoutArtistPersonal = { ...REAL_WEIGHTS };
    delete weightsWithoutArtistPersonal.artist_personal;
    const issues = lintSideEvents([event], weightsWithoutArtistPersonal);
    expect(issues.some((i) => i.message.includes('event_weights'))).toBe(true);
  });

  it('flags an empty choices array', () => {
    const event = baseEvent({ choices: [] });
    const issues = lintSideEvents([event], REAL_WEIGHTS);
    expect(issues.some((i) => i.message.includes('no choices'))).toBe(true);
  });

  it('flags duplicate event ids', () => {
    const e1 = baseEvent({ id: 'dup_id' });
    const e2 = baseEvent({ id: 'dup_id' });
    const issues = lintSideEvents([e1, e2], REAL_WEIGHTS);
    expect(issues.some((i) => i.message.includes('Duplicate event id'))).toBe(true);
  });

  it('flags duplicate choice ids within an event', () => {
    const event = baseEvent({
      choices: [
        { id: 'same', label: 'A', effects_immediate: {}, effects_delayed: {} },
        { id: 'same', label: 'B', effects_immediate: {}, effects_delayed: {} },
      ],
    });
    const issues = lintSideEvents([event], REAL_WEIGHTS);
    expect(issues.some((i) => i.message.includes('Duplicate choice id'))).toBe(true);
  });
});

describe('lintSideEvents — deliberate absence of a dominance check', () => {
  it('does NOT flag a weakly-dominant pair (documented in the function comment)', () => {
    // Mirrors royalty_discrepancy in real data/events.json: 'negotiate' nets
    // +2000 money for free, which weakly-dominates 'audit' (-1000 immediate,
    // +500 delayed = net -500) on every tracked payoff axis. If this ever
    // starts failing, a dominance check was added to lintSideEvents — see the
    // function-level comment explaining why that would break real content.
    const event = baseEvent({
      id: 'royalty_discrepancy',
      category: 'business_opportunities',
      choices: [
        {
          id: 'audit',
          label: 'Audit rights and metadata',
          effects_immediate: { money: -1000 },
          effects_delayed: { money: 500 },
        },
        {
          id: 'negotiate',
          label: 'Negotiate a correction',
          effects_immediate: {},
          effects_delayed: { money: 2000 },
        },
      ],
    });
    const issues = lintSideEvents([event], REAL_WEIGHTS);
    expect(issues.filter((i) => i.message.includes('never worth picking'))).toEqual([]);
    expect(issues).toEqual([]);
  });
});

describe('lintSideEvents — real data/events.json', () => {
  it('lints clean against the real event_weights table', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'events.json'), 'utf-8'));
    const parsed = EventsConfigSchema.parse(raw);
    const balance = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'events.json'), 'utf-8'),
    );
    const weights = balance.side_events.event_weights as Record<string, number>;

    const issues = lintSideEvents(parsed.events, weights);
    expect(issues, issues.map((i) => `${i.scope}: ${i.message}`).join('\n')).toEqual([]);
  });
});

describe('lintSideEvents — drift guard: SIDE_EVENT_CATEGORIES vs event_weights', () => {
  it('every SIDE_EVENT_CATEGORIES entry has a weight in data/balance/events.json', () => {
    const balance = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data', 'balance', 'events.json'), 'utf-8'),
    );
    const weights = balance.side_events.event_weights as Record<string, number>;
    const missing = SIDE_EVENT_CATEGORIES.filter((cat) => !(cat in weights));
    expect(missing).toEqual([]);
  });
});
