# Music Label Manager - Claude Session Instructions

## 📊 Project Architecture Overview
TypeScript monorepo with Express backend and React frontend for a music industry simulation game.

**Stack**: React 18 + Vite, Wouter routing, TanStack Query, Clerk auth, Zustand state, XState flows, Motion.dev animations, Express + Drizzle ORM + PostgreSQL

**Key Components**:
- Monorepo with coordinated npm scripts (`dev`, `build`, `db:push`)
- Shared game state via Zustand store with API sync
- Complex meeting flows modeled with XState state machines
- Drizzle schemas define gameplay domain (users, saves, artists, songs, releases, charts, labels)
- GameEngine processes weekly actions and financial systems (shared client/server)
- Shared Zod contracts keep API schemas in sync

## UI Components

- Using shadcn/ui (New York style) with TypeScript
- Components location: `client/src/components/ui/`
- To add new components: `npx shadcn@latest add [component-name]` from project root
- CSS variables enabled for theming (neutral base color)
- Import alias: `@/components/ui/[component]`

## 🚨 Railway Deployment Environment
**Critical for Railway PostgreSQL sessions:**
- **Database**: Railway PostgreSQL with standard `pg` driver (migrated from Neon serverless)
- **Connection**: Uses `DATABASE_URL` environment variable with SSL enabled
- **Pool Settings**: Max 10 connections, 30s idle timeout, 10s connection timeout
- **SSL Config**: `rejectUnauthorized: false` required for Railway's certificates
- **Local Development**: Default port 5000 for main application
- **Alternative ports**: Use ports like 3000, 8000, or 8080 for testing servers

## 🗄️ Database & Migrations (Drizzle Kit + Railway PostgreSQL)
**Quick Reference**: See `/docs/06-development/database-practices.md` for comprehensive guidelines.

**Core Rules**:
- ✅ Generate migrations with `npm run db:generate`, then **review the SQL before applying**
- ✅ For complex schema changes (type changes, foreign keys), **write SQL manually**
- ✅ Apply migrations with `npm run db:push`
- ✅ Verify with `npm run db:studio` after changes
- ✅ Make schema changes **one table at a time**
- ❌ Never modify 3+ tables in a single `db:generate` run
- ❌ Don't trust auto-generated migrations without review

**Emergency Recovery**:
```bash
# If migrations are stuck:
psql $DATABASE_URL < migrations/XXXX.sql
npm run check          # Validate TypeScript
npm run db:studio     # Verify in database
```

**Key Commands**:
- `npm run db:generate` - Create migrations from schema.ts
- `npm run db:push` - Apply migrations to database
- `npm run db:studio` - Visual database browser
- `npm run db:introspect` - Sync schema.ts with actual database

## 📋 Special Implementation Notes
- Must preserve `/data/` JSON files - these are the game's content source
- All JSON data must validate with Zod schemas
- Use small, incremental changes: Plan → Propose → Build → Verify

## 💾 Save/Load Snapshots
- **Snapshot shape**: a save snapshot is `{ snapshotVersion, gameState: <inner game state>, musicLabel, artists, projects, roles, songs, releases, emails, emailMetadata, releaseSongs, executives, moodEvents, weeklyActions, weeklyOutcome }`. `musicLabel` and all collections are **siblings of `gameState`**, NOT nested inside it (`saveGame`/`handleExport` strip `musicLabel` out of `gameState`). Server JSON-path queries must read `game_state->'musicLabel'`, not `game_state->'gameState'->'musicLabel'`.
- **Built via a shared helper**: `client/src/components/SaveGameModal.tsx` (`handleExport`) and `client/src/store/gameStore.ts` (`saveGame`) both call `buildGameSnapshot()` (`client/src/utils/buildGameSnapshot.ts`) to assemble the snapshot, so the two call sites can no longer drift on field shape (e.g. `emailMetadata.truncated`) the way they once did — the assembly logic lives in exactly one place. Both call sites source the five migrated collections (`songs`, `releases`, `releaseSongs`, `projects`, `artists`) AND the `gameState` spine itself from the TanStack Query cache (`getQueryData`/`useGameState()`), not from a Zustand-held copy (see `client/CLAUDE.md` State Management, Phase 3.5).
- **`SNAPSHOT_VERSION`** lives in `shared/schema.ts`; restore rejects mismatched versions. Bump it and add migration logic when the shape changes.

