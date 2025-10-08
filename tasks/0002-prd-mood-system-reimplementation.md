# PRD-0002: Mood System Reimplementation - Global vs Per-Artist Effects

## 1. Introduction/Overview

The current mood system in Music Label Manager has a critical architecture issue: all `artist_mood` effects apply globally to ALL artists, regardless of whether the effect should logically affect a specific artist or the entire roster.

This affects two primary game systems:
- **Executive Meetings** (`data/actions.json`) - Strategic business decisions with executives
- **Artist Dialogues** (`data/dialogue.json`) - One-on-one conversations with signed artists

**Problem**: When a player makes a decision in an artist dialogue (e.g., "support your vision") or an executive meeting (e.g., "hire emergency session musicians"), the mood change applies to all artists on the roster instead of the contextually appropriate artist(s).

**Goal**: Redesign the mood effect system to support both global (all artists) and per-artist (specific artist) mood changes, with appropriate targeting logic for each type of game interaction.

---

## 2. Goals

1. **Fix mood targeting logic** - Mood effects apply to the correct artist(s) based on context
2. **Preserve game balance** - Existing mood values remain appropriate after migration
3. **Support flexible effect scoping** - System can handle global, per-artist, and meeting-determined effects
4. **Maintain clear data contracts** - Effect types and scoping are obvious from data structure
5. **Enable artist selection** - Players can choose which artist participates in relevant meetings
6. **Clean implementation** - Remove stub/HARDCODED random mood logic in `processArtistDialogue()`

---

## 3. User Stories

### Player Experience

1. **As a player**, when I have a one-on-one conversation with my Visionary artist about creative direction, I want only that artist's mood to change, so that my other artists aren't affected by decisions that don't involve them.

2. **As a player**, when I make a label-wide strategic decision with my CEO (e.g., "shift label focus to streaming"), I want all my artists' moods to be affected, so that company-wide changes have roster-wide consequences.

3. **As a player**, when I choose an A&R meeting about recording techniques, I want to select which artist project this applies to, so that the mood effect targets the correct artist.

4. **As a player**, when I see mood changes in the week summary, I want to understand which artist was affected and why, so that I can track the consequences of my decisions.

### Developer Experience

5. **As a developer**, when I add a new executive meeting to actions.json, I want to clearly specify whether it affects all artists or a specific artist, so that the effect scope is obvious.

6. **As a developer**, when I debug mood changes, I want clear logging that shows which artist(s) were affected by which meeting/dialogue, so that I can verify correct behavior.

---

## 4. Functional Requirements

### 4.1 Data Structure Changes

**FR-1**: The system MUST support two distinct effect scopes:
- **Global effects**: Apply to all signed artists (e.g., label-wide policy changes)
- **Per-artist effects**: Apply to a specific artist (e.g., artist dialogue, artist-specific meetings)

**FR-2**: `data/dialogue.json` scenes MUST always apply effects to the specific artist in the conversation (per-artist scope only).

**FR-3**: `data/actions.json` meetings MUST support both global and per-artist effects based on the meeting's nature:
- **Global meetings**: CEO decisions, label strategy, company-wide changes
- **Per-artist meetings**: A&R decisions, production choices, artist-specific projects
- **Context-dependent meetings**: Some meetings may determine scope dynamically (see FR-8)

**FR-4**: The data structure MUST make effect scope explicit and unambiguous (solution TBD during technical design).

**FR-5**: Meeting metadata MUST indicate whether artist selection is required before the meeting can be executed.

### 4.2 Artist Selection & Targeting

**FR-6**: When a player selects a per-artist executive meeting, the system MUST prompt the player to choose which signed artist the meeting applies to.

**FR-7**: Artist selection UI MUST display:
- Artist name and archetype
- Current mood and energy levels
- Visual indication of which artists are eligible for the meeting

**FR-8**: Some meetings MAY use alternative targeting methods:
- **Random selection**: Meeting randomly picks one signed artist
- **Primary artist**: Meeting targets the most popular/recently signed artist
- **Predetermined**: Meeting metadata specifies which artist archetype/role

**FR-9**: Artist dialogue scenes MUST automatically target the artist who triggered the dialogue (no selection needed).

### 4.3 Effect Processing Logic

**FR-10**: The `applyEffects()` method MUST accept an optional artist ID parameter to support per-artist targeting.

**FR-11**: When processing `artist_mood` effects:
- If artistId is provided → Apply to `summary.artistChanges[artistId]`
- If artistId is null → Apply to `summary.artistChanges.mood` (global)

**FR-12**: The `processArtistDialogue()` method MUST load actual dialogue choice data from `dialogue.json` (remove random stub values).

**FR-13**: The `processRoleMeeting()` method MUST determine effect scope based on meeting configuration and apply effects accordingly.

**FR-14**: Mood changes MUST be logged with:
- Event type (`dialogue_choice`, `role_meeting`, etc.)
- Target artist ID (or "global" for all-artist effects)
- Mood change amount
- Source (sceneId/choiceId or actionId/choiceId)

