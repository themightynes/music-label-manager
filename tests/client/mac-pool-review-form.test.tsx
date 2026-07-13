/**
 * v3 Mac pool review form — content lockstep + render guard.
 *
 * 1. The content module's meeting ids match MAC_POOL_REVIEW_MEETING_IDS
 *    (@shared/api/contracts) exactly, in order — the server writes `meetings`
 *    keys in that canonical order, so drift here would scramble the file.
 * 2. Every meeting card renders (all 15 entries, reading order), with the
 *    verdict controls and notes field present, plus the two overall fields.
 * 3. Wall of Misses carries the FINALIZED (baseline) badge but still renders
 *    review controls; The 3 AM Demo is marked content-pending.
 *
 * NOTE: unlike the playtest form modules, this content module deliberately
 * CONTAINS raw effect numbers — it is an admin review surface and the numbers
 * are part of what is under review. No no-engine-numbers guard applies here.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import {
  MAC_POOL_REVIEW_MEETING_IDS,
  buildEmptyMacPoolReviewResponses,
} from '@shared/api/contracts';
import { V3_MAC_POOL_MEETINGS } from '@/admin/v3MacPoolReview';
import { MacPoolReviewForm } from '@/admin/MacPoolReviewPage';

describe('V3_MAC_POOL_MEETINGS — lockstep with MAC_POOL_REVIEW_MEETING_IDS', () => {
  it('has exactly the canonical meeting ids, in reading order', () => {
    expect(V3_MAC_POOL_MEETINGS.map((m) => m.id)).toEqual([...MAC_POOL_REVIEW_MEETING_IDS]);
  });

  it('every fully-authored meeting has a prompt, a description and exactly three choices', () => {
    for (const meeting of V3_MAC_POOL_MEETINGS) {
      if (meeting.contentPending) continue;
      expect(meeting.prompt.length, meeting.id).toBeGreaterThan(0);
      expect(meeting.description.length, meeting.id).toBeGreaterThan(0);
      expect(meeting.choices, meeting.id).toHaveLength(3);
      for (const choice of meeting.choices) {
        expect(choice.outcomeSummary.length, `${meeting.id}/${choice.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('only Wall of Misses is finalized; only The 3 AM Demo is content-pending', () => {
    expect(V3_MAC_POOL_MEETINGS.filter((m) => m.finalized).map((m) => m.id)).toEqual([
      'wall_of_misses',
    ]);
    expect(V3_MAC_POOL_MEETINGS.filter((m) => m.contentPending).map((m) => m.id)).toEqual([
      'the_3am_demo',
    ]);
  });

  it('outcome summaries respect the executor-voice rule (no second person, no banned phrases)', () => {
    const banned = [/on his own/i, /without asking/i, /you decided/i, /\byou\b/i, /\byour\b/i];
    for (const meeting of V3_MAC_POOL_MEETINGS) {
      for (const choice of meeting.choices) {
        for (const pattern of banned) {
          expect(choice.outcomeSummary, `${meeting.id}/${choice.id}`).not.toMatch(pattern);
        }
      }
    }
  });
});

describe('MacPoolReviewForm — renders every meeting card + review controls', () => {
  it('renders all meeting cards, verdict/notes controls, and the overall section', () => {
    render(
      <MacPoolReviewForm responses={buildEmptyMacPoolReviewResponses()} onChange={() => {}} />
    );

    for (const meeting of V3_MAC_POOL_MEETINGS) {
      const card = screen.getByTestId(`meeting-${meeting.id}`);
      expect(card).toBeInTheDocument();
      expect(within(card).getByText('Verdict:')).toBeInTheDocument();
      expect(within(card).getByLabelText('Notes:')).toBeInTheDocument();
      // All four verdict options are offered on every card.
      expect(within(card).getByLabelText('Approve')).toBeInTheDocument();
      expect(within(card).getByLabelText('Approve with edits')).toBeInTheDocument();
      expect(within(card).getByLabelText('Rework')).toBeInTheDocument();
      expect(within(card).getByLabelText('Kill')).toBeInTheDocument();
    }

    // Wall of Misses is the finalized baseline but still accepts notes.
    const wall = screen.getByTestId('meeting-wall_of_misses');
    expect(within(wall).getByText('FINALIZED (baseline)')).toBeInTheDocument();
    expect(within(wall).getByLabelText('Notes:')).toBeInTheDocument();

    // The 3 AM Demo is flagged content-pending.
    const demo = screen.getByTestId('meeting-the_3am_demo');
    expect(within(demo).getByText('Content pending')).toBeInTheDocument();

    // End-of-form overall fields.
    const overall = screen.getByTestId('section-overall');
    expect(within(overall).getByLabelText(/Overall notes/i)).toBeInTheDocument();
    expect(within(overall).getByLabelText(/Voice consistency/i)).toBeInTheDocument();
  });

  it('propagates a verdict change through onChange keyed by meeting id', () => {
    let latest = buildEmptyMacPoolReviewResponses();
    render(<MacPoolReviewForm responses={latest} onChange={(next) => (latest = next)} />);

    const card = screen.getByTestId('meeting-poaching_season');
    fireEvent.click(within(card).getByRole('radio', { name: 'Rework' }));
    expect(latest.meetings.poaching_season.verdict).toBe('rework');
  });
});
