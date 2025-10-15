# Task List: PRD-0006 - Database Maintenance - Orphaned Game Cleanup

Generated from: [0006-prd-database-maintenance-orphaned-games.md](./0006-prd-database-maintenance-orphaned-games.md)

## Relevant Files

### Backend Files
- `server/routes.ts` - Add DELETE /api/game/:gameId endpoint (~line 500), admin stats endpoint (~line 3700), admin cleanup endpoint
- `server/auth.ts` - Already has `requireAdmin` middleware (lines 183-204), no changes needed
- `shared/schema.ts` - CASCADE relationships already exist (lines 28-690), no changes needed
- `server/migrations/orphaned-games-cleanup.ts` - New migration script for one-time cleanup

### Frontend Files
- `client/src/store/gameStore.ts` - Update `createNewGame()` function (lines 318-389) to add orphaned game check and deletion
- `client/src/contexts/GameContext.tsx` - Update useEffect (lines 16-30) to add server fallback for empty localStorage
- `client/src/pages/MainMenuPage.tsx` - Confirmation handler already exists, minor adjustments for deletion feedback
- `client/src/components/ConfirmDialog.tsx` - UI already correct, no changes needed per PRD

### Admin Dashboard (New)
- `client/src/pages/AdminDatabaseHealthPage.tsx` - New admin dashboard page
- `client/src/components/admin/DatabaseStatsPanel.tsx` - New metrics display component
- `client/src/components/admin/DeletionLogTable.tsx` - New deletion log display component
- `client/src/components/admin/CleanupToolPanel.tsx` - New manual cleanup tool component

### Documentation
- `docs/05-backend/backend-architecture.md` - Add DELETE endpoint and orphaned game cleanup documentation
- `docs/06-development/admin-database-maintenance.md` - New admin documentation for database health monitoring

### Testing
- `server/routes.test.ts` - Unit tests for DELETE /api/game/:gameId endpoint
- `client/src/store/gameStore.test.ts` - Unit tests for createNewGame() orphaned game logic
- `server/migrations/orphaned-games-cleanup.test.ts` - Tests for migration script idempotency

## Tasks

### Phase 1: Prevent New Orphaned Data (High Priority)

- [x] 1.0 Implement Game Deletion Endpoint (FR-1)
  - [x] 1.1 Add `DELETE /api/game/:gameId` endpoint in `server/routes.ts` after existing game routes (~line 500)
  - [x] 1.2 Verify requesting user owns the game by comparing `req.userId` with game's `userId`
  - [x] 1.3 Delete game_states record using Drizzle ORM (CASCADE automatically deletes all related records)
  - [x] 1.4 Return 200 with success message on successful deletion
  - [x] 1.5 Return 404 if game not found or user doesn't own the game
  - [x] 1.6 Add error handling for database errors (return 500 with error message)
  - [x] 1.7 Write unit tests in `tests/features/game-deletion-endpoint.test.ts` for DELETE endpoint (success, unauthorized, not found cases)

- [ ] 2.0 Implement Automatic Cleanup on New Game Creation (FR-2, FR-3, FR-4, FR-5)
  - [ ] 2.1 Update `createNewGame()` in `client/src/store/gameStore.ts` (lines 318-389) to check for existing unsaved game
  - [ ] 2.2 Before creating new game, check if `gameState` exists in Zustand store
  - [ ] 2.3 If current game exists, query `GET /api/saves?gameId={currentGameId}` to check for save files
  - [ ] 2.4 If no save files exist, call `DELETE /api/game/:gameId` to delete the unsaved game
  - [ ] 2.5 Log deletion event to console with format: `"Cleaned up unsaved game: {gameId} (Week {week})"`
  - [ ] 2.6 Show neutral toast notification: "Previous unsaved game cleaned up" (3 second duration)
  - [ ] 2.7 Proceed with new game creation after cleanup (existing flow)
  - [ ] 2.8 Update `GameContext.tsx` (lines 16-30) to add server fallback when localStorage is empty
  - [ ] 2.9 If `currentGameId` not in localStorage, fetch user's most recent game from server (`GET /api/game?sort=created_at:desc&limit=1`)
  - [ ] 2.10 Load most recent game as current session and update localStorage
  - [ ] 2.11 Add error handling for case where user has no games (show empty state in MainMenuPage)
  - [ ] 2.12 Write unit tests in `client/src/store/gameStore.test.ts` for cleanup logic
  - [ ] 2.13 Test edge cases: no current game, game with saves, multiple tabs scenario

