# Schema vs Type Mismatch Analysis

**Date**: 2025-10-09
**Current Status**: ~70 TypeScript errors remaining (all schema-related)
**Last Updated**: After artist loyalty → energy refactoring cleanup

---

## Executive Summary

The codebase has **two parallel type systems** that have diverged:

1. **Database Schema** (`shared/schema.ts`) - Drizzle ORM definitions for PostgreSQL
2. **Game Types** (`shared/types/gameTypes.ts`) - TypeScript interfaces used by game logic

This divergence causes **81 TypeScript errors** across production code and tests.

---

## Critical Issues

### 1. GameArtist vs Database Artist Schema

**GameArtist Type** (shared/types/gameTypes.ts) includes:
- `temperament: number` ❌ NOT in database
- `signingCost?: number` ❌ NOT in database
- `weeklyCost?: number` ❌ NOT in database
- `bio?: string` ❌ NOT in database
- `age?: number` ❌ NOT in database
- `signed: boolean` ✅ Database has `isSigned` (property name mismatch)

**Database Schema** (shared/schema.ts) has:
- `talent`, `workEthic`, `stress`, `creativity`, `massAppeal`, `experience`
- `weeklyFee` (vs `weeklyCost` in type)
- `isSigned` (vs `signed` in type)

**Impact**:
- ❌ **HIGH** - Client pages crash when accessing missing properties
- Files affected:
  - `client/src/pages/ArtistsLandingPage.tsx` (5 errors)
  - `client/src/pages/LivePerformancePage.tsx` (1 error)
  - `client/src/pages/RecordingSessionPage.tsx` (1 error)
  - `server/routes.ts` (1 error)

### 2. GameState Missing `artists` Property

**GameState Type** does NOT include:
```typescript
artists: GameArtist[]
```

**GameEngine** expects it:
- `shared/engine/game-engine.ts` (5 locations):
  - Line 898: `gameState.artists.filter(...)`
  - Line 1052: `gameState.artists.filter(...)`
  - Line 1154: `gameState.artists.find(...)`
  - Line 1185: `gameState.artists.some(...)`
  - Line 2859: `gameState.artists.filter(...)`

**Impact**:
- ❌ **CRITICAL** - GameEngine cannot process week advances
- This is a **runtime crash** waiting to happen

### 3. Null Safety Issues (GameState Properties)

**Database Schema** (gameStates table) makes these nullable:
```typescript
currentWeek: number | null
money: number | null
reputation: number | null
creativeCapital: number | null
```

**GameState Type** defines them as required:
```typescript
currentWeek: number  // NOT null
money: number        // NOT null
reputation: number   // NOT null
creativeCapital: number  // NOT null
```

**Impact**:
- ⚠️ **MEDIUM** - Runtime crashes if database returns null
- Files affected:
  - `server/routes.ts` (4 errors at lines 1343, 1346, 1349, 1367)

### 4. Test Mock Type Mismatches

**Test files** mock GameState/GameArtist without matching database schema:
- `tests/engine/mood-application-verification.test.ts` (10 errors)
- `tests/engine/immediate-mood-effect.test.ts` (2 errors)
- `tests/engine/mood-event-logging.test.ts` (3 errors)

**Impact**:
- ⚠️ **LOW** - Tests pass at runtime but fail TypeScript compilation

### 5. Missing Type Properties

**GameChange** interface:
- ~~`loyaltyBoost?: number` (used in game-engine.ts:1039)~~ ✅ FIXED - Added for Executive loyalty tracking

**Executive** type in tests:
- `level: number` (required but tests omit it) - Still needs test fixes

### 6. Artist Loyalty Refactoring ✅ COMPLETED

**Background**: Artist `loyalty` property was refactored to use `energy` instead
- Executives still have `loyalty` (separate concept)
- Artists never had `loyalty` in artists.json
- Old code was trying to apply loyalty changes to artists

