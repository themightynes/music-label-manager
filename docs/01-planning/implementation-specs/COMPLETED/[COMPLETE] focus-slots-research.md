# Focus Slots System - Implementation Documentation
**Status**: ✅ COMPLETE (August 29, 2025)
**Type**: Core Game Mechanic - Action Point System

## **Overview**
Focus Slots are the core action point system that limits and tracks player strategic choices each month. Players start with 3 focus slots and can unlock a 4th slot at 50+ reputation.

## **Implementation Summary**

### **System Behavior**
1. **Live Tracking**: Focus slots are consumed in real-time as players select actions
2. **Monthly Reset**: All slots refresh at the start of each month
3. **Dynamic Unlock**: 4th slot automatically unlocks at 50+ reputation
4. **UI Feedback**: Live display of used/available slots throughout the interface

### **User Experience Flow**
- **Month Start**: "0/3 Focus Slots, 3 available"
- **Select Action**: "1/3 Focus Slots, 2 available" 
- **Select Another**: "2/3 Focus Slots, 1 available"
- **Fully Used**: "3/3 Focus Slots, 0 available"
- **At 50+ Rep**: "0/4 Focus Slots, 4 available" (4th slot unlocked!)

## **FOCUS SLOTS Implementation - Complete File List**

### **1. Database Schema & Types**
**File:** `shared/schema.ts` (Lines 201-202)
```typescript
focusSlots: integer("focus_slots").default(3),
usedFocusSlots: integer("used_focus_slots").default(0),
```

**File:** `shared/types/gameTypes.ts` (Lines 79-80)
```typescript
focusSlots: number;
usedFocusSlots: number;
```

### **2. Game Engine Core Logic**
**File:** `shared/engine/game-engine.ts` (Lines 116, 239-250)

**Monthly Reset:**
```typescript
// Reset monthly values at start of new month
this.gameState.usedFocusSlots = 0;
```

**Focus Slot Unlock Logic (NEW - Line 239-250):**
```typescript
// Check for focus slot unlock at 50+ reputation
if (this.gameState.reputation >= 50) {
  const currentSlots = this.gameState.focusSlots || 3;
  if (currentSlots < 4) {
    this.gameState.focusSlots = 4;
    summary.changes.push({
      type: 'unlock',
      description: 'Fourth focus slot unlocked! You can now select 4 actions per month.',
      icon: 'fa-unlock'
    });
  }
}
```

**Note**: Action processing no longer increments `usedFocusSlots` server-side - this is now handled client-side during selection

### **3. Server Routes & API**
**File:** `server/routes.ts` (Line 1625 - UPDATED)

**New Game Creation:**
```typescript
focusSlots: 3,
usedFocusSlots: 0,
```

**Monthly Processing (UPDATED - Line 1625):**
```typescript
// Now saves focusSlots to persist unlock status
.set({
  focusSlots: monthResult.gameState.focusSlots,  // NEW - persist unlock
  usedFocusSlots: monthResult.gameState.usedFocusSlots,  // Always 0 after processing
  // ... other fields
})
```

### **4. Client-Side Store & State (MAJOR UPDATES)**
**File:** `client/src/store/gameStore.ts` 

**Live Action Selection (Lines 229-250 - REWRITTEN):**
```typescript
selectAction: (actionId: string) => {
  const { selectedActions, gameState } = get();
  const availableSlots = gameState?.focusSlots || 3;
  
  if (selectedActions.length < availableSlots && !selectedActions.includes(actionId)) {
    const newSelectedActions = [...selectedActions, actionId];
    set({ 
      selectedActions: newSelectedActions,
      gameState: gameState ? { ...gameState, usedFocusSlots: newSelectedActions.length } : gameState
    });
  }
},

removeAction: (actionId: string) => {
  const { selectedActions, gameState } = get();
  if (selectedActions.includes(actionId)) {
    const newSelectedActions = selectedActions.filter(id => id !== actionId);
    set({ 
      selectedActions: newSelectedActions,
      gameState: gameState ? { ...gameState, usedFocusSlots: newSelectedActions.length } : gameState
    });
  }
},
```

**State Synchronization (Lines 95, 199, 333 - NEW):**
```typescript
// On game load - reset to 0 since no actions selected
usedFocusSlots: 0  

// On new game - start with 0 used
usedFocusSlots: 0  

// After month advance - reset for new month
usedFocusSlots: 0  
```

### **5. UI Components - Display & Interaction (FULLY DYNAMIC)**

**File:** `client/src/components/SelectionSummary.tsx` (COMPLETELY REWRITTEN)
```typescript
// Dynamic slot calculation
const totalSlots = gameState?.focusSlots || 3;
const usedSlots = gameState?.usedFocusSlots || 0;
const availableSlots = totalSlots - usedSlots;

// Progress based on actual usage
const progress = (usedSlots / totalSlots) * 100;

// Dynamic UI display
{usedSlots}/{totalSlots}  // Shows "1/3", "2/3", etc.
Select {availableSlots} more action{availableSlots !== 1 ? 's' : ''}
```

