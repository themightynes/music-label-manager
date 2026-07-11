// React default import required: vitest compiles JSX with the classic
// runtime (tsconfig "jsx": "preserve"), so components under test need React
// in scope (TourCityCard precedent).
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import GameLayout from '@/layouts/GameLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  buildEmptyPlaytestFeedbackResponses,
  type PlaytestFeedbackResponses,
  type PlaytestFeel,
  type PlaytestStrength,
  type PlaytestSectionResponse,
} from '@shared/api/contracts';
import {
  FORM_TITLE,
  FORM_INTRO,
  FEEL_OPTIONS,
  STRENGTH_OPTIONS,
  PLAYTEST_FORM_SECTIONS,
  PLAYTEST_FORM_KNOBS,
  KNOB_SECTION_TITLE,
  KNOB_SECTION_BLURB,
  ONE_KNOB_PROMPT,
  PRIORITIES_SECTION_TITLE,
  PRIORITIES_SECTION_BLURB,
  PULL_BACK_PROMPT,
  GUT_CHECK_PROMPT,
  ANYTHING_OFF_PROMPT,
  type PlaytestFormSection,
} from '@/admin/playtestFeedbackForm';

/**
 * Playtest feedback recording surface (2026-07-11 form).
 *
 * On-screen mirror of docs/01-planning/PLAYTEST_FEEDBACK_2026-07-11.md — the
 * markdown stays the printable source. Answers persist via
 * GET/POST /api/admin/playtest-feedback (server/routes/admin.ts) into
 * docs/01-planning/playtest-feedback-2026-07-11.responses.json, so the page
 * prefills from the saved file and can be edited incrementally. Nothing is
 * required — unanswered fields simply stay empty/null.
 */

const PLAYTEST_FEEDBACK_QUERY_KEY = ['admin', 'playtest-feedback'] as const;

function emptySection(): PlaytestSectionResponse {
  return { exposure: [], feel: null, anythingOff: '', designerAnswers: [] };
}

// Merge a fetched document over the canonical empty default so every section
// and knob key exists even if the saved file predates a form tweak.
function withDefaults(fetched: PlaytestFeedbackResponses): PlaytestFeedbackResponses {
  const base = buildEmptyPlaytestFeedbackResponses();
  return {
    ...base,
    ...fetched,
    sections: { ...base.sections, ...(fetched.sections ?? {}) },
    knobStrength: { ...base.knobStrength, ...(fetched.knobStrength ?? {}) },
    topPriorities: [
      fetched.topPriorities?.[0] ?? '',
      fetched.topPriorities?.[1] ?? '',
      fetched.topPriorities?.[2] ?? '',
    ],
  };
}