**Fixed**:
- ✅ Removed `loyalty` from `WeekSummary.artistChanges` type
- ✅ Removed artist loyalty processing from `applyArtistChangesToDatabase()`
- ✅ Fixed client pages to use `energy` instead of `artist.loyalty`
- ✅ Fixed server routes to use `energy` instead of `artist.loyalty`
- ✅ Added `loyaltyBoost` and `newLoyalty` to `GameChange` for executives

---

## Root Cause Analysis

### Historical Context - THE SMOKING GUN 🔍

**The JSON data files came FIRST**, and they define the complete artist model:
- `data/artists.json` - Contains ALL artist properties including `temperament`, `signingCost`, `weeklyCost`, `bio`, `age`
- These JSON files have "been there for a long time" (per user)
- The **GameArtist type** was correctly modeled after the JSON data

**The problem**: When the database schema was created, it was **incomplete**:
- Someone added `weeklyFee` but forgot to add `temperament`, `bio`, `age`, etc.
- Used `isSigned` instead of `signed` (inconsistent naming)
- The schema doesn't match the source data files

**Evidence**:
```typescript
// server/routes.ts:1501 - Mapping at sign artist endpoint
weeklyFee: req.body.weeklyCost || req.body.weeklyFee || 1200
```
This shows the code is **already handling the mismatch** by mapping `weeklyCost` → `weeklyFee`!

### Why This Matters

**The JSON files are the source of truth** because:
1. They've been carefully balanced for gameplay
2. The game logic (GameEngine, UI) expects these properties
3. The GameArtist type matches the JSON perfectly
4. The database is just **storage** - it should mirror the JSON structure

### Specific Divergences

| Property | GameArtist Type | Database Schema | Used In Code? | Notes |
|----------|----------------|-----------------|---------------|-------|
| `temperament` | ✅ Required | ❌ Missing | ✅ ArtistsLandingPage | From artists.json |
| `loyalty` | ❌ Missing | ❌ Missing | ❌ REMOVED | **Refactored to `energy`** - old code cleaned up |
| `signingCost` | ✅ Optional | ❌ Missing | ✅ ArtistsLandingPage | From artists.json |
| `weeklyCost` | ✅ Optional | ❌ Missing | ✅ ArtistsLandingPage | From artists.json |
| `weeklyFee` | ❌ Missing | ✅ Integer | ⚠️ Schema only | Should be `weeklyCost` |
| `bio` | ✅ Optional | ❌ Missing | ✅ ArtistsLandingPage | From artists.json |
| `age` | ✅ Optional | ❌ Missing | ✅ ArtistsLandingPage | From artists.json |
| `signed` | ✅ Boolean | ❌ (uses `isSigned`) | ✅ Everywhere | From artists.json |
| `isSigned` | ❌ Missing | ✅ Boolean | ⚠️ Schema only | Should be `signed` |

---

## Impact Assessment

### Production Code Impact

**HIGH RISK** (5 errors):
1. `client/src/pages/ArtistsLandingPage.tsx` - Accessing 5 missing properties
2. ~~`client/src/pages/LivePerformancePage.tsx` - Accessing `loyalty`~~ ✅ FIXED
3. ~~`client/src/pages/RecordingSessionPage.tsx` - Accessing `loyalty`~~ ✅ FIXED

**CRITICAL RISK** (5 errors):
- `shared/engine/game-engine.ts` - Cannot access `gameState.artists`

**MEDIUM RISK** (5 errors):
- `server/routes.ts` - Null safety issues + schema mismatch

### Test Code Impact

**LOW RISK** (64 errors):
- Test files have type mismatches but tests may still pass at runtime
- Indicates tests are not catching type safety issues

---

## Recommended Solutions

### Option 1: Align GameArtist Type with Database Schema (RECOMMENDED)

**Pros**:
- Database is the source of truth
- No migration needed
- Type safety matches reality

**Cons**:
- Breaking change for game logic
- Need to update all GameArtist usage

**Steps**:
1. Add missing columns to `artists` table:
   - `temperament INTEGER`
   - `loyalty INTEGER DEFAULT 50`
   - `signing_cost INTEGER`
   - `weekly_cost INTEGER` (or rename `weeklyFee` to `weeklyCost`)
   - `bio TEXT`
   - `age INTEGER`
