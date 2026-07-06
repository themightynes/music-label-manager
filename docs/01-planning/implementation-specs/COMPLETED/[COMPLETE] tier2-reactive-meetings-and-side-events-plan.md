# [COMPLETE] Tier 2 — Reactive Meetings + Side Events (+ mood disposition)

> **Status:** ✅ COMPLETE — **EXECUTED July 5, 2026 (same evening as the decision):** PR-1 #134 (dark launch), PR-2 #135 (reactive meetings live), playtest-gate fixes #136, PR-3 #138 (side events live server-side), PR-4 #139 (WeekSummary beat). Suite 1,334 → 1,440; golden master double-run zero deltas at every slice. **Execution deviations from this spec, all recorded in place:** (a) `data/events.json` has **12** events, not 13 (research-sweep miscount); (b) `tour_wrapped` dropped per §9 item 1's pre-decided fallback (no queryable completion week) — CEO reassigned to `chart_debut`; (c) `mood_crater` narrowed to discrete-event craters (§9 item 2 — drift/stress don't log `mood_events` rows); (d) **playtest round 1 (PR #136) corrected §1's uniform freshness window**: engine-stamped events (release_out/chart_debut/mood_crater) use `currentWeek` (they're stamped with the arrival week — `currentWeek` increments at the TOP of advanceWeek), only player-action events (recent_signing) use N−1; (e) the choice endpoint lives in server/routes/artists.ts beside its dialogue precedent; delayed-effect bank keys are deterministic week-based.
>
> **Decision record:** all six design forks decided by Nes (July 5, 2026, evening session): **A1, B1, C2, D1, E and F per recommendation**. **Spec APPROVED by Nes same evening with three amendments, all folded in below:** (1) an **urgency indicator** on the exec card when a reactive meeting is queued (PR-2 — closes the discoverability gap: under B1 a reaction the player never opens would evaporate invisibly; the dot converts reactive meetings from a lottery into a pull, without spoiling the reveal); (2) **mood_crater derivation-completeness verification added to PR-1** alongside tour_wrapped (does passive weekly drift write `mood_events` rows, or only discrete effect applications?); (3) a **named playtest gate after PR-2** (orchestrator pings Nes; he decides play-now vs. continue to MVP-2). Nes also confirmed: tour_wrapped fallback (a) with **chart_debut as the CEO's replacement trigger** (CMO = press blitz, CEO = "what does this mean for the label" — different registers; the per-(exec, trigger) lint rule permits cross-exec duplication), **lapse-no-effect confirmed**, threshold-at-PR-time confirmed, and the fixed priority order pinned now as the tie-break law future authoring inherits (near-moot in MVP-1, deliberately decided while nothing depends on it).
> **Decides:** PENDING-DECISIONS former §1 (Tier 2 + side-events) and former §5 (mood phases 6–10, folded into this call by Nes).
> **Related:** `COMPLETED/[COMPLETE] meeting-relevance-tier0-1-plan.md` (§5 slot-in guarantee this spec cashes in), `[FUTURE] executive-meeting-relevance-and-reactivity.md` (problem framing), `docs/98-research/INTERACTIVITY_GAP_ANALYSIS_2026-07-03.md` finding 1 (side events), `[IN-PROGRESS] artist-mood-plan.md` (phases 6–10), `[REFERENCE] executive-meetings-system-complete-reference.md` (as-built).

---

## 0. Architecture ground truth (constraints everything below obeys)

1. **Meeting selection is route-side** (`GET /api/roles/:roleId`, `server/routes/executives.ts`) — the Tier 2 injection stage stays route-side, so MVP-1 has **zero golden-master impact by construction**. Discipline: prove-untouched (GM suite run twice per slice, zero deltas; any delta root-caused per Ground Rule 5).
2. **The side-event weekly roll stays exactly where it is** (fork D1): the in-stream `ctx.getRandom(0,1)` draw at `shared/engine/game-engine.ts:967` is untouched — removing it would shift every downstream roll and force a full 10-scenario re-bless for zero player value. Event *selection* on a hit moves to an **isolated seed** per Ground Rule 4 (`seededRandom`-family, seed `${gameId}-week${week}-sideEvent`), closing ledger **C64** (unseeded `Math.random()` in `getRandomEvent`). GM fixtures pin `weekly_chance: 0`, so the new on-hit path is dark in the golden master; the draw itself is unchanged → expected GM delta ZERO (still proven by double-run).
3. **Side-event effects apply at choice-time**, outside the week transaction, per the dialogue precedent (`server/routes/artists.ts:99-131` applies `effects_immediate` via the ActionProcessor path). No engine effect application, no week-pipeline change.
4. **No save-shape change.** Side-event state (pending event, cooldown history) lives as **additive keys in `gameState.flags`** (an existing jsonb bag already inside the snapshot) → `SNAPSHOT_VERSION` unchanged.
5. **Every MVP-1 trigger must be derivable from persisted data with a week number** (fork A1 — stateless `deriveWeekHappenings`, no event queue). Verified sources: charts entries (week + debut/peak), `releases.releaseWeek`, `mood_events.week_occurred` (+ `mood_before`/`mood_after`), `artists.signedWeek`. **Open verification item (§9): tour completion week** — `projects` has `stage` and `dueWeek` but no confirmed completion-week stamp; PR-1 verifies whether tour metadata carries per-city reveal weeks. If not derivable, `tour_wrapped` drops out of MVP-1 (see §9) rather than forcing an engine write.

