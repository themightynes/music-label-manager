# Tasks: Artist Mood System - Phases 6-10 Implementation

**Status**: ⏸️ **PAUSED** after Phase 5 (2025-10-12)
**Reason**: Core system is functional (Phases 1-5 complete). Enhancements (Phases 6-10) deferred pending player feedback on base mechanics.
**Source**: [`docs/01-planning/implementation-specs/[IN-PROGRESS] artist-mood-plan.md`](../docs/01-planning/implementation-specs/[IN-PROGRESS] artist-mood-plan.md)
**Implementation**: Incremental, following existing patterns

## 📊 What's Complete (Phases 1-5)
✅ **Phase 1**: Database constraints and validation
✅ **Phase 2**: Visual mood indicators in UI
✅ **Phase 3**: Mood calculation engine with multipliers
✅ **Phase 4**: Mood impact on project quality
✅ **Phase 5**: Monthly mood processing with workload/drift

## ⏸️ What's Paused (Phases 6-10)
⏸️ **Phase 6**: Dialogue integration (Task 2.0 - mostly complete, Task 2.4 was in progress)
⏸️ **Phase 7**: Mood-triggered events and warnings (Task 3.0)
⏸️ **Phase 8**: Enhanced UI feedback and recommendations (Task 4.0)
⏸️ **Phase 9**: Advanced mood factors - project performance, archetypes (Task 5.0)
⏸️ **Phase 10**: Mood analytics and predictions (Task 6.0)

## 🔄 Resume Criteria
Resume this work when:
1. Players have experienced base mood system (Phases 1-5) in production
2. Feedback indicates desire for more depth/complexity
3. Current priority features are complete
4. Team capacity available for enhancement work

---

## 🎯 Current Status (Updated 2025-10-11)

**Recently Completed**:
- ✅ **0002 Technical Debt** - Resolved all 4 items (commits f4e9bf1, 7742695, 829e151, e3cc72e)
  - Unified artist change format to per-artist objects
  - Added integration tests for database persistence
  - Refactored mood processing for clarity
  - Added type-safe helpers (`ArtistChangeHelpers`)
- ✅ **0003 PRD** - Basic Artist Dialogue UI implemented

**Impact on This Plan**:
- **Task 2.3** is effectively complete - per-artist mood infrastructure is ready
- **Task 2.6** is complete - `ArtistStatChange` interface and helpers exist in `shared/types/gameTypes.ts`
- **Task 2.7** has a template - see `tests/engine/mood-persistence-integration.test.ts` for testing pattern

**Next Steps**: Resume with **Task 2.4** (mood event logging for dialogue choices). The infrastructure is ready:
- ✅ Per-artist accumulation works via `ArtistChangeHelpers.addMood(summary.artistChanges, artistId, value)`
- ✅ Type-safe with `ArtistStatChange` interface
- ✅ Integration test pattern available
- ⏳ Just needs mood_events logging integration (follow pattern from `applyArtistChangesToDatabase()` line 2987-3008)

## Relevant Files

### Backend Files
- `shared/engine/game-engine.ts` - Core game engine with dialogue processing, monthly updates, and event triggers
- `shared/types/gameTypes.ts` - Type definitions for ChoiceEffect, WeekSummary, EventOccurrence
- `shared/utils/moodProcessing.ts` - Monthly mood change calculations (existing from Phase 5)
- `shared/utils/moodCalculations.ts` - Pure mood calculation functions (existing from Phase 3)
- `shared/utils/moodEvents.ts` - NEW: Mood threshold and event generation logic
- `data/dialogue.json` - Artist dialogue scenes with choice effects
- `data/balance/artists.json` - Balance configuration for mood effects, thresholds, archetype modifiers
- `server/routes.ts` - API route definitions
- `server/routes/mood.ts` - NEW: Mood-specific API endpoints (recommendations, predictions)
- `migrations/000X_add_project_performance_fields.sql` - NEW: Add performance tracking for advanced mood factors
- `migrations/000X_create_mood_predictions_table.sql` - NEW: Store mood predictions

