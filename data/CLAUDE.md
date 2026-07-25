# Data Directory

## Bug Reports
- `bugReports.json` - Active reports (new, in_review)
- `bug-reports-archive/` - Completed reports, auto-archived when active file > 50 reports
- Schema: `BugReportRecordSchema` in `shared/api/contracts.ts`
- Archival docs: `server/utils/BUG_REPORT_ARCHIVAL.md`

## Balance Config (`balance/`)
Game balance JSON: markets, economy, quality, progression, projects, events, config, content

## Game Content
Artists, songs, roles, executives, actions, world definitions

## Effect-Key Authoring Rules (July 2026)
- Every key used in `actions.json`/`events.json`/`dialogue.json` `effects_immediate`/`effects_delayed` must be canonical — `LIVE_EFFECT_KEYS` (`shared/engine/processors/ActionProcessor.ts`) ∪ `executive_mood`. `tests/engine/data-lint-effect-keys.test.ts` fails otherwise.
- A **new** effect key needs its engine case added to `ActionProcessor.applyEffects` **first**, before it can be authored into any content JSON.
- **Targeting directives (engine-verbs SLICE 5, M13/M14)** — two STRING-valued keys may ride inside an effects block (they route a sibling effect, they are not channels):
  - `target_executive: 'head_ar'|'cmo'|'cco'|'head_distribution'|'all'` — REQUIRED next to `executive_mood` on CEO-meeting (`role_id: "ceo"`) and `events.json` choices (those surfaces have no implicit exec; without it the key is dead and lint fails). `effects_immediate` only. FORBIDDEN on role-meeting choices and in `dialogue.json`. Example: `"effects_immediate": { "executive_mood": -5, "target_executive": "cmo" }`.
  - `target_artist: 'predetermined'|'global'` — `events.json` choices only; overrides the event-level `target` for that block's artist-scoped keys ('predetermined' = the resolved highest-popularity signed artist; 'global' = every signed artist). Legal in both effect blocks; absent = event-level behavior.
  - `executive_mood` in `effects_delayed` is a dead key on CEO-meeting/event choices — lint-blocked.
  - Full grammar + resolver map: `docs/01-planning/implementation-specs/REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md` §2.
- No choice may strictly dominate its siblings within a meeting — enforced by `tests/engine/meeting-dominance.test.ts`.
- Balance-knob file map for tuning authored content:
  - Press/awareness → `balance/markets.json`
  - Quality/variance → `balance/quality.json`
  - Awards / exec-mood modifiers / chart reputation → `balance/progression.json`
  - Streaming/tour revenue formulas (`streaming_calculation`, `ongoing_streams`, `popularity_saturation`, `ongoing_marketing_factor`, `tour_revenue` incl. `energy_effectiveness`/`energy_cost` (C87 per-city tour drain)/`mood_reactions`/`popularity_reactions`) → `balance/markets.json` `market_formulas`
  - Artist energy lifecycle (`energy_lifecycle`: `recording_drain_per_week`/`idle_recovery_per_week`, the passive counterweight to the tour drain) → `balance/markets.json` `market_formulas`
  - Breakthrough effects incl. artist morale lift (`awareness_system.breakthrough_effects.artist_mood_bonus`) → `balance/markets.json` `market_formulas`
  - Song-quality formula (`song_quality_formula`: mood/talent/producer/time factors, `mood_variance_widening_max`) → `balance/quality.json` — distinct from `producer_tier_system`/`time_investment_system`, which feed cost/duration only
  - Reputation flop penalty + artist-mood wound (`flop_penalty`/`flop_revenue_ratio`/`flop_investment_floor`/`flop_artist_mood_penalty`) and the global positive-gain damper (`reputation_gain_scaling`) → `balance/progression.json` `reputation_system`
  - Passive artist mood drift toward neutral (`mood_drift`: `threshold_high`/`threshold_low`/`drift_amount`) → `balance/artists.json` `artist_stats`
  - Mandatory side events kill-switch (`mandatory_side_events.enabled` — deferred-crisis mode) → `balance/events.json`
- When authoring changes affect executive meetings, update `docs/01-planning/implementation-specs/REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md` to match.
- `events.json` is editable via the admin Content Editor (`GET`/`POST /api/admin/events-config`, mirroring the actions-config pair). Saves via either admin content endpoint append an id-level diff to `data/content-changelog.json` (`{ timestamp, file, added, modified, deleted }`) for a later docs-sync pass to consume.
