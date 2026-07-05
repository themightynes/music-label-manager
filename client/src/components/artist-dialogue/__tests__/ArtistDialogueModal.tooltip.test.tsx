/**
 * LEGIBILITY Slice A — ArtistDialogueModal tooltip-wiring test.
 *
 * The modal surfaces its applied/delayed effect badges in the `complete` state.
 * The dialogue services are mocked so the XState machine loads a scene, accepts a
 * choice, and resolves to `complete` with effects — then we assert each effect
 * badge is wrapped in the explanation tooltip (data-effect-key + aria-label),
 * following the repo convention of asserting reachable trigger attributes rather
 * than driving Radix's portal.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockScene = {
  id: 'scene_1',
  prompt: 'How are you feeling about the album?',
  choices: [
    {
      id: 'choice_a',
      label: 'Encourage them',
      effects_immediate: { artist_mood: 3 },
      effects_delayed: { creative_capital: 1 },
    },
  ],
};

vi.mock('../../../services/artistDialogueService', () => ({
  loadAllDialogues: vi.fn(async () => [mockScene]),
  submitArtistDialogueChoice: vi.fn(async () => ({
    success: true,
    effects: { artist_mood: 3 },
    delayedEffects: { creative_capital: 1 },
  })),
}));

import { ArtistDialogueModal } from '../ArtistDialogueModal';

const artist = {
  id: 'a1',
  name: 'Nova',
  mood: 60,
  energy: 70,
  talent: 80,
  archetype: 'Visionary',
} as any;

describe('ArtistDialogueModal — effect tooltips', () => {
  it('wraps the completed-conversation effect badges in explanation tooltips', async () => {
    render(
      <ArtistDialogueModal
        gameId="g1"
        artist={artist}
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Wait for the scene to load, then make a choice to drive the machine to
    // `complete`, where the effect badges render.
    const choiceBtn = await screen.findByText('Encourage them');
    fireEvent.click(choiceBtn);

    // The immediate (artist_mood) badge is wrapped in the mood explanation.
    const moodTrigger = await waitForTrigger('artist_mood');
    expect(moodTrigger.getAttribute('aria-label')).toContain('Mood');

    // The delayed (creative_capital) badge gets its own explanation trigger.
    const ccTrigger = document.querySelector('[data-effect-key="creative_capital"]');
    expect(ccTrigger).not.toBeNull();
    expect(ccTrigger?.getAttribute('aria-label')).toContain('Creative Capital');
  });
});

/** Poll the DOM for a tooltip trigger by effect key (the machine resolves async). */
async function waitForTrigger(effectKey: string): Promise<Element> {
  for (let i = 0; i < 50; i++) {
    const el = document.querySelector(`[data-effect-key="${effectKey}"]`);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`tooltip trigger for ${effectKey} never appeared`);
}
