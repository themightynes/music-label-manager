# Task List: Tier Progression Visual Feedback

**Based on PRD**: `0001-prd-tier-progression-visual-feedback.md`

## Relevant Files

- `shared/schema.ts` - Add `tierUnlockHistory` JSONB column to `gameStates` table schema (lines 242-271)
- `migrations/0001_add_tier_unlock_history.sql` - SQL migration to add new column to existing games table
- `shared/engine/game-engine.ts` - Update `checkAccessTierProgression()` to track unlock history (lines 3120-3142)
- `shared/types/gameTypes.ts` - Add TypeScript type definitions for `tierUnlockHistory` structure
- `client/src/components/AccessTierBadges.tsx` - Display unlock week timestamps in expanded tier view (lines 272-313)
- `client/src/pages/GamePage.tsx` - Add toast trigger logic when tier unlocks occur (or in store/gameStore.ts)
- `client/src/store/gameStore.ts` - Alternative location for toast trigger if using Zustand state updates
- `client/src/hooks/use-toast.ts` - Existing toast hook (no changes needed, reference only)
- `client/src/components/WeekSummary.tsx` - Reference for existing achievements display (no changes needed, reference only)
- `package.json` - Add `test` script to run Vitest
- `tests/task-0001/schema-and-types.test.ts` - Vitest tests for schema and types related to tier unlock history

### Notes

- No unit tests required per project conventions (game logic testing done manually via gameplay)
- Database migration will be a raw SQL file to alter the existing `game_states` table
- Migration should be run with `npm run db:push` after creation
- Toast system already exists via shadcn/ui and just needs integration with tier unlock events
- The `tierUnlockHistory` field will be optional to support existing games that don't have unlock history

## Tasks

- [x] 1.0 Add tier unlock history to database schema and types
  - [x] 1.1 Add `tierUnlockHistory` JSONB column to `gameStates` table in `shared/schema.ts` (after line 263, before `createdAt`)
  - [x] 1.2 Create SQL migration file `migrations/0001_add_tier_unlock_history.sql` with `ALTER TABLE game_states ADD COLUMN tier_unlock_history JSONB DEFAULT '{}'::jsonb;`
  - [x] 1.3 Add TypeScript type definition for `TierUnlockHistory` in `shared/types/gameTypes.ts` with structure: `{ playlist?: { niche?: number, mid?: number, flagship?: number }, press?: { blogs?: number, mid_tier?: number, national?: number }, venue?: { clubs?: number, theaters?: number, arenas?: number } }`
  - [x] 1.4 Add `tierUnlockHistory?: TierUnlockHistory` field to `GameState` interface in `shared/types/gameTypes.ts`
  - [x] 1.5 Run `npm run db:push` to apply schema changes to database

- [ ] 2.0 Implement tier unlock tracking in GameEngine
  - [ ] 2.1 Locate `checkAccessTierProgression()` function in `shared/engine/game-engine.ts` (around lines 3120-3142)
  - [ ] 2.2 Initialize `tierUnlockHistory` if it doesn't exist at start of function: `if (!gameState.tierUnlockHistory) gameState.tierUnlockHistory = {};`
  - [ ] 2.3 For playlist tier unlocks: after creating unlock notification (line ~3120), add `if (!gameState.tierUnlockHistory.playlist) gameState.tierUnlockHistory.playlist = {}; gameState.tierUnlockHistory.playlist[newTierName] = gameState.week;`
  - [ ] 2.4 For press tier unlocks: after creating unlock notification (line ~3131), add `if (!gameState.tierUnlockHistory.press) gameState.tierUnlockHistory.press = {}; gameState.tierUnlockHistory.press[newTierName] = gameState.week;`
  - [ ] 2.5 For venue tier unlocks: after creating unlock notification (line ~3142), add `if (!gameState.tierUnlockHistory.venue) gameState.tierUnlockHistory.venue = {}; gameState.tierUnlockHistory.venue[newTierName] = gameState.week;`
  - [ ] 2.6 Verify tier unlock history is included in API response by checking return value includes updated `gameState`

- [ ] 3.0 Display unlock history in AccessTierBadges component
  - [ ] 3.1 Open `client/src/components/AccessTierBadges.tsx` and locate the expanded tier view (lines 272-313)
  - [ ] 3.2 Add helper function to map UI tier names to database tier names: `const getTierKey = (tierName: string) => tierName.toLowerCase().replace('-', '_');` (e.g., "Mid-Tier" → "mid_tier")
  - [ ] 3.3 In the tier mapping section (lines 277-309), after the tier name display (line 283), add unlock week display
  - [ ] 3.4 Add conditional rendering: `{tier.name !== 'None' && gameState.tierUnlockHistory?.[tierType]?.[getTierKey(tier.name)] && (<span className="text-xs text-white/50 ml-2">• Unlocked Week {gameState.tierUnlockHistory[tierType][getTierKey(tier.name)]}</span>)}`
  - [ ] 3.5 Verify the unlock week appears next to unlocked tier names in the expanded view