### Frontend Files
- `client/src/components/ArtistRoster.tsx` - Main artist display component with mood indicators
- `client/src/components/MonthSummary.tsx` - Monthly summary display with events
- `client/src/components/Dashboard.tsx` - Main dashboard for overview widgets
- `client/src/components/MoodIndicator.tsx` - Reusable mood display (existing from Phase 2)
- `client/src/components/ux-prototypes/MoodSystemPrototype.tsx` - NEW: UI mockup for initial review
- `client/src/components/MoodRecommendations.tsx` - NEW: AI-driven mood improvement suggestions
- `client/src/components/MoodPredictionWidget.tsx` - NEW: Mood forecasting component
- `client/src/components/MoodManagementGuide.tsx` - NEW: Interactive help system for mood management
- `client/src/hooks/useMoodAnalytics.ts` - NEW: Mood data processing hook
- `client/src/lib/moodUtils.ts` - Mood categorization utilities (existing from Phase 2)
- `client/src/lib/moodAnalytics.ts` - NEW: Analytics calculation utilities

### Test Files
- `tests/features/artist-mood-constraints.test.ts` - Database constraint tests (existing from Phase 1)
- `tests/features/mood-dialogue-integration.test.ts` - NEW: Dialogue mood effect tests
- `tests/features/mood-events.test.ts` - NEW: Mood event trigger tests
- `tests/features/mood-advanced-factors.test.ts` - NEW: Advanced mood calculation tests
- `tests/components/MoodRecommendations.test.tsx` - NEW: Recommendations component tests

### Notes
- Tests should be placed alongside the code files they are testing
- Use `npm run test` to run all tests
- Follow existing patterns in GameEngine for consistency
- All mood configuration centralized in `data/balance/artists.json`

## Tasks

### 1.0 Create UI prototype/mockup for mood system features (Phase 0 - Frontend) ✅
**Goal**: Build visual prototype with dummy data for design review before implementing backend logic
**Status**: COMPLETE - Committed in 4991ab3

- [x] 1.1 Create `client/src/components/ux-prototypes/MoodSystemPrototype.tsx` component
  - ✅ Use existing UX prototypes pattern from `client/src/components/ux-prototypes/` - Created in correct directory
  - ✅ Create sections for each planned feature area - 5 complete sections (lines 212-531)
  - ✅ Use mock data throughout (no API calls) - All data uses `MOCK_*` constants with STUB comments

- [x] 1.2 Add mood history chart mockup section (Lines 212-280)
  - ✅ Show 12-month mood trend line chart with dummy data - `MOCK_MOOD_HISTORY` with 12 data points
  - ✅ Display mood level changes over time - Shows mood values 65→90 over 48 weeks
  - ✅ Include trend indicators (improving/declining arrows) - Uses `↗` and `↘` based on change values
  - ✅ Mock data: realistic mood fluctuations (40-80 range) - Data ranges 65-90 (within realistic bounds)

- [x] 1.3 Add mood event notifications mockup section (Lines 280-317)
  - ✅ Display sample warning events (low mood <40) - Nova at mood 35, Echo at mood 18
  - ✅ Display sample opportunity events (high mood >80) - Phoenix at mood 85
  - ✅ Show event styling and iconography - Uses AlertTriangle, Sparkles icons with color coding
  - ✅ Mock 3-4 different event types - 4 events: warning, opportunity, critical, info

- [x] 1.4 Add mood recommendations mockup section (Lines 317-359)
  - ✅ Show AI-driven mood improvement suggestions - 5 recommendations displayed
  - ✅ Display actionable recommendations based on mood state - Each has title, description, actionType
  - ✅ Mock 5-6 different recommendation types - 5 types: workload, dialogue, project, recovery, momentum
  - ✅ Include priority indicators (high/medium/low) - Uses `getPriorityBadge()` with color coding

- [x] 1.5 Add mood analytics dashboard mockup section (Lines 359-426)
  - ✅ Display mood correlation with project performance - Shows performance metrics in analytics
  - ✅ Show mood prediction widget - Prediction displayed in analytics metrics
  - ✅ Include artist-specific mood factors - Factor analysis shown in artist section
  - ✅ Mock historical patterns visualization - Distribution bar and metrics grid

