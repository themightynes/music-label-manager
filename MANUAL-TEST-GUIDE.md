# Save System - Manual Test Guide

**Branch**: `codex/implement-review-comments-from-thorough-review`

## Quick Start

```bash
# 1. Start the development server
npm run dev

# 2. Open browser to http://localhost:5000
# 3. Sign in with your account
# 4. Open browser DevTools (F12)
```

---

## What Changed?

This branch implements a hardened save system with:

✅ **Summary queries** - Fast save list loading (metadata only)
✅ **Lazy loading** - Full snapshots load on-demand when needed
✅ **Autosaves** - Created automatically when advancing weeks
✅ **Autosave cleanup** - Only keeps newest autosave per game
✅ **Fork/overwrite modes** - Load saves without losing current game
✅ **JSON import** - Import previously exported saves
✅ **Schema validation** - Week invariant prevents data corruption
✅ **Database transactions** - Atomic restore operations
✅ **Ownership enforcement** - Users can only delete their own saves

---

## 🆕 Bug Fix Verification Tests (October 13, 2025)

### Bug Fix #1: Email System Not Reverting with Saves
**Issue**: Emails persisted across save loads, showing future week emails in past saves

**Test Steps**:
1. Start a new game or continue existing
2. Advance to Week 3 (should generate financial summary emails)
3. Create a save called "Week 3 Save"
4. Advance to Week 7 (more emails generated)
5. Open Save/Load modal and load "Week 3 Save"
6. Check your inbox/email system
7. **Expected**: ✅ Only Week 1-3 emails visible, Week 7 emails gone
8. **Expected**: ✅ Financial summary from Week 7 should NOT appear

**Pass/Fail**: ____

---

### Bug Fix #2: Invalid Save Format when Imported
**Issue**: Exported saves couldn't be re-imported due to format mismatch

**Test Steps**:
1. Create a save with some game progress (artists, projects, emails)
2. Click "Export JSON" button
3. **Expected**: ✅ JSON file downloads successfully
4. Advance a few weeks
5. Click "Import JSON" and select the exported file
6. **Expected**: ✅ Import succeeds with "Save imported successfully!" alert
7. **Expected**: ✅ Game state loads correctly (not "Invalid save format" error)
8. **Expected**: ✅ All data restored (artists, projects, emails, week number)

**Pass/Fail**: ____

---

### Bug Fix #3: Export/Import Round-Trip Test
**Combined test for both fixes**:
1. Create a game save at Week 5 with:
   - At least 2 artists
   - At least 3 emails in inbox
   - At least 1 project
2. Export the save as JSON
3. Open exported JSON in text editor
4. **Expected**: ✅ File contains nested `gameState` with `emails` array
5. Import the JSON file back
6. **Expected**: ✅ Validates successfully
7. **Expected**: ✅ Email count matches original (check inbox)
8. **Expected**: ✅ Artists and projects restored correctly

**Pass/Fail**: ____

---

### Bug Fix #4: Release/Executive/Mood Data Restoration
**Issue**: Release track lists, executive mood/loyalty, and mood events were missing after restore.

**Test Steps**:
1. Queue a release with at least one song (set lead single) and advance until release data is stored.
2. Adjust an executive’s mood via weekly action or dialogue so values differ from default.
3. Trigger a mood event (e.g., release success) and confirm it appears in the artist’s history.
4. Create a manual save, then advance a week and change the data (remove release track order, alter executive mood via admin tools, clear mood history).
5. Load the manual save you created in step 4.
6. **Expected**: ✅ Release plan shows restored track order and lead single.
7. **Expected**: ✅ Executive mood and loyalty match pre-save values.
8. **Expected**: ✅ Mood history list includes the previously logged event.

**Pass/Fail**: ____

---

## 10-Minute Quick Test

### Test 1: Basic Save & Load
1. Open the Save/Load modal (find the button in game UI)
2. Create a save called "Test Save 1"
3. **Expected**: ✅ Success alert, save appears in "Manual Saves" section
4. Advance one week in the game
5. Create another save "Test Save 2"
6. Load "Test Save 1"
7. **Expected**: ✅ Game reverts to earlier week, modal closes

**Pass/Fail**: ____

---

### Test 2: Autosave Functionality
1. Advance 3 weeks, checking the Save Modal after each advance
2. **Expected**: ✅ One autosave exists (named "Autosave - Week X")
3. **Expected**: ✅ Only the most recent week's autosave remains
4. **Expected**: ✅ Autosaves have lighter border than manual saves

**Pass/Fail**: ____

---

### Test 3: Export & Import
1. Click "Export JSON" button
2. **Expected**: ✅ JSON file downloads
3. Advance 2-3 more weeks
4. Click "Import JSON", select the exported file
5. **Expected**: ✅ Game reverts to exported state
6. **Expected**: ✅ New save created from import
7. Check browser DevTools → Application → Local Storage → `gameId`
8. **Expected**: ✅ Game ID changed (fork mode - new game created)

