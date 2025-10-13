# Schema vs Type Dependency Analysis & Data Flow Map

**Date**: 2025-10-09
**Analysis Type**: Comprehensive Data Flow & Dependency Graph
**Scope**: Complete artist data lifecycle from JSON → Database → Runtime → UI

---

## Executive Summary

This document provides a **complete dependency graph** of how artist data flows through the Music Label Manager codebase, identifying where and why schema/type mismatches occur.

### Key Finding: **The Root Cause is Architectural**

The codebase has **two separate type systems** that serve different purposes:
1. **GameArtist** (gameTypes.ts) - Models the **content data** from JSON files
2. **Artist** (schema.ts) - Models the **database storage** layer

These types diverged because the database schema was created **incompletely** and doesn't store all properties from the source JSON data.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT LAYER (Source of Truth)               │
│                                                                  │
│  data/artists.json                                              │
│  ├─ id, name, archetype, genre                                 │
│  ├─ talent, workEthic, popularity, mood, energy                │
│  ├─ temperament ✓ (USED IN UI)                                 │
│  ├─ signingCost ✓ (USED IN UI & SIGNING)                      │
│  ├─ weeklyCost ✓ (USED IN FINANCIAL CALCULATIONS)             │
│  ├─ bio ✓ (USED IN UI)                                        │
│  ├─ age ✓ (USED IN UI)                                        │
│  └─ signed (boolean)                                            │
│                                                                  │
│  ↓ Loaded by: shared/utils/dataLoader.ts                       │
│  ↓ Type: GameArtist (shared/types/gameTypes.ts)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Discovery)                 │
│                                                                  │
│  A&R Office Discovery Flow:                                     │
│  ├─ Loads JSON artists via dataLoader                          │
│  ├─ Stores discovered artists in gameState.flags               │
│  ├─ Type: GameArtist[] in ar_office_discovered_artists         │
│  └─ UI displays: temperament, signingCost, weeklyCost, bio, age│
│                                                                  │
│  Components using GameArtist properties:                        │
│  ├─ client/src/components/ar-office/ArtistDiscoveryTable.tsx   │
│  ├─ client/src/components/ArtistDiscoveryModal.tsx             │
│  └─ client/src/pages/ArtistsLandingPage.tsx                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (when user signs artist)
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER (Database)                  │
│                                                                  │
│  server/routes.ts - POST /api/artists (Sign Artist)            │
│  ├─ Receives: GameArtist data from client                      │
│  ├─ Maps properties: weeklyCost → weeklyFee                    │
│  │   (routes.ts:1501) ← WORKAROUND FOR SCHEMA MISMATCH         │
│  ├─ Validates: insertArtistSchema (Drizzle)                    │
│  └─ Inserts: INCOMPLETE data into database                     │
│                                                                  │
│  Database Schema (shared/schema.ts - artists table):            │
│  ✓ id, name, archetype, genre                                  │
│  ✓ talent, workEthic, popularity, mood, energy                 │
│  ✓ isSigned (NOT signed!) ← PROPERTY NAME MISMATCH             │
│  ✓ weeklyFee (NOT weeklyCost!) ← PROPERTY NAME MISMATCH        │
│  ✗ temperament - MISSING                                       │
│  ✗ signingCost - MISSING                                       │
│  ✗ bio - MISSING                                               │
│  ✗ age - MISSING                                               │
│                                                                  │
│  Result: DATA LOSS on insert - properties dropped!             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RUNTIME LAYER (Game Engine)                   │
│                                                                  │
│  server/routes.ts - GET /api/game/:id                          │
│  ├─ Loads gameState from database                              │
│  ├─ Loads artists via storage.getArtistsByGame()               │
│  ├─ Type: Artist[] (database schema type)                      │
│  └─ Returns: { gameState, artists, ... }                       │
│                                                                  │
│  GameEngine Construction (shared/engine/game-engine.ts):        │
│  ├─ new GameEngine(gameState, gameData, storage)               │
│  ├─ Does NOT receive artists array directly                    │
│  ├─ Uses storage.getArtistsByGame() to fetch artists           │
│  └─ Type Issue: gameState.artists does NOT exist               │
│                                                                  │
│  ⚠️ CRITICAL BUG: GameEngine expects gameState.artists          │
│     5 locations in game-engine.ts:                              │
│     - Line 898: gameState.artists?.find(...)                   │
│     - Line 1052: gameState.artists?.filter(...)                │
│     - Line 1154: gameState.artists?.find(...)                  │
│     - Line 1185: gameState.artists?.filter(...)                │
│     - Line 2859: gameState.artists?.find(...)                  │
│                                                                  │
│  Current Behavior: Uses optional chaining (?.) to avoid crash   │
│  Side Effect: Features silently fail when artists not found    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (Client UI)                │
│                                                                  │
│  client/src/store/gameStore.ts                                 │
│  ├─ Zustand store: { gameState, artists, ... }                 │
│  ├─ Loads via: GET /api/game/:id                               │
│  └─ Type: Artist[] (database schema type)                      │
│                                                                  │
│  client/src/pages/ArtistsLandingPage.tsx                       │
│  ├─ Reads: artists from gameStore                              │
│  ├─ Converts: Artist → GameArtist via toGameArtist()           │
│  ├─ Tries to access: temperament, signingCost, weeklyCost,     │
│  │                    bio, age                                  │
│  └─ Result: UNDEFINED - data was lost in database layer!       │
│                                                                  │
│  ⚠️ TypeScript Errors (5 total):                                │
│     - artist.temperament (used in ArtistsLandingPage:34)       │
│     - artist.signingCost (used in ArtistsLandingPage:38)       │
│     - artist.weeklyCost (used in ArtistsLandingPage:39)        │
│     - artist.bio (used in ArtistsLandingPage:40)               │
│     - artist.age (used in ArtistsLandingPage:42)               │
└─────────────────────────────────────────────────────────────────┘

