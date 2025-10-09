# Task List: PRD-0002 Mood System Reimplementation

Generated from: [0002-prd-mood-system-reimplementation.md](0002-prd-mood-system-reimplementation.md)

## High-Level Tasks

Based on the PRD analysis and current codebase state, here are the main implementation phases:

- [ ] 1.0 Back-End Prototype and Validation
- [ ] 2.0 Update Core GameEngine for Artist-Targeted Mood Effects
- [ ] 3.0 Implement Target Scope Validation and Data Loading
- [ ] 4.0 Build Artist Selection UI for User-Selected Meetings
- [ ] 5.0 Update Week Summary Display with Scope-Specific Formatting
- [ ] 6.0 Implement Mood Event Logging with Artist Targeting
- [ ] 7.0 Testing and QA

---

## Relevant Files

**Core Engine Files:**
- [shared/engine/game-engine.ts](../shared/engine/game-engine.ts) - Contains `applyEffects()`, `processRoleMeeting()`, and `processArtistDialogue()` methods that need signature and logic updates
- [shared/types/gameTypes.ts](../shared/types/gameTypes.ts) - Define `TargetScope` type, update `ChoiceEffect`, `RoleMeeting`, `QueuedAction`, `WeekSummary.artistChanges` interfaces
- [shared/engine/game-engine.test.ts](../shared/engine/game-engine.test.ts) - Unit tests for mood targeting logic

**Data Loading & Validation:**
- [server/data/gameData.ts](../server/data/gameData.ts) - Add validation for `target_scope` field on actions load, validate `{artistName}` placeholder
- [client/src/lib/gameData.ts](../client/src/lib/gameData.ts) - Client-side data loading (may need sync with server validation)
- [data/actions.json](../data/actions.json) - Already has `target_scope` field, needs `prompt_before_selection` and `{artistName}` placeholder for user-selected meetings

**UI Components:**
- [client/src/components/executive-meetings/MeetingSelector.tsx](../client/src/components/executive-meetings/MeetingSelector.tsx) - Add artist selection UI for user-selected meetings
- [client/src/components/executive-meetings/DialogueInterface.tsx](../client/src/components/executive-meetings/DialogueInterface.tsx) - Update effect display formatting for scope-specific icons
- [client/src/components/WeekSummary.tsx](../client/src/components/WeekSummary.tsx) - Update week summary display with scope-specific formatting (🌍, ⭐, 👤, 💬)
- [client/src/components/executive-meetings/__tests__/MeetingSelector.test.tsx](../client/src/components/executive-meetings/__tests__/MeetingSelector.test.tsx) - Tests for artist selection UI

**Database Integration:**
- [server/db/schema.ts](../server/db/schema.ts) - Verify `mood_events` table has `artist_id` column (NULL for global, specific ID for per-artist)
- [server/routes/game.ts](../server/routes/game.ts) - API routes for artist selection in user-selected meetings

**Test Files:**
- [shared/engine/__tests__/mood-targeting.test.ts](../shared/engine/__tests__/mood-targeting.test.ts) - New test file for comprehensive mood targeting scenarios

### Notes
- Tests use Vitest framework (`npm test` for watch mode, `npm run test:run` for CI mode)
- All file paths are relative to project root
- Artist dialogue modal already exists from PRD-0003 ([client/src/components/artist-dialogue/ArtistDialogueModal.tsx](../client/src/components/artist-dialogue/ArtistDialogueModal.tsx))

---

## Tasks

### 1.0 Back-End Prototype and Validation ✅

**Goal**: Build minimal working demo of all four targeting scenarios (dialogue, global, predetermined, user-selected) to validate approach before full implementation.

- [x] 1.1 Create prototype test file `tests/engine/mood-targeting-prototype.test.ts` with four test scenarios
- [x] 1.2 Update `applyEffects()` signature to accept optional `artistId?: string` parameter
- [x] 1.3 Implement per-artist mood targeting in `applyEffects()` when `artistId` is provided
  - Initialize `summary.artistChanges[artistId]` if missing
  - Apply mood change to `summary.artistChanges[artistId].mood`
  - Add validation: log error if artistId provided but artist not found
