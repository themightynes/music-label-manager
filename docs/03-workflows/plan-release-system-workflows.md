# Plan Release System Workflows

**Comprehensive guide to release planning, preview, and execution workflows**

*Audience: Developers, Product Managers*
*Purpose: Understanding release planning processes and user journeys*
*Created: September 24, 2025*

---

## 🎯 **Overview**

The Plan Release System enables players to schedule strategic music releases with sophisticated marketing allocation, seasonal timing optimization, and lead single strategies. This document maps the complete workflow from release planning through execution.

## 📋 **Plan Release System Components**

### **Frontend Components**
- `PlanReleasePage.tsx` (1293 lines) - Complete release planning interface
- `WeekPicker` - Seasonal timing selection with visual feedback
- Dynamic balance data loading with hard-fail error handling

### **Backend Systems**
- `/api/game/:gameId/releases/plan` - Release scheduling and budget deduction
- `/api/game/:gameId/releases/preview` - Real-time performance calculations
- `/api/game/:gameId/balance` - Dynamic balance configuration loading
- `GameEngine.processPlannedReleases()` - Release execution during week advancement
- `GameEngine.calculateSophisticatedReleaseOutcome()` - Actual performance calculation

### **Configuration Data**
- `data/balance/markets.json` - Release formulas, seasonal multipliers, channel effectiveness
- `shared/utils/seasonalCalculations.ts` - Shared seasonal logic
- `shared/utils/marketingUtils.ts` - Marketing channel and release type configuration

---

## 🔄 **Complete Release Planning Workflow**

### **Phase 1: User Interface Flow**

```mermaid
graph TD
    A[Player Opens Plan Release Page] --> B[Load Balance Data]
    B --> C[Load Marketing Channels & Release Types]
    C --> D[Load Artists with Ready Songs]
    D --> E[Player Selects Artist]
    E --> F[Load Artist's Available Songs]
    F --> G[Player Selects Songs]
    G --> H[Auto-Detect Release Type]
    H --> I[Player Configures Marketing Strategy]
    I --> J[Player Selects Release Timing]
    J --> K[Real-Time Preview Calculation]
    K --> L[Player Reviews Performance Preview]
    L --> M[Player Clicks Plan Release]
    M --> N[Backend Validation & Storage]
```

### **Phase 2: Release Configuration Process**

#### **2.1 Artist & Song Selection**
```
User Action: Select Artist
     ↓
API Call: GET /api/game/{gameId}/artists/ready-for-release
     ↓
Response: Artists with recordedSongs > 0 AND releasedSongs count
     • Per-artist fields include mood, energy, popularity, talent
       (popularity/talent added `server/routes/releases.ts`, fixed
       July 4, 2026 — the endpoint previously omitted them and the
       Plan Release artist cards rendered both as 0)
     ↓
User Action: Select Songs
     ↓
API Call: GET /api/game/{gameId}/artists/{artistId}/songs/ready
     ↓
Response: Songs where isRecorded=true AND releaseId=null
     ↓
Auto-Detection: Release type based on song count (1=single, 3-5=EP, 8+=album)
```

#### **2.2 Marketing Strategy Configuration**
```
User Action: Adjust Channel Budget Sliders (radio, digital, pr, influencer)
     ↓
Real-Time Calculation: Channel synergies, diversity bonuses
     ↓
Display: Effectiveness percentages, target audiences, synergy warnings
     ↓
Lead Single Strategy (multi-song releases only):
     ↓
User Action: Select lead single, set lead single week, allocate lead single budget
```

#### **2.3 Seasonal Timing Selection**
```
User Action: Select Release Week via WeekPicker
     ↓
Calculation: getSeasonFromWeek(week) → Quarter (Q1-Q4)
     ↓
Seasonal Multiplier: Q1=0.85 (-15%), Q2=0.95 (-5%), Q3=1.1 (+10%), Q4=1.4 (+40%)
     ↓
Visual Feedback: Quarter display, cost impact preview, optimal timing guidance
```

### **Phase 3: Real-Time Preview System**

#### **3.1 Debounced Preview Calculation**
```
Input Changes (500ms debounce) → API Call → GameEngine → Response → UI Update
        ↓                            ↓           ↓            ↓          ↓
Channel budgets,              POST /releases/  calculate     Preview    Performance
timing, songs                 preview          ReleasePreview data      metrics update
```

#### **3.2 Preview API Processing**
**Location**: `server/routes/releases.ts` — `POST /api/game/:gameId/releases/preview` handler
```typescript
const previewResults = gameEngine.calculateReleasePreview(
  releaseSongs,
  artist,
  releaseConfig
);
```