```

---

## Dependency Graph

### 1. JSON Data Files (Content Source)

**File**: `data/artists.json`

**Properties** (Complete GameArtist model):
```json
{
  "id": "art_1",
  "name": "Nova Sterling",
  "archetype": "Visionary",
  "talent": 85,
  "workEthic": 65,
  "popularity": 10,
  "temperament": 75,      ← USED IN UI (missing in DB)
  "energy": 60,
  "mood": 70,
  "signingCost": 8000,    ← USED IN SIGNING (missing in DB)
  "weeklyCost": 1200,     ← USED IN FINANCE (mapped to weeklyFee)
  "bio": "...",           ← USED IN UI (missing in DB)
  "genre": "Pop",
  "age": 23,              ← USED IN UI (missing in DB)
  "signed": false
}
```

**Loaded By**:
- `shared/utils/dataLoader.ts` → `loadArtistsData()`
- `server/data/gameData.ts` → caches in `ServerGameData`

**Type**: `GameArtist` (shared/types/gameTypes.ts:3-19)

---

### 2. Database Schema (Persistence Layer)

**File**: `shared/schema.ts:28-62`

**Table**: `artists`

**Columns** (Incomplete - missing 5 properties):
```typescript
{
  id: uuid,
  name: text,
  archetype: text,
  genre: text,
  mood: integer,
  energy: integer,
  popularity: integer,
  signedWeek: integer,
  isSigned: boolean,        ← Should be "signed"
  weeklyFee: integer,       ← Should be "weeklyCost"
  gameId: uuid,
  talent: integer,
  workEthic: integer,
  stress: integer,
  creativity: integer,
  massAppeal: integer,
  lastAttentionWeek: integer,
  experience: integer,
  moodHistory: jsonb,
  lastMoodEvent: text,
  moodTrend: integer
}
```

**Missing Columns**:
1. `temperament` - Used in UI to show artist personality
2. `signingCost` - Used in signing flow to charge player
3. `bio` - Used in UI artist cards
4. `age` - Used in UI artist cards
5. `signed` vs `isSigned` - Inconsistent naming

**Type**: `Artist` (schema.ts:577)

**Used By**:
- `server/storage.ts` → All CRUD operations
- `server/routes.ts` → API endpoints

---

### 3. GameEngine Runtime (Game Logic Layer)

**File**: `shared/engine/game-engine.ts`

**Constructor**:
```typescript
constructor(
  private gameState: GameState,
  gameData: ServerGameData,
  storage?: any
)
```

**Issue**: GameEngine expects `gameState.artists` but:
- GameState type does NOT include `artists: GameArtist[]`
- GameState is loaded from database without artists array
- GameEngine tries to access via `this.gameState.artists?.find(...)`

**Locations Using `gameState.artists`** (5 total):
1. **Line 898** - `processAction()` → User-selected mood targeting
   ```typescript
   const artist = this.gameState.artists?.find(a => a.id === targetArtistId);
   ```

2. **Line 1052** - `processAction()` → Global mood effects
   ```typescript
   const signedArtists = this.gameState.artists?.filter(a => a.isSigned) || [];
   ```

3. **Line 1154** - `processAction()` → Predetermined mood targeting
   ```typescript
   const artist = this.gameState.artists?.find(a => a.id === artistId);
   ```

4. **Line 1185** - `processAction()` → Global artist iteration
   ```typescript
   const signedArtists = this.gameState.artists?.filter(a => a.isSigned) || [];
   ```

5. **Line 2859** - `applyArtistChangesToDatabase()` → Energy change application
   ```typescript
   const artist = this.gameState.artists?.find((a: GameArtist) => a.id === artistId);
   ```

**Current Mitigation**: Optional chaining (`?.`) prevents crashes but causes silent failures

**Proper Approach**: GameEngine calls `storage.getArtistsByGame()` separately

---

### 4. API Routes (Data Transformation Layer)

**File**: `server/routes.ts`

#### 4.1 Game Load Endpoint

**Route**: `GET /api/game/:id` (lines 430-453)

```typescript
const gameState = await storage.getGameState(gameId);
const artists = await storage.getArtistsByGame(gameState.id);  // ← Separate query

