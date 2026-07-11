# [READY] Mandatory Side Events — "Crisis on the Desk"

**Status:** READY · **Branch:** `feat/mandatory-side-events` · **Author:** engine/gameplay
**Config kill-switch:** `data/balance/events.json → mandatory_side_events.enabled` (default `true`)

## Problem / product intent

Today a side event rolls in-stream (seeded ~20% weekly, `game-engine.ts` `checkForEvents` — the C64 RNG discipline) and surfaces as an **interactive choice beat inside WeekSummary**. Playtest verdict: resolving a world crisis as a throwaway modal button "makes it feel less like an OH MY." A label crisis should eat real management bandwidth.

**Decision:** the rolled event becomes **mandatory** and **consumes one focus slot in the following week**. The player cannot advance until they pick how to handle it; the chosen effects apply *during* that week's advance, and the WeekSummary reports "You spent the week handling: `<event>`."

## Design (final)

1. **The roll is untouched.** Same RNG position, same seed, byte-identical stream. `checkForEvents` still draws `getRandom(0,1) < weekly_chance` at the exact same point, and `selectSideEvent` still runs on its isolated seed. Zero drift in *when/which* events roll.
2. **Deferred landing.** The rolled event is stored as `flags.pending_side_event` on the gameState spine (the field already exists). In mandatory mode we store a **richer payload** `{ eventId, week, prompt, category, choices }` so the next week's crisis card can render fully **after a reload** with no extra fetch. `flags` is a `jsonb` column persisted verbatim; the save snapshot's inner `gameState` schema is `.passthrough()` and `flags` is `z.record(z.any())` — additive, so **`SNAPSHOT_VERSION` stays at 2** (evidence: `shared/schema.ts` `gameSaveSnapshotSchema` lines ~538/541/559; restore rejects only on version mismatch, `saveService.ts loadRestoreSnapshot`).
3. **Slot occupation.** The next week's action-selection UI shows the pending event as a **crisis card occupying ONE focus slot**, mirroring the `arOfficeSlotUsed` precedent — the slot is folded into the effective `usedFocusSlots` so the machine's `slotsRemaining`/`hasFocusSlots` and the manual/AUTO UI all see the reduced count. Mandatory: **no dismissal**.
4. **Advance gating.** ADVANCE WEEK is blocked until a choice is picked — **client-side** (button disabled + reason) **and server-side** (`advanceWeekService` throws `AdvanceWeekConflictError(400, { error: 'PENDING_SIDE_EVENT' })`, mapped by the existing `gameLoop.ts` catch — mirrors the C58 stale-week guard).
5. **Resolution timing.** The choice travels **with the advance request** as an optional `sideEventChoice: { eventId, choiceId }` on `AdvanceWeekRequest` (mirrors `expectedCurrentWeek`). The engine applies it **during that advance, queued like a weekly action**: `effects_immediate` through `ActionProcessor.applyEffects` (global scope → all signed artists, mood_events logged via `applyArtistChangesToDatabase`); `effects_delayed` banked on `flags` with `triggerWeek = currentWeek + 1` (drains next advance, exactly like meeting/dialogue delayed effects). `pending_side_event` is cleared.
6. **One crisis at a time.** If the roll fires while one is already pending, the draws still happen (stream discipline — `getRandom` + `selectSideEvent` both run) but the **result is discarded** (no overwrite of the pending event, no `summary.events` push, no history stamp for the discarded pick). In practice the advance gate makes this unreachable in mandatory mode, but it is defensive and keeps the stream identical.
7. **AUTO integration.** The crisis slot is folded into `focusSlots.used` fed to `ExecutiveMeetings`, so `SYNC_SLOTS → slotsRemaining` and `selectTopOptions(availableSlots)` propose one fewer action — the same threading `arOfficeSlotUsed` uses.
8. **WeekSummary beat.** Resolution renders as its own notable beat ("You spent the week handling: `<event>`" + chosen label + effects), emitted by the engine into `summary.events` as `{ resolved: true, ... }`. In mandatory mode the **old in-results interactive beat is suppressed** for a freshly-pending event (that event is now handled by next week's crisis card). One behavior at a time.
9. **Config kill-switch.** `mandatory_side_events { enabled: true }` in `data/balance/events.json`. When `false`, the legacy in-results interactive path is fully restored (engine lapses the pending event, WeekSummary shows the interactive `SideEventBeat`, resolution via `POST /side-event-choice`). Both paths compile and are tested.
10. **Crisis-card fiction.** Urgent, in-world tone ("Landed on your desk: …"), v2 tokens (`neon-magenta`/`negative` accents, `.glass-panel`), visually distinct from exec meeting cards — this is the world happening to *you*, not an exec's agenda. Realism: crises eat bandwidth; that is *why* it costs a slot.

## Data / persistence

- **`flags.pending_side_event`** (spine `jsonb`): legacy shape `{ eventId, week }`; mandatory shape `{ eventId, week, prompt, category, choices }`. Endpoint + `checkForEvents` read only `eventId`/`week`, so the extra fields are inert for the legacy path.
- **Client flag delivery:** `GET /api/config/side-events → { mandatory: boolean }` (public-ish, auth via existing middleware), consumed by `useSideEventsConfig()` (TanStack Query, `staleTime: Infinity`). The client branches crisis-card-vs-legacy-beat on it.
- **Client session state:** `pendingSideEventChoice: { eventId, choiceId } | null` in the Zustand store (persisted via `partialize`, like `selectedActions`); included in the advance payload and cleared after a successful advance.

## Golden-master policy

Roll position unchanged. The GM harness stubs `weekly_chance: 0` so **no side event fires in any existing fixture** → zero drift. A new **additive** fixture (`sideEventMandatory`) overrides `getEventConfigSync`/`getAllEvents`/`getSideEventsConfigSync`/`getMandatorySideEventsConfigSync` to force one event and a resolution, capturing the deferred pending flag and the resolution delta. Existing snapshots stay byte-identical; audited double-run.

## Edge cases (all tested)

- Week 1 / nothing pending → advance ungated, no crisis card.
- Save/load with a pending event → round-trips (richer flag passthrough).
- Campaign end (week 52) with an unresolved pending event → resolution still applies during the final advance; end screen not bricked.
- AUTO-confirm with a pending crisis → proposes one fewer action.
- Meeting-selection server gate sees the reduced slot count (`executives.ts` effective-total −1 while pending in mandatory mode).

## Change surface

- `data/balance/events.json`, `data/balance.ts`, `shared/utils/dataLoader.ts` — config block + passthrough.
- `server/data/gameData.ts` — `getMandatorySideEventsConfigSync()`.
- `shared/engine/game-engine.ts` — mandatory branch in `checkForEvents`; `processPendingSideEventResolution`; `advanceWeek` options param.
- `shared/api/contracts.ts` — `sideEventChoice` on `AdvanceWeekRequest`.
- `server/services/advanceWeekService.ts` — gate + thread the choice.
- `server/routes/gameLoop.ts`, `server/routes/games.ts` (config endpoint), `server/routes/executives.ts` (slot gate).
- `client/` — `useSideEventsConfig`, store field, `CrisisCard`, `SelectionSummary`, `ExecutiveSuitePage`, `GameHeader`, `WeekSummary`.
- Tests + docs (systems map, Label Head's Guide).
