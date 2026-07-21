# Session Handoff — 2026-07-20 — Mac + Sam v3 Pool Load (pre-playtest)

**For the desktop Claude session.** Run `/onboard` first, then read this. Everything below is uncommitted working-tree state on branch `content/meeting-content-session` (synced from the laptop). Your job: run the full Docker-backed test suite, resolve anything red, and support the playtest.

## What this session did (laptop, no Docker — DB-dependent tests NOT yet run)

Goal: load the reviewed v3 **Mac (head_ar)** and **Sam (cmo)** pools into the live game for a full working playtest. Designer decisions driving it: **no stubs** (build missing mechanics properly), **replace** v2 meetings, killed scenarios stay out, `the_dossier` reworked now (no holding), the orphaned `scheduled_sam_comeback_verdict` killed with its parent.

### 1. Engine — per-artist `quality_bonus` banking (no stub)
`shared/engine/processors/ActionProcessor.ts` + `SongGenerationProcessor.ts`. Mirrors the buzz-v2 awareness artist-pool design: `target_scope: 'user_selected'` + resolved artistId → banks into `flags.qualityBonusArtistPools[artistId] = {amount, week}`; consumption at recording = label pool + that artist's pool; independent zeroing (only recording artists drain) and independent 8-week expiry. Untargeted path byte-identical; additive flag key, **no SNAPSHOT_VERSION bump**; agent asserts **no GM re-bless needed** (GM fixtures use `target_scope: 'global'`) — **verify this on the desktop with the real GM suite**. New tests: `tests/engine/quality-artist-scoping.test.ts` (13). Side effect (intended): 6 pre-existing user_selected choices (`ar_single_choice` — now removed —, `cco_creative_clash`, `action_1760807005433`) bank per-artist now.

### 2. Client — C99 fixed
`DialogueInterface.tsx`: structured/misleading-numeric effect keys render qualitative badges from `EFFECT_CHANNEL_DESCRIPTIONS` (e.g. schedule_event → "Consequence"), never `[object Object]`, never leaking event_id. 36 new badge tests. C99 marked resolved in the backlog ledger.

### 3. Content — 3 scheduled ("trickle") verdict events in `data/events.json`
`scheduled_mac_3am_demo_verdict` (8wk), `scheduled_mac_machine_verdict` (6wk), `scheduled_sam_documentary_release` (7wk) — all `scheduled_only: true`, category industry_drama. C103's Mac/Sam slice satisfied. Note: data-lint bars `executive_mood`/`target_executive` on event choices; exec beats expressed via reputation/press/story flags (matches shipped escalation events).

### 4. Content — Mac 12 + Sam 11 transcribed into `data/actions.json`, v2 replaced
- Removed: `ar_single_choice`, `ar_discovery`, `ar_genre_shift`, `cmo_pr_angle`, `cmo_scandal`, `cmo_awards`, `cmo_viral` **plus** `cmo_chart_debut_press`, `cmo_platform_exclusive` (v3 successors `chart_debut_one_hour_window`/`platform_exclusive_bidding` collide with them under reactive-uniqueness). Retained: `ar_recent_signing_plan`. Pool now 38 weekly_actions.
- All approve_with_edits notes applied (Sam 2–4× scaling, artist/release naming, Mac cost/mood edits, demo_ethics_one prose rewrite).
- `the_dossier` reworked: tied to `{artistName}` (user_selected), leverage premise kept.
- `demo_ethics_one` made **non-reactive** (gated artist_signed + recording_project_active) — reactive recent_signing slot is owned by retained `ar_recent_signing_plan`. Open designer option: swap them.
- `outcomeSummary` → `outcome_summary` throughout; executive_mood normalized to effects_immediate.

### 5. Tests updated for the new pool
`meeting-selection.test.ts` (new ungated set: ceo_priorities, crisis_retainer, the_3am_demo, tuesday_superstition, vintage_speakers; catalog 38), `meeting-dominance.test.ts` (new trap entries + live-pool sweep with a documented `DELIBERATE_DOMINANCE_ALLOWLIST`), `executive-autonomy.test.ts` (loyal-pick retargeted to `platform_exclusive_bidding` → expects `refuse_windows`), `data-lint-reactive-triggers.test.ts` (reactive set now 7).

## Verified locally (laptop)
`npm run check` clean; all 5 `data-lint-*` suites green; the three fixed test files green; badge tests 36/36; pure-engine quality/hype/variance suites green (~144 tests). All run via a temporary no-DB vitest config (removed) because `tests/setup.ts` requires the Docker DB.

## Desktop TODO (needs Docker)
1. `npm run test:db:start`, apply SQL migrations if fresh DB (drizzle push misses CHECK constraints — at least `migrations/0020`), then `npm run test:run` — **full suite, double-run** per branch convention (was 2,230 green ×2 before this session's changes).
2. Watch specifically: **golden-master-advance-week** (expected unchanged — if it diffs, audit field-by-field before any re-bless), `quality-channel-characterization`, `executive-autonomy`, `meeting-selection`, `meeting-dominance`.
3. Playtest prerequisites: dev server restarted post-sync (engine code, no tsx watch).

## Designer (Nes) follow-ups
- Confirm `own_the_correction` deliberate weak-dominance (`demand_the_correction` ≥ `let_it_die` on every axis) — allowlisted in meeting-dominance test. Also its shipped magnitudes (±3/±5) exceed the review-module spec (±1/±2) per the ~2.5× edit note.
- `demo_ethics_one` non-reactive vs retiring `ar_recent_signing_plan` — current choice: keep both, demo_ethics gated not reactive.
- `{songTitle}` and reactive-`{artistName}` templating renders literally on global-scope meetings (pre-existing renderer limitation; affects `one_that_got_away_again`, `chart_debut_one_hour_window`, `old_tweets_surface`) — follow-up candidate.
- `the_engagement_farm` kept the honest `awareness_boost` version per review verdict (no pre-release hype top-up verb exists yet).
- `[REFERENCE]` doc: §3 inventories updated; §1/§4/§10/§11 still cite removed v2 ids — stale pending a sweep.

## Not done / out of scope this session
Dante/Pat/CEO/side-events/escalations pools (unreviewed), second escalation events per role (C103 remainder), C98 admin structured-value editors, C100/C101/C102, commit/merge (branch holds until Nes review).
