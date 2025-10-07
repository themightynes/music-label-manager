# Tasks: Artist Mood System - Phases 6-10 Implementation

**Source**: `docs/01-planning/implementation-specs/[IN-PROGRESS] artist-mood-plan.md`
**Status**: Phases 1-5 completed, implementing Phases 6-10
**Implementation**: Incremental, following existing patterns

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
- `server/routes/mood.ts` - NEW: Mood-specific API endpoints (history, recommendations, analytics)
- `migrations/000X_add_project_performance_fields.sql` - NEW: Add performance tracking for advanced mood factors
- `migrations/000X_create_mood_analytics_table.sql` - NEW: Store mood analytics and predictions

### Frontend Files
- `client/src/components/ArtistRoster.tsx` - Main artist display component with mood indicators
- `client/src/components/MonthSummary.tsx` - Monthly summary display with events
- `client/src/components/Dashboard.tsx` - Main dashboard for overview widgets
- `client/src/components/MoodIndicator.tsx` - Reusable mood display (existing from Phase 2)
- `client/src/components/ux-prototypes/MoodSystemPrototype.tsx` - NEW: UI mockup for initial review
- `client/src/components/MoodHistoryChart.tsx` - NEW: Mood trend visualization over time
- `client/src/components/MoodRecommendations.tsx` - NEW: AI-driven mood improvement suggestions
- `client/src/components/MoodAnalyticsDashboard.tsx` - NEW: Comprehensive mood analytics view
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
- `tests/components/MoodHistoryChart.test.tsx` - NEW: Mood chart component tests
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

### 2.0 Integrate mood changes with dialogue system (Phase 6 - Backend)
**Goal**: Process artist_mood effects from dialogue choices and track mood history

- [ ] 2.1 Review existing dialogue processing in GameEngine
  - Read `shared/engine/game-engine.ts` - find `processArtistDialogue()` or similar method
  - Understand how `effects_immediate` and `effects_delayed` are currently processed
  - Identify where to inject mood change logic

- [ ] 2.2 Extend dialogue processing to handle artist_mood effects
  - Update dialogue processing method in `game-engine.ts`
  - Extract `artist_mood` from choice `effects_immediate`
  - Apply mood changes to artist's mood field
  - Ensure mood stays within 0-100 bounds
  - Follow existing pattern for `artist_energy` effects

- [ ] 2.3 Add mood event logging for dialogue choices
  - Insert mood change records into `mood_events` table (from Phase 5)
  - Store event_type as 'dialogue_choice'
  - Include choice_id and dialogue_id in metadata
  - Record mood_change amount and description

- [ ] 2.4 Update dialogue.json with mood effects
  - Add `artist_mood` field to existing dialogue choices
  - Start with 3-5 dialogue scenes for testing
  - Use balanced values: -5 to +5 for most choices
  - Document mood effect rationale in comments

- [ ] 2.5 Update ChoiceEffect type if needed
  - Verify `artist_mood` is properly typed in `shared/types/gameTypes.ts`
  - Ensure TypeScript compilation passes
  - Update JSDoc comments to document mood effects

