# PRD-0003: Basic Artist Dialogue UI - Minimal Implementation

## 1. Introduction/Overview

Currently, artist dialogues exist only in data (dialogue.json with 9 mood/energy scenarios) and backend processing (processArtistDialogue), but have no frontend UI. This PRD implements a minimal artist dialogue interface to enable testing and validation of the dialogue system before building the full mood targeting system in PRD-0002.

**Problem**: Cannot test or validate dialogue.json design, mood/energy selection logic, or per-artist mood effects without a working UI.

**Goal**: Build minimal artist dialogue UI that allows players to interact with artists, see dialogue choices, and experience mood effects. This unblocks PRD-0002 (Mood System Reimplementation) by providing a testable foundation.

---

## 2. Goals

1. **Enable artist dialogue interactions** - Players can trigger dialogues with their signed artists
2. **Validate dialogue.json structure** - Confirm 9 mood/energy scenarios work in real gameplay
3. **Test per-artist mood effects** - Verify mood changes apply to the correct artist only
4. **Unblock PRD-0002** - Provide working dialogue UI for full mood targeting implementation
5. **Ship quickly** - Minimal viable implementation, 1-2 weeks maximum

---

## 3. User Stories

### Player Experience

1. **As a player**, when I view my artist roster, I want to see a "Talk" option on each artist card, so that I can have conversations with my artists.

2. **As a player**, when I click "Talk to Artist", I want to see a dialogue prompt that reflects their current emotional state, so that the conversation feels contextual.

3. **As a player**, when I choose a dialogue response, I want to see immediate feedback showing how my choice affected the artist's mood, so that I understand the consequences of my decisions.

4. **As a player**, when the week advances, I want to see artist mood changes from my conversations in the week summary, so that I can track the impact of my relationship management.

### Developer Experience

5. **As a developer**, when I add new dialogues to dialogue.json, I want them to automatically appear in-game without code changes, so that content creation is decoupled from development.

6. **As a developer**, when I test dialogue selection, I want clear logging that shows which dialogue was selected and why, so that I can debug selection logic.

---

## 4. Functional Requirements

### 4.1 Entry Point & Triggering

**FR-1**: The artist roster page (ArtistsLandingPage.tsx) MUST repurpose the existing "Meet" option in the Actions dropdown.

**FR-2**: The "Meet" option in the "Actions" dropdown MUST open the artist dialogue modal (replacing current placeholder behavior).

**FR-3**: Clicking "Meet" MUST open a modal dialogue interface.

**FR-4**: Only signed artists MUST show the "Meet" option (unsigned artists have no dialogue).

### 4.2 Dialogue Selection Logic

**FR-5**: The system MUST select a dialogue randomly from all 9 available dialogues in dialogue.json.

**FR-6**: Dialogue selection MUST NOT consider mood/energy ranges for MVP (true random selection).

**FR-7**: The system MUST load dialogue data from dialogue.json via API (not hardcoded).

**FR-8**: If dialogue.json is unavailable or corrupted, the system MUST show a graceful error message.

### 4.3 Dialogue UI & Interaction

**FR-9**: The dialogue modal MUST display:
- Artist name
- Artist mood and energy percentages (for context - see Q3)
- Dialogue prompt text
- 3 choice buttons with labels
- Close/cancel button

**FR-10**: The dialogue modal MUST use a minimal XState state machine to manage flow:
- State 1: `loading` - Fetch dialogue data
- State 2: `displaying` - Show prompt and choices
- State 3: `submitted` - Send choice to backend
- State 4: `complete` - Show confirmation and close

**FR-11**: When the player selects a choice, the system MUST:
1. Submit the choice to the backend API
2. Show loading state during submission
3. Display confirmation message on success
4. Close modal automatically after 2 seconds

**FR-12**: The dialogue modal MUST be styled minimally (basic modal, no advanced animations for MVP).

**FR-13**: The modal MUST be responsive (works on mobile/tablet/desktop).

### 4.4 Backend Integration

