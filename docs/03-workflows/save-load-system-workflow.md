# Save/Load System Workflow

**Status**: ✅ Production-ready
**Performance**: 728ms restore time
**Last Updated**: 2025-10-12

## Overview

Snapshot-based save system with support for manual saves, autosaves, and JSON import/export.

## Core Functionality

### Save Operation
1. **Client** calls `saveGame(name, isAutosave)` in `gameStore.ts`
2. **API** validates snapshot with `gameSaveSnapshotSchema`
3. **Database** stores JSONB snapshot in `game_saves` table
4. **Cleanup** deletes old autosaves (keeps only newest per game)

### Load Operation (Overwrite Mode)
1. **Fetch** snapshot from `GET /api/saves/:saveId`
2. **Optimistic update** Zustand with snapshot data
3. **Restore** via `POST /api/saves/:saveId/restore`
4. **Transaction** deletes/reinserts all game data in correct order
5. **Sync** fetches fresh data from server to confirm

### Load Operation (Fork Mode)
- Creates entirely new game with new UUIDs
- Used for JSON import functionality
- Original game remains untouched

## Database Transaction Order

**Critical**: Foreign key dependencies require specific deletion order

### Deletion (Children → Parents)
1. `release_songs` (junction table)
2. `songs` (depends on artists, projects, releases)
3. `releases` (depends on artists)
4. `projects` (depends on artists)
5. `mood_events` (depends on artists)
6. `artists` (no dependencies after above)
7. `roles`, `weekly_actions`, `music_labels` (independent)

### Insertion (Parents → Children)
Reverse order of deletion to satisfy foreign keys.

## Key Files

### Client
- **`client/src/store/gameStore.ts`**: Save/load logic, autosave trigger
- **`client/src/components/SaveGameModal.tsx`**: UI with lazy loading
- **`client/src/contexts/GameContext.tsx`**: Cross-tab game selection

### Server
- **`server/routes.ts`**:
  - `GET /api/saves` - List summaries
  - `GET /api/saves/:saveId` - Fetch full snapshot
  - `POST /api/saves` - Create save with autosave cleanup
  - `POST /api/saves/:saveId/restore` - Restore with timestamp conversion
  - `DELETE /api/saves/:saveId` - Ownership-enforced deletion
- **`server/storage.ts`**: Database operations for save management

### Shared
- **`shared/schema.ts`**:
  - `gameSaves` table definition
  - `gameSaveSnapshotSchema` validation
  - Database indexes on `game_id` columns

## Performance Optimizations

### Database Indexes (Added 2025-10-12)
```typescript
// In shared/schema.ts
artists: gameIdIdx: sql`CREATE INDEX IF NOT EXISTS "idx_artists_game_id" ON ${table} ("game_id")`
roles: gameIdIdx: sql`CREATE INDEX IF NOT EXISTS "idx_roles_game_id" ON ${table} ("game_id")`
projects: gameIdIdx: sql`CREATE INDEX IF NOT EXISTS "idx_projects_game_id" ON ${table} ("game_id")`
weekly_actions: gameIdIdx: sql`CREATE INDEX IF NOT EXISTS "idx_weekly_actions_game_id" ON ${table} ("game_id")`
```

**Impact**: 30+ second timeout → 728ms restore time

### Timestamp Conversion
```typescript
// In server/routes.ts restore endpoint
const convertTimestamps = (obj: any): any => {
  // Converts string timestamps from JSON back to Date objects
  // Required for Drizzle's timestamp columns
};
```

### Lazy Loading
- Summary query returns metadata only (id, name, week, timestamps)
- Full snapshot fetched on-demand when loading
- Reduces initial modal open time

## Autosave System

**Trigger**: After successful week advancement
**Naming**: `"Autosave - Week {currentWeek}"`
**Cleanup**: Only keeps newest autosave per game

```typescript
// In gameStore.ts advanceWeek()
await saveGame(`Autosave - Week ${newWeek}`, true);
```

## Data Validation

**Week Invariant**: Save metadata week must match snapshot currentWeek
```typescript
.superRefine((data, ctx) => {
  const snapshotWeek = data.gameState?.gameState?.currentWeek;
  if (data.week !== snapshotWeek) {
    ctx.addIssue({ message: 'Week must match snapshot currentWeek' });
  }
});
```

## JSON Import/Export

**Export**: Downloads `music-label-manager-save-{timestamp}.json`
**Import**: Parses JSON, validates schema, creates new game (fork mode)
**Format**:
```json
{
  "gameState": { /* complete snapshot */ },
  "timestamp": "2025-10-12T...",
  "version": "1.0"
}
```

## Error Handling

**Common Issues**:
- ❌ `toISOString is not a function` → Fixed with `convertTimestamps()`
- ❌ Foreign key constraint violations → Fixed with correct deletion order
- ❌ Missing indexes → Fixed with `game_id` indexes

**Ownership Enforcement**: Users can only delete their own saves via userId check

## Testing

See `MANUAL-TEST-GUIDE.md` in project root for comprehensive test suite.

**Quick Test**:
1. Create save at Week 5
2. Advance to Week 8
3. Load Week 5 save
4. ✅ Game restores to Week 5 in < 1 second
