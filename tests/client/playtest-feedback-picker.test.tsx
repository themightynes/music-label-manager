/**
 * Playtest feedback round picker — lockstep + render guard.
 *
 * The admin page (client/src/admin/PlaytestFeedbackPage.tsx) now lets the
 * admin answer ANY registered round, not just the active one. This file
 * guards the client-side registry that backs the picker:
 * 1. PLAYTEST_FORM_OPTIONS has exactly one entry per formId in the shared
 *    PLAYTEST_FORM_REGISTRY (@shared/api/contracts) — no more, no less, and
 *    every option's `form` bundle carries the matching formId.
 * 2. The ACTIVE form (round 3) is present in the picker and is the one
 *    PlaytestFeedbackPage defaults to.
 * 3. Every registered form's bundle renders cleanly through the shared
 *    PlaytestFeedbackForm component against its own empty default — i.e.
 *    every round is actually selectable/answerable, not just the active one.
 *
 * The server side (GET ?formId=…, POST honoring responses.formId, invalid
 * formId rejected, no cross-file writes) is already fully characterized by
 * tests/server/routes/admin-playtest-feedback.test.ts — nothing new needed
 * there since the routes were already formId-generic before this picker.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ACTIVE_PLAYTEST_FORM_ID,
  PLAYTEST_FORM_REGISTRY,
  buildEmptyPlaytestFeedbackResponsesFor,
} from '@shared/api/contracts';
import { PLAYTEST_FORM_OPTIONS, PlaytestFeedbackForm } from '@/admin/PlaytestFeedbackPage';

describe('PLAYTEST_FORM_OPTIONS — lockstep with PLAYTEST_FORM_REGISTRY', () => {
  it('has exactly one option per registered formId', () => {
    const registryIds = Object.keys(PLAYTEST_FORM_REGISTRY).sort();
    const optionIds = PLAYTEST_FORM_OPTIONS.map((o) => o.formId).sort();
    expect(optionIds).toEqual(registryIds);
  });

  it('every option bundle formId matches its option formId', () => {
    for (const option of PLAYTEST_FORM_OPTIONS) {
      expect(option.form.formId).toBe(option.formId);
    }
  });

  it('includes the ACTIVE form', () => {
    expect(PLAYTEST_FORM_OPTIONS.some((o) => o.formId === ACTIVE_PLAYTEST_FORM_ID)).toBe(true);
  });

  it('has no duplicate formIds', () => {
    const ids = PLAYTEST_FORM_OPTIONS.map((o) => o.formId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('every registered round is selectable and renders', () => {
  for (const option of PLAYTEST_FORM_OPTIONS) {
    it(`renders the ${option.formId} form against its own empty default`, () => {
      const responses = buildEmptyPlaytestFeedbackResponsesFor(option.formId);
      render(<PlaytestFeedbackForm form={option.form} responses={responses} onChange={() => {}} />);

      for (const section of option.form.sections) {
        expect(screen.getByTestId(`section-${section.id}`)).toBeInTheDocument();
      }
      expect(screen.getByTestId('section-knob-strength')).toBeInTheDocument();
      expect(screen.getByTestId('section-priorities')).toBeInTheDocument();
    });
  }
});