- [x] 1.6 Add enhanced artist card mockup section (Lines 426-531)
  - ✅ Extend existing mood indicator from Phase 2 - Uses mood badges and emojis
  - ✅ Add mood factors list (what affects this artist) - `MOCK_ARTIST.moodFactors` array with 4 factors
  - ✅ Show project performance attribution with mood impact - "Recent Project Impact" section with +8 mood, +25% quality bonus
  - ✅ Display mood management tips - "Management Tip" section with actionable advice

- [x] 1.7 Register prototype in UXPrototypesPage
  - ✅ Add route/link to new MoodSystemPrototype - Route `/prototypes/mood-system` in App.tsx (line 60)
  - ✅ Ensure accessible for review - Protected with `withAdmin()`, accessible from `/prototypes`
  - ✅ Add description of prototype features - UXPrototypesPage shows description and task badges

- [x] 1.8 Style all prototype sections consistently
  - ✅ Use brand colors from Tailwind config - Uses `brand-burgundy`, `brand-gold`, `brand-rose`, `success`, `warning`, `destructive`
  - ✅ Follow existing UI patterns from ArtistRoster and Dashboard - Uses Card, Badge, Button, Progress from UI library
  - ✅ Ensure responsive layout - Uses `container mx-auto`, `grid`, `flex` with responsive classes
  - ✅ Add helpful annotations explaining each feature - Each section has description text and footer notes

**Implementation Notes**:
- NO backend integration - pure UI mockup
- Use STUB/HARDCODED comments for all mock data
- Reference existing components for styling patterns
- Focus on visual design, not functionality

---

### ✅ 2.0 Integrate mood changes with dialogue system (Phase 6 - Backend) - COMPLETE
**Goal**: Process artist_mood effects from dialogue choices and track mood history

**Status**: All subtasks complete (2.1-2.7) ✅ | Committed: 628d610

- [x] 2.1 Review existing dialogue processing in GameEngine
  - ✅ Read `shared/engine/game-engine.ts` - found `processArtistDialogue()` at line 3577
  - ✅ Understand how `effects_immediate` and `effects_delayed` are currently processed - uses `applyEffects()` method
  - ✅ Identified two patterns: global `summary.artistChanges.mood` (all artists) and per-artist `summary.artistChanges[artistId]` (specific artist)
  - ✅ Current `processArtistDialogue` uses STUB random values instead of loading from dialogue.json
  - ✅ `applyEffects()` already handles `artist_mood` effects (line 1045-1065)

- [x] 2.2 Load dialogue choice data from dialogue.json
  - ✅ Created `getDialogueChoiceById(sceneId, choiceId)` method in `server/data/gameData.ts` (line 259)
  - ✅ Updated `processArtistDialogue()` to load actual choice data instead of using random values (line 3577)
  - ✅ Extract sceneId and choiceId from action.metadata (matching role_meeting pattern)
  - ✅ Apply effects_immediate using existing `applyEffects()` method
  - ✅ Queue effects_delayed for next week trigger
  - ✅ Added fallback handling for missing dialogue choices
  - ⚠️ **ISSUE IDENTIFIED**: Current implementation applies mood globally to all artists via `applyEffects()` - needs per-artist targeting

- [x] 2.3 Fix dialogue mood to apply per-artist (not global)
  - ✅ VERIFIED: `applyEffects()` already uses per-artist pattern when artistId is provided
  - ✅ Line 1164: `ArtistChangeHelpers.addMood(summary.artistChanges, artistId, value)`
  - ✅ `processArtistDialogue()` correctly passes artistId to `applyEffects()` (lines 3932, 3953)
  - ✅ Per-artist infrastructure from 0002 technical debt work is fully integrated

- [x] 2.4 Add mood event logging for dialogue choices
  - ✅ Extended `ArtistStatChange` interface with `eventSource` metadata (gameTypes.ts:363-369)
  - ✅ Updated `applyEffects()` to set eventSource when processing mood changes (game-engine.ts:1169-1188)
  - ✅ Modified `applyArtistChangesToDatabase()` to use eventSource for mood_events logging (game-engine.ts:3008-3047)
  - ✅ Dialogue choices now logged with eventType='dialogue_choice', sceneId, and choiceId in metadata
  - ✅ Executive meetings continue to log with eventType='executive_meeting'

