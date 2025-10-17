# Weekly Meeting Randomization Feature

## Overview
Implemented a deterministic randomization system that shows each executive exactly ONE meeting per week instead of displaying all available meetings in a carousel.

## Key Requirements Met
- ✅ Each executive shows only 1 meeting per week
- ✅ Meetings are randomized but deterministic (same game + week = same meetings)
- ✅ Different games have different meeting patterns
- ✅ No database schema changes required
- ✅ Backwards compatible with existing code
- ✅ Works with AUTO feature for automatic focus slot filling
- ✅ Cache invalidation when week changes

## Technical Implementation

### Seeded Randomization Algorithm
**File**: `shared/utils/seededRandom.ts`

Uses a deterministic random number generator based on string seeds:
- Seed format: `{gameId}-week{weekNumber}-{roleId}`
- Hash function: Java's String.hashCode() algorithm
- RNG: Sin-based linear congruential generator

```typescript
const seed = generateMeetingSeed('game-123', 5, 'ceo');
// Result: "game-123-week5-ceo"

const randomMeeting = seededRandomPick(allMeetings, seed);
// Same seed always returns same meeting
```

### API Endpoint Changes
**File**: `server/routes.ts`

The `/api/roles/:roleId` endpoint now accepts optional query parameters:
- `?gameId=<gameId>&week=<weekNumber>` - Returns 1 randomized meeting
- No params - Returns all meetings (legacy behavior)

```typescript
GET /api/roles/ceo?gameId=game-123&week=5
// Returns exactly 1 meeting for CEO in week 5 of game-123

GET /api/roles/ceo
// Returns all CEO meetings (backwards compatible)
```

### State Machine Updates
**File**: `client/src/machines/executiveMeetingMachine.ts`

**Context Changes**:
- Added `currentWeek: number` to track current game week
- Cache keys changed from `roleId` to `${roleId}-week${weekNumber}`

**New Events**:
- `SYNC_WEEK` - Synchronizes week changes and clears stale cache

**Cache Key Format**:
```typescript
// Old: meetingsCache['ceo']
// New: meetingsCache['ceo-week5']
```

This ensures meetings cached for week 5 aren't accidentally used in week 6.

### Frontend Service Updates
**File**: `client/src/services/executiveService.ts`

Updated `fetchRoleMeetings()` signature:
```typescript
// Before
fetchRoleMeetings(roleId: string): Promise<RoleMeeting[]>

// After
fetchRoleMeetings(
  roleId: string,
  gameId?: string,
  currentWeek?: number
): Promise<RoleMeeting[]>
```

### Component Integration
**File**: `client/src/components/executive-meetings/ExecutiveMeetings.tsx`

Added week synchronization effect:
```typescript
useEffect(() => {
  send({
    type: 'SYNC_WEEK',
    currentWeek
  });
}, [currentWeek, send]);
```

This clears the meeting cache whenever the week changes, forcing fresh API calls with the new week parameter.

## Bug Fixes

### Bug 1: Page Refresh Shows All Meetings
**Issue**: Initial navigation showed 1 meeting (correct), but F5 refresh showed all meetings.

**Root Cause**: Cache keys were only using `roleId`, not including week number. Stale cache entries from previous fetches (without week params) were being reused.

**Fix**: Changed cache keys to `${roleId}-week${weekNumber}` format throughout the machine.

## AUTO Feature Compatibility

Both AUTO implementations work correctly with randomized meetings:

### GameSidebar AUTO
**File**: `client/src/components/GameSidebar.tsx`
- Already passes `gameId` and `currentWeek` to `fetchRoleMeetings()`
- Gets exactly 1 meeting per executive per week
- Filters out `user_selected` meetings that require manual artist choice
- Scores executives by priority and fills available focus slots

### XState Machine AUTO
**File**: `client/src/machines/executiveMeetingMachine.ts`
- AUTO_SELECT event triggers `prepareAutoSelections` action
- Uses week-specific cache keys: `${role}-week${context.currentWeek}`
- Same deterministic behavior as manual selection
- Same meeting filtering logic applies

**Key Behavior**: Same week = same AUTO selections (deterministic)

