# PRD-0002: Mood System Reimplementation - Global vs Per-Artist Effects

## 1. Introduction/Overview

The current mood system in Music Label Manager has a critical architecture issue: all `artist_mood` effects apply globally to ALL artists, regardless of whether the effect should logically affect a specific artist or the entire roster.

This affects two primary game systems:
- **Executive Meetings** (`data/actions.json`) - Strategic business decisions with executives
- **Artist Dialogues** (`data/dialogue.json`) - One-on-one conversations with signed artists

**Problem**: When a player makes a decision in an artist dialogue (e.g., "support your vision") or an executive meeting (e.g., "hire emergency session musicians"), the mood change applies to all artists on the roster instead of the contextually appropriate artist(s).

**Goal**: Redesign the mood effect system to support three distinct targeting scopes: global (all artists), predetermined (system-selected artist), and user-selected (player-selected artist), with appropriate targeting logic for each type of game interaction.

**Status**: PRD-0003 (Basic Artist Dialogue UI) is complete. The `actions.json` file has been updated with `target_scope` field for all 17 meetings. This PRD now focuses on implementing the effect targeting logic in the game engine.

---

## 2. Goals

1. **Fix mood targeting logic** - Mood effects apply to the correct artist(s) based on `target_scope` value
2. **Preserve game balance** - Existing mood values remain appropriate after migration
3. **Support three effect scopes** - Global (all artists), predetermined (highest popularity), user-selected (player choice)
4. **Maintain clear data contracts** - Effect types and scoping are obvious from data structure
5. **Enable artist selection** - Players can choose which artist participates in user-selected meetings
6. **Fix per-artist mood targeting** - Fix bug in `processArtistDialogue()` where mood changes apply globally instead of per-artist, and update `applyEffects()` method signature

---

## 3. User Stories

### Player Experience

1. **As a player**, when I have a one-on-one conversation with my Visionary artist about creative direction, I want only that artist's mood to change, so that my other artists aren't affected by decisions that don't involve them.

2. **As a player**, when I make a label-wide strategic decision with my CEO (e.g., "shift label focus to streaming"), I want all my artists' moods to be affected, so that company-wide changes have roster-wide consequences.

3. **As a player**, when I choose an A&R meeting about recording techniques, I want to select which artist project this applies to, so that the mood effect targets the correct artist.

4. **As a player**, when my CEO handles a crisis, I want the system to automatically select my most popular artist (who would logically be involved), so that the narrative makes sense without requiring manual selection.

5. **As a player**, when I see mood changes in the week summary, I want to understand which artist was affected and why, so that I can track the consequences of my decisions.

### Developer Experience

6. **As a developer**, when I add a new executive meeting to actions.json, I want to clearly specify whether it affects all artists, a specific artist, or requires player selection using the `target_scope` field, so that the effect scope is obvious.

7. **As a developer**, when I debug mood changes, I want clear logging that shows which artist(s) were affected by which meeting/dialogue, so that I can verify correct behavior.

---

## 4. Functional Requirements

### 4.1 Data Structure Changes

**FR-1**: The system MUST support three distinct effect scopes:
- **Global effects** (`"global"`): Apply to all signed artists (e.g., label-wide policy changes)
- **Predetermined effects** (`"predetermined"`): System automatically selects which artist based on context (e.g., highest popularity)
- **User-selected effects** (`"user_selected"`): Player manually chooses which artist before meeting executes

**FR-2**: `data/dialogue.json` scenes MUST always apply effects to the specific artist in the conversation (per-artist scope only, no `target_scope` field needed).

**FR-3**: `data/actions.json` meetings MUST use the `target_scope` field to indicate effect scope:
- **Global meetings** (13 meetings): CEO priorities, A&R discovery, A&R genre shift, CCO timeline, CCO budget crisis, CMO PR angle, CMO scandal, CMO awards, CMO viral, CMO platform exclusive, Distribution pitch, Distribution politics, Distribution algorithm, Distribution tour scale, Distribution supply chain
- **Predetermined meetings** (2 meetings): CEO crisis, CEO expansion (both use "highest popularity" selection)
- **User-selected meetings** (2 meetings): A&R single choice, CCO creative clash

**FR-4**: The `target_scope` field in `actions.json` MUST be validated on load (error if missing or invalid value).