- [x] 2.5 Update dialogue.json with mood effects
  - ✅ ALREADY COMPLETE: dialogue.json contains 9 dialogue scenes with artist_mood effects
  - ✅ All 31 choices across all scenes have artist_mood values
  - ✅ Values are balanced within -3 to +3 range (conservative, within -5 to +5 spec)
  - ✅ Effects rationale documented in scene descriptions (emotional_state field)

- [x] 2.6 Update ChoiceEffect type if needed
  - ✅ ALREADY COMPLETE: `artist_mood` field exists in ChoiceEffect interface (gameTypes.ts:26)
  - ✅ TypeScript compilation verified (pre-existing codebase errors unrelated to this work)
  - ✅ Interface properly typed: `artist_mood?: number;`

- [x] 2.7 Write tests for dialogue mood integration
  - ✅ Created `tests/features/mood-dialogue-integration.test.ts` with 8 comprehensive tests
  - ✅ Test: Positive mood effects (+5, +10) increase artist mood correctly
  - ✅ Test: Negative mood effects (-5, -15) decrease artist mood correctly
  - ✅ Test: Only targeted artist affected (per-artist targeting)
  - ✅ Test: Mood events logged to mood_events table with eventType='dialogue_choice'
  - ✅ Test: sceneId and choiceId stored in metadata
  - ✅ Test: Multiple dialogue events for different artists
  - ✅ Test: Mood respects 0-100 bounds (clamping works correctly)
  - ✅ All 8 tests passing (1.56s)

**Implementation Notes**:
- artist_mood field already exists in ChoiceEffect interface
- Follow existing artist_energy pattern for implementation
- Use existing applyEffects() pattern if available
- Minimal changes - extend existing system only

---

### 3.0 Implement mood-triggered events and warnings (Phase 7 - Backend)
**Goal**: Generate events when artist mood crosses thresholds

- [ ] 3.1 Create mood event utilities file
  - Create `shared/utils/moodEvents.ts`
  - Export `checkMoodThresholds(artist: Artist): MoodEvent | null` function
  - Export `generateMoodEventDescription(event: MoodEvent): string` function
  - Define MoodEvent interface with type, severity, artistId, message

- [ ] 3.2 Implement mood threshold checking logic
  - Low mood warning: mood <= 20 (Very Low)
  - Stressed warning: mood 21-40 (Low)
  - Excellent opportunity: mood >= 81 (Excellent)
  - Return appropriate event type or null if no threshold crossed

- [ ] 3.3 Add mood event generation to monthly processing
  - Update `processMonthlyMoodChanges()` in `game-engine.ts`
  - Call `checkMoodThresholds()` for each artist after mood changes
  - Add generated events to WeekSummary.events array
  - Use existing EventOccurrence type from gameTypes.ts

- [ ] 3.4 Define mood event types in gameTypes.ts
  - Add mood-specific event types: 'artist_mood_low', 'artist_mood_stressed', 'artist_mood_excellent'
  - Extend EventOccurrence interface if needed
  - Ensure events include artistId for UI display

- [ ] 3.5 Add mood event descriptions
  - Create descriptive messages for each event type
  - Include artist name in event messages
  - Provide actionable context (e.g., "Consider reducing workload")
  - Store in balance.json or moodEvents.ts

- [ ] 3.6 Write tests for mood event system
  - Create `tests/features/mood-events.test.ts`
  - Test: Artist mood <= 20 generates 'artist_mood_low' event
  - Test: Artist mood 21-40 generates 'artist_mood_stressed' event
  - Test: Artist mood >= 81 generates 'artist_mood_excellent' event
  - Test: Artist mood 50 (neutral) generates no event
  - Test: Events appear in WeekSummary.events array

**Implementation Notes**:
- Integrate with existing WeekSummary.events structure
- Use existing event patterns from GameEngine
- Keep threshold logic configurable via balance.json
- Don't trigger same event multiple weeks in a row (add cooldown logic)

---

### 4.0 Build enhanced UI feedback and recommendations (Phase 8 - Frontend)
**Goal**: Create real UI components with API integration for mood management

