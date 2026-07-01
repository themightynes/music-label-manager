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
- **Built in two places**: `client/src/components/SaveGameModal.tsx` (`handleExport`) and `client/src/store/gameStore.ts` (`saveGame`) assemble the snapshot independently — keep them in sync (they have already drifted on `emailMetadata.truncated`).
- **`SNAPSHOT_VERSION`** lives in `shared/schema.ts`; restore rejects mismatched versions. Bump it and add migration logic when the shape changes.

## 🎨 Color System
- **Brand Colors**: Use `brand-*` Tailwind classes for game-specific UI (e.g., `bg-brand-burgundy`, `text-brand-rose`)
- **Semantic Colors**: Use semantic classes for generic UI (e.g., `bg-success`, `text-warning`, `bg-sidebar`)
- **Documentation**: See the comprehensive color system documentation in `tailwind.config.ts` header comments
- **Tier Badges**: Bronze (amber), Silver (gray), Gold (brand-gold), Platinum (purple)
- **Never use inline hex colors** - all colors must use Tailwind utility classes

## 🔐 Authentication & API Integration
- Authentication is powered by Clerk; rely on Clerk React hooks and components (`useUser()`, `useAuth()`, `<SignedIn>`, `<SignedOut>`, `<UserButton>`)
- Never roll your own auth helpers—extend behavior by composing Clerk primitives and reference Clerk documentation for additional components
- When calling backend endpoints, always go through the shared `apiRequest()` helper in `queryClient.ts`; it attaches Clerk JWT tokens automatically and prevents duplicate auth logic

## ✅ Validation Commands
- `npm run check` - Run TypeScript compilation check
- `npm run dev` - Starts the dev server (single Express process on port 5000 with Vite as middleware — no separate client dev server)
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
- **CI coverage gap**: CI (`.github/workflows/playwright.yml`) runs **Playwright only** — the vitest suite is **NOT** in CI. Run `npm run test:run` **locally** before trusting vitest results.
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

## 🔀 Git & Branch Workflow
- **Prefer selective `git add <paths>` over `git add -A`** — blanket adds have swept machine-local files (`.claude/settings.local.json`) and merge artifacts (`*.orig`) into commits here. `*.orig`/`*.rej` are gitignored; don't force-add them.
- **Resuming a stale/long-lived branch**: merge `main` in and validate (`npm run check` + relevant tests) **before** building new work on it. Branches cut from old `main` can carry hidden conflicts (e.g. `game-engine.ts` auto-merges cleanly at the text level but may still need review).
- **Keep session-log / status-doc updates off feature PRs** — land them on a small `docs/session-<date>` branch off `main` so feature PRs stay focused.

---
*For project overview, current status, and documentation references, use the `/onboard` command*