### Phase 2: Clean Existing Orphaned Data (High Priority)

- [ ] 3.0 Create One-Time Cleanup Migration Script (FR-6, FR-7, FR-8)
  - [ ] 3.1 Create new file `server/migrations/orphaned-games-cleanup.ts`
  - [ ] 3.2 Implement SQL query to identify orphaned games (PRD Section 4, FR-6)
  - [ ] 3.3 Add `--dry-run` flag to preview deletions without executing them
  - [ ] 3.4 Capture "before" metrics: total games, database size, orphaned count
  - [ ] 3.5 Batch delete orphaned games in chunks of 100 (to avoid long transactions)
  - [ ] 3.6 Use database transaction to ensure atomic deletion
  - [ ] 3.7 Capture "after" metrics: total games, database size, records deleted
  - [ ] 3.8 Log results to console with summary: "Deleted {count} orphaned games, reclaimed {MB} MB"
  - [ ] 3.9 Make script idempotent (safe to run multiple times - re-query orphaned games on each run)
  - [ ] 3.10 Add CLI command to run script: `npm run migrate:cleanup-orphaned`
  - [ ] 3.11 Write tests in `server/migrations/orphaned-games-cleanup.test.ts` for idempotency and dry-run mode
  - [ ] 3.12 Document expected metrics in script header comments

### Phase 3: Long-Term Monitoring (Medium Priority)

