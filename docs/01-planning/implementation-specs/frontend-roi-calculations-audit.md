# Frontend ROI Calculations Audit

**Created**: September 3, 2025  
**Status**: Complete Analysis  
**Purpose**: Document all frontend ROI calculation locations before Phase 3 migration

---

## Executive Summary

This audit identifies all locations where ROI is calculated on the frontend, preparing for migration to backend calculations in Phase 3 of the Artist Cost Tracking & ROI System.

---

## Current Frontend ROI Calculation Locations

### 1. ActiveProjects.tsx (Lines 103-196)

**Location**: `/client/src/components/ActiveProjects.tsx`

#### calculateProjectMetrics() - Lines 103-143
```typescript
// Calculates ROI from aggregated song data
const investment = project.totalCost || project.budgetPerSong || 0;
const roi = investment > 0 ? ((totalRevenue - investment) / investment) * 100 : 0;
```

**Issues**:
- Recalculates on every render
- Uses legacy metadata fallback (lines 111-120)
- Aggregates from individual songs in real-time
- No caching of calculated values

#### calculatePortfolioStats() - Lines 159-196
```typescript
// Portfolio-wide ROI calculation
const portfolioROI = totalInvestment > 0 ? 
  ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;
```

**Issues**:
- Iterates through all projects and songs
- Heavy computation for portfolio view
- No performance optimization

---

### 2. ArtistRoster.tsx (Lines 32-67)

**Location**: `/client/src/components/ArtistRoster.tsx`

#### getArtistInsights() - Lines 32-67
```typescript
// Calculate average ROI across artist's released projects
const avgROI = releasedProjects.length > 0 ? 
  releasedProjects.reduce((sum, project) => {
    const budget = project.totalCost || project.budgetPerSong || 0;
    const revenue = metadata.revenue || 0;
    return sum + (budget > 0 ? ((revenue - budget) / budget) * 100 : 0);
  }, 0) / releasedProjects.length : 0;
```

**Issues**:
- Uses project metadata instead of song data
- Calculates average ROI incorrectly (should weight by investment)
- No direct link to song-level ROI

---

### 3. ReleaseWorkflowCard.tsx (Lines 245-249)

**Location**: `/client/src/components/ReleaseWorkflowCard.tsx`

#### ROI Display
```typescript
// Displays ROI from performance metrics
<span>ROI:</span>
<span className={performanceMetrics.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}>
  {(performanceMetrics.totalROI * 100).toFixed(0)}%
</span>
```

**Note**: This component uses ROI from `releaseAnalytics.ts` calculations

---

### 4. releaseAnalytics.ts (Lines 128-174)

**Location**: `/client/src/lib/releaseAnalytics.ts`

#### calculatePerformanceMetrics() - Lines 128-174
```typescript
// Calculate ROI for releases
const totalROI = totalInvestment > 0 ? 
  (totalRevenue - totalInvestment) / totalInvestment : 0;

// Determine campaign effectiveness based on ROI
let campaignEffectiveness = 'poor';
if (totalROI >= 2.0) campaignEffectiveness = 'excellent';
else if (totalROI >= 1.0) campaignEffectiveness = 'strong';
else if (totalROI >= 0.5) campaignEffectiveness = 'good';
else if (totalROI >= 0) campaignEffectiveness = 'fair';
```

**Issues**:
- Complex ROI thresholds hardcoded in frontend
- Multiple metrics derived from ROI calculation
- Performance impact for large releases

#### assessCampaignOutcome() - Lines 229-269
```typescript
// Tier assessment based on ROI
if (totalROI >= 3.0) return { tier: 'breakthrough' ... }
else if (totalROI >= 1.5) return { tier: 'strong_success' ... }
else if (totalROI >= 0.5) return { tier: 'modest_success' ... }
```

**Issues**:
- Business logic embedded in frontend
- Hardcoded thresholds that should be configurable

---

### 5. PlanReleasePage.tsx (Lines 404, 483-486, 1181-1186)

**Location**: `/client/src/pages/PlanReleasePage.tsx`

#### Projected ROI
```typescript
// Line 404: Initial state
projectedROI: 0

// Lines 483-486: Metadata storage
projectedROI: metrics.projectedROI,
totalInvestment: metrics.totalMarketingCost,
marketingBudget: Object.values(channelBudgets).reduce((a, b) => a + b, 0)

// Lines 1181-1186: Display
<span>Projected ROI:</span>
<span className={metrics.projectedROI > 0 ? 'text-green-600' : 'text-red-600'}>
  {metrics.projectedROI > 0 ? '+' : ''}{metrics.projectedROI}%
</span>
```