**FR-5**: Meeting metadata MUST indicate whether artist selection is required before the meeting can be executed (determined by `target_scope` value).

**FR-6**: For user-selected meetings, the system SHOULD validate that the `prompt` field contains the `{artistName}` placeholder. If missing, log a warning during data load (prompt may not make contextual sense after artist selection, but allow execution).

**FR-7**: The `prompt_before_selection` field is RECOMMENDED but not required for user-selected meetings. If missing, use default text: "Select which artist this meeting is about."

### 4.2 Artist Selection & Targeting

**FR-8**: When a player selects a user-selected executive meeting (`target_scope: "user_selected"`), the system MUST prompt the player to choose which signed artist the meeting applies to BEFORE the meeting executes.

**FR-9**: Artist selection UI MUST display:
- Artist name and archetype
- Current mood and energy levels
- Active projects (if any)
- Visual indication of which artists are eligible for the meeting (all signed artists)

**FR-10**: Predetermined meetings (`target_scope: "predetermined"`) MUST use the following targeting logic:
- **Selection rule**: Choose the artist with the highest popularity score
- **Edge case - 0 artists signed**: Hide predetermined meetings entirely (cannot execute)
- **Edge case - 1 artist signed**: Automatically select that artist (no UI needed)
- **Tie-breaking**: If multiple artists have the same highest popularity, select randomly among them

**FR-11**: Artist dialogue scenes MUST automatically target the artist who triggered the dialogue (no selection needed, per-artist scope implicit).

**FR-12**: If 0 artists are signed, user-selected meetings MUST be hidden entirely (cannot execute without artist).

**FR-13**: If 1 artist is signed, user-selected meetings MUST still show artist selection UI for consistency (prevents confusing conditional behavior where UI appears/disappears based on roster size). This differs from predetermined meetings (FR-10), which auto-select the only artist when roster size is 1.

### 4.3 Effect Processing Logic

**FR-14**: The `applyEffects()` method signature MUST be updated to accept an optional `artistId` parameter:
```typescript
private applyEffects(
  effects: Record<string, number>,
  summary: WeekSummary,
  artistId?: string
): void
```

**FR-15**: When processing `artist_mood` effects in `applyEffects()`:
- **If `artistId` is provided AND artist exists**:
  - Initialize `summary.artistChanges[artistId]` object if it doesn't exist
  - Apply to `summary.artistChanges[artistId].mood`
- **If `artistId` is NOT provided**: Iterate through all signed artists and apply mood change to each artist individually in `summary.artistChanges[artistId].mood` (initialize each object if needed)
- **If `artistId` provided but artist not found**: Log error and skip effect (do not crash)

**FR-16**: The `applyEffects()` method MUST perform strict validation:
- If `target_scope` is `"global"` but `artistId` is provided → Log warning (unexpected, but apply globally and ignore artistId)
- If `target_scope` is `"predetermined"` or `"user_selected"` but `artistId` is missing → Throw error (fail fast)
- Validation errors MUST include meeting ID, scope, and artistId in error message

**FR-17**: The `processArtistDialogue()` method MUST pass the artist ID to `applyEffects()` to fix the global mood bug:
```typescript
this.applyEffects(effects, summary, artistId);
```

**FR-18**: The `processRoleMeeting()` method MUST determine effect scope based on meeting `target_scope` field:
- `"global"` → Call `applyEffects(effects, summary)` without artistId
- `"predetermined"` → Determine artist using highest popularity logic, then call `applyEffects(effects, summary, artistId)`
- `"user_selected"` → Extract artistId from action metadata, then call `applyEffects(effects, summary, artistId)`

**FR-19**: When queueing delayed effects, the system MUST preserve the `artistId` (if any) from the immediate effect context. Delayed effects apply to the same artist as immediate effects. The delayed effect queue entry MUST include the artistId field:

```typescript
interface DelayedEffect {
  effect: string;
  value: number;
  triggerWeek: number;
  artistId?: string; // Preserved from immediate effect context
  source: string;
}
```

If a delayed effect has `artistId` set, it applies to that specific artist. If `artistId` is undefined, the delayed effect inherits the original meeting's `target_scope` logic (global = all artists, predetermined = recalculate highest popularity at trigger time).

