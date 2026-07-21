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
4. **Cleanup** deletes old autosaves (keeps newest 3 per game)

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
- **`client/src/components/SaveGameModal.tsx`**: Save & Load dialog host (save input, export/import, confirm dialogs)
- **`client/src/components/saves/`** (July 2026 grouped browser):
  - `groupSaves.ts` - Pure grouping: buckets `SaveSummary[]` by playthrough (`gameId`, labeled by `musicLabelName`), current game pinned first; legacy saves without a `gameId` land in an "Unknown Label" bucket
  - `SaveGroupList.tsx` - Collapsible group per playthrough (current expanded by default; flat list when only one playthrough); autosaves render as an indented, de-emphasized sub-cluster
  - `SaveCard.tsx` - Shared save card (load/copy/delete, inline rename for manual saves, relative timestamps with absolute tooltip)
- **`client/src/contexts/GameContext.tsx`**: Cross-tab game selection

### Server
- **`server/routes/saves.ts`**:
  - `GET /api/saves` - List summaries
  - `GET /api/saves/:saveId` - Fetch full snapshot
  - `POST /api/saves` - Create save with autosave cleanup
  - `POST /api/saves/:saveId/restore` - Restore with timestamp conversion
  - `PATCH /api/saves/:saveId` - Rename a manual save (autosaves rejected; name-only update that does not bump `updatedAt`)
  - `DELETE /api/saves/:saveId` - Ownership-enforced deletion
  - `DELETE /api/saves/by-game/:gameId` - Delete every save belonging to one playthrough (matches the `gameId` inside the snapshot JSONB)
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
**Naming**: `"{musicLabelName} - Week {week}"` (e.g. `"Acme Records - Week 8"`). The label name is fetched from the game's label; if unavailable it falls back to `"Label {gameId} - Week {week}"`.
**Legacy migration**: `getGameSaves()` normalizes legacy autosaves still named `"Autosave"` on read (it matches any autosave whose name starts with `Autosave`), rewriting them to `"{musicLabelName} - Week {week}"` for display.

> **Caveat**: The migration matches on the `Autosave` name prefix for autosave records, so a save a user *manually* named exactly `"Autosave"` will also be renamed on display. This is a benign edge case — the underlying save data is untouched.
**Cleanup**: Keeps the newest `AUTOSAVE_RETENTION` (3) autosaves per game — `saveService.createSave` calls `purgeOldAutosaves`, which filters by the snapshot's `gameId` and ranks stale rows in SQL (id-only projection; it does not load `game_state` JSONB)