**FR-14**: The frontend MUST call a new API endpoint: `POST /api/game/:gameId/artist-dialogue`

**FR-15**: The API request MUST include:
```json
{
  "artistId": "artist_123",
  "sceneId": "dialogue_low_mood_low_energy",
  "choiceId": "offer_break"
}
```

**FR-16**: The backend MUST use the existing `processArtistDialogue()` method to apply effects.

**FR-17**: The backend MUST return the applied effects for UI feedback:
```json
{
  "success": true,
  "effects": {
    "artist_mood": 2,
    "money": -2000
  },
  "artistName": "Nova"
}
```

### 4.5 Effect Application

**FR-18**: Dialogue effects MUST apply immediately to the artist (not queued for end of week).

**FR-19**: Mood effects MUST apply to the specific artist who was in the dialogue (per-artist, not global).

**FR-20**: Effects MUST be stored in the game state and persisted to the database.

**FR-21**: The dialogue modal MUST show a confirmation message listing the effects applied (e.g., "Artist mood +2, Money -$2,000").

### 4.6 Focus Slots (Deferred Decision)

**FR-22**: Artist dialogues MUST NOT consume focus slots in MVP.

**FR-23**: Focus slot consumption is explicitly deferred to PRD-0002.

### 4.7 Frequency & Limits (Deferred Decision)

**FR-24**: The system MUST allow unlimited dialogues per week in MVP.

**FR-25**: Frequency limits (e.g., one dialogue per artist per week) are explicitly deferred to PRD-0002.

### 4.8 Week Summary Integration (Deferred)

**FR-26**: Week summary integration is explicitly deferred to PRD-0002.

**FR-27**: Artist mood changes from dialogues MUST still appear in existing week summary mood change display.

---

## 5. Non-Goals (Out of Scope)

**NG-1**: Mood/energy-based dialogue selection - MVP uses random selection only

**NG-2**: Smart dialogue selection (avoiding repeats, sequential, etc.) - MVP allows any dialogue anytime

**NG-3**: Focus slot consumption - Deferred to PRD-0002

**NG-4**: Dialogue frequency limits - Deferred to PRD-0002

**NG-5**: Advanced UI polish (animations, transitions, sound effects) - Minimal styling only

**NG-6**: Dialogue history tracking (which dialogues the artist has seen) - Deferred

**NG-7**: Artist selection UI for executive meetings - That's in PRD-0002

**NG-8**: Global vs predetermined targeting - That's in PRD-0002

**NG-9**: Mood event logging to database - Deferred to PRD-0002

**NG-10**: Complex error recovery (retry logic, offline support) - Basic error handling only

**NG-11**: Dialogue previews or recommendations - Just show random dialogue

---

## 6. Design Considerations

### 6.1 Entry Point - Artist Roster Page

**Current State:**
- ArtistsLandingPage.tsx already has artist cards
- Cards already have an "Actions" dropdown button with menu items (Meet, Tour, Record, Release)
- "Meet" currently logs a message and does nothing (see ArtistRoster.tsx:29-31)

**Change Required:**
```
[Artist Card]
  Name: Diego Morales
  Mood: 46% | Energy: 70%

  [Actions ▼]
    ├─ Meet           ← RE-PURPOSE: Open dialogue modal (Section 6.2)
    ├─ Tour
    ├─ Record
    └─ Release
```

**Implementation Note:** The "Meet" option should trigger the dialogue modal instead of its current placeholder behavior.

### 6.2 Dialogue Modal (Minimal Design)

```
┌─────────────────────────────────────────┐
│  Artist Conversation: Nova              │
│  Mood: 46% | Energy: 70%                │
├─────────────────────────────────────────┤
│                                         │
│  "I'm putting in the work, but         │
│   nothing feels right. The songs       │
│   aren't connecting..."                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Try a different creative        │   │
│  │ approach                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Trust the process - art takes   │   │
│  │ time                            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Bring in fresh collaborators    │   │
│  └─────────────────────────────────┘   │
│                                         │
│                       [Cancel]          │
└─────────────────────────────────────────┘
```

