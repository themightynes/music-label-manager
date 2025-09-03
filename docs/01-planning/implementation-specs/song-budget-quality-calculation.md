# Song Budget Quality Calculation System

**Created: December 2024**  
**Purpose: Document the current implementation of budget-to-quality calculations in FinancialSystem.ts**

---

## Overview

The song budget quality calculation system determines how a project's budget affects the quality of individual songs. It uses a sophisticated diminishing returns model that compares the per-song budget against a calculated "minimum viable per-song cost" to determine quality bonuses.

## Core Function: `calculateBudgetQualityBonus`

**Location**: `shared/engine/FinancialSystem.ts` lines 270-342  
**Purpose**: Calculate quality bonus based on budget efficiency using diminishing returns

### Input Parameters
- `budgetPerSong`: The budget allocated per song (in currency units)
- `projectType`: Type of project (Single, EP, Album, etc.)
- `producerTier`: Producer quality tier (Local, Regional, National, Legendary)
- `timeInvestment`: Time investment level (Rushed, Standard, Extended, Perfectionist)
- `songCount`: Number of songs in the project (default: 1)

### Output
- Quality bonus value (can be negative for under-budget projects)
- Rounded to 2 decimal places

---

## Calculation Process

### Step 1: Calculate Minimum Viable Per-Song Cost

The system first determines what the "minimum viable per-song cost" would be for this specific project configuration:

```typescript
const minTotalCost = this.calculateEnhancedProjectCost(projectType, producerTier, timeInvestment, 30, songCount);
const minPerSongCost = minTotalCost / songCount;
```

**Key Points**:
- Uses `quality = 30` as the baseline for minimum viable cost
- Accounts for project type, producer tier, time investment, and song count
- Includes economies of scale for multi-song projects
- This creates a dynamic reference point that scales with project complexity

### Step 2: Calculate Budget Efficiency Ratio

```typescript
const budgetRatio = budgetPerSong / minPerSongCost;
```

**Interpretation**:
- `ratio < 1.0`: Under-budget (below minimum viable)
- `ratio = 1.0`: Exactly at minimum viable cost
- `ratio > 1.0`: Over-budget (above minimum viable)

### Step 3: Apply Piecewise Function with Diminishing Returns

The system uses a 5-segment piecewise function based on the budget ratio:

#### Segment 1: Below Minimum Viable (Penalty)
```typescript
if (budgetRatio < breakpoints.minimum_viable) {
  budgetBonus = -5;  // Fixed penalty
}
```

#### Segment 2: Optimal Efficiency Range (Linear Growth)
```typescript
else if (budgetRatio <= breakpoints.optimal_efficiency) {
  // Linear scaling from 0 to 40% of max bonus
  budgetBonus = ((budgetRatio - breakpoints.minimum_viable) / 
                 (breakpoints.optimal_efficiency - breakpoints.minimum_viable)) * 
                (maxBonus * 0.4);
}
```

#### Segment 3: Luxury Range (Continued Linear Growth)
```typescript
else if (budgetRatio <= breakpoints.luxury_threshold) {
  // Linear scaling from 40% to 80% of max bonus
  const baseBonus = maxBonus * 0.4;
  const luxuryBonus = ((budgetRatio - breakpoints.optimal_efficiency) / 
                       (breakpoints.luxury_threshold - breakpoints.optimal_efficiency)) * 
                      (maxBonus * 0.4);
  budgetBonus = baseBonus + luxuryBonus;
}
```

#### Segment 4: High-End Range (Final Linear Growth)
```typescript
else if (budgetRatio <= breakpoints.diminishing_threshold) {
  // Linear scaling from 80% to 100% of max bonus
  const baseBonus = maxBonus * 0.8;
  const highEndBonus = ((budgetRatio - breakpoints.luxury_threshold) / 
                        (breakpoints.diminishing_threshold - breakpoints.luxury_threshold)) * 
                       (maxBonus * 0.2);
  budgetBonus = baseBonus + highEndBonus;
}
```

#### Segment 5: Diminishing Returns (Logarithmic)
```typescript
else {
  // Logarithmic diminishing returns beyond threshold
  const excessRatio = budgetRatio - breakpoints.diminishing_threshold;
  const diminishingBonus = Math.log(1 + excessRatio) * 
                           budgetSystem.diminishing_returns_factor * 
                           maxBonus * 0.1;
  budgetBonus = maxBonus + diminishingBonus;
}
```

---

## Configuration Values

### Default Breakpoints (from `balance.json`)
```json
{
  "minimum_viable": 0.6,
  "optimal_efficiency": 1.0,
  "luxury_threshold": 2.0,
  "diminishing_threshold": 3.0,
  "max_budget_bonus": 25,
  "diminishing_returns_factor": 0.3
}
```

