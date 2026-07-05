# [READY] Executive Meeting Relevance — Tier 0+1 Implementation Plan

**Date**: July 5, 2026
**Status**: READY — checkpoint passed July 5, 2026: Nes approved the spec **including the empty-pool sit-out rule** (§1) and chose **AUTO Option A (propose-then-confirm)** for §6/PR-3.
**Decision recorded**: Nes chose **Tier 0+1 as one planned slice** (July 5, 2026); Tier 2 (event-driven meetings) stays deferred, to be designed **jointly with the side-events system** — recorded in `docs/01-planning/PENDING-DECISIONS.md`.
**Problem statement / fork analysis** (not repeated here): `[FUTURE] executive-meeting-relevance-and-reactivity.md`. Sibling: `[FUTURE] executive-meeting-effect-legibility.md`.
**As-built ground truth**: `REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md` §1.

---

## 0. Architecture correction that reshapes the plan

The `[FUTURE]` doc warned "expect golden-master deltas" — **conditionally**, "if it runs in the advance-week engine path." Close reading of the as-built code says it does not:

**Meeting selection lives in `server/routes/executives.ts:41-48`** — `GET /api/roles/:roleId` picks one meeting per exec per week via `seededRandomPick(roleMeetings, generateMeetingSeed(gameId, week, roleId))` (`shared/utils/seededRandom.ts`). This is a stateless GET route, fully outside `advanceWeek`. The golden-master harness (`tests/engine/golden-master-advance-week.test.ts`) seeds its chosen actions directly into fixtures — it never calls the roles route.

**Consequence: the expected golden-master delta for Tier 0+1 is ZERO.** The filter and weighting change which meeting is *offered*, not how a chosen meeting is *processed*. `ActionProcessor.processRoleMeeting` sees the same inputs it always saw. This flips the golden-master plan from "re-bless and root-cause" to "prove untouched" (§7), and it means the selection change is far lower-risk than the fork analysis assumed.

Determinism is also already isolated: the route's RNG is string-seeded per `(gameId, week, roleId)` and never touches the engine's seeded stream — Ground Rule 4 of the revival plan is satisfied by construction, and Tier 1's weighted pick reuses the same seed.

---

## 1. Tag vocabulary (Tier 0)

### Design principles
- **Generalize `target_scope`, don't parallel it.** The 5 `user_selected`/`predetermined` meetings already implicitly require a signed artist (they resolve/prompt for one). Tier 0 makes that contract explicit; the engine's existing `target_scope` handling (`ActionProcessor.ts:248+`) is untouched.
- **`requires` = array of tag enums, AND semantics, absent/empty = always eligible.** No OR — each meeting gets the single honest *minimum* set. OR semantics are complexity we don't need for 20 meetings.
- **Don't duplicate `category`/`role_id`** — those are Tier 1's weighting axes (§2).
- **Tags must be honest to the meeting's authored content**, not to what would be convenient for pool coverage.

### The six tags and their state predicates

| Tag | True when | Server predicate (all exist today) |
|---|---|---|
| `artist_signed` | ≥1 signed artist | `getArtistsByGame(gameId).length > 0` |
| `music_exists` | ≥1 recorded song | `getSongsByGame(gameId)` non-empty (recorded flag) |
| `release_planned` | ≥1 scheduled future release | `getPlannedReleases(gameId, week)` non-empty |
| `release_out` | ≥1 released release/song | `getReleasesByGame(gameId)` any released |
| `recording_project_active` | ≥1 project in an active recording stage | `getProjectsByGame(gameId)` stage filter |
| `tour_active` | ≥1 booked tour not yet completed | `getProjectsByGame(gameId)` type=tour + the `tourHelpers.ts` city-count logic (C51's shared helper — reuse, don't re-derive) |

Exact stage/flag names for the predicates get pinned during PR-1 against `shared/schema.ts` + `tourHelpers.ts`; the vocabulary itself is fixed here.

### The catalog, close-read (all 20)

