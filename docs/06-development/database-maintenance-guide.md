# Database Maintenance Guide

**Music Label Manager - Orphaned Game Cleanup**
*Version: 1.0*
*Implementation Date: October 2025*

---

## 📋 Overview

This guide covers database maintenance procedures for the Music Label Manager, specifically focused on identifying and cleaning up orphaned game data.

**What are orphaned games?**
Orphaned games are `game_states` records that have no corresponding save files in the `game_saves` table. These accumulate when users:
- Start a game but never save it
- Navigate away without completing the game
- Experience browser crashes or data loss
- Create multiple games in quick succession

**Why cleanup is important:**
- Reduces database bloat and storage costs
- Improves query performance on the `game_states` table
- Maintains data hygiene and accurate user metrics

**Current Status (Post-Database Wipe):**
On 2025-10-15, both test and production databases were completely wiped and rebuilt with proper CASCADE foreign key constraints. As a result, **all cleanup tools will currently report 0 orphaned games** - this is expected and correct behavior. Orphaned games will accumulate over time as users interact with the application.

---

## 🕐 When to Run Cleanup

### **Periodic Maintenance** (Recommended)
Run cleanup script on a regular schedule:
- **Weekly**: For development/staging environments
- **Monthly**: For production environments with moderate traffic
- **Bi-weekly**: For high-traffic production environments

### **Reactive Maintenance**
Run cleanup after:
- **User activity spikes**: Major marketing campaigns, feature launches
- **Database size growth**: Unexpected increase in database size (monitor via admin dashboard)
- **Performance degradation**: Slower query response times on game-related endpoints

### **Emergency Cleanup**
Run cleanup immediately if:
- Database size exceeds 80% of allocated space
- Orphaned games exceed 30% of total games (check admin dashboard)
- System performance issues traced to `game_states` table

---

## 🔧 Cleanup Methods

### **Method 1: CLI Cleanup Script** (DevOps/Developers)

The cleanup script is designed for command-line execution by developers and DevOps teams.

**Location**: `scripts/cleanup-orphaned-games.ts`

#### **Dry-Run Mode** (Default - Safe)
Preview orphaned games without deleting anything:

```bash
npm run db:cleanup-orphaned
```

**Expected Output (Post-Wipe):**
```
=== ORPHANED GAME CLEANUP ===
Mode: DRY RUN
Start time: 2025-10-15T10:30:00.000Z
---
[BEFORE] Total games in database: 0
[FOUND] Orphaned games: 0

✅ No orphaned games found. Database is healthy!

📝 Note: This is expected immediately after the database wipe (2025-10-15).
   Orphaned games will accumulate over time as users start games without saving.

Completed in 245ms
```

**Expected Output (With Orphaned Games):**
```
=== ORPHANED GAME CLEANUP ===
Mode: DRY RUN
Start time: 2025-10-16T14:22:00.000Z
---
[BEFORE] Total games in database: 150
[FOUND] Orphaned games: 23

[SAMPLE] First 5 orphaned games:
  1. Game abc123... (Week 3, Created: 2025-10-16T12:15:00.000Z)
  2. Game def456... (Week 1, Created: 2025-10-16T13:45:00.000Z)
  3. Game ghi789... (Week 5, Created: 2025-10-16T14:00:00.000Z)
  4. Game jkl012... (Week 2, Created: 2025-10-16T14:10:00.000Z)
  5. Game mno345... (Week 1, Created: 2025-10-16T14:20:00.000Z)

⚠️  DRY RUN MODE - No deletions performed
   Run with --execute flag to delete 23 orphaned games

Completed in 412ms
```

#### **Execute Mode** (Actually Delete)
Delete orphaned games after reviewing dry-run output:

```bash
npm run db:cleanup-orphaned -- --execute
```

**⚠️ Warning**: This permanently deletes data. Always run dry-run mode first!

**Expected Output:**
```
=== ORPHANED GAME CLEANUP ===
Mode: EXECUTE
Start time: 2025-10-16T14:25:00.000Z
---
[BEFORE] Total games in database: 150
[FOUND] Orphaned games: 23

[SAMPLE] First 5 orphaned games:
  1. Game abc123... (Week 3, Created: 2025-10-16T12:15:00.000Z)
  ...

[DELETE] Starting batch deletion...
  Batch 1: Deleted 23 games (Total: 23)

=== CLEANUP COMPLETE ===
[AFTER] Total games remaining: 127
[DELETED] Orphaned games removed: 23
[DURATION] 587ms
[EXPECTED] 0 orphaned games on first run after database wipe

✅ Database cleanup successful!
```

#### **Safety Features**
- **Dry-run by default**: Must explicitly use `--execute` to delete
- **Batch processing**: Deletes 100 games at a time to avoid long-running transactions
- **Transactional**: Each batch is deleted atomically (all-or-nothing)
- **Idempotent**: Safe to run multiple times - only deletes truly orphaned games
- **Detailed logging**: Shows before/after metrics and sample IDs

---