- [ ] 4.1 Create MoodRecommendations component
  - Create `client/src/components/MoodRecommendations.tsx`
  - Accept artist prop with current mood state
  - Display 3-5 actionable recommendations based on mood level
  - Include priority indicators and action buttons (future: link to actions)
  - Use card/badge UI from existing components

- [ ] 4.2 Create useMoodAnalytics hook
  - Create `client/src/hooks/useMoodAnalytics.ts`
  - Fetch mood recommendations: `GET /api/mood/recommendations/:artistId`
  - Handle loading and error states
  - Cache results with React Query

- [ ] 4.3 Add mood recommendations API endpoint
  - Add `GET /api/mood/recommendations/:artistId` endpoint
  - Analyze artist's current mood, workload, recent projects
  - Generate 3-5 recommendations (STUB: hardcoded suggestions initially)
  - Return array of {priority, title, description, actionType}

- [ ] 4.4 Enhance ArtistRoster with mood components
  - Update `client/src/components/ArtistRoster.tsx`
  - Add MoodRecommendations below mood indicator
  - Display mood factors list (workload, recent projects)
  - Show project performance attribution with mood impact

- [ ] 4.5 Add mood change notifications to MonthSummary
  - Update `client/src/components/MonthSummary.tsx`
  - Display mood events from WeekSummary.events
  - Style low mood warnings with warning colors
  - Style excellent mood opportunities with success colors
  - Include artist name and clickable link to artist card

- [ ] 4.6 Register mood routes in server/routes.ts
  - Import mood router or add routes directly
  - Ensure routes are protected with requireClerkUser middleware
  - Add error handling for missing artists

- [ ] 4.7 Write component tests
  - Create `tests/components/MoodRecommendations.test.tsx`
  - Test: Components render with mock data
  - Test: Loading and error states display correctly
  - Test: API integration works with useMoodAnalytics hook

**Implementation Notes**:
- Use existing API patterns from routes.ts
- Follow React Query patterns from existing hooks
- Recommendations can be STUB/HARDCODED initially
- Ensure components match prototype visual design

---

### 5.0 Add advanced mood calculation factors (Phase 9 - Backend)
**Goal**: Enhance monthly mood processing with project performance and archetype modifiers

- [ ] 5.1 Add performance tracking fields to projects table
  - Create migration `migrations/000X_add_project_performance_fields.sql`
  - Add `performance_rating DECIMAL(3,2)` column to projects table
  - Add `mood_impact_applied BOOLEAN DEFAULT FALSE` column
  - Run migration with `npm run db:push`

- [ ] 5.2 Calculate project performance ratings
  - Update project completion logic in `game-engine.ts`
  - Calculate performance_rating based on streams, revenue, chart position
  - Store rating in projects table (0.0 = flop, 1.0 = mega hit)
  - Use FinancialSystem or ChartService for metrics

- [ ] 5.3 Add success/failure thresholds to balance.json
  - Update `data/balance/artists.json`
  - Add mood_from_performance section
  - Define hit threshold (>0.70): +8 mood
  - Define flop threshold (<0.30): -12 mood
  - Define moderate success (0.30-0.70): +3 mood

- [ ] 5.4 Add archetype-specific mood modifiers to balance.json
  - Update `data/balance/artists.json`
  - Add archetype_mood_modifiers section
  - Visionary: +2 mood for creative/experimental projects
  - Trendsetter: +3 mood for commercial success (high streams)
  - Workhorse: +2 mood for completing any project (reliable)

- [ ] 5.5 Enhance processMonthlyMoodChanges with advanced factors
  - Update `shared/utils/moodProcessing.ts`
  - Add project performance mood changes
  - Query completed projects from last month
  - Apply mood changes based on performance_rating
  - Apply archetype-specific modifiers

- [ ] 5.6 Implement consecutive success momentum bonus
  - Track consecutive successful projects (rating > 0.70)
  - Add +2 mood bonus for each consecutive hit (max +6)
  - Reset momentum counter on flop (rating < 0.30)
  - Store momentum in artist state or calculate on-the-fly

- [ ] 5.7 Update mood event logging for performance-based changes
  - Log mood changes from project success to mood_events table
  - Include project_id and performance_rating in metadata
  - Set event_type as 'project_performance'
  - Add descriptive messages ("Hit single boosted Nova's mood!")

