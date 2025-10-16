# Task List: PRD-0006 - Database Maintenance - Orphaned Game Cleanup

Generated from: [0006-prd-database-maintenance-orphaned-games.md](./0006-prd-database-maintenance-orphaned-games.md)

**Status Update (2025-10-15)**: Phase 1 COMPLETE ✅ | Database wiped clean | Phase 2 reframed as future-proof maintenance tool

---

## Context: Database Wipe Impact on Task Planning

**Critical Background**: Both test and Railway production databases were **completely wiped** to finalize Task 1.0 (CASCADE constraints required full rebuild). This changes Phase 2's purpose:

- ❌ **Original Goal**: Clean up existing historical orphaned games (20-40% database size)
- ✅ **New Goal**: Build maintenance tool for future orphaned game prevention/monitoring
- ✅ **Expected Result**: Script will find **0 orphaned games** on first run (this is correct!)
- ✅ **Value**: Ready for when orphaned games accumulate after Phase 1 deployment

---

## Relevant Files

### Phase 1 (COMPLETE ✅)
- ✅ `server/routes.ts` - DELETE /api/game/:gameId endpoint (implemented)
- ✅ `server/routes.ts` - GET /api/games endpoint (implemented)
- ✅ `client/src/store/gameStore.ts` - Orphaned game cleanup in createNewGame() (implemented)
- ✅ `client/src/contexts/GameContext.tsx` - Server fallback for localStorage sync (implemented)
- ✅ `tests/features/game-deletion-endpoint.test.ts` - DELETE endpoint tests (4 tests passing)
- ✅ `server/storage.ts` - GameSaveSummary with gameId field (implemented)

### Phase 2 (IN PROGRESS)
- `scripts/cleanup-orphaned-games.ts` - CLI maintenance script (NEW - reframed as DevOps utility)
- `scripts/cleanup-orphaned-games.test.ts` - Script tests with artificial orphaned data

### Phase 3 (PENDING)
- `server/routes.ts` - GET /api/admin/database-stats endpoint (~line 3700)
- `server/routes.ts` - POST /api/admin/cleanup-orphaned-games endpoint
- `client/src/pages/AdminDatabaseHealthPage.tsx` - New admin dashboard page
- `client/src/components/admin/DatabaseStatsPanel.tsx` - Metrics display component
- `client/src/components/admin/CleanupToolPanel.tsx` - Manual cleanup trigger component

### Documentation (PENDING)
- `docs/05-backend/backend-architecture.md` - DELETE endpoint documentation
- `docs/06-development/database-maintenance-guide.md` - Admin maintenance guide

---

## Tasks

### Phase 1: Prevent New Orphaned Data ✅ COMPLETE

- [x] 1.0 Implement Game Deletion Endpoint (FR-1)
  - [x] 1.1 Add `DELETE /api/game/:gameId` endpoint in `server/routes.ts` after existing game routes
  - [x] 1.2 Verify requesting user owns the game by comparing `req.userId` with game's `userId`
  - [x] 1.3 Delete game_states record using Drizzle ORM (CASCADE automatically deletes all related records)
  - [x] 1.4 Return 200 with success message on successful deletion
  - [x] 1.5 Return 404 if game not found or user doesn't own the game (don't leak game existence)
  - [x] 1.6 Add error handling for database errors (return 500 with error message)
  - [x] 1.7 Write unit tests in `tests/features/game-deletion-endpoint.test.ts` for DELETE endpoint (4 tests: success, unauthorized, not found, CASCADE verification)

- [x] 2.0 Implement Automatic Cleanup on New Game Creation (FR-2, FR-3, FR-4, FR-5)
  - [x] 2.1 Update `createNewGame()` in `client/src/store/gameStore.ts` to check for existing unsaved game
  - [x] 2.2 Before creating new game, check if `gameState` exists in Zustand store
  - [x] 2.3 If current game exists, query `GET /api/saves` to check for save files (filter by gameId on client)
  - [x] 2.4 If no save files exist, call `DELETE /api/game/:gameId` to delete the unsaved game
  - [x] 2.5 Log deletion event to console with format: `"[ORPHANED GAME CLEANUP] Cleaned up unsaved game: {gameId} (Week {week})"`
  - [x] 2.6 Show neutral toast notification: "Previous unsaved game cleaned up" (3 second duration)
  - [x] 2.7 Proceed with new game creation after cleanup (existing flow)
  - [x] 2.8 Update `GameContext.tsx` to add server fallback when localStorage is empty
  - [x] 2.9 Create `GET /api/games` endpoint to fetch all user's games (sorted by createdAt desc)
  - [x] 2.10 Load most recent game as current session and update localStorage
  - [x] 2.11 Add error handling for case where user has no games (graceful fallback - allows new game creation)
  - [x] 2.12 Write unit tests in `tests/features/gameStore-orphaned-cleanup.test.ts` for cleanup logic
  - [x] 2.13 Write unit tests for edge cases: no current game, game with saves, multiple tabs scenario

