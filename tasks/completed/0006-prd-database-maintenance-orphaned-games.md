# PRD-0006: Database Maintenance - Orphaned Game Cleanup

**Status**: Draft
**Created**: 2025-01-15
**Priority**: High
**Category**: Infrastructure, Database Maintenance

---

## 1. Introduction/Overview

### Problem Statement
When users start a new game without saving their current game, the previous game's database records (game state, artists, projects, songs, releases, emails, executives, mood events, weekly actions, chart entries, and music label) remain in the database but become **orphaned**—they have no save file referencing them and no way for users to access them. This creates database bloat and wasted resources.

**Example Scenario**:
1. User starts Game A → Creates 150+ database rows
2. User plays for 10 weeks → Creates 200+ more rows
3. User clicks "New Game" without saving → Game B is created
4. Game A's 350+ rows remain in database as inaccessible junk data

### Current State
- Games persist immediately to database (for cross-session continuity)
- Explicit save/load system exists for named saves
- No cleanup mechanism for unsaved games
- No DELETE endpoint for games
- Confirmation dialog warns users but doesn't clean up data

### Goal
Implement automatic cleanup of unsaved games when users start new games, clean existing orphaned data, and provide admin tools to monitor database health. This aligns the architecture with the explicit save/load pattern users expect.

---

## 2. Goals

1. **Stop Future Database Bloat**: Automatically delete unsaved games when users start new games
2. **Reclaim Storage**: Clean up all existing orphaned game data
3. **Align Architecture**: Match user mental model ("I didn't save = it's gone")
4. **Enable Monitoring**: Provide admin dashboard to track orphaned games and database health
5. **Maintain User Trust**: No data loss for saved games, clear communication about unsaved games
6. **Improve Performance**: Reduce database size and query load

---

## 3. User Stories

### Primary User Stories

**US-1: As a player**, I want my unsaved games to be automatically cleaned up when I start a new game, so the database doesn't accumulate junk data I'll never access.

**US-2: As a player**, I want clear confirmation before starting a new game, so I understand my unsaved game will be lost.

**US-3: As a player**, I want my explicitly saved games to always be preserved, so I can safely manage multiple playthroughs.

**US-4: As a player**, I want the app to handle multiple browser tabs gracefully, so my active game stays consistent across tabs.

**US-5: As a player**, I want the app to recover my most recent game if localStorage gets cleared, so I don't lose progress unexpectedly.

### Admin/Developer Stories

**US-6: As an admin**, I want a dashboard showing orphaned game statistics, so I can monitor database health.

**US-7: As a developer**, I want logging for game deletion events, so I can track cleanup operations and debug issues.

**US-8: As a developer**, I want a one-time migration script to clean historical orphaned data, so the database starts fresh.

---

## 4. Functional Requirements

### Phase 1: Prevent New Orphaned Data (High Priority)

#### FR-1: Game Deletion Endpoint
The system must provide a `DELETE /api/game/:gameId` endpoint that:
- Verifies the requesting user owns the game
- Deletes the game_states record (CASCADE deletes handle all related records)
- Returns success confirmation
- Returns 404 if game not found or unauthorized

#### FR-2: Automatic Cleanup on New Game Creation
When a user creates a new game, the system must:
- Check if a current game exists (from gameState in Zustand store)
- Query `/api/saves` to check if current game has any save files
- If no save files exist, call `DELETE /api/game/:gameId` to delete the unsaved game
- Log the deletion event for monitoring
- Then proceed with new game creation as normal

#### FR-3: Enhanced User Confirmation
The existing confirmation dialog must:
- Continue to show when user has an active game (week > 1)
- Display current game name and week number
- Warn that unsaved game will be permanently deleted
- Provide "Save First (Recommended)" option that opens Save/Load modal
- Provide "Start New Game" option that confirms deletion and creates new game
- Include an "X" close button to cancel the operation

