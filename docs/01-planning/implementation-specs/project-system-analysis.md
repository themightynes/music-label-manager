# Project System Analysis - Technical Deep Dive
**Created: August 30, 2025**  
**Purpose: Document the current state of the Project creation system for future cleanup**

---

## Executive Summary

The Project system (accessed via `ProjectCreationModal`) is intended to be a **recording-only** system that creates songs without releasing them. However, there's significant dead code suggesting it once handled both recording AND releasing, leading to confusion about its actual behavior and purpose.

**Key Finding**: Projects currently DO NOT generate streams, revenue, or reputation - they only create songs in the database. The code that would handle project completion outcomes is entirely commented out.

---

## Current Implementation Status

### What Projects Actually Do

1. **Create Songs in Database**
   - Singles create 1-3 songs over 2-4 months
   - EPs create 3-5 songs over 4-8 months
   - Songs are marked with quality scores based on artist mood, producer tier, and time investment
   - Songs are immediately marked as "released" in the database (this is incorrect - see Issues section)

2. **Deduct Budget**
   - Singles: $3,000 - $12,000
   - EPs: $15,000 - $35,000
   - Mini-Tours: $5,000 - $15,000

3. **Track in Database**
   - Projects are stored in the `projects` table
   - Have start/end months for duration tracking
   - Status field exists but isn't actively managed

### What Projects DON'T Do (Despite Code Existing)

1. **Generate Streams** - Code exists but is never called
2. **Generate Revenue** - Code exists but is never called  
3. **Generate Reputation** - Code exists but is never called
4. **Process Completion** - Entire completion system is commented out
5. **Update Status** - Projects never transition from 'active' to 'completed'

---

## Code Architecture

### Active Components

#### 1. ProjectCreationModal (`/client/src/components/ProjectCreationModal.tsx`)
- UI for creating Single/EP/Mini-Tour projects
- Sends POST request to `/api/projects/create`
- Shows budget ranges and duration estimates
- Allows artist, producer, and time investment selection

#### 2. Project Creation Endpoint (`/server/routes.ts:~1200`)
- Creates project in database
- Deducts budget from game state
- Returns updated game state
- Does NOT schedule any completion processing

#### 3. Song Generation (`/shared/engine/game-engine.ts:1275-1438`)
- `processRecordingProjects()` - Actively generates songs each month
- `generateProjectSongs()` - Creates song records with quality calculation
- Songs are immediately marked as `released: true` (incorrect behavior)
- Quality formula includes artist mood, producer tier, and time investment bonuses

### Dead/Commented Code

#### 1. Project Completion System (`/shared/engine/game-engine.ts:513-542`)
```typescript
// private async processOngoingProjects(summary: MonthSummary, dbTransaction?: any): Promise<void> {
//   // ENTIRE FUNCTION COMMENTED OUT
//   // Would have:
//   // - Decremented monthsRemaining
//   // - Marked projects as 'completed'
//   // - Called calculateProjectOutcomes()
//   // - Added completion to monthly summary
// }
```

#### 2. Project Outcomes Calculation (`/shared/engine/game-engine.ts:2485-2580`)
```typescript
async calculateProjectOutcomes(project: any, summary: MonthSummary): Promise<{
  revenue: number;
  streams?: number;
  pressPickups?: number;
  description: string;
}>
```
- **Exists but is NEVER called**
- Would calculate streams based on quality/reputation/marketing
- Would give reputation: `Math.floor(streams / 10000)` 
- Would calculate press pickups
- Contains full implementation for Singles/EPs generating revenue

#### 3. Streaming Calculation (`/shared/engine/game-engine.ts:2507-2543`)
- Code to calculate streams from project quality
- Revenue calculation: `streams * revenuePerStream`
- Reputation gain: 1 per 10,000 streams
- Press coverage calculation
- **All of this is dead code**

---

## The Release System (How Songs Actually Get Released)

### Planned Releases (`/client/src/pages/PlanReleasePage.tsx`)
1. User selects recorded songs (from Projects)
2. Schedules release with marketing budget
3. On release month:
   - Songs generate streams based on quality + marketing
   - Revenue calculated from streams
   - Reputation ONLY from press coverage (if marketing spent)
   - Songs marked with `releaseMonth` in database

### Key Distinction
- **Projects**: Recording sessions that create songs
- **Planned Releases**: Marketing campaigns that release songs to generate revenue

