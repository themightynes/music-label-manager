# Mood Targeting System Workflow

**Music Label Manager - Artist Mood Targeting System**
*Complete system documentation for PRD-0002*

---

## 📋 Overview

The **Mood Targeting System** allows executive meeting effects to target specific artists or all artists based on meeting type. This system provides granular control over artist morale management through four distinct targeting scopes.

**Implemented**: PRD-0002 (Tasks 1.0-7.0)
**Key Files**: `game-engine.ts`, `storage.ts`, `WeekSummary.tsx`, `actions.json`

---

## 🎯 Four Targeting Scopes

### 1. Global Scope (`"target_scope": "global"`)

**Behavior**: Affects ALL signed artists equally
**Use Case**: Company-wide decisions, strategic priorities
**Example**: CEO sets quarterly goals that boost everyone's morale

```json
{
  "id": "ceo_priorities",
  "prompt": "Set strategic priorities for the quarter.",
  "target_scope": "global",
  "choices": [{
    "label": "Focus on artist development",
    "effects_immediate": {
      "artist_mood": 2,  // All signed artists get +2 mood
      "money": -5000
    }
  }]
}
```

**Technical Flow**:
1. `applyEffects()` called with `artistId = undefined` and `targetScope = 'global'`
2. Iterates through all `gameState.artists` where `isSigned = true`
3. For each artist: `summary.artistChanges[artistId] = { mood: +2 }`
4. `applyArtistChangesToDatabase()` creates separate mood event log for each artist
5. Week summary shows: "🌍 CEO: Strategic Priorities (All Artists) - Artist Mood +2"

---

### 2. Predetermined Scope (`"target_scope": "predetermined"`)

**Behavior**: Automatically selects artist with highest popularity
**Use Case**: High-profile situations, PR crises, media opportunities
**Example**: Crisis management where the most popular artist handles media

```json
{
  "id": "ceo_crisis",
  "prompt": "A PR crisis needs immediate attention.",
  "target_scope": "predetermined",
  "choices": [{
    "label": "Have our top artist address it publicly",
    "effects_immediate": {
      "artist_mood": 3,  // Most popular artist gets +3 mood
      "reputation": -2
    }
  }]
}
```

**Technical Flow**:
1. `processRoleMeeting()` detects `target_scope = 'predetermined'`
2. Calls `selectHighestPopularityArtist()`:
   - Finds `max(artist.popularity)` among signed artists
   - If multiple tied: random selection (logged for debugging)
   - If 0 artists: returns `null`, effect skipped
   - If 1 artist: auto-selects
3. `applyEffects()` called with selected `artistId`
4. Single mood event logged for that artist
5. Week summary shows: "⭐ Crisis Management (Nova - Most Popular) - Nova's Mood +3"

**Tie-Breaking Log**:
```
[ARTIST SELECTION] Predetermined selection: 2 artists tied at popularity 75, selected Nova Sterling randomly
```

---

### 3. User-Selected Scope (`"target_scope": "user_selected"`)

**Behavior**: Player chooses which artist is affected
**Use Case**: Strategic decisions where player picks artist
**Example**: Choosing which artist to focus single strategy on

```json
{
  "id": "ar_single_choice",
  "prompt_before_selection": "Which artist are you working with on single strategy?",
  "prompt": "Pick the lead single approach for {artistName}.",
  "target_scope": "user_selected",
  "choices": [{
    "label": "Go for radio-friendly production",
    "effects_immediate": {
      "artist_mood": -2,  // Selected artist gets -2 mood
      "playlist_access_boost": 2
    }
  }]
}
```

**Required Fields**:
- `prompt_before_selection`: Text shown in artist selector UI
- `{artistName}` placeholder in `prompt`: Replaced with selected artist's name

**Technical Flow**:
1. UI detects `target_scope = 'user_selected'`
2. Shows `ArtistSelector` component with all signed artists
3. Player selects artist → stored in `action.metadata.selectedArtistId`
4. `{artistName}` placeholder replaced in prompt
5. `applyEffects()` called with `selectedArtistId`
6. Single mood event logged for selected artist
7. Week summary shows: "👤 Single Strategy (Diego - Your Choice) - Diego's Mood -2"