**Key Features**:
- **Same calculation engine** as actual release execution
- **Real variance applied** (±10% RNG on base streams)
- **Exact seasonal multipliers** from selected week
- **Actual marketing synergies** from channel allocation

#### **3.3 Preview Calculation Chain**
```
calculateReleasePreview() → calculateStreamingOutcome() → ±10% Variance → Multipliers Applied
           ↓                         ↓                         ↓                ↓
Uses song quality,            Base streams calculation     RNG variance      Final streams
marketing budget,             (quality + playlist +        (0.9 to 1.1)     × release type
seasonal timing,              reputation + marketing                         × seasonal
release type                  + popularity)                                  × marketing
```

### **Phase 4: Release Planning Validation & Storage**

#### **4.1 Frontend Validation**
```
validateRelease() checks:
├── Artist selected
├── Songs selected (min 1, EP ≥3, Album ≥8)
├── Release title entered
├── Marketing budget ≤ available funds
├── At least one marketing channel has budget > 0
├── Lead single timing (if applicable): leadWeek < releaseWeek, gap ≤ 3 weeks
└── Channel budgets within min/max constraints
```

#### **4.2 Backend Storage Process**
**Location**: `server/routes/releases.ts` — `POST /api/game/:gameId/releases/plan` handler, delegating to `server/services/releasePlanningService.ts`

```
Database Transaction:
├── Budget Validation: totalBudget ≤ gameState.money
├── Song Conflict Check: No songs already in other planned releases
├── Money Deduction: gameState.money -= totalBudget (SINGLE deduction - fixed)
├── Release Record Creation:
│   ├── Basic data: title, type, artistId, releaseWeek
│   ├── Marketing budget: total amount + per-channel breakdown
│   └── Metadata: seasonalTiming, scheduledReleaseWeek,
│       marketingBudgetBreakdown, leadSingleStrategy
├── Song Reservation: Update songs.releaseId = newRelease.id
└── Junction Table: Create release_songs entries with track numbers
```

### **Phase 4.5: Buzz v2 — Pre-Campaign, Attached Hype & Cancellation** *(added July 25, 2026; semantics from `server/services/releasePlanningService.ts` + `client/src/lib/releaseBuzz.ts`, post-C83)*

