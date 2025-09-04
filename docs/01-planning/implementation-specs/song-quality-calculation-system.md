# Song Quality Calculation System

## Overview

The song quality calculation system is a comprehensive formula that combines multiple factors to determine the final quality of a song (0-100 scale). The system uses additive bonuses for most factors, with one multiplicative factor for multi-song projects.

## Core Formula

```text
Song Quality = BASE QUALITY + PRODUCER TIER BONUS + TIME INVESTMENT BONUS + ARTIST MOOD BONUS + BUDGET MODIFIER
```

Then:
```text
Final Song Quality = clamp( (Song Quality) × songCountImpact, 20, 100 )
```

## Component Breakdown

### 1. Base Quality
- **Range**: 40-60
- **Formula**: `40 + random(0, 20)`
- **Purpose**: Provides baseline quality with RNG variance
- **Implementation**: Uses seeded RNG for deterministic results

### 2. Producer Tier Bonus
- **Source**: `producer_tier_system[producerTier].quality_bonus`
- **Values**:
  - Local: 0
  - Regional: 5
  - National: 12
  - Legendary: 20
- **Purpose**: Higher-tier producers provide better equipment, connections, and expertise

### 3. Time Investment Bonus
- **Source**: `time_investment_system[timeInvestment].quality_bonus`
- **Values**:
  - Rushed: -10
  - Standard: 0
  - Extended: 8
  - Perfectionist: 15
- **Purpose**: More time allows for better takes, mixing, and refinement

### 4. Artist Mood Bonus
- **Formula**: `floor(((artist.mood || 50) - 50) * 0.2)`
- **Range**: -10 to +10
- **Purpose**: Artist's emotional state affects performance quality
- **Note**: This formula is duplicated in the frontend preview calculation

### 5. Budget Modifier (Most Complex Component)

The budget modifier is the most sophisticated part of the system, using diminishing returns based on per-song budget efficiency.

#### 5.1 Minimum Viable Per-Song Cost Calculation

First, the system calculates a reference "minimum viable per-song cost" using the project's own cost model:

```typescript
// Mode 1: Per-song cost system (for multi-song projects)
if (songCountSystem?.enabled && actualSongCount > 1) {
  const baseCostPerSong = songCountSystem.base_per_song_cost[projectType.toLowerCase()] || projectCosts.min;
  const economiesMultiplier = this.calculateEconomiesOfScale(actualSongCount, songCountSystem.economies_of_scale);
  totalBaseCost = baseCostPerSong * actualSongCount * economiesMultiplier;
} else {
  // Mode 2: Single-song interpolation
  totalBaseCost = projectCosts.min + ((projectCosts.max - projectCosts.min) * (quality / 100));
}

// Apply multipliers
const producerMultiplier = producerSystem[producerTier]?.multiplier || 1.0;
const timeMultiplier = timeSystem[timeInvestment]?.multiplier || 1.0;
const finalCost = Math.floor(totalBaseCost * producerMultiplier * timeMultiplier);

// Per-song cost
const minPerSongCost = finalCost / songCount;
```

#### 5.2 Budget Efficiency Ratio

```typescript
const budgetRatio = budgetPerSong / minPerSongCost;
```

#### 5.3 Piecewise Budget Bonus Calculation

The budget bonus uses a piecewise function with different slopes for different efficiency ranges:

```typescript
if (budgetRatio < breakpoints.minimum_viable) {
  // Below minimum viable - penalty
  budgetBonus = -5;
} else if (budgetRatio <= breakpoints.optimal_efficiency) {
  // Linear scaling from 0 to 40% of max bonus in optimal range
  budgetBonus = ((budgetRatio - breakpoints.minimum_viable) / (breakpoints.optimal_efficiency - breakpoints.minimum_viable)) * (maxBonus * 0.4);
} else if (budgetRatio <= breakpoints.luxury_threshold) {
  // Linear scaling from 40% to 80% of max bonus in luxury range
  const baseBonus = maxBonus * 0.4;
  const luxuryBonus = ((budgetRatio - breakpoints.optimal_efficiency) / (breakpoints.luxury_threshold - breakpoints.optimal_efficiency)) * (maxBonus * 0.4);
  budgetBonus = baseBonus + luxuryBonus;
} else if (budgetRatio <= breakpoints.diminishing_threshold) {
  // Linear scaling from 80% to 100% of max bonus before diminishing returns
  const baseBonus = maxBonus * 0.8;
  const highEndBonus = ((budgetRatio - breakpoints.luxury_threshold) / (breakpoints.diminishing_threshold - breakpoints.luxury_threshold)) * (maxBonus * 0.2);
  budgetBonus = baseBonus + highEndBonus;
} else {
  // Diminishing returns beyond threshold
  const excessRatio = budgetRatio - breakpoints.diminishing_threshold;
  const diminishingBonus = Math.log(1 + excessRatio) * budgetSystem.diminishing_returns_factor * maxBonus * 0.1;
  budgetBonus = maxBonus + diminishingBonus;
}
```