## 🎨 Color System — v2 "Neo-Cyber HUD" (July 2026)
- **v2 tokens (preferred)**: `surface-*` (app/panel/inner/tooltip), `neon-*` spectral accents (magenta/cyan/purple/lilac/…), semantic `positive`/`negative`/`warning`, and `money` — money values are ALWAYS `font-mono text-money` (gold)
- **Utilities**: `.glass-panel`, `.chromatic-hairline`, `.hud-ticks`, `.backdrop-*`, `.text-aberration`, `.shimmer-bar` (defined in `client/src/index.css`)
- **Legacy `brand-*` classes** still compile — remapped to v2 hues in `tailwind.config.ts` — but prefer v2 tokens in new code
- **Documentation**: `docs/04-frontend/design/v2/design-system-v2.md` (distilled spec) + `tailwind.config.ts` header comments
- **Tier/access badges**: locked = ghost chip; unlocked = gradient fill + neon glow (see spec §6)
- **Never use inline hex colors** - all colors must use Tailwind utility classes

## 🔐 Authentication & API Integration
- Authentication is powered by Clerk; rely on Clerk React hooks and components (`useUser()`, `useAuth()`, `<SignedIn>`, `<SignedOut>`, `<UserButton>`)
- Never roll your own auth helpers—extend behavior by composing Clerk primitives and reference Clerk documentation for additional components
- When calling backend endpoints, always go through the shared `apiRequest()` helper in `queryClient.ts`; it attaches Clerk JWT tokens automatically and prevents duplicate auth logic

## ✅ Validation Commands
- `npm run check` - Run TypeScript compilation check
- `npm run dev` - Starts the dev server (single Express process on port 5000 with Vite as middleware — no separate client dev server). ⚠️ **`tsx` runs WITHOUT watch: server/engine/shared code loads once at startup and never hot-reloads** (Vite HMR covers client code only) — after merging any server-side change, RESTART the dev server before live verification/playtesting, or the running process keeps executing the pre-merge engine (this silently invalidated a 17-week playtest on 2026-07-05)
- `npm test` - Run tests once (alias of `test:run`; for watch mode use `npx vitest`)
- `npm run test:run` - Run tests once (CI mode)
- `npx kill-port 5000` - Clean up a lingering dev server (Windows-friendly; `pkill -f "tsx server"` on POSIX)

## 🧪 Testing Framework
- **Framework**: Vitest (native Vite integration, Jest-compatible API)
- **React Testing**: `@testing-library/react` with `@testing-library/jest-dom` matchers
- **Test Files**: Use `*.test.ts` or `*.spec.ts` naming convention
- **Setup**: Global test configuration in `tests/setup.ts`
- **Structure**: Wrap tests in `describe()` blocks, use `it()` or `test()` for assertions
- **Commands**: `npm test` (single run), `npx vitest` (watch), `npm run test:ui` (interactive UI), `npm run test:coverage` (coverage report)
- **Database**: **NEVER** import `server/db` in tests - always use `createTestDatabase()` from `tests/helpers/test-db` to avoid polluting production database
- **Integration DB setup**: integration tests hit a real Postgres on `localhost:5433` (Docker container `music-label-test`, db `music_label_test`, user/pass `postgres`). Start it, then provision schema — but ⚠️ `drizzle-kit push` does **NOT** create the raw-SQL `CHECK` constraints (e.g. `artists_mood_check`), so apply the SQL migrations (`migrations/*.sql`, at least `0020`) or `artist-mood-constraints.test.ts` fails on a fresh DB.
- **CI**: The vitest suite now runs in CI as the `vitest` job in `.github/workflows/playwright.yml` (a `postgres:16` service on port 5433 + `drizzle-kit push --force` provisions the schema, then `npm run test:run`). Local runs still need the Docker test DB — start it with `npm run test:db:start` (container `music-label-test-db`) before running `npm run test:run`, and `npm run test:db:stop` when done.
- **Mirror production data shapes in tests** — e.g. the save snapshot stores `musicLabel` as a sibling of `gameState` (see Save/Load Snapshots); a test that nests it can pass while the real code path is broken (this shipped a real migration bug).