**After Selection:**
```
┌─────────────────────────────────────────┐
│  Conversation Complete                  │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Nova appreciated your support       │
│                                         │
│  Effects:                              │
│  • Mood: +2                            │
│  • Money: -$3,000                      │
│                                         │
│  (Closing in 2 seconds...)             │
└─────────────────────────────────────────┘
```

### 6.3 XState Machine (Minimal)

```typescript
const artistDialogueMachine = createMachine({
  id: 'artistDialogue',
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: 'fetchDialogue',
        onDone: { target: 'displaying' },
        onError: { target: 'error' }
      }
    },
    displaying: {
      on: {
        SELECT_CHOICE: { target: 'submitting' },
        CANCEL: { target: 'closed' }
      }
    },
    submitting: {
      invoke: {
        src: 'submitChoice',
        onDone: { target: 'complete' },
        onError: { target: 'error' }
      }
    },
    complete: {
      after: {
        2000: { target: 'closed' }
      }
    },
    error: {
      on: {
        RETRY: { target: 'loading' },
        CANCEL: { target: 'closed' }
      }
    },
    closed: {
      type: 'final'
    }
  }
});
```

### 6.4 API Endpoint Design

**New Endpoint:**
```
POST /api/game/:gameId/artist-dialogue
```

**Request Body:**
```json
{
  "artistId": "artist_abc123",
  "sceneId": "dialogue_middle_mood_high_energy",
  "choiceId": "double_sessions"
}
```

**Response (Success):**
```json
{
  "success": true,
  "artistName": "Nova",
  "effects": {
    "artist_mood": 1,
    "money": -2000,
    "artist_energy": -2  // delayed effect (shown for transparency)
  },
  "message": "Conversation completed successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Artist not found",
  "code": "ARTIST_NOT_FOUND"
}
```

---

## 7. Technical Considerations

### 7.1 Affected Files

**New Files:**
- `client/src/machines/artistDialogueMachine.ts` - XState machine
- `client/src/components/artist-dialogue/ArtistDialogueModal.tsx` - Modal component
- `server/routes/artist-dialogue.ts` - API route (or add to existing routes.ts)

**Modified Files:**
- `client/src/pages/ArtistsLandingPage.tsx` - Add "Talk" option to MEET dropdown
- `client/src/components/ArtistRoster.tsx` - May need modification depending on structure
- `server/routes.ts` - Add artist dialogue endpoint
- `shared/engine/game-engine.ts` - Verify `processArtistDialogue()` works correctly

**Existing Files (No Changes Needed):**
- `data/dialogue.json` - Already created with 9 dialogues
- `server/data/gameData.ts` - Already has `getDialogueChoiceById()` method

### 7.2 Implementation Order

1. **Backend API** (Day 1-2)
   - Create `POST /api/game/:gameId/artist-dialogue` endpoint
   - Test with existing `processArtistDialogue()` method
   - Verify effects apply to correct artist

2. **XState Machine** (Day 2-3)
   - Create minimal `artistDialogueMachine.ts`
   - Implement service functions (fetchDialogue, submitChoice)
   - Test state transitions

3. **Modal Component** (Day 3-4)
   - Build `ArtistDialogueModal.tsx`
   - Connect to XState machine
   - Basic styling (modal, buttons, text)

4. **Integration** (Day 4-5)
   - Add "Talk" option to artist roster
   - Wire up modal trigger
   - Test end-to-end flow

5. **Testing & Polish** (Day 5-7)
   - Unit tests for dialogue selection
   - Integration test for full flow
   - Bug fixes and edge cases

### 7.3 Random Dialogue Selection Logic

Since MVP uses random selection (not mood/energy-based):

```typescript
// In API endpoint
async function getRandomDialogue() {
  const allDialogues = await gameData.loadDialogueData();
  const randomIndex = Math.floor(Math.random() * allDialogues.additional_scenes.length);
  return allDialogues.additional_scenes[randomIndex];
}
```

