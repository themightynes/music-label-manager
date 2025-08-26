# Financial Calculation Bug Analysis

## The Core Problem

The financial calculation system has a critical bug where expenses and revenue are calculated in two separate, disconnected ways:

1. **Early calculations** (lines 123-178) add to `summary.revenue` and `summary.expenses`
2. **Financial consolidation** (line 181) calculates from scratch with hardcoded zeros
3. **Summary overwrite** (lines 186-187) replaces the early calculations with incomplete values

This causes discrepancies between:
- What the player sees in the month summary
- What actually happens to their money
- What's shown in the financial breakdown

## Detailed Flow Analysis

### Phase 1: Early Calculations (Before Line 181)
These functions add to `summary.revenue` and `summary.expenses`:

| Function | Line | What it adds | Example |
|----------|------|--------------|---------|
| `processReleasedProjects` | 712, 743 | Ongoing streaming revenue | `summary.revenue += ongoingRevenue` |
| `processLeadSingles` | 816 | Lead single revenue | `summary.revenue += initialRevenue` |
| `processPlannedReleases` | 963, 978 | Release revenue & marketing costs | `summary.expenses += marketingBudget` |
| `advanceProjectStages` | 2856 | Project costs when moving to production | `summary.expenses += project.totalCost` |
| `processMarketing` | 2243 | Marketing campaign costs | `summary.expenses += campaignCost` |
| `processProjectCompletion` | 2654 | Project completion revenue | `summary.revenue += revenue` |

### Phase 2: Financial Calculation (Line 181)
```javascript
async calculateMonthlyFinancials(): Promise<MonthlyFinancials> {
    const starting = this.gameState.money || startingMoney;
    
    // PROBLEM: These are hardcoded to zero!
    let projects = { costs: 0, revenue: 0 };
    let marketing = { costs: 0 };
    let streamingRevenue = 0;
    
    // Only operations costs are actually calculated
    const operations = { 
      base: monthlyBurnData.baseBurn, 
      artists: monthlyBurnData.artistCosts, 
      total: monthlyBurnData.total 
    };
    
    // Calculate with incomplete data
    const totalRevenue = 0; // Missing all actual revenue!
    const totalExpenses = operations.total; // Missing project and marketing costs!
    
    return {
      endingBalance: starting + (totalRevenue - totalExpenses)
    };
}
```

### Phase 3: The Overwrite (Lines 186-187)
```javascript
// This OVERWRITES all the carefully calculated values from Phase 1!
summary.expenses = financials.operations.total + 0 + 0 + 0;
summary.revenue = 0 + 0 + 0;
```

## Specific Issues Found

### Issue 1: Project Costs Not Reflected
When a project moves from planning to production (line 2856):
- ✅ Added to `summary.expenses`
- ✅ Added to `summary.expenseBreakdown.projectCosts`
- ❌ NOT included in `financials.projects.costs` (hardcoded to 0)
- ❌ NOT reflected in money calculation
- ❌ NOT shown in financial breakdown string

### Issue 2: Marketing Budgets Lost
When planned releases execute marketing (line 978):
- ✅ Added to `summary.expenses`
- ✅ Added to `summary.expenseBreakdown.marketingCosts`
- ❌ NOT included in `financials.marketing.costs` (hardcoded to 0)
- ❌ NOT reflected in money calculation
- ❌ NOT shown in financial breakdown string

### Issue 3: Streaming Revenue Ignored
When processing ongoing streams (lines 712, 743):
- ✅ Added to `summary.revenue`
- ❌ NOT included in `financials.streamingRevenue` (hardcoded to 0)
- ❌ NOT reflected in money calculation
- ❌ NOT shown in financial breakdown string

## Impact on Gameplay

This bug causes:

1. **Invisible Expenses**: Players' money decreases by amounts not shown in the breakdown
2. **Missing Revenue**: Streaming and other revenue might not affect the actual balance
3. **Confusing Reports**: The month summary shows different numbers than what actually happened
4. **Trust Issues**: Players can't reconcile their balance changes with the reported breakdown

## Example Scenario

Starting balance: $456,438

**What Actually Happens:**
- Monthly operations: -$3,344
- Artist salaries: -$800  
- Project cost (hidden): -$3,000
- Marketing budget (hidden): -$0
- **Actual deduction: $7,144**
- **Ending balance: $449,294**

**What's Shown in Breakdown:**
```
$456,438 - $3,344 (operations) - $800 (artists) = $452,294
```

**Player Confusion:** "Why is my balance $449,294 when it says it should be $452,294?"

## The Fix

The solution requires synchronizing the two calculation systems. Options:

### Option 1: Pass Summary to Financial Calculation
```javascript
async calculateMonthlyFinancials(summary: MonthSummary): Promise<MonthlyFinancials> {
    // Use actual values from summary
    let projects = { 
      costs: summary.expenseBreakdown?.projectCosts || 0,
      revenue: /* extract from summary */ 
    };
    let marketing = { 
      costs: summary.expenseBreakdown?.marketingCosts || 0 
    };
    // ... rest of calculation
}
```

### Option 2: Don't Overwrite Summary
```javascript
// Remove these lines:
// summary.expenses = financials.operations.total + ...
// summary.revenue = financials.projects.revenue + ...

// Instead, ADD to existing values:
summary.expenses += financials.operations.total;
```

### Option 3: Track Everything in Financial Calc
Move all financial modifications to happen INSIDE `calculateMonthlyFinancials()` rather than scattered throughout the codebase.

## Testing Checklist

After fixing, verify:
- [ ] Project costs appear in financial breakdown
- [ ] Marketing budgets appear in financial breakdown  
- [ ] Streaming revenue appears in financial breakdown
- [ ] Month summary expenses match actual money deducted
- [ ] Month summary revenue matches actual money added
- [ ] Financial breakdown string shows all components
- [ ] Player's ending balance matches the calculation shown