**UI Components**:
- `MeetingSelector.tsx`: Renders artist selection UI
- `ArtistSelector.tsx`: Displays artist cards with mood/energy/stats
- Selection persists in action metadata for processing

---

### 4. Dialogue Scope (Implicit)

**Behavior**: Direct artist conversation automatically targets that artist
**Use Case**: One-on-one artist interactions
**Example**: Artist dialogue choices affecting only that artist

```typescript
// In artist dialogue system
processArtistDialogue(artistId, choice) {
  applyEffects(
    choice.effects_immediate,
    summary,
    artistId,  // Always the artist in conversation
    undefined,
    'dialogue'
  );
}
```

**Technical Flow**:
1. Player opens dialogue with specific artist
2. Choice made → `processArtistDialogue()` called
3. `applyEffects()` receives `artistId` from dialogue context
4. Mood event logged for that artist
5. Week summary shows: "💬 Artist Conversation: Nova - Mood +3"

**No Configuration Needed**: Dialogue system inherently knows target artist

---

## 🔧 Technical Implementation

### Data Structure

**Per-Artist Mood Accumulation** (`summary.artistChanges`):
```typescript
summary.artistChanges = {
  'artist_nova': { mood: 5, energy: 10 },   // Object format
  'artist_diego': { mood: -2 },              // Separate per artist
  'energy': 10  // Legacy global format (technical debt)
}
```

**Mood Event Database Schema** (`mood_events` table):
```sql
CREATE TABLE mood_events (
  id UUID PRIMARY KEY,
  artist_id UUID REFERENCES artists(id),  -- NULL for global, ID for per-artist
  game_id UUID REFERENCES game_states(id) NOT NULL,
  event_type TEXT NOT NULL,               -- 'executive_meeting', 'dialogue', etc.
  mood_change INTEGER NOT NULL,           -- +/- change amount
  mood_before INTEGER NOT NULL,           -- Mood value before change
  mood_after INTEGER NOT NULL,            -- Mood value after change (clamped 0-100)
  description TEXT NOT NULL,
  week_occurred INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',            -- { targetScope, source, ... }
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Functions

**`applyEffects(effects, summary, artistId?, targetScope?, meetingName?)`**
- Processes immediate/delayed effects
- Routes to global vs per-artist logic based on `artistId`
- Validates target scope matches artistId presence
- Accumulates changes in `summary.artistChanges`

**`selectHighestPopularityArtist()`**
- Returns artist with `max(popularity)` among signed artists
- Handles ties with random selection
- Logs tie-breaking decisions
- Edge cases: 0 artists (null), 1 artist (auto-select)

**`applyArtistChangesToDatabase(summary, dbTransaction)`**
- Iterates `Object.keys(summary.artistChanges)`
- Applies accumulated mood/energy/loyalty to database
- Creates `mood_event` log for each artist mood change
- Clamps mood values to 0-100 range

**Storage Methods**:
- `createMoodEvent(event)` - Log mood event to database
- `getMoodEventsByArtist(artistId, gameId)` - Query per-artist history
- `getGlobalMoodEvents(gameId)` - Query global events (artist_id IS NULL)
- `getMoodEventsByWeekRange(gameId, start, end)` - Time-range queries

---

## 🎨 UI Components

### Week Summary Display

**Scope-Specific Formatting**:
- **Global**: "🌍 CEO: Strategic Priorities (All Artists) - Artist Mood +2"
- **Predetermined**: "⭐ Crisis Management (Nova - Most Popular) - Nova's Mood +3"
- **User-Selected**: "👤 Single Strategy (Diego - Your Choice) - Diego's Mood -2"
- **Dialogue**: "💬 Artist Conversation: Nova - Mood +3"

**Implementation** (`WeekSummary.tsx`):
```typescript
const determineMoodScope = (change: GameChange): MoodScope => {
  if (change.source?.includes('dialogue')) return 'dialogue';
  if (change.artistId) {
    if (change.source?.includes('user_selected')) return 'user_selected';
    if (change.source?.includes('predetermined')) return 'predetermined';
    return 'predetermined';
  }
  return 'global';
};

