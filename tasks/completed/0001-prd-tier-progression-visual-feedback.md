# PRD: Visual Feedback for Tier Progression

## Introduction/Overview

The Music Label Manager currently has a functional access tier system (Playlist Access, Press Access, Venue Access) that gates features based on player reputation. The system includes several existing features:

**Existing Implementation** ✅:
- Three tier types: Playlist, Press, and Venue Access (each with 4 levels: None → Low → Mid → High)
- `AccessTierBadges` component ([client/src/components/AccessTierBadges.tsx:1-332](client/src/components/AccessTierBadges.tsx)) showing:
  - Current tier badges with color coding
  - Progress bars toward next tier (percentage-based)
  - Expandable tier cards showing all progression paths
  - Lock icons on locked tiers with requirements
- Weekly Summary ([client/src/components/WeekSummary.tsx:290-308](client/src/components/WeekSummary.tsx)) showing unlock notifications in "Achievements" section
- Email system ([shared/engine/EmailGenerator.ts:148-193](shared/engine/EmailGenerator.ts)) sending tier unlock emails to in-game inbox
- GameEngine ([shared/engine/game-engine.ts:3120-3142](shared/engine/game-engine.ts)) tracking tier changes and generating unlock notifications in `WeekSummary.changes`
- shadcn/ui toast system ([client/src/hooks/use-toast.ts](client/src/hooks/use-toast.ts)) ready for integration

**Missing Features** ❌ (This PRD addresses):
- **Immediate toast notifications** for tier unlocks (currently only shown in weekly summary)
- **Tier unlock history timestamps** showing "Unlocked: Week X" in tier cards
- **Toast trigger integration** when tier unlocks occur during gameplay

**Problem Statement**: While players receive email notifications and weekly summary updates when unlocking tiers, there's no immediate visual feedback during the action that triggers the unlock. Additionally, there's no historical record of *when* tiers were achieved, making it harder for players to track their label's growth milestones over the 52-week campaign.

## Goals

1. **Immediate Unlock Feedback**: Add toast notifications when tiers unlock (complementing existing email system)
2. **Historical Tracking**: Display "Unlocked: Week X" timestamps in existing tier card expanded views
3. **Maintain Existing Design**: Integrate seamlessly with existing `AccessTierBadges` component and brand styling
4. **Data Persistence**: Store tier unlock history in game state for save/load persistence

## User Stories

1. **As a player**, I want to see an immediate toast notification when I unlock a new tier (instead of only discovering it in the weekly summary), so that I feel instantly rewarded for building my reputation
2. **As a player**, I want to see when I unlocked each tier in the tier card details, so that I can track my label's growth milestones
3. **As a player**, I want the tier unlock history to persist when I save/load my game, so that I don't lose my achievement timeline

## Functional Requirements

### FR-1: Immediate Toast Notifications
- **FR-1.1**: Display a toast notification immediately when a tier unlock occurs (leveraging existing shadcn/ui toast system)
- **FR-1.2**: Toast must show: tier type (Playlist/Press/Venue), new tier name (e.g., "Mid"), and icon
- **FR-1.3**: Toast triggers when GameEngine adds unlock notifications to `WeekSummary.changes`
- **FR-1.4**: Use existing `useToast()` hook from [client/src/hooks/use-toast.ts](client/src/hooks/use-toast.ts)
- **FR-1.5**: Toast style must be subtle and match existing brand colors (no elaborate animations)
- **FR-1.6**: Multiple tier unlocks should queue toasts with brief delay (handled by existing toast system)

### FR-2: Tier Unlock History Display
- **FR-2.1**: Add "Unlocked: Week X" timestamp to each tier in the expanded tier card view ([client/src/components/AccessTierBadges.tsx:272-313](client/src/components/AccessTierBadges.tsx))
- **FR-2.2**: Starting tier ("None") should not show unlock timestamp (assumed Week 0)
- **FR-2.3**: Display unlock week next to tier name in expanded view (e.g., "Niche • Unlocked Week 5")
- **FR-2.4**: Current tier maintains existing "Current" badge (line 285)
- **FR-2.5**: Locked tiers continue showing lock icon without unlock date (line 288)

### FR-3: Data Storage & Persistence
- **FR-3.1**: Add `tierUnlockHistory` field to game state schema ([shared/schema.ts](shared/schema.ts))
  - Structure: `tierUnlockHistory: { playlist: { niche: 5, mid: 12 }, press: { blogs: 3 }, venue: { clubs: 2 } }`
  - Keys use lowercase tier names (matching database: 'niche', 'mid', 'flagship', 'blogs', 'mid_tier', 'national', 'clubs', 'theaters', 'arenas')
  - Values are week numbers when tier was unlocked
- **FR-3.2**: Initialize `tierUnlockHistory` to empty object for new games
- **FR-3.3**: Update `tierUnlockHistory` when GameEngine detects tier progression ([shared/engine/game-engine.ts:3120-3142](shared/engine/game-engine.ts))
- **FR-3.4**: Persist `tierUnlockHistory` in database with game saves
- **FR-3.5**: Load `tierUnlockHistory` from database when game is loaded

