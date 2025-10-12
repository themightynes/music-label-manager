# Technical Debt Found During PRD-0002 Implementation

**Date**: 2025-10-08
**Task**: Task 6.2 - Implement Mood Event Logging with Artist Targeting
**Status**: Documented for future resolution

---

## Summary

While implementing Task 6.2 (mood event logging), I discovered that several infrastructure functions were using an **outdated data structure** for artist mood changes. Tasks 1.0-5.0 correctly implemented per-artist mood targeting in the effect processing layer, but the database persistence layer was never updated to match.

---

## Issues Discovered

### 1. `applyArtistChangesToDatabase()` Used Obsolete Data Structure

**File**: `shared/engine/game-engine.ts` (lines 2894-2994)

**Problem**:
- Function expected: `summary.artistChanges.mood` (single number for all artists)
- System now uses: `summary.artistChanges[artistId].mood` (per-artist objects)

**Impact**:
- Per-artist mood changes from meetings were **not being applied to the database**
- Function would exit early thinking there were no changes to process

**Resolution** (Task 6.2):
- Completely rewrote function to iterate through `Object.keys(summary.artistChanges)`
- Added type guards to distinguish per-artist objects from legacy numeric values
- Added mood event logging with `artist_id` column population

**Code Changes**:
```typescript
// OLD (broken):
const moodChange = summary.artistChanges.mood || 0;  // Always undefined!
for (const artist of artists) {
  const newMood = currentMood + moodChange;  // Applied same global value
}

// NEW (fixed):
for (const artistId of Object.keys(summary.artistChanges)) {
  const changes = summary.artistChanges[artistId];  // Per-artist object
  if (typeof changes === 'object' && changes.mood) {
    const newMood = currentMood + changes.mood;  // Artist-specific value
    await this.storage.createMoodEvent({ artistId, moodChange: changes.mood, ... });
  }
}
```

---

### 2. `applyTourPerformanceImpacts()` Used Old Numeric Format

**File**: `shared/engine/game-engine.ts` (lines 3660-3680)

**Problem**:
```typescript
// OLD (incompatible with new system):
summary.artistChanges[artistId] = 0;           // Number
summary.artistChanges[artistId] += moodChange; // += operator on number
```

**Impact**:
- Tour mood impacts would overwrite meeting-based mood changes
- Type errors when mixing numbers and objects in same Record

**Resolution** (Task 6.2):
```typescript
// NEW (consistent with mood targeting):
summary.artistChanges[artistId] = {};                              // Object
const artistChange = summary.artistChanges[artistId] as { mood?: number };
artistChange.mood = (artistChange.mood || 0) + moodChange;        // Accumulate properly
```

---

### 3. Mixed Data Formats in `WeekSummary.artistChanges`

**File**: `shared/types/gameTypes.ts` (line 361)

**Problem**:
- Per-artist mood changes: `artistChanges[artistId] = { mood?: number, energy?: number, loyalty?: number }`
- Global energy/popularity (old system): `artistChanges.energy = number`, `artistChanges.popularity = number`
- Creates `Record<string, number | object>` type conflict

**Impact**:
- TypeScript type inference issues
- Requires runtime type guards everywhere
- Confusing for future developers

**Resolution** (Task 6.2):
```typescript
// Updated type definition:
artistChanges?: Record<string, number | { mood?: number; energy?: number; loyalty?: number }>;
```

**Future Work Needed**:
- Refactor `artist_energy` and `artist_popularity` effects to use per-artist object format
- Remove legacy global numeric format entirely
- Simplify type to `Record<string, { mood?: number; energy?: number; loyalty?: number }>`

---

### 4. `processWeeklyMoodChanges()` Expects Old Numeric Format

**File**: `shared/engine/game-engine.ts` (lines 2996-3065)

**Problem**:
```typescript
const releaseMoodBoost = summary.artistChanges?.[artist.id] || 0;  // Expects number
```