#### FR-4: Multi-Tab Synchronization
The system must handle multiple browser tabs:
- Use existing BroadcastChannel ('music-label-manager-game') to sync gameId changes
- When a new game is created in one tab, other tabs receive 'game-selected' event
- Other tabs automatically load the new game state
- No additional warning needed (existing GameContext handles this)

#### FR-5: Server State Recovery
When the app loads and localStorage is out of sync:
- GameContext checks localStorage for 'currentGameId'
- If not found, the system should fetch user's most recent game from server (by created_at)
- Load that game as the current session
- Update localStorage with the recovered gameId

### Phase 2: Clean Existing Orphaned Data (High Priority)

#### FR-6: Orphaned Games Identification Query
The system must provide a SQL query to identify orphaned games:
```sql
SELECT gs.id, gs.user_id, gs.created_at, gs.current_week
FROM game_states gs
LEFT JOIN game_saves gsv ON gsv.game_state->'gameState'->>'id' = gs.id::text
WHERE gsv.id IS NULL
ORDER BY gs.created_at DESC
```

#### FR-7: One-Time Cleanup Migration
The system must provide a migration script that:
- Identifies all orphaned games using FR-6 query
- Deletes them in a transaction (CASCADE handles related records)
- Logs the number of games cleaned and space reclaimed
- Can be run safely multiple times (idempotent)
- Provides dry-run mode to preview deletions

#### FR-8: Pre/Post Cleanup Metrics
Before and after running the cleanup, the system must capture:
- Total number of game_states records
- Total database size (MB)
- Number of orphaned games
- Average records per game
- Largest orphaned game (by related record count)

### Phase 3: Long-Term Monitoring (Medium Priority)

#### FR-9: Admin Dashboard - Orphaned Games Panel
The system must provide an admin dashboard page that displays:
- **Current Orphaned Games**: Count of games with no saves
- **Total Games**: Count of all game_states
- **Orphaned Percentage**: (Orphaned / Total) * 100
- **Database Size**: Total MB used
- **Recent Deletions**: Log of last 50 game deletion events
- **Top Users by Orphaned Games**: Users with most unsaved games
- Refresh button to reload stats

#### FR-10: Deletion Event Logging
The system must log each game deletion with:
- Timestamp
- User ID (hashed for privacy)
- Game ID
- Game week number
- Reason: "user_initiated_new_game" | "manual_cleanup" | "admin_action"
- Related record counts (artists, songs, projects, etc.)
- Store logs in application logs (not database)

#### FR-11: Admin Cleanup Tool
The admin dashboard must provide a "Run Cleanup" button that:
- Shows preview of games to be deleted
- Requires confirmation
- Executes FR-7 migration script
- Displays real-time progress
- Shows before/after metrics

### Phase 4: Future Enhancements (Low Priority, Documented Only)

These are documented as future possibilities but not included in initial implementation:

- **FE-1**: Add `isActiveSession` boolean flag to game_states schema
- **FE-2**: Add periodic cleanup job (e.g., cron) for games older than 30 days
- **FE-3**: Add "Recently Deleted" grace period (24 hours) with undo capability
- **FE-4**: Add user-facing "Orphaned Games Recovery" UI in settings
- **FE-5**: Add Prometheus/Grafana metrics for database growth tracking

---

## 5. Non-Goals (Out of Scope)

1. **Undo Functionality**: No ability to recover deleted unsaved games (warned users accept deletion)
2. **Soft Deletes**: No "archived" state; orphaned games are hard deleted
3. **User-Controlled Cleanup**: No UI for users to manually delete their own games (admin only)
4. **Save File Compression**: Database size optimization beyond removing orphaned data
5. **Multi-Save Comparison**: No tools to compare/diff different save files
6. **Backup/Export**: No automatic backup of deleted games (out of scope for this PRD)
7. **Grace Period**: No delayed deletion or undo window (Phase 4 future enhancement)

---

## 6. Design Considerations