**Pass/Fail**: ____

---

### Test 4: Delete Saves
1. Delete one of your test saves
2. **Expected**: ✅ Confirmation dialog appears
3. Confirm deletion
4. **Expected**: ✅ Save disappears, success alert shows

**Pass/Fail**: ____

---

### Test 5: Performance Check
1. Close and reopen Save Modal
2. **Expected**: ✅ Opens in < 1 second
3. **Expected**: ✅ Saves show week numbers immediately
4. **Expected**: ✅ Money/reputation show "—" until loaded
5. Load any save and observe speed
6. **Expected**: ✅ Loads in 1-3 seconds

**Pass/Fail**: ____

---

## Detailed Test Suite (30 Tests)

### Test Suite 1: Save Creation & Validation

**Test 1.1: Create save with valid name**
- Input: "My Save"
- Expected: Save created, appears in list

**Test 1.2: Empty name validation**
- Input: "" or "   "
- Expected: "Save Game" button disabled

**Test 1.3: Multiple saves**
- Create 3 saves at different weeks
- Expected: All appear, sorted by newest first
- Expected: Empty slot count updates

**Test 1.4: Week invariant**
- Check console during save creation
- Expected: No validation errors about week mismatch

---

### Test Suite 2: Lazy Loading Behavior

**Test 2.1: Initial load shows summaries**
- Close/reopen modal
- Expected: Saves appear instantly with week numbers
- Expected: Money/rep show "—" (not loaded yet)

**Test 2.2: Details load on demand**
- Click "Load" on a save
- After load completes, reopen modal
- Expected: That save now shows actual money/rep values
- Expected: Other saves still show "—"

**Test 2.3: Details persist in session**
- Load a save
- Close/reopen modal multiple times
- Expected: Loaded save's details remain visible

---

### Test Suite 3: Autosave System

**Test 3.1: Autosave creation**
- Advance one week
- Check autosaves section
- Expected: New autosave appears

**Test 3.2: Autosave naming**
- Expected: Named "Autosave - Week X" where X is current week

**Test 3.3: Only one autosave**
- Advance 5 weeks
- Expected: Only 1 autosave exists (the latest)
- Expected: Older autosaves deleted automatically

**Test 3.4: Visual distinction**
- Compare manual saves vs autosaves
- Expected: Autosaves have lighter border (brand-purple/60)
- Expected: Separate section headers

**Test 3.5: Autosave loading**
- Load an autosave
- Expected: Works identically to manual save

---

### Test Suite 4: Load Operations

**Test 4.1: Overwrite mode (default)**
- Note current game ID
- Load a save
- Check game ID again
- Expected: Game ID unchanged (overwrite mode)
- Expected: Game state matches saved state

**Test 4.2: Fork mode (via import)**
- Export a save
- Import it
- Check game ID
- Expected: Game ID changed (new game created)

**Test 4.3: Data integrity**
- Before saving, note: money, reputation, week, artists
- Load the save
- Expected: All values match exactly

**Test 4.4: Related data**
- Create songs, projects before saving
- Load the save
- Expected: Songs and projects restored correctly

---

### Test Suite 5: Export & Import

**Test 5.1: Export format**
- Export a save
- Open JSON file in text editor
- Expected: Contains `gameState`, `timestamp`, `version`
- Expected: Valid JSON format

**Test 5.2: Export filename**
- Expected: `music-label-manager-save-[timestamp].json`

**Test 5.3: Import valid save**
- Import a previously exported save
- Expected: Success alert
- Expected: Game loads imported state
- Expected: New save created in list

**Test 5.4: Import invalid JSON**
- Create text file with invalid JSON
- Try to import
- Expected: Error alert "Invalid save file format"
- Expected: No game state changes

**Test 5.5: Import missing gameState**
- Create JSON file without `gameState` field
- Try to import
- Expected: Error about missing gameState

---

### Test Suite 6: Delete Operations

**Test 6.1: Delete confirmation**
- Click delete on a save
- Expected: Confirmation dialog with save name

**Test 6.2: Delete cancellation**
- Click delete, then cancel
- Expected: Save remains in list

**Test 6.3: Delete success**
- Delete a save and confirm
- Expected: Save removed from list
- Expected: Success alert
- Expected: Doesn't reappear on modal reopen

**Test 6.4: Delete autosave**
- Delete the autosave
- Advance one week
- Expected: New autosave created

**Test 6.5: Delete last save**
- Delete all saves
- Expected: Only empty slots remain
- Expected: No errors

---

### Test Suite 7: UI/UX

**Test 7.1: Loading states**
- Observe buttons during operations
- Save: Shows "Saving..."
- Load: Shows "Loading..."
- Delete: Shows "Deleting..."
- Expected: Buttons disabled during operations

**Test 7.2: Empty slots display**
- With < 3 manual saves
- Expected: Dashed border empty slots shown
- Expected: Count = 3 - number of manual saves

