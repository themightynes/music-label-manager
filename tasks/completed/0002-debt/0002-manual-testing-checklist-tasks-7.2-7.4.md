# Manual Testing Checklist - Tasks 7.2, 7.3, 7.4

**PRD-0002 Mood System Reimplementation**
**Status**: Ready for manual testing
**Automated Tests**: ✅ All 386 tests passing

---

## 🧪 Task 7.2: Manual Testing Full Playthrough

### Prerequisites
- [x] Start fresh game or load save with 0 artists signed
- [x] Have sufficient funds ($50k+) to sign multiple artists

### Test Scenario 1: Sign 3+ Artists with Different Popularity ✅

**Steps**:
1. [x] Sign 3 artists (recommend: Nova Sterling, Diego Rivers, Luna Park)
2. [x] Note their popularity levels:
   - Nova: ~85 popularity (highest)
   - Diego: ~60 popularity (medium)
   - Luna: ~50 popularity (lowest)
3. [x] Advance to first week with executive meetings available

**Expected**: Artists successfully signed with different popularity levels

---

### Test Scenario 2: Global Meeting (All Artists) ✅

**Meeting**: CEO Strategic Priorities or similar global meeting

**Steps**:
1. [x] Navigate to Executive Meetings
2. [x] Select a meeting with `target_scope: "global"`
3. [x] Choose an option with `artist_mood` effect
4. [x] Complete the week
5. [x] Open Week Summary

**Verify**:
- [x] Week summary shows: "🌍 [Meeting Name] (All Artists) - Artist Mood +X"
- [x] Circular blue badge displayed next to icon
- [x] Check each artist's mood in roster - all should have changed by same amount
- [x] Mood values clamped to 0-100 range (no values outside bounds)

**Example**: If choice gave +2 mood and artists started at 70, 65, 60 → should be 72, 67, 62

---

### Test Scenario 3: Predetermined Meeting (Highest Popularity) ✅

**Meeting**: CEO Crisis Management (if available in actions.json)

**Steps**:
1. [x] Select a meeting with `target_scope: "predetermined"`
2. [x] Choose an option with `artist_mood` effect
3. [x] Complete the week
4. [x] Open Week Summary

**Verify**:
- [x] Week summary shows: "⭐ [Meeting Name] (Most Popular) - Nova's Mood +X"
- [x] Circular yellow badge displayed next to icon
- [x] **Only Nova's mood changed** (highest popularity)
- [x] Diego and Luna's moods unchanged
- [x] Console logs show: `[ARTIST SELECTION] Predetermined selection: Nova Sterling (highest popularity: 85)`

**Tie-Breaking Test** (if possible):
- [ ] Modify artists in database to have same popularity (e.g., all 75)
- [ ] Trigger predetermined meeting
- [ ] Verify console shows: `Predetermined selection: 3 artists tied at popularity 75, selected [Artist Name] randomly`

---

### Test Scenario 4: User-Selected Meeting ✅

**Meeting**: A&R Single Strategy or CCO Creative Clash

**Steps**:
1. [x] Select a meeting with `target_scope: "user_selected"`
2. [x] Verify artist selector UI appears showing `prompt_before_selection` text
3. [x] Verify all 3 signed artists displayed with:
   - [x] Artist name
   - [x] Archetype
   - [x] Current mood value
   - [x] Current energy value
4. [x] Select Diego Rivers (medium popularity artist)
5. [x] Verify prompt updates with `{artistName}` replaced by "Diego Rivers"
6. [x] Choose an option with `artist_mood` effect
7. [x] Complete the week
8. [x] Open Week Summary

**Verify**:
- [x] Week summary shows: "👤 [Meeting Name] (Your Choice) - Diego's Mood +X"
- [x] Circular purple badge displayed next to icon
- [x] **Only Diego's mood changed**
- [x] Nova and Luna's moods unchanged

---

### Test Scenario 5: Dialogue Meeting (Implicit) ❌ NOT APPLICABLE

**Status**: Artist dialogue applies immediate effects and does not appear in week summary by design.

**Meeting**: Artist dialogue conversation

**Steps**:
1. [ ] ~~Open artist dialogue with Luna Park~~
2. [ ] ~~Make a choice with mood effect~~
3. [ ] ~~Complete the week~~
4. [ ] ~~Open Week Summary~~

**Verify**:
- [ ] ~~Week summary shows: "💬 Artist Conversation: Luna - Mood +X"~~
- [ ] ~~Circular green badge displayed next to icon~~
- [x] **Artist dialogue effects apply immediately (not tracked in week summary)**
- [x] Mood changes happen in real-time during conversation

---

### Test Scenario 6: All Three Scopes + Routine in Same Week ✅

**Steps**:
1. [x] Complete one meeting of each type in the same week:
   - [x] Global meeting
   - [x] Predetermined meeting
   - [x] User-selected meeting (pick different artist than predetermined)
   - ~~Artist dialogue~~ (excluded - immediate effects only)
2. [x] Complete the week
3. [x] Open Week Summary

**Verify**:
- [x] All three meeting mood changes + routine changes appear with distinct icons (🌍 ⭐ 👤 🔄)
- [x] All color-coded badges visible
- [x] Mood changes correctly applied:
   - [x] All artists affected by global
   - [x] Highest popularity affected by predetermined
   - [x] User-selected artist affected by that choice
   - [x] Routine mood decay/improvement with 🔄 icon
