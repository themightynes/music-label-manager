# Marketing Budget Limits Review

## Current State Analysis

### Hardcoded Values
**Location**: `shared/utils/marketingUtils.ts:51-52`

```typescript
minBudget: 500,    // TODO: Add to balance data
maxBudget: 15000,  // TODO: Add to balance data
```

### Configuration Source
**File**: `data/balance/markets.json`

**Marketing Channels Config**:
```json
"marketing_channels": {
  "radio": {
    "effectiveness": 0.85,
    "description": "High reach, mainstream appeal",
    "synergies": ["digital"]
  },
  "digital": {
    "effectiveness": 0.92,
    "description": "Targeted, cost-effective",
    "synergies": ["radio", "influencer"]
  },
  "pr": {
    "effectiveness": 0.78,
    "description": "Industry credibility, slower build",
    "synergies": ["influencer"]
  },
  "influencer": {
    "effectiveness": 0.88,
    "description": "Social engagement, younger demographics",
    "synergies": ["pr", "digital"]
  }
}
```

**Missing**: `minBudget` and `maxBudget` properties for each channel

---

## Usage Analysis

### Active Usage: 14 References

**Client UI** (`client/src/pages/PlanReleasePage.tsx`):
- Line 410: Validation - "requires minimum $X budget"
- Line 411: Error message for min budget
- Line 413: Validation - "cannot exceed $X"
- Line 414: Error message for max budget
- Line 977: Slider `max={channel.maxBudget}`
- Line 1049: Slider `max={Math.min(channel.maxBudget, gameState?.money || 0)}`
- Line 1055: Display "min" label
- Line 1059: Display "max" label

**Utility Function** (`shared/utils/marketingUtils.ts`):
- Line 259: `validateChannelBudget()` - checks budget is within min/max range

**Total Impact**: Budget limits are **actively enforced** in:
1. ✅ UI validation (prevents invalid inputs)
2. ✅ Slider constraints (visual feedback)
3. ✅ Display labels (player information)
4. ✅ Utility validation (programmatic checks)

---

## Problem Analysis

### The TODO is **Accurate**

**Current State**:
- ❌ Budget limits are **hardcoded** at 500/15000
- ❌ All marketing channels share **same limits** (unrealistic)
- ❌ Cannot tune per-channel without code changes
- ✅ Functionality works correctly

### Should Budget Limits Vary by Channel?

**Real-world logic suggests YES**:

1. **Radio Push** (expensive, high reach)
   - Reality: $5,000-50,000 campaigns typical
   - Current: $500-15,000 (too low for authenticity)

2. **Digital Ads** (flexible, scalable)
   - Reality: $100-100,000+ (wide range)
   - Current: $500-15,000 (reasonable middle ground)

3. **PR Campaign** (moderate cost)
   - Reality: $2,000-25,000 typical
   - Current: $500-15,000 (reasonable)

4. **Influencer Marketing** (variable)
   - Reality: $500-50,000+ depending on influencer tier
   - Current: $500-15,000 (could be higher ceiling)

**Verdict**: Different channels **should** have different budget ranges for gameplay depth and realism.

---

## Impact Assessment

### Functional Impact: ✅ LOW
- Current system works fine
- Values are reasonable defaults
- No bugs or blocking issues

### Game Design Impact: ⚠️ MEDIUM
- **Missed opportunity**: All channels feel same from budget perspective
- **Balance**: Cannot tune individual channel accessibility
- **Progression**: Cannot gate high-cost channels behind milestones
- **Realism**: Radio and influencers cost same (unrealistic)

### Technical Debt: ⚠️ LOW-MEDIUM
- **Architecture**: Already designed for per-channel config
- **Effort**: Easy fix (~15 minutes)
- **Maintenance**: Hardcoded values harder to tune during playtesting

---

## Recommendation

### ✅ Move to Balance Data (Recommended)

**Action**: Add per-channel budget limits to `data/balance/markets.json`

**Rationale**:
1. **Game design flexibility**: Easy to tune during playtesting
2. **Channel differentiation**: Radio vs digital can have different costs
3. **Progression design**: Can increase limits with reputation/tier
4. **Code architecture**: System already designed for this
5. **Low effort**: 15 minutes to implement

**Proposed Config**:
```json
"marketing_channels": {
  "radio": {
    "effectiveness": 0.85,
    "description": "High reach, mainstream appeal",
    "minBudget": 1000,
    "maxBudget": 25000,
    "synergies": ["digital"]
  },
  "digital": {
    "effectiveness": 0.92,
    "description": "Targeted, cost-effective",
    "minBudget": 500,
    "maxBudget": 15000,
    "synergies": ["radio", "influencer"]
  },
  "pr": {
    "effectiveness": 0.78,
    "description": "Industry credibility, slower build",
    "minBudget": 750,
    "maxBudget": 20000,
    "synergies": ["influencer"]
  },
  "influencer": {
    "effectiveness": 0.88,
    "description": "Social engagement, younger demographics",
    "minBudget": 500,
    "maxBudget": 30000,
    "synergies": ["pr", "digital"]
  }
}
```

**Code Change**:
```typescript
// shared/utils/marketingUtils.ts:51-52
// BEFORE:
minBudget: 500, // TODO: Add to balance data
maxBudget: 15000, // TODO: Add to balance data

// AFTER:
minBudget: config.minBudget || 500,
maxBudget: config.maxBudget || 15000,
```

**Fallback**: Keep current values as defaults if config missing (backwards compatible)

---

## Alternative: Keep As-Is

### ✅ Also Valid

**If**:
- You want all channels to be equally accessible
- Gameplay testing hasn't revealed need for differentiation
- Current values are "final" after playtesting

**Then**: Remove TODO comments and document as intentional design choice

**Update comment**:
```typescript
// Standard budget range for all marketing channels (design decision)
minBudget: 500,
maxBudget: 15000,
```

---

## Decision Matrix

| Factor | Move to Config | Keep Hardcoded |
|--------|----------------|----------------|
| **Flexibility** | ✅ High | ❌ Low |
| **Realism** | ✅ Can differentiate | ❌ All same |
| **Effort** | 🟡 15 min | ✅ 0 min |
| **Tuneability** | ✅ JSON edit | ❌ Code change |
| **Current Status** | 🟡 Works but TODO | ✅ Works fine |

---

## Conclusion

### Status: ✅ TODO is Accurate and Actionable

**The TODO correctly identifies**:
- Hardcoded values that should be in config
- Architecture already supports per-channel limits
- Easy improvement opportunity

**Recommendation**: **Move to balance data** (~15 min)

**Priority**: Low (not blocking, but good hygiene + design flexibility)

**Alternative**: If keeping hardcoded, update comment to explain it's intentional

---

**Decision Needed**: Move to config or keep as-is with updated comment?
