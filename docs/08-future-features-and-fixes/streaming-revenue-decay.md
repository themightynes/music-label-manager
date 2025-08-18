# Streaming Revenue Decay System

## Status: Future Enhancement
**Priority**: High - Critical for game realism and player engagement
**Complexity**: Medium
**Impact**: High player experience improvement

## Problem Analysis

### Issue Description
Released singles and EPs currently show **0 revenue and 0 streams** in subsequent months after their initial release. SQL queries confirm that projects generate revenue only once during the month they transition from "marketing" to "released" stage, with no ongoing monthly revenue generation.

### Root Cause Analysis

#### 1. One-Time Revenue Calculation
- Revenue calculation occurs only in `/server/routes.ts:633-689` when project stage advances to "released"
- Initial streams and revenue are calculated using `gameEngine.calculateProjectOutcomes()`
- Results are stored in `project.metadata.revenue` and `project.metadata.streams`
- **No subsequent processing occurs for released projects**

#### 2. Missing Ongoing Revenue Processing
The `processOngoingProjects()` method in `game-engine.ts:443-466` has a fundamental gap:
- Only processes projects in `gameState.flags['active_projects']` array
- Database projects in "released" stage are never included in ongoing processing
- No mechanism exists to query released database projects for monthly revenue updates

#### 3. Database vs. Flags Architecture Mismatch
- **Database projects**: Real player projects stored in `projects` table
- **Engine flags projects**: Temporary project tracking in `gameState.flags['active_projects']`
- Released database projects fall through the cracks between these two systems

#### 4. Missing Music Industry Realism
Real music releases generate:
- High initial streaming in first week/month
- Gradual decay over 6-12 months
- Long-tail revenue that can persist for years
- Influence from ongoing reputation and playlist access improvements

## Current Technical Implementation

### Revenue Calculation Flow
```typescript
// In /server/routes.ts:633-689
if (stages[newStageIndex] === 'released') {
  const outcomes = await gameEngine.calculateProjectOutcomes(projectForEngine, monthResult.summary);
  
  // Store one-time revenue in metadata
  const updatedMetadata = {
    revenue: Math.round(outcomes.revenue),
    streams: outcomes.streams || 0,
    pressPickups: outcomes.pressPickups || 0,
    releaseMonth: monthResult.gameState.currentMonth
  };
  
  // Add revenue to game state (one time only)
  monthResult.gameState.money += outcomes.revenue;
}
```

### Missing Processing
```typescript
// processOngoingProjects() only handles flags projects
const projects = (flags as any)['active_projects'] || [];
// ❌ No query for released database projects
// ❌ No ongoing revenue calculation
// ❌ No streaming decay logic
```

## Proposed Solution

### 1. Add Released Project Processing

#### Modify Game Engine
```typescript
// In game-engine.ts
private async processOngoingProjects(summary: MonthSummary): Promise<void> {
  // Existing flags-based processing...
  
  // NEW: Process released database projects
  await this.processReleasedProjects(summary);
}

private async processReleasedProjects(summary: MonthSummary): Promise<void> {
  // Query released projects from database via ServerGameData
  const releasedProjects = await this.gameData.getReleasedProjects(this.gameState.id);
  
  for (const project of releasedProjects) {
    const ongoingRevenue = this.calculateOngoingRevenue(project);
    if (ongoingRevenue > 0) {
      summary.revenue += ongoingRevenue;
      // Update project metadata with cumulative totals
    }
  }
}
```

#### Add ServerGameData Method
```typescript
// In server/data/gameData.ts
async getReleasedProjects(gameId: string): Promise<Project[]> {
  return await this.db
    .select()
    .from(projects)
    .where(and(
      eq(projects.gameId, gameId),
      eq(projects.stage, 'released')
    ));
}
```

### 2. Implement Ongoing Revenue Calculation

#### Streaming Decay Formula
```typescript
calculateOngoingRevenue(project: Project): number {
  const metadata = project.metadata as any || {};
  const initialStreams = metadata.streams || 0;
  const releaseMonth = metadata.releaseMonth || 1;
  const currentMonth = this.gameState.currentMonth || 1;
  const monthsSinceRelease = currentMonth - releaseMonth;
  
  if (monthsSinceRelease <= 0 || initialStreams === 0) return 0;
  
  // Decay formula: starts high, gradually decreases
  const decayRate = 0.85; // 15% monthly decline
  const baseDecay = Math.pow(decayRate, monthsSinceRelease);
  
  // Apply current reputation/access bonuses (small boost)
  const reputationBonus = 1 + ((this.gameState.reputation || 0) - 50) * 0.002;
  const accessBonus = this.getAccessMultiplier('playlist', this.gameState.playlistAccess || 'none');
  
  // Calculate monthly streams with decay
  const monthlyStreams = initialStreams * baseDecay * reputationBonus * accessBonus * 0.1;
  
  // Convert to revenue ($0.003 per stream)
  return Math.max(0, monthlyStreams * 0.003);
}
```

### 3. Database Integration

#### Update Advance Month Logic
```typescript
// In /server/routes.ts advance-month endpoint
// After processing engine results, update released projects
const releasedProjects = await tx
  .select()
  .from(projects)
  .where(and(eq(projects.gameId, gameId), eq(projects.stage, 'released')));

for (const project of releasedProjects) {
  const ongoingRevenue = calculateProjectOngoingRevenue(project, monthResult.gameState);
  if (ongoingRevenue > 0) {
    // Update project cumulative metadata
    const currentMetadata = project.metadata as any || {};
    await tx.update(projects).set({
      metadata: {
        ...currentMetadata,
        cumulativeRevenue: (currentMetadata.cumulativeRevenue || 0) + ongoingRevenue,
        lastMonthRevenue: ongoingRevenue,
        totalMonthsActive: (currentMetadata.totalMonthsActive || 0) + 1
      }
    }).where(eq(projects.id, project.id));
  }
}
```

### 4. Configuration & Balance

#### Add to Balance Config
```json
{
  "streaming_decay": {
    "monthly_decay_rate": 0.85,
    "reputation_bonus_factor": 0.002,
    "access_tier_bonus_factor": 0.1,
    "minimum_revenue_threshold": 1,
    "max_decay_months": 24
  }
}
```

## Implementation Priority

### Phase 1: Core Functionality
1. Add `processReleasedProjects()` method to GameEngine
2. Implement basic decay formula
3. Update advance-month endpoint to process released projects
4. Add database method to query released projects

### Phase 2: Enhancement
1. Add configuration system for decay rates
2. Implement reputation/access tier bonuses
3. Add cumulative tracking in project metadata
4. Create debug logging for revenue calculations

### Phase 3: Polish
1. Balance testing and tuning
2. UI improvements to show ongoing revenue
3. Player feedback integration
4. Performance optimization

## Expected Outcomes

### Player Experience
- Released projects will generate realistic ongoing revenue
- Revenue naturally decreases over time, encouraging new releases
- Reputation and access tier improvements affect existing catalog
- Strategic depth added to release timing and portfolio management

### Technical Benefits
- Fixes critical 0 revenue bug
- Maintains game balance with realistic music industry patterns
- Adds long-term progression incentive
- Improves player engagement and retention

### Game Balance
- Initial revenue burst followed by gradual decline
- Emphasis on building a diverse catalog
- Reward for reputation building affects entire catalog
- Natural pressure to continue releasing new content

## Success Metrics
- Released projects show non-zero monthly revenue
- Revenue naturally decays over 6-12 months
- Total catalog revenue scales with reputation improvements
- Player engagement with release planning increases

---

*This document outlines a critical enhancement to fix the missing ongoing revenue system and improve game realism.*