**Note**: Uses projected/estimated ROI for planning, not actual

---

## Hardcoded Values and Business Logic

### ROI Effectiveness Thresholds
- **Excellent**: ROI ≥ 200% (2.0x)
- **Strong**: ROI ≥ 100% (1.0x)
- **Good**: ROI ≥ 50% (0.5x)
- **Fair**: ROI ≥ 0%
- **Poor**: ROI < 0%

### Campaign Outcome Tiers
- **Breakthrough**: ROI ≥ 300% (3.0x)
- **Strong Success**: ROI ≥ 150% (1.5x)
- **Modest Success**: ROI ≥ 50% (0.5x)
- **Underperformed**: ROI ≥ -25% (-0.25x)
- **Failed**: ROI < -25%

---

## Performance Impact Analysis

### High Impact (Fix First)
1. **ActiveProjects.calculatePortfolioStats()** - Runs on every render with full dataset
2. **ArtistRoster.getArtistInsights()** - Calculates for all artists on component mount
3. **ActiveProjects.calculateProjectMetrics()** - Called multiple times per render

### Medium Impact
1. **releaseAnalytics.calculatePerformanceMetrics()** - Complex calculations but limited scope
2. **releaseAnalytics.assessCampaignOutcome()** - Multiple conditional checks

### Low Impact
1. **ReleaseWorkflowCard** - Only displays pre-calculated values
2. **PlanReleasePage** - Projected ROI only, not actual calculations

---

## Data Flow Issues

### Current Flow (Inefficient)
```
Songs Table → Frontend Aggregation → ROI Calculation → Display
              ↑                      ↑
              Recalculated on        No caching
              every render
```

### Proposed Flow (Phase 3)
```
Songs Table → Backend API → Cached ROI → Frontend Display
              ↓
              Database generated columns
              calculate once
```

---

## Migration Strategy for Phase 3

### Priority 1: Create Backend Endpoints
```typescript
// New API endpoints needed
GET /api/analytics/project/:projectId/roi
GET /api/analytics/artist/:artistId/roi
GET /api/analytics/release/:releaseId/roi
GET /api/analytics/portfolio/roi
```

### Priority 2: Replace Heavy Calculations
1. ActiveProjects.calculatePortfolioStats() → useQuery('/api/analytics/portfolio/roi')
2. ActiveProjects.calculateProjectMetrics() → useQuery('/api/analytics/project/:id/roi')
3. ArtistRoster.getArtistInsights() → useQuery('/api/analytics/artist/:id/roi')

### Priority 3: Move Business Logic
1. Extract ROI thresholds to backend configuration
2. Move campaign assessment logic to backend
3. Create configurable effectiveness tiers

### Priority 4: Optimize Remaining Frontend
1. Add React.memo to components displaying ROI
2. Implement proper caching with React Query
3. Use virtual scrolling for large lists

---

## Recommendations

### Immediate Actions (Before Phase 3)
1. **Add console warnings** to track ROI calculation frequency
2. **Document actual calculation times** in production
3. **Identify highest-traffic pages** using ROI calculations

### Phase 3 Implementation Order
1. **Week 1**: Create backend analytics endpoints
2. **Week 2**: Migrate ActiveProjects (highest impact)
3. **Week 3**: Migrate ArtistRoster and releaseAnalytics
4. **Week 4**: Clean up and optimize remaining frontend

### Configuration Management
Create `/data/balance/roi-thresholds.json`:
```json
{
  "effectiveness": {
    "excellent": 2.0,
    "strong": 1.0,
    "good": 0.5,
    "fair": 0.0
  },
  "campaignTiers": {
    "breakthrough": 3.0,
    "strongSuccess": 1.5,
    "modestSuccess": 0.5,
    "underperformed": -0.25
  }
}
```

---

## Success Metrics

After Phase 3 implementation:
- [ ] 80% reduction in frontend ROI calculations
- [ ] < 50ms response time for ROI queries
- [ ] Zero recalculation on component re-renders
- [ ] All business logic moved to backend
- [ ] Configurable thresholds without code changes

---

## Related Documentation

- [Artist Cost Tracking & ROI System](./artist-cost-tracking-roi-system.md)
- [Database Design](../../02-architecture/database-design.md)
- [Performance Optimization Guide](../../03-development/performance-guide.md)