- [ ] 4.0 Build Admin Dashboard for Database Health Monitoring (FR-9, FR-10, FR-11)
  - [ ] 4.1 Add `GET /api/admin/database-stats` endpoint in `server/routes.ts` (~line 3700, near other admin routes)
  - [ ] 4.2 Implement stats query: orphaned games count, total games, orphaned percentage, database size
  - [ ] 4.3 Implement query for top users by orphaned games (with hashed user IDs)
  - [ ] 4.4 Add `requireClerkUser` and `requireAdmin` middleware to stats endpoint
  - [ ] 4.5 Return stats in JSON format (see PRD Appendix B for structure)
  - [ ] 4.6 Add `POST /api/admin/cleanup-orphaned-games` endpoint to trigger manual cleanup
  - [ ] 4.7 Implement cleanup endpoint to execute migration script logic (reuse from Task 3.0)
  - [ ] 4.8 Return before/after metrics in cleanup response
  - [ ] 4.9 Create new admin page `client/src/pages/AdminDatabaseHealthPage.tsx`
  - [ ] 4.10 Add route protection to require admin authentication (use Clerk's user metadata)
  - [ ] 4.11 Create `DatabaseStatsPanel.tsx` component to display current metrics using shadcn/ui Card
  - [ ] 4.12 Create `DeletionLogTable.tsx` component to display recent deletions using shadcn/ui Table
  - [ ] 4.13 Create `CleanupToolPanel.tsx` component with "Run Cleanup" button (destructive variant)
  - [ ] 4.14 Implement "Run Cleanup" flow: preview → confirmation dialog → execute → show results
  - [ ] 4.15 Add refresh button to reload stats without page refresh
  - [ ] 4.16 Update deletion logging throughout app to include all FR-10 fields (timestamp, userId hash, gameId, week, reason, related record counts)
  - [ ] 4.17 Store deletion logs in application logs (use console.log with structured format for now)
  - [ ] 4.18 Match dark plum/burgundy theme (use existing brand color variables from Tailwind config)

### Documentation and Testing

- [ ] 5.0 Documentation and Testing
  - [ ] 5.1 Update `docs/05-backend/backend-architecture.md` with DELETE endpoint documentation
  - [ ] 5.2 Document orphaned game cleanup flow in backend architecture docs
  - [ ] 5.3 Create new file `docs/06-development/admin-database-maintenance.md` with admin dashboard guide
  - [ ] 5.4 Add inline code comments in `gameStore.createNewGame()` explaining cleanup logic
  - [ ] 5.5 Add inline code comments in DELETE endpoint explaining CASCADE behavior
  - [ ] 5.6 Add safety notes in migration script header comments
  - [ ] 5.7 Run `npm run check` to verify no TypeScript errors
  - [ ] 5.8 Run `npm test` to verify all existing tests pass
  - [ ] 5.9 Manual testing: Create game → start new game without saving → verify deletion
  - [ ] 5.10 Manual testing: Create game → save game → start new game → verify saved game persists
  - [ ] 5.11 Manual testing: Open two tabs → create new game in one tab → verify other tab syncs
  - [ ] 5.12 Manual testing: Clear localStorage → reload app → verify most recent game loads from server
  - [ ] 5.13 Manual testing: Run migration script in dry-run mode → verify output
  - [ ] 5.14 Manual testing: Run migration script → verify orphaned games deleted and metrics accurate
  - [ ] 5.15 Manual testing: Access admin dashboard (requires admin role) → verify all panels display correctly

---

## Phase Breakdown

**Phase 1**: Tasks 1.0, 2.0 - Prevent New Orphaned Data (High Priority)
**Phase 2**: Task 3.0 - Clean Existing Orphaned Data (High Priority)
**Phase 3**: Task 4.0 - Long-Term Monitoring (Medium Priority)
**Documentation**: Task 5.0 - Documentation and Testing

---

## ⚠️ CRITICAL NOTE FOR NEXT DEVELOPER

**Task 1.0 is COMPLETE** - All tests passing (4/4) ✅

**Key Lesson Learned:** `drizzle-kit push` does NOT update existing foreign key constraints when you add CASCADE. To fix CASCADE in existing databases:
1. **Production (Railway):** Already wiped clean and rebuilt with correct CASCADE ✅
2. **Test Database:** Must be deleted and recreated from scratch (not just wiped) ✅
3. **Solution:** `docker stop music-label-test && docker rm music-label-test` then recreate container + `drizzle-kit push`

**Commits:**
- `7c55ee3` - DELETE endpoint implementation
- `e04c2bd` - CASCADE schema changes + cleanup scripts

**Ready for Task 2.0** - Automatic cleanup on new game creation

---

## Implementation Notes

- **CASCADE Deletes**: ✅ **FULLY IMPLEMENTED** - All foreign keys now have proper CASCADE delete:
  - ✅ All gameId foreign keys: artists, roles, projects, songs, releases, emails, executives, moodEvents, weeklyActions, chartEntries, musicLabels
  - ✅ All artistId foreign keys: songs, projects, releases, moodEvents
  - ✅ All constraints include `.notNull()` where required
  - ✅ Verified working in tests (all 4 tests pass)
- **Multi-Tab Sync**: BroadcastChannel ('music-label-manager-game') already handles tab synchronization in `GameContext.tsx` (lines 32-52). No additional work needed beyond existing implementation.
- **Save Detection**: Use existing `GET /api/saves` endpoint with gameId filter to check if current game has any saves.
- **Admin Authentication**: Use existing `requireAdmin` middleware from `server/auth.ts` (lines 183-204). Checks Clerk user's `privateMetadata.role === 'admin'`.
- **Error Handling**: Follow existing patterns in `server/routes.ts` for consistent error responses.
- **Testing Database**: Use `createTestDatabase()` from `tests/helpers/test-db` for all tests (never import `server/db` directly).

---

**Next Steps**: Review task breakdown, then begin implementation starting with Phase 1 (Tasks 1.0 and 2.0).
