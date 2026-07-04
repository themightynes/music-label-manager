# Interactivity Gap Analysis — Where the Simulation Is Hollow

> **Update (July 4, 2026)**: Finding 2 (executive meetings, 71/77 dead effect keys) is RESOLVED by PR #119 — 14 canonical effect keys now live, badges whitelisted to `LIVE_EFFECT_KEYS ∪ {executive_mood}`. Finding 3 (WeekSummary `other` bucket) is partially resolved — the meetings card now ships; whether the awareness/breakthrough entries in the `other` bucket are surfaced is unverified. Finding 4 (awareness economy invisible) is partially resolved — a first awareness readout (Buzz chip) shipped in SongCatalog; the release page and dashboard still show nothing. Finding 1 (random side events rolled and discarded) remains open. See `docs/01-planning/implementation-specs/REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md` for the as-built ground truth.

**Date**: July 3, 2026
**Method**: Two-track sweep — (1) planning docs / backlog / roadmap verified against current code, (2) end-to-end traces of every player-facing choice and stat (choice → effect key → engine read → player-visible outcome). Six scout agents + three adversarial verifiers that attempted to REFUTE every "it's dead" claim (dynamic access, camelCase/snake_case variants, config-driven reads, serialization paths). Every claim below is backed by a file:line inspected this session. Items that could not be fully verified are marked **UNVERIFIED**.
**Ranking lens**: consequence-weighted — choices whose outcomes differ and matter later rank highest; visible feedback second; spectacle last.
**Scope**: read-only analysis. Nothing here was changed. Small mechanical debt finds were logged as backlog items C60–C65.

---

## Executive summary

The game has two symmetric problems:

1. **The player is promised consequences that never happen.** 71 of 77 executive-meeting effect keys are silently discarded by the engine, while the UI renders a badge for every one of them. Random side events roll every week and are thrown away before the player ever sees them. The executive "Level" badge can never change.
2. **The simulation delivers consequences the player never sees.** A fully-built awareness/breakthrough economy multiplies streams up to 2× and is rendered nowhere. `WeekSummary.tsx` has an unrendered `other` bucket that swallows eight change types — including the engine's own "🔥 BREAKTHROUGH ACHIEVED!" hero moment.

The healthiest systems (popularity, producer tiers, access tiers, marketing channels, money/reputation) show the pattern that works: stat → formula → visible outcome. The findings below are, in effort-adjusted order, the places where restoring that chain buys the most felt interactivity.

---

## Ranked findings (best bang-for-feel first)

### 1. Random side events: authored, rolled weekly, never shown, never applied

