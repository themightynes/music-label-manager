// React default import required: vitest compiles JSX with the classic
// runtime (tsconfig "jsx": "preserve"), so components under test need React
// in scope (PlaytestFeedbackPage precedent).
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import GameLayout from '@/layouts/GameLayout';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  MAC_POOL_REVIEW_FORM_ID,
  buildEmptyMacPoolReviewResponses,
  type MacPoolMeetingReview,
  type MacPoolReviewResponses,
  type MacPoolReviewVerdict,
} from '@shared/api/contracts';
import {
  MAC_POOL_REVIEW_INTRO,
  MAC_POOL_REVIEW_TITLE,
  MAC_POOL_REVIEW_VERDICT_OPTIONS,
  MAC_POOL_OVERALL_NOTES_PROMPT,
  MAC_POOL_VOICE_CONSISTENCY_PROMPT,
  V3_MAC_POOL_MEETINGS,
  type MacPoolMeetingEntry,
} from '@/admin/v3MacPoolReview';

/**
 * v3 Mac Pool content-review surface (/admin/mac-pool-review).
 *
 * Same persistence machinery as the playtest-feedback page — the SAME
 * GET/POST /api/admin/playtest-feedback endpoint pair, keyed by the
 * 'v3-mac-pool-review' formId from the widened server-side allowlist, saving
 * to docs/01-planning/v3-mac-pool-review.responses.json (validate → backup →
 * write; a save here can never reach any playtest round's file and vice
 * versa). NOT a playtest round: it does not appear in the round picker, and
 * the round-shaped PLAYTEST_FORM_REGISTRY is untouched.
 *
 * Content (client/src/admin/v3MacPoolReview.ts) is the verbatim transcription
 * of the 2026-07-12 working session's authored Mac meetings. Per meeting: a
 * verdict (approve / approve with edits / rework / kill) + freeform notes;
 * two overall fields at the end. Nothing is required — unanswered stays
 * null/empty.
 */

const macPoolReviewQueryKey = ['admin', 'playtest-feedback', MAC_POOL_REVIEW_FORM_ID] as const;

function emptyMeetingReview(): MacPoolMeetingReview {
  return { verdict: null, notes: '' };
}

// Merge a fetched document over the canonical empty default so every meeting
// key exists even if the saved file predates a content tweak.
function withDefaults(fetched: MacPoolReviewResponses): MacPoolReviewResponses {
  const base = buildEmptyMacPoolReviewResponses();
  return {
    ...base,
    ...fetched,
    meetings: { ...base.meetings, ...(fetched.meetings ?? {}) },
  };
}