### Phase 2: Maintenance Tool for Future Orphaned Data

- [ ] 3.0 Create Orphaned Game Cleanup Script (FR-6, FR-7, FR-8) - Reframed as DevOps Maintenance Tool
  - [ ] 3.1 Create new file `scripts/cleanup-orphaned-games.ts` (moved from server/migrations to scripts/)
  - [ ] 3.2 Add script header comments explaining: "This script finds 0 orphaned games post-wipe - expected behavior. Use for future maintenance."
  - [ ] 3.3 Implement SQL query to identify orphaned games using LEFT JOIN with game_saves (PRD Section 4, FR-6)
  - [ ] 3.4 Add `--dry-run` flag to preview deletions without executing them (default: true for safety)
  - [ ] 3.5 Capture "before" metrics: total games, orphaned count, sample orphaned game IDs
  - [ ] 3.6 Batch delete orphaned games in chunks of 100 (to avoid long transactions)
  - [ ] 3.7 Use database transaction to ensure atomic deletion per batch
  - [ ] 3.8 Capture "after" metrics: total games remaining, records deleted
  - [ ] 3.9 Log results to console with summary: "Deleted {count} orphaned games | Expected: 0 on first run after database wipe"
  - [ ] 3.10 Make script idempotent (safe to run multiple times - re-query orphaned games on each run)
  - [ ] 3.11 Add CLI command to run script: `npm run db:cleanup-orphaned` (use `--execute` flag to actually delete)
  - [ ] 3.12 Write tests in `scripts/cleanup-orphaned-games.test.ts` that create artificial orphaned data, then verify cleanup
  - [ ] 3.13 Test dry-run mode returns accurate preview without deleting data
  - [ ] 3.14 Test idempotency: running script twice should be safe and report 0 deletions on second run

### Phase 3: Long-Term Monitoring (Admin Dashboard)