- [x] 1.4 Implement global mood targeting in `applyEffects()` when `artistId` is NOT provided
  - Iterate through all signed artists
  - Initialize `summary.artistChanges[artistId]` for each artist if missing
  - Apply mood change to each artist's `summary.artistChanges[artistId].mood`
- [x] 1.5 Fix `processArtistDialogue()` to pass `artistId` to `applyEffects()` call (line ~3718 and ~3739)
- [x] 1.6 Implement predetermined artist selection helper method `selectHighestPopularityArtist()`
  - Return artist with highest popularity
  - Handle edge cases: 0 artists (return null), 1 artist (return that artist), ties (random selection)
  - Add logging for tie-breaking
- [x] 1.7 Update `processRoleMeeting()` to extract `target_scope` from meeting data and call `applyEffects()` with appropriate artistId (per FR-18)
  - Global scope: call `applyEffects(effects, summary)` without artistId
  - Predetermined scope: call `selectHighestPopularityArtist()`, then `applyEffects(effects, summary, artistId)`
  - User-selected scope: extract `selectedArtistId` from action metadata, then `applyEffects(effects, summary, artistId)`
- [x] 1.8 Run prototype tests to validate all four scenarios work correctly
- [ ] 1.9 Demo review with stakeholder - get approval before proceeding to full implementation

### 2.0 Update Core GameEngine for Artist-Targeted Mood Effects ✅

**Goal**: Finalize production-ready implementation of mood targeting logic with comprehensive validation and error handling.

- [x] 2.1 Add strict validation to `applyEffects()` method
  - If `target_scope` is `"global"` but `artistId` provided → Log warning, apply globally, ignore artistId
  - If `target_scope` is `"predetermined"` or `"user_selected"` but `artistId` missing → Throw error with meeting ID, scope, and artistId in message
- [x] 2.2 Update mood effect logging to include artist targeting information
  - Log format: `[EFFECT PROCESSING] Artist mood effect: +2 (target: Nova, scope: predetermined, meeting: ceo_crisis)`
  - For global effects: `[EFFECT PROCESSING] Artist mood effect: +1 (target: all artists, scope: global, meeting: ceo_priorities)`
- [x] 2.3 Add comprehensive console logging for debugging mood changes
  - Log which artist(s) received mood changes
  - Log meeting name, scope, and choice ID
  - Log accumulated mood changes in summary
- [x] 2.4 Update `summary.changes` entries to distinguish between global and per-artist mood changes
  - Global: `"Artist morale improved from meeting decision (all artists, +2)"`
  - Per-artist: `"Nova's morale improved from meeting decision (+3)"`
- [x] 2.5 Implement delayed effects support for artist targeting (per FR-19)
  - Update delayed effect queue structure to include `artistId?: string` field
  - When queueing delayed effects, preserve artistId from immediate effect context
  - When triggering delayed effects, pass artistId to `applyEffects()` if present
  - Handle edge case: Query if artist still exists in roster before applying delayed effect. If artist not found, cancel effect and log warning: `"Delayed effect cancelled: artist {artistId} no longer on roster (effect: {effectName}, value: {value})"`

### 3.0 Implement Target Scope Validation and Data Loading ✅

**Goal**: Add validation to ensure all meeting data has valid `target_scope` values and correct prompt structure.

- [x] 3.1 Define `TargetScope` type in `shared/types/gameTypes.ts`
  ```typescript
  export type TargetScope = 'global' | 'predetermined' | 'user_selected';
  ```
- [x] 3.2 Update `RoleMeeting` interface to include `target_scope` and `prompt_before_selection` fields
  ```typescript
  interface RoleMeeting {
    id: string;
    prompt: string;
    prompt_before_selection?: string; // For user_selected meetings
    target_scope: TargetScope;
    choices: DialogueChoice[];
  }
  ```