**Current Behavior**:
- This code processes **release-based mood boosts** (from successful releases)
- Still uses old numeric format for compatibility
- Works separately from meeting-based mood changes

**Impact**:
- No immediate bug (different code path)
- But creates confusion: "Why do releases use numbers and meetings use objects?"

**Resolution** (Task 6.2):
- Left as-is for now (out of scope)
- Added comments explaining the mixed format

**Future Work Needed**:
- Unify release mood boosts with meeting mood changes
- Use consistent per-artist object format everywhere

---

## Why These Bugs Existed

### Root Cause Analysis

1. **Tasks 1.0-2.0 correctly implemented per-artist targeting** in the effect processing layer (`applyEffects()`)
2. **Database persistence layer was never updated** to match the new data structure
3. **No integration tests** caught the disconnect between accumulation and persistence
4. **Type system didn't catch it** because `artistChanges` was typed as `Record<string, number>` instead of the actual object format

### Why It Wasn't Caught Earlier

- **Tasks 1.0-5.0 focused on UI and effect processing**, not database persistence
- **Unit tests mocked storage layer**, so database writes were never executed in tests
- **No end-to-end test** that verified mood changes persisted to database correctly
- **`applyArtistChangesToDatabase()` silently exited early** when it didn't find the expected numeric values

---

## Remaining Technical Debt

### High Priority
None - Task 6.2 fixed all critical bugs blocking mood event logging.

### Medium Priority

**1. Unify Artist Change Accumulation Format**
- **Current**: Mixed object (mood) and number (energy/popularity) formats
- **Goal**: All artist changes use object format consistently
- **Files**: `game-engine.ts` (lines 1220-1263, 2996-3065)
- **Effort**: ~2-4 hours

**2. Add Integration Tests for Database Persistence**
- **Current**: Unit tests mock storage layer
- **Goal**: Test that mood changes actually persist to database
- **Files**: `shared/engine/__tests__/mood-targeting.test.ts`
- **Effort**: ~1-2 hours

### Low Priority

**3. Refactor `processWeeklyMoodChanges()` for Clarity**
- **Current**: Mixes release boosts, workload stress, and natural drift
- **Goal**: Separate concerns into individual functions
- **Files**: `game-engine.ts` (lines 2996-3065)
- **Effort**: ~2-3 hours

**4. Add Type Safety for Artist Change Objects**
- **Current**: Manual type guards and `as` casting
- **Goal**: Dedicated type for `ArtistChanges` with helper functions
- **Files**: `shared/types/gameTypes.ts`
- **Effort**: ~1 hour

---

## Lessons Learned

### For Future PRD Implementation

1. **Update ALL layers when changing data structures**, not just the consumption layer
2. **Add integration tests** that exercise the full pipeline (accumulation → persistence → retrieval)
3. **Use stricter TypeScript types** to catch format mismatches at compile time
4. **Grep for all usages** of a data structure before changing its format
5. **Document breaking changes** in task descriptions to catch downstream impacts

### Testing Strategy Gaps

- Need tests that verify database writes (not just mocked storage)
- Need tests that verify week processing end-to-end
- Need tests that combine multiple systems (meetings + tours + releases)

---

## References

- **PRD**: [0002-prd-mood-system-reimplementation.md](0002-prd-mood-system-reimplementation.md)
- **Task List**: [tasks-0002-prd-mood-system-reimplementation.md](tasks-0002-prd-mood-system-reimplementation.md)
- **Fixed Functions**:
  - `applyArtistChangesToDatabase()` (game-engine.ts:2894-3006)
  - `applyTourPerformanceImpacts()` (game-engine.ts:3608-3700)
- **Updated Types**: `WeekSummary.artistChanges` (gameTypes.ts:362)

---

## Status

✅ **Task 6.2 Complete** - All critical bugs fixed, mood event logging working correctly
⚠️ **Medium-priority tech debt remains** - Can be addressed in future iteration
📝 **Documentation complete** - Future developers have context for refactoring decisions