```typescript
// In gameStore.ts after week advancement
const resolvedLabel = labelName || `Label ${syncedGameState.id}`;
await get().saveGame(`${resolvedLabel} - Week ${syncedGameState.currentWeek}`, { isAutosave: true });
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

## Snapshot v2 Format

**Version**: `SNAPSHOT_VERSION = 2` (defined in `shared/schema.ts`, validated by `gameSaveSnapshotSchema`)

A snapshot is assembled by a shared snapshot builder used by both the manual/autosave path (store `saveGame`) and the JSON export path (`SaveGameModal` export). This keeps the captured field set identical regardless of how the snapshot is produced.

### Structure: `musicLabel` and collections are siblings of `gameState`

The most important structural fact: **`musicLabel` and every collection are siblings of `gameState`, NOT nested inside it.** The `gameState` object holds only the inner per-game state (money, reputation, week, focus slots, A&R office fields, access tiers, flags, etc.). Everything else lives alongside it at the top level of the snapshot.

```
{
  snapshotVersion,        // SNAPSHOT_VERSION = 2; gates restore (see below)
  gameState: { ... },     // inner game state ONLY (money, reputation, currentWeek, focusSlots, arOffice*, *Access, flags, weeklyStats, tierUnlockHistory, ...)
  musicLabel,             // sibling of gameState — NOT gameState.musicLabel
  artists,
  projects,
  roles,
  songs,
  releases,
  weeklyActions,
  emails,
  emailMetadata,
  releaseSongs,
  executives,
  moodEvents,
  weeklyOutcome
}
```

> ⚠️ Because `musicLabel` is a sibling, any server-side JSON-path query must read `game_state->'musicLabel'`, not `game_state->'gameState'->'musicLabel'`.

### Captured collections/fields

| Field | Description |
|-------|-------------|
| `snapshotVersion` | Numeric schema version (`SNAPSHOT_VERSION = 2`). Gates restore — a mismatched version is **rejected** (see Version gating). |
| `gameState` | Inner per-game state only: `id`, `currentWeek`, `money`, `reputation`, `creativeCapital`, focus-slot fields, `arOffice*` fields, `playlistAccess`/`pressAccess`/`venueAccess`, `campaignType`/`campaignCompleted`, `rngSeed`, `flags`, `weeklyStats`, `tierUnlockHistory`. Uses `.passthrough()` so extra fields survive. |
| `musicLabel` | The label record (name, genre focus, founding info). Sibling of `gameState`; nullable/optional. |
| `artists` | Signed artist roster. |
| `projects` | Recording/tour projects. |
| `roles` | Executive/industry role records. |
| `songs` | All songs (recorded, released, in-progress). |
| `releases` | Planned and released singles/EPs/albums. |
| `weeklyActions` | Actions submitted per week (focus-slot selections). |
| `emails` | Full inbox snapshot (see Email snapshot truncation). |
| `emailMetadata` | `{ total?, unreadCount?, truncated? }` — inbox counts plus the truncation flag (see below). |
| `releaseSongs` | Release↔song junction rows (track ordering). |
| `executives` | Executive suite state (mood, relationships). |
| `moodEvents` | Artist/global mood-event history. |
| `weeklyOutcome` | Last week-advancement result payload (arbitrary shape). |

The top-level schema also uses `.passthrough()`, so unrecognized top-level keys are preserved rather than stripped.

### Version gating

The restore endpoint in `server/routes.ts` compares the snapshot's `snapshotVersion` against the current `SNAPSHOT_VERSION`. Any mismatch is **rejected** with HTTP 400 and `error: 'UNSUPPORTED_SNAPSHOT_VERSION'`. When the snapshot shape changes in a breaking way, bump `SNAPSHOT_VERSION` and add migration logic.

## Email Snapshot & Truncation

Emails require special handling because an inbox can grow large. The snapshot builder captures the inbox by paginating the server's email API.

### Truncation system (`client/src/utils/emailSnapshot.ts`)

- **Page size**: `EMAIL_PAGE_SIZE = 100`.
- **Safety cap**: `MAX_PAGES = 100` → a hard limit of ~10,000 emails per snapshot.
- **Termination**: pagination pulls pages until a **short page** is returned (a page with fewer than `EMAIL_PAGE_SIZE` rows means the end of the inbox has been reached). This single condition handles both the last partial page and an empty page past the end, so there are no wasted round trips on inconsistent totals.
- **`truncated` flag semantics**: The `MAX_PAGES` cap is the **only** path that sets `truncated = true`. If pagination ends naturally on a short page, `truncated` stays `false`. This means:
  - `truncated === true` → the inbox genuinely exceeded ~10,000 emails and the snapshot is intentionally incomplete.
  - **Complete snapshots are never falsely flagged.** A normally-terminated snapshot always reports `truncated === false`, regardless of how the server's `total` compares.
- **Server `total` is a sanity-check only**: the collected count is authoritative and is what gets stored in `emailMetadata.total`. The server-reported `total` is never used to terminate the loop; if it disagrees with the collected count, a `console.warn` is logged but the snapshot is **not** marked truncated.

### Server-side email handling (`server/storage.ts`)

- **Category normalization**: the server is the source of truth for email categories. `normalizeEmailCategory()` maps every stored category into one of **5 generic categories** — `chart`, `financial`, `artist`, `ar`, `other` (defined by `EMAIL_CATEGORIES` in `shared/types/emailTypes.ts`). Legacy/DB categories are remapped via `LEGACY_CATEGORY_MAP` (e.g. `financial_report`/`tier_unlock` → `financial`, `tour_completion`/`release` → `artist`, `top_10_debut`/`number_one_debut` → `chart`, `artist_discovery` → `ar`); anything unrecognized (or null) falls back to `other`. Normalizing server-side prevents category drift between saves.
- **Deterministic ordering**: email queries order by `week DESC, createdAt DESC, id DESC`. The `id` tie-breaker guarantees a stable, deterministic order even when week and `createdAt` collide — important so paginated snapshot pages don't overlap or skip rows.

### `useEmails` staleTime

The live inbox query (`client/src/hooks/useEmails.ts`) uses `staleTime: 30_000` (30 seconds), raised from the previous `0`. Giving emails a 30-second stale window avoids excessive refetches that would otherwise re-sort the visible list on every interaction.

## JSON Import/Export

**Export**: Downloads `music-label-manager-save-{timestamp}.json`
**Import**: Parses JSON, validates schema, creates new game (fork mode)
**Format**:
```json
{
  "gameState": { /* complete snapshot */ },
  "timestamp": "2025-10-12T...",
  "snapshotVersion": 2
}
```

**Versioning**: The current snapshot version is `SNAPSHOT_VERSION = 2` (`shared/schema.ts`). The snapshot field is the numeric `snapshotVersion` (not a `"version"` string). The restore endpoint in `server/routes.ts` rejects any snapshot whose `snapshotVersion` does not match the current version, returning HTTP 400 with `error: 'UNSUPPORTED_SNAPSHOT_VERSION'`.

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