### **Method 2: Admin Dashboard** (Non-Technical Users)

The admin dashboard provides a web-based interface for database health monitoring and cleanup.

**Access URL**: `/admin/database-health` (requires admin role)

#### **Viewing Database Stats**
1. Navigate to `/admin` in the application
2. Click "Database Health" in the admin navigation
3. View real-time metrics:
   - **Orphaned Games**: Count and percentage of total games
   - **Total Games**: All game_states records
   - **Database Size**: Current database size in MB
   - **Top Users**: Users with most orphaned games (for pattern analysis)

#### **Running Manual Cleanup**
1. Click "Run Cleanup" button in the cleanup panel
2. Review preview dialog showing:
   - Number of orphaned games to be deleted
   - Estimated cleanup time
   - Warning about permanent deletion
3. Confirm deletion by typing "DELETE" in the confirmation field
4. Click "Confirm Cleanup" to execute
5. Review results:
   - Games deleted count
   - Before/after totals
   - Success/error messages

**Safety Features**:
- **Authentication required**: Must be logged in with admin role
- **Confirmation dialog**: Double-check before deleting
- **Real-time feedback**: Shows progress and results immediately
- **Automatic refresh**: Stats update after cleanup completes

**Note**: Admin dashboard uses the same backend logic as the CLI script, ensuring consistency.

---

## 📊 Interpreting Results

### **"0 Orphaned Games Found"**
This is **expected behavior** in these scenarios:
- **Immediately after database wipe** (2025-10-15 rebuild)
- **Very low user activity** (few new games created)
- **High save rate** (users consistently save their games)
- **Recent cleanup** (cleanup was just run)

**Action**: No cleanup needed. This is healthy!

### **1-10 Orphaned Games** (Low)
**Interpretation**: Normal accumulation from users testing the app or abandoning early games

**Action**:
- No urgent action required
- Run cleanup during next scheduled maintenance window
- Monitor trend over time

### **11-50 Orphaned Games** (Moderate)
**Interpretation**: Moderate user activity with some game abandonment

**Action**:
- Run cleanup during scheduled maintenance
- Review user onboarding flow (are users confused? getting stuck?)
- Check for UI/UX issues causing early abandonment

### **51+ Orphaned Games** (High)
**Interpretation**: Heavy user activity or potential issue with save functionality

**Action**:
- **Immediate cleanup recommended** (especially if >30% of total games)
- Investigate save system for bugs or user friction
- Review user behavior analytics (where do users drop off?)
- Consider auto-save improvements

### **Orphaned Games > 30% of Total** (Critical)
**Interpretation**: Possible system issue or major user experience problem

**Action**:
- **Emergency cleanup required**
- **Investigate immediately**: Check error logs, user reports, save endpoint metrics
- Review recent code changes to save system
- Consider implementing auto-save or save prompts

---

## 🚨 Emergency Procedures

### **Database Storage Critical**
If database storage is critically low:

1. **Immediate action**: Run cleanup script in execute mode
   ```bash
   npm run db:cleanup-orphaned -- --execute
   ```

2. **Verify space freed**: Check database size in admin dashboard

3. **Identify root cause**: Review recent user activity, check for runaway processes

4. **Prevent recurrence**: Implement monitoring alerts for database size

### **Performance Degradation**
If game-related queries are slow:

1. **Check orphaned game percentage**: View admin dashboard stats

2. **If >20% orphaned**: Run cleanup immediately

3. **Analyze query performance**: Review slow query logs for `game_states` table

4. **Consider indexing**: Ensure proper indexes on frequently queried columns

### **Automated Cleanup Failed**
If automatic cleanup on new game creation is failing:

1. **Check error logs**: Review browser console and server logs for errors

2. **Verify DELETE endpoint**: Test `DELETE /api/game/:gameId` manually

3. **Check CASCADE constraints**: Verify foreign keys have `onDelete: 'cascade'`

4. **Manual intervention**: Run CLI cleanup script to clear backlog

---

## 🔍 Monitoring and Alerts

### **Recommended Metrics to Track**
- **Orphaned game count** (daily check)
- **Orphaned game percentage** (alert if >20%)
- **Database size** (alert if growing unexpectedly)
- **Average games per user** (trend analysis)
- **Save file creation rate** (indicator of user engagement)

### **Alert Thresholds**
Set up monitoring alerts for:
- Orphaned games >30% of total → **Critical**
- Orphaned games >20% of total → **Warning**
- Database size growth >50MB/day → **Warning**
- Zero saves created in 24 hours → **Critical** (possible system failure)

### **Logging**
All cleanup operations are logged with:
- Timestamp
- Mode (dry-run vs execute)
- Orphaned games found
- Games deleted
- Before/after totals
- Execution duration

**Log Locations**:
- **CLI Script**: Console output (can be redirected to file)
- **Admin Dashboard**: Server logs (check `/var/log` or hosting platform logs)
- **Automatic Cleanup**: Browser console (`[ORPHANED GAME CLEANUP]` prefix)

---