- [ ] 2.6 Write tests for dialogue mood integration
  - Create `tests/features/mood-dialogue-integration.test.ts`
  - Test: Dialogue choice with +5 mood increases artist mood by 5
  - Test: Dialogue choice with -5 mood decreases artist mood by 5
  - Test: Mood changes are logged to mood_events table
  - Test: Mood respects 0-100 bounds (can't go below 0 or above 100)

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

### 4.0 Build enhanced UI feedback and mood history (Phase 8 - Frontend)
**Goal**: Create real UI components with API integration for mood management

- [ ] 4.1 Create MoodHistoryChart component
  - Create `client/src/components/MoodHistoryChart.tsx`
  - Accept artistId prop and fetch mood history data
  - Render line chart showing mood over time (use recharts or similar)
  - Display mood level ranges with color coding
  - Add trend indicators (↗️ improving, ↘️ declining)

- [ ] 4.2 Create MoodRecommendations component
  - Create `client/src/components/MoodRecommendations.tsx`
  - Accept artist prop with current mood state
  - Display 3-5 actionable recommendations based on mood level
  - Include priority indicators and action buttons (future: link to actions)
  - Use card/badge UI from existing components

- [ ] 4.3 Create useMoodAnalytics hook
  - Create `client/src/hooks/useMoodAnalytics.ts`
  - Fetch mood history data for artist: `GET /api/artists/:id/mood-history`
  - Fetch mood recommendations: `GET /api/mood/recommendations/:artistId`
  - Handle loading and error states
  - Cache results with React Query

- [ ] 4.4 Add mood history API endpoint
  - Create `server/routes/mood.ts` if needed
  - Add `GET /api/artists/:id/mood-history` endpoint
  - Query mood_events table for artist's mood changes
  - Return array of {week, mood, change, event_type}
  - Limit to last 52 weeks (1 year)

- [ ] 4.5 Add mood recommendations API endpoint
  - Add `GET /api/mood/recommendations/:artistId` endpoint
  - Analyze artist's current mood, workload, recent projects
  - Generate 3-5 recommendations (STUB: hardcoded suggestions initially)
  - Return array of {priority, title, description, actionType}

- [ ] 4.6 Enhance ArtistRoster with mood components
  - Update `client/src/components/ArtistRoster.tsx`
  - Add MoodHistoryChart to expanded artist view
  - Add MoodRecommendations below mood indicator
  - Display mood factors list (workload, recent projects)
  - Show project performance attribution with mood impact

- [ ] 4.7 Add mood change notifications to MonthSummary
  - Update `client/src/components/MonthSummary.tsx`
  - Display mood events from WeekSummary.events
  - Style low mood warnings with warning colors
  - Style excellent mood opportunities with success colors
  - Include artist name and clickable link to artist card

- [ ] 4.8 Register mood routes in server/routes.ts
  - Import mood router or add routes directly
  - Ensure routes are protected with requireClerkUser middleware
  - Add error handling for missing artists

- [ ] 4.9 Write component tests
  - Create `tests/components/MoodHistoryChart.test.tsx`
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

### 6.0 Create comprehensive mood analytics and polish (Phase 10 - Frontend)
**Goal**: Complete mood management experience with analytics and predictive features

- [ ] 6.1 Create mood analytics database table
  - Create migration `migrations/000X_create_mood_analytics_table.sql`
  - Create mood_analytics table with columns: id, artist_id, game_id, month, mood_prediction, risk_factors (JSONB), recommendations (JSONB), created_at
  - Run migration with `npm run db:push`

- [ ] 6.2 Create MoodAnalyticsDashboard component
  - Create `client/src/components/MoodAnalyticsDashboard.tsx`
  - Display mood overview for all artists in roster
  - Show mood distribution (how many artists in each mood range)
  - Highlight artists needing attention (mood < 40)
  - Include roster-wide mood trends

- [ ] 6.3 Create MoodPredictionWidget component
  - Create `client/src/components/MoodPredictionWidget.tsx`
  - Accept artist prop and current factors (workload, recent performance)
  - Calculate predicted mood for next month (STUB: simple +/- calculation)
  - Display prediction with confidence indicator
  - Show factors affecting prediction

- [ ] 6.4 Create moodAnalytics utility library
  - Create `client/src/lib/moodAnalytics.ts`
  - Export `calculateMoodPrediction(artist, factors): number`
  - Export `identifyRiskFactors(artist): RiskFactor[]`
  - Export `generateRecommendations(artist, risks): Recommendation[]`
  - All can be STUB/simple logic initially

- [ ] 6.5 Create MoodManagementGuide component
  - Create `client/src/components/MoodManagementGuide.tsx`
  - Interactive help system explaining mood mechanics
  - Show mood ranges and their effects
  - Explain mood factors (workload, success, dialogue)
  - Provide strategic tips for mood management

- [ ] 6.6 Add mood analytics API endpoint
  - Add `GET /api/mood/analytics/:gameId` endpoint to `server/routes/mood.ts`
  - Calculate mood statistics for all artists in game
  - Return mood distribution, average mood, artists at risk
  - Cache results for performance

- [ ] 6.7 Add mood predictions API endpoint
  - Add `GET /api/mood/predictions/:artistId` endpoint
  - Calculate predicted mood based on current factors (STUB initially)
  - Store prediction in mood_analytics table
  - Return prediction with confidence score and factors

- [ ] 6.8 Add mood interventions tracking endpoint
  - Add `POST /api/mood/interventions` endpoint
  - Log when player takes action based on mood recommendation
  - Track intervention type and artist_id
  - Use for future analytics and tutorial improvements

- [ ] 6.9 Integrate mood analytics into Dashboard
  - Update `client/src/components/Dashboard.tsx`
  - Add MoodAnalyticsDashboard widget to main dashboard
  - Display high-level mood overview
  - Link to detailed artist views

- [ ] 6.10 Add final mood polish to ArtistRoster
  - Update `client/src/components/ArtistRoster.tsx`
  - Add MoodPredictionWidget to expanded artist view
  - Add MoodManagementGuide link/modal
  - Display historical mood patterns
  - Show mood correlation with project performance

- [ ] 6.11 Add mood section to MonthSummary
  - Update `client/src/components/MonthSummary.tsx`
  - Create dedicated mood changes section
  - List all artist mood changes with reasons
  - Highlight significant changes (>10 points)
  - Link to artist cards for details

- [ ] 6.12 Write analytics tests
  - Test mood prediction calculations
  - Test risk factor identification
  - Test recommendation generation
  - Test API endpoints for analytics and predictions

**Implementation Notes**:
- Prediction algorithms can be simple initially (STUB)
- Focus on UI/UX polish and complete experience
- All analytics should feel helpful, not overwhelming
- Cache expensive calculations for performance

---

**Status**: ✅ All sub-tasks generated and ready for implementation

**Total Tasks**: 6 parent tasks, 63 sub-tasks

**Recommended Implementation Order**:
1. Start with 1.0 (UI Prototype) for design validation
2. Implement 2.0 (Dialogue Integration) - simplest backend extension
3. Implement 3.0 (Mood Events) - builds on Phase 5
4. Implement 4.0 (Enhanced UI) - makes system visible to players
5. Implement 5.0 (Advanced Factors) - adds depth to mood changes
6. Implement 6.0 (Analytics) - polish and complete experience

**Next Steps**: Review tasks and begin with 1.0 (UI Prototype) or specify which task to start with.
