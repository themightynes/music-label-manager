# Manual Verification Scripts

This directory contains **manual verification scripts** used during development to validate game mechanics, formulas, and calculations. These are **not automated tests** - they are exploratory tools that output results to the console or files for manual review.

## Purpose

These scripts were created to:
- Verify complex financial calculations (budget efficiency, economies of scale)
- Validate song quality formulas and variance systems
- Demonstrate expected behavior of game mechanics
- Debug and calibrate game balance values
- Generate test data and analyze scenarios

## Key Differences from Automated Tests

| Verification Scripts | Automated Tests (Vitest) |
|---------------------|-------------------------|
| Manual review of console output | Automated pass/fail assertions |
| Exploratory/investigative | Regression prevention |
| Run individually via `tsx` or `node` | Run via `npm test` |
| Output results for analysis | Self-validating |
| Development/debugging tool | Quality assurance tool |

## Files in this Directory

### Budget & Financial Verification
- **test-budget-calc.ts** - Step-by-step budget factor calculation breakdown
- **test-budget-segments.ts** - Budget piecewise function segment validation
- **test-budget-simple.ts** - Simple budget calculation verification
- **test-calibration-fix.ts** - Budget calibration validation
- **test-frontend-backend-consistency.ts** - Budget consistency checks
- **test-no-double-count.ts** - Budget double-counting prevention
- **test-various-scenarios.ts** - Mixed financial scenario testing
- **test-executive-salaries.js** - Executive salary calculation verification

### Song Quality Verification
- **test-song-quality.js** - Comprehensive song quality simulation (outputs to JSON)
- **test-song-quality-scenarios.ts** - Quality calculation scenario testing
- **test-song-randomization.ts** - RNG determinism verification
- **test-skill-variance.ts** - Skill-based quality variance demonstration

### Artist System Verification
- **test-artist-slugs.js** - Artist slug generation verification
- **test-artist-scouting-integration.ts** - A&R artist scouting workflow verification

### Tour & Venue Verification
- **test-tour-creation.js** - Tour project creation via API verification
- **test-tour-api.js** - Tour API endpoint testing
- **test-tour-api.sh** - Tour API shell script testing
- **test-venue-capacity-api.js** - Venue capacity API validation
- **test-capacity-validation.js** - Capacity validation logic verification

### Legacy Files
- **test-song-quality.mjs** - ES module version of song quality testing

## How to Run

These scripts are designed to be run individually for manual inspection:

```bash
# TypeScript scripts
npx tsx scripts/verification/test-budget-calc.ts

# JavaScript scripts
node scripts/verification/test-song-quality.js
```

## Migration to Automated Tests

If you want to convert these into proper automated tests:

1. Rewrite console.log statements as `expect()` assertions
2. Wrap in `describe()` and `it()` blocks
3. Move to `/tests/` directory with `.test.ts` suffix
4. Run via `npm test`

**Example conversion:**

```typescript
// OLD: Verification script
console.log('Expected: 1.05, Got:', result);
if (result > 1.3) {
  console.log('⚠️ WARNING: Too high!');
}

// NEW: Automated test
it('should calculate budget multiplier within expected range', () => {
  expect(result).toBeCloseTo(1.05, 2);
  expect(result).toBeLessThanOrEqual(1.3);
});
```

## Actual Automated Tests

See `/tests/` directory for real automated tests that run via Vitest:
- `/tests/features/artist-mood-constraints.test.ts`
- `/tests/features/ar-office-machine.test.ts`
- `/tests/features/test-executive-meeting-machine.test.ts`

Run automated tests with: `npm test`