2. Run database migration
3. Update GameArtist type to match schema
4. Fix code that uses old property names (`isSigned` → `signed`)

### Option 2: Align Database Schema with GameArtist Type (STRONGLY RECOMMENDED)

**Why this is the correct approach**:
- ✅ The JSON data files are the **authoritative source** (they existed first)
- ✅ The GameArtist type **correctly** models the JSON data
- ✅ The game logic and UI **already use** these properties
- ✅ No code changes needed - the code is already correct!

**Pros**:
- Database becomes consistent with source data
- Eliminates all 81 TypeScript errors
- No risk to existing game logic
- Server code already maps `weeklyCost` → `weeklyFee`, so this just fixes the mismatch

**Cons**:
- Requires database migration
- Need to handle existing data (if any)

**Steps**:
1. Create migration to add missing columns:
   - `temperament INTEGER DEFAULT 60`
   - ~~`loyalty INTEGER DEFAULT 50`~~ ❌ NOT NEEDED - loyalty refactored to energy
   - `signing_cost INTEGER`
   - `bio TEXT`
   - `age INTEGER`
2. Rename columns for consistency:
   - `is_signed` → `signed`
   - `weekly_fee` → `weekly_cost`
3. Update Drizzle schema (`shared/schema.ts`)
4. Remove workaround in `server/routes.ts:1501` (the weeklyCost mapping)

### Option 3: Add `artists` to GameState

**Critical** regardless of Option 1 or 2:

```typescript
export interface GameState {
  // ... existing properties
  artists: GameArtist[];  // ADD THIS
}
```

**Note**: This might already be handled by the server loading artists separately and injecting them into the gameState object at runtime. Need to verify.

---

## Migration Plan (Recommended: Option 1 + Option 3)

### Phase 1: Immediate Fixes (Non-Breaking)
1. ✅ Add type guards for null checks in `server/routes.ts`
2. ✅ Fix test mocks to include `level` property for Executive
3. ✅ Add `loyaltyBoost` to GameChange type

### Phase 2: Database Migration
1. Create migration script:
   ```sql
   ALTER TABLE artists ADD COLUMN temperament INTEGER DEFAULT 60;
   ALTER TABLE artists ADD COLUMN loyalty INTEGER DEFAULT 50;
   ALTER TABLE artists ADD COLUMN signing_cost INTEGER;
   ALTER TABLE artists ADD COLUMN bio TEXT;
   ALTER TABLE artists ADD COLUMN age INTEGER;
   ALTER TABLE artists RENAME COLUMN weekly_fee TO weekly_cost;
   ALTER TABLE artists RENAME COLUMN is_signed TO signed;
   ```

2. Update Drizzle schema to match
3. Regenerate types

### Phase 3: Code Updates
1. Update all `isSigned` references to `signed`
2. Update `weeklyFee` references to `weeklyCost`
3. Verify ArtistsLandingPage renders correctly

### Phase 4: GameState.artists
1. Investigate how artists are loaded into GameState
2. Either:
   - Add to GameState type if already populated at runtime, OR
   - Refactor GameEngine to accept artists separately

---

## Questions for Discussion

1. **Are the missing properties (`temperament`, `loyalty`, `bio`, `age`) actually used in the game logic?**
   - If yes → Add to database
   - If no → Remove from type

2. **Is `gameState.artists` populated at runtime?**
   - Check server code that creates GameState objects
   - If yes → Just add to type
   - If no → Refactor GameEngine

3. **Should we prioritize backward compatibility?**
   - Option 1 requires data migration
   - Option 2 requires code changes

4. **What's the deployment strategy?**
   - Do we have active users?
   - Can we run migrations safely?

---

## Next Steps

Please review this analysis and decide:
1. Which option (1, 2, or hybrid)?
2. Priority level for fixing
3. Whether to fix in one PR or phased approach

I'm ready to implement whichever solution you choose.
