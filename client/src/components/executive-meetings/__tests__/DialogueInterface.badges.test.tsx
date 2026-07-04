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
      'quality_bonus',
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
});

describe('ChoiceEffects badge honesty', () => {
  it('renders nothing for a dead (non-canonical) effect key', () => {
    // press_story_flag went live in exec-meetings-revival PR-3 (C2) — use a key
    // that is still dead (quality_bonus, C1, not yet wired) for this assertion.
    render(<ChoiceEffects choice={buildChoice({ effects_immediate: { quality_bonus: 5, quality_risk: 1 } })} />);

    expect(screen.queryByText(/Quality/)).not.toBeInTheDocument();
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
});
