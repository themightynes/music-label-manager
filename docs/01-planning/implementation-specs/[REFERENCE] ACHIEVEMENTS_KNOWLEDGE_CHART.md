# Achievement System Knowledge Chart

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACHIEVEMENT SYSTEM ARCHITECTURE              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   DATA SOURCES  │    │   GAME ENGINE    │    │   UI DISPLAY    │
│                 │    │   PROCESSING     │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ gameState       │───▶│ Monthly Advance  │───▶│ MonthSummary    │
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
| Focus Slot 4 | reputation >= 50 | `game-engine.ts:325` | 🔓 | Once |
| Focus Slot 5 | reputation >= 100 | *Future expansion* | 🔓 | Once |
| **Access Tier Upgrades** |
| Playlist Niche | reputation >= 25 | `game-engine.ts:2641` | 🎵 | Once |
| Playlist Mid | reputation >= 50 | `game-engine.ts:2641` | 🎵 | Once |
| Playlist Flagship | reputation >= 100 | `game-engine.ts:2641` | 🎵 | Once |
| Press Blogs | reputation >= 30 | `game-engine.ts:2652` | 📰 | Once |
| Press Mid-Tier | reputation >= 60 | `game-engine.ts:2652` | 📰 | Once |
| Press National | reputation >= 120 | `game-engine.ts:2652` | 📰 | Once |
| Venue Clubs | reputation >= 20 | `game-engine.ts:2663` | 🎭 | Once |
| Venue Theaters | reputation >= 70 | `game-engine.ts:2663` | 🎭 | Once |
| Venue Arenas | reputation >= 150 | `game-engine.ts:2663` | 🎭 | Once |
| **Producer Tiers** |
| Home Studio | reputation >= 0 | `game-engine.ts:2700` | 🎛️ | Once |
| Pro Studio | reputation >= 40 | `game-engine.ts:2700` | 🎛️ | Once |
| Elite Studio | reputation >= 80 | `game-engine.ts:2700` | 🎛️ | Once |
| **Content Milestones** |
| Song Recorded | project completion | `game-engine.ts:1532` | 🎵 | Per song |
| Project Advanced | time progression | `game-engine.ts:3649` | 📈 | Per stage |
| **Performance Insights** |
| Press Coverage | press pickups > 0 | `game-engine.ts:3349` | 📰 | Monthly |
| Investment Report | project spending | `game-engine.ts:3444` | 💰 | Monthly |
| Revenue Efficiency | ongoing revenue | `game-engine.ts:3457` | 📈 | Monthly |
| Strategic Efficiency | reputation/cash ratio | `game-engine.ts:3470` | 🎯 | Monthly |
| **Meta Events** |
| Campaign Complete | month >= 36 | `game-engine.ts:3081` | 🎉 | Once |

## Code Interaction Flow

```typescript
// 1. Achievement Check (game-engine.ts)
function checkAchievements() {
  if (condition_met) {
    summary.changes.push({
      type: 'unlock',
      description: 'Achievement unlocked!',
      amount?: optional_number
    });
  }
}

// 2. Categorization (MonthSummary.tsx)
const categorizeChanges = (changes: GameChange[]) => {
  changes.forEach(change => {
    if (change.type === 'unlock') {
      categories.achievements.push(change);
    }
  });
};

// 3. UI Rendering (MonthSummary.tsx:290-308)
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
• Month advanced    • comparisons    • amount?        • Badge styling
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

### MonthSummary Achievement Props
```typescript
interface MonthSummaryProps {
  monthlyStats: {
    changes: GameChange[];  // Contains all month changes
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
1. **Trigger Location:** Add condition check in `game-engine.ts`
2. **GameChange Creation:** Push new unlock object to summary
3. **Icon Assignment:** Update achievement description with emoji
4. **UI Handling:** Achievement automatically flows to MonthSummary

### Achievement Configuration
- **Thresholds:** Modify `data/balance.json` reputation requirements
- **Descriptions:** Update strings in game engine methods
- **Frequency:** Adjust conditions (once vs. recurring)
- **Categorization:** Already handled automatically by type filtering

## Testing & Debugging

### Achievement Verification
```typescript
// Check if achievement triggered
console.log('Achievement changes:',
  monthlyStats.changes.filter(c => c.type === 'unlock')
);

// Verify categorization
console.log('Categorized achievements:',
  categorizedChanges.achievements
);
```

### Common Issues
- **Missing achievements:** Check reputation thresholds in balance.json
- **Duplicate achievements:** Verify one-time flag storage in gameState.flags
- **Wrong display:** Ensure description formatting includes emoji
- **Performance:** Monitor achievement generation frequency

This knowledge chart provides complete understanding of how achievements flow from game events through the engine to UI display, enabling confident modification and extension of the achievement system.