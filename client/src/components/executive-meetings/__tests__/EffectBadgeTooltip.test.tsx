/**
 * LEGIBILITY Slice A — EffectBadgeTooltip wiring tests.
 *
 * Radix Tooltip content is portaled and only mounts on hover/focus, which is
 * brittle to drive under jsdom. Following the repo's existing badge-test approach
 * (assert reachable trigger attributes rather than fighting Radix portals), these
 * tests assert the tooltip is WIRED by checking the trigger the wrapper renders:
 *   - a `data-effect-key` handle naming the channel,
 *   - an `aria-label` carrying the full "Title: text" explanation,
 *   - the `cursor-help` affordance,
 *   - the wrapped badge still renders unchanged inside.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '../../ui/tooltip';
import { EffectBadgeTooltip, getEffectDescription } from '../EffectBadgeTooltip';
import { EFFECT_CHANNEL_DESCRIPTIONS } from '@shared/engine/processors/ActionProcessor';

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('getEffectDescription', () => {
  it('returns the description for a canonical key', () => {
    expect(getEffectDescription('awareness_boost')).toEqual(
      EFFECT_CHANNEL_DESCRIPTIONS.awareness_boost
    );
  });

  it('returns undefined for a non-canonical / dead key', () => {
    expect(getEffectDescription('quality_risk')).toBeUndefined();
    expect(getEffectDescription('totally_made_up_key')).toBeUndefined();
  });
});

describe('EffectBadgeTooltip', () => {
  it('wraps the badge in a trigger carrying the channel explanation', () => {
    renderWithProvider(
      <EffectBadgeTooltip effectKey="awareness_boost">
        <span>+2 Buzz</span>
      </EffectBadgeTooltip>
    );

    const desc = EFFECT_CHANNEL_DESCRIPTIONS.awareness_boost;
    const trigger = document.querySelector('[data-effect-key="awareness_boost"]');
    expect(trigger).not.toBeNull();
    expect(trigger).toHaveAttribute('aria-label', `${desc.title}: ${desc.text}`);
    expect(trigger).toHaveClass('cursor-help');
    // The wrapped badge still renders unchanged.
    expect(screen.getByText('+2 Buzz')).toBeInTheDocument();
  });

  it('renders children bare (no trigger) for a key without a description', () => {
    renderWithProvider(
      <EffectBadgeTooltip effectKey="quality_risk">
        <span>dead</span>
      </EffectBadgeTooltip>
    );

    expect(document.querySelector('[data-effect-key]')).toBeNull();
    expect(screen.getByText('dead')).toBeInTheDocument();
  });

  it('describes executive_mood (canonical but outside LIVE_EFFECT_KEYS)', () => {
    renderWithProvider(
      <EffectBadgeTooltip effectKey="executive_mood">
        <span>+5 Exec Mood</span>
      </EffectBadgeTooltip>
    );
    const trigger = document.querySelector('[data-effect-key="executive_mood"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-label')).toContain('Exec Mood');
  });
});
