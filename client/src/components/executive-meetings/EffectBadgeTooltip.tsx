import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  EFFECT_CHANNEL_DESCRIPTIONS,
  type EffectChannelDescription,
} from '@shared/engine/processors/ActionProcessor';
import { isRenderableEffectKey } from './DialogueInterface';

/**
 * LEGIBILITY Slice A (at-choice explanation).
 *
 * Wraps an effect badge in a shadcn/Radix Tooltip that explains what the effect
 * channel actually DOES — sourced from the single {@link EFFECT_CHANNEL_DESCRIPTIONS}
 * map co-located with LIVE_EFFECT_KEYS (so the copy can't drift from the live
 * vocabulary; guarded by tests/engine/effect-descriptions.test.ts).
 *
 * The badge itself is passed through visually UNCHANGED — the only added
 * affordance is `cursor-help` on the trigger wrapper (the app-wide convention for
 * icon-help affordances, see MetricsDashboard) plus the hover/focus tooltip.
 *
 * A local <TooltipProvider> is mounted so the wrapper is self-contained and safe
 * to drop anywhere (the badge rows live in several trees, not all of which are
 * guaranteed to sit under App.tsx's global provider — e.g. modals rendered in a
 * portal, or a test harness). Radix providers nest harmlessly.
 *
 * Badge-whitelist rule (client/CLAUDE.md): callers only ever render a badge for a
 * key in LIVE_EFFECT_KEYS ∪ {executive_mood}. As a defensive backstop, if a key
 * has no description entry (which the drift-guard forbids) the children render
 * bare, with no tooltip — never a broken/empty popover.
 */
export function getEffectDescription(effectKey: string): EffectChannelDescription | undefined {
  if (!isRenderableEffectKey(effectKey)) return undefined;
  return EFFECT_CHANNEL_DESCRIPTIONS[effectKey];
}

export function EffectBadgeTooltip({
  effectKey,
  children,
}: {
  effectKey: string;
  children: React.ReactNode;
}) {
  const description = getEffectDescription(effectKey);

  // No description (or non-canonical key): render the badge bare, no tooltip.
  if (!description) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
        {/* cursor-help is the app-wide help affordance; the badge is otherwise
            visually unchanged. The wrapper is inline-flex so it doesn't disturb
            the flex-wrap badge rows. data-effect-key gives tests a stable handle
            on which channel this tooltip describes without fighting Radix's
            portaled content. */}
        <span
          className="inline-flex cursor-help"
          data-effect-key={effectKey}
          aria-label={`${description.title}: ${description.text}`}
        >
          {children}
        </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold text-text-primary">{description.title}</p>
          <p className="mt-1 text-text-body">{description.text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
