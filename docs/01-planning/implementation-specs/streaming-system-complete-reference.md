# Streaming System Complete Reference Guide

**Created**: September 2025  
**Purpose**: Comprehensive reference for song streaming mechanics, filling gaps between documentation and implementation

---

## Overview

This document consolidates all streaming system information, bridging gaps between existing documentation and actual implementation. It provides specific code locations, formulas, and cross-references to related documentation.

## Related Documentation

Before reading this guide, review these existing documents:
- **Core mechanics**: `/docs/99-legacy/streaming-revenue-decay-IMPLEMENTED.md` (Lines 1-258)
- **Revenue analysis**: `/docs/98-research/REVENUE_AND_STREAMS_SYSTEM_ANALYSIS_2025-08-23.md` (Lines 74-185)
- **Economic calculations**: `/docs/98-research/ECONOMY_CALCULATIONS_DEEP_DIVE_2025-08-26.md` (Lines 8-35)
- **API specifications**: `/docs/api-specifications/plan-release-api-spec.md` (Lines 236-260)
- **Budget impact**: `/docs/01-planning/implementation-specs/song-budget-quality-calculation.md` (Full document)

---

## Implementation Architecture

### Core Files and Their Roles

#### 1. **Calculation Engine** (`/shared/engine/FinancialSystem.ts`)
- **Lines 257-307**: `calculateStreamingOutcome()` - Initial streams calculation
- **Formula location**: Line 277-281
- **Key constants**: Lines 185-201

#### 2. **Game Orchestration** (`/shared/engine/game-engine.ts`)
- **Line 126**: Entry point for monthly decay processing
- **Lines 547-636**: `processReleasedProjects()` - Complete decay implementation
- **Lines 381-393**: Delegation to FinancialSystem
- **Stream calculation calls**: Lines 739, 933, 1816, 2581, 3055

#### 3. **Database Schema** (`/shared/schema.ts`)
- **Lines 124-129**: Song streaming metrics columns
- **Line 170**: Release month tracking for releases table

#### 4. **Configuration** (`/data/balance/markets.json` & `/server/data/gameData.ts`)
- **Lines 3-19**: Most streaming parameters in markets.json
- **base_streams_per_point**: Hard-coded in gameData.ts (value: 1000)
- **All other weights, multipliers, and thresholds in markets.json**

#### 5. **Data Access** (`/server/data/gameData.ts`)
- **Lines 850-860**: `getReleasedSongs()` - Fetches songs for processing
- **Lines 862-882**: `updateSongs()` - Batch updates song metrics

---

## Complete Streaming Formula

### Initial Streams Calculation

**Location**: `FinancialSystem.ts:277-281`

```javascript
baseStreams = 
  (quality * 0.35) +                                    // Quality component (35%)
  (playlistMultiplier * 0.25 * 100) +                  // Playlist reach (25%)
  (reputation * 0.20) +                                 // Label reputation (20%)
  (Math.sqrt(adSpend / 1000) * 0.20 * 50)             // Marketing impact (20%)

initialStreams = baseStreams * 2.5 * variance * base_streams_per_point
```

**Key Points Not in Other Docs**:
- Playlist component multiplied by 100 (PLAYLIST_COMPONENT_SCALE)
- Marketing uses square root for diminishing returns
- Marketing divided by 1000, then multiplied by 50
- `base_streams_per_point` hard-coded in gameData.ts as 1000 (not in config file)

### Monthly Decay Formula

**Location**: `FinancialSystem.ts:calculateDecayRevenue()` (called from `game-engine.ts:567`)

```javascript
monthsSinceRelease = currentMonth - song.releaseMonth
decayRate = 0.85  // From markets.json:12

// Base decay
baseDecay = Math.pow(decayRate, monthsSinceRelease)

// Bonuses (FinancialSystem.ts:calculateDecayRevenue)
reputationBonus = 1 + ((reputation - 50) * 0.002)  // REPUTATION_BASELINE constant = 50
accessBonus = 1 + (playlistMultiplier - 1) * accessTierBonusFactor

// Final monthly streams (includes ongoing_factor from config)
monthlyStreams = initialStreams * baseDecay * reputationBonus * accessBonus * ongoingFactor

// Revenue conversion (markets.json:13)
monthlyRevenue = monthlyStreams * 0.05
```

**Key Points Not in Other Docs**:
- Reputation baseline constant (REPUTATION_BASELINE = 50) is subtracted before bonus calculation
- Access tier bonuses use formula: `1 + (playlistMultiplier - 1) * accessTierBonusFactor`
- `ongoingFactor` (0.8 from config) is applied as an additional multiplier to monthly streams
- Decay stops after 24 months OR when revenue < $1

---

## Budget Impact on Streaming

### The Complete Path

1. **Budget → Quality Multiplier** (`FinancialSystem.ts:calculateBudgetQualityMultiplier()`)
   - Efficiency ratio calculation with 0.7 dampening factor
   - Piecewise function maps to 0.65x - 1.35x multiplier

2. **Quality → Initial Streams** (35% weight in formula)
   - Most important factor in streaming calculation
   - Higher quality = more initial streams

3. **Quality → Decay Resistance** (Not explicitly documented elsewhere)
   - Higher quality songs maintain audience better
   - Implemented through initial streams carrying forward

4. **Marketing Budget → Direct Streams** (20% weight)
   - Square root dampening: `Math.sqrt(adSpend / 1000)`
   - Prevents linear budget scaling

---

## Database Fields Reference

### Songs Table Streaming Fields (`schema.ts:124-129`)