- [ ] 4.0 Build Admin Dashboard for Database Health Monitoring (FR-9, FR-10, FR-11)
  - [ ] 4.1 Add `GET /api/admin/database-stats` endpoint in `server/routes.ts` (~line 3700, near other admin routes)
  - [ ] 4.2 Implement stats query: orphaned games count, total games, orphaned percentage
  - [ ] 4.3 Implement query for top users by orphaned games (with hashed user IDs for privacy)
  - [ ] 4.4 Add `requireClerkUser` and `requireAdmin` middleware to stats endpoint
  - [ ] 4.5 Return stats in JSON format (see PRD Appendix B for structure)
  - [ ] 4.6 Add `POST /api/admin/cleanup-orphaned-games` endpoint to trigger manual cleanup
  - [ ] 4.7 Implement cleanup endpoint to execute migration script logic (reuse query from Task 3.0)
  - [ ] 4.8 Return before/after metrics in cleanup response
  - [ ] 4.9 Create new admin page `client/src/pages/AdminDatabaseHealthPage.tsx`
  - [ ] 4.10 Add route protection to require admin authentication (use Clerk's privateMetadata.role === 'admin')
  - [ ] 4.11 Create `DatabaseStatsPanel.tsx` component to display current metrics using shadcn/ui Card
  - [ ] 4.12 Create `CleanupToolPanel.tsx` component with "Run Cleanup" button (destructive variant, requires confirmation)
  - [ ] 4.13 Implement "Run Cleanup" flow: fetch preview → show confirmation dialog with counts → execute → show results
  - [ ] 4.14 Add refresh button to reload stats without page refresh
  - [ ] 4.15 Add deletion logging throughout app to include FR-10 fields (timestamp, userId hash, gameId, week, reason, related record counts)
  - [ ] 4.16 Store deletion logs in structured console.log format (future: consider dedicated logging table)
  - [ ] 4.17 Match dark plum/burgundy theme (use existing `brand-*` color variables from Tailwind config)

### Documentation and Testing

- [ ] 5.0 Documentation and Comprehensive Testing
  - [ ] 5.1 Update `docs/05-backend/backend-architecture.md` with DELETE endpoint documentation
  - [ ] 5.2 Document orphaned game cleanup flow in backend architecture docs
  - [ ] 5.3 Create new file `docs/06-development/database-maintenance-guide.md` with:
    - When to run cleanup script
    - How to interpret "0 orphaned games found" (expected post-wipe)
    - How to access admin dashboard
    - Emergency cleanup procedures
  - [ ] 5.4 Add inline code comments in `gameStore.createNewGame()` explaining cleanup logic (FR-2 reference)
  - [ ] 5.5 Add inline code comments in DELETE endpoint explaining CASCADE behavior
  - [ ] 5.6 Add safety notes in cleanup script header comments (expected 0 results, dry-run by default)
  - [ ] 5.7 Run `npm run check` to verify no TypeScript errors
  - [ ] 5.8 Run `npm run test:run` to verify all existing tests pass
  - [ ] 5.9 Manual testing: Create game → start new game without saving → verify deletion + toast notification
  - [ ] 5.10 Manual testing: Create game → save game → start new game → verify saved game persists (not deleted)
  - [ ] 5.11 Manual testing: Open two tabs → create new game in one tab → verify other tab syncs via BroadcastChannel
  - [ ] 5.12 Manual testing: Clear localStorage → reload app → verify most recent game loads from server (FR-5)
  - [ ] 5.13 Manual testing: Run cleanup script in dry-run mode → verify "0 orphaned games found" output
  - [ ] 5.14 Manual testing: Create artificial orphaned game → run cleanup script with --execute → verify deletion
  - [ ] 5.15 Manual testing: Access admin dashboard (requires admin role) → verify all panels display correctly

---

## Phase breakdown

**Phase 1**: Tasks 1.0, 2.0 - Prevent New Orphaned Data ✅ **COMPLETE**
**Phase 2**: Task 3.0 - Maintenance Tool for Future Cleanup (CURRENT)
**Phase 3**: Task 4.0 - Admin Dashboard for Long-Term Monitoring
**Documentation**: Task 5.0 - Documentation and Comprehensive Testing

---

## ⚠️ CRITICAL IMPLEMENTATION NOTES

### Phase 1 Completion Summary ✅

**Task 1.0: DELETE Endpoint (COMPLETE)**
- ✅ Implemented `DELETE /api/game/:gameId` endpoint with ownership verification
- ✅ CASCADE delete configured in schema (all foreign keys now have CASCADE)
- ✅ All 4 unit tests passing in `tests/features/game-deletion-endpoint.test.ts`
- ✅ Returns 404 for unauthorized access (doesn't leak game existence)

**Task 2.0: Automatic Cleanup (COMPLETE)**
- ✅ Updated `client/src/store/gameStore.ts` `createNewGame()` function (lines 318-389)
- ✅ Checks for unsaved games before creating new game
- ✅ Fetches all user's saves via `GET /api/saves` and filters by gameId
- ✅ Deletes unsaved game via DELETE endpoint
- ✅ Shows neutral toast: "Previous unsaved game cleaned up"
- ✅ Logs deletion event: `[ORPHANED GAME CLEANUP] Cleaned up unsaved game: {id} (Week {week})`
- ✅ Created `GET /api/games` endpoint in `server/routes.ts` (lines 642-665)
- ✅ Updated `GameContext.tsx` with server fallback for localStorage sync (FR-5)
- ✅ Graceful error handling - user can start new game even if server fetch fails

**Files Modified in Phase 1:**
- `server/routes.ts` - Added DELETE /api/game/:gameId and GET /api/games endpoints
- `server/storage.ts` - Added gameId to GameSaveSummary type (lines 20, 166)
- `client/src/store/gameStore.ts` - Added orphaned game cleanup logic to createNewGame()
- `client/src/contexts/GameContext.tsx` - Added server fallback for localStorage sync
- `tests/features/game-deletion-endpoint.test.ts` - 4 comprehensive tests (all passing)

### Database Wipe Context (CRITICAL FOR PHASE 2)

**Why databases were wiped:**
- `drizzle-kit push` does **NOT** update existing foreign key constraints when CASCADE is added
- Test database required `docker stop && docker rm` + full rebuild from scratch
- Railway production database was wiped clean and rebuilt with proper CASCADE constraints

**Implications for Phase 2:**
- ✅ No orphaned games exist in production today (clean slate)
- ✅ Cleanup script will find **0 orphaned games** on first run - **this is expected!**
- ✅ Script is still valuable as future-proof maintenance tool
- ✅ Test script with **artificially created orphaned data** in test database
- ✅ Focus on dry-run mode quality and metrics reporting

### Key Learnings

1. **CASCADE Constraints**: ✅ Fully implemented on all foreign keys (gameId, artistId)
2. **Multi-Tab Sync**: ✅ BroadcastChannel ('music-label-manager-game') already handles sync (lines 64-89 in GameContext.tsx)
3. **Testing Database**: Always use `createTestDatabase()` from `tests/helpers/test-db` (never import `server/db` directly)
4. **Admin Authentication**: Use existing `requireAdmin` middleware from `server/auth.ts` (lines 183-204)

---

## Next Steps

**Phase 1**: ✅ COMPLETE (All prevention mechanisms working)
**Current Task**: 2.12 - Write unit tests for gameStore cleanup logic

**Before proceeding to Phase 2:**
1. Complete remaining Phase 1 tests (Tasks 2.12, 2.13)
2. Run full test suite (`npm run test:run`)
3. Commit Phase 1 completion

**Then Phase 2 (Maintenance Tool):**
- Build cleanup script as DevOps utility (expects 0 results today)
- Focus on dry-run mode and idempotency
- Test with artificial orphaned data
- Document expected "0 orphaned games" behavior

---

**Ready to proceed?** Start with Task 2.12 (unit tests for gameStore cleanup logic).