## 1. The happenings model (shared emission layer — fork A1)

New module `shared/engine/weekHappenings.ts`, the sibling of `meetingSelection.ts`/`deriveRelevanceState`:

- **Canonical const** `HAPPENING_TYPES` in `shared/types/gameTypes.ts` (same one-source pattern as `RELEVANCE_TAGS`); both Zod schemas (`shared/utils/dataLoader.ts`, `shared/api/contracts.ts`) derive from it.
- MVP-1 vocabulary (5, marquee triggers only):
  | Type | Meaning | Derivation source |
  |---|---|---|
  | `chart_debut` | a label song first charted last week | charts entries (week N−1, first appearance) |
  | `release_out` | a planned release went out last week | `releases.releaseWeek === N−1` |
  | `mood_crater` | an artist's mood crossed below the "low" band (≤ 20/40 boundary — exact threshold pinned at PR time from `data/balance/artists.json` mood bands) last week | `mood_events` rows at week N−1 where `mood_before`/`mood_after` straddle the boundary |
  | `recent_signing` | an artist signed last week | `artists.signedWeek === N−1` |
  | `tour_wrapped` | a tour completed last week | **conditional — §9 verification item** |
- `WeekHappening = { type, week, artistId?, artistName?, songId?, songTitle?, projectId?, releaseId? }` — enough context for the "why now" copy.
- `deriveWeekHappenings(input, currentWeek)` — pure function; **freshness window is exactly 1 week** (only things that happened at week N−1 count). Every trigger is a discrete once-event, so there is nothing to cool down and nothing to persist — no repeat-fire risk by construction. (Recurring signals like weekly chart *movement* are deliberately excluded from MVP; adding one later is what would force cooldowns.)

## 2. Reactive meetings — MVP-1 (fork B1: replace, don't add)

