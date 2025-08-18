# Streaming Revenue Decay - User Testing Plan

## Status: Ready for Testing
**Implementation Date**: August 18, 2025
**Features**: Streaming revenue decay system with 15% monthly decline over 24 months

---

## Overview

The streaming revenue decay system simulates realistic music industry revenue patterns where released singles and EPs generate declining monthly revenue over time. This testing plan will guide you through verifying all aspects of this feature work correctly.

## Prerequisites

1. **Fresh Game Setup**
   - Start a new campaign or load a save before Month 1
   - Ensure you have starting funds ($75,000)
   - Have at least 1 artist signed or be ready to sign one

2. **Server Running**
   - Development server should be running (`npm run dev`)
   - Watch browser console and server logs for debugging output

---

## Test Scenario 1: Single Release Revenue Decay

### Setup Phase (Months 1-4)

1. **Month 1: Sign Artist & Start Project**
   - Sign an artist (any tier is fine)
   - Start recording a **Single** project
   - Note your starting money amount
   - Advance to Month 2

2. **Month 2: Project in Production**
   - Your single should now be in "production" stage
   - Advance to Month 3

3. **Month 3: Project in Marketing**  
   - Single should be in "marketing" stage
   - Advance to Month 4

4. **Month 4: Release Month**
   - Single should advance to "released" stage
   - **VERIFY**: You receive initial revenue (should be $3,000-$15,000+)
   - //Released returned about $226 in revenue
   - **VERIFY**: Month summary shows project completion with revenue amount
   - **RECORD**: Initial revenue amount for comparison
   - Advance to Month 5

### Decay Testing Phase (Months 5-10)

5. **Month 5: First Decay Month**
   - **VERIFY**: Month summary shows "Ongoing streams: [Single Name]"
   - // Don't see ongoing streams in the MONTH 5 RESULTS
   - **VERIFY**: Revenue is smaller than Month 4 (approximately 8.5% of initial)
   - //Week two of sales were smaller
   - **RECORD**: Month 5 ongoing revenue amount
   - Advance to Month 6

6. **Month 6: Second Decay Month**
   - **VERIFY**: Ongoing revenue appears again
   - **VERIFY**: Revenue is smaller than Month 5 (approximately 85% of Month 5)
   - // MONTH 6 revenue was $14
   - **RECORD**: Month 6 ongoing revenue amount
   - Advance to Month 7

7. **Months 7-10: Continued Decay**
   - Continue advancing months
   - **VERIFY**: Each month shows decreasing ongoing revenue
   - **VERIFY**: Revenue follows approximately 15% monthly decline pattern
   - **VERIFY**: No errors in console or server logs

### Expected Results

- **Month 4**: Initial release revenue (e.g., $8,000)
- **Month 5**: ~$680 ongoing revenue (8.5% of initial × 10%)
- **Month 6**: ~$578 ongoing revenue (85% of Month 5)  
- **Month 7**: ~$491 ongoing revenue (85% of Month 6)
- **Pattern**: Each month ~85% of previous month's ongoing revenue

---

## Test Scenario 2: Multiple Releases Portfolio

### Setup Phase (Months 1-8)

1. **Months 1-4**: Create and release first single (as in Scenario 1)
2. **Month 5**: Start second single recording
3. **Month 8**: Second single should be released

### Portfolio Testing (Months 9-12)

4. **Month 9: Dual Revenue Streams**
   - **VERIFY**: You see ongoing revenue from BOTH singles
   - **VERIFY**: First single (Month 9 = 5 months after release) shows lower revenue
   - **VERIFY**: Second single (Month 9 = 1 month after release) shows higher revenue
   - **VERIFY**: Total ongoing revenue = sum of both singles

5. **Months 10-12: Portfolio Management**
   - **VERIFY**: Both singles continue generating declining revenue
   - **VERIFY**: Older single revenue continues decreasing faster
   - **VERIFY**: No revenue calculation errors or crashes

### Expected Results

- **Month 9**: First single ongoing revenue + Second single ongoing revenue
- Revenue pattern shows newer releases generating more ongoing revenue
- Portfolio effect: multiple revenue streams from different release dates

---

## Test Scenario 3: EP Release (Higher Revenue)

### Setup & Testing