**Note:** This will be replaced in PRD-0002 with proper mood/energy range matching.

### 7.4 Backend Processing (Already Implemented)

The existing `processArtistDialogue()` method (game-engine.ts:3577) already:
- ✅ Loads dialogue choice from dialogue.json
- ✅ Applies effects via `applyEffects()`
- ✅ Queues delayed effects
- ✅ Logs to console

**Current Issue:** Uses global `summary.artistChanges.mood` (affects all artists)

**PRD-0003 Solution:** For MVP, this is acceptable. PRD-0002 will fix to per-artist targeting.

**Workaround for MVP:** Accept that mood changes affect all artists (document as known limitation).

### 7.5 Testing Strategy

**Unit Tests (Required per FR-9B):**

```typescript
// Test: Dialogue selection returns valid dialogue
test('getRandomDialogue returns dialogue from dialogue.json', async () => {
  const dialogue = await getRandomDialogue();
  expect(dialogue).toHaveProperty('id');
  expect(dialogue).toHaveProperty('prompt');
  expect(dialogue.choices).toHaveLength(3);
});

// Test: API endpoint validates artistId
test('POST /artist-dialogue requires valid artistId', async () => {
  const response = await request(app)
    .post('/api/game/game123/artist-dialogue')
    .send({ artistId: 'invalid', sceneId: 'dialogue_1', choiceId: 'choice_1' });
  expect(response.status).toBe(400);
});

// Test: Effects apply correctly
test('Dialogue effects update artist mood', async () => {
  const initialMood = 50;
  // ... test that selecting choice with +2 mood increases artist mood to 52
});
```

**Integration Test (Manual for MVP):**
1. Start game with 1 signed artist
2. Click "Talk to [Artist]" on roster page
3. Verify dialogue modal appears with prompt and 3 choices
4. Select choice with positive mood effect
5. Verify confirmation message shows effects
6. Verify artist mood increased in artist detail page
7. Advance week
8. Verify delayed effects applied

---

## 8. Success Metrics

**Metric 1**: Player can successfully trigger artist dialogue from roster page (100% success rate in testing)

**Metric 2**: Dialogue selection returns valid dialogue from dialogue.json (100% success rate)

**Metric 3**: Effects apply to artist and persist (verified via database inspection)

**Metric 4**: Modal opens, displays, and closes without errors (100% success rate)

**Metric 5**: Unit tests pass for dialogue selection and effect application (100% pass rate)

---

## 9. Open Questions

**Q1**: Should the "Meet" option be always visible, or only when certain conditions are met (e.g., artist mood below threshold)?
- **Impact**: UX clarity vs gameplay complexity
- **Decision**: ✅ Always visible for MVP
- **Rationale**: Simplifies UX and allows players to build relationships proactively

**Q2**: What happens if the player triggers a dialogue but closes the browser before selecting a choice?
- **Impact**: Potential for lost dialogue opportunities or state corruption
- **Decision**: ✅ No persistence needed for MVP (player just reopens dialogue)
- **Rationale**: Keeps implementation simple; no state corruption risk since nothing is saved until choice is submitted

**Q3**: Should we show artist mood/energy stats in the dialogue modal for context?
- **Impact**: Player understanding of why they're seeing this dialogue
- **Decision**: ✅ Yes - Display mood/energy in the dialogue modal
- **Rationale**: Provides context for player decisions and helps them understand their artist's current state

**Q4**: How should we handle the edge case where dialogue.json has 0 scenes (corrupted file)?
- **Impact**: Error handling and graceful degradation
- **Decision**: ✅ Return 500 error with message "Dialogue system unavailable"
- **Rationale**: Clear error message helps with debugging; prevents silent failures

**Q5**: Should we log dialogue interactions to analytics/telemetry?
- **Impact**: Data collection for future balancing
- **Decision**: ✅ No analytics for MVP - defer to future initiative
- **Rationale**: Keeps scope minimal; analytics can be added later without affecting core functionality