const getScopeIcon = (scope: MoodScope): string => {
  switch (scope) {
    case 'global': return '🌍';
    case 'predetermined': return '⭐';
    case 'user_selected': return '👤';
    case 'dialogue': return '💬';
  }
};
```

**Visual Styling**:
- Circular badges with scope-specific colors
- Blue (global), Yellow (predetermined), Purple (user-selected), Green (dialogue)

### Artist Selection UI

**Components**:
- `ArtistSelector.tsx`: Artist card grid with selection
- Shows: Name, archetype, mood, energy, active projects
- Visual indicator for selected artist
- Disabled if 0 artists signed

---

## 🧪 Testing

**Test Coverage**:
- 10 mood event logging tests ([mood-event-logging.test.ts](../../tests/engine/mood-event-logging.test.ts))
- 14 integration tests ([mood-targeting-integration.test.ts](../../tests/engine/mood-targeting-integration.test.ts))
- 14 ArtistSelector component tests

**Scenarios Tested**:
- ✅ Dialogue targeting (per-artist)
- ✅ Global meetings (all artists)
- ✅ User-selected meetings (player choice)
- ✅ Predetermined meetings (highest popularity)
- ✅ Edge case: 0 artists signed
- ✅ Edge case: 1 artist signed (auto-select)
- ✅ Edge case: Tied popularity (random selection)
- ✅ Mood clamping (0-100 range)
- ✅ Delayed effects with artist targeting
- ✅ Database logging with correct artist_id

---

## ⚠️ Known Technical Debt

See [tasks/0002-prd-technical-debt-found.md](../../tasks/0002-prd-technical-debt-found.md) for details.

**Key Issues**:
1. **Mixed data formats** in `summary.artistChanges`
   - Per-artist mood: Object format (`{ mood, energy, loyalty }`)
   - Global energy/popularity: Number format (legacy)

2. **Medium Priority**: Unify all artist changes to object format
3. **Medium Priority**: Add integration tests with real database
4. **Low Priority**: Refactor `processWeeklyMoodChanges()` for clarity

---

## 📖 Usage Examples

### Adding a New Global Meeting

```json
{
  "id": "cfo_budget_cuts",
  "prompt": "The CFO recommends budget cuts across all departments.",
  "target_scope": "global",
  "choices": [
    {
      "label": "Accept the cuts",
      "effects_immediate": {
        "artist_mood": -3,  // All artists lose 3 mood
        "money": 10000
      }
    },
    {
      "label": "Fight for artist budgets",
      "effects_immediate": {
        "artist_mood": 2,   // All artists gain 2 mood
        "money": -5000
      }
    }
  ]
}
```

### Adding a New User-Selected Meeting

```json
{
  "id": "marketing_campaign_focus",
  "prompt_before_selection": "Which artist should we focus the marketing campaign on?",
  "prompt": "Design the campaign strategy for {artistName}.",
  "target_scope": "user_selected",
  "choices": [
    {
      "label": "Traditional media blitz",
      "effects_immediate": {
        "artist_mood": 1,
        "money": -8000,
        "reputation": 3
      }
    },
    {
      "label": "Grassroots social media",
      "effects_immediate": {
        "artist_mood": 2,
        "money": -3000,
        "creative_capital": 2
      }
    }
  ]
}
```

---

## 🔗 Related Documentation

- **PRD**: [tasks/0002-prd-mood-system-reimplementation.md](../../tasks/0002-prd-mood-system-reimplementation.md)
- **Task List**: [tasks/tasks-0002-prd-mood-system-reimplementation.md](../../tasks/tasks-0002-prd-mood-system-reimplementation.md)
- **Technical Debt**: [tasks/0002-prd-technical-debt-found.md](../../tasks/0002-prd-technical-debt-found.md)
- **Content Editing**: [06-development/content-editing-guide.md](../06-development/content-editing-guide.md)
- **System Architecture**: [02-architecture/system-architecture.md](../02-architecture/system-architecture.md)

---

**Last Updated**: 2025-10-08
**Status**: ✅ Complete (All 7 tasks implemented and tested)
**Tests Passing**: 386/386
