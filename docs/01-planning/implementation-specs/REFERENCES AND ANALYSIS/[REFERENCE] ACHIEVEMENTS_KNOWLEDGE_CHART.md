# Achievement System Knowledge Chart

> Synced July 25, 2026 (evening): reputation values updated to the 0-700 scale (PR #174) and citations repointed after the processor split — this chart had been missed by the #174 residual audit. Tier thresholds now live in `data/balance/progression.json` (access tiers) and `data/balance/quality.json` (producer tiers); tier/producer/campaign checks live in `shared/engine/processors/ProgressionProcessor.ts`, and the summary UI is `WeekSummary.tsx` (the game advanced week-by-week terminology in the weeks migration).

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACHIEVEMENT SYSTEM ARCHITECTURE              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   DATA SOURCES  │    │   GAME ENGINE    │    │   UI DISPLAY    │
│                 │    │   PROCESSING     │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ gameState       │───▶│ Weekly Advance   │───▶│ WeekSummary     │
│ - reputation    │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ - money         │    │ │ Achievement  │ │    │ │ Achievements│ │
│ - access tiers  │    │ │ Checks       │ │    │ │ Section     │ │
│                 │    │ └──────────────┘ │    │ └─────────────┘ │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ balance.json    │───▶│ Unlock Triggers  │───▶│ Badge Display   │
│ - thresholds    │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ - tier systems  │    │ │ GameChange   │ │    │ │ Trophy Icon │ │
│ - costs         │    │ │ Generation   │ │    │ │ Descriptions│ │
│                 │    │ └──────────────┘ │    │ └─────────────┘ │
├─────────────────┤    ├──────────────────┤    └─────────────────┘
│ Database        │───▶│ Business Logic   │
│ - projects      │    │ ┌──────────────┐ │
│ - songs         │    │ │ Categorize   │ │
│ - financial     │    │ │ & Filter     │ │
│                 │    │ └──────────────┘ │
└─────────────────┘    └──────────────────┘
```

## Achievement Generation Matrix

| **Trigger** | **Condition** | **Source Location** | **Icon** | **Frequency** |
|-------------|---------------|---------------------|----------|---------------|
| **System Progression** |
| Focus Slot 4 | reputation >= 280 (`progression.json` → `progression_thresholds.fourth_focus_slot_reputation`) | `game-engine.ts:455-466` | 🔓 | Once |
| Focus Slot 5 | *Does not exist* — `focus_slots_max` is 4 (`data/balance/projects.json`); slot-unlock placeholders were removed (`processors/ProgressionProcessor.ts:27-31`) | — | 🔓 | n/a |
| **Access Tier Upgrades** (thresholds: `data/balance/progression.json` → `access_tier_system`) |
| Playlist Niche | reputation >= 40 | `processors/ProgressionProcessor.ts:118-151` | 🎵 | Once |
| Playlist Mid | reputation >= 180 | `processors/ProgressionProcessor.ts:118-151` | 🎵 | Once |
| Playlist Flagship | reputation >= 510 | `processors/ProgressionProcessor.ts:118-151` | 🎵 | Once |
| Press Blogs | reputation >= 35 | `processors/ProgressionProcessor.ts:153-186` | 📰 | Once |
| Press Mid-Tier | reputation >= 150 | `processors/ProgressionProcessor.ts:153-186` | 📰 | Once |
| Press National | reputation >= 440 | `processors/ProgressionProcessor.ts:153-186` | 📰 | Once |
| Venue Clubs | reputation >= 25 | `processors/ProgressionProcessor.ts:188-221` | 🎭 | Once |
| Venue Theaters | reputation >= 110 | `processors/ProgressionProcessor.ts:188-221` | 🎭 | Once |
| Venue Arenas | reputation >= 380 | `processors/ProgressionProcessor.ts:188-221` | 🎭 | Once |
| **Producer Tiers** (thresholds: `data/balance/quality.json` → `producer_tier_system.*.unlock_rep`) |
| Local | reputation >= 0 | `processors/ProgressionProcessor.ts:229-267` | 🎛️ | Once |
| Regional | reputation >= 60 | `processors/ProgressionProcessor.ts:229-267` | 🎛️ | Once |
| National | reputation >= 165 | `processors/ProgressionProcessor.ts:229-267` | 🎛️ | Once |
| Legendary | reputation >= 380 | `processors/ProgressionProcessor.ts:229-267` | 🎛️ | Once |
| **Content Milestones** |
| Song Recorded | project's last song generated | `processors/SongGenerationProcessor.ts:269-274` | 🎵 | Per song |
| Project Advanced | stage progression | `processors/ProjectStageProcessor.ts:281-285` | 📈 | Per stage |
| **Performance Insights** |
| Press Coverage | *Removed as a summary insight* — press pickups now feed PR-push reputation effects (`processors/ActionProcessor.ts:2880-2887`), no 'unlock' change | — | 📰 | n/a |
| Investment Report | project spending ("Weekly project investment") | `processors/WeeklyFinancesProcessor.ts:112-122` | 💰 | Weekly |
| Revenue Efficiency | ongoing revenue ("Catalog revenue efficiency") | `processors/WeeklyFinancesProcessor.ts:124-135` | 📈 | Weekly |
| Strategic Efficiency | *Removed* — "serves no gameplay purpose" (`processors/WeeklyFinancesProcessor.ts:137` comment) | — | 🎯 | n/a |
| **Meta Events** |
| Campaign Complete | week >= 52 (`campaign_length_weeks`, `data/balance/projects.json`) | `processors/ProgressionProcessor.ts:269-298` | 🎉 | Once |

## Code Interaction Flow

```typescript
// 1. Achievement Check (shared/engine/processors/*.ts, e.g. ProgressionProcessor.ts; some remain in game-engine.ts)
function checkAchievements() {
  if (condition_met) {
    summary.changes.push({
      type: 'unlock',
      description: 'Achievement unlocked!',
      amount?: optional_number
    });
  }
}

// 2. Categorization (client/src/components/week-summary/categorizeChanges.ts:115)
const categorizeWeekChanges = (changes: GameChange[]) => {
  changes.forEach(change => {
    if (change.type === 'unlock') {
      categories.achievements.push(change);
    }
  });
};

// 3. UI Rendering (client/src/components/WeekSummary.tsx — unlock filter at :689, icons via getChangeIcon at :550)
{categorizedChanges.achievements.map((change, index) => (
  <div key={index} className="achievement-card">
    <span>{getChangeIcon(change.type)}</span>
    <span>{change.description}</span>
  </div>
))}
```

## Achievement Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   TRIGGER   │───▶│   CHECK     │───▶│  GENERATE   │───▶│   DISPLAY   │
│  Event/     │    │ Conditions  │    │ GameChange  │    │    In UI    │
│ Threshold   │    │   in Game   │    │ Object      │    │             │
│  Occurs     │    │   Engine    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
Examples:           Logic:          Structure:        Rendering:
• Reputation +50    • if-conditions  • type: 'unlock' • Trophy icon
• Song completed    • threshold      • description    • Achievement text
• Week advanced     • comparisons    • amount?        • Badge styling
• Access unlocked   • flag checks    • metadata       • Card layout
```

## Data Structure Knowledge Map

### GameChange Interface (achievements)
```typescript
interface GameChange {
  type: 'unlock';           // Fixed for achievements
  description: string;      // Human-readable achievement text
  amount?: number;          // Optional score/value (rare)
  roleId?: string;          // Unused for achievements
  projectId?: string;       // For project-specific achievements
}
```

### WeekSummary Achievement Props (client/src/components/WeekSummary.tsx:39-40)
```typescript
interface WeekSummaryProps {
  weeklyStats: {
    changes: GameChange[];  // Contains all week changes
    // ... other properties
  };
}
```

### Achievement Categories in UI
```typescript
const categories = {
  achievements: GameChange[]; // Filtered: change.type === 'unlock'
  // ... other categories
};
```

## Achievement Icon Mapping

```typescript
const getChangeIcon = (type: string) => {
  switch (type) {
    case 'unlock': return '🔓';  // Default unlock icon
    // Achievement-specific icons in descriptions:
    // 🎵 - Music/playlist related
    // 📰 - Press/media related
    // 🎭 - Venue/performance related
    // 🎛️ - Production/studio related
    // 💰 - Financial achievements
    // 📈 - Performance metrics
    // 🎯 - Strategic insights
    // 🎉 - Campaign milestones
    default: return '📊';
  }
};
```

## Extensibility Points

### Adding New Achievement Types
1. **Trigger Location:** Add condition check in the relevant processor (`shared/engine/processors/*.ts`) or `game-engine.ts`
2. **GameChange Creation:** Push new unlock object to summary
3. **Icon Assignment:** Update achievement description with emoji
4. **UI Handling:** Achievement automatically flows to WeekSummary

### Achievement Configuration
- **Thresholds:** Modify `data/balance/progression.json` (access tiers, focus slot) and `data/balance/quality.json` (producer tiers) reputation requirements
- **Descriptions:** Update strings in the processor / game engine methods
- **Frequency:** Adjust conditions (once vs. recurring)
- **Categorization:** Already handled automatically by type filtering

## Testing & Debugging

### Achievement Verification
```typescript
// Check if achievement triggered
console.log('Achievement changes:',
  weeklyStats.changes.filter(c => c.type === 'unlock')
);

// Verify categorization
console.log('Categorized achievements:',
  categorizedChanges.achievements
);
```

### Common Issues
- **Missing achievements:** Check reputation thresholds in `data/balance/progression.json` / `data/balance/quality.json`
- **Duplicate achievements:** Verify one-time flag storage in gameState.flags
- **Wrong display:** Ensure description formatting includes emoji
- **Performance:** Monitor achievement generation frequency

This knowledge chart provides complete understanding of how achievements flow from game events through the engine to UI display, enabling confident modification and extension of the achievement system.