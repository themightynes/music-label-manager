import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { useQueryClient } from '@tanstack/react-query';
import { executiveMeetingMachine } from '../../machines/executiveMeetingMachine';
import { makeCachedFetchExecutives } from '../../hooks/useExecutives';
import { ExecutiveCard, roleConfig, meetingDisplayName, snippetOf } from './ExecutiveCard';
import { MeetingSelector } from './MeetingSelector';
import { DialogueInterface } from './DialogueInterface';
import { AutoSelectReviewPanel } from './AutoSelectReviewPanel';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2, Check, Wand2 } from 'lucide-react';
import { fetchRoleMeetings, fetchMeetingDialogue, fetchAllRoles } from '../../services/executiveService';
import { useGameStore } from '../../store/gameStore';
import { useArtists } from '../../hooks/useArtists';
import type { Executive } from '../../../../shared/types/gameTypes';

/**
 * Exec Console redesign (2026-07-11, "Exec Meetings — Console" design direction):
 * the meeting flow renders as a mixing console. Screen layout:
 *
 * - GRID (machine idle): the console deck — CEO master strip + a channel strip
 *   per executive (loyalty/mood faders, live status readout, queued chips).
 * - SOLO (selectingMeeting → inDialogue): a mini channel rail on the left keeps
 *   every exec one click away (SELECT_EXECUTIVE is legal from solo states); the
 *   solo panel walks brief → (artist) → dialogue takes.
 * - AUTO review (reviewingAutoSelections): the "proposed patch list" modal
 *   overlay (AutoSelectReviewPanel) over whatever screen is behind it.
 *
 * ALL machine wiring, prefetches, and slot/CC sync are unchanged from the
 * pre-redesign component — this is a presentation restructure only.
 */

interface ExecutiveMeetingsProps {
  gameId: string;
  currentWeek: number;
  onActionSelected: (action: string) => void;
  focusSlots: {
    total: number;
    used: number;
  };
  /**
   * Remaining Creative Capital. Passed to the machine as the AUTO_SELECT budget
   * so auto-select can never assemble a set that overdraws CC (playtest bug #11).
   */
  creativeCapital?: number;
  arOfficeStatus?: {
    arOfficeSlotUsed: boolean;
    arOfficeSourcingType: string | null;
    arOfficeOperationStart: number | null;
  };
  onImpactPreviewUpdate?: (preview: {
    immediate: Record<string, number>;
    delayed: Record<string, number>;
    selectedChoices: Array<{
      executiveName: string;
      meetingName: string;
      choiceLabel: string;
      effects_immediate: Record<string, number>;
      effects_delayed: Record<string, number>;
    }>;
  }) => void;
}

function execConfig(role: string) {
  return (
    roleConfig[role as keyof typeof roleConfig] ?? {
      shortTitle: role.replace(/_/g, ' ').toUpperCase(),
      name: role.replace(/_/g, ' '),
      title: role.replace(/_/g, ' '),
      avatar: undefined,
      roleText: 'text-text-muted',
    }
  );
}

function SoloLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="mb-2 h-6 w-6 animate-spin text-neon-lilac" />
      <span className="text-text-body">{label}</span>
    </div>
  );
}