res.json({
  gameState,    // Type: GameState (no artists property)
  artists,      // Type: Artist[] (database schema)
  ...
});
```

**Result**: Client receives `artists` separately, not in `gameState`

#### 4.2 Artist Signing Endpoint

**Route**: `POST /api/artists` (lines 1490-1550)

**CRITICAL**: Property mapping workaround at line 1501:
```typescript
const validatedData = insertArtistSchema.parse({
  ...req.body,
  gameId: gameId,
  weeklyFee: req.body.weeklyCost || req.body.weeklyFee || 1200  // ← WORKAROUND
});
```

**This proves**:
- Code is aware of the `weeklyCost` → `weeklyFee` mismatch
- Frontend sends `weeklyCost` (from GameArtist)
- Backend maps it to `weeklyFee` (for database)
- Other properties (temperament, signingCost, bio, age) are **silently dropped**

---

### 5. Client Store (State Management)

**File**: `client/src/store/gameStore.ts`

**Zustand Store**:
```typescript
{
  gameState: GameState | null,
  artists: Artist[] | null,    // ← Database schema type
  ...
}
```

**Load Function**:
```typescript
const response = await apiRequest('/api/game/:id');
set({
  gameState: response.gameState,
  artists: response.artists,    // ← Artist[], not GameArtist[]
  ...
});
```

---

### 6. UI Components (Presentation Layer)

**File**: `client/src/pages/ArtistsLandingPage.tsx`

**Type Conversion** (lines 26-44):
```typescript
const toGameArtist = (artist: Artist): GameArtist => {
  return {
    ...
    temperament: artist.temperament,        // ← UNDEFINED (not in DB)
    signingCost: artist.signingCost,        // ← UNDEFINED (not in DB)
    weeklyCost: artist.weeklyCost,          // ← UNDEFINED (not in DB)
    bio: artist.bio,                        // ← UNDEFINED (not in DB)
    age: artist.age,                        // ← UNDEFINED (not in DB)
  };
};
```

**TypeScript Errors**: 5 errors because `Artist` type doesn't have these properties

**Runtime Behavior**: Properties are `undefined`, UI shows blanks or defaults

---

## Property-by-Property Analysis

| Property | JSON | GameArtist Type | DB Schema | Artist Type | Used In Code | Status |
|----------|------|-----------------|-----------|-------------|--------------|--------|
| `id` | ✅ | ✅ Required | ✅ `id` (uuid) | ✅ | All layers | ✅ OK |
| `name` | ✅ | ✅ Required | ✅ `name` (text) | ✅ | All layers | ✅ OK |
| `archetype` | ✅ | ✅ Required | ✅ `archetype` (text) | ✅ | All layers | ✅ OK |
| `genre` | ✅ | ✅ Optional | ✅ `genre` (text) | ✅ | All layers | ✅ OK |
| `talent` | ✅ | ✅ Required | ✅ `talent` (int) | ✅ | All layers | ✅ OK |
| `workEthic` | ✅ | ✅ Required | ✅ `workEthic` (int) | ✅ | All layers | ✅ OK |
| `popularity` | ✅ | ✅ Required | ✅ `popularity` (int) | ✅ | All layers | ✅ OK |
| `mood` | ✅ | ✅ Required | ✅ `mood` (int) | ✅ | All layers | ✅ OK |
| `energy` | ✅ | ✅ Required | ✅ `energy` (int) | ✅ | All layers | ✅ OK |
| `signed` | ✅ | ✅ Required | ❌ → `isSigned` | ❌ → `isSigned` | All layers | ⚠️ NAME MISMATCH |
| `temperament` | ✅ | ✅ Required | ❌ MISSING | ❌ MISSING | ArtistsLandingPage:34 | ❌ DATA LOSS |
| `signingCost` | ✅ | ✅ Optional | ❌ MISSING | ❌ MISSING | ArtistsLandingPage:38, Signing | ❌ DATA LOSS |
| `weeklyCost` | ✅ | ✅ Optional | ❌ → `weeklyFee` | ❌ → `weeklyFee` | Financial, UI | ⚠️ NAME MISMATCH + WORKAROUND |
| `bio` | ✅ | ✅ Optional | ❌ MISSING | ❌ MISSING | ArtistsLandingPage:40 | ❌ DATA LOSS |
| `age` | ✅ | ✅ Optional | ❌ MISSING | ❌ MISSING | ArtistsLandingPage:42 | ❌ DATA LOSS |

---

## Code References Where Properties Are Used

### ✅ Properties Working Correctly

These properties exist in both GameArtist and database schema:

- **talent, workEthic, popularity, mood, energy**
  - Used throughout: GameEngine calculations, UI displays, ROI analytics
  - No issues

### ⚠️ Properties with Name Mismatches

#### 1. `signed` vs `isSigned`

**JSON/GameArtist**: `signed: boolean`
**Database**: `isSigned: boolean` (schema.ts:37)

**Used in**:
- `shared/engine/game-engine.ts:1052` - `gameState.artists?.filter(a => a.isSigned)`
- `shared/engine/game-engine.ts:1185` - `gameState.artists?.filter(a => a.isSigned)`
- `server/routes.ts` - Multiple locations checking signing status

**Workaround**: Code uses `isSigned` when working with database, `signed` when working with JSON

#### 2. `weeklyCost` vs `weeklyFee`

**JSON/GameArtist**: `weeklyCost: number`
**Database**: `weeklyFee: integer` (schema.ts:38)

**Used in**:
- `server/routes.ts:1501` - **EXPLICIT WORKAROUND**: `weeklyFee: req.body.weeklyCost || req.body.weeklyFee`
- `shared/engine/FinancialSystem.ts` - Weekly expense calculations
- `client/src/pages/ArtistsLandingPage.tsx:39` - UI display

**Workaround**: Server maps property names during insert

### ❌ Properties Causing Data Loss

#### 1. `temperament`

**JSON**: ✅ Present in all artists (e.g., `"temperament": 75`)
**Database**: ❌ No column
**Type**: ❌ Not in Artist type

**Used in**:
- `client/src/pages/ArtistsLandingPage.tsx:34` - TypeScript error
- `client/src/components/ArtistCard.tsx` - Displays personality traits

**Impact**: UI cannot show artist temperament, gameplay feature broken

#### 2. `signingCost`

**JSON**: ✅ Present in all artists (e.g., `"signingCost": 8000`)
**Database**: ❌ No column
**Type**: ❌ Not in Artist type

**Used in**:
- `server/routes.ts:1470` - Signing flow: `const signingCost = req.body.signingCost || 0;`
- `client/src/pages/ArtistsLandingPage.tsx:38` - TypeScript error
- `client/src/components/ArtistDiscoveryModal.tsx` - Shows signing cost in discovery

**Impact**:
- Discovery UI shows signing cost correctly (from JSON)
- After signing, cost data is LOST (not stored in DB)
- Financial tracking broken for signed artists

#### 3. `weeklyCost`

**See "Name Mismatches" above** - Has workaround but creates confusion

#### 4. `bio`

**JSON**: ✅ Present in all artists (e.g., `"bio": "Experimental indie artist..."`)
**Database**: ❌ No column
**Type**: ❌ Not in Artist type

**Used in**:
- `client/src/pages/ArtistsLandingPage.tsx:40` - TypeScript error
- `client/src/components/ArtistCard.tsx` - Displays artist biography

**Impact**: Artist biography UI feature broken

#### 5. `age`

**JSON**: ✅ Present in all artists (e.g., `"age": 23`)
**Database**: ❌ No column
**Type**: ❌ Not in Artist type

**Used in**:
- `client/src/pages/ArtistsLandingPage.tsx:42` - TypeScript error
- `client/src/components/ArtistCard.tsx` - Displays artist age

**Impact**: Artist age UI feature broken

---

## The `gameState.artists` Mystery

### Current State

**GameState Type** (shared/types/gameTypes.ts:92-120):
```typescript
export interface GameState {
  id: string;
  currentWeek: number;
  money: number;
  // ... other properties
  // ❌ NO artists property!
}
```

**GameEngine Usage**:
```typescript
// 5 locations try to access gameState.artists:
this.gameState.artists?.find(...)    // ← artists is undefined
this.gameState.artists?.filter(...)  // ← artists is undefined
```

### Why This Doesn't Crash

**Optional chaining (`?.`)** prevents runtime errors:
```typescript
const artist = this.gameState.artists?.find(a => a.id === artistId);
// If gameState.artists is undefined, artist becomes undefined
// No error thrown, but feature silently fails
```

### Actual Data Flow

**Server**:
```typescript
// routes.ts:435
const artists = await storage.getArtistsByGame(gameState.id);  // Separate query