### FR-4: Backend Integration
- **FR-4.1**: Extend existing tier unlock detection in `GameEngine.checkAccessTierProgression()` ([shared/engine/game-engine.ts:3120-3142](shared/engine/game-engine.ts))
- **FR-4.2**: When tier unlock detected, add week number to `tierUnlockHistory` before returning
- **FR-4.3**: Existing unlock notifications in `WeekSummary.changes` remain unchanged (powers email system)
- **FR-4.4**: Return updated `tierUnlockHistory` in API response along with existing `WeekSummary`

### FR-5: Frontend Integration
- **FR-5.1**: Update `AccessTierBadges` component to read `tierUnlockHistory` from `gameState` prop
- **FR-5.2**: Display unlock week in expanded tier view for unlocked tiers
- **FR-5.3**: Add toast trigger in week advance flow (likely in [client/src/pages/GamePage.tsx](client/src/pages/GamePage.tsx))
- **FR-5.4**: Toast checks `WeekSummary.changes` for `type: 'unlock'` entries related to tiers
- **FR-5.5**: Use existing brand colors and styling (no new design needed)

### FR-6: Visual Styling
- **FR-6.1**: Use existing brand color classes from `tailwind.config.ts`
- **FR-6.2**: Tier badges maintain existing colors ([client/src/components/AccessTierBadges.tsx:28-100](client/src/components/AccessTierBadges.tsx)):
  - None: `bg-brand-purple-light`
  - Low tier: `bg-green-500`
  - Mid tier: `bg-brand-burgundy/100`
  - High tier: `bg-brand-burgundy-dark`
- **FR-6.3**: Toast icons use lucide-react icons (Music, Megaphone, Building) matching tier type
- **FR-6.4**: All animations remain subtle and non-intrusive

## Non-Goals (Out of Scope)

1. **Elaborate celebration animations** - Keeping notifications subtle (toast only)
2. **Confetti effects or sound** - Visual-only feedback
3. **Predictive unlock estimates** - No "3 weeks to next tier" calculations
4. **Separate achievements page** - History embedded in existing `AccessTierBadges`
5. **Modification of existing progress bars** - Already implemented and working well
6. **Modification of email system** - Already working, no changes needed
7. **Modification of weekly summary** - Already showing unlocks in achievements section

## Design Considerations

### Existing Component Architecture
- **Component**: `AccessTierBadges` ([client/src/components/AccessTierBadges.tsx](client/src/components/AccessTierBadges.tsx))
  - Lines 14-15: useState for expanded tier tracking
  - Lines 19-146: Tier data structure with requirements and benefits
  - Lines 165-204: Helper functions for current tier, next tier, and progress
  - Lines 272-313: Expanded tier view (where unlock history will display)
- **Toast System**: `useToast()` hook ([client/src/hooks/use-toast.ts](client/src/hooks/use-toast.ts))
  - Line 8: `TOAST_LIMIT = 1` (only 1 toast shown at a time)
  - Line 9: `TOAST_REMOVE_DELAY = 1000000` (very long delay for manual dismissal)
  - Line 142-169: `toast()` function for triggering toasts
- **Game State**: Zustand store ([client/src/store/gameStore.ts](client/src/store/gameStore.ts))
  - Manages game state updates from API responses
  - Will receive `tierUnlockHistory` in state updates

### User Flow (Updated)
1. Player completes action that increases reputation (meeting, project completion, etc.)
2. GameEngine checks tier thresholds ([shared/engine/game-engine.ts:3120-3142](shared/engine/game-engine.ts))
3. If tier unlocked:
   - GameEngine adds unlock to `WeekSummary.changes` (powers email)
   - GameEngine updates `tierUnlockHistory` with current week number
   - GameEngine generates email via `EmailGenerator.buildTierUnlockEmail()` ([shared/engine/EmailGenerator.ts:148-193](shared/engine/EmailGenerator.ts))
4. Frontend receives API response with updated game state
5. **NEW**: Frontend checks `WeekSummary.changes` for tier unlocks and triggers toast
6. Player sees immediate toast notification
7. Player receives email in inbox (existing functionality)
8. Player sees unlock in weekly summary achievements (existing functionality)
9. **NEW**: Player can view "Unlocked: Week X" in `AccessTierBadges` expanded view

## Technical Considerations

### Schema Changes
**File**: [shared/schema.ts](shared/schema.ts)
```typescript
// Add to GameState schema
tierUnlockHistory: z.object({
  playlist: z.object({
    niche: z.number().optional(),
    mid: z.number().optional(),
    flagship: z.number().optional(),
  }).optional(),
  press: z.object({
    blogs: z.number().optional(),
    mid_tier: z.number().optional(),
    national: z.number().optional(),
  }).optional(),
  venue: z.object({
    clubs: z.number().optional(),
    theaters: z.number().optional(),
    arenas: z.number().optional(),
  }).optional(),
}).optional()
```

