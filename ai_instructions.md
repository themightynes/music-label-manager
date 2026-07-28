# AI Assistant Instructions for Music Label Manager

## Quick Context
You're working on **Top Roles: Music Label Manager**, a browser-based music industry simulation game. This is a monorepo with React (Vite) frontend, Express backend, PostgreSQL database (**Railway**, standard `pg` driver), Clerk auth, and shared TypeScript code.

> ✅ **Reconciled 2026-07-26.** This file was previously stale (Aug 2025, Neon/Replit era); the dead status blocks, obsolete ledger counts, and wrong-stack notes have been removed. What remains is evergreen architecture guidance. For anything time-sensitive, defer to the authoritative sources below — do not re-add status/ledger content here.

## 📍 Authoritative Sources (Single Source of Truth)
Do **not** duplicate status, ledger, or roadmap content in this file. Read the canonical docs instead:

- **Current status, ledger, session log, "what changed" →** `../DEVELOPMENT_STATUS.md`
- **Commands, conventions, stack, DB/migration rules, testing setup →** root `CLAUDE.md`
- **Client-specific conventions →** `client/CLAUDE.md`
- **Documentation navigation ("I need to…") →** `docs/CLAUDE.md`
- **Onboarding →** the `/onboard` command

## Tech Stack
React 18 + Vite, Wouter routing, TanStack Query, Clerk auth, Zustand state, XState flows, Motion.dev animations, Express + Drizzle ORM + **Railway PostgreSQL** (standard `pg` driver, `DATABASE_URL`, SSL enabled). Shared Zod contracts keep API schemas in sync across client/server.

## Architecture (evergreen)
- **Cadence is weekly.** The game advances one **week** at a time (`advanceWeek`), not months.
- **`server/routes.ts`** is a thin route registry that mounts per-feature Express routers under `server/routes/` (emails, games, saves, releases, artists, projects, executives, arOffice, charts, tour, gameLoop, admin, content, devTools, bugReports, analytics). Routers handle HTTP **only** and delegate all business logic to the engine.
- **`shared/engine/game-engine.ts`** orchestrates processor modules in `shared/engine/processors/`. It is seeded-RNG deterministic with a golden-master harness (`tests/engine/`).
- **Client state is domain-split**: TanStack Query owns server collections, Zustand owns the gameState spine + session/UI, XState drives multi-step decision flows. `tests/client/` holds the characterization net.

### Architecture Rules (CRITICAL)
1. **GameEngine is the single source of truth** — ALL business logic lives here only.
2. **Routes handle HTTP concerns only** — no business logic; delegate everything to the engine.
3. **`server/data/gameData.ts` provides data access only** — no calculations, just JSON loading.
4. **`server/storage.ts` handles the database only** — pure CRUD, no business logic.
5. **Client previews only** — the client may show calculations but never persists them; money/creativeCapital are server-canonical.

### State Management
- **Server state** → React Query (`useQuery`, `useMutation`) owns every server collection.
- **UI / gameState spine** → Zustand (modals, selected items, temporary forms, the gameState spine).
- **Never** duplicate game state between the two systems.

### API Pattern
```typescript
// Endpoints are namespaced by game id:
/api/games/:gameId/[resource]
/api/games/:gameId/advance-week
/api/games/:gameId/actions
```
Always call backend endpoints through the shared `apiRequest()` helper in `queryClient.ts` — it attaches Clerk JWT tokens automatically.

## Key Files & Their Purpose

### Core Game Logic
- `shared/engine/game-engine.ts` — orchestrates the weekly turn; delegates to processors in `shared/engine/processors/`
- `shared/types/gameTypes.ts` — TypeScript interfaces
- `shared/api/contracts.ts` — API contract / Zod schema definitions
- `shared/schema.ts` — Drizzle schemas + `SNAPSHOT_VERSION`

### Frontend
- `client/src/store/gameStore.ts` — Zustand store (UI + gameState spine)
- `client/src/hooks/` — domain React Query hooks (server collections)
- `client/src/pages/ExecutiveSuitePage.tsx` — weekly action planning UI
- `client/src/components/WeekSummary.tsx` — weekly results display

### Backend
- `server/routes.ts` — thin route registry mounting feature routers
- `server/routes/` — per-feature Express routers (HTTP only)
- `server/storage.ts` — pure database operations
- `server/data/gameData.ts` — pure JSON data access

### Game Content (DO NOT MODIFY WITHOUT CAREFUL CONSIDERATION)
- `data/balance.json` — game balance numbers
- `data/actions.json` — executive meeting content (guarded by `LIVE_EFFECT_KEYS` + a data-lint test)
- `data/roles.json`, `data/artists.json`, `data/events.json`, `data/dialogue.json`
- All JSON data must validate against its Zod schema.

## Common Tasks

### Adding a New Feature
1. Define types in `shared/types/gameTypes.ts`.
2. Add the API contract in `shared/api/contracts.ts`.
3. Implement the endpoint in the relevant `server/routes/<feature>.ts` router (register the full path; add auth middleware per-route).
4. Add / extend a React Query hook in `client/src/hooks/`.
5. Build the UI component.
6. Update the affected docs per the doc-sync rule in root `CLAUDE.md`.

### Debugging Turn Resolution
1. Check `GameEngine.advanceWeek()` and the relevant processor in `shared/engine/`.
2. Inspect the `weeklyActions` table.
3. Verify effects are applied where expected.
4. Check browser console (client) and server logs (backend).

## DO NOT
- ❌ Add game logic anywhere except the GameEngine / its processors
- ❌ Put business logic in routes (HTTP handling only)
- ❌ Put calculations in `gameData.ts` (data access only)
- ❌ Duplicate logic between layers
- ❌ Duplicate state between React Query and Zustand
- ❌ Modify JSON data without updating its Zod schema / types
- ❌ Use `any` without a TODO comment
- ❌ Re-add status/ledger/roadmap content here — it belongs in `../DEVELOPMENT_STATUS.md`

## Validation Commands
```bash
npm run dev          # dev server (single Express process, port 5000, Vite middleware)
npm run check        # TypeScript compilation check
npm test             # run tests once (Vitest)
npm run db:generate  # create migrations from schema.ts
npm run db:push      # apply migrations to the database
npm run db:studio    # visual database browser
```
See root `CLAUDE.md` for the full command set, Railway/migration rules, and the Docker test-DB setup.

---
*This file is evergreen architecture guidance only. Keep it that way — status lives in `../DEVELOPMENT_STATUS.md`.*