| Meeting | Tags | Notes |
|---|---|---|
| `ceo_priorities` | *(none, after rewrite)* | ⚠️ **Rewrite candidate**: "we can only push two **tracks**" implies existing music. Minimal copy change (e.g. "two initiatives") makes it honestly state-agnostic → becomes the CEO pool's always-eligible floor. Mechanics/choices unchanged. Overlaps C70's copy territory — fix together where touched. |
| `ceo_crisis` | `artist_signed`, `tour_active` | "Your biggest artist… the tour starts in two weeks" — the playtest's exact complaint; both tags required. |
| `ceo_expansion` | `artist_signed` | "Three festivals want your act." Festival itself is flavor; no festival system to check. |
| `ar_single_choice` | `artist_signed` | Formalizes `user_selected`'s implicit contract. |
| `ar_discovery` | *(none)* | "I found our next superstar" — works from week 1. A&R's floor. |
| `ar_genre_shift` | `artist_signed` | ⚠️ Copy says "our guitar **bands**" (plural, genre-specific) — honest minimum is one artist; the genre-specificity is a content-honesty wart. **Log as new C-number**, don't block. |
| `cco_timeline` | `recording_project_active` | "Timeline is tight" — production context. |
| `cco_creative_clash` | `artist_signed` | ⚠️ Content says the chosen artist "wants to record everything live" — but the *selected* artist may not be recording. Strict tag would be `+recording_project_active`, yet the artist picker doesn't restrict to recording artists. Tag the honest minimum, log the looseness with the C-number above. |
| `cco_budget_crisis` | `recording_project_active` | "Over budget and the vocals aren't right." |
| `action_1760807005433` | `artist_signed` | Custom CCO meeting (non-standard ID already flagged in the reference doc §9). |
| `cmo_pr_angle` | *(none)* | Generic cycle-angle strategy. CMO's floor. |
| `cmo_scandal` | `artist_signed` | "Your artist leaving a rival's studio." |
| `cmo_awards` | `release_out` | "Campaign for the album" — needs released music. |
| `cmo_viral` | `release_out` | "Fan remix of your single is going viral." |
| `cmo_platform_exclusive` | `release_planned` | "Exclusive window for the **new** album." |
| `distribution_pitch` | `music_exists` | "Which track… for editorial pitch" — needs a recorded track (pitching is typically pre-release, so not `release_out`). |
| `distribution_politics` | `music_exists` | "Considering our track." |
| `distribution_algorithm` | `release_out` | "Game 10M streams" — needs music on platforms. |
| `distribution_tour_scale` | `artist_signed` | Tour *planning* — deliberately does NOT require `tour_active` (the meeting is how a tour idea starts; requiring one would invert causality). |
| `distribution_supply` | `release_planned` | "Vinyl… for this release." |

### The empty-pool finding (the one real design consequence)

After honest tagging, **CCO and Distribution have no requirement-free meeting**: at week 1 (no artists, no music) their filtered pools are EMPTY. Week-1 eligible meetings are exactly `ceo_priorities`, `ar_discovery`, `cmo_pr_angle` — three meetings for three focus slots.

**Proposed rule: an exec with an empty eligible pool sits out the week.** The route returns `meetings: []`; the exec card renders a "nothing needs your call this week" state; AUTO skips them. This is presented as a *feature*, not a fallback: it is the honest answer (week 1, Head of Distribution genuinely has no business to discuss), it produces a progressive-disclosure arc (executives come online as the label grows), and it requires zero new content. The alternative — falling back to the unfiltered pool — reintroduces exactly the fake meetings Tier 0 exists to kill.