- [x] Total mood changes accumulated correctly for each artist

---

## ⚡ Task 7.3: Performance Testing with Large Rosters

### Prerequisites
- [ ] Database access to manually add artists OR wait until 10+ artists available

### Test Scenario 1: 10+ Signed Artists

**Steps**:
1. [ ] Sign or manually add 10-15 artists to roster
2. [ ] Trigger global meeting with `artist_mood` effect
3. [ ] Monitor browser console for performance
4. [ ] Complete the week
5. [ ] Open Week Summary

**Verify**:
- [ ] No significant lag during processing (< 2 seconds)
- [ ] Week summary renders efficiently
- [ ] All 10+ mood changes logged to database
- [ ] Console shows mood event logs for each artist
- [ ] No browser console errors

**Performance Metrics**:
- [ ] Week processing time: _______ ms (should be < 2000ms)
- [ ] Summary rendering time: _______ ms (should be < 500ms)

---

## 🐛 Task 7.4: Edge Case Validation Testing

### Edge Case 1: Zero Artists Signed

**Steps**:
1. [ ] Start new game, do NOT sign any artists
2. [ ] Navigate to Executive Meetings

**Verify**:
- [ ] User-selected meetings **not displayed** (hidden when 0 artists)
- [ ] Global meetings still visible but have no effect
- [ ] Predetermined meetings still visible but have no effect
- [ ] No errors in console

---

### Edge Case 2: Single Artist Signed

**Steps**:
1. [ ] Sign exactly 1 artist (e.g., Nova)
2. [ ] Trigger predetermined meeting

**Verify**:
- [ ] Console shows: `[ARTIST SELECTION] Auto-selected only artist: Nova Sterling`
- [ ] Nova's mood changes
- [ ] No errors

**Steps**:
3. [ ] Trigger user-selected meeting

**Verify**:
- [ ] Artist selector UI still shows (per FR-13)
- [ ] Only Nova displayed in selector
- [ ] Selection works normally

---

### Edge Case 3: Mood Boundary Clamping

**Setup**: Modify an artist's mood to extreme values

**Test High Boundary**:
1. [ ] Set artist mood to 98 (via database or dialogue)
2. [ ] Trigger meeting with +10 mood effect
3. [ ] Verify mood clamps at 100 (not 108)
4. [ ] Week summary shows correct change: +2 (98 → 100)

**Test Low Boundary**:
1. [ ] Set artist mood to 3 (via database)
2. [ ] Trigger meeting with -10 mood effect
3. [ ] Verify mood clamps at 0 (not -7)
4. [ ] Week summary shows correct change: -3 (3 → 0)

---

### Edge Case 4: Tied Popularity (Random Selection)

**Setup**: Set multiple artists to same popularity level

**Steps**:
1. [ ] Modify 2-3 artists to have identical popularity (e.g., all 75)
2. [ ] Trigger predetermined meeting
3. [ ] Check console logs

**Verify**:
- [ ] Log shows: `Predetermined selection: X artists tied at popularity 75, selected [Name] randomly`
- [ ] One artist selected (not all)
- [ ] Only that artist's mood changed

**Repeat 3-5 times**:
- [ ] Verify random selection (different artists selected across runs)

---

### Edge Case 5: Missing/Invalid target_scope

**Setup**: If you can edit actions.json temporarily

**Test Missing target_scope**:
1. [ ] Remove `target_scope` field from a meeting
2. [ ] Trigger that meeting
3. [ ] Verify defaults to global behavior (all artists affected)

**Test Invalid target_scope**:
1. [ ] Set `target_scope: "invalid_value"`
2. [ ] Trigger that meeting
3. [ ] Check console for validation warnings
4. [ ] Verify graceful fallback (no crashes)

---

### Edge Case 6: Artist Not Found (Dropped Artist)

**Setup**: Test delayed effects for dropped artists

**Steps**:
1. [ ] Trigger meeting with delayed `artist_mood` effect targeting specific artist
2. [ ] Before delayed effect triggers, drop/release that artist
3. [ ] Advance to week when delayed effect should trigger

**Verify**:
- [ ] Console logs: `Delayed effect cancelled: artist [ID] no longer on roster`
- [ ] No error thrown
- [ ] Other delayed effects still process normally

---

## 📊 Test Results Summary

**Date**: ___________
**Tester**: ___________

### Task 7.2 Results
- [ ] ✅ All scenarios passed
- [ ] ⚠️ Issues found (document below)

### Task 7.3 Results
- [ ] ✅ Performance acceptable with 10+ artists
- [ ] ⚠️ Performance issues (document below)

### Task 7.4 Results
- [ ] ✅ All edge cases handled correctly
- [ ] ⚠️ Edge case failures (document below)

### Issues Found

| Issue # | Severity | Description | Test Scenario | Expected | Actual |
|---------|----------|-------------|---------------|----------|--------|
| 1       |          |             |               |          |        |
| 2       |          |             |               |          |        |
| 3       |          |             |               |          |        |

### Notes

---

## ✅ Sign-Off

Once all tests pass:
- [ ] All 7.2 scenarios verified
- [ ] Performance acceptable (7.3)
- [ ] All edge cases handled (7.4)
- [ ] No critical bugs found
- [ ] Ready for Task 7.6 (Final QA)

**Tester Signature**: _______________
**Date**: _______________