function formatSavedAt(savedAt: string | null): string | null {
  if (!savedAt) return null;
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return savedAt;
  return date.toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Meeting card: authored content (prompt as exec dialogue, choices table,
// band line, upgrade spec) + the review controls.
// ─────────────────────────────────────────────────────────────────────────────

interface MeetingCardProps {
  meeting: MacPoolMeetingEntry;
  number: number;
  value: MacPoolMeetingReview;
  onChange: (next: MacPoolMeetingReview) => void;
}

function MeetingCard({ meeting, number, value, onChange }: MeetingCardProps) {
  return (
    <section className="glass-panel rounded-xl p-5 space-y-4" data-testid={`meeting-${meeting.id}`}>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white flex flex-wrap items-center gap-2">
          <span className="text-neon-cyan">{number}.</span>
          <span>{meeting.title}</span>
          {meeting.finalized && (
            <span className="rounded-full bg-positive/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-positive">
              FINALIZED (baseline)
            </span>
          )}
          {meeting.contentPending && (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
              Content pending
            </span>
          )}
        </h2>
        <p className="text-xs text-white/50">
          <span className="font-mono text-neon-lilac">{meeting.tier}</span>
          <span className="mx-1.5">·</span>
          {meeting.gating}
          <span className="mx-1.5">·</span>
          <span className="text-white/35">
            {meeting.status} — {meeting.sourceFile}
          </span>
        </p>
      </header>

      {meeting.prompt && (
        <blockquote className="border-l-2 border-neon-magenta/60 pl-4 py-1">
          <p className="text-sm text-white/85 italic leading-relaxed">
            <span className="not-italic font-semibold text-neon-magenta mr-2">Mac:</span>
            “{meeting.prompt}”
          </p>
        </blockquote>
      )}

      {meeting.description && <p className="text-sm text-white/60">{meeting.description}</p>}

      {meeting.choices.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/60">
                <th className="text-left py-2 pr-3 font-medium">Choice</th>
                <th className="text-left py-2 pr-3 font-medium">Effects (immediate → delayed)</th>
                <th className="text-left py-2 font-medium">Outcome summary</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {meeting.choices.map((choice) => (
                <tr key={choice.id} className="border-b border-white/5">
                  <td className="py-2 pr-3 min-w-[12rem]">
                    <p className="text-white/90 font-medium">{choice.label}</p>
                    <p className="text-white/40 font-mono text-xs">{choice.id}</p>
                    <p className="text-white/55 italic text-xs mt-1">{choice.gist}</p>
                  </td>
                  <td className="py-2 pr-3 min-w-[12rem] font-mono text-xs">
                    <span className="text-white/85">{choice.immediate || '—'}</span>
                    <span className="text-neon-cyan mx-1.5">→</span>
                    <span className="text-white/70">{choice.delayed || '—'}</span>
                  </td>
                  <td className="py-2 text-white/70 min-w-[16rem]">{choice.outcomeSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meeting.bandPredictions && (
        <div className="rounded-lg bg-surface-inner/60 p-3 space-y-1 text-xs">
          <p className="font-medium text-neon-lilac">{meeting.bandPredictions.heading}:</p>
          <p className="text-white/70">
            <span className="font-semibold text-white/85">Loyal:</span> {meeting.bandPredictions.loyal}
          </p>
          <p className="text-white/70">
            <span className="font-semibold text-white/85">Committed:</span> {meeting.bandPredictions.committed}
          </p>
          <p className="text-white/70">
            <span className="font-semibold text-white/85">Disloyal:</span> {meeting.bandPredictions.disloyal}
          </p>
          {meeting.bandPredictions.flags && (
            <p className="text-warning/90">
              <span className="font-semibold">Flags:</span> {meeting.bandPredictions.flags}
            </p>
          )}
        </div>
      )}

      {meeting.notes.length > 0 && (
        <ul className="list-disc pl-5 space-y-1 text-xs text-white/60">
          {meeting.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}

      {meeting.upgradeSpec && (
        <p className="text-xs text-neon-cyan/80 border border-neon-cyan/20 rounded-lg p-3 bg-surface-inner/40">
          {meeting.upgradeSpec}
        </p>
      )}

      {/* Review controls */}
      <div className="pt-2 border-t border-white/10 space-y-3">
        <div>
          <p className="text-sm font-medium text-neon-magenta mb-2">Verdict:</p>
          <RadioGroup
            value={value.verdict ?? ''}
            onValueChange={(verdict) =>
              onChange({ ...value, verdict: verdict as MacPoolReviewVerdict })
            }
            className="flex flex-wrap gap-4"
          >
            {MAC_POOL_REVIEW_VERDICT_OPTIONS.map((option) => {
              const radioId = `${meeting.id}-verdict-${option.value}`;
              return (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem value={option.value} id={radioId} />
                  <Label htmlFor={radioId} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor={`${meeting.id}-notes`} className="text-sm font-medium text-white/80">
            Notes:
          </Label>
          <Textarea
            id={`${meeting.id}-notes`}
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            rows={2}
            placeholder="Blank = nothing to report"
            className="mt-1.5"
          />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The form body — exported for the render test (no layout, no network).
// ─────────────────────────────────────────────────────────────────────────────

export interface MacPoolReviewFormProps {
  responses: MacPoolReviewResponses;
  onChange: (next: MacPoolReviewResponses) => void;
}

export function MacPoolReviewForm({ responses, onChange }: MacPoolReviewFormProps) {
  const setMeeting = (id: string, next: MacPoolMeetingReview) => {
    onChange({ ...responses, meetings: { ...responses.meetings, [id]: next } });
  };

  return (
    <div className="space-y-5">
      {V3_MAC_POOL_MEETINGS.map((meeting, index) => (
        <MeetingCard
          key={meeting.id}
          meeting={meeting}
          number={index + 1}
          value={responses.meetings[meeting.id] ?? emptyMeetingReview()}
          onChange={(next) => setMeeting(meeting.id, next)}
        />
      ))}

      {/* Overall fields */}
      <section className="glass-panel rounded-xl p-5 space-y-4" data-testid="section-overall">
        <header>
          <h2 className="text-lg font-semibold text-white">
            <span className="text-neon-cyan mr-2">{V3_MAC_POOL_MEETINGS.length + 1}.</span>
            Overall
          </h2>
        </header>

        <div>
          <Label htmlFor="overall-notes" className="text-sm font-medium text-white/80">
            {MAC_POOL_OVERALL_NOTES_PROMPT}
          </Label>
          <Textarea
            id="overall-notes"
            value={responses.overallNotes}
            onChange={(e) => onChange({ ...responses, overallNotes: e.target.value })}
            rows={3}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="voice-consistency" className="text-sm font-medium text-white/80">
            {MAC_POOL_VOICE_CONSISTENCY_PROMPT}
          </Label>
          <Textarea
            id="voice-consistency"
            value={responses.voiceConsistency}
            onChange={(e) => onChange({ ...responses, voiceConsistency: e.target.value })}
            rows={3}
            className="mt-1.5"
          />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The page — GameLayout exactly once, fetch via apiRequest, sticky save bar
// (PlaytestFeedbackPage precedent).
// ─────────────────────────────────────────────────────────────────────────────

export default function MacPoolReviewPage() {
  const { toast } = useToast();
  const [responses, setResponses] = useState<MacPoolReviewResponses | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const {
    data: fetched,
    isLoading,
    isError,
  } = useQuery<MacPoolReviewResponses>({
    queryKey: macPoolReviewQueryKey,
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/admin/playtest-feedback?formId=${MAC_POOL_REVIEW_FORM_ID}`
      );
      return response.json();
    },
  });

  // Prefill from the fetch once; the local draft otherwise owns the state so
  // in-progress edits are never clobbered.
  useEffect(() => {
    if (fetched && responses === null) {
      const merged = withDefaults(fetched);
      setResponses(merged);
      setSavedAt(merged.savedAt);
    }
  }, [fetched, responses]);

  const handleChange = (next: MacPoolReviewResponses) => {
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
      toast({ title: 'Review saved', description: 'Responses written to the planning doc folder.' });
    } catch (error) {
      console.error('Failed to save mac pool review:', error);
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
            <h1 className="text-xl font-bold text-white truncate">{MAC_POOL_REVIEW_TITLE}</h1>
            <p className="text-xs text-white/50">
              {savedLabel ? `Last saved ${savedLabel}` : 'Not saved yet'}
              {dirty ? ' · unsaved changes' : ''}
            </p>
          </div>
          <Button onClick={handleSave} disabled={!responses || isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        <p className="text-sm text-white/60 mb-6">{MAC_POOL_REVIEW_INTRO}</p>

        {isLoading && <p className="text-white/60">Loading saved responses…</p>}
        {isError && (
          <p className="text-negative">Failed to load saved responses — answers entered now would not prefill.</p>
        )}

        {responses && <MacPoolReviewForm responses={responses} onChange={handleChange} />}
      </div>
    </GameLayout>
  );
}