**File:** `client/src/components/MonthPlanner.tsx` (Lines 227-230 - UPDATED)
```typescript
<p className="text-sm md:text-base text-white/70">
  Allocate {(gameState?.focusSlots || 3) - (gameState?.usedFocusSlots || 0)} of {gameState?.focusSlots || 3} focus slots to strategic actions
  {gameState?.focusSlots === 4 && <span className="text-green-600 font-semibold"> (4th slot unlocked!)</span>}
</p>
```

**File:** `client/src/components/ActionSelectionPool.tsx` (Line 134 - UPDATED)
```typescript
<h3 className="text-lg font-semibold text-white">Focus Actions Pool</h3>
```

**File:** `client/src/components/SelectionSummary.tsx` (Lines 72-74, 80-82 - UPDATED)
```typescript
// Header shows "Focus Slots" with "X/Y Used" badge
<h3 className="text-lg font-semibold text-white">Focus Slots</h3>
<Badge variant="secondary" className="text-sm">
  {usedSlots}/{totalSlots} Used
</Badge>

// Visual slot indicators
<div className="flex gap-2 mt-3 mb-2">
  {Array.from({ length: totalSlots }).map((_, index) => (
    <div
      key={index}
      className={`flex-1 h-2 rounded-full transition-all ${
        index < usedSlots
          ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
          : 'bg-[#65557c]/30'
      }`}
      title={`Slot ${index + 1}`}
    />
  ))}
</div>
```

**File:** `client/src/components/ActionCard.tsx` (Lines 100-101, 119-122 - UPDATED)
```typescript
// Action button shows focus slot usage
<Button ...>
  <i className="fas fa-crosshairs mr-1"></i>
  {isSelected ? 'Using Focus Slot' : 'Use Focus Slot'}
</Button>

// Focus cost display in details
<div className="flex justify-between bg-blue-50 rounded p-1">
  <span className="text-blue-700 font-medium">Focus Cost:</span>
  <span className="font-bold text-blue-800">1 Slot</span>
</div>
```

**File:** `client/src/components/MetricsDashboard.tsx` & `client/src/components/KPICards.tsx`
```typescript
// Live display of usage
{gameState.usedFocusSlots || 0}/{gameState.focusSlots || 3}
{(gameState.focusSlots || 3) - (gameState.usedFocusSlots || 0)} available
```

### **6. Test Files**
**File:** `scripts/debug-tests/test-financial-fix.ts` (Lines 20-22)
**File:** `scripts/debug-tests/test-expense-mismatch.ts` (Lines 20-22)
**File:** `scripts/debug-tests/test-consolidated-money.ts` (Lines 20-22)
```typescript
focusSlots: 3,
usedFocusSlots: 0,
```

### **7. Documentation Files**
**File:** `docs/02-architecture/api-design.md` (Lines 124, 199, 244, 329, 391)
**File:** `docs/04-frontend/frontend-architecture.md` (Line 176)
**File:** `docs/99-legacy/ClaudeProject.md` (Line 58)
**File:** `docs/99-legacy/01-mvp-planning/prd.md` (Lines 24, 73)
**File:** `docs/99-legacy/01-mvp-planning/mpv_content_scope.md` (Lines 4, 23, 41)
**File:** `docs/99-legacy/01-mvp-planning/ui/ui_workflow_documentation.md` (Lines 23, 27, 67)
**File:** `docs/03-workflows/game-system-workflows.md` (Line 34)
**File:** `docs/03-workflows/user-interaction-flows.md` (Lines 24, 45, 57)

## **Key Implementation Changes (August 29, 2025)**

### **What Was Fixed**
1. **Disconnected Systems**: Focus slots were tracked but not actually limiting actions
2. **Hardcoded Limits**: UI had hardcoded "3" everywhere instead of using `focusSlots`
3. **No Live Tracking**: `usedFocusSlots` wasn't updating as players selected actions
4. **Missing Unlock**: 4th slot unlock at 50+ reputation wasn't implemented
5. **Confusing Terminology**: "Available Actions" didn't connect to "Focus Slots" conceptually

### **How It Now Works**
1. **Live Action Tracking**: `usedFocusSlots` = `selectedActions.length` (always in sync)
2. **Dynamic Limits**: All UI components use `gameState.focusSlots` instead of hardcoded 3
3. **Real-time Updates**: Focus slots update immediately when selecting/removing actions
4. **Automatic Unlock**: At 50+ reputation, 4th slot unlocks with notification
5. **Proper Reset**: `usedFocusSlots` resets to 0 when loading game or advancing month
6. **Unified Terminology**: "Focus Actions Pool" and "Allocate focus slots" create clear mental model

### **Technical Implementation**
- **Client-Side**: Focus slot usage tracked live in `gameStore.ts` during action selection
- **Server-Side**: Game engine handles unlock at 50+ reputation and monthly reset
- **Database**: Persists both `focusSlots` (3-4) and `usedFocusSlots` (always 0 after processing)
- **UI Components**: All displays dynamically calculate available slots from game state

### **User Impact**
- Clear visual feedback on action limits with slot progress indicators
- Can't accidentally select too many actions
- 4th slot properly unlocks and is immediately usable
- Consistent experience across all UI components
- Immediate understanding that actions consume focus slots
- Visual slot bars show allocation at a glance
- "Use Focus Slot" buttons make the cost explicit