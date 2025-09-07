---
tags:
  - execteam
  - phase3
  - implementation
---

# Executive Team System - Phase 3 Implementation Plan
**Week 3: Game Engine Integration**
*Created: 2025-09-07*

## Overview

This document outlines the implementation plan for Phase 3 of the Executive Team System, focusing on integrating economic mechanics (salary deduction) and relationship dynamics (mood/loyalty) into the game engine. These features were intentionally deferred from Phase 1 to simplify the initial UI implementation.

## Current State Analysis

### ✅ What's Already Working (Phase 1 Complete)
- **UI Layer**: Executive cards display with role colors, icons, and salaries
- **Meeting System**: Executives integrate with dialogue modal for meetings
- **Focus Slots**: Executives consume focus slots when selected
- **Database Schema**: `executives` table exists with mood/loyalty fields
- **API Endpoints**: Executive actions processed as role meetings
- **Selection Display**: Shows executive names and meeting types

### 🚧 What's Missing (Phase 3 Goals)
- **Economic Impact**: No salary deduction from monthly budget
- **Mood System**: Mood field exists but has no gameplay effects
- **Loyalty System**: Loyalty field exists but doesn't decay or impact availability
- **Availability Logic**: All executives always available regardless of mood
- **Executive Events**: No special events triggered by executive states

## Implementation Steps

### 1. ✅ **Initialize Executives on Game Creation** - COMPLETED
**File**: `server/routes.ts` (lines 298-323)
**Status**: ✅ Implemented with CEO exclusion (player IS the CEO)

```typescript
// After creating gameState, initialize executives
const executives = [
  // CEO excluded - player IS the CEO
  { gameId: gameState.id, role: 'head_ar', level: 1, mood: 50, loyalty: 50 },
  { gameId: gameState.id, role: 'cmo', level: 1, mood: 50, loyalty: 50 },
  { gameId: gameState.id, role: 'cco', level: 1, mood: 50, loyalty: 50 },
  { gameId: gameState.id, role: 'head_distribution', level: 1, mood: 50, loyalty: 50 }
];
await db.insert(executives).values(executives);
```

### 2. ✅ **Add Executive Salary Deduction** - COMPLETED
**Files**: 
- `shared/engine/FinancialSystem.ts` (new method)
- `shared/engine/game-engine.ts` (lines 153-178)
- `shared/types/gameTypes.ts` (added baseSalary field)
- `shared/utils/dataLoader.ts` (added Zod validation)
- `client/src/components/MetricsDashboard.tsx` (fixed tooltip)

**Status**: ✅ Implemented with data-driven salaries from roles.json
- Total monthly cost: $17,000 for 4 executives
- Salaries pulled from roles.json (not hardcoded)
- CEO has $0 salary (player character)
- Fixed expense tooltip to show executive salaries

```typescript
// FinancialSystem.ts - Implemented method
async calculateExecutiveSalaries(gameId: string, storageOrExecutives?: any): Promise<{
  total: number;
  breakdown: Array<{role: string, salary: number}>;
}> {
  // Pulls salaries from roles.json via gameData.getRoleById()
  // No hardcoded values - fully data-driven
}

// game-engine.ts - Integrated into monthly processing
const executiveSalaryResult = await this.financialSystem.calculateExecutiveSalaries(
  this.gameState.id,
  this.storage
);
summary.expenseBreakdown.executiveSalaries = executiveSalaryResult.total;
summary.expenses += executiveSalaryResult.total;
```

### 3. **Implement processExecutiveActions()**
**File**: `shared/engine/game-engine.ts` (new method after line 328)

