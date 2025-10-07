# MonthSummary.tsx Achievements - Dependency & Knowledge Chart

## Component Analysis: MonthSummary.tsx Lines 290-308

The achievements section in MonthSummary displays `GameChange` objects where `type === 'unlock'`. Here's the complete dependency and knowledge flow:

## Achievement Dependencies Hierarchy

```
MonthSummary.tsx
├── Props: monthlyStats.changes (GameChange[])
├── Filtering: changes.filter(c => c.type === 'unlock')
└── Display: categorizedChanges.achievements
```

## Data Sources for Achievements (GameChange type: 'unlock')

### 1. System Progression Achievements
**Source:** `shared/engine/game-engine.ts:320-330`
```typescript
// Focus Slot Unlocks
if (this.gameState.reputation >= 50) {
  summary.changes.push({
    type: 'unlock',
    description: 'Fourth focus slot unlocked! You can now select 4 actions per month.'
  });
}
```

### 2. Access Tier Upgrades
**Source:** `shared/engine/game-engine.ts:2635-2670`
```typescript
// Playlist Access Upgrades
tierChanges.push({
  type: 'unlock',
  description: `🎵 Playlist Access Upgraded: ${tierDisplay} playlists unlocked!`
});

// Press Access Upgrades
tierChanges.push({
  type: 'unlock',
  description: `📰 Press Access Upgraded: ${tierDisplay} coverage unlocked!`
});

// Venue Access Upgrades
tierChanges.push({
  type: 'unlock',
  description: `🎭 Venue Access Upgraded: ${tierDisplay} unlocked!`
});
```

### 3. Producer Tier Unlocks
**Source:** `shared/engine/game-engine.ts:2690-2710`
```typescript
summary.changes.push({
  type: 'unlock',
  description: `🎛️ Producer Tier Unlocked: ${tierName} - ${tierData.description}`
});
```

### 4. Project Completion Milestones
**Source:** `shared/engine/game-engine.ts:1530-1535`
```typescript
// Song Recording Completion
summary.changes.push({
  type: 'unlock',
  description: `🎵 "${song.title}" recording completed - ready for release`
});
```

### 5. Business Performance Insights
**Source:** `shared/engine/game-engine.ts:3340-3475`
```typescript
// Press Coverage Achievements
summary.changes.push({
  type: 'unlock',
  description: `Press coverage: ${pressPickups} pickup${pressPickups > 1 ? 's' : ''}`
});

// Investment Tracking
summary.changes.push({
  type: 'unlock',
  description: `💰 Monthly project investment: $${totalProjectSpend.toLocaleString()}`
});

// Revenue Efficiency
summary.changes.push({
  type: 'unlock',
  description: `📈 Catalog revenue efficiency: $${ongoingRevenue.toLocaleString()}`
});

// Strategic Efficiency
summary.changes.push({
  type: 'unlock',
  description: `🎯 Strategic efficiency: $${efficiency.toFixed(0)} per reputation point`
});
```

### 6. Project Stage Advancement
**Source:** `shared/engine/game-engine.ts:3640-3655`
```typescript
summary.changes.push({
  type: 'unlock',
  description: `📈 ${project.title} advanced to ${newStage} stage: ${advancementReason}`
});
```

### 7. Campaign Completion
**Source:** `shared/engine/game-engine.ts:3080-3085`
```typescript
summary.changes.push({
  type: 'unlock',
  description: `🎉 Campaign Completed! Final Score: ${finalScore}`,
  amount: finalScore
});
```

## Achievement Triggering Conditions

| Achievement Type | Trigger Condition | Data Source |
|------------------|-------------------|-------------|
| **Focus Slots** | `reputation >= 50` | `gameState.reputation` |
| **Playlist Access** | Reputation thresholds | `balance.json` access tiers |
| **Press Access** | Reputation thresholds | `balance.json` access tiers |
| **Venue Access** | Reputation thresholds | `balance.json` access tiers |
| **Producer Tiers** | Reputation thresholds | `balance.json` producer_tier_system |
| **Song Recording** | Project completion | Database project stages |
| **Press Coverage** | Media pickups > 0 | Marketing calculations |
| **Investment Tracking** | Project spending | Monthly financial summary |
| **Revenue Efficiency** | Ongoing revenue > 0 | Catalog performance |
| **Strategic Efficiency** | Reputation + cash flow | Monthly performance metrics |
| **Project Advancement** | Time-based progression | Database project timelines |
| **Campaign Complete** | Month 36 reached | Campaign length limit |

## Knowledge Flow Architecture

```
Input Sources → Game Engine Processing → Achievement Generation → UI Display
    ↓                     ↓                      ↓                ↓
gameState.reputation → checkProgressionUnlocks() → GameChange[] → MonthSummary.tsx
balance.json         → calculateAccessTiers()    → type:'unlock' → achievements.map()
project timelines    → advanceProjectStages()    → description   → Badge components
financial metrics    → summarizeBusinessMetrics() → amount?      → Icon rendering
```

## Dependencies Map

### External Dependencies
- **Types:** `shared/types/gameTypes.ts` - `GameChange`, `MonthSummary`
- **Data:** `data/balance.json` - unlock thresholds, tier systems
- **Engine:** `shared/engine/game-engine.ts` - achievement generation logic
- **Database:** Project stages, song statuses, financial history

### UI Dependencies
- **Icons:** `lucide-react` - Trophy, Music, TrendingUp icons
- **Components:** `@/components/ui/card`, `@/components/ui/badge`
- **Styling:** Tailwind classes for achievement theming

### State Dependencies
- **Props:** `monthlyStats.changes` from parent component
- **Local State:** `categorizedChanges.achievements` array
- **Display Logic:** `getChangeIcon()` for emoji mapping

## Achievement Flow Sequence

1. **Monthly Processing** - Game engine processes month
2. **Condition Checking** - Various achievement triggers evaluated
3. **Change Generation** - `GameChange` objects created with `type: 'unlock'`
4. **Summary Compilation** - Changes added to `MonthSummary.changes[]`
5. **UI Categorization** - `categorizeChanges()` filters unlock types
6. **Achievement Rendering** - `categorizedChanges.achievements.map()`
7. **User Display** - Cards with icons, descriptions, and badges

## Achievement Categories by Source

### 🎯 **System Progression** (Focus, Access Tiers)
- Driven by reputation thresholds
- One-time unlocks per tier
- Permanent gameplay expansions

### 🎵 **Content Milestones** (Songs, Projects)
- Event-driven by project completion
- Multiple occurrences per month
- Progress indicators

### 📊 **Performance Insights** (Revenue, Efficiency)
- Calculated from financial metrics
- Monthly reporting achievements
- Strategic feedback

### 🚀 **Meta Achievements** (Campaign Complete)
- Campaign-level milestones
- Game completion tracking
- Final scoring