// GameEngine instantiation
const gameEngine = new GameEngine(gameState, serverGameData, storage);

// Inside GameEngine.advanceWeek():
const signed = await this.storage.getArtistsByGame(this.gameState.id);  // Uses storage
```

**Conclusion**:
- GameEngine **does NOT** use `gameState.artists`
- It calls `storage.getArtistsByGame()` directly
- The `gameState.artists?.` code is **dead code** or **legacy/incorrect**

### Why This Matters

**Tests** create mock GameState with `artists` property:
```typescript
// tests/engine/mood-application-verification.test.ts:157
const gameState = {
  ...baseGameState,
  artists: mockArtists  // ← Only exists in tests!
};
```

**Production** never populates `gameState.artists`, so those code paths fail silently.

---

## Validation Schema Comparison

### Zod Schema (shared/schemas/artist.ts)

```typescript
export const ArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.enum(['Visionary', 'Workhorse', 'Trendsetter']),
  mood: z.number(),
  energy: z.number(),
  popularity: z.number(),
  signedWeek: z.number().nullable().optional(),
  isSigned: z.boolean().optional(),
  gameId: z.string().nullable().optional(),
  talent: z.number().optional(),
  workEthic: z.number().optional(),
  temperament: z.number().optional(),      // ← Allowed but not in DB!
  signed: z.boolean().optional(),
  signingCost: z.number().optional(),      // ← Allowed but not in DB!
  weeklyCost: z.number().optional(),       // ← Allowed but not in DB!
  bio: z.string().optional(),              // ← Allowed but not in DB!
  genre: z.string().optional(),
  age: z.number().optional()               // ← Allowed but not in DB!
});
```

**Issue**: Zod schema allows properties that database doesn't store!

### Drizzle Schema

```typescript
export const insertArtistSchema = createInsertSchema(artists).omit({
  id: true,
});
```

**Issue**: Auto-generated from database schema, so it **excludes** missing columns.

**Result**: Property validation mismatch between layers.

---

## Impact Summary

### Critical Issues (Prevent Features from Working)

1. **GameState.artists Undefined** - 5 code paths fail silently
   - Mood targeting in executive meetings
   - Global artist effects
   - Energy change application

2. **Data Loss on Artist Signing** - 5 properties dropped
   - `temperament` - UI feature broken
   - `signingCost` - Financial tracking incomplete
   - `bio` - UI feature broken
   - `age` - UI feature broken
   - `weeklyCost` - Workaround exists but confusing

### Medium Issues (Cause Confusion/Technical Debt)

3. **Property Name Inconsistencies**
   - `signed` vs `isSigned` - Code uses both
   - `weeklyCost` vs `weeklyFee` - Requires manual mapping

4. **Type Safety Violations**
   - 70+ TypeScript errors across codebase
   - Tests mock data that doesn't match production

### Low Issues (Cosmetic/Documentation)

5. **Validation Schema Mismatch**
   - Zod schema allows properties DB doesn't store
   - Misleading for developers

---

## Root Cause

**The database schema was created incompletely**:

1. Someone looked at the JSON files
2. They created the database schema
3. They **forgot** to add `temperament`, `signingCost`, `bio`, `age`
4. They **renamed** `signed` → `isSigned` and `weeklyCost` → `weeklyFee`
5. Code was written to work around these issues (workarounds in routes.ts)
6. GameEngine was written expecting `gameState.artists` (incorrect assumption)

**The GameArtist type is correct** - it matches the source JSON data.

**The database schema is wrong** - it's incomplete and uses different names.

---

## Recommended Solution

### Option A: Align Database to GameArtist (RECOMMENDED)

**Why**: JSON files are the source of truth for game content

**Steps**:
1. Add missing columns to database:
   - `temperament INTEGER`
   - `signing_cost INTEGER`
   - `bio TEXT`
   - `age INTEGER`
2. Rename columns for consistency:
   - `is_signed` → `signed`
   - `weekly_fee` → `weekly_cost`
3. Remove workaround in routes.ts:1501
4. Update Drizzle schema
5. Run migration

**Benefits**:
- ✅ Eliminates all TypeScript errors
- ✅ No code changes needed (code is already correct!)
- ✅ Preserves all game content
- ✅ Removes technical debt

**Risks**:
- ⚠️ Requires database migration
- ⚠️ Need to handle existing data

### Option B: Fix gameState.artists Issue

**Independent of Option A**, we need to decide:

1. **Remove dead code**: Delete `gameState.artists?.` references (GameEngine uses storage)
2. **Add to type**: Add `artists?: GameArtist[]` to GameState and populate it

**Recommendation**: Option 1 (remove dead code) because:
- GameEngine already uses `storage.getArtistsByGame()`
- `gameState.artists` is never populated in production
- Cleaner separation of concerns

---

## Files Requiring Changes

### If implementing Option A (Database Alignment):

1. **Database Migration**:
   - Create SQL migration to add columns and rename existing ones

2. **shared/schema.ts**:
   - Add: `temperament`, `signingCost`, `bio`, `age` columns
   - Rename: `isSigned` → `signed`, `weeklyFee` → `weeklyCost`

3. **server/routes.ts:1501**:
   - Remove workaround: `weeklyFee: req.body.weeklyCost || req.body.weeklyFee`

4. **shared/types/gameTypes.ts** (Optional):
   - Remove `artists?: GameArtist[]` from GameState if not used

5. **shared/engine/game-engine.ts**:
   - Remove 5 instances of `gameState.artists?.`
   - Verify all use `storage.getArtistsByGame()` instead

### TypeScript Errors That Will Be Fixed:

- ❌ `client/src/pages/ArtistsLandingPage.tsx` (5 errors) → ✅ Fixed
- ❌ `shared/engine/game-engine.ts` (5 errors) → ✅ Fixed
- ❌ `server/routes.ts` (null safety) → ✅ Fixed
- ❌ 60+ test errors → ✅ Fixed

---

## Conclusion

The schema/type mismatch is not a design decision—it's **incomplete implementation**.

The solution is architectural alignment: **make the database match the game content**.

After alignment:
- ✅ All TypeScript errors resolved
- ✅ All UI features work correctly
- ✅ No data loss on artist signing
- ✅ Clean, maintainable codebase

The work is **surgical and low-risk**:
- Add 4 columns
- Rename 2 columns
- Remove 1 workaround
- Clean up dead code

**Next Step**: Create migration script and execute Option A.