## 🛡️ Safety and Best Practices

### **Before Running Cleanup**
- ✅ Always run dry-run mode first
- ✅ Review sample of orphaned game IDs
- ✅ Verify expected count matches reality
- ✅ Check that no critical user data will be lost
- ✅ Have database backup available (production only)

### **During Cleanup**
- ✅ Monitor server CPU and database load
- ✅ Avoid running during peak traffic hours
- ✅ Watch for error messages in logs
- ✅ Be prepared to cancel if issues arise

### **After Cleanup**
- ✅ Verify total game count reduced by expected amount
- ✅ Run dry-run again to confirm 0 orphaned games remain
- ✅ Check application functionality (can users create/load games?)
- ✅ Review logs for any unexpected errors
- ✅ Update monitoring dashboards with new baseline

### **Data Integrity**
The cleanup system is designed with multiple safety layers:

1. **Ownership verification**: Only deletes games owned by authenticated users (not applicable for script, which is admin-only)
2. **CASCADE deletes**: All related records automatically deleted (no orphan data in related tables)
3. **Transactional**: Batch deletions are atomic (all-or-nothing)
4. **Idempotent**: Safe to run multiple times without side effects
5. **No save file deletion**: Only deletes game_states with NO saves (never touches saved games)

---

## 📚 Technical Reference

### **Orphaned Game Detection Query**
The system uses this SQL query to identify orphaned games:

```sql
SELECT
  gs.id,
  gs.user_id,
  gs.current_week,
  gs.created_at
FROM game_states gs
LEFT JOIN game_saves gsaves ON gs.id = (gsaves.game_state->'gameState'->>'id')::uuid
WHERE gsaves.id IS NULL
ORDER BY gs.created_at ASC
```

**How it works**:
- **LEFT JOIN**: Includes all game_states, even those without matching saves
- **WHERE gsaves.id IS NULL**: Filters to only games with no save files
- **game_state->'gameState'->>'id'**: Extracts gameId from JSONB save data

### **CASCADE Delete Behavior**
When a `game_state` is deleted, these related records are automatically deleted via foreign key constraints:

| Table | Foreign Key Column | Cascade Behavior |
|-------|-------------------|------------------|
| `artists` | `game_id` | ON DELETE CASCADE |
| `songs` | `game_id` | ON DELETE CASCADE |
| `projects` | `game_id` | ON DELETE CASCADE |
| `releases` | `game_id` | ON DELETE CASCADE |
| `release_songs` | `release_id` | ON DELETE CASCADE (via releases) |
| `emails` | `game_id` | ON DELETE CASCADE |
| `executives` | `game_id` | ON DELETE CASCADE |
| `mood_events` | `game_id` | ON DELETE CASCADE |
| `weekly_actions` | `game_id` | ON DELETE CASCADE |
| `charts` | `game_id` | ON DELETE CASCADE |
| `music_labels` | `game_id` | ON DELETE CASCADE |

**Migration History**: CASCADE constraints were added and database was rebuilt on 2025-10-15.

### **API Endpoints**
- `DELETE /api/game/:gameId` - Delete specific game (requires ownership)
- `GET /api/games` - List all user's games (for orphan detection)
- `GET /api/admin/database-stats` - Database health metrics (admin only)
- `POST /api/admin/cleanup-orphaned-games` - Manual cleanup (admin only)

### **Related Files**
- **CLI Script**: `scripts/cleanup-orphaned-games.ts`
- **Admin Dashboard**: `client/src/pages/AdminDatabaseHealthPage.tsx`
- **Backend Routes**: `server/routes/games.ts` (game delete/list endpoints), `server/routes/admin.ts` (database-stats/cleanup-orphaned-games endpoints)
- **Client Cleanup Logic**: `client/src/store/gameStore.ts` (lines 320-362)
- **Database Schema**: `shared/schema.ts` (CASCADE foreign keys)

---

## 📞 Support and Troubleshooting

### **Common Issues**

**Issue**: Script reports "0 orphaned games" but database size is growing
- **Cause**: Growth is from saved games or other tables
- **Solution**: Check database size breakdown by table, review save file sizes

**Issue**: Cleanup script fails with "connection timeout"
- **Cause**: Database connection limit reached or slow query
- **Solution**: Reduce batch size, check database connection pool settings

**Issue**: Admin dashboard shows different count than CLI script
- **Cause**: New games created between checks
- **Solution**: Normal behavior - orphaned games accumulate continuously

**Issue**: Automatic cleanup not working on new game creation
- **Cause**: DELETE endpoint error or save file query failure
- **Solution**: Check browser console and server logs, verify endpoint functionality

### **Getting Help**
- **Documentation**: `/docs/05-backend/backend-architecture.md` (Orphaned Game Cleanup System section)
- **PRD Reference**: `tasks/0006-prd-database-maintenance-orphaned-games.md`
- **Code Review**: Search codebase for `[ORPHANED GAME CLEANUP]` log messages

---

*Last Updated: October 2025*
*Document Version: 1.0*
