# Reputation Gain System Analysis
**Date**: 2025-10-19
**Bug Report ID**: e418f182-5aff-4b95-a4f9-567e7feb5272
**Reporter**: ernesto.chapa@gmail.com
**Issue**: "Feeling like it is too easy to gain reputation" (Week 7)

---

## Executive Summary

Analysis of the reputation gain formulas reveals **multiple compounding factors** that can lead to rapid reputation growth, especially after reaching the first access tier thresholds. The system currently lacks **diminishing returns** and has **generous conversion rates** that may accelerate progression faster than intended.

---

## Current Reputation Gain Sources

### 1. Press Coverage (Primary Source)
**Formula**: `Math.floor(pickups * (quality / 100) * REPUTATION_GAIN_MULTIPLIER)`

**Location**: [FinancialSystem.ts:1958](../shared/engine/FinancialSystem.ts#L1958)

**Parameters**:
- `pickups`: Number of press mentions (max 8 per release)
- `quality`: Song/release quality (0-100)
- `REPUTATION_GAIN_MULTIPLIER`: **2** (hardcoded constant)

**Press Pickup Calculation**:
- Base chance: 0.15
- PR spend modifier: 0.001 per dollar
- Reputation modifier: 0.008 per reputation point
- Story flag bonus: +0.30 chance
- Max pickups: **8 per release**

**Access Tier Multipliers** (pickup_chance):
- **none** (0 rep): 5% → 0.05
- **blogs** (8 rep): 25% → 0.25 (**5x increase**)
- **mid_tier** (25 rep): 60% → 0.60 (**12x increase**)
- **national** (50 rep): 85% → 0.85 (**17x increase**)

**Example Calculation** (Week 7 scenario):
```
Assumptions:
- Quality: 70
- Press access: "blogs" (25% base chance)
- Marketing budget: $5,000
- Current reputation: 15

Pickup chance = 0.25 (blogs) + (5000 * 0.001) + (15 * 0.008)
              = 0.25 + 5.0 + 0.12
              = 5.37 (capped at 8 pickups)

Expected pickups: ~5-6 per release

Reputation gain = 6 * (70/100) * 2
                = 6 * 0.7 * 2
                = 8.4 → 8 reputation points per release
```

**With 2-3 releases in Week 7**: **16-24 reputation points from press alone**

---

### 2. Streaming Success
**Formula**: `Math.floor(streams / 10000)` (1 rep per 10k streams)

**Location**: [game-engine.ts:4224](../shared/engine/game-engine.ts#L4224)

**Trigger**: Project completion (Singles/EPs)

**Example**:
- 100,000 streams = +10 reputation
- 250,000 streams = +25 reputation

**Problem**: **No diminishing returns**. Early-game and late-game reputation gains are equivalent per stream.

---

### 3. PR Campaigns (Marketing Focus Action)
**Formula**: Uses `calculatePressPickups()` with campaign cost

**Location**: [game-engine.ts:3923-3931](../shared/engine/game-engine.ts#L3923-L3931)

**Conversion**: Press mentions → Direct reputation increase

**Example**:
- $3,000 PR campaign → ~3-5 press mentions → +3-5 reputation

---

### 4. Digital Ads (Marketing Focus Action)
**Formula**: `Math.floor(campaignCost / 1000)` ($1k = +1 rep)

**Location**: [game-engine.ts:3939-3941](../shared/engine/game-engine.ts#L3939-L3941)

**Conversion Rate**: **$1,000 = +1 reputation point**

**Example**:
- $5,000 digital ads = +5 reputation
- **Capped at 100 max reputation**

**Problem**: **Very generous conversion rate**. Easy to buy reputation with marketing spend.

---

## Positive Feedback Loops (Compounding Issues)

### Loop 1: Reputation → Better Press Access → More Reputation
1. Gain 8 reputation → Unlock "blogs" tier
2. Press pickup chance increases from 5% → 25% (**5x multiplier**)
3. More press pickups → More reputation gain
4. At 25 reputation → Unlock "mid_tier" (60% pickup chance)
5. Cycle accelerates further

### Loop 2: Marketing Spend → Reputation → Better Returns
1. Spend $5k on marketing
2. Gain +5 reputation (digital ads) + press pickups
3. Higher reputation improves future press pickup chances
4. Better press access → Higher streaming multipliers → More revenue
5. More revenue enables more marketing spend

### Loop 3: Multiple Releases Compound Gains
1. Plan 2-3 releases in same week
2. Each release gets press coverage independently
3. Each release gains 5-10 reputation points
4. **Total gain: 15-30 reputation in single week**

---

## Balance Issues Identified

### Issue 1: No Diminishing Returns
**Current**: Linear scaling throughout entire game (1 rep per 10k streams, constant multipliers)
**Problem**: Early reputation is as easy to gain as late-game reputation
**Impact**: By week 7, player can gain 20-30 reputation per week with moderate activity

### Issue 2: Press Pickup Multipliers Too Aggressive
**Current**: 5% → 25% → 60% → 85% (17x growth from none → national)
**Problem**: First tier unlock (8 rep) provides 5x multiplier, creating explosive growth
**Impact**: Once "blogs" tier unlocked, reputation accelerates rapidly

### Issue 3: Marketing → Reputation Conversion Too Generous
**Current**: $1,000 marketing = +1 reputation point
**Problem**: Money can directly buy reputation with no skill/quality requirement
**Impact**: Players with good cash flow can fast-track reputation progression

### Issue 4: REPUTATION_GAIN_MULTIPLIER May Be Too High
**Current**: Hardcoded at **2** in FinancialSystem.ts
**Problem**: Doubles all press-based reputation gains
**Impact**: 8 press pickups * 70% quality * 2 = 11 reputation (should this be 5-6?)

### Issue 5: Access Tier Thresholds Too Low
**Current Unlock Progression**:
- **8 rep** → "blogs" press access (25% pickup chance)
- **10 rep** → "niche" playlist access
- **25 rep** → "mid_tier" press access (60% pickup chance)
- **50 rep** → "national" press access (85% pickup chance)

**Problem**: First major tier unlocks happen too early (weeks 3-5)
**Impact**: Player hits exponential growth phase before mid-game

---

## Comparison to Design Intent

### Access Tier Unlock Timeline (Current vs Expected)

| Tier | Threshold | Expected Week | Likely Actual Week |
|------|-----------|---------------|-------------------|
| blogs (press) | 8 rep | Week 5-6 | **Week 2-3** |
| niche (playlist) | 10 rep | Week 6-7 | **Week 3-4** |
| mid_tier (press) | 25 rep | Week 15-20 | **Week 6-8** |
| national (press) | 50 rep | Week 30-35 | **Week 12-15** |

**Observation**: Player is reaching mid-tier thresholds **2-3x faster** than expected progression curve.

---

## Recommended Balance Adjustments

### Priority 1: Add Diminishing Returns to Press Reputation Gains
**Change**: Modify [FinancialSystem.ts:1958](../shared/engine/FinancialSystem.ts#L1958)

**Current**:
```typescript
const reputationGain = pickups > 0 ?
  Math.floor(pickups * (quality / 100) * this.CONSTANTS.REPUTATION_GAIN_MULTIPLIER) : 0;
```

**Proposed**:
```typescript
const diminishingFactor = 1 - (reputation / this.CONSTANTS.MAX_REPUTATION) * 0.5; // 50% reduction at max rep
const reputationGain = pickups > 0 ?
  Math.floor(pickups * (quality / 100) * this.CONSTANTS.REPUTATION_GAIN_MULTIPLIER * diminishingFactor) : 0;
```

**Impact**:
- At 0 rep: Full gains (100%)
- At 50 rep: 75% of base gains
- At 100 rep: 50% of base gains

---

### Priority 2: Reduce REPUTATION_GAIN_MULTIPLIER
**Change**: Reduce from **2** to **1.5** or **1.25**

**Location**: [FinancialSystem.ts:422](../shared/engine/FinancialSystem.ts#L422)

**Impact**:
- 8 pickups * 70% quality * 2 = **11 reputation** (current)
- 8 pickups * 70% quality * 1.5 = **8 reputation** (proposed)
- 8 pickups * 70% quality * 1.25 = **7 reputation** (conservative)

**Recommendation**: Test with **1.5** first, adjust if needed.

---

### Priority 3: Increase Marketing → Reputation Conversion Cost
**Change**: Modify [game-engine.ts:3939-3941](../shared/engine/game-engine.ts#L3939-L3941)

**Current**:
```typescript
const streamingBoost = Math.floor(campaignCost / 1000); // $1k = 1 rep
```

**Proposed**:
```typescript
const streamingBoost = Math.floor(campaignCost / 2000); // $2k = 1 rep
```

**Impact**: Doubles the cost to buy reputation via marketing spend.

---

### Priority 4: Adjust Press Access Tier Thresholds
**Change**: Increase thresholds to slow early progression

**Current** ([progression.json:45-66](../data/balance/progression.json#L45-L66)):
- blogs: 8 rep
- mid_tier: 25 rep
- national: 50 rep

**Proposed**:
- blogs: **12 rep** (+50% increase)
- mid_tier: **35 rep** (+40% increase)
- national: **65 rep** (+30% increase)

**Impact**: Delays tier unlocks by 2-4 weeks, smoothing progression curve.

---

### Priority 5: Cap Weekly Reputation Gain
**Change**: Add weekly reputation gain cap to prevent explosive growth

**Implementation**: Track reputation gains in `WeekSummary.reputationChanges`

**Proposed Cap**: **15 reputation points per week** (can be adjusted)

**Impact**: Prevents 30+ reputation spikes from multiple releases/campaigns in single week.

---

## Testing Recommendations

### Test Scenario 1: Week 7 Replication
**Setup**:
- Start at reputation 15
- Complete 2 releases with $5k marketing each
- Current formula results

**Metrics to Track**:
- Total reputation gain
- Press pickups per release
- Streaming reputation contribution
- Marketing reputation contribution

---

### Test Scenario 2: Full Campaign Simulation
**Setup**:
- Simulate weeks 1-20 with moderate player strategy
- Track reputation progression curve

**Expected Outcome** (with fixes):
- Week 7: 15-20 reputation (vs current 25-35)
- Week 15: 30-40 reputation (vs current 50-60)
- Week 20: 45-55 reputation (vs current 70-80)

---

## Next Steps

1. **✅ Document current formulas** (this analysis)
2. **⏳ Implement Priority 1-2 changes** (diminishing returns + multiplier reduction)
3. **⏳ Playtest adjusted values** (weeks 1-15 simulation)
4. **⏳ Review player feedback** (compare to bug reporter's experience)
5. **⏳ Iterate on thresholds** (adjust tier unlock requirements if needed)

---

## Related Files

- [FinancialSystem.ts](../shared/engine/FinancialSystem.ts) - Press outcome calculations
- [game-engine.ts](../shared/engine/game-engine.ts) - Streaming/marketing reputation
- [progression.json](../data/balance/progression.json) - Access tier thresholds
- [markets.json](../data/balance/markets.json) - Press coverage configuration
- [Bug Report](../data/bugReports.json) - Original player feedback

---

## Appendix: Formula Reference

### Complete Press Reputation Formula
```typescript
// Step 1: Calculate press pickups
pickupChance = baseTierChance + (marketingBudget * 0.001) + (reputation * 0.008)
pickups = rollDice(pickupChance, maxPickups=8)

// Step 2: Calculate reputation gain
reputationGain = Math.floor(pickups * (quality/100) * REPUTATION_GAIN_MULTIPLIER)

// Example:
// - blogs tier (0.25 base)
// - $5k marketing (+5.0)
// - 15 reputation (+0.12)
// = 5.37 chance → ~6 pickups
// - Quality 70
// - Multiplier 2
// = 6 * 0.7 * 2 = 8.4 → 8 reputation points
```

### Streaming Reputation Formula
```typescript
reputationGain = Math.floor(streams / 10000)
// Linear: 10k streams = 1 rep, 100k streams = 10 rep, no cap
```

### Marketing Campaign Reputation Formula
```typescript
// Digital Ads
reputationGain = Math.floor(campaignCost / 1000)
// Direct conversion: $1k = 1 rep point

// PR Campaigns
reputationGain = pressPickups // 1:1 with press mentions
```

---

**Analysis Complete** | Next: Implement Priority 1-2 Fixes
