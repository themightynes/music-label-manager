/**
 * DialogueInterface badge-honesty tests (exec-meetings-revival PR-2).
 *
 * The badge renderer used to have a generic `default:` case that rendered ANY
 * effect key as a badge — including the 64 dead/non-canonical keys the case file
 * found (docs/98-research/EXECUTIVE_MEETINGS_CASE_FILE_2026-07-03.md §2/§6d).
 * That default case is now deleted: only LIVE_EFFECT_KEYS (+ 'executive_mood',
 * wired outside applyEffects's switch) render a badge. Everything else renders
 * nothing, so the game stops lying about effects that don't do anything.
 *
 * Renders `ChoiceEffects` directly (not the full `DialogueInterface`) — the full
 * component tree mounts Carousel + BorderTrail, which are brittle under jsdom/
 * happy-dom and unrelated to what this test verifies.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChoiceEffects, isRenderableEffectKey } from '../DialogueInterface';
import { LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import type { DialogueChoice } from '../../../../../shared/types/gameTypes';

function buildChoice(overrides: Partial<DialogueChoice> = {}): DialogueChoice {
  return {
    id: 'choice_a',
    label: 'Choice A',
    effects_immediate: {},
    effects_delayed: {},
    ...overrides,
  } as DialogueChoice;
}

describe('isRenderableEffectKey', () => {
  it('accepts every LIVE_EFFECT_KEYS member', () => {
    Array.from(LIVE_EFFECT_KEYS).forEach((key) => {
      expect(isRenderableEffectKey(key)).toBe(true);
    });
  });

  it('accepts executive_mood even though it is not in LIVE_EFFECT_KEYS', () => {
    expect(LIVE_EFFECT_KEYS.has('executive_mood')).toBe(false);
    expect(isRenderableEffectKey('executive_mood')).toBe(true);
  });

  it('rejects dead/non-canonical keys', () => {
    for (const deadKey of [
      'sellthrough_hint',
      'venue_relationships',
      'quality_risk',
      'international_rep',
      'artist_loyalty',
      'totally_made_up_key',
    ]) {
      expect(isRenderableEffectKey(deadKey)).toBe(false);
    }
  });

  it('accepts the PR-3 press channel keys (press_story_flag, press_momentum)', () => {
    expect(isRenderableEffectKey('press_story_flag')).toBe(true);
    expect(isRenderableEffectKey('press_momentum')).toBe(true);
  });

  it('accepts the PR-4 quality channel key (quality_bonus)', () => {
    expect(isRenderableEffectKey('quality_bonus')).toBe(true);
  });

  it('accepts the PR-5 awareness channel key (awareness_boost)', () => {
    expect(isRenderableEffectKey('awareness_boost')).toBe(true);
  });

  it('accepts the PR-6 variance channel keys (variance_up, rep_swing)', () => {
    expect(isRenderableEffectKey('variance_up')).toBe(true);
    expect(isRenderableEffectKey('rep_swing')).toBe(true);
  });

  it('accepts the PR-7 award channel key (award_chances)', () => {
    expect(isRenderableEffectKey('award_chances')).toBe(true);
  });
});

describe('ChoiceEffects badge honesty', () => {
  it('renders nothing for a dead (non-canonical) effect key', () => {
    // quality_bonus went live in exec-meetings-revival PR-4 (C1) — use a key
    // that is still dead (quality_risk, C4, not yet wired) for this assertion.
    render(<ChoiceEffects choice={buildChoice({ effects_immediate: { quality_risk: 1 } })} />);

    expect(screen.queryByText(/Quality Risk/)).not.toBeInTheDocument();
    // With no renderable effects, the honest "No direct effects" fallback shows.
    expect(screen.getByText('No direct effects')).toBeInTheDocument();
  });

  it('renders a badge for a live effect key', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_immediate: { reputation: 3, money: -500 } })} />);

    expect(screen.getByText('+3 Rep')).toBeInTheDocument();
    expect(screen.getByText('$-500')).toBeInTheDocument();
    expect(screen.queryByText('No direct effects')).not.toBeInTheDocument();
  });

  it('renders a badge for executive_mood even though it is not in LIVE_EFFECT_KEYS', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_immediate: { executive_mood: 5 } })} />);

    expect(screen.getByText('+5 Exec Mood')).toBeInTheDocument();
  });

  it('mixes live and dead keys: only the live one renders', () => {
    render(
      <ChoiceEffects
        choice={buildChoice({
          effects_immediate: { reputation: 2, sellthrough_hint: 1, venue_relationships: 3 },
        })}
      />
    );

    expect(screen.getByText('+2 Rep')).toBeInTheDocument();
    expect(screen.queryByText(/Market Data/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Venue Rep/)).not.toBeInTheDocument();
  });

  it('applies the same whitelist to delayed effects', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { quality_risk: -1, artist_energy: 4 } })} />);

    expect(screen.getByText('+4 Energy')).toBeInTheDocument();
    expect(screen.queryByText(/Quality Risk/)).not.toBeInTheDocument();
  });

  it('shows "No direct effects" when both immediate and delayed are empty', () => {
    render(<ChoiceEffects choice={buildChoice()} />);
    expect(screen.getByText('No direct effects')).toBeInTheDocument();
  });

  // Exec-meetings-revival PR-3 (C2) — press channel badges are now live.
  it('renders a value-less "Press Story" badge for press_story_flag', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { press_story_flag: 1 } })} />);
    expect(screen.getByText('Press Story')).toBeInTheDocument();
  });

  it('renders "+N Press Buzz" for a positive press_momentum', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { press_momentum: 2 } })} />);
    expect(screen.getByText('+2 Press Buzz')).toBeInTheDocument();
  });

  it('renders "-N Press Buzz" for a negative press_momentum', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { press_momentum: -1 } })} />);
    expect(screen.getByText('-1 Press Buzz')).toBeInTheDocument();
  });

  // Exec-meetings-revival PR-4 (C1) — quality channel badges are now live.
  it('renders "+N Quality" for a positive quality_bonus', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { quality_bonus: 5 } })} />);
    expect(screen.getByText('+5 Quality')).toBeInTheDocument();
  });

  it('renders "-N Quality" for a negative quality_bonus', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { quality_bonus: -2 } })} />);
    expect(screen.getByText('-2 Quality')).toBeInTheDocument();
  });

  // Exec-meetings-revival PR-5 (C3) — awareness channel badges are now live.
  it('renders "+N Buzz" for a positive awareness_boost', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { awareness_boost: 2 } })} />);
    expect(screen.getByText('+2 Buzz')).toBeInTheDocument();
  });

  it('renders "-N Buzz" for a negative awareness_boost', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { awareness_boost: -1 } })} />);
    expect(screen.getByText('-1 Buzz')).toBeInTheDocument();
  });

  // Exec-meetings-revival PR-6 (C4) — variance/risk channel badges are now live.
  it('renders "±N Volatility" for variance_up (always ±, never signed)', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { variance_up: 1 } })} />);
    expect(screen.getByText('±1 Volatility')).toBeInTheDocument();
  });

  it('renders "±N Rep Gamble" for rep_swing', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { rep_swing: 2 } })} />);
    expect(screen.getByText('±2 Rep Gamble')).toBeInTheDocument();
  });

  // Exec-meetings-revival PR-7 (C5) — award/prestige channel badges are now live.
  it('renders "+N Prestige" for a positive award_chances', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { award_chances: 3 } })} />);
    expect(screen.getByText('+3 Prestige')).toBeInTheDocument();
  });

  it('renders "-N Prestige" for a negative award_chances (the skip_awards trap fix)', () => {
    render(<ChoiceEffects choice={buildChoice({ effects_delayed: { award_chances: -1 } })} />);
    expect(screen.getByText('-1 Prestige')).toBeInTheDocument();
  });

  // LEGIBILITY Slice A — the effect badges are now wrapped in an explanation
  // tooltip. Assert the tooltip trigger is wired (data-effect-key + aria-label)
  // for both an immediate and a delayed badge, without driving Radix's portal.
  // C99 — structured / object-valued effect keys render a qualitative,
  // number-free badge (never `[object Object]`), and never leak an event_id.
  describe('structured (object-valued) effect keys render qualitative copy', () => {
    it('renders "Consequence" for an object-valued schedule_event, not [object Object] and no event_id', () => {
      render(
        <ChoiceEffects
          choice={buildChoice({
            effects_delayed: { schedule_event: { event_id: 'crisis_botched_launch', defer_weeks: 3 } },
          })}
        />
      );
      expect(screen.getByText('Consequence')).toBeInTheDocument();
      expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
      // The target event_id must never surface on the badge (fork-E).
      expect(screen.queryByText(/crisis_botched_launch/)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toContain('crisis_botched_launch');
      expect(document.body.textContent).not.toContain('3');
    });

    it('renders "New Recording" for an object-valued grant_song', () => {
      render(
        <ChoiceEffects
          choice={buildChoice({ effects_immediate: { grant_song: { quality: 65, artist: 'targeted' } } })}
        />
      );
      expect(screen.getByText('New Recording')).toBeInTheDocument();
      expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toContain('65');
    });

    it('renders "Story" for a string-valued story_flag (no raw key leak)', () => {
      render(<ChoiceEffects choice={buildChoice({ effects_immediate: { story_flag: 'sold_out_arena' } })} />);
      expect(screen.getByText('Story')).toBeInTheDocument();
      expect(document.body.textContent).not.toContain('sold_out_arena');
    });

    it('renders "New Prospect" for spawn_prospect and "Surprise Release" for spawn_release', () => {
      render(
        <ChoiceEffects
          choice={buildChoice({
            effects_immediate: { spawn_prospect: { archetype: 'visionary' } },
            effects_delayed: { spawn_release: { songs: 'latest_recorded', type: 'single' } },
          })}
        />
      );
      expect(screen.getByText('New Prospect')).toBeInTheDocument();
      expect(screen.getByText('Surprise Release')).toBeInTheDocument();
    });

    it('renders "Exec Away" for set_exec_absence and "Distribution" for distribution_efficiency', () => {
      render(
        <ChoiceEffects
          choice={buildChoice({
            effects_immediate: { set_exec_absence: { role: 'head_ar', weeks: 4 } },
            effects_delayed: { distribution_efficiency: { amount: 0.15, weeks: 6 } },
          })}
        />
      );
      expect(screen.getByText('Exec Away')).toBeInTheDocument();
      expect(screen.getByText('Distribution')).toBeInTheDocument();
      // No raw magnitudes/weeks leaked.
      expect(document.body.textContent).not.toContain('0.15');
    });
  });

  // C99 — live-economy verbs whose raw numeric value would MISLEAD render
  // qualitatively (number-free) too.
  describe('misleading-numeric verbs render qualitative copy (no raw number)', () => {
    it('renders "Catalog Push" for promote_release without its magnitude', () => {
      render(<ChoiceEffects choice={buildChoice({ effects_immediate: { promote_release: 20 } })} />);
      expect(screen.getByText('Catalog Push')).toBeInTheDocument();
      expect(screen.queryByText(/20/)).not.toBeInTheDocument();
    });

    it('renders "Catalog Share Sale" for a fractional transfer_revenue_stream without the fraction', () => {
      render(<ChoiceEffects choice={buildChoice({ effects_delayed: { transfer_revenue_stream: 0.25 } })} />);
      expect(screen.getByText('Catalog Share Sale')).toBeInTheDocument();
      expect(document.body.textContent).not.toContain('0.25');
    });

    it('renders "Press Scrutiny" for press_scrutiny_flag', () => {
      render(<ChoiceEffects choice={buildChoice({ effects_delayed: { press_scrutiny_flag: 1 } })} />);
      expect(screen.getByText('Press Scrutiny')).toBeInTheDocument();
    });
  });

  // C99 — numeric channels keep their EXACT prior rendering (regression guard).
  describe('numeric effect keys are unchanged by the C99 qualitative pass', () => {
    it('money / reputation / creative_capital render exactly as before', () => {
      render(
        <ChoiceEffects
          choice={buildChoice({
            effects_immediate: { money: -500, reputation: 3, creative_capital: 2 },
          })}
        />
      );
      expect(screen.getByText('$-500')).toBeInTheDocument();
      expect(screen.getByText('+3 Rep')).toBeInTheDocument();
      expect(screen.getByText('+2 Creative')).toBeInTheDocument();
    });

    it('quality_bonus / awareness_boost / award_chances still show their signed magnitude', () => {
      render(
        <ChoiceEffects
          choice={buildChoice({
            effects_delayed: { quality_bonus: 5, awareness_boost: -1, award_chances: 3 },
          })}
        />
      );
      expect(screen.getByText('+5 Quality')).toBeInTheDocument();
      expect(screen.getByText('-1 Buzz')).toBeInTheDocument();
      expect(screen.getByText('+3 Prestige')).toBeInTheDocument();
    });
  });

  it('wraps each live badge in an explanation tooltip trigger (immediate + delayed)', () => {
    render(
      <ChoiceEffects
        choice={buildChoice({
          effects_immediate: { reputation: 3 },
          effects_delayed: { awareness_boost: 2 },
        })}
      />
    );

    const repTrigger = document.querySelector('[data-effect-key="reputation"]');
    expect(repTrigger).not.toBeNull();
    expect(repTrigger?.getAttribute('aria-label')).toContain('Reputation');

    const buzzTrigger = document.querySelector('[data-effect-key="awareness_boost"]');
    expect(buzzTrigger).not.toBeNull();
    // The Buzz copy explains it banks to the next release.
    expect(buzzTrigger?.getAttribute('aria-label')).toContain('release');
  });
});