| Field | Type | Purpose | Updated When |
|-------|------|---------|--------------|
| `initialStreams` | integer | First month performance | Song release |
| `totalStreams` | integer | Cumulative lifetime | Monthly |
| `totalRevenue` | integer | Cumulative revenue | Monthly |
| `monthlyStreams` | integer | Current month streams | Monthly |
| `lastMonthRevenue` | integer | Previous month revenue | Monthly |
| `releaseMonth` | integer | Decay calculation reference | Song release |

### Investment Tracking Fields (`schema.ts:131-133`)
| Field | Type | Purpose |
|-------|------|---------|
| `productionBudget` | integer | Per-song production cost |
| `marketingAllocation` | integer | Marketing spend per song |

---

## Processing Flow

### Monthly Processing Sequence (`game-engine.ts`)

1. **Line 126**: `processReleasedProjects()` called
2. **Line 553**: Fetch all released songs via `getReleasedSongs()`
3. **Lines 564-595**: For each song:
   - **Line 567**: Calls `calculateOngoingSongRevenue()` which delegates to FinancialSystem
   - FinancialSystem's `calculateDecayRevenue()` handles the actual calculation:
     - Applies decay formula with `ongoingFactor`
     - Applies reputation/access bonuses
     - Returns revenue if above threshold
4. **Lines 598-601**: Batch update all songs via `updateSongs()` if updates exist
5. **Lines 604-613**: Add total ongoing revenue to summary

### Lead Single Processing (`game-engine.ts:679-785`)

Special handling for lead singles:
- **Line 739**: Calculate initial streams for lead single
- **Line 755-775**: Update song as released with special metadata
- Lead single performance stored for main release boost

### Planned Release Processing (`game-engine.ts:787-1044`)

- **Line 933**: Calculate streams for each song in release
- **Lines 941-961**: Apply lead single boost if applicable
- **Line 966-985**: Update all songs with streaming metrics

---

## Configuration Parameters

### Complete Streaming Configuration

**Primary Location**: `/data/balance/markets.json:3-19`  
**Additional Config**: `/server/data/gameData.ts` (hardcoded values)

```json
// markets.json
{
  "streaming_calculation": {
    "quality_weight": 0.35,           // Quality importance
    "playlist_weight": 0.25,          // Distribution reach
    "reputation_weight": 0.20,        // Label credibility
    "marketing_weight": 0.20,         // Promotion impact
    "first_week_multiplier": 2.5,     // Initial burst
    // Note: base_streams_per_point NOT in this file
    "ongoing_streams": {
      "monthly_decay_rate": 0.85,     // 15% decline
      "revenue_per_stream": 0.05,     // $0.05 per stream
      "ongoing_factor": 0.8,           // Additional decay multiplier
      "reputation_bonus_factor": 0.002, // Per reputation point above 50
      "access_tier_bonus_factor": 0.1,  // Multiplier for access tier bonus
      "minimum_revenue_threshold": 1,   // Stop below $1
      "max_decay_months": 24           // 2-year lifecycle
    }
  }
}

// gameData.ts hardcoded value
base_streams_per_point: 1000  // Scaling factor (not in config file)
```

---

## Key Implementation Details Not Documented Elsewhere

### 1. Random Variance Application
- **Location**: `FinancialSystem.ts:293-296`
- Range: 0.9 to 1.1 (±10%)
- Applied after all other calculations
- Uses seeded RNG for deterministic results

### 2. Playlist Access Multipliers
- **Location**: `FinancialSystem.ts:273`
- Retrieved via `getAccessMultiplier('playlist', playlistAccess)`
- Actual values defined in separate access tier configuration

### 3. Song Update Batching
- **Location**: `game-engine.ts:621-626`
- All songs updated in single transaction for performance
- Prevents partial updates on failure

### 4. Investment Tracking Integration
- **Location**: `FinancialSystem.ts:21-177`
- `InvestmentTracker` class manages per-song budgets
- Enables accurate ROI calculations
- Marketing allocation happens at release planning

### 5. Lead Single Contribution Formula
- **Location**: `game-engine.ts:941-961`
- Lead single contributes 50% of its effectiveness
- Boost calculation: `1.0 + Math.min(0.3, leadStreams / 100000)`
- Maximum 30% boost to remaining songs

---

## Testing and Validation

### Key Test Points

1. **Quality Tester Route**: `/quality-tester`
   - Tests budget → quality → streams pipeline
   - Validates multiplier calculations

2. **Streaming Calculation Test**:
   ```javascript
   // Example test calculation
   quality: 70, playlist: 'mid', reputation: 50, marketing: 5000
   Expected: ~175,000 initial streams
   ```

3. **Decay Validation**:
   ```javascript
   // Month 1: 100,000 streams
   // Month 2: 85,000 streams (85% of previous)
   // Month 12: ~14,200 streams
   // Month 24: ~2,400 streams (likely below threshold)
   ```

---

## Common Integration Points

### For Frontend Development
- Display metrics from song fields (totalStreams, totalRevenue)
- Show efficiency rating from `getBudgetEfficiencyRating()`
- Preview calculations use same FinancialSystem methods

### For Backend Development
- All calculations through FinancialSystem class
- Database updates via ServerGameData methods
- Transaction support for atomic operations

### For Game Balance
- Adjust weights in markets.json
- Modify decay rate for different progression curves
- Change revenue_per_stream for economic scaling

---

## Summary

The streaming system is a complex, multi-layered implementation that accurately simulates music industry economics. Budget impacts streaming through both quality (35% weight) and direct marketing (20% weight), with sophisticated dampening to prevent exploitation. The monthly decay system creates realistic long-tail revenue patterns, while the investment tracking enables accurate ROI analysis at both song and artist levels.

All formulas and calculations are deterministic (using seeded RNG) and server-authoritative, ensuring consistency and preventing manipulation. The system successfully balances realism, gameplay depth, and technical performance.