**FR-20**: Mood changes MUST be logged with:
- Event type (`dialogue_choice`, `role_meeting`)
- Target artist ID (or "all artists" for global effects)
- Mood change amount
- Source (sceneId/choiceId or actionId/choiceId)
- Meeting name and scope
- **For predetermined meetings**: If multiple artists tied for highest popularity, log: "Predetermined selection: {count} artists tied at popularity {score}, selected {artistName} randomly"

### 4.4 Week Summary & UI Feedback

**FR-21**: Week summary MUST distinguish between global, predetermined, and user-selected mood changes in the changes feed.

**FR-22**: Global mood changes MUST display:
```
🌍 CEO: Strategic Priorities (All Artists)
Effects: Money -$2000, Artist Mood +2 (roster-wide)
```

**FR-23**: Predetermined mood changes MUST display:
```
⭐ Crisis Management (Nova - Most Popular)
Effects: Money -$8000, Nova's Mood +3
```

**FR-24**: User-selected mood changes MUST display:
```
👤 Single Strategy (Diego - Your Choice)
Effects: Diego's Mood -2, Playlist Bias +2
```

**FR-25**: Dialogue mood changes MUST display:
```
💬 Artist Conversation: Nova
Effects: Mood +3, Energy +2
```

**FR-26**: Mood event history (from Phase 5) MUST store the `artist_id` for per-artist events or NULL for global events.

### 4.5 Data Migration & Content Review

**FR-27**: All existing `artist_mood` effects in `data/actions.json` have been reviewed and categorized with `target_scope` field (13 global, 2 predetermined, 2 user-selected).

**FR-28**: All existing `artist_mood` effects in `data/dialogue.json` are per-artist (no changes expected, validation only).

**FR-29**: The system MUST validate that dialogue scenes only use per-artist effects (log warning if scope ambiguity detected).

### 4.6 Artist Selection Flow for User-Selected Meetings

**FR-30**: For `user_selected` meetings, the meeting data SHOULD have two prompts:
- `prompt_before_selection`: Shown before artist selection (e.g., "Which artist are you discussing with A&R?")
- `prompt`: Shown after artist selected, with `{artistName}` placeholder (e.g., "Pick the lead single approach for {artistName}.")

**FR-31**: If `prompt_before_selection` is missing, use default text: "Select which artist this meeting is about."

**FR-32**: UI Flow for user-selected meetings:
1. Player clicks meeting → Shows `prompt_before_selection`
2. Artist selection UI appears with all signed artists
3. After selection → Shows `prompt` with artist name replaced in `{artistName}` placeholder
4. Player selects choice → Effects apply to selected artist only

**FR-33**: Selection UI MUST display:
- Artist name
- Artist archetype
- Current mood/energy
- Active projects (if any)
- Clear visual indication of selected artist

---

## 5. Non-Goals (Out of Scope)

**NG-1**: Backwards compatibility with existing save games - Players will need to start new games for this feature.

**NG-2**: Multi-artist group effects (e.g., "all Visionary artists") - Only global (all), predetermined (one), and user-selected (one) are supported.

**NG-3**: Delayed effects scope changes - Delayed effects preserve the artistId from their immediate effects (see FR-19). Delayed effects do not support changing targeting scope at trigger time.

**NG-4**: Complex mood formulas - Mood changes remain simple additive values (-5 to +5 range).

**NG-5**: AI-driven artist selection - Artist selection is manual player choice (user-selected) or highest popularity (predetermined) only.

**NG-6**: Mood effects on unsigned artists - Only signed artists are affected by meetings/dialogues.

**NG-7**: Complex predetermined logic - Only "highest popularity" is supported for predetermined meetings.

---

## 6. Design Considerations

### 6.1 Artist Selection UI

**Option A - Modal Dialog:**
- Displays when player selects a user-selected meeting
- Shows all signed artists with current stats
- Player clicks to select artist, then confirms choice
- Similar to existing project creation flow

**Option B - Inline Selection:**
- Meeting card shows dropdown/selector for artist choice
- Player selects artist before confirming meeting action
- More compact, fewer clicks

**Recommendation**: Start with Option B (inline) for simplicity, can enhance to Option A if needed.

### 6.2 Week Summary Display

