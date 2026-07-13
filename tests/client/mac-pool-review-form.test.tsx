/**
 * v3 pool review form — content lockstep + render guard, ALL SEVEN POOLS.
 *
 * 1. Every pool module's meeting ids match POOL_REVIEW_MEETING_IDS[formId]
 *    (@shared/api/contracts) exactly, in order — the server writes `meetings`
 *    keys in that canonical order, so drift here would scramble the files.
 * 2. Entry counts are pinned: Mac 15 (3 AM Demo now authored), Sam 14,
 *    Dante 15, Pat 14, CEO 12, side events 20, escalations 8.
 * 3. Every fully-authored entry has a prompt, a description and exactly three
 *    choices with non-empty outcome summaries; nothing is content-pending
 *    anymore.
 * 4. Executor/label-voice guard runs over ALL pools' outcome summaries.
 *    CEO / events / escalations use LABEL voice ("We…", "Paid…"), which the
 *    guard deliberately allows; second-person and "on his/her own" phrasing
 *    stay banned everywhere. One documented verbatim exception: Sam's
 *    billboard summary uses generic-you ("a wall you can't scroll past") —
 *    designer copy carried verbatim, not second-person-instructional.
 * 5. The form renders every meeting card with verdict controls + notes and
 *    the two overall fields, for a small and a large pool.
 *
 * NOTE: unlike the playtest form modules, these content modules deliberately
 * CONTAIN raw effect numbers — this is an admin review surface and the
 * numbers are part of what is under review. No no-engine-numbers guard here.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import {
  POOL_REVIEW_FORM_IDS,
  POOL_REVIEW_MEETING_IDS,
  MAC_POOL_REVIEW_FORM_ID,
  SAM_POOL_REVIEW_FORM_ID,
  DANTE_POOL_REVIEW_FORM_ID,
  PAT_POOL_REVIEW_FORM_ID,
  CEO_POOL_REVIEW_FORM_ID,
  EVENTS_POOL_REVIEW_FORM_ID,
  ESCALATIONS_POOL_REVIEW_FORM_ID,
  buildEmptyPoolReviewResponsesFor,
  type PoolReviewResponses,
} from '@shared/api/contracts';
import { POOL_REVIEW_REGISTRY, POOL_REVIEW_OPTIONS } from '@/admin/poolReviewRegistry';
import { PoolReviewForm } from '@/admin/MacPoolReviewPage';

const EXPECTED_COUNTS: Record<string, number> = {
  [MAC_POOL_REVIEW_FORM_ID]: 15,
  [SAM_POOL_REVIEW_FORM_ID]: 14,
  [DANTE_POOL_REVIEW_FORM_ID]: 15,
  [PAT_POOL_REVIEW_FORM_ID]: 14,
  [CEO_POOL_REVIEW_FORM_ID]: 12,
  [EVENTS_POOL_REVIEW_FORM_ID]: 20,
  [ESCALATIONS_POOL_REVIEW_FORM_ID]: 8,
};

const LABEL_VOICE_POOLS = [
  CEO_POOL_REVIEW_FORM_ID,
  EVENTS_POOL_REVIEW_FORM_ID,
  ESCALATIONS_POOL_REVIEW_FORM_ID,
] as const;

describe('POOL_REVIEW_REGISTRY — lockstep with POOL_REVIEW_MEETING_IDS', () => {
  it('covers exactly the seven pool form ids (picker options included)', () => {
    expect(Object.keys(POOL_REVIEW_REGISTRY).sort()).toEqual([...POOL_REVIEW_FORM_IDS].sort());
    expect(POOL_REVIEW_OPTIONS.map((o) => o.formId)).toEqual([...POOL_REVIEW_FORM_IDS]);
  });

  it.each(POOL_REVIEW_FORM_IDS)('%s has the canonical meeting ids, in reading order', (formId) => {
    const pool = POOL_REVIEW_REGISTRY[formId];
    expect(pool.meetings.map((m) => m.id)).toEqual([...POOL_REVIEW_MEETING_IDS[formId]]);
  });

  it.each(POOL_REVIEW_FORM_IDS)('%s has the pinned entry count', (formId) => {
    expect(POOL_REVIEW_REGISTRY[formId].meetings).toHaveLength(EXPECTED_COUNTS[formId]);
  });

  it('every entry is fully authored: prompt, description, exactly three choices, summaries', () => {
    for (const formId of POOL_REVIEW_FORM_IDS) {
      for (const meeting of POOL_REVIEW_REGISTRY[formId].meetings) {
        expect(meeting.contentPending, `${formId}/${meeting.id}`).toBe(false);
        expect(meeting.prompt.length, `${formId}/${meeting.id} prompt`).toBeGreaterThan(0);
        expect(meeting.description.length, `${formId}/${meeting.id} description`).toBeGreaterThan(0);
        expect(meeting.choices, `${formId}/${meeting.id} choices`).toHaveLength(3);
        for (const choice of meeting.choices) {
          expect(
            choice.outcomeSummary.length,
            `${formId}/${meeting.id}/${choice.id} summary`
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it('only Wall of Misses is finalized; The 3 AM Demo is now authored (not content-pending)', () => {
    const mac = POOL_REVIEW_REGISTRY[MAC_POOL_REVIEW_FORM_ID].meetings;
    expect(mac.filter((m) => m.finalized).map((m) => m.id)).toEqual(['wall_of_misses']);
    expect(mac.filter((m) => m.contentPending)).toEqual([]);
    const demo = mac.find((m) => m.id === 'the_3am_demo')!;
    expect(demo.choices.map((c) => c.id)).toEqual([
      'pass_politely',
      'development_deal',
      'full_pursuit',
    ]);
    expect(demo.prompt).toContain('3:04 AM');
  });

  it('CEO / events / escalations entries carry their pool-specific design-note lines', () => {
    for (const meeting of POOL_REVIEW_REGISTRY[CEO_POOL_REVIEW_FORM_ID].meetings) {
      expect(
        meeting.designNotes.some((n) => n.startsWith('LAPSE COST:')),
        `ceo/${meeting.id} LAPSE COST`
      ).toBe(true);
      expect(
        meeting.designNotes.some((n) => n.startsWith('WHY GATED:')),
        `ceo/${meeting.id} WHY GATED`
      ).toBe(true);
    }
    for (const meeting of POOL_REVIEW_REGISTRY[EVENTS_POOL_REVIEW_FORM_ID].meetings) {
      expect(
        meeting.designNotes.some((n) => n.startsWith('SHOCK LOGIC:')),
        `events/${meeting.id} SHOCK LOGIC`
      ).toBe(true);
    }
    for (const meeting of POOL_REVIEW_REGISTRY[ESCALATIONS_POOL_REVIEW_FORM_ID].meetings) {
      expect(
        meeting.designNotes.some((n) => n.startsWith('CHAIN LOGIC:')),
        `escalations/${meeting.id} CHAIN LOGIC`
      ).toBe(true);
    }
  });

  it('exec pools carry band predictions; CEO/events/escalations carry none (bands replaced by design notes)', () => {
    for (const formId of [
      SAM_POOL_REVIEW_FORM_ID,
      DANTE_POOL_REVIEW_FORM_ID,
      PAT_POOL_REVIEW_FORM_ID,
    ]) {
      for (const meeting of POOL_REVIEW_REGISTRY[formId].meetings) {
        expect(meeting.bandPredictions, `${formId}/${meeting.id}`).not.toBeNull();
        expect(meeting.bandPredictions!.lines.length, `${formId}/${meeting.id}`).toBeGreaterThan(0);
      }
    }
    for (const formId of LABEL_VOICE_POOLS) {
      for (const meeting of POOL_REVIEW_REGISTRY[formId].meetings) {
        expect(meeting.bandPredictions, `${formId}/${meeting.id}`).toBeNull();
      }
    }
  });
});

describe('outcome summaries — executor/label-voice guard, all pools', () => {
  // Second-person-instructional phrasing and "on his/her own" are banned
  // EVERYWHERE. Label-voice first-person-plural ("We…") is allowed — that is
  // the CEO/events/escalations house voice (asserted present below).
  const banned = [/on (his|her) own/i, /without asking/i, /you (decided|chose)/i, /\byou\b/i, /\byour\b/i];
  // Documented verbatim exception: generic-you idiom in designer copy, not an
  // instruction to the player ("a wall you can't scroll past").
  const allowlist = new Set([`${SAM_POOL_REVIEW_FORM_ID}/billboard_money/full_takeover`]);

  it('no banned phrasing in any pool outcome summary', () => {
    for (const formId of POOL_REVIEW_FORM_IDS) {
      for (const meeting of POOL_REVIEW_REGISTRY[formId].meetings) {
        for (const choice of meeting.choices) {
          if (allowlist.has(`${formId}/${meeting.id}/${choice.id}`)) continue;
          for (const pattern of banned) {
            expect(choice.outcomeSummary, `${formId}/${meeting.id}/${choice.id}`).not.toMatch(
              pattern
            );
          }
        }
      }
    }
  });

  it('the guard allows label voice: CEO and events pools really do use "We…"', () => {
    for (const formId of [CEO_POOL_REVIEW_FORM_ID, EVENTS_POOL_REVIEW_FORM_ID]) {
      const summaries = POOL_REVIEW_REGISTRY[formId].meetings.flatMap((m) =>
        m.choices.map((c) => c.outcomeSummary)
      );
      expect(
        summaries.some((s) => /^We\b/.test(s)),
        `${formId} label voice present`
      ).toBe(true);
    }
  });

  it('exec pools stay in executor voice — no label-voice "We…" summaries', () => {
    for (const formId of [
      MAC_POOL_REVIEW_FORM_ID,
      SAM_POOL_REVIEW_FORM_ID,
      DANTE_POOL_REVIEW_FORM_ID,
      PAT_POOL_REVIEW_FORM_ID,
    ]) {
      for (const meeting of POOL_REVIEW_REGISTRY[formId].meetings) {
        for (const choice of meeting.choices) {
          expect(choice.outcomeSummary, `${formId}/${meeting.id}/${choice.id}`).not.toMatch(
            /^We\b/
          );
        }
      }
    }
  });
});

describe('PoolReviewForm — renders every meeting card + review controls', () => {
  it('renders the Mac pool: all cards, verdict/notes controls, overall section', () => {
    const pool = POOL_REVIEW_REGISTRY[MAC_POOL_REVIEW_FORM_ID];
    render(
      <PoolReviewForm
        pool={pool}
        responses={buildEmptyPoolReviewResponsesFor(MAC_POOL_REVIEW_FORM_ID)}
        onChange={() => {}}
      />
    );

    for (const meeting of pool.meetings) {
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

    // The 3 AM Demo is fully authored now — no pending badge, choices render.
    const demo = screen.getByTestId('meeting-the_3am_demo');
    expect(within(demo).queryByText('Content pending')).toBeNull();
    expect(within(demo).getByText('development_deal')).toBeInTheDocument();

    // End-of-form overall fields.
    const overall = screen.getByTestId('section-overall');
    expect(within(overall).getByLabelText(/Overall notes/i)).toBeInTheDocument();
    expect(within(overall).getByLabelText(/Voice consistency/i)).toBeInTheDocument();
  });

  it('renders the escalations pool with CHAIN LOGIC lines and no speaker prefix', () => {
    const pool = POOL_REVIEW_REGISTRY[ESCALATIONS_POOL_REVIEW_FORM_ID];
    render(
      <PoolReviewForm
        pool={pool}
        responses={buildEmptyPoolReviewResponsesFor(ESCALATIONS_POOL_REVIEW_FORM_ID)}
        onChange={() => {}}
      />
    );
    for (const meeting of pool.meetings) {
      const card = screen.getByTestId(`meeting-${meeting.id}`);
      expect(within(card).getByText(/^CHAIN LOGIC:/)).toBeInTheDocument();
      expect(within(card).getByLabelText('Notes:')).toBeInTheDocument();
    }
  });

  it('propagates a verdict change through onChange keyed by meeting id', () => {
    const pool = POOL_REVIEW_REGISTRY[SAM_POOL_REVIEW_FORM_ID];
    let latest: PoolReviewResponses = buildEmptyPoolReviewResponsesFor(SAM_POOL_REVIEW_FORM_ID);
    render(
      <PoolReviewForm
        pool={pool}
        responses={latest}
        onChange={(next: PoolReviewResponses) => (latest = next)}
      />
    );

    const card = screen.getByTestId('meeting-the_dossier');
    fireEvent.click(within(card).getByRole('radio', { name: 'Rework' }));
    expect(latest.meetings.the_dossier.verdict).toBe('rework');
  });
});