export function ExecutiveMeetings({
  gameId,
  currentWeek,
  onActionSelected,
  focusSlots,
  creativeCapital,
  arOfficeStatus: arOfficeStatusProp,
  onImpactPreviewUpdate,
}: ExecutiveMeetingsProps) {
  const [roleSalaries, setRoleSalaries] = useState<Record<string, number>>({});
  /**
   * Meeting-relevance Tier 0 (PR-1): roles whose eligible meeting pool is EMPTY
   * this week (server answered meetings: []) — those execs sit out and cannot
   * be selected into a focus slot. Keyed per (gameId, week); the server pick is
   * deterministic per (gameId, week, roleId) so this prefetch always matches
   * what the machine's own fetch would return.
   */
  const [sitOutRoles, setSitOutRoles] = useState<Set<string>>(new Set());
  /**
   * Tier 2 (PR-2, Nes amendment 1 — urgency indicator): roles whose prefetched
   * meeting carries `reactiveContext` this week — a happening fired their
   * reactive meeting. Zero new requests: piggybacks on the SAME sit-out
   * prefetch below. The dot signals "something happened" WITHOUT revealing
   * content (no meeting name/trigger on the card) — the "why now" line is the
   * payoff on open (MeetingSelector / AutoSelectReviewPanel).
   */
  const [reactiveRoles, setReactiveRoles] = useState<Set<string>>(new Set());
  /**
   * Hype-board UX Task 4 (playtest feedback): the console strip's open-channel
   * state should preview WHAT is waiting, not just that something is. Piggybacks
   * on the SAME sit-out/urgency prefetch below — zero new requests. Stores the
   * pool's first meeting's name + a one-line prompt snippet per role (the
   * reactive "why now" TRIGGER copy still only reveals on open — see
   * MeetingSelector's WhyNowLine).
   */
  const [meetingPreviews, setMeetingPreviews] = useState<
    Record<string, { name: string; snippet: string; moreCount: number }>
  >({});

  const { getAROfficeStatus, selectedActions } = useGameStore();
  // C74: the global GameHeader AUTO button sets this session intent + navigates
  // here; we consume it once (below) when the machine is idle by sending
  // AUTO_SELECT, routing the header AUTO through the same review gate.
  const pendingAutoSelectIntent = useGameStore((s) => s.pendingAutoSelectIntent);
  const consumePendingAutoSelectIntent = useGameStore(
    (s) => s.consumePendingAutoSelectIntent,
  );
  // Phase 3 PR-9: artists roster read from the TanStack Query cache, not Zustand.
  const { data: artists = [] } = useArtists();

  // Phase 3 PR-8: route the machine's executives fetch through the TanStack
  // Query cache (key ['executives', gameId]) so the meeting flow and any
  // useExecutives() consumers share ONE cached source. The machine keeps its
  // injected-service pattern — it never imports TanStack or the store itself.
  const queryClient = useQueryClient();
  const cachedFetchExecutives = useMemo(
    () => makeCachedFetchExecutives(queryClient),
    [queryClient],
  );

  // A&R office slot status — threaded to the machine so AUTO_SELECT excludes the
  // A&R head (head_ar, Marcus) while he's occupied, matching the manual UI.
  const arOfficeStatusForInput = arOfficeStatusProp ?? getAROfficeStatus();
  const arOfficeSlotUsedInitial = !!arOfficeStatusForInput?.arOfficeSlotUsed;

  // Track which executives have already been used this week (queued actions),
  // computed BEFORE the machine mounts so AUTO's exclusion list is threaded in
  // from the first render (playtest round-1 bug: manual Marcus pick + AUTO for
  // the remaining slots re-proposed Marcus).
  const usedExecutiveRoles = new Set<string>();
  selectedActions.forEach(actionString => {
    try {
      const action = JSON.parse(actionString);
      if (action.roleId) {
        usedExecutiveRoles.add(action.roleId);
      }
    } catch (e) {
      // Ignore invalid action strings
    }
  });
  // Stable, order-independent key so effects don't re-fire on Set identity.
  const usedExecutiveRolesKey = Array.from(usedExecutiveRoles).sort().join(',');

  const [state, send] = useMachine(executiveMeetingMachine, {
    input: {
      gameId,
      currentWeek,
      focusSlotsTotal: focusSlots.total,
      creativeCapital,
      arOfficeSlotUsed: arOfficeSlotUsedInitial,
      usedExecutiveRoles: Array.from(usedExecutiveRoles),
      onActionSelected,
      fetchExecutives: cachedFetchExecutives,
      fetchRoleMeetings,
      fetchMeetingDialogue,
    },
  });

  const { context } = state;
  const previousWeekRef = useRef<number | null>(null);
  const hasAvailableSlots = context.focusSlotsUsed < context.focusSlotsTotal;
  // PR-3: hide the AUTO button while AUTO is computing or its proposal is under
  // review, so the flow can't be re-triggered on top of itself.
  const isAutoFlowActive = state.matches('autoSelecting') || state.matches('reviewingAutoSelections');
  const arOfficeStatus = arOfficeStatusForInput;
  const arOfficeSlotUsed = arOfficeSlotUsedInitial;
  const executives = context.executives;
  const executivesLoading = state.matches('loadingExecutives') || state.matches('refreshingExecutives');
  const executivesError = context.error;

  // Helper to check if an executive has been used (set computed above the
  // machine mount — see usedExecutiveRoles).
  const isExecutiveUsed = (role: string) => usedExecutiveRoles.has(role);

  useEffect(() => {
    let mounted = true;
    const loadRoles = async () => {
      try {
        const rolesData = await fetchAllRoles().catch(() => [] as any[]);
        if (!mounted) return;
        const salaryMap: Record<string, number> = {};
        rolesData.forEach((role: any) => {
          if (role?.id && typeof role.baseSalary === 'number') {
            salaryMap[role.id] = role.baseSalary;
          }
        });
        setRoleSalaries(salaryMap);
      } catch (error) {
        console.error('Failed to load role salary data', error);
      }
    };

    loadRoles();
    return () => {
      mounted = false;
    };
  }, []);

  // Meeting-relevance Tier 0 (PR-1): prefetch each role's weekly pool once per
  // (gameId, week) to learn which execs sit out (empty eligible pool). Fetch
  // errors fail OPEN (exec stays selectable) so a transient network problem
  // never locks a card. Tier 2 (PR-2): the SAME prefetch also records which
  // roles' selected meeting carries `reactiveContext` — zero new requests.
  useEffect(() => {
    if (!gameId) return;
    let isCancelled = false;
    const roleIds = ['ceo', 'head_ar', 'cco', 'cmo', 'head_distribution'];

    (async () => {
      const results = await Promise.all(
        roleIds.map(async (roleId) => {
          try {
            const meetings = await fetchRoleMeetings(roleId, gameId, currentWeek);
            const isReactive = meetings.some((m) => !!m.reactiveContext);
            // Task 4: brief preview from the SAME response — first meeting's
            // display name + prompt snippet. Fetch errors fall through to no
            // preview (the strip keeps its generic open-channel copy).
            const first = meetings[0];
            const preview = first
              ? {
                  name: meetingDisplayName(first),
                  snippet: snippetOf(first.prompt_before_selection || first.prompt),
                  moreCount: meetings.length - 1,
                }
              : null;
            return [roleId, meetings.length, isReactive, preview] as const;
          } catch {
            return [roleId, -1, false, null] as const; // unknown → fail open
          }
        })
      );
      if (isCancelled) return;
      setSitOutRoles(new Set(results.filter(([, count]) => count === 0).map(([roleId]) => roleId)));
      setReactiveRoles(new Set(results.filter(([, , isReactive]) => isReactive).map(([roleId]) => roleId)));
      setMeetingPreviews(
        Object.fromEntries(
          results.filter(([, , , preview]) => !!preview).map(([roleId, , , preview]) => [roleId, preview!])
        )
      );
    })();

    return () => {
      isCancelled = true;
    };
  }, [gameId, currentWeek]);

  // Sync focus slots (plus the Creative Capital budget and AUTO's exclusion
  // lists — AR-busy and already-used roles) with the machine
  useEffect(() => {
    send({
      type: 'SYNC_SLOTS',
      used: focusSlots.used,
      total: focusSlots.total,
      creativeCapital,
      arOfficeSlotUsed,
      usedExecutiveRoles: usedExecutiveRolesKey ? usedExecutiveRolesKey.split(',') : [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- usedExecutiveRolesKey stands in for the Set (stable, order-independent)
  }, [focusSlots.used, focusSlots.total, creativeCapital, arOfficeSlotUsed, usedExecutiveRolesKey, send]);

  // Sync current week with the machine (clears cache when week changes)
  useEffect(() => {
    send({
      type: 'SYNC_WEEK',
      currentWeek
    });
  }, [currentWeek, send]);

  // C74: consume the header AUTO intent exactly once. We wait until the machine
  // is `idle` (its resting state after executives load) before sending AUTO_SELECT
  // so we never fire on top of an in-flight AUTO/manual flow — if the player lands
  // mid-flow, the intent simply sits pending until the machine returns to idle.
  // The flag is cleared as soon as we send, so a re-render can't double-fire, and
  // it is session/UI state (never persisted), so a reload never re-triggers AUTO.
  const isMachineIdle = state.matches('idle');
  useEffect(() => {
    if (!pendingAutoSelectIntent) return;
    if (!isMachineIdle) return;
    consumePendingAutoSelectIntent();
    // Only actually open the review gate if slots are free; if none are free the
    // header button was disabled, but a slot could have filled between click and
    // arrival — in that case we just clear the intent (the machine's own
    // hasFocusSlots guard on AUTO_SELECT would no-op anyway).
    if (hasAvailableSlots) {
      send({ type: 'AUTO_SELECT' });
    }
  }, [
    pendingAutoSelectIntent,
    isMachineIdle,
    hasAvailableSlots,
    consumePendingAutoSelectIntent,
    send,
  ]);

  // Calculate impact preview when selectedActions change
  const isPreviewBlocked =
    state.matches('loadingExecutives') ||
    state.matches('refreshingExecutives') ||
    state.matches('fetchingImpactPreview');

  const lastPreviewActionsRef = useRef<string>('[]');

  useEffect(() => {
    if (isPreviewBlocked) return;
    const serialized = JSON.stringify(selectedActions);
    if (lastPreviewActionsRef.current === serialized) return;
    lastPreviewActionsRef.current = serialized;
    send({
      type: 'CALCULATE_IMPACT_PREVIEW',
      selectedActions
    });
  }, [isPreviewBlocked, selectedActions, send]);

  useEffect(() => {
    const previousWeek = previousWeekRef.current;
    if (previousWeek !== null && currentWeek > previousWeek) {
      if (
        !state.matches('loadingExecutives') &&
        !state.matches('refreshingExecutives') &&
        !state.matches('processingChoice') &&
        !state.matches('loadingMeetings') &&
        !state.matches('loadingDialogue')
      ) {
        send({ type: 'REFRESH_EXECUTIVES' });
      }
    }
    previousWeekRef.current = currentWeek;
  }, [currentWeek, send, state]);

  // Send impact preview to parent when it updates
  useEffect(() => {
    if (onImpactPreviewUpdate && context.impactPreview) {
      onImpactPreviewUpdate(context.impactPreview);
    }
  }, [context.impactPreview, onImpactPreviewUpdate]);

  // ── screen selection ───────────────────────────────────────────────────────
  const isSoloScreen =
    (state.matches('selectingMeeting') ||
      state.matches('loadingMeetings') ||
      state.matches('loadingDialogue') ||
      state.matches('inDialogue') ||
      state.matches('processingChoice')) &&
    !!context.selectedExecutive;

  const canOpenExecutive = (executive: Executive) => {
    const isArBusy = executive.role === 'head_ar' && !!arOfficeStatus?.arOfficeSlotUsed;
    return (
      hasAvailableSlots &&
      !isExecutiveUsed(executive.role) &&
      !sitOutRoles.has(executive.role) &&
      !isArBusy
    );
  };

  const orderedExecutives = useMemo(() => {
    const ceo = executives.find(exec => exec.role === 'ceo');
    const rest = executives.filter(exec => exec.role !== 'ceo');
    return { ceo, rest, all: ceo ? [ceo, ...rest] : rest };
  }, [executives]);

  // ── solo view (brief / artist / dialogue) ──────────────────────────────────
  const renderSoloContent = () => {
    if (state.matches('loadingMeetings')) return <SoloLoader label="Loading meetings..." />;
    if (state.matches('loadingDialogue')) return <SoloLoader label="Loading dialogue..." />;
    if (state.matches('processingChoice')) return <SoloLoader label="Committing your call..." />;

    if (state.matches('selectingMeeting')) {
      return (
        <MeetingSelector
          meetings={context.availableMeetings}
          signedArtists={artists.filter(a => a.signed) as any}
          onSelectMeeting={(meeting, selectedArtistId) => send({ type: 'SELECT_MEETING', meeting, selectedArtistId })}
          onBack={() => send({ type: 'BACK_TO_EXECUTIVES' })}
        />
      );
    }

    if (state.matches('inDialogue') && context.currentDialogue) {
      return (
        <DialogueInterface
          dialogue={context.currentDialogue}
          onSelectChoice={(choice) => send({ type: 'SELECT_CHOICE', choice })}
          onBack={() => send({ type: 'BACK_TO_MEETINGS' })}
          availableCreativeCapital={creativeCapital}
          targetScope={context.selectedMeeting?.target_scope}
          selectedArtistName={
            context.selectedArtistId
              ? artists.find(a => a.id === context.selectedArtistId)?.name
              : undefined
          }
        />
      );
    }

    return null;
  };

  const renderSoloView = () => {
    const activeExec = context.selectedExecutive!;
    const config = execConfig(activeExec.role);
    const stepLabel = state.matches('inDialogue') || state.matches('loadingDialogue')
      ? 'step 2 · response'
      : state.matches('processingChoice')
        ? 'committing'
        : 'step 1 · brief';

    return (
      <div className="flex gap-6" data-screen-label="Solo channel">
        {/* mini channel rail */}
        <div className="flex w-[86px] flex-shrink-0 flex-col gap-3">
          {orderedExecutives.all.map((executive) => {
            const railConfig = execConfig(executive.role);
            const isActive = activeExec.role === executive.role;
            const clickable = !isActive && canOpenExecutive(executive);
            const queued = isExecutiveUsed(executive.role);
            return (
              <div
                key={executive.role}
                title={`${railConfig.shortTitle} — ${railConfig.name}`}
                data-testid={`rail-${executive.role}`}
                onClick={clickable ? () => send({ type: 'SELECT_EXECUTIVE', executive }) : undefined}
                className={`relative flex h-[86px] flex-col items-center justify-center gap-1.5 rounded-card border bg-gradient-to-b from-surface-panel/85 to-surface-inner/90 transition-colors ${
                  isActive
                    ? 'border-neon-lilac/50 opacity-100'
                    : clickable
                      ? 'cursor-pointer border-white/10 opacity-80 hover:border-white/25'
                      : 'border-white/10 opacity-40'
                }`}
              >
                <div className="h-10 w-10 overflow-hidden rounded-full shadow-panel">
                  {railConfig.avatar ? (
                    <img src={railConfig.avatar} alt="" className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-money to-action-pink font-display text-[11px] text-white">
                      {railConfig.shortTitle}
                    </div>
                  )}
                </div>
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-text-muted">
                  {executive.role === 'ceo' ? 'mstr' : 'ch'}
                </span>
                {queued && (
                  <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-neon-green/50 bg-neon-green/20">
                    <Check className="h-2 w-2 text-neon-green" />
                  </span>
                )}
                {isActive && (
                  <span className="absolute -left-px bottom-4 top-4 w-[3px] rounded-full bg-gradient-to-b from-neon-pink via-neon-purple to-neon-cyan shadow-[0_0_10px_rgba(160,90,240,0.7)]" />
                )}
              </div>
            );
          })}
          <Button
            variant="outline"
            aria-label="Back to executives"
            onClick={() => send({ type: 'BACK_TO_EXECUTIVES' })}
            className="h-[52px] rounded-card border border-white/10 bg-white/[0.02] text-text-muted hover:border-white/25 hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* solo channel content */}
        <div className="chromatic-hairline hud-ticks relative flex-1 overflow-hidden rounded-card border border-white/10 bg-gradient-to-b from-surface-panel/85 to-surface-inner/95 p-6 shadow-panel md:p-8">
          {/* solo header */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full shadow-panel">
              {config.avatar ? (
                <img src={config.avatar} alt={`${config.title} avatar`} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-money to-action-pink font-display text-base text-white">
                  {config.shortTitle}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-semibold text-text-primary">{config.name}</span>
                <span className={`rounded-pill border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] ${config.roleText}`}>
                  {config.title}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-neon-pink">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon-magenta shadow-[0_0_8px_1px_rgba(255,61,110,0.8)]" />
                  solo
                </span>
              </div>
            </div>
            {state.matches('inDialogue') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => send({ type: 'BACK_TO_MEETINGS' })}
                aria-label="Back to meeting list"
                className="text-text-muted hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              {stepLabel}
            </div>
          </div>

          {renderSoloContent()}
        </div>
      </div>
    );
  };

  // ── grid view (console deck) ───────────────────────────────────────────────
  const renderGridView = () => (
    <div data-screen-label="Exec selection console">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-muted">
          executive channels · patch a meeting into a focus slot
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted/70">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_8px_1px_rgba(87,255,143,0.8)]" />
            console live
          </div>
          {hasAvailableSlots && !isAutoFlowActive && (
            <Button
              size="sm"
              onClick={() => send({ type: 'AUTO_SELECT' })}
              disabled={!hasAvailableSlots || executives.length === 0}
              className="gap-1.5 rounded-button bg-gradient-to-br from-action-pink to-action-purple font-semibold text-white shadow-action hover:opacity-90"
            >
              <Wand2 className="h-3.5 w-3.5" />
              AUTO
            </Button>
          )}
        </div>
      </div>

      {executivesLoading && executives.length === 0 ? (
        <SoloLoader label="Loading executives..." />
      ) : (
        <div className="flex flex-col items-stretch gap-4 lg:flex-row">
          {orderedExecutives.ceo && (
            <>
              <ExecutiveCard
                key="ceo"
                executive={orderedExecutives.ceo}
                disabled={!hasAvailableSlots}
                noSlots={!hasAvailableSlots}
                queued={isExecutiveUsed('ceo')}
                sitOut={sitOutRoles.has('ceo')}
                hasReactiveMeeting={reactiveRoles.has('ceo')}
                meetingPreview={meetingPreviews['ceo']}
                onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive: orderedExecutives.ceo! })}
                weeklySalary={roleSalaries['ceo']}
                arOfficeStatus={arOfficeStatus}
              />
              <div className="hidden w-px flex-shrink-0 bg-white/[0.07] lg:block" />
            </>
          )}
          {orderedExecutives.rest.map((executive, index) => (
            <ExecutiveCard
              key={executive.role}
              executive={executive}
              channelNumber={index + 1}
              disabled={!hasAvailableSlots}
              noSlots={!hasAvailableSlots}
              queued={isExecutiveUsed(executive.role)}
              sitOut={sitOutRoles.has(executive.role)}
              hasReactiveMeeting={reactiveRoles.has(executive.role)}
              meetingPreview={meetingPreviews[executive.role]}
              onSelect={() => send({ type: 'SELECT_EXECUTIVE', executive })}
              weeklySalary={roleSalaries[executive.role]}
              arOfficeStatus={arOfficeStatus}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (executivesError && executives.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="p-3 bg-negative/10 border border-negative/30 rounded-card mb-4">
          <p className="text-sm text-negative">Failed to load executives: {executivesError}</p>
          <p className="text-xs text-text-muted mt-1">Please refresh to try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isSoloScreen ? renderSoloView() : renderGridView()}

      {/* AUTO computing overlay */}
      {state.matches('autoSelecting') && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-app/70 backdrop-blur-lg">
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-neon-cyan" />
          <span className="text-text-body">AUTO is choosing meetings...</span>
        </div>
      )}

      {/* Meeting-relevance PR-3 (AUTO Option A): review AUTO's proposed picks
          before they commit. Execs that sat out never made it into autoOptions,
          so they never appear here. Renders as the console's modal overlay. */}
      {state.matches('reviewingAutoSelections') && (
        <AutoSelectReviewPanel
          options={context.autoOptions}
          onConfirmAll={() => send({ type: 'CONFIRM_AUTO_SELECT' })}
          onCancel={() => send({ type: 'CANCEL_AUTO_SELECT' })}
          onOverrideRow={(executive) => send({ type: 'OVERRIDE_AUTO_ROW', executive })}
        />
      )}

      {context.error && (
        <div className="mt-4 p-3 bg-negative/10 border border-negative/30 rounded-card">
          <p className="text-sm text-negative">{context.error}</p>
        </div>
      )}
    </div>
  );
}
