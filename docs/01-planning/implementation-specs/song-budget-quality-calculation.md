# Song Budget Quality Calculation System

**Last Updated: September 2025**  
**Location**: `shared/engine/FinancialSystem.ts` - `calculateBudgetQualityMultiplier()` method

---

## Overview

The budget quality calculation system determines how project budget affects song quality using a sophisticated piecewise function with efficiency-based scaling and dampening. The system compares actual budget against a dynamically calculated "minimum viable cost" to determine quality multipliers.

## Core Method: `calculateBudgetQualityMultiplier`

**Purpose**: Calculate quality multiplier based on budget efficiency with dampening to reduce budget's impact

### Input Parameters
- `budgetPerSong`: Budget allocated per song
- `projectType`: Type of project (Single, EP, etc.)
- `producerTier`: Producer quality tier (local, regional, national, legendary)
- `timeInvestment`: Time level (rushed, standard, extended, perfectionist)
- `songCount`: Number of songs (default: 1)

### Output
- Quality multiplier (0.65x to ~1.5x range)
- Rounded to 3 decimal places

---

## Calculation Process

### Step 1: Calculate Dynamic Minimum Viable Cost

The system calculates what a baseline quality project would cost:

```javascript
minViableCost = baseCost × economiesOfScale × 1.5
```

**Key Points**:
- Base cost from economy.json project costs
- Economies of scale for multi-song projects:
  - Single (1 song): 1.0x
  - Small (2-4 songs): 0.95x
  - Medium (5-7 songs): 0.85x
  - Large (8+ songs): 0.75x
- 1.5x baseline multiplier ensures minimum budgets don't give quality bonuses
- **NOT** affected by producer/time multipliers (avoids double-counting)

### Step 2: Calculate Efficiency Ratio with Dampening

```javascript
rawEfficiencyRatio = budgetPerSong / minViableCost

// Apply dampening to reduce budget impact
dampeningFactor = 0.7  // From quality.json
efficiencyRatio = 1 + dampeningFactor × (rawEfficiencyRatio - 1)
```

**Dampening Effect**:
- Reduces budget's impact by 30%
- Keeps ratio=1 unchanged (neutral point)
- Examples:
  - 2.0x raw → 1.7x dampened
  - 0.5x raw → 0.65x dampened

### Step 3: Apply Piecewise Function

The efficiency ratio maps to a quality multiplier using a 6-segment function:

| Efficiency Range | Quality Multiplier | Description |
|-----------------|-------------------|-------------|
| < 0.6x | 0.65x flat | Insufficient budget penalty |
| 0.6-0.8x | 0.65x to 0.85x | Below standard, linear |
| 0.8-1.2x | 0.85x to 1.05x | Efficient range, best value |
| 1.2-2.0x | 1.05x to 1.20x | Premium investment |
| 2.0-3.5x | 1.20x to 1.35x | Luxury production |
| > 3.5x | 1.35x + log growth | Diminishing returns |

### Step 4: Efficiency Rating System

The `getBudgetEfficiencyRating()` method provides human-readable feedback:

```javascript
function getBudgetEfficiencyRating(budgetPerSong, ...params) {
  // Applies same dampening as multiplier calculation
  efficiencyRatio = 1 + 0.7 × (rawRatio - 1)
  
  if (ratio < 0.6) return "Insufficient"
  if (ratio < 0.8) return "Below Standard"
  if (ratio <= 1.2) return "Efficient"
  if (ratio <= 2.0) return "Premium"
  if (ratio <= 3.5) return "Luxury"
  return "Excessive"
}
```

---

## Configuration

Located in `data/balance/quality.json`:

```json
{
  "budget_quality_system": {
    "efficiency_breakpoints": {
      "penalty_threshold": 0.6,
      "minimum_viable": 0.8,
      "optimal_efficiency": 1.2,
      "luxury_threshold": 2.0,
      "diminishing_threshold": 3.5
    },
    "efficiency_dampening": {
      "enabled": true,
      "factor": 0.7,
      "description": "Reduces budget impact by dampening efficiency ratio"
    }
  }
}
```

---

## Example Scenarios

### Scenario 1: Minimum Budget EP (5 songs)
- **Project**: EP with local producer, rushed time
- **Budget**: $4,000/song (minimum allowed)
- **Min Viable**: $5,100 (base $4k × 0.85 economies × 1.5)
- **Raw Efficiency**: 0.78x
- **Dampened**: 0.85x (with 0.7 factor)
- **Multiplier**: 0.87x (-13% quality)

### Scenario 2: Premium Single
- **Project**: Single with national producer, extended time
- **Budget**: $12,000 (maximum allowed)
- **Min Viable**: $5,250 (base $3.5k × 1.0 × 1.5)
- **Raw Efficiency**: 2.29x
- **Dampened**: 1.90x (with 0.7 factor)
- **Multiplier**: 1.18x (+18% quality)

### Scenario 3: Efficient EP
- **Project**: EP with regional producer, standard time
- **Budget**: $7,000/song
- **Min Viable**: $5,100
- **Raw Efficiency**: 1.37x
- **Dampened**: 1.26x (with 0.7 factor)
- **Multiplier**: 1.08x (+8% quality)

---

## UI Integration

### ProjectCreationModal.tsx
- Calculates identical efficiency ratios with dampening
- Shows real-time efficiency rating with color coding
- Displays budget multiplier in quality preview breakdown
- Updates dynamically as user adjusts budget/producer/time

### Visual Feedback
- **Red**: Insufficient (<0.6x)
- **Orange**: Below Standard (0.6-0.8x)
- **Green**: Efficient (0.8-1.2x)
- **Blue**: Premium (1.2-2.0x)
- **Purple**: Luxury (2.0-3.5x)
- **Yellow**: Excessive (>3.5x)

---

## Recent Changes (September 2025)

### Budget Dampening System
- Added configurable dampening factor (default 0.7)
- Reduces budget's overall impact on quality by 30%
- Prevents budget from dominating quality calculations
- Maintains strategic importance while increasing other factors' relevance

### Implementation Details
1. **FinancialSystem.ts**: Core calculation with dampening
2. **ProjectCreationModal.tsx**: UI preview with same dampening
3. **QualityTester.tsx**: Testing interface updated
4. **quality.json**: Configuration for dampening factor

---

## Integration with Quality System

The budget multiplier is one of several multiplicative factors:

```javascript
Final Quality = Base × Time × Popularity × Focus × Budget × Mood × Variance
```

With dampening at 0.7:
- Budget can affect quality from 0.65x to ~1.35x
- Down from previous 0.65x to 1.5x+ range
- Other factors now have more relative impact

---

## Testing

Use `/quality-tester` route to:
- Test different budget/producer/time combinations
- See efficiency ratios with dampening applied
- Verify multiplier calculations match expectations
- Run simulations to see quality distributions

---

## Future Considerations

1. **Dynamic Dampening**: Could vary by game difficulty
2. **Genre-Specific Costs**: Different music styles have different economics
3. **Market Conditions**: Economic state could affect efficiency
4. **Producer Relationships**: Discounts for repeat collaborations
5. **Studio Equipment**: Owned equipment could reduce minimum viable costs