**Player experience**: nothing. Ever. The player has no idea this system exists.
**What's actually happening**: every week the engine rolls a 20% chance (`shared/engine/game-engine.ts:966-980`, config `data/balance/events.json` `weekly_chance: 0.20`), picks an event from `data/events.json` — fully authored multi-choice events (sync licensing offer, plagiarism claim, …) with `effects_immediate`/`effects_delayed` payloads — and pushes only `{id, title: prompt.substring(0,50), occurred: true}` into `summary.events`.
**Broken links (three, all verified adversarially)**:
- Effects never applied — no code path executes a side event's choices; `getEventById`/`shouldTriggerSideEvent` (`server/data/gameData.ts:196,295`) are exported but have zero gameplay callers.
- Choices never presented — no UI, route, or machine consumes them.
- Even the title is invisible — `summary.events` flows to `weeklyStats[weekKey].events` (`game-engine.ts:337`) and dies; `WeekSummary.tsx` reads only `changes`/`chartUpdates` (its sole "events" match is CSS `pointerEvents`); only the dev TestData page counts them.
- Supporting config also dead: `event_weights`, `event_cooldown`, `max_events_per_week` are ignored — `getRandomEvent` (`shared/utils/dataLoader.ts:482-490`) picks uniformly with **unseeded `Math.random()`** (breaks the engine's seeded-RNG discipline; logged as C64).

**Wiring cost**: **M** — an event-presentation surface (modal or inbox email with choices), a choice endpoint, and effect application (can reuse `ActionProcessor.applyEffects` for the 6 live keys; events also use dead keys like `playlist_block` — see finding 2). Touches engine + server route + UI. Effects must apply inside the atomic week transaction OR at choice-time like dialogue does (dialogue's immediate path at `server/routes/artists.ts:99-131` is the precedent). No save-shape change needed if choices resolve immediately.
**Design pitch**: this is the game's only source of *unplanned* drama, already written and already rolling — surfacing it converts a dead RNG draw into the "something happened, what do you do?" beat every week-sim needs.

---

### 2. Executive meetings: 71 of 77 effect keys are silent no-ops — and the UI promises every one of them

**Player experience**: choice cards show effect badges for everything — "+5 Quality Bonus", "+2 Playlist Bias", "+3 Award Chances", "−5 Quality" — presented as real stakes.
**What's actually happening**: `applyEffects` (`shared/engine/processors/ActionProcessor.ts:320-546`) consumes exactly six keys — `money` (:324), `reputation` (:351), `creative_capital` (:360), `artist_mood` (:363), `artist_energy` (:468), `artist_popularity` (:508) — **with no `default` case**. Every other key is silently dropped. Delayed effects re-enter the same switch (`:590,:598`), so persistence in `gameState.flags` does not rescue them — they're re-dropped one week later. The only other consumer of any dead key in the entire codebase is the display badge formatter (`client/src/components/executive-meetings/DialogueInterface.tsx:42-80`, default case renders *any* key), plus `SelectionSummary.tsx:365,383` which renders raw delayed-effect keys as promised badges. Adversarially verified: 35+ keys grepped in both cases across shared/server/client/tests/balance; all hits were the badge formatter or unrelated identifiers (`quality_bonus_threshold` is streaming-decay config; `qualityBonus` in producer-tier-utils is producer tiers).

**Degenerate gameplay this creates (all traced in `data/actions.json`)**:
- **Fake choice**: `distribution_pitch` — `obvious_single` and `hold` both reduce to zero effective effect.
- **8 choices that do literally nothing** while displaying badges: e.g. `cco_creative_clash/artist_vision`, `cmo_viral/copyright_strike`, `distribution_politics/report_behavior`, `cmo_platform_exclusive/simultaneous_release`.
- **Free-money traps** (advertised downside never fires): `cco_timeline/rush` (+$1,000, the "−5 Quality" badge is a lie), `cco_budget_crisis/release_as_is` (+$2,000), `cmo_awards/skip_awards` (+$3,000), `cmo_platform_exclusive/apple_exclusive` (+$18,000 strictly dominates Spotify's +$15,000 — the differentiating delayed effects are all dead).
- **7 all-payoff-dead meetings** (every choice is pure cost): `ar_single_choice`, `ar_discovery`, `ar_genre_shift`, `cmo_pr_angle`, `cmo_scandal`, `distribution_tour_scale`, `distribution_algorithm`.
- **Double-dead special case**: `press_story_flag` has a real waiting consumer — `FinancialSystem.calculatePressPickups(..., hasStoryFlag)` adds `story_flag_bonus` (0.30) at `FinancialSystem.ts:1872-1874` — but **both** live call sites hardcode `false` (`FinancialSystem.ts:1899-1906`, `ActionProcessor.ts:662-668`); the one wrapper that forwards the flag (`game-engine.ts:672-686`) has zero callers.
- **Reverse case**: `executive_mood` has a handler (`ActionProcessor.ts:262-265`) but zero choices in data use it — every meeting gets the flat default +5.

Overall: 21 meetings; 2 fully wired; ~34 of 62 choices have their entire advertised payoff silently dropped. All 27 `data/dialogue.json` choices use only live keys — dialogue effects are fine (but see finding 5).

**Wiring cost**: two-speed.
- **Mitigation, S**: a shared whitelist (exported next to `applyEffects`) filtering both badge renderers so the UI stops promising dead effects. Ships alone, no engine risk.
- **Real wiring, S-per-key → L cumulative**: prioritize multi-use keys — `quality_bonus` (6 uses; natural consumer is `SongGenerationProcessor`/`ReleaseProcessor` quality math), `press_story_flag` (consumer exists; store a flag on gameState, thread `true` through the two call sites), `playlist_bias`, `award_chances`. Each new persistent effect likely lives in `gameState.flags` (jsonb — no schema migration, but snapshot shape gains keys; `SNAPSHOT_VERSION` review needed). Quality/press changes touch `FinancialSystem` → golden-master implications.
**Design pitch**: dozens of already-authored strategic choices gain real, differentiated consequences without writing any new content — and until then, the S-size badge filter stops the game lying to the player every meeting.

---

### 3. WeekSummary's unrendered `other` bucket — one rendering gap silencing several live systems

**Player experience**: the week summary shows revenue, expenses, unlocks, mood lines — and nothing else.
**What's actually happening**: `categorizeChanges` (`client/src/components/WeekSummary.tsx:166-193`) routes every change whose type isn't explicitly matched into `categories.other`, **which no code in the file renders**. Change types verified to die there: `awareness_gain`, `awareness_decay`, `breakthrough`, `executive_interaction` (exec mood/loyalty decay notices), `meeting`, `marketing`, `popularity`, `delayed_effect`. `ToastNotification.tsx:183-191` filters to project_complete/revenue/unlock/mood/energy only. Sharpest instance: `breakthrough` is classified **hero** by `shared/utils/changeImportance.ts:86`, but WeekSummary's hero section only pulls `type === 'unlock'` (`WeekSummary.tsx:210-213`) — the engine's marquee "🔥 BREAKTHROUGH ACHIEVED!" copy (`ReleaseProcessor.ts:696`) is computed, logged, and dropped.
**Wiring cost**: **S** — render the hero-classified changes in the existing hero section and give notable/routine `other` entries a home (the staged-reveal structure from Phase 4 PR-3 already has stage slots). UI-only; no engine, no save shape.
**Design pitch**: single cheapest fix in this report — it simultaneously un-hides the awareness system (finding 4), exec-neglect feedback (finding 6), and delayed-effect payoffs, because the engine already narrates all of them.

---

### 4. The awareness economy: fully simulated, completely invisible (backlog C42 is wrong)

**Player experience**: none — no song card, release page, or dashboard shows awareness; the player cannot know the stat exists.
**What's actually happening**: a complete, live subsystem. Marketing spend builds per-song awareness weeks 1–4 (`ReleaseProcessor.ts:650-727` → `FinancialSystem.calculateAwarenessGain` `:1098-1157`, per-channel coefficients `data/balance/markets.json:124-166`, **enabled: true**); breakthrough rolls weeks 3–6 (seeded, `ReleaseProcessor.ts:666-707`, ×2.5 awareness); payoff weeks 5+: `weeklyStreams *= awarenessModifier` up to 2.0× (`FinancialSystem.ts:983-1013`) and breakthrough songs get a growth phase instead of decay (`:943-975`). Schema: `songs.awareness/breakthrough_achieved/peak_awareness/awareness_decay_rate` (`shared/schema.ts:184-187`) with a dedicated query index (`:207`).
**Broken link**: presentation only. The sole UI consumer is the admin-gated dev tool `client/src/pages/StreamingDecayTester.tsx` (`App.tsx:57,72`). Engine announcements die in finding 3's `other` bucket. No email covers it (`EmailGenerator.ts`: zero matches).
**Also note**: the channels' biggest strategic differentiation lives here — awareness coefficients spread 4× (pr 0.4 vs radio 0.1) while release-week channel effectiveness only spreads ±9% — so the marketing-mix decision the system was designed to create is exactly the invisible part.
**Sub-finding (UNVERIFIED)**: songs released via the legacy `processSongRelease` path (`ReleaseProcessor.ts:1208-1246`) get no `releaseId` and can never gain awareness (`FinancialSystem.ts:978` gates on it); whether that path is still reachable from the current UI was not confirmed.
**Wiring cost**: **S/M**, UI-only — awareness/breakthrough status on song/release cards, breakthrough in the hero reveal (finding 3), optionally an awareness hint in the release-planning preview. Zero engine or schema work; the math is done and tested.
**Design pitch**: the game already rewards long-game PR bets over radio blasts — surfacing the stat turns a hidden dice-roll into "my marketing strategy is visibly compounding," the exact feedback loop the design doc promised.

---

### 5. Artist energy is theater; dialogue scene-targeting is a no-op; delayed effects hit the whole roster

**Player experience**: energy bars with colored badges in five components (`ArtistCard.tsx:173-176`, `OverviewTab.tsx:124-128`, `ArtistDialogueModal.tsx:143-144`, `RecordingSessionPage.tsx:498`, `LivePerformancePage.tsx:746`); dialogue choices that trade money for "+energy"; a "relationship status" derived from avg(mood, energy).
**What's actually happening**:
- **Energy is read by nothing.** Written by dialogue/meetings (`server/routes/artists.ts:111-115`, `ActionProcessor.ts:468-506`), clamped and persisted — and never consumed by quality, tours, streams, availability, costs, or anything else (exhaustively verified). Choices like `offer_break`/`working_vacation` in `data/dialogue.json` buy a number that only changes badge colors. Note: energy replaced artist loyalty in a deliberate refactor (`ArtistStateProcessor.ts:148-149`), but the *consequence* side of the stat was never built.
- **Scene selection ignores the artist's state.** `data/dialogue.json` ships `selection_logic` and per-scene `mood_range`/`energy_range` gates — read by nothing. The server returns all scenes (`server/routes/executives.ts:211-217`); the client picks uniformly at random (`client/src/services/artistDialogueService.ts:33-40`). A thriving artist can deliver the burnout monologue.
- **Bug: delayed per-artist effects go global.** The `artist_energy` and `artist_popularity` cases apply to **all signed artists** regardless of `artistId` (`ActionProcessor.ts:468-484, 508-543`), so a delayed effect queued from a one-on-one dialogue (`server/routes/artists.ts:141-153`) hits the whole roster. (Logged as C60.)

**Wiring cost**: energy consequence **M** (pick one real consumer — e.g. energy gates recording time-investment options or applies a tour-attendance modifier; engine + balance JSON, golden-master review); scene targeting **S** (filter scenes by `mood_range`/`energy_range` before random pick — client/service only); global-misapply fix **S** (pass `artistId` through, mirroring the `artist_mood` case).
**Design pitch**: mood and energy are the two stats the entire dialogue system exists to manage — right now one is weakly wired (see finding 8) and the other is pure spectacle. One real consumer for energy makes every rest-vs-push dialogue an actual decision.

---

### 6. Executives: a Level that never changes, mood/loyalty with no stakes, choices that cannot fail

**Player experience**: each executive card shows a Level badge and mood/loyalty bars; meetings feel like risk/reward picks.
**What's actually happening**:
- **Level is written exactly once** — `level: 1` at game creation (`server/services/gameCreationService.ts:191-194`) — and displayed forever (`ExecutiveCard.tsx:83,179-180`). No XP, no increments, no level-gated anything (`data/roles.json` has zero gated content; its `access` fields are never read).
- **Mood/loyalty are written and decayed** (+5 on use `ActionProcessor.ts:259-296`; −5/week after 3 idle weeks `ArtistStateProcessor.ts:374-467`) but consumed only by card badges and the client auto-select *suggestion ordering* (`client/src/services/executiveAutoSelect.ts:53-59`). No cost modifier, no effectiveness modifier, no availability gate, no quit-at-zero. The design docs specify all of these (mood < 30 ⇒ +25% cost, mood > 90 ⇒ inspired versions) — none exist. Even the decay notices die in finding 3's bucket.
- **No success/failure anywhere**: `data/actions.json` has no probability fields; `ActionProcessor` has no RNG gate. Every choice is a guaranteed-effect menu despite the design docs' extensive success-rate tables. (Streaks, combo actions, crisis-gating: all also absent — see Not-worth-it for combos.)

**Wiring cost**: mood-as-modifier **M** (read `exec.mood` where meeting cost/effects resolve; balance knobs in JSON; show the modifier in UI). Level/XP **L** (accrual rule + level-gated actions + DB writes; save-shape review). Success/failure **L** (data schema for rates + RNG gate + failure UI; must use the seeded RNG inside the week transaction).
**Design pitch**: the exec system's core fantasy — cultivate your team — currently has zero mechanical content. Mood-as-cost-modifier is the M-size slice that makes neglect (already tracked, already decaying) actually cost something.

---

### 7. Charts are a one-way scoreboard — a #1 hit changes nothing

**Player experience**: charts look like a core success metric — Top 100 page, WeekSummary Charts tab, hero "#1 debut" moments, top-10 debut emails.
**What's actually happening**: streams → `ChartService.generateWeeklyChart` (`ChartService.ts:81`, invoked `game-engine.ts:1022-1056`) → `chart_entries` rows → display. **Nothing reads chart position back**: zero chart references in `FinancialSystem.ts`, `ReleaseProcessor.ts`, `ArtistStateProcessor.ts` (adversarially verified; `shouldRemainOnChart` at `ChartService.ts:667-689` feeds only future chart persistence). The designed feedback exists as dead config: `reputation_system.hit_single_bonus: 5` / `number_one_bonus: 10` (`data/balance/progression.json`, typed at `gameTypes.ts:213-214`) are **never read**. Movement/weeksOnChart/peakPosition are computed purely for display. Also: chart emails only fire on *debuts* (`EmailGenerator.buildChartEmails`, `EmailGenerator.ts:92-124` gates on `isDebut`) — a song that climbs to #1 in week 3 sends nothing.
**Wiring cost**: **S** for the designed rep bonuses (read the two config keys where chart updates are assembled — engine change, golden-master review; reputation gain rate is a known player-feedback sore spot per REPUTATION_GAIN_ANALYSIS, so this also helps tuning). **S** for climb-to-#1 emails. Momentum/streams feedback would be M and needs balance care (rich-get-richer loop).
**Design pitch**: charts are the game's most legible success signal — making a #1 actually pay reputation closes the loop between the moment the game celebrates hardest and the progression system that gates everything else.

---

### 8. Artist mood: wired at ⅓ designed strength, and its designed consequences don't exist

**Player experience**: mood is everywhere in the UI, changes weekly, and reads as high-stakes.
**What's actually happening**: mood's only sim consumer is `moodFactor = 0.9 + 0.2*(mood/100)` — a ±10% quality nudge at song-generation time (`SongGenerationProcessor.ts:381-394`). The designed system was ±25–30%: `data/balance/artists.json:26-32` (`mood_effects`, very_low −0.3 … excellent +0.25) is **dead config** — loaded into the balance object (`dataLoader.ts:232`) but never indexed by any code (adversarially verified; no `calculateMoodMultiplier`, no `moodCalculations.ts` despite the plan doc marking Phase 3 "DONE"). Nothing else reads mood: no departure risk, no strike/refusal, no threshold events (Phase 7 `checkMoodTriggers` absent), no mood-history UI (Phase 8; a complete prototype exists unwired at `client/src/components/ux-prototypes/MoodSystemPrototype.tsx`, admin route `/prototypes/mood-system`). The `mood_events` DB table is written on every change (`ArtistStateProcessor.ts:96-135`) and read only by the save-snapshot builder — write-only. Dead columns `artists.moodHistory/lastMoodEvent/moodTrend` (`schema.ts:54-56`) have no writers.
**What IS healthy**: the weekly mood *inputs* (release boost, workload stress −5/extra project, drift toward 50 — `ArtistStateProcessor.ts:174-321`), dialogue integration, per-artist targeting, and WeekSummary mood lines all work and are tested.
**Wiring cost**: strengthen multiplier via `mood_effects` **S/M** (engine reads existing config; golden master). Phase 7 threshold warnings **S/M** (engine + WeekSummary; data already flows). Departure threat **M** (new consequence + UI; save-shape review).
**Design pitch**: the player already manages mood constantly; giving low mood a real cliff (refusal/departure warning) converts routine upkeep into risk management — the single most requested consequence in the mood plan's own design notes.

---

### 9. Difficulty system: plumbed server-side, unreachable by players, ¾ dead

**Player experience**: none — there is no difficulty selector anywhere (`client/src`: zero case-insensitive matches for "difficulty"). Every game is 'normal'.
**What's actually happening**: `POST /api/game` accepts and normalizes `difficulty`, applies `starting_money_multiplier`, persists `flags.difficulty` (`gameCreationService.ts:116-161`) — real, tested plumbing (`tests/unit/starting-values-difficulty.test.ts`). But of the four designed modifiers in `data/balance/progression.json:101-118`, only the money multiplier is consumed (`shared/utils/startingValues.ts:32-39`, whose own comment admits the rest "are still unused"); `reputation_decay`, `market_variance`, `goal_time_extension` have zero reads.
**Wiring cost**: **S** for a picker in the new-game flow (client-only; the body field already works) — that alone makes the feature reachable. **M–L** to wire the other three modifiers (reputation decay doesn't exist at all — see finding 10; market variance touches `FinancialSystem` RNG; golden master).
**Design pitch**: cheapest replay-value feature in the codebase — one dropdown exposes an already-working economy knob, and it creates the future home for the dead decay/variance config.

---

### 10. Reputation: gates a lot, but half its designed dynamics are dead — and it never decays

**What works**: reputation is written by meetings/marketing/press and read by access tiers, producer tiers, the 4th focus slot (rep 50, `game-engine.ts:386-389`), streaming outcomes, tour sell-through, and campaign scoring. Genuinely the spine of progression.
**Dead dynamics (all verified)**:
- `decay_rate` never read — reputation only goes up (mostly); there is no upkeep pressure.
- `hit_single_bonus`/`number_one_bonus` (finding 7), `flop_penalty`, `goal_failure_penalty`, `regional_barriers` — never read.
- `max_reputation: 100` never enforced as config; the 0–100 clamp is hardcoded in `ActionProcessor.ts:351-358`, and the release press-coverage path **writes uncapped** (`ReleaseProcessor.ts:1172` — only path that can exceed 100; logged as C65).
- `progression_thresholds` (playlist_niche_streams, press_blogs_pickups, venue_clubs_sellouts, second_artist_reputation, global_label_reputation) gate nothing: their sole consumer is `ProgressionProcessor.checkProgressionGates` (`:22-26`) — an explicit no-op ("Slot unlock functionality has been removed"). Signing a second artist has **no** reputation check (`server/services/artistService.ts:67`); label-size tiers (local→global) gate nothing.
- **Mislabeled downgrades**: `updateAccessTiers` recomputes tiers weekly from current reputation; a rep drop lowers the tier and fires a notification hardcoded as "…Access **Upgraded**" (`ProgressionProcessor.ts:87-135`); a drop to `none` fires nothing. Rarely visible today only because rep rarely falls — becomes live the moment decay or flop penalties ship. (Logged as C61.)

**Wiring cost**: decay + flop penalty **M** (engine week-advance changes inside the transaction; golden master; pairs naturally with finding 9's difficulty `reputation_decay`). Downgrade wording **S** (client/notification copy).
**Design pitch**: reputation is currently a ratchet — adding decay + flop penalties (config already authored) makes it a resource under pressure, which retroactively gives weight to every meeting choice that pays reputation.

---

### 11. Releases: a mid-flight system with no mid-flight decisions (and the cancel that exists has no button)

**What's actually happening**:
- A transactional, server-side-refunding `DELETE /api/game/:gameId/releases/:releaseId` exists (`server/routes/releases.ts:665-683`, `releasePlanningService.ts:306-346` — frees songs, refunds stored `marketingBudget`, rejects released) — **with zero client callers** (verified: all five client DELETE calls target other resources; the endpoint is exercised only by characterization tests). Backlog C43 says "no endpoint or UI" — half stale: the endpoint shipped, the UI never did.
- No edit/reschedule (no PATCH route exists) and no mid-campaign decision point (double-down / push back / swap lead single) — the release plan doc's Tier 3 is unbuilt.
- No weekly campaign-digest email while a release is live (`EmailGenerator.ts` fires release email once).
- Cosmetic: `chartPotential` is computed in three places (`ReleaseProcessor.ts:382`, `routes/releases.ts:305`, `releasePlanningService.ts:275` — that one hardcoded 50) and rendered by **nothing**.

**Wiring cost**: cancel button **S** (UI + cache invalidation; server work done). Edit/reschedule **M**. Mid-campaign decision **L** (new decision surface + engine hook — but note releases are honestly simulated weekly, *not* pre-rolled, so mid-flight decisions are mechanically meaningful here, unlike tours).
**Design pitch**: players commit five figures to a release and then watch, with zero recourse even for a misclick — the S-size cancel button alone converts that, and the mid-campaign decision is the highest-quality *new* decision available anywhere in this report because the underlying sim is genuinely undecided.

---

### 12. Tours: every city is the same slot machine, pre-rolled in week 2, plus a phantom dead week

**Player experience**: pick cities (a count), then watch one identical-looking result line per week; a 1-city tour takes 3 weeks.
**What's actually happening**: all cities are rolled upfront on the first production week into `project.metadata.tourStats.preCalculatedCities` (`TourProcessor.ts:68-168`) and drip-revealed one per week (`:172-179, :200-203`). No city identity, routing, or per-city decision — "cities" is an integer (`LivePerformancePage.tsx:131`) and each city is the same formula ±20% unseeded-feeling variance (`TourProcessor.ts:124`); the UI even admits it ("…and N more cities with similar performance", `LivePerformancePage.tsx:439`). Completion requires `weeksInProduction > citiesPlanned` — strictly greater (`ProjectStageProcessor.ts:126`) — costing a dead bookkeeping week (related: backlog C51 badge lag). Rich per-city economics are computed (`TourProcessor.ts:137-146`) but only shown post-completion.
**What works**: tour money/mood/popularity impacts are real and surface as WeekSummary lines (`TourProcessor.ts:233-321`); venue access tiers genuinely cap economics; C40's refund is fixed server-side (`server/routes/projects.ts:371-383`, verified directly this session — the client's hardcoded 60% at `ActiveTours.tsx:297,751` is now display-only duplication).
**Wiring cost**: phantom-week fix **S** (`>=` semantics + golden-master update — flagged in C51's option (b): verify the final city's revenue isn't skipped). Per-week rolls instead of pre-calc **M** (move the call site; math exists; must stay inside the week transaction with seeded RNG). Mid-tour decision / momentum **M–L**.
**Design pitch**: tours are the most-repeated loop in a 52-week campaign and currently a pre-decided drip-feed — per-week rolls plus the phantom-week fix make each tour week an actual event at modest cost.

---

### 13. Achievements: two of five score components hardcoded to zero; one achievement rewards mediocrity

**Player experience**: a campaign-end results screen with score, victory type, and achievements.
**What's actually happening** (`shared/engine/AchievementsEngine.ts`, sole invocation at week ≥ 52 via `ProgressionProcessor.ts:202`):
- `artistsSuccessful: 0` and `projectsCompleted: 0` hardcoded with TODOs (`:35-36`) — 40% of the designed score axes contribute nothing, silently skewing every victory-type determination toward money/reputation.
- "🎵 Media Mogul — Maximum playlist and press access" checks `playlistAccess === 'mid' && pressAccess === 'mid_tier'` (`:129`) — strict equality on the **middle** tiers; a player who reaches the real maxima (flagship/national) cannot earn it.
- "⭐ Industry Legend — 200+ Reputation" (`:125`): the only uncapped rep path is small press gains (finding 10) — practically unreachable (**UNVERIFIED** as strictly impossible).
- Copy rot: "Survivor — Made it through 12 weeks" and all five summary strings say "12-week campaign" (`:135,:170`); campaigns are 52 weeks.
(Logged as C62.)
**Wiring cost**: **S** — the data for both zeroed components exists (project completion status, artist popularity/revenue); the tier check is a one-line fix; copy is trivial. Engine-only, campaign-end scoring (golden-master check if scoring is snapshotted).
**Design pitch**: the campaign-end screen is the game's verdict on 52 weeks of play — right now it judges on 60% of the evidence and hands out a max-access award only to mid-tier players.

---

### 14. Email system: 100% flavor, zero actions, and a personality engine's worth of unused state

**What's actually happening**: generation and rendering work (`EmailGenerator.ts:239-272`, category templates). But: zero CTAs anywhere (no email template contains a button/link — the A&R discovery email announces a scout with no path to sign them); executive mood/loyalty (`schema.ts:323-324`) is never read by email generation — every email reads identically regardless of the sender's state; no replies/threads/priority (designed in the narrative guide; entirely absent); fragile subject-string routing (`InboxModal.tsx:43-49` sniffs subjects; `EmailGenerator.ts:65` matches `description.includes("tour")`); tier unlocks miscategorized as "financial" (`EmailGenerator.ts:187`); category "other" never generated.
**Wiring cost**: CTAs **S** (deep-link buttons on discovery/chart emails). Mood-driven tone/sign-offs **M** (exec mood is already in the DB; template variants + selection). Replies/threads **L** (schema + save shape + UI — defer).
**Design pitch**: emails are the game's narrative voice; a CTA on the discovery email is the cheapest navigation win, and mood-toned sign-offs make finding 6's executive stats *legible* through content the player already reads — two systems fixed with one feature.

---

### 15. Smaller verified gaps (grouped)

- **Dead artist columns with live CHECK constraints**: `massAppeal`, `stress`, `creativity`, `temperament` (rendered nowhere), `moodHistory`, `lastMoodEvent`, `moodTrend` (`schema.ts:43-56`, constraints in `migrations/0020`). All serialized into API responses/snapshots but never displayed or computed with. The artist-formulas doc's designs for them (massAppeal multipliers, burnout, creativity cycles) were never implemented. Decide wire-or-drop per column (drop = migration + snapshot review). Phantom `(artist as any).loyalty` fallbacks in `OverviewTab.tsx:89`, `ArtistsLandingPage.tsx:305` are dead code (no such column exists — loyalty is executives-only, `schema.ts:324`). Logged as C63.
- **Archetype is display-only**: real column, populated, shown prominently with flavor text (`ArtistCard.tsx:322-357`) — affects zero calculations; `archetype_modifiers` in `data/balance/artists.json:8-24` is dead config; `getOptimalRecordingRecommendations` ignores its archetype param AND has zero callers (`producer-tier-utils.ts:307-363`). Wiring archetype into one formula (e.g. quality variance or tour draw) is **M** and would give signing decisions a texture axis beyond talent.
- **Label `genreFocus` is cosmetic**: chosen at creation, stored, read only as a dropdown default + "(Your Label)" labels (`GenreSelectionModal.tsx:38,88,94-95`). No engine genre-match bonus. Wiring a small same-genre synergy is **S/M** (engine + balance).
- **`data/roles.json` `access` fields** (producer_tier etc.) are never read — only `baseSalary`/`title` are consumed.
- **XState modal orchestrator unbuilt**: no `postWeekModalMachine` exists (`client/src/machines/` has only arOffice/artistDialogue/executiveMeeting). The dual uncoordinated `useEffect`s (`GamePage.tsx:85-89` vs `Dashboard.tsx:33-44`) were verified early this session, but PRs #117/#118 merged mid-session and reworked the WeekSummary auto-open into a one-shot store flag — **re-verify whether the stacked-modal race still reproduces before scoping this**. The plan doc remains a ready spec if it does. **M**, UI-only.
- **Phase 4 game-feel: RESOLVED mid-session** — the parallel Phase 4 session merged PR-4 (#114 anticipation beat), PR-5 (#115 celebrations, which also wired `notable-chime`), PR-7 (#116 HoloDisc pulse), and auto-open fixes (#117, #118) *after* this report's scouts ran. Only `warning` remains unwired, **deliberately** (no clean trigger — per the Phase 4 session log). Treat this bullet as historical; see DEVELOPMENT_STATUS.md's Phase 4 entry.
- **events.json carries 3 stale `artist_loyalty` keys** (lines 35, 238, 273) — moot while events are dead (finding 1), but rename to `artist_energy` when wiring them.

---

## Not worth it — looks hollow, should stay dead (or die differently)

| Item | Why it should stay dead |
|---|---|
| **`roles` DB table + `relationship` column** | Superseded architecture: nothing ever creates rows (only save-restore round-trips, `saveService.ts:336,589`); `storage.updateRole` has zero callers; the live `/api/roles` endpoints read JSON, not this table. The 8-role trust-score vision was replaced by the executives system. Candidate for deletion, not wiring. |
| **`checkProgressionGates` story unlocks** | Explicitly removed as "non-functional placeholders" (`ProgressionProcessor.ts:22-26`). Reviving it is a design decision, not a wiring task — don't treat the no-op as a bug. |
| **Artist loyalty** | Deliberately refactored to energy (loader shim `dataLoader.ts:410-414`; schema comment). Don't resurrect; fix energy's consequence gap instead (finding 5). |
| **Special combo actions (Coordinated Album Launch etc.)** | Zero scaffolding anywhere; the design doc itself files them under Future Considerations. Needs the success/failure substrate (finding 6) first anyway. |
| **`game-state-architecture-overhaul.md`** | Every checked claim is stale-fixed (userId association, ownership middleware, hardcoded game ID, autosave, localStorage bloat — all resolved by Clerk/Phase 1–3.5 work). Archive it. Genuinely-open remainders: no TTL/archival for game states, no optimistic-lock version column — infrastructure, not interactivity. |
| **`content-management-features.md`** | Pure greenfield wishlist (analytics, A/B balance variants, feature flags, hot reload) — no partial scaffolding exists; nothing player-facing is "missing." |
| **Doc formula fidelity (artist-formulas.md, mood-plan Phase 3 constants)** | The docs' specific formulas (monthly decay, `min(5, monthsSinceAttention*2)`, creativity sine cycles, stress accumulation) describe a system that was never built; the shipped weekly system is simpler and different by design. Treat the docs as fiction for constants; don't "fix" code to match them. |
| **Awareness engine work** | The engine is done (finding 4). Any ticket phrased as "implement awareness" should be rejected; the work is presentation-only. |
| **Marketing channel math, producer tiers, access tiers, popularity/talent/workEthic, focus slots, artist targeting scopes, exec salaries** | Traced end-to-end and healthy — stat → formula → visible consequence. Listed so nobody re-audits them. |

---

## Corrected-stale-claims ledger (verified this session; update the source docs)

| Stale claim | Reality | Where |
|---|---|---|
| Backlog **C42**: awareness "feeds into nothing" | Awareness multiplies weekly streams up to 2×, enabled | `FinancialSystem.ts:983-1013`, `markets.json:124` |
| Backlog **C43**: "no endpoint (or UI) to cancel" | Endpoint exists with server-side refund; only the UI is missing | `releases.ts:665-683`, `releasePlanningService.ts:306-346` |
| Backlog/tour doc **C40**: refund client-trusted | Fixed — server recomputes, ignores client value | `projects.ts:371-383` |
| Release doc C44: preview/execution dual paths | Unified — outcome calls preview internally | `ReleaseProcessor.ts:451` |
| Release doc C45: `star_power_amplification`/`pressMentions` unconsumed | Both live | `FinancialSystem.ts:720-721`; `ActionProcessor.ts:672-673` |
| Actions-analysis doc: "reputation effects not connected" | Wired | `ActionProcessor.ts:351-359` |
| Actions-analysis doc: venue/tour keys "Implemented V1 9/14/2025" | False — those 5 keys have zero engine references | finding 2 |
| Mood plan: Phase 6 dialogue "not started" | Shipped and tested | `ActionProcessor.ts:363`, `tests/features/mood-dialogue-integration.test.ts` |
| Mood plan: Phase 3 "DONE — calculateMoodMultiplier" | No such code; `mood_effects` config is dead; live path is inline 0.9–1.1× | `SongGenerationProcessor.ts:383-394` |
| Tour doc: blocked on routes refactor + venueCapacity crash | Both resolved (`server/routes/tour.ts` mounted; tier-midpoint fallback) | `TourProcessor.ts:73,91-97` |
| Phase-4 plan status table: PR-3 pending | Merged (PR #113) | `WeekSummary.tsx:23-67` |

---

## Constraint collisions cheat-sheet (for whoever picks these up)

- **Golden master**: any change in `FinancialSystem.ts` / `SongGenerationProcessor.ts` / week-advance math (findings 2, 5, 7, 8, 9, 10, 12, 13) needs a golden-master re-baseline.
- **Frozen save shape**: new persistent state (exec XP, event flags, success streaks) means `SNAPSHOT_VERSION` bump + migration; effects stored in existing `gameState.flags` jsonb avoid schema migrations but still change snapshot contents.
- **Atomic week (D6)**: anything that fires during week advance (events application, decay, per-week tour rolls) must run inside the single transaction and use the seeded RNG (`rngSeed`) — note finding 1's current unseeded `Math.random()` violation.
- **UI-only, zero engine risk**: findings 3, 4 (surfacing), 9 (picker), 11 (cancel button), 14 (CTAs), 15 (orchestrator, badge whitelist) — the safe first wave.

## New backlog entries logged this session

C60 (delayed effects hit whole roster), C61 (downgrade labeled "Upgraded" / silent drop-to-none), C62 (AchievementsEngine zeroed components + Media Mogul equality + 12-week copy), C63 (dead artist columns + phantom loyalty fallbacks), C64 (side-event roll uses unseeded Math.random), C65 (uncapped reputation write in release press path). See `docs/09-troubleshooting/technical-debt-backlog.md`.
