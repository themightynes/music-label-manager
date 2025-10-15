# Technical Debt Analysis - 0002-debt

## Summary
Deep dive analysis of technical debt patterns found in codebase after completing migration 0021 and gameState.artists cleanup.

**Date**: 2025-10-09
**Analysis Scope**: Production code (excluding tests)
**Method**: Pattern search for TODO/STUB/HARDCODED/WORKAROUND annotations

---

## ✅ Issues Resolved in This Batch

### 1. Schema/Type Mismatches (COMPLETED)
- ✅ `isSigned` → `signed` renamed
- ✅ `weeklyFee` → `weeklyCost` renamed
- ✅ Missing columns added (temperament, signingCost, bio, age)
- ✅ Workaround in routes.ts:1501 removed

**Files**: Migration 0021, see MIGRATION_0021_SUMMARY.md

### 2. Dead Code - gameState.artists (COMPLETED)
- ✅ 5 references to non-existent `gameState.artists` property fixed
- ✅ Predetermined meetings now work correctly
- ✅ Global mood effects now work correctly

**Files**: shared/engine/game-engine.ts, see gamestate-artists-cleanup.md

---

## 🔍 High-Priority Issues Found

### 1. Executive System Legacy (Multiple Files)

**Context**: Executive meetings UI was removed on 2025-09-19 but backend logic remains

**Files & Annotations**:
```typescript
// shared/engine/FinancialSystem.ts:1632
// TODO: Executive meetings UI was removed on 2025-09-19;
// confirm salaries should still run without player control.

// shared/engine/FinancialSystem.ts:1809
// TODO: Executive costs remain in the breakdown even though
// the client UI no longer surfaces executive actions.

// shared/engine/FinancialSystem.ts:1872
// TODO: Revisit once the executive system redesign ships;
// this line still reports hidden salaries to players.

// shared/schema.ts:234
// TODO: Remove or redesign legacy dialogue storage after
// rebuilding the executive system UI (removed 2025-09-19).

// shared/schema.ts:310
// TODO: Legacy executive state persisted for compatibility
// while the client UI is rebuilt (UI removed 2025-09-19).

// shared/schema.ts:548
// TODO: Remove once executive persistence is retired with
// the new systems rollout.

// shared/schema.ts:600
// TODO: Clean up once the dialogue schema is retired with
// the executive system overhaul.
```

**Impact**:
- Medium-High: Players are paying for executive salaries they can't control
- Code complexity: Legacy persistence still active
- Confusion: Backend/frontend mismatch

**Decision Needed**:
1. **Option A**: Remove executive costs entirely until UI returns
2. **Option B**: Keep costs but make them transparent in UI
3. **Option C**: Remove all executive backend logic (breaking change)

**Recommendation**: Option A - Comment out executive salary calculations in FinancialSystem until UI is redesigned

---

### 2. Incomplete Achievement Tracking

**Files**:
```typescript
// shared/engine/AchievementsEngine.ts:35
artistsSuccessful: 0, // TODO: Calculate based on artist success metrics

// shared/engine/AchievementsEngine.ts:36
projectsCompleted: 0, // TODO: Calculate based on completed projects
```

**Impact**:
- Low-Medium: Achievement system not fully functional
- Player experience: Missing achievement unlocks

**Current State**: Achievements always show 0 for these metrics

**Recommendation**:
- Create achievement calculation task (separate PRD)
- Define "successful artist" criteria
- Add project completion tracking

---

### 3. Missing Chart Movement Calculation

**Files**:
```typescript
// shared/engine/ChartService.ts:327
movement: 0, // TODO: Calculate competitor movement
```

**Impact**:
- Low: Chart display less dynamic
- Player experience: Charts feel static

**Recommendation**:
- Calculate movement based on chart position changes week-over-week
- Low priority (cosmetic feature)

---

### 4. Missing Press Mentions Tracking

**Files**:
```typescript
// shared/engine/game-engine.ts:318
pressMentions: 0, // TODO: Add press mentions tracking
```

**Impact**:
- Low: Feature not implemented
- May be placeholder for future feature