### UI Components (Existing)
- **ConfirmDialog Component**: [client/src/components/ConfirmDialog.tsx](client/src/components/ConfirmDialog.tsx)
  - Already prompts user with "Start New Game?" warning
  - Shows current game name and week
  - Has "Save First (Recommended)" and "Start New Game" buttons
  - **No changes needed** to UI, only to confirmation handler logic

### New UI Components Required
- **Admin Dashboard Page**: New page at `/admin/database-health`
  - Should match existing dark plum/burgundy theme
  - Use shadcn/ui Card components for metric panels
  - Use shadcn/ui Table component for deletion log
  - Use shadcn/ui Button with destructive variant for cleanup action
  - Requires admin-only route protection

### Visual Feedback
- **Deletion Toast**: Show success toast when unsaved game is cleaned up
  - Message: "Previous unsaved game cleaned up"
  - Duration: 3 seconds
  - Variant: neutral (not error, this is expected behavior)

---

## 7. Technical Considerations

### Database Schema (No Changes Required)
- **Existing CASCADE Deletes**: [shared/schema.ts](shared/schema.ts) already has proper cascade deletes:
  - `artists.gameId` → cascades on game_states delete
  - `songs.gameId` → cascades on game_states delete
  - `releases.gameId` → cascades on game_states delete
  - `emails.gameId` → cascades on game_states delete
  - `moodEvents.gameId` → cascades on game_states delete
  - `weeklyActions.gameId` → cascades on game_states delete
  - `chartEntries.gameId` → cascades on game_states delete
  - `musicLabels.gameId` → cascades (unique constraint)

### API Endpoints to Add

#### 1. `DELETE /api/game/:gameId`
```typescript
// Location: server/routes.ts
app.delete('/api/game/:gameId', requireClerkUser, async (req, res) => {
  // Implementation details in task breakdown
});
```

#### 2. `GET /api/admin/database-stats`
```typescript
// Returns orphaned game counts, database metrics
app.get('/api/admin/database-stats', requireAdmin, async (req, res) => {
  // Implementation details in task breakdown
});
```

#### 3. `POST /api/admin/cleanup-orphaned-games`
```typescript
// Runs cleanup of orphaned games
app.post('/api/admin/cleanup-orphaned-games', requireAdmin, async (req, res) => {
  // Implementation details in task breakdown
});
```

### Code Locations to Modify

1. **[client/src/store/gameStore.ts](client/src/store/gameStore.ts)** (Line 318-389)
   - Update `createNewGame()` function
   - Add orphaned game check and deletion logic
   - Add logging for deletion events

2. **[client/src/contexts/GameContext.tsx](client/src/contexts/GameContext.tsx)** (Line 16-30)
   - Update `useEffect` to fetch most recent game if localStorage is empty
   - Add server fallback logic

3. **[client/src/pages/MainMenuPage.tsx](client/src/pages/MainMenuPage.tsx)** (Line 36-48)
   - Update `confirmNewGame()` handler
   - Deletion happens automatically in gameStore, no UI changes needed

4. **[server/routes.ts](server/routes.ts)**
   - Add DELETE endpoint (~line 500, after other game routes)
   - Add admin stats endpoint (~line 3700, near other admin routes)
   - Add admin cleanup endpoint

### Dependencies
- **Existing**: All CASCADE relationships already in place
- **New**: None required (uses existing Drizzle ORM, Clerk auth, React Query)

### Security Considerations
- **Ownership Verification**: DELETE endpoint must verify `userId` matches game owner
- **Admin Authorization**: Admin endpoints require `requireAdmin` middleware
- **SQL Injection**: Drizzle ORM parameterizes all queries (safe)
- **Cascade Safety**: Test cascade deletes in development first

### Performance Considerations
- **DELETE Performance**: Deleting game with 350+ related records via CASCADE should take <100ms
- **Stats Query Performance**: Add indexes if admin dashboard queries are slow
- **Migration Script**: Batch delete orphaned games (100 at a time) to avoid long transactions

