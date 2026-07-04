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
- When authoring changes affect executive meetings, update `docs/01-planning/implementation-specs/REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md` to match.
