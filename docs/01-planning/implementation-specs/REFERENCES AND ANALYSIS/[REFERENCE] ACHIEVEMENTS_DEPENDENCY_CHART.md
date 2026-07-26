# WeekSummary.tsx Achievements - Dependency & Knowledge Chart

> Synced July 25, 2026 (evening): reputation values updated to the 0-700 scale (PR #174) and citations repointed after the processor split — missed by the #174 residual audit; sibling KNOWLEDGE_CHART synced the same evening. C62's zeroed-component semantics remain undefined by design — see the backlog entry.

## Component Analysis: WeekSummary.tsx (formerly MonthSummary.tsx)

The achievements surface in WeekSummary displays `GameChange` objects where `type === 'unlock'`. Since the staged-reveal redesign, unlock changes are pulled OUT of the generic achievements card and rendered as HERO moments (filter at `client/src/components/WeekSummary.tsx:689`, hero section ~:834-861); the stage-3 achievements card shows only non-unlock changes (`:701-705`). Here's the complete dependency and knowledge flow:

## Achievement Dependencies Hierarchy

```
WeekSummary.tsx
├── Props: weeklyStats.changes (GameChange[])
├── Filtering: changes.filter(c => c.type === 'unlock')  → heroUnlocks (WeekSummary.tsx:689)
│   (categorizeWeekChanges also buckets unlocks into achievements —
│    client/src/components/week-summary/categorizeChanges.ts:115 — but the card
│    excludes unlocks since they render as heroes)
└── Display: hero moments section + categorizedChanges.achievements (non-unlock)
```

## Data Sources for Achievements (GameChange type: 'unlock')

### 1. System Progression Achievements
**Source:** `shared/engine/game-engine.ts:455-466` (threshold: `data/balance/progression.json` → `progression_thresholds.fourth_focus_slot_reputation` = 280; base/max: `data/balance/projects.json` → `time_progression.focus_slots_base`/`focus_slots_max` = 3/4 — there is no 5th slot)
```typescript
// Focus Slot Unlock (config-driven)
const focusSlotUnlockReputation = focusBalance?.progression_thresholds?.fourth_focus_slot_reputation ?? 280;
if (this.gameState.reputation && this.gameState.reputation >= focusSlotUnlockReputation) {
  // ...only if currentSlots < focusSlotsMax (4)
  summary.changes.push({
    type: 'unlock',
    description: `Fourth focus slot unlocked! You can now select ${focusSlotsMax} actions per week.`
  });
}
```

### 2. Access Tier Upgrades
**Source:** `shared/engine/processors/ProgressionProcessor.ts` — `updateAccessTiers()` (`:36-227`; unlock pushes at `:127` playlist, `:162` press, `:197` venue). Thresholds: `data/balance/progression.json` → `access_tier_system` (playlist 40/180/510, press 35/150/440, venue 25/110/380 on the 0-700 scale).
```typescript
// Playlist Access Upgrades
tierChanges.push({
  type: 'unlock',
  description: `🎵 Playlist Access Upgraded: ${tierDisplay} playlists unlocked! Your releases can now reach wider audiences.`
});

// Press Access Upgrades
tierChanges.push({
  type: 'unlock',
  description: `📰 Press Access Upgraded: ${tierDisplay} coverage unlocked! Your projects will get better media attention.`
});

// Venue Access Upgrades
tierChanges.push({
  type: 'unlock',
  description: `🎭 Venue Access Upgraded: ${tierDisplay} unlocked! Your artists can now perform at larger venues.`
});
```
(Downgrade/loss notifications also exist but use `type: 'reputation'`, not `'unlock'`.)

### 3. Producer Tier Unlocks
**Source:** `shared/engine/processors/ProgressionProcessor.ts` — `checkProducerTierUnlocks()` (`:229-267`; push at `:255`). Thresholds: `data/balance/quality.json` → `producer_tier_system.*.unlock_rep` (Local 0, Regional 60, National 165, Legendary 380).
```typescript
summary.changes.push({
  type: 'unlock',
  description: `🎛️ Producer Tier Unlocked: ${tierName} - ${tierData.description}`
});
```

### 4. Project Completion Milestones
**Source:** `shared/engine/processors/SongGenerationProcessor.ts:269-274` (fires per song when the project's final song is generated)
```typescript
// Song Recording Completion
summary.changes.push({
  type: 'unlock',
  description: `🎵 "${song.title}" recording completed - ready for release`
});
```

### 5. Business Performance Insights
**Source:** `shared/engine/processors/WeeklyFinancesProcessor.ts` — `generateEconomicInsights()` (`:105-140`; investment push at `:112-122`, revenue push at `:124-135`)
```typescript
// Investment Tracking
summary.changes.push({
  type: 'unlock',
  description: `💰 Weekly project investment: $${totalProjectSpend.toLocaleString()} across ${projectStartChanges.length} project${projectStartChanges.length > 1 ? 's' : ''}`
});

// Revenue Efficiency
summary.changes.push({
  type: 'unlock',
  description: `📈 Catalog revenue efficiency: $${ongoingRevenue.toLocaleString()} from released content`
});

// REMOVED: Press-coverage 'unlock' insight. Press pickups now apply directly as
// PR-push reputation effects and are counted into weeklyStats.pressMentions —
// see shared/engine/processors/ActionProcessor.ts:2880-2887 — with no
// type:'unlock' change generated.

// REMOVED: Strategic Efficiency achievement (dollars-per-reputation-point).
// It served no gameplay purpose and has been deleted from
// generateEconomicInsights() (see the comment at
// shared/engine/processors/WeeklyFinancesProcessor.ts:137).
// Reputation gained from releases/activities is now displayed as direct
// point values in their respective sections instead.
```

### 6. Project Stage Advancement
**Source:** `shared/engine/processors/ProjectStageProcessor.ts:281-285` (tour projects get tour-specific stage labels per C68)
```typescript
summary.changes.push({
  type: 'unlock',
  description: `📈 ${project.title} advanced to ${newStage} stage: ${advancementReason}`
});
```

### 7. Campaign Completion
**Source:** `shared/engine/processors/ProgressionProcessor.ts` — `checkCampaignCompletion()` (`:269-298`; push at `:292`). Score computed by `AchievementsEngine.calculateCampaignResults` (`shared/engine/AchievementsEngine.ts:76-95`): money /1000, reputation /30 (0-700 scale), access tier bonus, award bonus. The `artistsSuccessful` and `projectsCompleted` score components are hardcoded to 0 — their semantics ("successful artist", "completed project") are undefined by design and design-gated; see backlog C62 and the TODO at `shared/engine/AchievementsEngine.ts:79-87`. Do not treat them as implemented scoring inputs.
```typescript
summary.changes.push({
  type: 'unlock',
  description: `🎉 Campaign Completed! Final Score: ${campaignResults.finalScore}`,
  amount: campaignResults.finalScore
});
```

## Achievement Triggering Conditions

| Achievement Type | Trigger Condition | Data Source |
|------------------|-------------------|-------------|
| **Focus Slots** | `reputation >= 280` | `data/balance/progression.json` → `progression_thresholds.fourth_focus_slot_reputation` |
| **Playlist Access** | Reputation thresholds (40/180/510) | `data/balance/progression.json` access_tier_system |
| **Press Access** | Reputation thresholds (35/150/440) | `data/balance/progression.json` access_tier_system |
| **Venue Access** | Reputation thresholds (25/110/380) | `data/balance/progression.json` access_tier_system |
| **Producer Tiers** | Reputation thresholds (0/60/165/380) | `data/balance/quality.json` producer_tier_system |
| **Song Recording** | Project completion | Database project stages |
| ~~**Press Coverage**~~ | _Removed as an 'unlock' insight_ | Now direct PR-push reputation effects (`ActionProcessor.ts:2880-2887`) |
| **Investment Tracking** | Project spending | Weekly financial summary |
| **Revenue Efficiency** | Ongoing revenue > 0 | Catalog performance |
| ~~**Strategic Efficiency**~~ | _Removed_ | Removed — reputation now tracked directly per activity |
| **Project Advancement** | Time-based progression | Database project timelines |
| **Campaign Complete** | Week 52 reached | `campaign_length_weeks` (`data/balance/projects.json`) |

## Knowledge Flow Architecture

```
Input Sources → Engine Processing → Achievement Generation → UI Display
    ↓                     ↓                      ↓                ↓
gameState.reputation → focus-slot check (game-engine.ts:455-466) → GameChange[] → WeekSummary.tsx
data/balance/*.json  → ProgressionProcessor.updateAccessTiers()   → type:'unlock' → hero moments section
project timelines    → ProjectStageProcessor.advanceProjectStages() → description → Badge components
financial metrics    → WeeklyFinancesProcessor.generateEconomicInsights() → amount? → Icon rendering
```

## Dependencies Map

### External Dependencies
- **Types:** `shared/types/gameTypes.ts` - `GameChange`, `WeekSummary`
- **Data:** `data/balance/progression.json`, `data/balance/quality.json`, `data/balance/projects.json` - unlock thresholds, tier systems, campaign length (the old monolithic `data/balance.json` was split)
- **Engine:** `shared/engine/game-engine.ts` + `shared/engine/processors/*.ts` - achievement generation logic
- **Database:** Project stages, song statuses, financial history

### UI Dependencies
- **Icons:** `lucide-react` - Trophy, Music, TrendingUp icons
- **Components:** `@/components/ui/card`, `@/components/ui/badge`
- **Styling:** Tailwind classes for achievement theming

### State Dependencies
- **Props:** `weeklyStats.changes` from parent component
- **Local State:** `heroUnlocks` (unlock changes) and `categorizedChanges` via `categorizeWeekChanges()` (`client/src/components/week-summary/categorizeChanges.ts`)
- **Display Logic:** `getChangeIcon()` for emoji mapping (`WeekSummary.tsx:550`)

## Achievement Flow Sequence

1. **Weekly Processing** - Game engine processes week
2. **Condition Checking** - Various achievement triggers evaluated
3. **Change Generation** - `GameChange` objects created with `type: 'unlock'`
4. **Summary Compilation** - Changes added to `WeekSummary.changes[]`
5. **UI Categorization** - `categorizeWeekChanges()` buckets changes; unlocks also filtered into `heroUnlocks`
6. **Achievement Rendering** - hero moments section (unlocks) + achievements card (non-unlock)
7. **User Display** - Cards with icons, descriptions, and badges

## Achievement Categories by Source

### 🎯 **System Progression** (Focus, Access Tiers)
- Driven by reputation thresholds
- One-time unlocks per tier
- Permanent gameplay expansions

### 🎵 **Content Milestones** (Songs, Projects)
- Event-driven by project completion
- Multiple occurrences per week
- Progress indicators

### 📊 **Performance Insights** (Revenue, Efficiency)
- Calculated from financial metrics
- Weekly reporting achievements
- Strategic feedback

### 🚀 **Meta Achievements** (Campaign Complete)
- Campaign-level milestones
- Game completion tracking
- Final scoring (see C62 note in section 7: `artistsSuccessful`/`projectsCompleted` remain zeroed, semantics undefined by design)