### Testing Strategy
- **Unit Tests**: Test deletion logic in isolation (mock API calls)
- **Integration Tests**: Test full flow (create game → start new game → verify deletion)
- **Edge Case Tests**: Test with no current game, with saved game, with multiple tabs
- **Performance Tests**: Measure deletion time for games with varying record counts

---

## 8. Success Metrics

### Primary Metrics (FR-8)

1. **Database Size Reduction**
   - **Baseline**: Measure current database size before Phase 2 cleanup
   - **Target**: 20-40% reduction in total database size after cleanup
   - **Measurement**: PostgreSQL `pg_database_size()` query

2. **Orphaned Games Prevented**
   - **Baseline**: Current rate of orphaned game creation (est. 1-3 per user on average)
   - **Target**: 0 new orphaned games after Phase 1 deployment
   - **Measurement**: Weekly query of FR-6 orphaned games count

### Secondary Metrics

3. **User Complaints**
   - **Target**: 0 user reports of unexpected data loss
   - **Measurement**: Support ticket tracking, Discord feedback

4. **Deletion Event Rate**
   - **Target**: Matches rate of "New Game" clicks (should be ~100% correlation)
   - **Measurement**: Application logs (FR-10)

5. **Admin Dashboard Usage**
   - **Target**: At least 1 check per week by project maintainers
   - **Measurement**: Admin page view analytics

### Long-Term Health Indicators

6. **Database Growth Rate**
   - **Pre-Fix**: ~5-10 MB/day (estimated, includes orphaned data)
   - **Post-Fix**: ~2-4 MB/day (only saved games and active sessions)
   - **Measurement**: Daily database size snapshots

7. **Average Records Per Game**
   - **Pre-Fix**: ~250-400 records per game (includes orphaned)
   - **Post-Fix**: ~150-250 records per game (active games only)
   - **Measurement**: Count of all records / count of game_states

---

## 9. Open Questions

### Resolved
- ✅ **Q1**: Should we add a grace period for deleted games? → **A**: No, user was warned
- ✅ **Q2**: Hard delete or soft delete (archived state)? → **A**: Hard delete (aggressive cleanup)
- ✅ **Q3**: How old should orphaned games be before cleanup? → **A**: Immediate (all orphaned games deleted)
- ✅ **Q4**: Include admin tools in Phase 1? → **A**: Yes, include in Phase 3 (admin dashboard)
- ✅ **Q5**: Feature flag or direct deployment? → **A**: Direct deployment (low risk, improves system)

### Recently Resolved
- ✅ **Q6**: Should we notify users via email about the new cleanup behavior? → **A**: No notification needed (behavior is transparent and expected)
- ✅ **Q7**: What's the rollback plan if deletion causes issues? → **A**: No rollback plan at this time (feature is low-risk improvement)
- ✅ **Q8**: Should deletion logs be stored in database or application logs? → **A**: Application logs (less database overhead, simpler implementation)

---

## 10. Implementation Phases

### Phase 1: Prevent New Orphaned Data (High Priority)
**Target**: Week 1
**Requirements**: FR-1, FR-2, FR-3, FR-4, FR-5
**Deliverables**:
- DELETE endpoint implemented
- gameStore.createNewGame() updated
- Automatic cleanup working
- Multi-tab sync verified
- Server state recovery implemented

**Success Criteria**:
- 0 new orphaned games created after deployment
- Confirmation dialog shows correctly
- Existing saved games unaffected
- No user complaints about lost data

### Phase 2: Clean Existing Orphaned Data (High Priority)
**Target**: Week 1 (after Phase 1 deployed and stable)
**Requirements**: FR-6, FR-7, FR-8
**Deliverables**:
- SQL query for orphaned game identification
- One-time migration script
- Before/after metrics captured
- Documentation of cleanup results

**Success Criteria**:
- All orphaned games removed from database
- Database size reduced by 20-40%
- No saved games accidentally deleted
- Migration script can be run safely multiple times