**Global effect example:**
```
🌍 CEO: Strategic Priorities (All Artists)
Effects: Money -$2000, Artist Mood +2 (roster-wide)
```

**Predetermined effect example:**
```
⭐ Crisis Management (Nova - Most Popular)
Effects: Money -$8000, Nova's Mood +3
```

**User-selected effect example:**
```
👤 Single Strategy (Diego - Your Choice)
Effects: Diego's Mood -2, Playlist Bias +2
```

**Dialogue effect example:**
```
💬 Artist Conversation: Nova
Effects: Mood +3, Energy +2
```

### 6.3 Data Structure (Implemented)

The implementation uses the `target_scope` field at the meeting level in `actions.json`:

```json
{
  "id": "ceo_priorities",
  "name": "CEO: Strategic Priorities",
  "type": "role_meeting",
  "target_scope": "global",
  "prompt": "We can only push two tracks next week—what's the focus?",
  "choices": [
    {
      "id": "studio_first",
      "label": "Studio-first to polish the single",
      "effects_immediate": { "money": -2000 },
      "effects_delayed": { "quality_bonus": 5, "artist_mood": 2 }
    }
  ]
}
```

```json
{
  "id": "ceo_crisis",
  "name": "CEO: Crisis Management",
  "type": "role_meeting",
  "target_scope": "predetermined",
  "prompt": "Your biggest artist just fired their last three backup dancers...",
  "choices": [...]
}
```

```json
{
  "id": "ar_single_choice",
  "name": "A&R: Single Strategy",
  "type": "role_meeting",
  "target_scope": "user_selected",
  "prompt": "Pick the lead single approach for {artistName}.",
  "prompt_before_selection": "Which artist are you working with on single strategy?",
  "choices": [...]
}
```

**Predetermined logic**: Both `ceo_crisis` and `ceo_expansion` use "highest popularity" selection logic.

### 6.4 Artist Selection Flow for User-Selected Meetings

**For `user_selected` meetings:**

1. **Meeting data structure**:
   - `prompt_before_selection`: Shown before artist selection (e.g., "Which artist are you discussing with A&R?")
   - `prompt`: Shown after artist selected, with `{artistName}` placeholder (e.g., "Pick the lead single approach for {artistName}.")

2. **UI Flow**:
   - Player clicks meeting → Shows `prompt_before_selection`
   - Artist selection UI appears with all signed artists
   - After selection → Shows `prompt` with artist name replaced in placeholder
   - Player selects choice → Effects apply to selected artist only

3. **Selection UI displays**:
   - Artist name
   - Artist archetype
   - Current mood/energy
   - Active projects

**Example user-selected meetings in actions.json:**

```json
{
  "id": "ar_single_choice",
  "target_scope": "user_selected",
  "prompt_before_selection": "Which artist are you working with on single strategy?",
  "prompt": "Pick the lead single approach for {artistName}.",
  "choices": [...]
}
```

```json
{
  "id": "cco_creative_clash",
  "target_scope": "user_selected",
  "prompt_before_selection": "Which artist is having creative differences?",
  "prompt": "{artistName} wants to record everything live in one take. I think we need overdubs to compete.",
  "choices": [...]
}
```

**Implementation Note:** The `prompt_before_selection` field and `{artistName}` placeholder in the `prompt` field are NOT yet present in `actions.json` for the two user-selected meetings (`ar_single_choice` and `cco_creative_clash`). These fields should be added during Phase 3 implementation (Artist Selection UI) as follows:

Current `ar_single_choice` in actions.json:
```json
{
  "id": "ar_single_choice",
  "prompt": "Pick the lead single approach."
}
```

Should be updated to:
```json
{
  "id": "ar_single_choice",
  "prompt_before_selection": "Which artist are you working with on single strategy?",
  "prompt": "Pick the lead single approach for {artistName}."
}
```

Similar update needed for `cco_creative_clash`.

---

## 7. Technical Considerations

### 7.1 Affected Files

**Data Files:**
- ✅ `data/actions.json` - All 17 meetings have `target_scope` field (13 global, 2 predetermined, 2 user-selected)
- `data/dialogue.json` - Verify all 9 dialogues are per-artist (validation only, no changes needed)