### Database Migration
**File**: New migration in `migrations/`
- Add `tier_unlock_history` JSONB column to `games` table
- Default value: `{}`
- Nullable: true (existing games won't have history)

### Backend Changes
**File**: [shared/engine/game-engine.ts:3120-3142](shared/engine/game-engine.ts)
```typescript
// Extend checkAccessTierProgression() function
// After detecting tier unlock and creating change notification:
if (!gameState.tierUnlockHistory) gameState.tierUnlockHistory = {};
if (!gameState.tierUnlockHistory[tierType]) gameState.tierUnlockHistory[tierType] = {};
gameState.tierUnlockHistory[tierType][newTierName] = gameState.week;
```

### Frontend Changes
**File**: [client/src/components/AccessTierBadges.tsx:272-313](client/src/components/AccessTierBadges.tsx)
```typescript
// In expanded tier view, add unlock week display:
{tier.name !== 'None' && gameState.tierUnlockHistory?.[tierType]?.[tier.name.toLowerCase()] && (
  <span className="text-xs text-white/50">
    • Unlocked Week {gameState.tierUnlockHistory[tierType][tier.name.toLowerCase()]}
  </span>
)}
```

**File**: Week advance handler (likely [client/src/pages/GamePage.tsx](client/src/pages/GamePage.tsx) or [client/src/store/gameStore.ts](client/src/store/gameStore.ts))
```typescript
// After week advance API response:
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

## Success Metrics

1. **Immediate Feedback**: Players see toast notification within 1 second of tier unlock
2. **Historical Tracking**: All unlocked tiers show "Unlocked: Week X" in expanded view
3. **Data Persistence**: Tier unlock history preserved across game saves/loads
4. **No Regressions**: Existing email and weekly summary systems continue working

## Open Questions

1. **Q1**: Should toast notifications appear during week advance (when player is already seeing weekly summary)?
   - **Recommendation**: Yes, toast appears immediately, weekly summary shows it again for confirmation
   - **Rationale**: Immediate feedback is satisfying even if duplicated in summary

2. **Q2**: Should we backfill tier unlock history for existing games?
   - **Recommendation**: No, only track from feature deployment forward
   - **Rationale**: Complexity not worth it for historical data that players didn't experience

3. **Q3**: Should unlock history show in collapsed tier card view?
   - **Recommendation**: No, only in expanded view to avoid clutter
   - **Rationale**: Keeps collapsed view clean and focused on current progress

4. **Q4**: Should we show unlock history in a tooltip on hover?
   - **Recommendation**: Defer to future iteration
   - **Rationale**: Expanded view already provides this information

## Implementation Notes

### Phase 1: Data Layer (Backend) ✅
1. Add `tierUnlockHistory` field to game state schema ([shared/schema.ts](shared/schema.ts))
2. Create database migration for `tier_unlock_history` JSONB column
3. Update `GameEngine.checkAccessTierProgression()` to populate unlock history ([shared/engine/game-engine.ts:3120-3142](shared/engine/game-engine.ts))
4. Test unlock history tracking across all tier types

### Phase 2: Frontend Display ✅
1. Update `AccessTierBadges` component to display unlock weeks ([client/src/components/AccessTierBadges.tsx:272-313](client/src/components/AccessTierBadges.tsx))
2. Add unlock week text in expanded tier view
3. Test visual styling and responsiveness

### Phase 3: Toast Integration ✅
1. Add toast trigger in week advance flow
2. Parse `WeekSummary.changes` for tier unlock notifications
3. Trigger toast with tier type, name, and icon
4. Test toast appearance and timing

### Phase 4: Testing & Polish ✅
1. Test tier unlock detection across all three tier types
2. Verify unlock history persistence across save/load
3. Test toast notifications don't interfere with weekly summary
4. Verify no regressions in email system or weekly summary

---

**Document Version**: 2.0
**Created**: 2025-10-07
**Updated**: 2025-10-07
**Status**: Ready for Task Generation

**Related Documents**:
- [docs/01-planning/CORE_FEATURES_sim-v2.0.md](docs/01-planning/CORE_FEATURES_sim-v2.0.md) (Feature #3)
- [client/src/components/AccessTierBadges.tsx](client/src/components/AccessTierBadges.tsx) (Existing Component)
- [shared/engine/EmailGenerator.ts](shared/engine/EmailGenerator.ts) (Existing Email System)
- [client/src/components/WeekSummary.tsx](client/src/components/WeekSummary.tsx) (Existing Weekly Summary)
- [shared/engine/game-engine.ts](shared/engine/game-engine.ts) (Existing Tier Detection Logic)

**Key Changes from v1.0**:
- Removed redundant requirements (progress bars, lock icons, tier requirements already exist)
- Focused scope on missing features: toast notifications and unlock history
- Updated technical details to match existing codebase architecture
- Referenced existing implementations for context
