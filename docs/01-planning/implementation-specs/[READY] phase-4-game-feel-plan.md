# [READY] Phase 4: Game Feel — The Week-Advance Moment and the Juice Pass

*Created: July 3, 2026 — planned from a two-agent exploration of the live tree (no code modified).*
*Status: IN PROGRESS — PRs 1–2 merged 2026-07-03.*
*Part of the scaling arc (Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · Phase 3.5 in flight · **Phase 4: game feel**).*

## Execution status

- **PR-1 ✅ MERGED** — #100 (`89d3f89`): `AnimatedNumber` primitive + MetricsDashboard net-income adoption; 8 new jsdom tests, client suite 75/75.
- **PR-2 ✅ MERGED** — #102 (`d177cd8`): `shared/utils/changeImportance.ts` classifier (exhaustive over all 19 `GameChange` types, `assertNever` compile guard); optional additive `importance` on `GameChange`/`ChartUpdate`; single engine call site at WeekSummary assembly. Golden-master diff audited: 67 added lines, all `importance`, zero deletions (26 hero / 12 notable / 29 routine); run-twice stable. 30 classifier unit tests.
- **PR-3..5, 7** — gated on Phase 3.5 (in flight, separate session).
- **PR-6 (sound)** — asset gate CLEARED 2026-07-03: 6 stings generated via ElevenLabs (user-auditioned favorites), landed in `client/public/audio/` with `CREDITS.md` provenance. PR-6 implementation (audio manager + settings + wiring) can start any time.

## 0. Ground truth (verified against the working tree)