### Phase 3: Long-Term Monitoring (Medium Priority)
**Target**: Week 2
**Requirements**: FR-9, FR-10, FR-11
**Deliverables**:
- Admin dashboard page at `/admin/database-health`
- Deletion event logging implemented
- Admin cleanup tool functional
- Documentation for admin users

**Success Criteria**:
- Dashboard shows accurate metrics
- Logs capture all deletion events
- Admin tool successfully cleans orphaned games on demand
- Dashboard accessible only to admins

### Phase 4: Future Enhancements (Low Priority)
**Target**: TBD (documented only)
**Requirements**: FE-1 through FE-5
**Note**: These are documented for future consideration but not part of initial implementation

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Accidentally delete saved games | Low | Critical | Thorough testing of save detection logic; verify query joins `game_saves` correctly |
| CASCADE delete fails | Low | High | Test in development first; verify all foreign key relationships |
| User loses unsaved progress they wanted | Medium | Low | Clear confirmation dialog already exists; document behavior |
| Multi-tab edge case causes data loss | Low | Medium | BroadcastChannel already handles tab sync; test with multiple tabs |
| Migration script times out on large datasets | Low | Medium | Batch delete in chunks of 100 games; add timeout handling |
| Admin dashboard performance issues | Low | Low | Add indexes for stats queries; use caching if needed |

---

## 12. Dependencies

### External Dependencies
- ✅ Drizzle ORM (already in use)
- ✅ Clerk Authentication (already in use for user/admin auth)
- ✅ React Query (already in use for API calls)
- ✅ Zustand (already in use for game state)
- ✅ BroadcastChannel API (browser native, already in use)

### Internal Dependencies
- ✅ Existing CASCADE relationships in [shared/schema.ts](shared/schema.ts)
- ✅ Existing confirmation dialog in [client/src/components/ConfirmDialog.tsx](client/src/components/ConfirmDialog.tsx)
- ✅ Existing save/load system (Phase 1 depends on this)
- ✅ Existing admin middleware `requireAdmin` in [server/auth.ts](server/auth.ts)

### Blockers
- None identified

---

## 13. Documentation Requirements

1. **Developer Documentation**: Update [docs/05-backend/backend-architecture.md](docs/05-backend/backend-architecture.md) with:
   - DELETE endpoint documentation
   - Orphaned game cleanup flow
   - Admin endpoints documentation

2. **User-Facing Documentation**: Update release notes with:
   - "Improved database efficiency with automatic cleanup"
   - "Reminder: Save your games to keep progress"
   - No need for detailed technical explanation

3. **Admin Documentation**: Create new doc at [docs/06-development/admin-database-maintenance.md](docs/06-development/admin-database-maintenance.md) with:
   - How to access admin dashboard
   - Interpreting dashboard metrics
   - Running manual cleanup
   - SQL queries for monitoring

4. **Code Comments**: Add comments in:
   - gameStore.createNewGame() explaining cleanup logic
   - DELETE endpoint explaining CASCADE behavior
   - Migration script with safety notes

---

## 14. Acceptance Criteria

### Phase 1 Acceptance Criteria
- [ ] DELETE /api/game/:gameId endpoint returns 200 for valid requests
- [ ] DELETE endpoint returns 404 for non-existent or unauthorized games
- [ ] gameStore.createNewGame() checks for existing game and saves
- [ ] Unsaved game is deleted before creating new game
- [ ] Saved game is NOT deleted when creating new game
- [ ] Confirmation dialog displays correctly with current game info
- [ ] "Save First" button opens SaveGameModal
- [ ] "Start New Game" button deletes unsaved game and creates new one
- [ ] Multi-tab scenario: New game creation syncs across tabs
- [ ] Server state recovery: App loads most recent game if localStorage empty
- [ ] No TypeScript errors in modified files
- [ ] All existing tests pass
- [ ] Manual testing confirms no data loss for saved games