---

## Critical Issues

### 1. Songs Marked as Released Immediately
**Location**: `/shared/engine/game-engine.ts:1412-1415`
```typescript
released: true,  // Songs marked as released during recording!
releaseMonth: null,
songwritingQuality: finalQuality,
productionQuality: Math.round(finalQuality * 0.9),
```
**Problem**: Songs are marked as "released" when created, not when actually released via PlanReleasePage

### 2. No Project Status Management
- Projects never transition from 'active' to 'completed'
- `monthsRemaining` field exists but isn't decremented
- No cleanup of finished projects

### 3. Confusion About Revenue/Reputation
- Dead code suggests projects once generated revenue directly
- This conflicts with the release planning system
- Leads to confusion about where reputation comes from

### 4. Misleading Function Names
- `calculateProjectOutcomes()` implies projects have outcomes
- `processOngoingProjects()` is commented out but still in codebase
- Creates expectation that projects do more than just record

### 5. No Reputation for Actual Releases
- Planned releases only get reputation from press RNG
- No base reputation for releasing singles/EPs
- Makes progression heavily RNG-dependent

---

## Database Schema Issues

### Projects Table
```sql
- status: text DEFAULT 'active' -- Never updated to 'completed'
- monthsRemaining: integer -- Never decremented
- revenue: integer DEFAULT 0 -- Never used
- streams: integer DEFAULT 0 -- Never used
```
These fields suggest projects were meant to track outcomes, but they're never populated.

### Songs Table
```sql
- released: boolean DEFAULT false -- Always set to true on creation
- releaseMonth: integer -- Only set by PlanReleasePage, not Projects
```
Conflicting release tracking between two systems.

---

## Recommended Cleanup Actions

### Phase 1: Remove Dead Code
1. Delete `calculateProjectOutcomes()` function entirely
2. Delete commented `processOngoingProjects()` function
3. Remove revenue/streams fields from projects table schema
4. Remove all streaming/revenue calculation code from project context

### Phase 2: Fix Song State Management
1. Songs should be created with `released: false`
2. Only PlanReleasePage should set `released: true`
3. Add `recordedMonth` field to track when song was recorded
4. Properly distinguish recorded vs released songs in UI

### Phase 3: Clarify Project Purpose
1. Rename "Project" to "Recording Session" throughout codebase
2. Update UI text to clarify projects only create songs
3. Remove any references to projects generating revenue
4. Add clear documentation about recording vs releasing

### Phase 4: Fix Reputation System
1. Add base reputation for releasing singles (+5-8) and EPs (+8-12)
2. Keep press coverage as bonus reputation
3. Make reputation gains more predictable
4. Consider reputation from tour performances

### Phase 5: Project Lifecycle Management
1. Implement proper status transitions (active → completed)
2. Auto-complete projects when duration ends
3. Show completed projects in UI with outcomes
4. Clean up old completed projects after N months

---

## Code Locations Reference

### Key Files
- `/client/src/components/ProjectCreationModal.tsx` - Project creation UI
- `/server/routes.ts:~1200` - Project creation endpoint
- `/shared/engine/game-engine.ts:1275-1438` - Song generation (active)
- `/shared/engine/game-engine.ts:513-542` - Project completion (commented)
- `/shared/engine/game-engine.ts:2485-2580` - Project outcomes (dead code)
- `/client/src/pages/PlanReleasePage.tsx` - Actual release system
- `/shared/schema.ts:240-250` - Projects table definition

### Related Systems
- Song generation: Working correctly
- Release planning: Working but missing reputation rewards
- Project tracking: Partially broken (no status updates)
- Revenue calculation: Only works through releases, not projects

---

## Testing Considerations

When cleaning up this system, test:
1. Creating projects still generates songs
2. Songs can be released via PlanReleasePage
3. No revenue/reputation from project completion
4. Project status tracking (if implemented)
5. Migration of existing data with incorrect release flags

---

## Conclusion

The Project system is functional for its core purpose (creating songs) but carries significant technical debt from an earlier design where projects handled both recording and releasing. This dead code creates confusion and should be cleaned up to clearly separate:

1. **Recording** (Projects) - Creates songs only
2. **Releasing** (Planned Releases) - Generates revenue/reputation

The reputation system particularly needs attention, as currently releases provide no guaranteed reputation gain, making progression overly dependent on RNG press coverage.