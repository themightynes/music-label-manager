# GameState.artists Dead Code Cleanup

## Problem
The GameEngine has 5 references to `this.gameState.artists?.find()` but `GameState` interface doesn't have an `artists` property. This property is never populated, making these references dead code that fail silently due to optional chaining.

## Root Cause
The correct pattern is to load artists from storage via `this.storage.getArtistsByGame(this.gameState.id)`, which is already used correctly in most of the codebase.

## Impact
- **Severity**: Medium (features fail silently but don't crash)
- **Affected Features**:
  1. Artist name logging in predetermined meetings (line 885-888)
  2. Artist name logging in user-selected meetings (line 898-899)
  3. Global mood effects to all signed artists (line 1185-1193)
  4. Artist validation in immediate mood effects (line 1154-1177)
  5. Artist validation in delayed mood effects (line 2859-2866)

## References Found
All references in `shared/engine/game-engine.ts`:

| Line | Context | Usage | Impact |
|------|---------|-------|--------|
| 885-888 | `processRoleMeeting()` - predetermined targeting | Get artist name for logging | Log shows ID instead of name |
| 898-899 | `processRoleMeeting()` - user-selected targeting | Get artist name for logging | Log shows ID instead of name |
| 1052 | `selectHighestPopularityArtist()` | Get all signed artists | **CRITICAL**: Returns null, predetermined meetings don't work |
| 1154-1177 | `applyEffects()` - artist mood (specific) | Get artist name and validate | Log shows ID, no validation |
| 1185-1193 | `applyEffects()` - artist mood (global) | Get all signed artists | **CRITICAL**: Global mood effects skip all artists |
| 2859-2866 | Delayed effects processing | Get artist name and validate | Delayed effects always cancelled |

## Solution

### Critical Fixes (breaks features)
1. **Line 1052**: `selectHighestPopularityArtist()` - Load from storage
2. **Line 1185**: Global mood effects - Load from storage

### Non-Critical Fixes (logging only)
3. **Lines 898, 1154, 2859**: Remove name lookups, just log artistId
   - These are logging-only references
   - Artist names will still appear in final change logs via `applyArtistChangesToDatabase()`

## Implementation Plan

### 1. Make `selectHighestPopularityArtist()` async and load from storage
```typescript
private async selectHighestPopularityArtist(): Promise<Artist | null> {
  // Load from storage instead of gameState
  if (!this.storage?.getArtistsByGame) {
    console.warn('[ARTIST SELECTION] Storage not available');
    return null;
  }

  const allArtists = await this.storage.getArtistsByGame(this.gameState.id);
  const signedArtists = allArtists.filter((a: any) => a.signed);

  // ... rest of logic unchanged
}
```

### 2. Update caller to await
```typescript
// Line 885
const selectedArtist = await this.selectHighestPopularityArtist();
```

### 3. Fix global mood effects to load from storage
```typescript
// Line 1185 - Replace with storage load
const signedArtists = await this.loadSignedArtists();
```

Add helper method:
```typescript
private async loadSignedArtists(): Promise<Artist[]> {
  if (!this.storage?.getArtistsByGame) {
    return [];
  }
  const allArtists = await this.storage.getArtistsByGame(this.gameState.id);
  return allArtists.filter((a: any) => a.signed);
}
```

### 4. Simplify logging references
```typescript
// Line 898-899: Remove name lookup
console.log(`[GAME-ENGINE] User-selected targeting: Player selected artist ${targetArtistId}`);

// Line 1154-1177: Remove validation, just log ID
console.log(`[EFFECT PROCESSING] Artist mood effect: ${value > 0 ? '+' : ''}${value} (target: ${artistId}, ${logParts.join(', ')})`);

// Line 2859-2866: Remove validation warning
// The validation will happen in applyArtistChangesToDatabase() anyway
```

## Verification
1. Run TypeScript check: `npm run check`
2. Run tests: `npm test`
3. Test in UI:
   - Sign 2 artists with different popularity
   - Execute predetermined executive meeting
   - Verify mood change applied correctly
   - Execute global mood effect meeting
   - Verify all signed artists receive mood change

## Files Modified
- `shared/engine/game-engine.ts`

## Testing Notes
Existing tests already cover mood system extensively:
- `tests/engine/immediate-mood-effect.test.ts` (2 tests)
- `tests/engine/mood-system-unit-tests.test.ts` (58 tests)

These tests mock storage properly, so they should continue passing.