```typescript
private async processExecutiveActions(
  action: GameEngineAction, 
  summary: MonthSummary,
  dbTransaction?: any
): Promise<void> {
  const executiveId = action.metadata?.executiveId;
  if (!executiveId) return;
  
  // Get executive from database
  const executive = await this.storage.getExecutive(executiveId);
  if (!executive) return;
  
  // Apply mood changes from the action
  const moodChange = action.metadata?.moodEffect || 0;
  executive.mood = Math.max(0, Math.min(100, executive.mood + moodChange));
  
  // Boost loyalty for being used
  executive.loyalty = Math.min(100, executive.loyalty + 5);
  
  // Update last action month
  executive.lastActionMonth = this.gameState.currentMonth;
  
  // Save changes
  await this.storage.updateExecutive(executive.id, {
    mood: executive.mood,
    loyalty: executive.loyalty,
    lastActionMonth: executive.lastActionMonth
  }, dbTransaction);
  
  summary.changes.push({
    type: 'executive_interaction',
    description: `Met with ${executive.role}`,
    moodChange,
    newMood: executive.mood
  });
}
```

### 4. **Add Mood/Loyalty Decay System**
**File**: `shared/engine/game-engine.ts` (new method, call from advanceMonth)

```typescript
private async processExecutiveMoodDecay(summary: MonthSummary): Promise<void> {
  const executives = await this.storage.getExecutivesByGame(this.gameState.id);
  
  for (const exec of executives) {
    let moodChange = 0;
    let loyaltyChange = 0;
    
    // Decay loyalty if not used for 3+ months
    const monthsSinceAction = this.gameState.currentMonth - (exec.lastActionMonth || 0);
    if (monthsSinceAction >= 3) {
      loyaltyChange = -5 * Math.floor(monthsSinceAction / 3);
      exec.loyalty = Math.max(0, exec.loyalty + loyaltyChange);
    }
    
    // Natural mood recovery toward 50 (neutral)
    if (exec.mood < 50) {
      moodChange = Math.min(5, 50 - exec.mood);
    } else if (exec.mood > 50) {
      moodChange = Math.max(-5, 50 - exec.mood);
    }
    exec.mood = Math.max(0, Math.min(100, exec.mood + moodChange));
    
    // Save changes
    await this.storage.updateExecutive(exec.id, {
      mood: exec.mood,
      loyalty: exec.loyalty
    });
    
    if (loyaltyChange < 0) {
      summary.changes.push({
        type: 'executive_decay',
        description: `${exec.role} loyalty decreased (ignored for ${monthsSinceAction} months)`,
        loyaltyChange
      });
    }
  }
}
```

### 5. **Implement Availability Thresholds**
**Files**:
- `server/routes.ts` (lines 452-501)
- `client/src/components/ExecutiveTeam.tsx`

```typescript
// server/routes.ts - Add availability check
app.get("/api/game/:gameId/executives/available", getUserId, async (req, res) => {
  const executives = await db.select().from(executives)
    .where(eq(executives.gameId, req.params.gameId));
  
  const available = executives.map(exec => ({
    ...exec,
    available: exec.mood >= 30,
    availabilityReason: exec.mood < 30 
      ? `Too demoralized (mood: ${exec.mood})`
      : exec.mood < 20 
        ? 'Refusing all meetings' 
        : null
  }));
  
  res.json(available);
});

// ExecutiveTeam.tsx - Check availability before allowing selection
const isAvailable = executive.mood >= 30;
const availabilityMessage = executive.mood < 30 
  ? `Too demoralized to meet` 
  : null;
```

### 6. **Add Executive Effects to Actions**
**File**: `data/actions.json`

Enhance executive meeting choices with mood/loyalty impacts:
```json
{
  "effects_immediate": {
    "money": -5000,
    "executive_mood": 10,
    "executive_loyalty": 5
  },
  "effects_delayed": {
    "reputation": 5,
    "executive_mood": -5
  }
}
```

### 7. **Storage Layer Updates**
**File**: `server/storage.ts`