### 4.4 Week Summary & UI Feedback

**FR-15**: Week summary MUST distinguish between global and per-artist mood changes in the changes feed.

**FR-16**: Global mood changes MUST display: "All artists affected: [effect description]"

**FR-17**: Per-artist mood changes MUST display: "[Artist Name] mood changed: [effect description]"

**FR-18**: Mood event history (from Phase 5) MUST store the artist_id for per-artist events or NULL for global events.

### 4.5 Data Migration & Content Review

**FR-19**: All existing `artist_mood` effects in `data/actions.json` MUST be reviewed and categorized as global or per-artist.

**FR-20**: All existing `artist_mood` effects in `data/dialogue.json` MUST be verified as per-artist (no changes expected).

**FR-21**: The system MUST validate that dialogue scenes only use per-artist effects (error/warning if global scope detected).

---

## 5. Non-Goals (Out of Scope)

**NG-1**: Backwards compatibility with existing save games - Players will need to start new games for this feature.

**NG-2**: Multi-artist group effects (e.g., "all Visionary artists") - Only global (all) and per-artist (one) are supported.

**NG-3**: Delayed effects scope changes - Delayed effects inherit the scope of their immediate effects.

**NG-4**: Complex mood formulas - Mood changes remain simple additive values (-5 to +5 range).

**NG-5**: AI-driven artist selection - Artist selection is manual player choice only.

**NG-6**: Mood effects on unsigned artists - Only signed artists are affected by meetings/dialogues.

---

## 6. Design Considerations

### 6.1 Artist Selection UI

**Option A - Modal Dialog:**
- Displays when player selects a per-artist meeting
- Shows all signed artists with current stats
- Player clicks to select artist, then confirms choice
- Similar to existing project creation flow

**Option B - Inline Selection:**
- Meeting card shows dropdown/selector for artist choice
- Player selects artist before confirming meeting action
- More compact, fewer clicks

**Recommendation**: Start with Option B (inline) for simplicity, can enhance to Option A if needed.

### 6.2 Week Summary Display

Global effect example:
```
📊 Company Strategy Meeting
All artists affected: Label pivoting to streaming-first strategy
Mood: -2 (roster-wide uncertainty)
```

Per-artist effect example:
```
💬 Artist Conversation: Nova (Visionary)
Mood: +3 (You supported their artistic vision)
Energy: +2
```

### 6.3 Data Structure Options

The PRD intentionally leaves data structure implementation flexible. During technical design, evaluate:

**Option 1 - Effect Naming Convention:**
```json
{
  "effects_immediate": {
    "artist_mood_global": -2,
    "artist_mood": 3  // assumes per-artist if not suffixed
  }
}
```

**Option 2 - Scope Field:**
```json
{
  "scope": "per_artist",  // or "global" or "context_dependent"
  "effects_immediate": {
    "artist_mood": 3
  }
}
```

**Option 3 - Separate Effect Objects:**
```json
{
  "effects_immediate_global": { "artist_mood": -2 },
  "effects_immediate_per_artist": { "artist_mood": 3 }
}
```

**Recommendation**: Choose Option 2 (scope field) for clarity and extensibility.

---

## 7. Technical Considerations

### 7.1 Affected Files

**Data Files:**
- `data/actions.json` - Review all 10+ instances of `artist_mood` effects
- `data/dialogue.json` - Verify all 5+ instances are per-artist

**Backend/Shared:**
- `shared/engine/game-engine.ts` - Update `applyEffects()`, `processRoleMeeting()`, `processArtistDialogue()`
- `server/data/gameData.ts` - Add `getDialogueChoiceById()` (already implemented in task 2.2)
- `shared/types/gameTypes.ts` - Add scope types, update ChoiceEffect interface

**Frontend:**
- `client/src/components/meetings/` - Add artist selection UI
- `client/src/components/week-summary/` - Update mood change display
- API contract updates for artist selection

**Database:**
- `mood_events` table - Verify artist_id column supports NULL (global) and specific IDs

### 7.2 Implementation Dependencies

1. Complete `getDialogueChoiceById()` method (already done in task 2.2)
2. Design and implement artist selection UI component
3. Update `applyEffects()` signature to accept optional artistId
4. Review and categorize all actions.json mood effects
5. Update processRoleMeeting() and processArtistDialogue() logic
6. Add comprehensive logging for mood changes
7. Update week summary rendering

### 7.3 Testing Strategy

Before continuing with `tasks-artist-mood-plan.md`:

1. **Prototype Phase**: Build minimal artist selection UI + basic per-artist effect logic
2. **Demo Scenarios**:
   - Artist dialogue with Nova → only Nova's mood changes
   - CEO meeting (global) → all artists' moods change
   - A&R meeting (per-artist) → selected artist's mood changes
3. **Validation**: Manually verify effects apply correctly in-game
4. **Decision Point**: Review prototype, adjust design if needed, then proceed with full implementation

### 7.4 Known Risks