## Test Coverage

**File**: `tests/features/test-executive-meeting-machine.test.ts`

All test cases updated to include `currentWeek` in machine input:
```typescript
actor = createActor(executiveMeetingMachine, {
  input: {
    gameId: 'test-game',
    currentWeek: 1,  // Added to all tests
    focusSlotsTotal: 2,
    // ...
  },
});
```

All tests passing ✅

## How It Works (User Perspective)

### Week 1
- CEO: Shows "Artist Roundtable" meeting
- A&R: Shows "Talent Scout" meeting
- CCO: Shows "Publishing Deal" meeting
- CMO: Shows "Social Media Campaign" meeting
- Distribution: Shows "Streaming Optimization" meeting

### Week 2
- CEO: Shows "Budget Review" meeting (different from week 1)
- A&R: Shows "Studio Session" meeting (different from week 1)
- CCO: Shows "Sync Licensing" meeting (different from week 1)
- CMO: Shows "Radio Promotion" meeting (different from week 1)
- Distribution: Shows "Physical Distribution" meeting (different from week 1)

### Week 3
- Each executive gets another randomized meeting
- Pattern continues indefinitely
- **Same game + same week = same meetings** (deterministic)

## Developer Notes

### Adding New Meetings
1. Add meeting definitions to `data/actions.json`
2. Meetings automatically enter the randomization pool
3. No code changes needed for new meetings
4. Filter test meetings by ensuring IDs don't start with `TEST_`

### Debugging Meeting Selection
Check server logs for randomization details:
```
[MEETING API] Request for ceo - gameId: game-123, week: 5
Found 4 meetings for role ceo
[MEETING API] ✅ Randomized to 1 meeting for ceo week 5: artist_roundtable_discussion
```

If no randomization occurs:
```
[MEETING API] ❌ NO RANDOMIZATION - returning all 4 meetings for ceo
```

This indicates missing `gameId` or `week` query parameters.

### Cache Invalidation
Cache is automatically cleared when:
1. Week number changes (SYNC_WEEK event)
2. REFRESH_EXECUTIVES event is sent
3. Component unmounts and remounts

### Backwards Compatibility
Calling `fetchRoleMeetings(roleId)` without gameId/week parameters returns all meetings. This ensures legacy code continues to work during gradual migration.

## Future Enhancements (Not Implemented)

- **Meeting History Tracking**: Store which meetings have been seen to avoid repetition over long games
- **Weighted Randomization**: Give certain meetings higher/lower probabilities based on game state
- **Conditional Meetings**: Show/hide meetings based on label reputation, artist roster size, etc.
- **Player Preferences**: Allow players to "favorite" certain meeting types for higher probability
- **Season-Based Patterns**: Different meeting pools for early game vs. late game

## Related Files

### Core Implementation
- `shared/utils/seededRandom.ts` - Randomization utilities
- `server/routes.ts` - API endpoint with randomization logic
- `client/src/services/executiveService.ts` - Frontend service layer
- `client/src/machines/executiveMeetingMachine.ts` - XState machine with cache management

### UI Components
- `client/src/components/executive-meetings/ExecutiveMeetings.tsx` - Main container
- `client/src/components/executive-meetings/MeetingSelector.tsx` - Meeting carousel (now shows 1 item)
- `client/src/components/GameSidebar.tsx` - AUTO button implementation

### Tests
- `tests/features/test-executive-meeting-machine.test.ts` - State machine tests

### Data
- `data/actions.json` - Meeting definitions source of truth

## Configuration

No configuration files needed. Behavior is determined by:
- Meeting definitions in `actions.json`
- Query parameters passed to API endpoint
- Current game week tracked in game state

## Performance Notes

- Randomization is O(n) where n = number of meetings for a role (typically 3-5)
- Seeded RNG is deterministic and very fast (< 1ms)
- Cache prevents redundant API calls within same week
- No database queries required for randomization

## Security Considerations

- Seed inputs (gameId, week, roleId) are never user-controlled in the randomization logic
- gameId is validated against authenticated user's game ownership
- Week number is server-authoritative from game state
- No sensitive data exposed in seeds or random selection