```typescript
async getExecutivesByGame(gameId: string) {
  return await db.select().from(executives)
    .where(eq(executives.gameId, gameId));
}

async getExecutive(execId: string) {
  const result = await db.select().from(executives)
    .where(eq(executives.id, execId))
    .limit(1);
  return result[0];
}

async updateExecutive(execId: string, updates: Partial<Executive>, transaction?: any) {
  const dbToUse = transaction || db;
  return await dbToUse.update(executives)
    .set(updates)
    .where(eq(executives.id, execId));
}

async createExecutives(gameId: string, execList: any[]) {
  return await db.insert(executives).values(execList);
}
```

## Testing Plan

### Test Scenario 1: Executive Initialization
1. Create new game
2. Query database: `SELECT * FROM executives WHERE game_id = ?`
3. **Expected**: 5 executives with mood=50, loyalty=50

### Test Scenario 2: Salary Deduction
1. Note starting money
2. Advance month without any actions
3. **Expected**: Money reduced by $17,000 (sum of executive salaries)
4. Check expense breakdown shows `executiveSalaries: 17000`

### Test Scenario 3: Mood Changes
1. Select Head of A&R meeting with positive outcome
2. **Expected**: A&R mood increases by choice effect amount
3. Advance 3 months without using A&R
4. **Expected**: A&R loyalty decreases, mood trends toward 50

### Test Scenario 4: Availability Threshold
1. Use debug tools to set CMO mood to 25
2. Try to select CMO in ExecutiveTeam
3. **Expected**: CMO card disabled with "Too demoralized" message

### Test Scenario 5: Economic Pressure
1. Start game with default $50,000
2. Sign 2 artists ($2,400/month)
3. Note executive costs ($17,000/month)
4. **Expected**: ~$30,000 remaining after first month

## Migration & Backwards Compatibility

### Database Migration
```sql
-- Migration already exists from Phase 1
-- No new migration needed, just need to populate data
INSERT INTO executives (game_id, role, level, mood, loyalty)
SELECT id, 'head_ar', 1, 50, 50 FROM game_states
WHERE NOT EXISTS (
  SELECT 1 FROM executives WHERE game_id = game_states.id
);
```

### Save Game Compatibility
- Old saves without executives will auto-initialize on first load
- Check for null executives in game engine and create if missing

## Success Metrics

### Economic Impact
- [ ] Executive salaries appear in monthly expense breakdown
- [ ] Total monthly executive cost: $17,000
- [ ] Salary deduction happens automatically each month

### Mood/Loyalty System
- [ ] Mood changes visible after executive meetings
- [ ] Loyalty decays when executives ignored for 3+ months
- [ ] Mood naturally trends toward neutral (50) over time

### Availability System
- [ ] Executives unavailable when mood < 30
- [ ] Clear UI indication of unavailable executives
- [ ] Availability reason displayed to player

### Strategic Depth
- [ ] Players must balance executive usage vs. costs
- [ ] Ignoring executives has consequences
- [ ] Economic pressure from executive salaries forces decisions

## Risk Mitigation

### Performance Concerns
- Cache executive data per month to avoid repeated DB queries
- Batch update all executives in single transaction

### Balance Issues
- Start with conservative mood changes (±5-10 per action)
- Can adjust thresholds based on playtesting
- Consider adding difficulty settings for executive costs

### UI Complexity
- Keep availability states simple (available/unavailable)
- Use clear visual indicators (opacity, disabled state)
- Provide tooltips explaining why executives unavailable

## Next Steps (Future Phases)

### Phase 4: Executive Progression
- Level up system for executives
- Unlock new meeting types at higher levels
- Executive-specific perks and bonuses

### Phase 5: Executive Events
- Random events triggered by executive states
- Crisis events when multiple executives unhappy
- Opportunity events when executives highly loyal

### Phase 6: Advanced Relationships
- Inter-executive dynamics
- Executive-artist relationships
- Board of directors oversight layer

## Conclusion

Phase 3 transforms executives from simple UI elements into a strategic resource management system. The $17,000/month cost creates meaningful economic pressure, while the mood/loyalty system adds relationship management depth. This implementation maintains the clean separation between UI (Phase 1) and game mechanics (Phase 3) while setting the foundation for future executive system expansions.