**Risk 1**: Actions.json has 10+ artist_mood effects - manual review/categorization is error-prone
- **Mitigation**: Create review spreadsheet with effect context, proposed scope, rationale

**Risk 2**: Artist selection UI may complicate player flow for meetings
- **Mitigation**: Make artist selection fast and contextual, pre-select most relevant artist when possible

**Risk 3**: Global vs per-artist logic adds complexity to already large GameEngine
- **Mitigation**: Extract mood processing into separate service/module if complexity grows

---

## 8. Success Metrics

**Metric 1**: Zero instances of dialogue choices affecting all artists (verified via logging)

**Metric 2**: Players can successfully select artists for per-artist meetings (UX testing)

**Metric 3**: Week summary clearly distinguishes global vs per-artist mood changes (visual inspection)

**Metric 4**: All 10+ actions.json mood effects correctly categorized as global or per-artist (manual review)

**Metric 5**: Prototype demo successfully shows correct targeting for all three scenarios (dialogue, global meeting, per-artist meeting)

---

## 9. Open Questions

**Q1**: Should we add visual indicators (icons/badges) to distinguish global vs per-artist meetings in the meetings UI?
- **Impact**: Helps players understand scope before selecting meeting
- **Decision needed by**: UI design phase

**Q2**: For meetings with `context_dependent` scope, what logic determines targeting?
- Example: "Resolve band conflict" - should it affect all members or just the band leader?
- **Impact**: May need per-meeting custom logic
- **Decision needed by**: Data review phase

**Q3**: Should global mood effects have a different magnitude than per-artist effects?
- Example: Global effect is -1 to each artist, per-artist effect is -3 to one artist
- **Impact**: Balance consideration - may need separate balancing pass
- **Decision needed by**: Data review phase

**Q4**: How should we handle edge cases where player has zero signed artists?
- Should artist-selection meetings be disabled/hidden?
- **Impact**: UI filtering logic
- **Decision needed by**: UI implementation phase

**Q5**: Should the artist selection UI support sorting/filtering (e.g., by mood, by archetype)?
- **Impact**: Development time vs player convenience
- **Decision needed by**: Prototype feedback

**Q6**: What happens if a delayed effect references an artist who was later dropped from the roster?
- Should effect be cancelled, applied globally, or stored until artist returns?
- **Impact**: Edge case handling
- **Decision needed by**: Technical design phase

---

## 10. Implementation Phases

### Phase 1: Foundation (Prototype)
- Design data structure for effect scoping
- Implement basic artist selection UI (inline dropdown)
- Update `applyEffects()` to accept artistId parameter
- Create demo scenario with 1 dialogue, 1 global meeting, 1 per-artist meeting

### Phase 2: Data Migration
- Review all actions.json mood effects
- Categorize each as global, per-artist, or context-dependent
- Update dialogue.json if needed (validate per-artist scoping)
- Create data validation tests

### Phase 3: Core Implementation
- Update `processArtistDialogue()` with real data loading (complete task 2.2-2.3)
- Update `processRoleMeeting()` with scope-aware effect processing
- Implement artist selection routing in API
- Add mood event logging with artist targeting

### Phase 4: UI/UX Polish
- Enhance week summary display (global vs per-artist indicators)
- Add artist selection filtering/sorting if needed
- Improve logging and debugging tools
- Visual feedback for mood changes

### Phase 5: Testing & Validation
- Full playthrough testing
- Edge case validation
- Performance testing (large artist rosters)
- Documentation updates

### Phase 6: Integration
- Resume `tasks-artist-mood-plan.md` at task 2.4+
- Complete mood event logging (task 2.4)
- Implement mood-triggered warnings (task 3.0+)

---

## 11. Acceptance Criteria

This PRD is considered complete and ready for implementation when:

✅ **AC-1**: Prototype demonstrates correct per-artist targeting for dialogue scenes

✅ **AC-2**: Prototype demonstrates correct global targeting for label-wide meetings

✅ **AC-3**: Prototype demonstrates artist selection UI for per-artist meetings

✅ **AC-4**: All actions.json mood effects reviewed and categorized (documented in spreadsheet/table)

✅ **AC-5**: Data structure design finalized (scope field, naming convention, or other chosen approach)

✅ **AC-6**: Week summary displays clear distinction between global and per-artist effects

✅ **AC-7**: Technical lead approves approach before proceeding to full implementation

---

## 12. Next Steps

1. **Review this PRD** with stakeholders/technical lead
2. **Prototype Phase 1** - Build minimal demo of three scenarios
3. **Demo review** - Validate approach, gather feedback
4. **Data review** - Categorize all actions.json effects
5. **Finalize design** - Lock in data structure and UI approach
6. **Full implementation** - Execute Phases 2-5
7. **Resume mood plan** - Continue with tasks-artist-mood-plan.md

---

**Document Version**: 1.0
**Created**: 2025-10-07
**Status**: Draft - Awaiting Review
**Blocks**: `tasks/tasks-artist-mood-plan.md` (task 2.3+)