#### 5.4 Budget System Configuration

Default breakpoints and values:
- `minimum_viable`: 0.6
- `optimal_efficiency`: 1.0
- `luxury_threshold`: 2.0
- `diminishing_threshold`: 3.0
- `max_budget_bonus`: 25
- `diminishing_returns_factor`: 0.3

### 6. Song Count Impact (Multiplicative Factor)

For multi-song projects, quality is reduced due to divided attention:

```typescript
if (!songCountSystem?.enabled || songCount <= 1) {
  return 1.0; // No impact for single songs
}

// Exponential decay: quality = baseQualityPerSong^(songCount-1)
const qualityImpact = Math.pow(baseQualityPerSong, songCount - 1);

// Ensure it doesn't go below minimum
const finalImpact = Math.max(minMultiplier, qualityImpact);
```

## Implementation Locations

### Core Calculation
- **File**: `shared/engine/game-engine.ts`
- **Method**: `calculateEnhancedSongQuality()`
- **Lines**: 1555-1613

### Budget and Cost Calculations
- **File**: `shared/engine/FinancialSystem.ts`
- **Methods**: 
  - `calculateBudgetQualityBonus()` (lines 270-342)
  - `calculateSongCountQualityImpact()` (lines 348-374)
  - `calculateEnhancedProjectCost()` (lines 380-435)

### Configuration Data
- **File**: `data/balance/quality.json`
- **Sections**: `producer_tier_system`, `time_investment_system`, `budget_quality_system`

### System Access
- **File**: `server/data/gameData.ts`
- **Methods**: `getProducerTierSystemSync()`, `getTimeInvestmentSystemSync()`

## Frontend Preview

The frontend preview calculation in `client/src/components/ProjectCreationModal.tsx` (lines 244-284) uses a simplified version of the budget bonus calculation to provide real-time quality estimates.

## Mathematical Formula (Spreadsheet-Ready)

Let:
- M = artist mood (0–100)
- P_B = producer tier quality bonus
- T_B = time investment quality bonus
- N = songCount (≥1)
- B_ps = per-song budget
- PT = project type
- rnd = RANDBETWEEN(0,20)

### Step 1: Base Components
```
BASE_QUALITY = 40 + rnd
ARTIST_MOOD_BONUS = INT((M - 50) * 0.2)
PRODUCER_TIER_BONUS = P_B
TIME_INVESTMENT_BONUS = T_B
```

### Step 2: Budget Modifier
```
minPerSongCost = calculateEnhancedProjectCost(PT, producerTier, timeInvestment, 30, N) / N
R = B_ps / minPerSongCost

// Piecewise function based on R vs breakpoints
BUDGET_MODIFIER = piecewise_function(R, breakpoints, maxBonus, diminishingFactor)
```

### Step 3: Song Count Impact
```
if N <= 1: SONG_COUNT_IMPACT = 1.0
else: SONG_COUNT_IMPACT = MAX(minMultiplier, baseQualityPerSong^(N-1))
```

### Step 4: Final Quality
```
PRE_COUNT_QUALITY = BASE_QUALITY + PRODUCER_TIER_BONUS + TIME_INVESTMENT_BONUS + ARTIST_MOOD_BONUS + BUDGET_MODIFIER
RAW_QUALITY = PRE_COUNT_QUALITY * SONG_COUNT_IMPACT
FINAL_QUALITY = MIN(100, MAX(20, RAW_QUALITY))
```

## Complexity Analysis

The **budget modifier** is the most complex component because it:

1. **Normalization Complexity**: Must calculate a reference "minimum viable per-song cost" using the project's own cost model, which varies by:
   - Project type (Single, EP, etc.)
   - Producer tier (affects cost multipliers)
   - Time investment (affects cost multipliers)
   - Song count (affects economies of scale)
   - Cost system mode (per-song vs single-song)

2. **Piecewise Function**: Uses a 5-segment piecewise function with different slopes and a logarithmic tail for diminishing returns

3. **Configuration Coupling**: Depends on many balance configuration values that can change the behavior

4. **Edge Cases**: Handles various input formats (total budget vs per-song budget) and validation

All other components are straightforward lookups or simple mathematical formulas.

## Design Principles

1. **Deterministic**: Uses seeded RNG for reproducible results
2. **Configurable**: All values come from balance configuration files
3. **Realistic**: Diminishing returns prevent infinite quality scaling
4. **Balanced**: Multiple factors prevent any single input from dominating
5. **Transparent**: Detailed logging and metadata for debugging and UI display

## Future Considerations

The system is designed to be extensible. Potential future enhancements could include:
- Artist talent/work ethic/creativity bonuses (currently only mood is used)
- Genre-specific quality modifiers
- Equipment quality bonuses
- Collaboration bonuses for multiple artists
- Seasonal or market condition modifiers