function formatSavedAt(savedAt: string | null): string | null {
  if (!savedAt) return null;
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return savedAt;
  return date.toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Section card (§1–§11): exposure ticks + feel scale + anything-off line +
// designer questions.
// ─────────────────────────────────────────────────────────────────────────────

interface SectionCardProps {
  section: PlaytestFormSection;
  value: PlaytestSectionResponse;
  onChange: (next: PlaytestSectionResponse) => void;
}

function SectionCard({ section, value, onChange }: SectionCardProps) {
  const toggleExposure = (optionId: string, checked: boolean) => {
    let exposure: string[];
    if (section.exposureMulti) {
      exposure = checked
        ? [...value.exposure, optionId]
        : value.exposure.filter((id) => id !== optionId);
    } else {
      // The markdown says one tick per question unless noted — replace the
      // tick instead of accumulating.
      exposure = checked ? [optionId] : [];
    }
    onChange({ ...value, exposure });
  };

  const setDesignerAnswer = (index: number, text: string) => {
    const designerAnswers = [...value.designerAnswers];
    while (designerAnswers.length <= index) designerAnswers.push('');
    designerAnswers[index] = text;
    onChange({ ...value, designerAnswers });
  };

  return (
    <section className="glass-panel rounded-xl p-5 space-y-4" data-testid={`section-${section.id}`}>
      <header>
        <h2 className="text-lg font-semibold text-white">
          <span className="text-neon-cyan mr-2">{section.number}.</span>
          {section.title}
        </h2>
        <p className="text-sm text-white/60 italic mt-1">{section.blurb}</p>
      </header>

      <div>
        <p className="text-sm font-medium text-white/80 mb-2">{section.exposurePrompt}</p>
        <div className="space-y-1.5">
          {section.exposureOptions.map((option) => {
            const checkboxId = `${section.id}-exposure-${option.id}`;
            return (
              <div key={option.id} className="flex items-center gap-2">
                <Checkbox
                  id={checkboxId}
                  checked={value.exposure.includes(option.id)}
                  onCheckedChange={(checked) => toggleExposure(option.id, checked === true)}
                />
                <Label htmlFor={checkboxId} className="text-sm text-white/80 font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-white/80 mb-2">Feel:</p>
        <RadioGroup
          value={value.feel ?? ''}
          onValueChange={(feel) => onChange({ ...value, feel: feel as PlaytestFeel })}
          className="flex flex-wrap gap-4"
        >
          {FEEL_OPTIONS.map((option) => {
            const radioId = `${section.id}-feel-${option.value}`;
            return (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={radioId} />
                <Label htmlFor={radioId} className="text-sm font-normal cursor-pointer">
                  <span className="font-mono text-neon-lilac">{option.label}</span>
                  <span className="text-white/50 ml-1">({option.hint})</span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div>
        <Label
          htmlFor={`${section.id}-anything-off`}
          className="text-sm font-medium text-white/80"
        >
          {ANYTHING_OFF_PROMPT}
        </Label>
        <Input
          id={`${section.id}-anything-off`}
          value={value.anythingOff}
          onChange={(e) => onChange({ ...value, anythingOff: e.target.value })}
          placeholder="Blank = nothing to report"
          className="mt-1.5"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-neon-magenta">Designer questions:</p>
        {section.designerQuestions.map((question, index) => {
          const textareaId = `${section.id}-designer-${index}`;
          return (
            <div key={textareaId}>
              <Label htmlFor={textareaId} className="text-sm text-white/70 font-normal">
                {section.designerQuestions.length > 1 ? `${index + 1}. ` : ''}
                {question}
              </Label>
              <Textarea
                id={textareaId}
                value={value.designerAnswers[index] ?? ''}
                onChange={(e) => setDesignerAnswer(index, e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The form body — exported for the render test (no layout, no network).
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaytestFeedbackFormProps {
  responses: PlaytestFeedbackResponses;
  onChange: (next: PlaytestFeedbackResponses) => void;
}

export function PlaytestFeedbackForm({ responses, onChange }: PlaytestFeedbackFormProps) {
  const setSection = (id: string, next: PlaytestSectionResponse) => {
    onChange({ ...responses, sections: { ...responses.sections, [id]: next } });
  };

  const setKnob = (id: string, strength: PlaytestStrength | null) => {
    onChange({ ...responses, knobStrength: { ...responses.knobStrength, [id]: strength } });
  };

  const setPriority = (index: number, text: string) => {
    const topPriorities = [...responses.topPriorities] as string[];
    topPriorities[index] = text;
    onChange({ ...responses, topPriorities });
  };

  return (
    <div className="space-y-5">
      {PLAYTEST_FORM_SECTIONS.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          value={responses.sections[section.id] ?? emptySection()}
          onChange={(next) => setSection(section.id, next)}
        />
      ))}

      {/* §12 — Feel-knob tuning appetite */}
      <section className="glass-panel rounded-xl p-5 space-y-4" data-testid="section-knob-strength">
        <header>
          <h2 className="text-lg font-semibold text-white">
            <span className="text-neon-cyan mr-2">12.</span>
            {KNOB_SECTION_TITLE}
          </h2>
          <p className="text-sm text-white/60 italic mt-1">{KNOB_SECTION_BLURB}</p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="text-left py-2 pr-4 font-medium">System</th>
                {STRENGTH_OPTIONS.map((option) => (
                  <th key={option.value} className="text-center py-2 px-3 font-medium">
                    {option.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAYTEST_FORM_KNOBS.map((knob) => (
                <tr key={knob.id} className="border-b border-white/5">
                  <td className="py-2 pr-4 text-white/80">{knob.label}</td>
                  {STRENGTH_OPTIONS.map((option) => {
                    const selected = responses.knobStrength[knob.id] === option.value;
                    return (
                      <td key={option.value} className="text-center py-2 px-3">
                        <Checkbox
                          aria-label={`${knob.label} — ${option.label}`}
                          checked={selected}
                          onCheckedChange={(checked) =>
                            setKnob(knob.id, checked === true ? option.value : null)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <Label htmlFor="one-knob-change" className="text-sm font-medium text-white/80">
            {ONE_KNOB_PROMPT}
          </Label>
          <Input
            id="one-knob-change"
            value={responses.oneKnobChange}
            onChange={(e) => onChange({ ...responses, oneKnobChange: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </section>

      {/* §13 — Top-3 priority */}
      <section className="glass-panel rounded-xl p-5 space-y-4" data-testid="section-priorities">
        <header>
          <h2 className="text-lg font-semibold text-white">
            <span className="text-neon-cyan mr-2">13.</span>
            {PRIORITIES_SECTION_TITLE}
          </h2>
          <p className="text-sm text-white/60 italic mt-1">{PRIORITIES_SECTION_BLURB}</p>
        </header>

        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-neon-cyan font-mono w-5 text-right">{index + 1}.</span>
              <Input
                aria-label={`Priority ${index + 1}`}
                value={responses.topPriorities[index] ?? ''}
                onChange={(e) => setPriority(index, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div>
          <Label htmlFor="pull-back" className="text-sm font-medium text-white/80">
            {PULL_BACK_PROMPT}
          </Label>
          <Textarea
            id="pull-back"
            value={responses.pullBack}
            onChange={(e) => onChange({ ...responses, pullBack: e.target.value })}
            rows={2}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="gut-check" className="text-sm font-medium text-white/80">
            {GUT_CHECK_PROMPT}
          </Label>
          <Input
            id="gut-check"
            value={responses.gutCheck}
            onChange={(e) => onChange({ ...responses, gutCheck: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The page — GameLayout exactly once (Content Editor precedent), fetch via
// apiRequest, sticky save bar with saved-at indicator.
// ─────────────────────────────────────────────────────────────────────────────

export default function PlaytestFeedbackPage() {
  const { toast } = useToast();
  const [responses, setResponses] = useState<PlaytestFeedbackResponses | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const {
    data: fetched,
    isLoading,
    isError,
  } = useQuery<PlaytestFeedbackResponses>({
    queryKey: PLAYTEST_FEEDBACK_QUERY_KEY,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/playtest-feedback');
      return response.json();
    },
  });

  // Prefill once from the fetch; afterwards the local draft owns the state so
  // in-progress edits are never clobbered.
  useEffect(() => {
    if (fetched && responses === null) {
      const merged = withDefaults(fetched);
      setResponses(merged);
      setSavedAt(merged.savedAt);
    }
  }, [fetched, responses]);

  const handleChange = (next: PlaytestFeedbackResponses) => {
    setResponses(next);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!responses || isSaving) return;
    setIsSaving(true);
    try {
      const response = await apiRequest('POST', '/api/admin/playtest-feedback', { responses });
      const result = await response.json();
      if (result?.savedAt) setSavedAt(result.savedAt);
      setDirty(false);
      toast({ title: 'Feedback saved', description: 'Responses written to the planning doc folder.' });
    } catch (error) {
      console.error('Failed to save playtest feedback:', error);
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const savedLabel = formatSavedAt(savedAt);

  return (
    <GameLayout>
      <div className="container mx-auto px-6 py-6 max-w-4xl">
        {/* Sticky save bar */}
        <div className="sticky top-0 z-20 -mx-2 px-2 py-3 backdrop-blur-md bg-surface-app/80 border-b border-white/10 mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{FORM_TITLE}</h1>
            <p className="text-xs text-white/50">
              {savedLabel ? `Last saved ${savedLabel}` : 'Not saved yet'}
              {dirty ? ' · unsaved changes' : ''}
            </p>
          </div>
          <Button onClick={handleSave} disabled={!responses || isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        <p className="text-sm text-white/60 mb-6">{FORM_INTRO}</p>

        {isLoading && <p className="text-white/60">Loading saved responses…</p>}
        {isError && (
          <p className="text-negative">Failed to load saved responses — answers entered now would not prefill.</p>
        )}

        {responses && <PlaytestFeedbackForm responses={responses} onChange={handleChange} />}
      </div>
    </GameLayout>
  );
}
