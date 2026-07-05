# AI Assistant Instructions for Music Label Manager

## Quick Context
You're working on **Top Roles: Music Label Manager**, a browser-based music industry simulation game. This is a monorepo with React (Vite) frontend, Express backend, PostgreSQL database (Railway, `pg` driver), Clerk auth, and shared TypeScript code.

> ⚠️ **Parts of this document below this section are stale (Aug 2025, Neon/Replit era).** `../DEVELOPMENT_STATUS.md` is the single source of truth for current status; root `CLAUDE.md` has the current commands and conventions. A full reconciliation of this file is pending.

## Current State (Updated: July 4, 2026 — Exec Meetings Revival executed AND playtested; 12 playtest fixes + C69 on PR #119, still unmerged)
**Latest Session (July 4, playtest pass)**: Nes playtested `feat/exec-meetings-revival` and every actionable finding was fixed onto the SAME PR #119 (one-merge-at-end policy): meeting-row dedup + delayed-effect labels + CEO reframe (#1/#3/#7), calendar week-nav (#5), venue booking gating + range rule (#6/#8/C67), talent surfaced on 7 UI surfaces + the `ready-for-release` endpoint (#4), tour milestone labels + net-profit email (#9/C68, #12), CC-budget-aware AUTO-select (#11), and route-agnostic Weekly Results popup (#2). Also fixed **C69** (pre-existing ~9mo `getArtistSync` bug that silently zeroed marketing awareness gain). The two design discussions (effect legibility; meeting relevance/"fakeness") were elevated to `[FUTURE]` planning docs and the playtest notes archived. Suite 1,013 → **1,189 tests**, tsc clean. See DEVELOPMENT_STATUS.md's July 4 entry. **Prior arc — Executive Meetings Revival EXECUTED** — the interactivity-gap case file's headline finding (71 dead meeting effect keys) was fixed end-to-end in a 9-PR arc on branch `feat/exec-meetings-revival` (**PR #119, NOT yet merged — Nes is playtesting first**). All meeting effects are now real: 14 canonical live keys across 5 new effect channels (press, quality, awareness, variance, award), zero dead keys in any content file (data-lint test guards forever), all 6 free-money traps fixed (no-dominant-choice test), chart milestones pay reputation, exec mood scales meeting costs/effects via a shared engine≡preview util, AUTO-select is risk-averse, and WeekSummary has a meetings card. Suites 776 → 1,013 tests. See DEVELOPMENT_STATUS.md's July 3–4 entry for the full arc + verifier-caught bugs. Prior session (July 3): **Interactivity Gap Analysis** — a read-only, adversarially-verified case file on where the simulation is hollow (`docs/98-research/INTERACTIVITY_GAP_ANALYSIS_2026-07-03.md`): random side events roll weekly but are never shown or applied (still open); the awareness economy was fully live with zero player UI (now has a first Buzz readout). Backlog C42/C43 premises corrected; debt C60–C66 logged. Earlier the same day (parallel sessions): **Phase 3.5** (TanStack owns the gameState spine, PRs #98–#111), **D6** (whole-week atomic transaction + FOR UPDATE), and **Phase 4 game feel** (PRs #100–#118: staged WeekSummary reveal, anticipation beat, celebrations, sound, HoloDisc pulse) all completed and merged. Prior session context: **Phase 3 (client state ownership)** end-to-end (PRs #87–#96, all merged): TanStack Query now owns every server collection (songs/releases/releaseSongs/projects/artists/discoveredArtists/executives/charts/emails) via domain hooks in `client/src/hooks/`; the store fan-out seeds the caches (`fetchGameBundle` + `setQueryData`); money/creativeCapital are server-canonical (`adoptServerBalances` — no client-side balance arithmetic remains). Also cleared the backlog: C49 (stale inbox after restore) and C26 (ArtistPage 1,180→369 lines, split into memoized tabs) fixed; C32/C42/C43 formally deferred by product decision; C50/C51 newly logged. A post-session live smoke found and fixed a real regression: **show/tour booking had been 400-ing since PR #68** (the hardening schema required `songCount > 0`; tours send 0) — fixed with regression tests, user-verified live. Fresh-context verifier: all 8 Phase 3 acceptance criteria MEET SPEC.
- **Tech Stack**: React 18 + Vite, Express, PostgreSQL (Railway), Clerk auth, TypeScript, Zustand, React Query, XState
- **Architecture**: `routes.ts` is a thin ~121-line registry mounting 16 feature routers (`server/routes/`) with extracted services (**Phase 1 complete**). The engine is decomposed: `shared/engine/game-engine.ts` (~1,136 lines) orchestrates 8 processor modules in `shared/engine/processors/` (**Phase 2 complete**), seeded-RNG deterministic with a golden-master harness (`tests/engine/`). Client state ownership is domain-split (**Phase 3 complete**): TanStack Query = server collections, Zustand = gameState spine + session/UI, XState = flows; `tests/client/` holds the characterization net incl. a query-key contract test.
- **CI**: vitest suite (774+ tests, 0 skipped) + Playwright in `.github/workflows/playwright.yml`
- **Current Phase**: the Phase 0→4 scaling arc is **fully complete**; the **Executive Meetings Revival is executed but UNMERGED** (`feat/exec-meetings-revival`, PR #119 — awaiting Nes's playtest + one merge). Next after merge: the deferred meeting slices (success/failure rolls, Level/XP), wiring the phantom side-events system (now unblocked — events.json is key-clean), and backlog C58/C60/C62/C66.

## Completed Major Systems ✅
1. ✅ **Single Source of Truth Architecture** - GameEngine handles ALL business logic, zero duplication
2. ✅ **Unified Game Engine** - Complete in `shared/engine/game-engine.ts` with ALL calculations
3. ✅ **Artist Signing System** - Full discovery, signing, and management
4. ✅ **Project Creation** - Singles, EPs, Mini-Tours with comprehensive modals
5. ✅ **Project Revenue System** - Projects generate revenue, streams, and press coverage on completion
6. ✅ **Dialogue System** - Role meetings with immediate/delayed effects
7. ✅ **Save/Load System** - Multiple slots with export/import capability
8. ✅ **Weekly Turn System** - 3-action planning with resource management
9. ✅ **Access Tier Progression** - Playlist, Press, Venue tier advancement
10. ✅ **Week Summary Display** - Shows detailed results after week advancement
11. ✅ **Clean Layer Separation** - Routes (HTTP only), GameData (data only), GameEngine (logic only)
12. ✅ **Phase 1 & 2 UI/UX Enhancements** - Complete user experience with strategic recommendations

## Key Files & Their Purpose

### Core Game Logic
- `shared/engine/game-engine.ts` - SINGLE SOURCE OF TRUTH for ALL business logic (project advancement, economic calculations, revenue processing)
- `shared/types/gameTypes.ts` - All TypeScript interfaces
- `shared/api/contracts.ts` - API endpoint definitions

### Frontend
- `client/src/store/gameStore.ts` - Zustand store (game state management)
- `client/src/components/Dashboard.tsx` - Main game interface
- `client/src/pages/ExecutiveSuitePage.tsx` - Weekly action planning UI (renders `ExecutiveMeetings` + `SelectionSummary`)
- `client/src/components/WeekSummary.tsx` - Weekly results display
- `client/src/components/ProjectCreationModal.tsx` - Project creation interface

### Backend
- `server/routes.ts` - Thin route registry (~121 lines): mounts feature routers, exports `createServer`
- `server/routes/` - Per-feature Express routers (emails, games, saves, releases, artists, projects, executives, arOffice, charts, tour, gameLoop, admin, content, devTools, bugReports, analytics); HTTP handling ONLY (delegates ALL business logic to GameEngine)
- `server/storage.ts` - Pure database operations ONLY
- `server/data/gameData.ts` - Pure JSON data access ONLY (NO calculations or business logic)

### Game Content (DO NOT MODIFY WITHOUT CAREFUL CONSIDERATION)
- `data/balance.json` - All game balance numbers (includes project revenue formulas)
- `data/roles.json` - 5 industry roles 
- `data/artists.json` - 6 unique artists with archetypes
- `data/events.json` - 12 side events
- `data/dialogue.json` - Additional artist dialogues

## Important Design Decisions

### State Management
- **Server State**: Use React Query (`useQuery`, `useMutation`)
- **UI State**: Use Zustand (modals, selected items, temporary forms)
- **Never**: Duplicate game state between both systems

### API Pattern
```typescript
// All endpoints follow this pattern:
/api/games/:gameId/[resource]
/api/games/:gameId/advance-week
/api/games/:gameId/actions
```

### Architecture Rules (CRITICAL - NEWLY ENFORCED)
1. **GameEngine is single source of truth** - ALL business logic lives here ONLY
2. **Routes.ts handles HTTP concerns ONLY** - No business logic, delegates everything to GameEngine
3. **GameData.ts provides data access ONLY** - No calculations, just JSON file loading
4. **Storage.ts handles database ONLY** - Pure CRUD operations, no business logic
5. **Client previews only** - Client can show calculations but doesn't save

## Common Tasks

### Adding a New Feature
1. Define types in `shared/types/gameTypes.ts`
2. Add API contract in `shared/api/contracts.ts`
3. Implement server endpoint in the relevant `server/routes/<feature>.ts` router (register the full path; add auth middleware per-route)
4. Create React Query hook in `client/src/features/[feature]/hooks/`
5. Build UI component
6. Update this document

### Modifying Game Balance
1. Edit values in `data/balance.json`
2. Run validation: `npm run validate` (if exists)
3. Test in game
4. Document change in CHANGELOG.md

### Debugging Turn Resolution
1. Check `GameEngine.advanceWeek()` in shared/engine
2. Look at `weeklyActions` table in database
3. Verify effects are being applied in `applyEffects()`
4. Check browser console for client errors
5. Check server logs for backend errors

## Testing Approach
- Unit tests: Calculations in GameEngine
- Integration tests: API endpoints
- E2E tests: Complete week cycle
- Manual tests: Dialogue flows, UI interactions

## Previous Issues - ALL RESOLVED ✅
1. ✅ **API Mismatch**: Server routes don't match contracts.ts - FIXED
2. ✅ **Hard-coded IDs**: Some components use hard-coded game IDs - FIXED  
3. ✅ **Duplicate Logic**: Some calculations exist in both client and server - **ELIMINATED**
4. ✅ **Missing Features**: Dialogue UI, project pipelines, event triggers - ALL IMPLEMENTED
5. ✅ **Project Stage Advancement Split**: Routes.ts vs GameEngine logic - **CONSOLIDATED**
6. ✅ **Duplicate Streaming Calculations**: GameData.ts vs GameEngine methods - **ELIMINATED**
7. ✅ **Business Logic in Data Layer**: Economic calculations in wrong layer - **MOVED TO GameEngine**

## Replit-Specific Notes
- Database: PostgreSQL via Neon (connection string in Secrets)
- Deployment: Use Replit's deployment feature
- Storage: No localStorage limits, but prefer database
- Resources: 4 vCPUs, 8 GiB memory on Core plan

## Code Style Guide
```typescript
// Use descriptive names
const calculateStreamingRevenue = () => {}

// Document complex logic
/**
 * Calculates streaming revenue using quality, playlist access,
 * reputation, and marketing spend as inputs
 */

// Prefer types over interfaces for unions
type ProjectType = 'single' | 'ep' | 'tour';

// Use Zod for runtime validation
const schema = z.object({ ... });
```

## When Stuck
1. Check this document first
2. Look at similar code in the codebase
3. Check `shared/types/gameTypes.ts` for data structures
4. Review `data/balance.json` for game mechanics
5. Ask: "Is this a client, server, or shared concern?"

## DO NOT
- ❌ Add game logic ANYWHERE except GameEngine
- ❌ Put business logic in routes.ts (HTTP handling only)
- ❌ Put calculations in gameData.ts (data access only)
- ❌ Duplicate logic between layers
- ❌ Modify JSON data without updating types
- ❌ Use `any` type without TODO comment
- ❌ Skip documentation for new features
- ❌ Duplicate state between React Query and Zustand

## Quick Commands
```bash
# Start development
npm run dev

# Run tests (when implemented)
npm test

# Check types
npm run type-check

# Database operations
npm run db:push
npm run db:seed
```

## Recent Changes
- **August 20, 2025: CRITICAL ARCHITECTURAL MIGRATION COMPLETED**
  - **Single Source of Truth**: GameEngine now handles ALL business logic
  - **Project Advancement**: Moved ALL logic from routes.ts to GameEngine.advanceProjectStages()
  - **Economic Calculations**: Moved calculateEnhancedProjectCost, calculatePerSongProjectCost, calculateEconomiesOfScale from gameData.ts to GameEngine
  - **Duplicate Logic Elimination**: Removed duplicate methods from gameData.ts
  - **Clean Separation**: Routes.ts = HTTP only, GameData.ts = data only, GameEngine = logic only
- August 18, 2025: **Phase 1 & 2 UI/UX Enhancements Completed**
- December 18, 2024: Fixed project revenue generation system
- December 18, 2024: Integrated MonthSummary display for advancement results
- August 18, 2025: Unified game engine created in shared/engine
- August 18, 2025: Completed artist signing system
- August 18, 2025: Implemented save/load functionality

---

*Keep this document updated as the codebase evolves!*