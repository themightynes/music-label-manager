import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Globe, Star, User, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RoleMeeting, GameArtist } from '../../../../shared/types/gameTypes';
import { formatWhyNow } from '../../utils/reactiveContextCopy';

/**
 * Exec Console redesign (2026-07-11): the meeting step renders as the solo
 * channel's BRIEF — "this week's meeting" label, meeting title, the exec's
 * prompt as a quote panel, and a Start Meeting CTA. `user_selected` meetings
 * route through the console ARTIST PICKER step (cards with mood/energy/
 * popularity meters — picking an artist starts the meeting immediately).
 *
 * Behavior contracts preserved from the pre-redesign selector:
 * - empty eligible pool → calm sit-out state (`meeting-pool-empty` testid + copy)
 * - `user_selected` meetings hidden when no artists are signed (FR-12)
 * - Tier 2 "why now" line renders when the meeting carries `reactiveContext`
 * - multiple meetings in the pool stay reachable (pager instead of carousel)
 */

interface MeetingSelectorProps {
  meetings: RoleMeeting[];
  signedArtists: GameArtist[];
  onSelectMeeting: (meeting: RoleMeeting, selectedArtistId?: string) => void;
  onBack: () => void;
}

function ScopeBadge({ scope }: { scope: string }) {
  const scopeConfig = {
    global: {
      icon: Globe,
      label: 'All Artists',
      color: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/40',
    },
    predetermined: {
      icon: Star,
      label: 'Top Artist',
      color: 'text-warning bg-warning/10 border-warning/40',
    },
    user_selected: {
      icon: User,
      label: 'Your Choice',
      color: 'text-neon-purple bg-neon-purple/10 border-neon-purple/40',
    },
  };

  const config = scopeConfig[scope as keyof typeof scopeConfig] || scopeConfig.global;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-xs font-mono rounded-pill ${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

/**
 * Tier 2 (PR-2) — "why now" reason line, rendered when the selected meeting
 * carries `reactiveContext` (the injection stage picked it in response to a
 * week happening). Reveal is the payoff: this line only appears once the
 * player has opened the meeting, never on the exec card itself (that's the
 * urgency dot's job — see ExecutiveCard).
 */
function WhyNowLine({ meeting }: { meeting: RoleMeeting }) {
  if (!meeting.reactiveContext) return null;
  return (
    <div
      data-testid="why-now-line"
      className="inline-flex items-center gap-2 rounded-pill border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1.5 text-[11.5px] text-neon-cyan"
    >
      <Sparkles className="h-3 w-3 shrink-0 animate-pulse" />
      <span className="font-mono">{formatWhyNow(meeting.reactiveContext)}</span>
    </div>
  );
}

function meetingTitle(meeting: RoleMeeting): string {
  return meeting.name || meeting.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function StatChip({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <span className={`font-mono text-[10.5px] ${className}`}>
      {label} {Math.max(0, Math.min(100, value))}%
    </span>
  );
}

export function MeetingSelector({ meetings, signedArtists, onSelectMeeting, onBack }: MeetingSelectorProps) {
  const [meetingIndex, setMeetingIndex] = useState(0);
  const [pickingArtistFor, setPickingArtistFor] = useState<RoleMeeting | null>(null);

  // Filter out user_selected meetings if no artists are signed (FR-12)
  const filteredMeetings = signedArtists.length === 0
    ? meetings.filter(m => m.target_scope !== 'user_selected')
    : meetings;

  if (filteredMeetings.length === 0) {
    // Meeting-relevance Tier 0 (PR-1): empty eligible pool — the exec sits out
    // the week. Calm, honest copy: nothing about the label's current state
    // needs this executive's attention yet.
    return (
      <div className="text-center p-8" data-testid="meeting-pool-empty">
        <div className="text-text-body">
          <p className="text-lg font-medium">Nothing needs your call this week</p>
          <p className="text-sm mt-1 text-text-muted">This executive has no business to discuss yet — they'll have more as your label grows.</p>
        </div>
        <Button onClick={onBack} className="mt-4" variant="outline">
          Back to Executives
        </Button>
      </div>
    );
  }

  // ── step: artist picker ──────────────────────────────────────────────────
  if (pickingArtistFor) {
    const meeting = pickingArtistFor;
    return (
      <div data-screen-label="Artist picker">
        <h2 className="m-0 mb-1.5 text-[22px] font-semibold text-text-primary">Which artist is this about?</h2>
        <div className="mb-3 text-[13px] text-text-muted">{meetingTitle(meeting)}</div>
        <div className="mb-4 empty:hidden">
          <WhyNowLine meeting={meeting} />
        </div>
        {meeting.prompt_before_selection && (
          <p className="mb-6 text-sm italic text-text-body">"{meeting.prompt_before_selection}"</p>
        )}
        <div className="flex flex-wrap gap-4">
          {signedArtists.map((artist) => (
            <div
              key={artist.id}
              data-testid={`console-artist-pick-${artist.id}`}
              onClick={() => onSelectMeeting(meeting, artist.id)}
              className="chromatic-hairline relative w-full max-w-[250px] cursor-pointer rounded-card border border-white/10 bg-surface-inner/50 px-5 py-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-neon-lilac/50"
            >
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-card bg-gradient-to-br from-neon-purple to-neon-blue font-display text-xl text-white shadow-panel">
                {artist.name
                  .split(/\s+/)
                  .map(part => part[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toLowerCase()}
              </div>
              <div className="text-[14.5px] font-semibold text-text-primary">{artist.name}</div>
              {artist.archetype && (
                <div className="mt-0.5 text-[11.5px] text-neon-lilac">{artist.archetype}</div>
              )}
              <div className="mt-2.5 flex justify-center gap-3">
                <StatChip label="M" value={artist.mood ?? 50} className="text-warning" />
                <StatChip label="E" value={artist.energy ?? 50} className="text-positive" />
                <StatChip label="P" value={artist.popularity ?? 0} className="text-neon-pink" />
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={() => setPickingArtistFor(null)}
          variant="outline"
          className="mt-6 rounded-button border border-white/10 bg-white/[0.02] text-text-body hover:bg-white/5"
        >
          Back
        </Button>
      </div>
    );
  }

  // ── step: meeting brief ──────────────────────────────────────────────────
  const safeIndex = Math.min(meetingIndex, filteredMeetings.length - 1);
  const meeting = filteredMeetings[safeIndex];
  const isUserSelected = meeting.target_scope === 'user_selected' && signedArtists.length > 0;
  const briefPrompt = meeting.target_scope === 'user_selected' && meeting.prompt_before_selection
    ? meeting.prompt_before_selection
    : meeting.prompt;

  const handleStart = () => {
    if (isUserSelected) {
      setPickingArtistFor(meeting);
    } else {
      onSelectMeeting(meeting);
    }
  };

  return (
    <div data-screen-label="Meeting card">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-text-muted">
          this week's meeting
        </div>
        <ScopeBadge scope={meeting.target_scope} />
      </div>
      <h2 className="m-0 mb-3 text-[25px] font-semibold text-text-primary">{meetingTitle(meeting)}</h2>
      <div className="mb-5">
        <WhyNowLine meeting={meeting} />
      </div>
      <div className="chromatic-hairline relative mb-7 rounded-card border border-neon-pink/20 bg-gradient-to-br from-action-pink/15 to-action-purple/15 px-7 py-6">
        <div className="text-[17px] italic leading-relaxed text-text-primary/90">
          "{briefPrompt}"
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          onClick={handleStart}
          className="w-[340px] max-w-full rounded-button bg-gradient-to-br from-action-pink to-action-purple py-6 text-[15px] font-semibold text-white shadow-action hover:opacity-90"
        >
          {isUserSelected ? 'Start Meeting — pick an artist' : 'Start Meeting'}
        </Button>
        {filteredMeetings.length > 1 && (
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Previous meeting"
              onClick={() => setMeetingIndex((safeIndex - 1 + filteredMeetings.length) % filteredMeetings.length)}
              className="h-7 w-7 p-0 text-text-muted hover:text-text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>{safeIndex + 1} / {filteredMeetings.length}</span>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Next meeting"
              onClick={() => setMeetingIndex((safeIndex + 1) % filteredMeetings.length)}
              className="h-7 w-7 p-0 text-text-muted hover:text-text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