**Injection stage** in `shared/engine/meetingSelection.ts`, pre-draw (the Tier 0+1 plan's §5 slot-in, exactly as designed):
1. Filter the exec's pool to reactive meetings (`reactive_trigger` set) whose trigger matches a current happening AND whose `requires` tags are satisfied (relevance tags still apply — data-lint keeps reactive meetings honestly tagged).
2. If any match: pick by **fixed trigger priority** — `mood_crater > tour_wrapped > chart_debut > release_out > recent_signing` (crisis first, then celebration, then follow-ups); ties within a priority broken by seeded pick (existing seed).
3. The reactive meeting **replaces** that exec's weighted draw for the week. Max one reactive meeting per exec per week is inherent (one meeting per exec). No global cap — a big week firing several execs' reactive meetings reads as "everything is happening," which is the point; cap is a noted tuning lever if playtest disagrees.
4. No match → the existing Tier 0+1 filter → weigh → draw pipeline runs unchanged.

**Authoring** (`data/actions.json`): new optional `reactive_trigger` field (Zod: `z.enum(HAPPENING_TYPES).optional()`), ~5 new authored reactive meetings, one per exec (draft slate — final copy at PR time, voice per exec):
- `head_ar` × `recent_signing` — first-week plan for the new signing
- `cmo` × `chart_debut` — "we're on the board" press-blitz options
- `head_distribution` × `release_out` — first-week numbers response
- `cco` × `mood_crater` — creative intervention for a burning-out artist
- `ceo` × `tour_wrapped` — tour post-mortem, where to invest the momentum *(swaps to another CEO trigger if tour_wrapped drops per §9)*

**Data-lint additions** (`tests/engine/` sibling of the relevance-tag lint): every `reactive_trigger` value ∈ canonical enum; at most ONE reactive meeting per (exec, trigger) pair (else injection is ambiguous); reactive meetings must carry `requires` consistent with their trigger's implied state (e.g. `mood_crater` ⇒ `artist_signed`).

**Route + client**: the roles GET response gains an additive optional `reactiveContext: { trigger, artistName?, songTitle?, … }` on the selected meeting (Zod contracts additive). `MeetingSelector` renders the "why now" line ("Because *{songTitle}* debuted on the charts last week"); `AutoSelectReviewPanel` rows show the same line — AUTO's mechanics are otherwise untouched (fork B1 means no structural AUTO change; the review gate simply gets more worth reading).

**Urgency indicator (Nes amendment 1, PR-2)**: when an exec's selected meeting carries `reactiveContext`, their card in the Executive Suite shows a small urgency indicator — a dot/pulse, **not** the content (preserve the reveal; the "why now" line is the payoff on open). Zero new requests: `ExecutiveMeetings` already prefetches all five role GETs per (gameId, week) for the sit-out feature — the same prefetch data drives the dot. Without this, MVP-1's effective fire rate is (happening rate) × (chance the player opens that exec), and a playtest would under-read a working system. v2 tokens for the treatment (neon accent, not the locked/ghost chip language).

## 3. Side events surfaced — MVP-2 (forks C2 + D1)

- **Selection**: on the existing roll's hit, pick the event via isolated-seed weighted draw honoring the authored-but-dead config in `data/balance/events.json`: `event_weights` (by category), `event_cooldown` (weeks), `max_events_per_week` (1, inherent). **Authoring addition**: the 13 events in `data/events.json` have no `category` field today (verified — keys are `id, role_hint, prompt, choices`); MVP-2 adds `category` to each, mapping to the 7 `event_weights` keys, with a new data-lint rule (category ∈ weight keys; effect keys already linted).
- **State** (additive `gameState.flags` keys): `pending_side_event: { eventId, week }` set on hit; `side_event_history: { [eventId]: lastFiredWeek }` for cooldown. Set only on a hit → dark in GM fixtures → zero expected GM delta.
- **Presentation** (fork C2): a new beat in the staged WeekSummary reveal (the Phase 4 flow) — event card with the 3 authored choices, reusing the meeting-choice UI components and the `LIVE_EFFECT_KEYS`-whitelisted badge renderers (Slice A tooltips included).
- **Resolution**: choice POSTs to a new endpoint (`server/routes/` — `requireGameOwner`-guarded) that validates the pending event, applies `effects_immediate` at choice-time (ActionProcessor path, dialogue precedent), routes `effects_delayed` through the existing flags mechanism, logs mood events where `artist_mood` is touched, and clears the pending flag.
- **Lapse rule (CONFIRMED by Nes at spec approval)**: an unresolved pending event **lapses on the next advance** — cleared, no effects, "the moment passed." (Alternative — auto-resolve to a default choice — rejected as AUTO-for-drama; lapsing makes ignoring an event a real choice with a cost, which is on-theme.)
- Closes **C64**; ticks it in-slice.

## 4. Mood phases 6–10 disposition (fork E — resolves former PENDING-DECISIONS §5)

- **Phase 7 (mood event system): SUBSUMED** — `mood_crater` happenings + the CCO reactive meeting + the `artist_personal` side-event category ARE the mood event system. Phase 7 never ships separately.
- **Phase 6 (dialogue integration): spun off** — independent small slice (`artist_mood` keys in `dialogue.json`), any future session, not this arc.
- **Phase 9 (advanced factors): anticipated only** — archetype personality modifiers become future *happening-weight/threshold tuning* (e.g. a Volatile artist's crater threshold differs); the design leaves the knob location (balance JSON) but builds nothing.
- **Phases 8 + 10 (mood UI / analytics): stay deferred** pending player feedback, rationale unchanged.

## 5. Anticipated, not built

- **Success/failure rolls** (revival deferred mechanic): reactive meetings are their natural home ("push the charting single to radio — might break big"). **Reserved field name `stakes_roll` documented here; NOT added to Zod/schema until implemented** (no dead schema).
- **Mood-availability gates: ignored** — the sit-out rule already gives execs a presence/absence rhythm; gating execs by mood on top would punish twice.
- **A2 upgrade path**: if a future trigger isn't derivable from persisted data, `deriveWeekHappenings` consumers don't change — only the derivation grows a persisted-queue input.

## 6. Test plan

- Unit: `weekHappenings` derivation per trigger (incl. freshness-window edges and the mood-boundary straddle); injection priority + tie-break determinism; requires-still-respected on reactive meetings.
- Data-lint: new reactive-trigger suite (§2) + side-event category suite (§3).
- Characterization: extend `roles-meeting-selection.characterization.test.ts` (reactive injection over the real route harness); new side-event endpoint characterization (pending-validation, effect application, lapse).
- Client: why-now line (MeetingSelector + AutoSelectReviewPanel), WeekSummary event beat, machine untouched-paths pins.
- **Golden master: double-run, zero deltas, at every slice** (MVP-1 route-side by construction; MVP-2's engine touch is dark in fixtures — any delta root-caused per Ground Rule 5).

## 7. PR plan (factory pattern, one fresh subagent per slice, anti-stall guard in every prompt, orchestrator diff-review + gates before each merge)

| PR | Scope | Model |
|---|---|---|
| PR-1 | `weekHappenings.ts` + canonical enum + injection stage + route threading + Zod ×2 + data-lint + unit/characterization tests. **Dark launch** — no reactive meetings authored yet, injection never fires. Includes BOTH §9 verifications: tour_wrapped derivability (item 1) and mood_crater completeness (item 2). | Sonnet |
| PR-2 | 5 authored reactive meetings + `[REFERENCE]` doc sync + client why-now line (MeetingSelector + review panel) + **urgency indicator on exec cards** (Nes amendment 1) + client tests. Lights MVP-1 up. | Sonnet |
| **⏸ PLAYTEST GATE** | **After PR-2 merges, the orchestrator pings Nes: MVP-1 is playable. Nes decides play-now vs. continue** (Nes amendment 3 — MVP-1 and MVP-2 are separable systems; feedback on reactive meetings shouldn't wait on the side-event beat). PR-3 does not start until Nes answers. | — |
| PR-3 | Side-event seeded/weighted/cooldown selection + `category` authoring + flags persistence + choice endpoint + lapse + data-lint + C64 tick. | Opus (engine-adjacent) |
| PR-4 | WeekSummary event beat UI + client tests + live browser verification. | Sonnet |
| PR-5 | Wrap: docs pass (ledger, PENDING-DECISIONS, this doc → COMPLETED), then a **fresh-context adversarial verifier** incl. independent golden-master double-run. | Opus (verifier) |

Sequencing: PR-1 → PR-2 (MVP-1 shippable/playtestable here) → PR-3 → PR-4 → PR-5. One mutating agent in the tree at a time (serialized — per the July 5 collision lesson).

## 8. Docs plan

- `[REFERENCE] executive-meetings-system-complete-reference.md`: §1 pipeline gains the injection stage; new reactive-meetings section; maintenance note extended (reactive_trigger ↔ data-lint ↔ this rule).
- `[FUTURE] executive-meeting-relevance-and-reactivity.md`: header updated — Tier 2 decided/executed, doc becomes pure history.
- `[IN-PROGRESS] artist-mood-plan.md`: phases 6–10 dispositions recorded (7 subsumed → pointer here; 6 spun off; 9 anticipated; 8/10 deferred); doc likely graduates to COMPLETED-with-notes.
- PENDING-DECISIONS: §1 resolved → execution pointer; §5 deleted (resolved entries are deleted, not struck).
- Ledger: C64 ticked in PR-3.

## 9. Open items (resolutions decided at approval; verifications execute in PR-1)

1. **tour_wrapped derivability** (PR-1 verifies): if tour metadata lacks a queryable completion week, **fallback (a) is CONFIRMED by Nes** — drop `tour_wrapped` from MVP-1 (never option (b): "no engine writes in MVP-1" is the load-bearing property of this spec) and the CEO's replacement trigger is **`chart_debut`** (CEO register: "what does this mean for the label"; distinct from the CMO's press-blitz register; cross-exec trigger duplication is permitted by the per-(exec, trigger) lint rule).
2. **mood_crater derivation completeness** (PR-1 verifies — Nes amendment 2): the trigger reads `mood_events` rows at week N−1 straddling the boundary, which is complete only if EVERY mood-lowering path writes a row — including passive natural drift (`ArtistStateProcessor.calculateNaturalMoodDrift`), not just discrete effect applications. If drift mutates mood without logging, an artist can slide across the threshold invisibly and never trigger the CCO. Fallback logic mirrors item 1: verify the source; if incomplete, narrow the trigger (discrete-event craters only, documented) or derive from a mood snapshot comparison if one is queryable — never an engine write.
3. ~~Lapse rule~~ — **CONFIRMED: lapse-no-effect** (§3).
4. **Mood-crater threshold** — pinned from the authored mood bands at PR time (confirmed approach).
5. Final reactive-meeting copy (exec voice) — authored in PR-2, reviewed against the register of neighboring meetings.