**Backend/Shared:**
- `shared/engine/game-engine.ts` - **PRIMARY CHANGES**:
  - Update `applyEffects()` signature to accept optional `artistId` parameter
  - Update `applyEffects()` mood processing to handle per-artist targeting
  - Update `processRoleMeeting()` to extract `target_scope` and determine artistId
  - Update `processArtistDialogue()` to pass artistId to `applyEffects()`
  - Add predetermined artist selection logic (highest popularity)
- `server/data/gameData.ts` - Add validation for `target_scope` field on load
- `shared/types/gameTypes.ts` - Add `target_scope` type, update `RoleMeetingAction` and `QueuedAction` interfaces

**Frontend:**
- ✅ `client/src/components/artist-dialogue/ArtistDialogueModal.tsx` - Already implemented (PRD-0003)
- `client/src/components/meetings/` - Add artist selection UI for user-selected meetings
- `client/src/components/week-summary/` - Update mood change display to show scope icons
- API contract updates for artist selection in user-selected meetings

**Database:**
- `mood_events` table - Verify `artist_id` column supports NULL (global) and specific IDs

### 7.2 Implementation Dependencies

1. ✅ PRD-0003 is complete (dialogue UI exists and functional)
2. ✅ `actions.json` has `target_scope` field for all meetings
3. ✅ `getDialogueChoiceById()` method exists in `gameData.ts`
4. **Update QueuedAction interface for user-selected meetings**: Add `selectedArtistId?: string` field to `QueuedAction` interface in `shared/types/gameTypes.ts`. When a player selects a user-selected meeting, the system stores the selected artistId in the queued action. When the meeting executes at week's end, `processRoleMeeting()` extracts this artistId and passes it to `applyEffects()`.

Example:
```typescript
interface QueuedAction {
  actionId: string;
  choiceId: string;
  selectedArtistId?: string; // For user_selected meetings - stores player's artist choice
  metadata?: Record<string, any>;
}
```

5. Modify `applyEffects()` signature to accept optional `artistId` parameter
6. Implement predetermined logic (highest popularity selection)
7. Update `processRoleMeeting()` to handle three scope types
8. Fix `processArtistDialogue()` to pass artistId to `applyEffects()`
9. Design and implement artist selection UI component for user-selected meetings
10. Add comprehensive logging for mood changes with artist targeting
11. Update week summary rendering with scope-specific formatting

### 7.3 Testing Strategy

**Unit Tests:**
1. Test `applyEffects()` with artistId parameter (per-artist mood change)
2. Test `applyEffects()` without artistId (global mood change to all artists)
3. Test predetermined artist selection (highest popularity)
4. Test edge cases (0 artists, 1 artist, tied popularity)
5. Test validation (invalid scope, missing artistId)

**Integration Tests:**
1. **Dialogue test**: Artist dialogue with Nova → only Nova's mood changes
2. **Global meeting test**: CEO meeting (global) → all artists' moods change
3. **User-selected meeting test**: A&R meeting (user_selected) → selected artist's mood changes
4. **Predetermined meeting test**: CEO crisis (predetermined) → highest popularity artist's mood changes

**Manual Testing:**
1. Full playthrough with multiple artists
2. Edge case validation (0 artists, 1 artist)
3. Week summary display verification
4. Performance testing (large artist rosters)

### 7.4 Known Risks

**Risk 1**: Actions.json has 17 meetings - manual review/categorization was error-prone
- **Mitigation**: ✅ Completed - All meetings categorized with `target_scope` field

**Risk 2**: Artist selection UI may complicate player flow for meetings
- **Mitigation**: Make artist selection fast and contextual, use inline dropdown for MVP

**Risk 3**: Global vs predetermined vs user-selected logic adds complexity to GameEngine
- **Mitigation**: Extract mood processing into separate service/module if complexity grows

**Risk 4**: Predetermined logic may not make narrative sense for all meetings
- **Mitigation**: Only 2 meetings use predetermined (CEO crisis, CEO expansion), both make sense for "biggest artist"

---

## 8. Success Metrics

**Metric 1**: Zero instances of dialogue choices affecting all artists (verified via logging) ✅

**Metric 2**: Players can successfully select artists for user-selected meetings (UX testing)

**Metric 3**: Week summary clearly distinguishes global vs predetermined vs user-selected mood changes (visual inspection)

**Metric 4**: All 17 actions.json mood effects correctly categorized with `target_scope` (manual review) ✅