The Buzz v2 arc (PR #152) extended the plan transaction and added a cancellation path. Three additions, all recorded on the release row at plan time:

#### **4.5.1 Pre-Campaign Budget Split**
```
Player sets preCampaignPct (0, or a 10-step share up to the balance knob max_pct)
     ↓
Validation: nonzero pct requires ≥1 lead-up week (plan week < release week)
     ↓
Stored on release.metadata.preCampaign (ONLY when pct > 0 — pct 0 stores nothing,
keeping the legacy path byte-identical):
├── pct: the diverted share (10..max_pct)
├── totalBudget: round(pct% of the MAIN marketing total) — the anticipation pot
├── budgetPerChannel: each MAIN channel scaled by pct%
└── spentToDate: accumulates weekly as the pre-campaign converts to pre-release
    awareness during the lead-up weeks
     ↓
Launch-phase (weeks 1-4) marketing conversion scales DOWN by (1 − pct) — the
money is ONE POT: the diverted share builds anticipation instead of launch reach
```

#### **4.5.2 Attach-at-Plan Hype**
Banked hype (`flags.pendingAwarenessBoost` label pool, fork B: first-planned-takes-all, plus the artist's `flags.hypeArtistPools[artistId]` pool) is consumed **inside the plan transaction** and moved onto `release.metadata.attachedHype` (signed units). The flags pools are zeroed/deleted in the same write — attached hype no longer appears in the banked-hype chip and seeds the release's starting Buzz at execution.

#### **4.5.3 Cancellation & the Refund Rule (C43 / fork E / C83)**
`DELETE /api/game/:gameId/releases/:releaseId` (planned releases only; a released release 400s) runs one transaction in `releasePlanningService.deleteRelease`:

```
refund = release.marketingBudget                  (the FULL paid pot, stored at plan time)
       − converted pre-campaign share             (preCampaign.spentToDate, clamped into
                                                   [0, preCampaign.totalBudget])
       − lead-single share IF the lead single     (C83, July 25, 2026: stored breakdown
         has ALREADY SHIPPED (song row              summed, breakdown-first read, negatives
         is_released)                               ignored; unshipped lead single deducts 0)
       floored at 0 — always from STORED release data, never client input
```

- **Pre-buzz dies (fork E)**: songs are freed (`releaseId = null`) and their `awareness`/`peak_awareness` zeroed — built anticipation does not survive cancellation (leaving it would recreate the buzz-farming exploit). ⚠️ Known defect C107: this zeroing also hits an already-shipped lead single's live Buzz (see the technical-debt backlog).
- **Attached hype dies implicitly**: it lives only on the deleted release row; nothing re-credits any pool.
- **Preview parity**: the cancel-confirmation dialog derives its refund preview with `summarizeCancelRelease(release, songs)` (`client/src/lib/releaseBuzz.ts`) using the SAME subtraction rules; without the lead single's song row it skips that deduction and the server result stays authoritative. Consequence copy is qualitative only (fork E standing rule — no multiplier numbers).

### **Phase 5: Release Execution During Week Advancement**

#### **5.1 Execution Trigger**
**Location**: `shared/engine/game-engine.ts`, `advanceWeek()` — delegates to `ReleaseProcessor.processPlannedReleases()` (`shared/engine/processors/ReleaseProcessor.ts`)
```
Weekly Advancement Process:
├── Process executive actions
├── Process ongoing projects
├── → processPlannedReleases() ← [RELEASE EXECUTION HAPPENS HERE]
├── Process weekly charts
└── Calculate weekly financials
```

#### **5.2 Release Execution Logic**
**Location**: `shared/engine/processors/ReleaseProcessor.ts` — `processPlannedReleases()` / `calculateSophisticatedReleaseOutcome()`

```
For each planned release where releaseWeek === currentWeek:
├── Load release metadata (marketing budget breakdown, seasonal timing)
├── Get associated songs via release_songs junction table
├── Reconstruct marketing budget from stored marketingBudgetBreakdown
├── Call calculateSophisticatedReleaseOutcome():
│   ├── Uses SAME calculateReleasePreview() method as UI preview
│   ├── Applies ±10% RNG variance (different seed than preview)
│   ├── Applies seasonal multipliers from stored week
│   ├── Applies marketing synergies from stored channel allocation
│   ├── Applies release type bonuses (Single +20%, EP +15%, Album +25%)
│   └── Returns per-song breakdown proportional to song quality
├── Update songs: isReleased=true, initialStreams, weeklyStreams, totalRevenue
├── Track marketing investment via InvestmentTracker
├── Update release status to 'released'
└── Add to WeekSummary for player feedback
```

#### **5.3 Variance Behavior**
```
Preview RNG Seed: gameState.id + selectedWeek (when calculating preview)
Execution RNG Seed: gameState.id + currentWeek (when release executes)
           ↓                                 ↓
Preview variance: ±10%               Execution variance: ±10% (different result)
```

**Impact**:
- **Preview**: Shows estimated performance with realistic variance
- **Execution**: Applies different variance for realism - actual results may differ ±10% from preview
- **Realistic Gameplay**: Represents unpredictable nature of music industry

### **Phase 6: Results & Player Feedback**

#### **6.1 Week Summary Display**
```
WeekSummary contains:
├── revenue: Total revenue from all releases this week
├── streams: Total streams from all releases this week
├── changes: Array of release events with song details
└── chartUpdates: New chart entries from released songs
```

#### **6.2 Long-term Revenue Tracking**
```
Released songs continue generating revenue via:
├── Weekly decay: 85% of previous week's streams
├── Ongoing revenue: weeklyStreams × $0.05 per stream
├── Maximum duration: 24 weeks of ongoing revenue
└── Total accumulation: song.totalRevenue tracks lifetime earnings
```

---

## 🎯 **Key Technical Achievements**

### **Data Consistency**
- ✅ **Single calculation engine**: Preview and execution use identical methods
- ✅ **Exact budget preservation**: Per-channel allocations stored and restored
- ✅ **Seasonal accuracy**: Timing effects calculated from stored week data
- ✅ **Marketing integrity**: Channel synergies preserved through execution

### **Variance & Realism**
- ✅ **Realistic uncertainty**: ±10% variance on all streaming calculations
- ✅ **Seeded randomness**: Deterministic variance per week for testing
- ✅ **Preview vs execution**: Different seeds create realistic unpredictability

### **Configuration-Driven**
- ✅ **Dynamic balance loading**: All multipliers from `data/balance/markets.json`
- ✅ **Hard-fail validation**: No silent fallbacks to hardcoded values
- ✅ **Single source of truth**: Shared utilities eliminate configuration drift

---

**This workflow ensures complete data consistency between player expectations (preview) and actual game outcomes (execution), while maintaining realistic variance that represents music industry unpredictability.**

*Updated: September 24, 2025 - Post data consistency fixes and marketing efficiency removal*
*Updated: July 25, 2026 - Buzz v2 section added (pre-campaign split, attach-at-plan hype, cancellation + C83 refund rule) — C84 doc-sync*