1. **Start EP Project**: Create an EP instead of single (higher budget ~$25,000)
2. **Follow Release Cycle**: Planning → Production → Marketing → Released (4 months)
3. **Verify Higher Baseline**: EP should generate significantly more initial revenue than singles
4. **Test Decay Pattern**: Same 15% monthly decline, but from higher baseline

### Expected Results

- **Initial Revenue**: $15,000-$40,000+ (much higher than singles)
- **Ongoing Revenue**: Higher absolute amounts but same 15% decay rate
- **Duration**: Same 24-month limit as singles

---

## Test Scenario 4: Long-term Decay Verification

### Setup (Months 1-6)

1. Release a single in Month 4 (following Scenario 1 setup)

### Extended Testing (Months 7-24+)

2. **Continue Monthly Advancement**
   - Advance through Months 7-15 (if campaign allows)
   - **VERIFY**: Ongoing revenue continues decreasing
   - **VERIFY**: Revenue becomes very small but doesn't hit zero prematurely

3. **Long-term Behavior**
   - After Month 28 (24 months post-release), revenue should stop
   - **VERIFY**: No ongoing revenue appears for 24+ month old releases

---

## Debugging & Verification Points

### Console Output to Watch For

**Server Console (npm run dev terminal):**
```
[DEBUG] Creating GameEngine instance...
[DEBUG] GameEngine created successfully
[DEBUG] Processing month advancement...
[DEBUG] Found X processed released projects
[DEBUG] Updating metadata for project [ID] with revenue $XXX
```

**Browser Console (F12 Developer Tools):**
```
Month advancement completed successfully
Summary: { revenue: XXX, changes: [...] }
```

### Error Scenarios to Test

1. **Advance Month with No Actions Selected**
   - Should show clear error message instead of empty error objects

2. **Database Connection Issues**  
   - Errors should now show descriptive messages instead of "{}"

3. **Invalid Game State**
   - Should receive proper error messages with context

---

## Success Criteria

### ✅ Core Functionality
- [ ] Singles generate initial revenue on release (Month 4)
- [ ] Ongoing revenue appears starting Month 5
- [ ] Revenue declines approximately 15% each month
- [ ] Multiple projects generate separate ongoing revenue streams
- [ ] EPs generate higher revenue than singles
- [ ] Revenue stops after 24 months

### ✅ User Experience  
- [ ] Month summaries clearly show "Ongoing streams: [Project Name]"
- [ ] Revenue amounts are realistic and balanced
- [ ] No crashes or empty error messages
- [ ] Performance remains smooth with multiple released projects

### ✅ Technical Verification
- [ ] Server console shows detailed debugging output
- [ ] No database errors or transaction failures
- [ ] Client error handling shows descriptive messages
- [ ] Game state persists correctly across months

---

## Troubleshooting

### If Advance Month Fails
1. **Check Server Console**: Look for detailed error messages with our new debugging
2. **Check Browser Console**: Should now show descriptive error instead of "Error {}"
3. **Verify Game State**: Make sure you have selected monthly actions
4. **Database Issues**: Server logs will show specific database operation failures

### If No Ongoing Revenue Appears
1. **Verify Release Stage**: Project must reach "released" stage first
2. **Check Month Count**: Ongoing revenue starts the month AFTER release
3. **Console Debugging**: Look for "Found X processed released projects" in server logs
4. **Project Metadata**: Released projects need proper metadata (revenue, streams, releaseMonth)

### Performance Issues
1. **Multiple Projects**: System should handle 5-10+ released projects efficiently
2. **Long-term Play**: Performance should remain stable after 12+ months
3. **Database Size**: Ongoing revenue updates shouldn't cause slowdowns

---

## Expected Test Duration

- **Scenario 1**: ~15 minutes (10 months of advancement)
- **Scenario 2**: ~20 minutes (portfolio testing)  
- **Scenario 3**: ~15 minutes (EP testing)
- **Scenario 4**: Advanced/optional (longer campaigns)

**Total Comprehensive Test**: 45-60 minutes

---

## Reporting Issues

When reporting problems, please include:

1. **Specific Month**: Which month the issue occurred
2. **Console Output**: Both server and browser console messages
3. **Game State**: Current money, reputation, projects status
4. **Steps to Reproduce**: Exact sequence that caused the issue
5. **Expected vs Actual**: What you expected vs what actually happened

---

*This testing plan comprehensively verifies the streaming revenue decay system is working correctly and provides a realistic music industry revenue simulation.*