- [ ] 4.0 Add toast notifications for tier unlocks
  - [ ] 4.1 Determine best location for toast trigger: check if `GamePage.tsx` or `gameStore.ts` handles week advance responses
  - [ ] 4.2 Import `toast` from `@/hooks/use-toast` at the top of the chosen file
  - [ ] 4.3 Import icons from lucide-react: `import { Music, Megaphone, Building } from 'lucide-react';`
  - [ ] 4.4 After receiving `WeekSummary` from week advance API response, add toast logic: iterate through `weekSummary.changes` array
  - [ ] 4.5 For each change with `type === 'unlock'`, check if description includes 'playlist', 'press', or 'venue' keywords
  - [ ] 4.6 Trigger toast with appropriate icon and message: `toast({ title: "🔓 New Access Unlocked", description: change.description });`
  - [ ] 4.7 Add helper function to get tier icon: `const getTierIcon = (desc: string) => desc.includes('playlist') ? Music : desc.includes('press') ? Megaphone : Building;`
  - [ ] 4.8 Enhance toast to include icon component in title or description for better visual feedback

- [ ] 5.0 Test and verify tier unlock system
  - [ ] 5.1 Start dev server with `npm run dev` and load an existing game save
  - [ ] 5.2 Verify database migration applied successfully: check `game_states` table has `tier_unlock_history` column
  - [ ] 5.3 Test tier unlock by increasing reputation to trigger a tier threshold (e.g., 10 reputation for Playlist Niche)
  - [ ] 5.4 Verify toast notification appears immediately when tier unlocks
  - [ ] 5.5 Verify email notification still sent to inbox (existing functionality should not break)
  - [ ] 5.6 Verify weekly summary shows tier unlock in achievements section (existing functionality should not break)
  - [ ] 5.7 Navigate to Dashboard and open `AccessTierBadges` component
  - [ ] 5.8 Expand a tier card and verify "Unlocked: Week X" appears next to unlocked tiers
  - [ ] 5.9 Test save/load game to verify `tierUnlockHistory` persists correctly
  - [ ] 5.10 Test with a new game to verify empty `tierUnlockHistory` initializes correctly
  - [ ] 5.11 Test all three tier types: Playlist, Press, and Venue Access unlocks
  - [ ] 5.12 Verify multiple tier unlocks in one week show separate toasts (or queue properly)

---

## Implementation Notes

### Tier Name Mapping Reference

The database uses lowercase tier names, while the UI uses title-case names. Use this mapping:

**Playlist Access:**
- UI: "Niche", "Mid", "Flagship"
- DB: "niche", "mid", "flagship"

**Press Access:**
- UI: "Blogs", "Mid-Tier", "Major"
- DB: "blogs", "mid_tier", "national"

**Venue Access:**
- UI: "Clubs", "Theaters", "Arenas"
- DB: "clubs", "theaters", "arenas"

### Toast Integration Examples

```typescript
// Example toast trigger in week advance handler
weekSummary.changes?.forEach(change => {
  if (change.type === 'unlock' && change.description) {
    const desc = change.description.toLowerCase();
    if (desc.includes('playlist') || desc.includes('press') || desc.includes('venue')) {
      toast({
        title: "🔓 New Access Unlocked",
        description: change.description,
      });
    }
  }
});
```

### Database Schema Addition

```sql
-- migrations/0001_add_tier_unlock_history.sql
ALTER TABLE game_states
ADD COLUMN tier_unlock_history JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN game_states.tier_unlock_history IS 'Tracks when each access tier was unlocked, storing week numbers';
```

### TypeScript Type Definition

```typescript
// shared/types/gameTypes.ts
export interface TierUnlockHistory {
  playlist?: {
    niche?: number;
    mid?: number;
    flagship?: number;
  };
  press?: {
    blogs?: number;
    mid_tier?: number;
    national?: number;
  };
  venue?: {
    clubs?: number;
    theaters?: number;
    arenas?: number;
  };
}

// Add to GameState interface
export interface GameState {
  // ... existing fields
  tierUnlockHistory?: TierUnlockHistory;
}
```

---

**Status**: Ready for implementation
**Estimated Complexity**: Medium (touches backend, frontend, and database layers)
**Dependencies**: Requires database migration before testing