Risks owned: early-game meeting variety shrinks (mitigation: week-1 supply exactly matches slot demand; playtest verdict decides whether to author new requirement-free CCO/Distribution meetings later — that's content, not mechanism); the client needs a real empty-state UI (scoped into PR-1).

**Data-lint extensions** (same suite pattern as `data-lint-effect-keys.test.ts`): every `requires` value ∈ the canonical enum; every role retains ≥1 meeting eligible under *full* label state (catches a tag typo bricking a pool); the 5 `user_selected`/`predetermined` meetings all carry `artist_signed` (the formalized contract).

---

## 2. Tier 1 — state-weighted selection

### Where it sits
Same route, same seed. Selection becomes a **pure shared function** so server, tests, and (later) Tier 2 share one implementation:

```
shared/engine/meetingSelection.ts (new)
  deriveRelevanceState(artists, projects, releases, songs, week) → MeetingRelevanceState
  filterEligible(pool, state) → Meeting[]                        // Tier 0
  weighMeetings(eligible, state, tuning) → number[]              // Tier 1
  selectWeeklyMeeting(pool, state, seed, tuning) → Meeting | null
```

The route composes: query state (4 storage reads) → `deriveRelevanceState` → `selectWeeklyMeeting`. `MeetingRelevanceState` is a plain snapshot type with room for Tier 2's event flags later (§5).

### Weighting formula
Base weight `1.0` per eligible meeting; multiply by `relevance_weight` once per matching **situation → category** signal:

| Situation signal (from state) | Boosted `category` |
|---|---|
| `tour_active` | `live` |
| `release_planned` within `recency_window_weeks` | `marketing`, `distribution` |
| `recording_project_active` | `production` |
| artist signed within `recency_window_weeks` | `talent` |

Then `seededWeightedPick(items, weights, seed)` — new util in `shared/utils/seededRandom.ts` beside `seededRandomPick`, same string-seed mechanism (cumulative-weight walk over one `seededRandom(seed)` draw; deterministic, engine-stream-isolated by construction).

**Tuning values**: `relevance_weight: 2.0`, `recency_window_weeks: 4`, in a new `weekly_meeting_selection` block in `data/balance/progression.json` (house pattern: balance JSON, HARDCODED fallback constants annotated at the read site). Rationale for 2.0: with a 5-meeting pool and one boosted meeting, 2.0 moves its pick probability from 20% → ~33% — noticeable attention, not a script. It must stay a *bias*: at ≥4–5× the boosted topic becomes near-certain and weekly variety dies. Start at 2.0, tune from playtest.

### Degenerate cases
- **Empty eligible pool** → exec sits out (§1). `selectWeeklyMeeting` returns `null`; route returns `meetings: []`.
- **No signals firing** (early/quiet weeks) → all weights 1.0 → exact Tier 0 uniform behavior. Tier 1 degrades to Tier 0 gracefully.
- **All eligible meetings boosted equally** → uniform again (weights normalize out).
- **Min-max angle**: a player could hold state (e.g. keep a tour running) to farm a category. Low risk — weighting only biases *topics*; payoffs stay non-dominant per the revival's balance tests. Accepted; note for playtest.
- **Mid-week state change** (e.g. artist signed mid-week): the pool is derived from live state, so a refetch could swap an already-seen meeting. Mitigation: client caches the role response per `(gameId, week, roleId)` with no mid-week refetch (verify existing TanStack cache config in PR-1; add `staleTime: Infinity` on that key if absent). Residual server-side statelessness accepted — same as today's behavior when `actions.json` changes mid-session.

---

## 3. Data-shape compliance

- `requires?: RelevanceTag[]` added in **both** Zod surfaces: `shared/utils/dataLoader.ts:322` (weekly_actions schema) and `shared/api/contracts.ts:379` (`WeeklyActionSchema`), plus the TS type in `shared/types/gameTypes.ts:46` — optional, so absent = always eligible and existing consumers are unaffected.
- `tests/engine/data-lint-effect-keys.test.ts` stays green (additive field, no effect-key changes); new lint assertions per §1 live in a sibling `data-lint-relevance-tags.test.ts` mirroring its pattern.
- `actions.json` shape change ⇒ the standing CLAUDE.md rule fires: update `[REFERENCE] executive-meetings-system-complete-reference.md` §1 (selection mechanism) in the same PR.

---

## 4. Golden-master plan (inverted by §0)

- **Expectation: zero engine golden-master delta.** No engine file changes in PR-1/PR-2 (new `meetingSelection.ts` is new code; `ActionProcessor` untouched).
- **Discipline (Ground Rule 5, applied as "prove untouched")**: before and after each slice, run the golden-master suite twice consecutively — all green, zero snapshot updates on the second run (the harness header's stability contract). Any delta is a **regression to root-cause, not a re-bless**. The Email Narrative re-bless (`c86f707`, PR #120) remains the worked example if an unexpected delta must be root-caused field-by-field.
- **Route surface**: `route-manifest.test.ts.snap` unchanged (no new routes, no signature change — same path + query params). New route behavior gets its own seeded characterization test (fixture game in known states → assert offered meeting set), not a golden-master entry.
- If any slice unexpectedly needs an engine touch, that slice STOPS and the re-bless is planned explicitly first.

---

## 5. Tier 2 slot-in guarantee

Tier 2 (event-driven, deferred) plugs in without rework because selection is now a staged pure pipeline: **pool → eligibility filter → weighting → draw**. Tier 2 becomes a stage *before* the draw — an event queue can inject or force a reactive meeting, falling through to Tier 0+1 behavior when no event fires. `MeetingRelevanceState` is the shared state snapshot Tier 2 extends with event flags. Tier 2's event model must be designed jointly with the side-events system (`events.json` is key-clean; per PENDING-DECISIONS).

---

## 6. AUTO companion — DECIDED: Option A, propose-then-confirm (Nes, July 5, 2026)

Relevant meetings + frictionless AUTO = the disengagement loop survives. Options:

- **Option A — Propose-then-confirm (recommended).** AUTO becomes one click → a compact review panel: per exec, the picked meeting + chosen choice with its (now tooltipped, per Slice A) effect badges; player confirms all or overrides a row. Preserves AUTO's speed for players who want it, but reinstates one deliberate glance at the week — and Tier 1 makes that glance *worth something* because the meetings now track the business. No economy distortion; builds on the existing `executiveAutoSelect.ts` scoring + XState machine. **Why recommended**: it attacks the exact failure mode (zero deliberation) without punishing players for using a convenience feature.
- **Option B — Delegation cost.** AUTO charges a small cost (money, or a loyalty/mood nick on delegated execs — flavor: they notice you not showing up). Economically legible but punishes the feature's legitimate use, and mood-coupling interacts with PR-9's cultivation loop in ways that need their own balance pass.
- **Option C — Ship 0+1, playtest, decide AUTO after.** Cheapest; risks re-measuring the old behavior. Defensible under the 48-hour/one-decision house philosophy, and the AUTO slice can follow in days.

Recommendation: **A**, as its own slice (PR-3). C is the acceptable fallback if you'd rather re-playtest first.

---

## 7. PR plan (sequential factory slices)

| Slice | Contents | Player-visible outcome | Suggested agent |
|---|---|---|---|
| **PR-1: Tier 0 — honest pools** | `requires` vocabulary + tags on all 20 (incl. `ceo_priorities` copy rewrite); Zod ×2 + TS type; `meetingSelection.ts` (derive + filter, uniform pick); route integration; empty-pool UI + AUTO-skips-empty; data-lint sibling suite; reference-doc §1 update; golden-master prove-untouched runs | Irrelevant meetings stop appearing; execs come online as the label grows | Sonnet 5 (route/UI/data breadth; the tagging table above is already the vocabulary spec, so no separate Haiku pass is worth the handoff) |
| **PR-2: Tier 1 — attention weighting** | `seededWeightedPick`; `weighMeetings` + situation signals; `weekly_meeting_selection` balance block; distribution test (seeded, verifies bias & mean-preservation over N seeds); unit tests for every degenerate case in §2; reference-doc note | Execs visibly track what's happening (tour week → tour talk) | Sonnet 5 |
| **PR-3: AUTO companion** | Per Nes's §6 answer (Option A: confirm panel over `executiveAutoSelect` + machine wiring) | AUTO shows its picks before committing | Opus 4.8 (judgment-heavy UX/XState work) |

Split rationale: PR-1 is the shippable guardrail and sole `actions.json` toucher (one close-reading pass, one reference-doc sync); PR-2 is a pure bias layer that can't land before the tags exist; PR-3 is gated on the §6 product answer and touches a different surface (client XState/AUTO). Each slice: tsc clean + full suite green + data-lint green + golden-master double-run stable before merge; commits batched per slice, independently revertable.

**New debt to log with C-numbers during PR-1**: genre/content-honesty warts (`ar_genre_shift` plural-bands copy, `cco_creative_clash` tag-vs-content looseness). C70 (12-week copy rot in `advanceWeekService`/routes) is NOT in this plan's touched files — no opportunistic fix expected; it stays on the ledger.

---

## 8. Definition of done (this arc)

Spec marked `[READY]` post-checkpoint; PR-1..3 merged (self-merge on green, per session grant); suite + tsc + data-lint green throughout; golden master proven untouched (double-run stable, zero deltas — or any delta root-caused and documented); `[REFERENCE]` doc §1 current; PENDING-DECISIONS.md current (§1 resolved → Tier 2 + side-events pairing recorded); fresh-context verifier confirms slices against this spec including independent golden-master double-run.