### Phase 2 Acceptance Criteria
- [ ] SQL query correctly identifies all orphaned games
- [ ] Migration script runs without errors
- [ ] Migration script is idempotent (can run multiple times safely)
- [ ] Before/after metrics show database size reduction
- [ ] No saved games were accidentally deleted during cleanup
- [ ] Migration script logs number of games deleted
- [ ] Documentation includes cleanup results

### Phase 3 Acceptance Criteria
- [ ] Admin dashboard page loads at /admin/database-health
- [ ] Dashboard requires admin authentication
- [ ] Dashboard shows current orphaned games count
- [ ] Dashboard shows total games count
- [ ] Dashboard shows orphaned percentage
- [ ] Dashboard shows database size in MB
- [ ] Dashboard shows recent deletion log (last 50 events)
- [ ] "Run Cleanup" button shows preview before deletion
- [ ] "Run Cleanup" requires confirmation
- [ ] "Run Cleanup" displays before/after metrics
- [ ] Deletion events are logged with all required fields (FR-10)
- [ ] Dashboard can be refreshed to reload stats

### Overall Success Criteria
- [ ] 0 new orphaned games created after deployment
- [ ] Database size reduced by at least 20% after Phase 2
- [ ] 0 user complaints about unexpected data loss
- [ ] Admin dashboard shows healthy metrics (orphaned percentage < 5%)
- [ ] All three phases deployed and stable

---

## 15. Appendix

### A. Example Deletion Log Entry
```json
{
  "timestamp": "2025-01-15T14:32:10Z",
  "event": "game_deletion",
  "userId": "hash_abc123",
  "gameId": "uuid-12345",
  "gameWeek": 8,
  "reason": "user_initiated_new_game",
  "relatedRecords": {
    "artists": 3,
    "projects": 5,
    "songs": 18,
    "releases": 2,
    "emails": 42,
    "executives": 5,
    "moodEvents": 12,
    "weeklyActions": 8,
    "chartEntries": 156,
    "musicLabel": 1
  },
  "totalRecords": 252
}
```

### B. Example Admin Dashboard Metrics Response
```json
{
  "orphanedGamesCount": 3,
  "totalGamesCount": 47,
  "orphanedPercentage": 6.38,
  "databaseSizeMB": 128.5,
  "recentDeletions": [
    {
      "timestamp": "2025-01-15T14:32:10Z",
      "gameId": "uuid-12345",
      "gameWeek": 8,
      "reason": "user_initiated_new_game",
      "totalRecords": 252
    }
  ],
  "topUsersOrphanedGames": [
    { "userId": "hash_abc123", "orphanedCount": 2 },
    { "userId": "hash_def456", "orphanedCount": 1 }
  ]
}
```

### C. SQL Query for Manual Monitoring
```sql
-- Find all orphaned games with details
SELECT
  gs.id AS game_id,
  gs.user_id,
  gs.created_at,
  gs.current_week,
  gs.money,
  gs.reputation,
  (SELECT COUNT(*) FROM artists WHERE game_id = gs.id) AS artist_count,
  (SELECT COUNT(*) FROM songs WHERE game_id = gs.id) AS song_count,
  (SELECT COUNT(*) FROM projects WHERE game_id = gs.id) AS project_count,
  (SELECT COUNT(*) FROM emails WHERE game_id = gs.id) AS email_count
FROM game_states gs
LEFT JOIN game_saves gsv ON gsv.game_state->'gameState'->>'id' = gs.id::text
WHERE gsv.id IS NULL
ORDER BY gs.created_at DESC;
```

### D. Related Documentation Links
- [Save System Integrity PRD](./completed/0005-prd-save-system-integrity.md)
- [System Architecture](../docs/02-architecture/system-architecture.md)
- [Database Design](../docs/02-architecture/database-design.md)
- [Backend Architecture](../docs/05-backend/backend-architecture.md)

---

**End of PRD-0006**