---

## 10. Implementation Phases

### Phase 1: Backend Foundation (Days 1-2)
- Create API endpoint `/api/game/:gameId/artist-dialogue`
- Implement random dialogue selection from dialogue.json
- Test with existing `processArtistDialogue()` method
- Write unit tests for API endpoint

### Phase 2: XState Machine (Days 2-3)
- Create `artistDialogueMachine.ts` with 6 states
- Implement service functions (fetch, submit)
- Test state transitions in isolation
- Write unit tests for machine logic

### Phase 3: Modal UI (Days 3-5)
- Build `ArtistDialogueModal.tsx` component
- Connect to XState machine
- Implement minimal styling (shadcn modal component)
- Add loading states and error handling

### Phase 4: Integration (Days 5-6)
- Add "Talk" option to artist roster MEET dropdown
- Wire up modal trigger on click
- Test end-to-end flow with real game data
- Fix integration bugs

### Phase 5: Testing & Validation (Days 6-7)
- Run unit tests (dialogue selection, API, state machine)
- Manual integration testing (full flow)
- Edge case testing (errors, invalid data)
- Performance testing (modal load time)

### Phase 6: Handoff to PRD-0002
- Document known limitations (global mood effects, random selection)
- Create migration notes for PRD-0002
- Update PRD-0002 with actual implementation details

---

## 11. Acceptance Criteria

This PRD is considered complete and ready for handoff to PRD-0002 when:

✅ **AC-1**: Player can click "Talk" on any signed artist in roster page

✅ **AC-2**: Dialogue modal opens with prompt and 3 choices from dialogue.json

✅ **AC-3**: Selecting a choice submits to backend and applies effects

✅ **AC-4**: Confirmation message shows applied effects (mood, money, etc.)

✅ **AC-5**: Artist mood/energy update in database after dialogue

✅ **AC-6**: Modal closes automatically after 2 seconds

✅ **AC-7**: Unit tests pass for dialogue selection and API endpoint

✅ **AC-8**: Manual testing confirms full end-to-end flow works

✅ **AC-9**: Error handling prevents crashes on invalid data

✅ **AC-10**: No regressions in existing artist roster functionality

---

## 12. Known Limitations (To Be Fixed in PRD-0002)

**Limitation 1**: Dialogue selection is random (does not consider mood/energy ranges)
- **Impact**: Dialogues may not match artist's emotional state
- **Fix in**: PRD-0002 implements mood/energy-based selection

**Limitation 2**: Mood effects apply globally (all artists affected)
- **Impact**: Choosing response for Nova changes all artists' moods
- **Fix in**: PRD-0002 implements per-artist mood targeting

**Limitation 3**: No dialogue frequency limits
- **Impact**: Player can spam dialogues unlimited times
- **Fix in**: PRD-0002 adds focus slot consumption and limits

**Limitation 4**: No dialogue history tracking
- **Impact**: Player sees same dialogues repeatedly
- **Fix in**: PRD-0002 adds tracking to avoid repeats

**Limitation 5**: Week summary doesn't highlight dialogue interactions
- **Impact**: Player doesn't see clear feedback in week summary
- **Fix in**: PRD-0002 adds dialogue-specific week summary entries

---

## 13. Next Steps

1. **Review this PRD** with stakeholders/technical lead
2. **Approve for implementation** (expected: 1-2 weeks)
3. **Begin Phase 1** - Backend API endpoint
4. **Demo after Phase 3** - Show working modal to validate UX
5. **Complete all phases** - Ship basic artist dialogue UI
6. **Proceed to PRD-0002** - Build full mood targeting system

---

**Document Version**: 1.0
**Created**: 2025-10-07
**Status**: Draft - Awaiting Review
**Dependencies**: None (unblocks PRD-0002)
**Blocks**: PRD-0002 (Mood System Reimplementation)
**Estimated Timeline**: 1-2 weeks (7-10 working days)