### Breakpoint Interpretation
- **0.6x minimum viable**: Below this threshold gets -5 penalty
- **1.0x minimum viable**: Optimal efficiency point (0 bonus)
- **2.0x minimum viable**: Luxury threshold (80% of max bonus)
- **3.0x minimum viable**: Diminishing returns begin (100% of max bonus)
- **Beyond 3.0x**: Logarithmic diminishing returns

---

## Example Calculations

### Example 1: Under-Budget Project
- **Project**: Single song, Local producer, Standard time
- **Minimum viable cost**: $3,000/song
- **Actual budget**: $1,500/song
- **Ratio**: 0.5 (below 0.6 threshold)
- **Result**: -5 quality penalty

### Example 2: Optimal Budget Project
- **Project**: EP (4 songs), Regional producer, Extended time
- **Minimum viable cost**: $8,000/song
- **Actual budget**: $8,000/song
- **Ratio**: 1.0 (at optimal efficiency)
- **Result**: 0 quality bonus

### Example 3: Luxury Budget Project
- **Project**: Album (10 songs), National producer, Perfectionist time
- **Minimum viable cost**: $12,000/song
- **Actual budget**: $24,000/song
- **Ratio**: 2.0 (at luxury threshold)
- **Result**: +20 quality bonus (80% of max 25)

### Example 4: Diminishing Returns Project
- **Project**: Single song, Legendary producer, Perfectionist time
- **Minimum viable cost**: $15,000/song
- **Actual budget**: $60,000/song
- **Ratio**: 4.0 (beyond 3.0 threshold)
- **Result**: +25 + log(2) × 0.3 × 25 × 0.1 = +25.5 quality bonus

---

## Integration with Song Quality

### How It Fits Into Overall Quality Calculation
The budget bonus is one component of the total song quality calculation:

```typescript
// From game-engine.ts calculateEnhancedSongQuality()
const budgetBonus = this.financialSystem.calculateBudgetQualityBonus(
  budgetPerSong, projectType, producerTier, timeInvestment, songCount
);

const finalQuality = baseQuality + producerBonus + timeBonus + moodBonus + budgetBonus;
```

### Quality Impact
- **Positive bonus**: Increases final song quality
- **Negative penalty**: Decreases final song quality
- **Range**: Typically -5 to +30 quality points
- **Scaling**: Direct addition to other quality factors

---

## Design Rationale

### Why This System Exists
1. **Realistic Economics**: Higher budgets should generally improve quality, but with diminishing returns
2. **Strategic Depth**: Players must balance budget allocation across multiple factors
3. **Prevents Exploitation**: Diminishing returns prevent infinite quality scaling
4. **Dynamic Scaling**: Minimum viable cost adapts to project complexity

### Key Design Decisions
1. **Dynamic Reference Point**: Uses project's own cost model rather than fixed thresholds
2. **Piecewise Function**: Allows fine-tuning of different budget ranges
3. **Logarithmic Diminishing Returns**: Prevents infinite scaling while allowing high-end investment
4. **Configuration-Driven**: All values tunable via balance config files

---

## Edge Cases and Safeguards

### Input Validation
```typescript
if (budgetPerSong < 0 || songCount <= 0) {
  return 0;  // Invalid inputs
}
```

### Division by Zero Protection
```typescript
if (minPerSongCost <= 0) {
  return 0;  // Safety check
}
```

### Rounding
```typescript
return Math.round(budgetBonus * 100) / 100;  // Round to 2 decimal places
```

---

## Configuration Dependencies

### Required Configuration Files
- `balance.json`: Contains `budget_quality_system` configuration
- Project cost configurations for minimum viable cost calculation
- Producer tier and time investment multipliers

### System Dependencies
- `calculateEnhancedProjectCost()`: For minimum viable cost calculation
- `calculateEconomiesOfScale()`: For multi-song project scaling
- Producer and time investment systems: For cost multipliers

---

## Performance Characteristics

### Computational Complexity
- **Time Complexity**: O(1) - constant time calculation
- **Space Complexity**: O(1) - minimal memory usage
- **Dependencies**: Calls `calculateEnhancedProjectCost()` which has O(1) complexity

### Optimization Notes
- Configuration values cached via `gameData`
- Mathematical operations are simple arithmetic
- No loops or recursive calls
- Suitable for real-time UI calculations

---

## Future Considerations

### Potential Enhancements
- Genre-specific budget efficiency curves
- Artist talent modifiers for budget utilization
- Equipment quality impact on budget efficiency
- Market condition modifiers (recession/boom periods)

### Tuning Opportunities
- Breakpoint values for different game modes
- Diminishing returns curve adjustments
- Minimum viable cost calculation refinements
- Integration with other quality factors

