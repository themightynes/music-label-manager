# Project Stage Migration Safety Checks
**Critical Data Consistency Documentation for Routes→GameEngine Migration**

## 🚨 Potential In-Flight Conflicts

### Current System Timing Issues

The current dual-system creates these race conditions:

1. **Pre-GameEngine Advancement (routes.ts line 810-833)**
   - Advances planning→production BEFORE GameEngine runs
   - Updates database directly in transaction
   - GameEngine sees already-advanced state

2. **GameEngine Processing (line 840)**
   - Processes songs based on current stage
   - Updates songsCreated count
   - But CANNOT advance stages itself

3. **Post-GameEngine Advancement (routes.ts line 844-924)**
   - Re-reads projects with updated songsCreated
   - Advances production→marketing→released
   - Updates database again in same transaction

### Conflict Scenarios

#### Scenario 1: Mid-Transaction State Mismatch
```typescript
// Routes.ts advances: planning → production at Month 3
// GameEngine sees: production (generates 2 songs)
// Routes.ts post-process: Checks if should advance to marketing
// Problem: If we disable routes.ts, project stays in production forever
```

#### Scenario 2: Song Count Dependency
```typescript
// Project has songCount: 5, songsCreated: 3
// Routes.ts would wait for more songs before advancing
// GameEngine doesn't know to wait - no advancement logic
// Result: Projects could advance prematurely or never
```

#### Scenario 3: Transaction Rollback
```typescript
// Routes.ts advances stage in transaction
// GameEngine fails during processing
// Transaction rolls back
// State: Inconsistent if any external systems cached the change
```

## 📊 Required Data Consistency Checks

### Pre-Migration Audit Query
```sql
-- Find projects that might be affected by migration
SELECT 
  p.id,
  p.title,
  p.stage,
  p.start_month,
  p.song_count,
  p.songs_created,
  g.current_month,
  (g.current_month - p.start_month) as months_elapsed,
  CASE 
    WHEN p.stage = 'planning' AND (g.current_month - p.start_month) >= 1 THEN 'Should be production'
    WHEN p.stage = 'production' AND p.songs_created >= p.song_count AND (g.current_month - p.start_month) >= 2 THEN 'Should be marketing'
    WHEN p.stage = 'marketing' AND (g.current_month - p.start_month) >= 3 THEN 'Should be released'
    ELSE 'Correct stage'
  END as expected_stage
FROM projects p
JOIN game_states g ON p.game_id = g.id
WHERE p.stage != 'released'
ORDER BY p.game_id, p.start_month;
```

### Runtime Consistency Checks

```typescript
// Add to GameEngine.advanceMonth() during parallel testing
private async validateProjectConsistency(
  projectBefore: Project,
  projectAfter: Project,
  routesDecision: string,
  engineDecision: string
): Promise<ValidationResult> {
  const issues: string[] = [];
  
  // Check 1: Stage progression agreement
  if (routesDecision !== engineDecision) {
    issues.push(`Stage mismatch: routes=${routesDecision}, engine=${engineDecision}`);
  }
  
  // Check 2: Song count consistency
  if (projectAfter.songsCreated < projectBefore.songsCreated) {
    issues.push(`Songs decreased: ${projectBefore.songsCreated} → ${projectAfter.songsCreated}`);
  }
  
  // Check 3: Invalid stage transitions
  const validTransitions = {
    'planning': ['production'],
    'production': ['marketing'],
    'marketing': ['released'],
    'released': []
  };
  
  if (projectBefore.stage !== projectAfter.stage) {
    if (!validTransitions[projectBefore.stage]?.includes(projectAfter.stage)) {
      issues.push(`Invalid transition: ${projectBefore.stage} → ${projectAfter.stage}`);
    }
  }
  
  // Check 4: Time-based rules
  const monthsElapsed = currentMonth - projectBefore.startMonth;
  if (projectAfter.stage === 'production' && monthsElapsed < 1) {
    issues.push(`Advanced to production too early (month ${monthsElapsed})`);
  }
  
  return {
    valid: issues.length === 0,
    issues,
    projectId: projectBefore.id
  };
}
```