**Recommendation**:
- Clarify if this is planned feature or remove
- If planned, create separate task

---

### 5. Hardcoded Marketing Budgets

**Files**:
```typescript
// shared/utils/marketingUtils.ts:51-52
minBudget: 500, // TODO: Add to balance data
maxBudget: 15000, // TODO: Add to balance data
```

**Impact**:
- Low: Values should be in balance.json for easy tuning
- Technical debt: Violates "no hardcoded values" principle

**Recommendation**:
- Move to data/balance/marketing.json
- Quick fix (~15 minutes)

---

### 6. Hardcoded Taxonomy Values (API Contracts)

**Files**:
```typescript
// shared/api/contracts.ts:46-52
// HARDCODED: Expand severity taxonomy when dedicated QA workflow lands
// HARDCODED: Update affected area taxonomy once module ownership stabilizes
// HARDCODED: Revisit frequency values after gathering telemetry
// HARDCODED: Expand status taxonomy if workflow requires additional states
```

**Impact**:
- Very Low: API contract enums for bug reporting
- Future-proofing annotations

**Recommendation**:
- Keep as-is until actual QA workflow is implemented
- Good documentation of known limitations

---

### 7. Missing Cooldown Check

**Files**:
```typescript
// server/data/gameData.ts:185
// TODO: Check against game state for cooldown
```

**Impact**:
- Unknown: Need context on what cooldown this refers to
- Potentially medium if it's a game balance issue

**Recommendation**: Investigate context and determine if needed

---

## 📊 Categorization Summary

| Category | Count | Priority | Action |
|----------|-------|----------|--------|
| Executive System Legacy | 7 | High | Create cleanup task |
| Incomplete Features | 4 | Medium | Prioritize & implement |
| Hardcoded Values | 5 | Low | Move to config files |
| Missing Calculations | 2 | Low | Enhancement tasks |
| Unknown/Investigate | 1 | TBD | Research needed |

---

## 🎯 Recommended Next Steps

### Immediate (This Session)
1. ✅ **DONE**: Fix gameState.artists dead code
2. **OPTIONAL**: Comment out executive salary calculations temporarily

### Short-term (Next Session)
3. Move marketing budget values to balance.json
4. Investigate gameData.ts:185 cooldown TODO
5. Define executive system roadmap (keep/remove/redesign?)

### Medium-term (Future PRDs)
6. Achievement calculation implementation
7. Chart movement calculation
8. Press mentions tracking (if desired feature)

### Long-term (Strategic)
9. Executive system redesign or removal
10. Complete feature parity for all TODO items

---

## 🔧 Quick Wins Available

### 1. Marketing Budget Hardcodes (~15 min)
```typescript
// Current: shared/utils/marketingUtils.ts
minBudget: 500,
maxBudget: 15000,

// Move to: data/balance/marketing.json
{
  "budget_limits": {
    "min": 500,
    "max": 15000
  }
}
```

### 2. Remove Executive Salary Costs (~30 min)
```typescript
// In FinancialSystem.ts, temporarily disable:
// const executiveSalaries = this.calculateExecutiveSalaries(...);
const executiveSalaries = 0; // TEMP: UI removed 2025-09-19
```

---

## 📝 Pattern Analysis

### Good Practices Found ✅
- All TODOs are well-documented with context
- Hardcoded values are clearly marked for future cleanup
- Annotations reference specific dates and reasons

### Anti-patterns Found ⚠️
- Backend features running without UI (executive salaries)
- Incomplete features returning hardcoded 0 values
- No clear timeline for TODO resolution

---

## Conclusion

**Technical Debt Score**: 6/10 (Moderate)
- Well-documented but accumulating
- Most issues are low-impact
- 1 high-priority issue (executive system legacy)
- Good annotation practices

**Priority**: Address executive system decision first (affects player experience)

**Recommendation**:
1. Focus on executive system cleanup (high impact)
2. Quick wins for hardcoded values (low effort, good hygiene)
3. Create PRD for achievement/tracking features (planned work)
