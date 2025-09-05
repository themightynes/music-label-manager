# Song Quality Calculation System

**Last Updated: September 2025**  
**Location**: `shared/engine/game-engine.ts` - `calculateEnhancedSongQuality()` method

## Overview

The song quality calculation system uses a **multiplicative formula** that combines artist talent, producer skill, and various modifiers to determine final song quality (0-100 scale). The system includes skill-based variance with outlier events for dramatic outcomes.

## Core Formula

```text
Final Quality = Base × Time × Popularity × Focus × Budget × Mood × Variance
```

Where:
- **Base Quality** = Artist Talent (0-100) + Producer Skill Bonus
- All factors are multiplicative (typically 0.5x to 1.5x range)
- Final result is clamped between 25-98

## Component Breakdown

### 1. Base Quality
- **Primary**: Artist's `talent` attribute (0-100)
- **Producer Bonus**:
  - Local: +0
  - Regional: +5
  - National: +12
  - Legendary: +20
- **Formula**: `baseQuality = talent + producerBonus`

### 2. Time & Work Ethic Factor
Combines time investment with artist work ethic:
- **Time Investment Multipliers**:
  - Rushed: 0.9x
  - Standard: 1.0x
  - Extended: 1.08x
  - Perfectionist: 1.15x
- **Work Ethic Scaling**: `0.8 + (workEthic/100) * 0.4`
- **Combined**: `timeFactor × workEthicFactor`

### 3. Popularity Factor
Artist popularity affects reach but not core quality:
- **Formula**: `0.8 + (popularity/100) * 0.3`
- **Range**: 0.8x to 1.1x
- **Purpose**: Popular artists have slight quality advantages

### 4. Focus Factor (Session Fatigue)
Quality drops for recording multiple songs:
- **Formula**: `0.97^(songCount - 3)` for songCount > 3
- **Examples**:
  - 1-3 songs: 1.0x (no fatigue)
  - 4 songs: 0.97x
  - 5 songs: 0.94x
  - 10 songs: 0.81x

### 5. Budget Factor (with Dampening)
Complex piecewise function based on efficiency ratio:

#### Efficiency Calculation:
```javascript
minViableCost = baseCost × economiesOfScale × 1.5
rawEfficiency = budgetPerSong / minViableCost

// Apply dampening (reduces budget impact by 30%)
efficiency = 1 + 0.7 × (rawEfficiency - 1)
```

#### Piecewise Multiplier:
- **< 0.6x**: 0.65x (heavy penalty)
- **0.6-0.8x**: 0.65x to 0.85x (below standard)
- **0.8-1.2x**: 0.85x to 1.05x (efficient range)
- **1.2-2.0x**: 1.05x to 1.20x (premium)
- **2.0-3.5x**: 1.20x to 1.35x (luxury)
- **> 3.5x**: 1.35x + logarithmic growth (diminishing returns)

**Dampening Factor**: 0.7 (configurable in quality.json)
- Reduces budget's impact on quality by 30%
- Prevents budget from dominating quality calculations

### 6. Mood Factor
Artist's current mood affects performance:
- **Formula**: `0.9 + 0.2 × (mood/100)`
- **Range**: 0.9x to 1.1x
- **Default**: 1.0x at 50 mood

### 7. Variance System (Enhanced with Outliers)

#### Base Variance (90% of the time):
Skill-based random variance where higher combined skill = more consistency:
```javascript
combinedSkill = (artistTalent + producerSkill) / 2
baseVarianceRange = 35 - (30 × (combinedSkill/100))
```

**Variance Ranges**:
- Low skill (25): ±35% variance
- Medium skill (50): ±20% variance
- High skill (75): ±10% variance
- Max skill (100): ±5% variance

#### Outlier Events (10% chance):
- **5% Breakout Hit**: 
  - Multiplier: 1.5x to 2.0x
  - Low skill gets bigger boost potential
- **5% Critical Failure**:
  - Multiplier: 0.5x to 0.7x
  - High skill has protection (less severe)

## Quality Boundaries

- **Floor**: 25 (no song is completely worthless)
- **Ceiling**: 98 (leave room for legendary moments)

## Example Calculation

**Scenario**: Regional producer, standard time, efficient budget, 5-song EP
- Artist: 70 talent, 60 work ethic, 40 popularity, 50 mood
- Producer: Regional (55 skill, +5 bonus)
- Budget: $7,000/song (1.37x efficiency, dampened to 1.26x)

**Calculation**:
```
Base = 70 + 5 = 75
Time = 1.0 × 0.92 = 0.92
Popularity = 0.8 + 0.12 = 0.92
Focus = 0.97^2 = 0.94 (5 songs)
Budget = 1.08 (after dampening)
Mood = 1.0
Variance = ±17.5% (or outlier)

Result = 75 × 0.92 × 0.92 × 0.94 × 1.08 × 1.0 × variance
       = ~64 × variance
       = 53-75 (normal) or 32-128 (outlier)
Final = 53-75 (clamped)
```

## Configuration

All values are configurable in:
- `data/balance/quality.json` - Quality system settings
- `data/balance/economy.json` - Project costs and economies of scale
- `data/producer-tiers.json` - Producer bonuses
- `data/time-investment.json` - Time multipliers

## Recent Changes (Sept 2025)

1. **Budget Dampening**: Added 0.7 factor to reduce budget's impact
2. **Enhanced Variance**: Increased from ±20% max to ±35% max
3. **Outlier System**: 10% chance of extreme outcomes
4. **UI Preview**: Shows variance range and outlier possibility

## Frontend-Backend Synchronization

The `ProjectCreationModal.tsx` accurately previews all factors:
- Uses identical calculations for all multipliers
- Applies same dampening factor (0.7) to budget
- Shows expected variance range
- Warns about 10% outlier chance

The preview shows expected quality before randomness, which is appropriate for user planning.