**Test 7.3: Section organization**
- Expected: "Manual Saves" section appears first
- Expected: "Autosaves" section appears second
- Expected: Empty slots shown with manual saves

**Test 7.4: Date formatting**
- Check save timestamps
- Expected: Format like "Mon 12, 3:45 PM"

---

### Test Suite 8: Error Handling

**Test 8.1: Network failure**
- Block network in DevTools
- Try to create save
- Expected: Error alert with message

**Test 8.2: Invalid data handling**
- Check console for any errors
- Expected: No unhandled errors or stack traces

**Test 8.3: Concurrent operations**
- Try clicking "Load" on two saves rapidly
- Expected: Second click ignored until first completes

---

### Test Suite 9: Performance

**Test 9.1: Modal open speed**
- Time modal opening
- Expected: < 1 second

**Test 9.2: Save creation speed**
- Time from click to success
- Expected: < 2 seconds

**Test 9.3: Save loading speed**
- Time from click to game state restored
- Expected: < 3 seconds

**Test 9.4: Many saves performance**
- Create 10+ saves
- Test modal opening and scrolling
- Expected: No lag or freezing

---

### Test Suite 10: Edge Cases

**Test 10.1: Save at Week 1**
- Start new game
- Immediately create save
- Expected: Works correctly

**Test 10.2: Save after campaign complete**
- If campaign complete flag exists
- Expected: Flag preserved in save/load

**Test 10.3: Cross-tab behavior**
- Open game in two tabs
- Create save in tab 1
- Check tab 2
- Expected: Both tabs can access saves

**Test 10.4: Page refresh**
- Create save
- Refresh page
- Check save list
- Expected: Save persists

**Test 10.5: Browser back button**
- Open modal, close modal
- Use browser back button
- Expected: No unexpected navigation

---

## What to Watch For

### ✅ Good Behavior
- Modal opens instantly
- No console errors (red text)
- Operations complete in < 3 seconds
- Data integrity maintained
- UI responsive and smooth

### ❌ Issues to Report

**Console Errors**:
- Any red errors in browser console
- Network request failures
- Validation errors

**Data Issues**:
- Money/reputation incorrect after load
- Artists/songs missing
- Week number wrong
- Corrupted game state

**Performance Issues**:
- Modal slow to open (> 3 sec)
- Saves slow to create (> 5 sec)
- UI freezing or unresponsive
- Browser tab crashes

**Functional Issues**:
- Buttons don't respond
- Modal won't close
- Multiple autosaves appear
- Saves don't persist
- Load doesn't restore state

---

## Bug Report Template

When you find an issue, document it like this:

```
Issue: [Brief description]

Steps to Reproduce:
1. [First step]
2. [Second step]
3. [What you did]

Expected Result:
[What should have happened]

Actual Result:
[What actually happened]

Console Errors:
[Copy any red errors from console]

Screenshot:
[If applicable]

Additional Notes:
[Any other relevant info]
```

---

## Test Results Summary

**Date**: ____________
**Tester**: ____________
**Branch**: codex/implement-review-comments-from-thorough-review

**Quick Tests (5 tests)**:
- Passed: ____ / 5
- Failed: ____ / 5

**Detailed Tests (30 tests)**:
- Passed: ____ / 30
- Failed: ____ / 30
- Skipped: ____ / 30

**Critical Issues Found**: ____

**Overall Assessment**:
- [ ] Ready for merge
- [ ] Needs minor fixes
- [ ] Needs major fixes
- [ ] Not tested fully

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

---

## Technical Context (For Debugging)

### Key Files Modified
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database operations
- `client/src/components/SaveGameModal.tsx` - UI
- `client/src/store/gameStore.ts` - State management
- `shared/schema.ts` - Validation schemas

### API Endpoints
- `GET /api/saves` - List save summaries
- `GET /api/saves/:saveId` - Get full save snapshot
- `POST /api/saves` - Create new save
- `DELETE /api/saves/:saveId` - Delete save

### Browser Storage
- `localStorage.gameId` - Current game ID
- `sessionStorage` - Not used for saves

### Database Tables
- `game_saves` - Stores save data
- `game_states` - Current game states

---

## Commands Reference

```bash
# Start dev server
npm run dev

# Type check
npm run check

# View git branch
git branch

# View commits
git log --oneline -10

# Check server logs
# Look in terminal where npm run dev is running

# Kill server if stuck (Windows)
taskkill /F /IM node.exe
```

---

## Need Help?

1. **Check browser console** for error messages
2. **Check server terminal** for backend errors
3. **Restart dev server** (Ctrl+C then npm run dev)
4. **Clear browser cache** and reload
5. **Document the issue** using bug report template

---

**Time Estimate**:
- Quick tests: 10-15 minutes
- Detailed tests: 60-90 minutes
- Full test + documentation: 2 hours

**Priority**: Focus on Quick Tests first, then critical functionality (Suite 1, 3, 4, 5)

Good luck with testing! 🧪