## XState & Stately Runtime Notes
- `xstate` drives multi-step decision flows; prefer typed machine definitions and actor logic over ad-hoc reducer state.
- Co-locate machines with the feature they support and share cross-tier contracts through `shared/` when both client and server dispatch the same events.
- Attach `@statelyai/inspect` only in dev contexts (e.g., guard with `if (import.meta.env.DEV)` or `process.env.NODE_ENV !== 'production'`) so visualization tooling stays out of production bundles.

## Implementation Philosophy
- **One Layer at a Time**: Never build multiple interdependent systems simultaneously
- **Stub and Ship**: `return true; // TODO: make smarter` is valid first implementation  
- **48-Hour Rule**: Any feature should show visible progress within 2 days
- **One Decision**: Each iteration adds exactly ONE decision point for players
- **Annotate Everything**: Mark all hardcoded values, stubs, and missing features with clear TODO/STUB/HARDCODED comments for easy identification later
- Commit incomplete working code > complete non-working code

# AI Dev Tasks
Use these files when I request structured feature development using PRDs:
/docs/ai-dev-tasks/create-prd.md
/docs/ai-dev-tasks/generate-tasks.md
/docs/ai-dev-tasks/process-task-list.md

**Annotation Standards:**
```javascript
// STUB: Will be replaced with complex logic in Phase 2
return 50; 

// HARDCODED: Should read from balance.json eventually  
const approvalThreshold = 10000;

// TODO: Add artist personality factors to mood calculation
function calculateMood() { return Math.random() * 100; }

// MISSING: Reputation system integration needed
```

This ensures we can easily grep for `STUB:`, `HARDCODED:`, `TODO:`, and `MISSING:` to find what needs enhancement in future iterations.

## 📚 Documentation Maintenance
- **Doc-sync rule**: any PR that changes engine/route/client-state-ownership/schema/game-content behavior must update the affected descriptive docs (`docs/02-architecture/`, `03-workflows/`, `04-frontend/`, `05-backend/`) OR log the staleness in `docs/09-troubleshooting/technical-debt-backlog.md` — see `docs/06-development/documentation-governance.md` for the full rule and rationale.
- **Archival convention**: superseded docs move via `git mv` to `docs/99-legacy/superseded-<yyyy-mm>/` with a dated `> ⚠️ ARCHIVED …` header pointing to the successor doc, and every inbound link fixed in the same commit (see documentation-governance.md's Archival Mechanism section for the exact header template).
- **When `data/actions.json` or `LIVE_EFFECT_KEYS` changes**, update `docs/01-planning/implementation-specs/REFERENCES AND ANALYSIS/[REFERENCE] executive-meetings-system-complete-reference.md` — the data-lint test (`tests/engine/data-lint-effect-keys.test.ts`) guards the data itself; this rule guards the doc describing it.

## 🔀 Git & Branch Workflow
- **Prefer selective `git add <paths>` over `git add -A`** — blanket adds have swept machine-local files (`.claude/settings.local.json`) and merge artifacts (`*.orig`) into commits here. `*.orig`/`*.rej` are gitignored; don't force-add them.
- **Resuming a stale/long-lived branch**: merge `main` in and validate (`npm run check` + relevant tests) **before** building new work on it. Branches cut from old `main` can carry hidden conflicts (e.g. `game-engine.ts` auto-merges cleanly at the text level but may still need review).
- **Session-log / status-doc placement is two-tier** (2026-07-21 ruling): on a **long-lived working-session branch** (multi-day, wip commits, the next session continues on the branch), commit `DEVELOPMENT_STATUS.md`/`ai_instructions.md` updates as `docs(session)` commits **on that branch** — splitting them off is friction for no benefit. For **quick feature PRs** (merge within a day or two), keep status docs off the PR and land them on a small `docs/session-<date>` branch off `main` so the PR stays focused and `main`'s status stays current. ⚠️ Known cost of the on-branch tier: `main`'s `DEVELOPMENT_STATUS.md` is stale until the session branch merges — when onboarding a fresh session, check whether an active session branch carries a newer entry before trusting `main`'s copy.

---
*For project overview, current status, and documentation references, use the `/onboard` command*