## 🔄 Reconciliation Strategy

### Phase 1: Detection & Logging
```typescript
// Add to routes.ts temporarily during migration
const detectInconsistency = async (tx: Transaction) => {
  // Before any changes
  const snapshot = await tx.select().from(projects).where(eq(projects.gameId, gameId));
  
  // After routes.ts logic
  const afterRoutes = await tx.select().from(projects).where(eq(projects.gameId, gameId));
  
  // After GameEngine logic
  const afterEngine = await tx.select().from(projects).where(eq(projects.gameId, gameId));
  
  // Log any differences
  for (let i = 0; i < snapshot.length; i++) {
    if (snapshot[i].stage !== afterEngine[i].stage) {
      console.warn('[MIGRATION WARNING] Stage inconsistency detected:', {
        projectId: snapshot[i].id,
        original: snapshot[i].stage,
        afterRoutes: afterRoutes[i].stage,
        afterEngine: afterEngine[i].stage,
        resolution: 'Using routes.ts decision during migration'
      });
    }
  }
};
```

### Phase 2: Conflict Resolution Rules
```typescript
const resolveConflict = (routesStage: string, engineStage: string, project: Project): string => {
  // During migration, prefer the MORE ADVANCED stage (fail-forward)
  const stageOrder = ['planning', 'production', 'marketing', 'released'];
  const routesIndex = stageOrder.indexOf(routesStage);
  const engineIndex = stageOrder.indexOf(engineStage);
  
  if (routesIndex > engineIndex) {
    console.log(`[MIGRATION] Using routes.ts stage (${routesStage}) over engine (${engineStage})`);
    return routesStage;
  } else if (engineIndex > routesIndex) {
    console.log(`[MIGRATION] Using GameEngine stage (${engineStage}) over routes (${routesStage})`);
    return engineStage;
  }
  
  return routesStage; // Default to routes.ts during migration
};
```

### Phase 3: Safe Cutover
```typescript
// Add feature flag for gradual rollout
const USE_GAMEENGINE_ADVANCEMENT = process.env.USE_GAMEENGINE_ADVANCEMENT === 'true';

if (USE_GAMEENGINE_ADVANCEMENT) {
  // GameEngine handles everything
  await gameEngine.advanceMonth(actions, tx);
} else {
  // Current dual-system
  await advanceProjectsInRoutes(tx);
  await gameEngine.advanceMonth(actions, tx);
  await postProcessProjects(tx);
}
```

## 🔙 Rollback Mechanism

### Emergency Rollback Plan
1. **Feature Flag**: Can instantly revert to routes.ts logic
2. **Database Backup**: Before migration, snapshot all project states
3. **Audit Trail**: Log every stage change with source system
4. **Recovery Script**: Can replay stage transitions if needed

### Rollback Triggers
- More than 5% of projects showing inconsistencies
- Any project stuck in wrong stage for >2 months
- Revenue calculations differing by >10%
- User reports of progression issues

## ✅ Migration Readiness Checklist

### Before Starting Migration
- [ ] Run audit query to identify affected projects
- [ ] Backup game_states and projects tables
- [ ] Add comprehensive logging to both systems
- [ ] Create feature flag for rollback
- [ ] Test with dev database first

### During Parallel Testing
- [ ] Monitor logs for inconsistencies
- [ ] Track metrics: stages advanced, songs created, revenue generated
- [ ] Compare results between systems daily
- [ ] Document any edge cases found

### Before Cutover
- [ ] Zero inconsistencies for 48 hours
- [ ] Performance metrics acceptable
- [ ] Rollback tested successfully
- [ ] Team briefed on rollback procedure

### After Cutover
- [ ] Monitor for 1 week intensively
- [ ] Keep routes.ts code commented (not deleted) for 1 month
- [ ] Document lessons learned
- [ ] Update architecture documentation

## 🎯 Success Criteria

Migration is successful when:
1. **Zero stage inconsistencies** in production for 1 week
2. **All projects advance** according to game rules
3. **Revenue calculations** match previous system ±1%
4. **No user complaints** about progression
5. **Performance improved** or unchanged
6. **Code complexity reduced** by removing duplication