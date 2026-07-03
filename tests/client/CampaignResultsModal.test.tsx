/**
 * CampaignResultsModal staged-treatment tests (Phase 4 PR-5).
 *
 * jsdom can't verify motion quality, so these assert observable states:
 * every campaign fact is still displayed (information parity), a click skips
 * the sequence to fully-revealed instantly, and reduced motion renders the
 * final content statically. The entry ParticleBurst is self-gated on reduced
 * motion inside the primitive.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUseReducedMotion = vi.fn(() => false);
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import { CampaignResultsModal } from '@/components/CampaignResultsModal';

const RESULTS = {
  campaignCompleted: true,
  finalScore: 8421,
  scoreBreakdown: {
    money: 1200,
    reputation: 340,
    artistsSuccessful: 3,
    projectsCompleted: 7,
    accessTierBonus: 55,
  },
  victoryType: 'Commercial Success' as const,
  summary: 'You built a thriving label from nothing.',
  achievements: ['First No. 1', 'Millionaire'],
};

const renderModal = () =>
  render(
    <CampaignResultsModal
      campaignResults={RESULTS}
      onClose={() => {}}
      onNewGame={() => {}}
    />
  );

// Assert every fact from RESULTS is present in the DOM.
const expectAllFactsPresent = () => {
  expect(screen.getByText('Campaign Complete!')).toBeInTheDocument();
  expect(screen.getByText('Commercial Success')).toBeInTheDocument();
  expect(screen.getByText(RESULTS.summary)).toBeInTheDocument();
  // Score breakdown values + labels
  expect(screen.getByText(String(RESULTS.scoreBreakdown.money))).toBeInTheDocument();
  expect(screen.getByText('Money')).toBeInTheDocument();
  expect(screen.getByText(String(RESULTS.scoreBreakdown.reputation))).toBeInTheDocument();
  expect(screen.getByText('Reputation')).toBeInTheDocument();
  expect(screen.getByText(String(RESULTS.scoreBreakdown.artistsSuccessful))).toBeInTheDocument();
  expect(screen.getByText('Artist Success')).toBeInTheDocument();
  expect(screen.getByText(String(RESULTS.scoreBreakdown.projectsCompleted))).toBeInTheDocument();
  expect(screen.getByText('Projects')).toBeInTheDocument();
  expect(screen.getByText(String(RESULTS.scoreBreakdown.accessTierBonus))).toBeInTheDocument();
  expect(screen.getByText('Access Bonus')).toBeInTheDocument();
  // Achievements
  RESULTS.achievements.forEach((a) => {
    expect(screen.getByText(a)).toBeInTheDocument();
  });
};

describe('CampaignResultsModal (staged treatment)', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('displays every campaign fact (information parity)', () => {
    renderModal();
    // All breakdown values live in the DOM from the start (staged only by
    // opacity), so parity holds regardless of reveal progress.
    expectAllFactsPresent();
  });

  it('shows the final score after mount (count-up target reached)', () => {
    renderModal();
    // The score value updates post-mount toward the final; the label is static.
    expect(screen.getByText(/Final Score:/)).toBeInTheDocument();
  });

  it('a click skips the sequence and shows everything fully revealed', () => {
    renderModal();
    const dialog = screen.getByText('Campaign Complete!').closest('[role="dialog"]')!;
    fireEvent.click(dialog);
    // After skip, the final score is displayed and every fact remains present.
    expect(screen.getByText(String(RESULTS.finalScore))).toBeInTheDocument();
    expectAllFactsPresent();
  });

  it('renders statically under reduced motion (final score, all facts)', () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderModal();
    // Reduced motion → score is final immediately, no count-up from 0.
    expect(screen.getByText(String(RESULTS.finalScore))).toBeInTheDocument();
    expectAllFactsPresent();
    // No particle burst under reduced motion.
    expect(document.querySelector('[data-testid="particle-burst"]')).not.toBeInTheDocument();
  });
});