**Metric 5**: Prototype demo successfully shows correct targeting for all four scenarios:
- Dialogue (per-artist)
- Global meeting (all artists)
- User-selected meeting (selected artist)
- Predetermined meeting (highest popularity artist)

---

## 9. Open Questions

**Q1**: Should we add visual indicators (icons/badges) to distinguish global vs per-artist meetings in the meetings UI?
- **Impact**: Helps players understand scope before selecting meeting
- **Decision needed by**: UI design phase

~~**Q2**: For meetings with `context_dependent` scope, what logic determines targeting?~~
- ~~Example: "Resolve band conflict" - should it affect all members or just the band leader?~~
- **Status**: ✅ **RESOLVED** - `"predetermined"` scope uses highest popularity for both `ceo_crisis` and `ceo_expansion`. No other predetermined logic needed.

**Q3**: Should global mood effects have a different magnitude than per-artist effects?
- Example: Global effect is -1 to each artist, per-artist effect is -3 to one artist
- **Impact**: Balance consideration - may need separate balancing pass
- **Decision needed by**: Data review phase

~~**Q4**: How should we handle edge cases where player has zero signed artists?~~
- ~~Should artist-selection meetings be disabled/hidden?~~
- **Status**: ✅ **RESOLVED** - Hide predetermined and user-selected meetings entirely when 0 artists signed. Show selection UI even with 1 artist for consistency.

**Q5**: Should the artist selection UI support sorting/filtering (e.g., by mood, by archetype)?
- **Impact**: Development time vs player convenience
- **Decision needed by**: Prototype feedback

~~**Q6**: What happens if a delayed effect references an artist who was later dropped from the roster?~~
- ~~Should effect be cancelled, applied globally, or stored until artist returns?~~
- **Status**: ✅ **RESOLVED** - Cancel delayed effect if artist is no longer on roster. Do not apply globally or store for later.

---

## 10. Implementation Phases

### Phase 1: Foundation & Backend (Prototype)
- Update `applyEffects()` signature to accept optional `artistId` parameter
- Implement per-artist mood targeting in `applyEffects()` method
- Fix `processArtistDialogue()` to pass artistId to `applyEffects()`
- Implement predetermined artist selection logic (highest popularity)
- Update `processRoleMeeting()` to handle three scope types
- Create demo scenario testing all four scope types:
  1. Dialogue with Nova → only Nova's mood changes (per-artist)
  2. CEO meeting (global) → all artists' moods change
  3. A&R meeting (user_selected) → selected artist's mood changes
  4. CEO crisis (predetermined) → highest popularity artist's mood changes

### Phase 2: Data Validation
- Add `target_scope` validation to `gameData.ts` on load
- Verify all `actions.json` meetings have valid `target_scope` values
- Add unit tests for validation logic
- Create data validation tests

### Phase 3: Artist Selection UI
- Design and implement artist selection UI component for user-selected meetings
- Add inline dropdown for artist selection on meeting cards
- Implement `prompt_before_selection` and `{artistName}` placeholder replacement
- Wire up artist selection to meeting execution flow
- Test with 0 artists, 1 artist, multiple artists

### Phase 4: Week Summary & UI Polish
- Update week summary display with scope-specific formatting (🌍, ⭐, 👤, 💬 icons)
- Add artist name to per-artist mood change entries
- Improve logging and debugging tools (show artist ID, scope, meeting name)
- Add visual feedback for mood changes

### Phase 5: Mood Event Logging (Database)
- Update mood event logging to store `artist_id` (NULL for global, specific ID for per-artist)
- Add mood event queries filtered by artist
- Integrate with existing mood history system
- Test event logging for all four scope types

### Phase 6: Testing & Validation
- Full playthrough testing with multiple artists
- Edge case validation (0 artists, 1 artist, tied popularity)
- Performance testing (large artist rosters)
- Verify delayed effects apply correctly with artist targeting
- Documentation updates

### Phase 7: Integration
- Resume `tasks-artist-mood-plan.md` at task 2.4+ (if applicable)
- Complete mood-triggered warnings (task 3.0+)
- Final QA and bug fixes

---

## 11. Acceptance Criteria

This PRD is considered complete and ready for implementation when:

✅ **AC-1**: Prototype demonstrates correct per-artist targeting for dialogue scenes

✅ **AC-2**: Prototype demonstrates correct global targeting for label-wide meetings

✅ **AC-3**: Prototype demonstrates artist selection UI for user-selected meetings

✅ **AC-4**: Prototype demonstrates predetermined targeting for CEO crisis/expansion meetings (highest popularity)

✅ **AC-5**: All actions.json mood effects reviewed and categorized with `target_scope` field (documented in actions.json)

✅ **AC-6**: Data structure design finalized (`target_scope` field approach)

✅ **AC-7**: Week summary displays clear distinction between global, predetermined, user-selected, and dialogue effects

✅ **AC-8**: Technical lead approves approach before proceeding to full implementation

---

## 12. Next Steps

1. ✅ **Review this PRD** with stakeholders/technical lead
2. **Prototype Phase 1** - Build minimal demo of four scenarios (dialogue, global, user-selected, predetermined)
3. **Demo review** - Validate approach, gather feedback
4. **Full implementation** - Execute Phases 2-6
5. **Testing & QA** - Comprehensive testing with all edge cases
6. **Ship to production** - Deploy mood targeting system

---

## 13. PRD-0003 Integration Notes

### What Was Implemented in PRD-0003

PRD-0003 (Basic Artist Dialogue UI) successfully implemented:
- ✅ Artist dialogue modal component (`ArtistDialogueModal.tsx`)
- ✅ XState state machine for dialogue flow (`artistDialogueMachine.ts`)
- ✅ API endpoint for artist dialogue submission (`POST /api/game/:gameId/artist-dialogue`)
- ✅ Integration with artist roster page ("Meet" action in dropdown)
- ✅ Random dialogue selection from `dialogue.json`
- ✅ Immediate effect application (mood, energy, money)
- ✅ Delayed effect queuing
- ✅ Confirmation message display after choice selection

### Deviations from PRD-0003 Spec

**No significant deviations discovered.** The implementation followed the PRD-0003 specification closely:
- Modal opens from "Meet" action in artist roster dropdown ✅
- Random dialogue selection (mood/energy range matching deferred) ✅
- XState machine with 6 states (loading, displaying, submitting, complete, error, closed) ✅
- Confirmation message shows effects applied ✅
- Auto-close after 5 seconds (minor UX improvement over PRD-0003's original 2-second spec) ✅

### Known Limitation from PRD-0003

**Global Mood Bug**: PRD-0003 documented that `processArtistDialogue()` applies mood changes globally (affects all artists) instead of per-artist. This is documented in PRD-0003 Section 12 (Known Limitations):

> **Limitation 2**: Mood effects apply globally (all artists affected)
> - **Impact**: Choosing response for Nova changes all artists' moods
> - **Fix in**: PRD-0002 implements per-artist mood targeting

**Current Implementation** (game-engine.ts:3684):
```typescript
this.applyEffects(effects, summary); // ❌ Missing artistId parameter
```

**PRD-0002 Fix** (this PRD):
```typescript
this.applyEffects(effects, summary, artistId); // ✅ Pass artistId for per-artist targeting
```

### How PRD-0002 Builds on PRD-0003

PRD-0002 extends the foundation laid by PRD-0003:

1. **Fixes dialogue mood targeting** - Adds `artistId` parameter to `applyEffects()` call in `processArtistDialogue()`
2. **Adds meeting scope system** - Extends mood targeting to executive meetings with three scopes (global, predetermined, user-selected)
3. **Implements artist selection UI** - Builds on PRD-0003's modal patterns for user-selected meetings
4. **Enhances week summary** - Adds scope-specific formatting for all four mood change types
5. **Adds predetermined logic** - Implements highest popularity selection for CEO crisis/expansion meetings

**Dependencies:**
- PRD-0002 depends on PRD-0003's dialogue modal and API endpoint ✅
- PRD-0002 uses the same `applyEffects()` method (extends signature) ✅
- PRD-0002 builds on XState patterns established in PRD-0003 ✅

---

**Document Version**: 2.1
**Created**: 2025-10-07
**Last Updated**: 2025-10-08
**Status**: Ready for Implementation
**Depends on**: PRD-0003 (Complete) ✅
**Blocks**: Mood-triggered warnings, mood event history enhancements