- [x] 3.3 Update `GameEngineAction` interface to document `selectedArtistId` in metadata for user-selected meetings
  ```typescript
  metadata?: Record<string, any>; // Includes selectedArtistId for user_selected meetings
  ```
- [x] 3.4 Add validation in `server/data/gameData.ts` on actions load
  - Verify all meetings have `target_scope` field (error if missing)
  - Verify `target_scope` value is one of `'global' | 'predetermined' | 'user_selected'` (error if invalid)
  - For user-selected meetings: validate `prompt` contains `{artistName}` placeholder (warn if missing, allow execution)
  - For user-selected meetings: recommend `prompt_before_selection` field (log info message if missing, use default text)
- [x] 3.5 Add unit tests for data validation logic
  - Test valid `target_scope` values pass validation
  - Test invalid `target_scope` values throw errors
  - Test missing `target_scope` field throws error
  - Test `{artistName}` placeholder validation for user-selected meetings

### 4.0 Build Artist Selection UI for User-Selected Meetings

**Goal**: Implement UI components for player artist selection in user-selected meetings.

- [ ] 4.1 Update `data/actions.json` for the two user-selected meetings (`ar_single_choice`, `cco_creative_clash`)
  - **For `ar_single_choice`**:
    - Add `"prompt_before_selection": "Which artist are you working with on single strategy?"`
    - Update `"prompt"` to: `"Pick the lead single approach for {artistName}."`
  - **For `cco_creative_clash`**:
    - Add `"prompt_before_selection": "Which artist is having creative differences?"`
    - Update `"prompt"` to include `{artistName}` placeholder in the narrative text (e.g., `"{artistName} wants to record everything live in one take. I think we need overdubs to compete."`)
- [ ] 4.2 Create artist selection component in `client/src/components/executive-meetings/ArtistSelector.tsx`
  - Display all signed artists with name, archetype, mood, energy, active projects
  - Allow player to select one artist
  - Show clear visual indication of selected artist
  - Use inline dropdown/selector pattern (Option B from PRD)
- [ ] 4.3 Update `MeetingSelector.tsx` to integrate artist selection UI
  - Check if meeting has `target_scope: "user_selected"`
  - If yes, show `prompt_before_selection` text and artist selector
  - After artist selected, replace `{artistName}` placeholder in `prompt` with selected artist's name
  - Store `selectedArtistId` in queued action metadata
- [ ] 4.4 Add edge case handling for artist selection UI
  - If 0 artists signed: hide user-selected meetings entirely
  - If 1 artist signed: still show artist selection UI for consistency (per FR-13)
- [ ] 4.5 Add visual indicators to meeting cards to distinguish global vs predetermined vs user-selected meetings
  - Global: 🌍 icon badge
  - Predetermined: ⭐ icon badge
  - User-selected: 👤 icon badge
- [ ] 4.6 Add unit tests for artist selection component
  - Test artist list renders correctly
  - Test artist selection updates state
  - Test `{artistName}` placeholder replacement
  - Test edge cases (0 artists, 1 artist, multiple artists)

### 5.0 Update Week Summary Display with Scope-Specific Formatting

**Goal**: Update week summary to clearly distinguish between global, predetermined, user-selected, and dialogue mood changes.

- [ ] 5.1 Update `WeekSummary.tsx` to parse mood change entries and determine scope
  - Extract scope information from `summary.changes` entries
  - Determine if mood change is global, predetermined, user-selected, or dialogue
- [ ] 5.2 Implement scope-specific formatting for mood changes
  - Global: `🌍 CEO: Strategic Priorities (All Artists) - Effects: Money -$2000, Artist Mood +2 (roster-wide)`
  - Predetermined: `⭐ Crisis Management (Nova - Most Popular) - Effects: Money -$8000, Nova's Mood +3`
  - User-selected: `👤 Single Strategy (Diego - Your Choice) - Effects: Diego's Mood -2, Playlist Bias +2`
  - Dialogue: `💬 Artist Conversation: Nova - Effects: Mood +3, Energy +2`