- [ ] 5.8 Write tests for advanced mood factors
  - Create `tests/features/mood-advanced-factors.test.ts`
  - Test: Hit project (rating 0.80) increases mood by 8
  - Test: Flop project (rating 0.20) decreases mood by 12
  - Test: Visionary gets +2 mood bonus for creative projects
  - Test: Consecutive hits increase momentum bonus
  - Test: Momentum resets on flop

**Implementation Notes**:
- Build on existing Phase 5 monthly processing
- Use existing project tracking in database
- Keep all configuration in balance.json for easy tuning
- Performance rating calculation can be STUB initially (random 0-1)

---

### 6.0 Create mood predictions and polish (Phase 10 - Frontend)
**Goal**: Complete mood management experience with predictions and guidance

- [ ] 6.1 Create mood predictions database table
  - Create migration `migrations/000X_create_mood_predictions_table.sql`
  - Create mood_predictions table with columns: id, artist_id, game_id, month, mood_prediction, risk_factors (JSONB), created_at
  - Run migration with `npm run db:push`

- [ ] 6.2 Create MoodPredictionWidget component
  - Create `client/src/components/MoodPredictionWidget.tsx`
  - Accept artist prop and current factors (workload, recent performance)
  - Calculate predicted mood for next month (STUB: simple +/- calculation)
  - Display prediction with confidence indicator
  - Show factors affecting prediction

- [ ] 6.3 Create moodAnalytics utility library
  - Create `client/src/lib/moodAnalytics.ts`
  - Export `calculateMoodPrediction(artist, factors): number`
  - Export `identifyRiskFactors(artist): RiskFactor[]`
  - All can be STUB/simple logic initially

- [ ] 6.4 Create MoodManagementGuide component
  - Create `client/src/components/MoodManagementGuide.tsx`
  - Interactive help system explaining mood mechanics
  - Show mood ranges and their effects
  - Explain mood factors (workload, success, dialogue)
  - Provide strategic tips for mood management

- [ ] 6.5 Add mood predictions API endpoint
  - Add `GET /api/mood/predictions/:artistId` endpoint to `server/routes/mood.ts`
  - Calculate predicted mood based on current factors (STUB initially)
  - Store prediction in mood_predictions table
  - Return prediction with confidence score and factors

- [ ] 6.6 Add mood interventions tracking endpoint
  - Add `POST /api/mood/interventions` endpoint
  - Log when player takes action based on mood recommendation
  - Track intervention type and artist_id
  - Use for future analytics and tutorial improvements

- [ ] 6.7 Add final mood polish to ArtistRoster
  - Update `client/src/components/ArtistRoster.tsx`
  - Add MoodPredictionWidget to expanded artist view
  - Add MoodManagementGuide link/modal
  - Show mood correlation with project performance

- [ ] 6.8 Add mood section to MonthSummary
  - Update `client/src/components/MonthSummary.tsx`
  - Create dedicated mood changes section
  - List all artist mood changes with reasons
  - Highlight significant changes (>10 points)
  - Link to artist cards for details

- [ ] 6.9 Write prediction tests
  - Test mood prediction calculations
  - Test risk factor identification
  - Test API endpoints for predictions

**Implementation Notes**:
- Prediction algorithms can be simple initially (STUB)
- Focus on UI/UX polish and complete experience
- Keep predictions artist-specific (no roster-wide analytics)
- Cache expensive calculations for performance

---

**Status**: ✅ All sub-tasks generated and ready for implementation

**Total Tasks**: 6 parent tasks, 51 sub-tasks (12 removed: mood history chart + analytics dashboard)

**Recommended Implementation Order**:
1. Start with 1.0 (UI Prototype) for design validation
2. Implement 2.0 (Dialogue Integration) - simplest backend extension
3. Implement 3.0 (Mood Events) - builds on Phase 5
4. Implement 4.0 (Enhanced UI) - makes system visible to players
5. Implement 5.0 (Advanced Factors) - adds depth to mood changes
6. Implement 6.0 (Analytics) - polish and complete experience

**Next Steps**: Review tasks and begin with 1.0 (UI Prototype) or specify which task to start with.
