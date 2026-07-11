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
- No choice may strictly dominate its siblings within a meeting — enforced by `tests/engine/meeting-dominance.test.ts`.
- Balance-knob file map for tuning authored content:
  - Press/awareness → `balance/markets.json`
  - Quality/variance → `balance/quality.json`
  - Awards / exec-mood modifiers / chart reputation → `balance/progression.json`
  - Streaming/tour revenue formulas (`streaming_calculation`, `ongoing_streams`, `popularity_saturation`, `ongoing_marketing_factor`, `tour_revenue` incl. `energy_effectiveness`/`mood_reactions`/`popularity_reactions`) → `balance/markets.json` `market_formulas`
  - Song-quality formula (`song_quality_formula`: mood/talent/producer/time factors, `mood_variance_widening_max`) → `balance/quality.json` — distinct from `producer_tier_system`/`time_investment_system`, which feed cost/duration only
  - Reputation flop penalty (`flop_penalty`/`flop_revenue_ratio`/`flop_investment_floor`) → `balance/progression.json` `reputation_system`
- When authoring changes affect executive meetings, update `docs/01-planning/implementation-specs/REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md` to match.
- `events.json` is editable via the admin Content Editor (`GET`/`POST /api/admin/events-config`, mirroring the actions-config pair). Saves via either admin content endpoint append an id-level diff to `data/content-changelog.json` (`{ timestamp, file, added, modified, deleted }`) for a later docs-sync pass to consume.