- [ ] 5.3 Update `DialogueInterface.tsx` to use scope-specific formatting for effect badges
  - Show artist name for per-artist effects
  - Show "All Artists" for global effects
- [ ] 5.4 Add visual styling for scope icons (color, size, positioning)
- [ ] 5.5 Test week summary display with all four scope types in a single week

### 6.0 Implement Mood Event Logging with Artist Targeting

**Goal**: Update mood event database logging to store artist targeting information.

- [ ] 6.1 Verify/update `mood_events` table schema supports `artist_id` column
  - Check if `artist_id` column exists in `mood_events` table
  - Verify column type allows NULL values (for global mood events)
  - Verify column type matches artist ID type (likely UUID or VARCHAR)
  - If missing or incorrect type: create database migration to add/update column
  - Recommended: Add index on `artist_id` for query performance (`CREATE INDEX idx_mood_events_artist_id ON mood_events(artist_id)`)
- [ ] 6.2 Update mood event logging in `game-engine.ts` to include artist targeting
  - For per-artist effects: store specific `artist_id`
  - For global effects: store NULL in `artist_id` column
  - Include event type, mood change amount, source (sceneId/choiceId or actionId/choiceId), meeting name, scope
- [ ] 6.3 Add logging for predetermined meetings with tie-breaking information
  - Log format: `"Predetermined selection: 2 artists tied at popularity 75, selected Nova randomly"`
- [ ] 6.4 Add database queries to filter mood events by artist
  - Query all mood events for specific artist
  - Query global mood events (artist_id IS NULL)
  - Query all mood events in date range
- [ ] 6.5 Test mood event logging for all four scope types
  - Dialogue (per-artist)
  - Global meeting (NULL artist_id)
  - User-selected meeting (specific artist_id)
  - Predetermined meeting (specific artist_id with tie-breaking log)

### 7.0 Testing and QA

**Goal**: Comprehensive testing across all scenarios to ensure correct behavior and performance.

- [ ] 7.1 Create comprehensive integration test suite in `shared/engine/__tests__/mood-targeting-integration.test.ts`
  - Test dialogue with artist Nova → only Nova's mood changes
  - Test CEO meeting (global) → all artists' moods change
  - Test A&R meeting (user_selected) → selected artist's mood changes
  - Test CEO crisis (predetermined) → highest popularity artist's mood changes
  - Test edge case: 0 artists signed (meetings hidden)
  - Test edge case: 1 artist signed (predetermined auto-selects, user-selected shows UI)
  - Test edge case: tied popularity (predetermined random selection)
  - Test delayed effects with artist targeting
  - Test delayed effect for dropped artist (effect cancelled)
- [ ] 7.2 Manual testing full playthrough with multiple artists
  - Sign 3+ artists with different popularity levels
  - Execute all four scope types in same playthrough
  - Verify week summary displays correctly
  - Verify mood changes apply to correct artists
- [ ] 7.3 Performance testing with large artist rosters
  - Test with 10+ signed artists
  - Verify global mood changes don't cause performance issues
  - Verify week summary renders efficiently
- [ ] 7.4 Edge case validation testing
  - Test all edge cases from FR-10, FR-12, FR-13
  - Test validation errors (missing target_scope, invalid values)
  - Test error handling (artist not found, missing artistId)
- [ ] 7.5 Documentation updates
  - Update `docs/02-architecture/system-architecture.md` with mood targeting system
  - Update `docs/06-development/content-editing-guide.md` with `target_scope` field usage
  - Add developer notes on mood targeting to `CLAUDE.md`
- [ ] 7.6 Final QA pass and bug fixes
  - Review all logging output
  - Verify all acceptance criteria met (PRD Section 11)
  - Fix any discovered bugs
  - Code review and cleanup

---

**Implementation Status**: Ready to begin
**Estimated Effort**: 3-5 days (depending on testing complexity)
**Dependencies**: PRD-0003 (Complete ✅)
**Next Steps**: Begin with Task 1.0 (Back-End Prototype and Validation)