Line numbers are from the tree at planning time (post-PR #97 v2 redesign).

### The flat moment (the problem)

- **Trigger**: "Advance Week" lives in `GameHeader.tsx:154-166`. Between click and results the ONLY feedback is the button flipping to "Processing…" with `disabled:opacity-50` — no spinner, no transition, nothing on the page (`gameStore.ts:782` sets `isAdvancingWeek`, `:893` clears it after the POST + full bundle refetch).
- **Results**: `WeekSummary.tsx` is a static three-tab modal (Overview / Charts / Projects). Everything renders at once — no reveal order, no staging, no animation. The modal appears with zero transition (`Dashboard.tsx:31-42` auto-shows it).
- **No importance hierarchy**: `WeekSummary.tsx:118-145` categorizes changes by *type* but never by *significance*. A No. 1 chart debut renders with the same visual weight as a routine mood shift. `GameChange` (`shared/types/gameTypes.ts:334-349`) and `ChartUpdate` carry no `importance`/`priority` field.
- **Tier unlocks are missable**: they surface only as sequential toasts (`utils/unlockToasts.tsx`, 3.5s + 250ms gap) — a player reading the modal misses them entirely; they are not represented in the modal's reveal.
- **Rich payload already exists**: `WeekSummary` (`gameTypes.ts:471-510`) carries `revenueBreakdown`, `expenseBreakdown`, `chartUpdates`, `artistChanges`, `pressMentions`, `reputationChanges` — the raw material for a staged reveal is already client-side.

### The toolkit (already in the stack — Phase 4 is composition, not installation)

- **Motion**: `motion` v12.23.22 + legacy `framer-motion` v11.13.1 in package.json. Three built primitives in `client/src/components/motion-primitives/`: `BorderTrail`, `GlowEffect` (5 modes), `TextScramble`. Used today in `Dashboard.tsx` and `DialogueInterface.tsx`.
- **v2 design-system animation language** (`docs/04-frontend/design/v2/design-system-v2.md` §5; `index.css:157-180`; `tailwind.config.ts:252-286`): `ds-spin` (14s), `ds-shimmer` (6s), `ds-bloom` (52s), `ds-grain`, `ds-ring`, plus `.shimmer-bar`, `.text-aberration`, `.glass-panel`, `.hud-ticks`, backdrop stack.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` already disables all keyframes (`index.css:361-373`). Phase 4 must extend this contract to JS-driven sequences.
- **Sequencing precedent**: `ToastNotification.tsx:194-315` already staggers notifications 1.5s apart (projects → revenue → achievements → mood → summary) — the only staging pattern in the app today.
- **XState**: three clean injected-service machines (`executiveMeetingMachine`, `artistDialogueMachine`, `arOfficeMachine`); none orchestrate animation. A reveal sequence can be a small dedicated machine or a plain timeline — decide in PR-3, don't force XState.
- **HoloDisc**: `ui/holo-disc.tsx`, the spinning brand mark in the dock — an ambient feedback surface nothing uses for events yet.
- **Missing entirely**: animated count-ups (none anywhere), particles/confetti, and **sound** (zero audio code, zero audio deps — the game is currently silent).

## 1. Design principles (cross-cutting, enforced in every PR)

1. **Skippable, always.** Any staged sequence collapses to its final state on one click/keypress. Repeat players must never wait for theater. A "skip animations" toggle persists in settings.
2. **Reduced motion = instant render.** `prefers-reduced-motion` (and the manual toggle) bypasses staging, count-ups, and particles — final values render immediately. Sound has its own independent toggle (motion preference does not imply sound preference).
3. **Hierarchy before spectacle.** The importance ranking (PR-2) drives everything: hero moments get the fanfare; routine changes stay quiet. Juice without hierarchy is noise.
4. **Engine determinism is untouchable.** Nothing in this phase may consume the seeded RNG stream or reorder engine writes. The one engine-adjacent change (the `importance` field) is a pure, deterministic classification applied at summary-assembly time; golden master changes must be additive-field-only.
5. **No gameplay changes.** Same numbers, same outcomes, same data — only how they are *presented*.

## 2. Dependency on Phase 3.5

Phase 3.5 (in flight, separate session: `[READY] phase-3.5-gamestate-tanstack-plan.md`) is rewriting how ~30 client files read `gameState` — `WeekSummary`, `Dashboard`, `GameHeader`, and `CommandDock` are all in its blast radius.

- **Safe to start now (no collision)**: PR-1 (new primitive), PR-2 (shared/engine + pure ranker), PR-6 (sound foundation, new files + settings).
- **Gated on Phase 3.5 landing**: PR-3 (staged reveal — rewrites `WeekSummary` internals), PR-4 (touches `GameHeader`/`CommandDock`), PR-5, PR-7. If Phase 3.5 stalls, re-baseline these PRs against whatever merged.

## 3. PR sequence (7 PRs)

| # | PR | Scope & files | Risk | Verification / "green" |
|---|---|---|---|---|
| 1 | **feat: `AnimatedNumber` primitive** | New `client/src/components/motion-primitives/animated-number.tsx`: spring/tween count-up on value change via `motion`; props for format (`formatMoney` reuse), duration, `skipAnimation`. Honors reduced-motion + the global skip toggle (renders final value statically). No consumers changed yet beyond one low-risk adoption (MetricsDashboard net-income) to prove it live. | Low | Unit tests (jsdom): renders final value, respects skip/reduced-motion, no NaN on undefined→number transitions. `tsc` + suite green. |
| 2 | **feat: change-importance classification (`hero` / `notable` / `routine`)** | New pure classifier in `shared/utils/changeImportance.ts`: `classifyChange(change, context)` → e.g. No. 1 debut / first chart entry / tier unlock / campaign completion = `hero`; top-10 movement, release week, project complete = `notable`; routine mood/expense = `routine`. Engine applies it once at WeekSummary assembly so `GameChange`/`ChartUpdate` gain an **optional additive** `importance` field server-side (persisted in `weeklyOutcome`, available to saves). Deterministic, no RNG. | Medium | Exhaustive unit tests on the classifier (every `GameChange['type']` + chart edge cases). Golden master: snapshots change by the additive field ONLY — regenerate and diff-review (precedent: `pressMentions` in C45). No `SNAPSHOT_VERSION` bump (optional field). |
| 3 | **feat: staged WeekSummary reveal (the centerpiece)** | Rebuild the Overview tab's entry as an orchestrated sequence driven by PR-2's ranking: (1) net income hero with `AnimatedNumber` count-up → (2) revenue sources → (3) hero moments (chart debuts, unlocks — **moved into the modal**, fixing the missable-toast gap) → (4) notable changes → (5) routine (mood etc.). Modal itself gains an entrance transition. Charts/Projects tabs stay static. Sequence state via a small timeline hook or dedicated machine (implementer's call; keep it dumb). Click-anywhere skips to final state. `triggerUnlockToasts` demoted to a fallback for out-of-modal contexts or deleted if fully redundant. Files: `WeekSummary.tsx`, `Dashboard.tsx`, `CommandDock.tsx` (modal shells), `utils/unlockToasts.tsx`. | High | Component tests: final rendered content identical to pre-PR (characterization: same data → same visible facts, only timing differs); skip works; reduced-motion renders instantly. Manual smoke: advance several weeks incl. a release week and a tier unlock. **Gated on Phase 3.5 + PRs 1–2.** |
| 4 | **feat: anticipation beat (click → results)** | The processing gap becomes a moment: advance button gets a charging/shimmer treatment while `isAdvancingWeek`; a brief week-transition interstitial (shimmer sweep + holo-disc spin-up, capped ~800ms, skipped under reduced motion) bridges into the reveal so fast responses don't flash. Files: `GameHeader.tsx`, possibly a tiny `WeekTransition` component. | Medium | Manual smoke on slow + fast network (throttle); reduced-motion path instant; button still disabled correctly (existing behavior pinned by eye + component test). |
| 5 | **feat: celebration tier for hero moments** | Distinct fanfare for `hero` events inside the reveal: `text-aberration` + `GlowEffect` on No. 1 debuts, tier-unlock badges animate locked→unlocked (spec §6 ghost-chip → gradient+glow), lightweight particle burst (small self-built canvas/SVG emitter — no new dep unless trivially justified) for campaign completion + first No. 1. `CampaignResultsModal` gets the staged treatment (score count-up, staggered breakdown). Files: `WeekSummary.tsx` (hero renderer), `CampaignResultsModal.tsx`, new `motion-primitives/particle-burst.tsx`. | Medium | Component tests for conditional fanfare (hero-only); reduced-motion/skip static; manual smoke of a No. 1 week + campaign end (dev tools can force). |
| 6 | **feat: sound foundation + first stings** | The game gains audio, off-to-on. New `client/src/lib/audio.ts` manager (plain `HTMLAudioElement`/Web Audio, no heavy dep; add `howler` only if measurable need): preload, play-by-key, master mute + volume, **persisted setting, default ON at low volume** (decide default in PR review), fully independent of motion toggles. First stings: week-advance whoosh, hero fanfare, tier unlock, campaign end (4–6 assets max). ⚠️ **Asset sourcing needs a user decision: licensed pack vs. generated vs. commissioned** — flag before implementation. Files: new `lib/audio.ts`, settings UI hook-in, `public/audio/*`. | Medium | Unit tests for the manager (mute, volume, missing-asset no-throw). Manual smoke: sounds fire on the right events, mute persists across reload, NO autoplay-policy console errors on first load (audio unlocks on first user gesture). |
| 7 | **feat: ambient feedback (HoloDisc pulse + small delights)** | HoloDisc pulses (`ds-ring`-style) when a hero/notable event lands; subtle dock acknowledgment on action selection. Deliberately last — pure garnish. Files: `ui/holo-disc.tsx`, `CommandDock.tsx`. | Low | Visual smoke; reduced-motion static; no layout shift. |

**Ordering**: 1 → 2 → (wait for 3.5) → 3 → 4 → 5 → 7, with 6 running parallel any time after its asset decision. 1, 2, 6 are mutually independent.

## 4. Acceptance criteria (phase-level, testable)

1. **The week-advance moment is staged.** Advancing a week produces: anticipation state → transition → ordered reveal (hero → notable → routine) with count-ups. No information regression: everything visible pre-phase is still visible post-phase.
2. **Hierarchy is data, not vibes.** Every `GameChange`/`ChartUpdate` in a `WeekSummary` carries `importance`, assigned by one shared, unit-tested, deterministic classifier.
3. **Tier unlocks are unmissable.** They appear in the modal reveal itself (hero treatment); the toast-only gap is closed.
4. **Skippability & accessibility.** One interaction collapses any sequence; `prefers-reduced-motion` AND a manual settings toggle yield instant static rendering; sound has an independent persisted mute/volume. All three verified by tests.
5. **Determinism preserved.** Golden master diffs across the phase are additive-field-only (`importance`); run-twice stability still passes; no new RNG consumption.
6. **Sound exists and behaves.** ≥4 stings wired to hero moments; mute persists; no autoplay-policy violations.
7. **Suite green throughout**: `npm run check` + `npm run test:run` (Docker DB on 5433) after every PR; CI vitest + Playwright green.

## 5. Non-goals

- **No gameplay/balance changes** — same numbers, same outcomes.
- **No visual redesign** — this builds ON v2 ("Neo-Cyber HUD"), using its motion vocabulary; no new color tokens or layout systems.
- **No server behavior changes beyond the additive `importance` field** (PR-2). No new endpoints.
- **No music/soundtrack** — stings only; a score is a future product decision.
- **No roadmap-v3 UX items** (batch operations, smart defaults, filtering) — that doc's "Phase 4" is a different, older list; this plan supersedes the name collision for the scaling arc.
- **No `SNAPSHOT_VERSION` bump** — all payload changes are optional/additive.

## 6. Honest risk notes

- **Phase 3.5 collision is the top scheduling risk.** PRs 3–5, 7 touch files 3.5 is rewriting. Do not start PR-3 until 3.5's WeekSummary-adjacent PRs merge; re-verify line refs then.
- **Taste risk.** Animation quality is subjective and easy to overdo. Mitigation: cap total mandatory reveal time (~4s worst case before skip), review each PR live in the preview (not just tests), and treat "annoying on the 30th week" as a blocking review criterion.
- **Golden-master churn (PR-2).** Adding a field to every change object touches every snapshot. Regenerate once, diff-review that ONLY the new field appears (the C45 `pressMentions` precedent shows this is safe when disciplined).
- **Autoplay policies (PR-6).** Browsers block audio before first user gesture; the manager must queue/unlock on first interaction and never throw. Test in a fresh incognito profile.
- **Asset licensing (PR-6).** Sound assets need a provenance decision from the user before the PR starts — do not ship unlicensed audio.
- **jsdom can't see animation.** Tests can assert states (skipped/final/reduced-motion) but not motion quality; every animation PR needs a manual preview pass as part of its definition of done.

## Critical files

- `client/src/components/WeekSummary.tsx` — the centerpiece rewrite (PR-3)
- `client/src/components/GameHeader.tsx:154-166` — advance-week trigger (PR-4)
- `shared/types/gameTypes.ts:334-349, 471-510` — `GameChange` / `WeekSummary` shapes (PR-2)
- `client/src/components/motion-primitives/` — where `AnimatedNumber` + `ParticleBurst` join `BorderTrail`/`GlowEffect`/`TextScramble`
- `client/src/utils/unlockToasts.tsx` — absorbed into the modal reveal (PR-3)
- `docs/04-frontend/design/v2/design-system-v2.md` §5 — the motion vocabulary to compose from
- `tests/features/golden-master*` — the determinism net PR-2 must respect
