# XState Modal Orchestrator Implementation Plan

## Problem Statement

**Issue**: Campaign Results Modal and Week Summary Modal can display simultaneously when a campaign-ending week completes, creating a poor UX with stacked overlays.

**Root Cause**: Two independent `useEffect` watchers race to open modals when `advanceWeek` sets both `weeklyOutcome` and `campaignResults` simultaneously in the Zustand store.

### Current Code Paths
- `client/src/store/gameStore.ts` (advanceWeek): `set({ weeklyOutcome: result.summary, campaignResults: result.campaignResults, ... })`
- `client/src/pages/GamePage.tsx` (useEffect @ ~68): `if (campaignResults?.campaignCompleted) setShowCampaignResults(true);`
- `client/src/components/CampaignResultsModal.tsx`: rendered when `showCampaignResults && campaignResults`
- `client/src/components/Dashboard.tsx` (useEffect @ ~28): watches `weeklyOutcome` to `setShowWeekSummary(true)`
- `client/src/components/Dashboard.tsx`: renders WeekSummary modal while `showWeekSummary && weeklyOutcome`

---

## Phase 1: Research & Validation

### 🔍 Investigation Tasks

#### 1. Map Complete Modal Ecosystem
**Objective**: Understand all modals and their relationships before implementing orchestrator

**Research Prompt**:
```
Analyze the complete modal system in the codebase:

1. List ALL modal components and their purposes:
   - SaveGame
   - LabelCreation (from GamePage and Sidebar)
   - CampaignResults
   - WeekSummary
   - ConfirmDialog
   - BugReport
   - InboxModal
   - ProjectCreation
   - LivePerformance
   - GenreSelection
   - ArtistDiscovery

2. For each modal, identify:
   - What triggers it to open? (user action, store update, route change, etc.)
   - What closes it? (user dismiss, completion, navigation, etc.)
   - Does it have async operations? (fetches, mutations)
   - Can it open while another modal is open?

3. Identify modal hierarchies:
   - Which modals are "system level"? (should show over everything)
   - Which are "game flow"? (part of gameplay sequence)
   - Which are "feature specific"? (tied to specific screens)

4. Find existing modal coordination logic:
   - Z-index management
   - Backdrop click handlers  
   - ESC key behavior
   - URL query param handling (?open=save)
```

**Expected Output**: Document showing modal categories, triggers, and current coordination (or lack thereof)

---

#### 2. Analyze Week Advancement Flow
**Objective**: Understand the complete `advanceWeek` operation and what should/shouldn't happen during it

**Research Prompt**:
```
Trace the complete advanceWeek operation:

1. What exactly happens during advanceWeek?
   - API endpoints called
   - State mutations in Zustand store
   - Side effects triggered
   - Average duration/timeout

2. What's currently BLOCKED during isAdvancingWeek?
   - Are UI buttons disabled?
   - Is navigation prevented?
   - Are other async operations rejected/queued?
   - Show me the guard conditions in code

3. What SHOULD be blocked but currently isn't?
   - Can users save game during week advancement?
   - Can they navigate to different routes?
   - Can they open modals mid-advancement?
   - Can they trigger another advanceWeek?

4. Error scenarios:
   - What happens if advanceWeek API fails?
   - What happens if user refreshes during advancement?
   - Is there retry logic?
   - How is partial data handled?
```

**Expected Output**: Flow diagram of advanceWeek with all blocking/allowing conditions documented

---

#### 3. Find Edge Cases & Integration Points
**Objective**: Discover scenarios that could break the modal orchestrator

**Research Prompt**:
```
Identify edge cases and integration concerns:

1. Page Refresh Scenarios:
   - What happens if player refreshes while WeekSummary is open?
   - What happens if they refresh while CampaignResults is open?
   - How does Zustand persistence handle modal state?
   - Should post-week modals re-appear after refresh?

2. Navigation Scenarios:
   - What if player navigates to different route while modals are showing?
   - Should modals persist across routes?
   - Should they auto-dismiss on navigation?
   - What routes are accessible during post-week flow?

3. Manual Triggers:
   - Sidebar has manual WeekSummary toggle - where is it?
   - Can users manually open WeekSummary anytime?
   - Should manual open bypass the orchestrator?
   - Are there other manual modal triggers to coordinate?

4. Concurrent Operations:
   - What if advanceWeek is called while modals are open?
   - What if user tries to save/load during post-week flow?
   - What if React Query refetches during modal display?

5. Similar Patterns:
   - Are there other places where multiple useEffects watch the same store values?
   - Are there other modals that could have similar race conditions?
   - What other state machines might be needed?
```

**Expected Output**: Comprehensive edge case list with recommended handling strategies

---

#### 4. Check Dependencies & Current XState Setup
**Objective**: Verify technical requirements and existing XState infrastructure

**Research Prompt**:
```
Verify XState setup and dependencies:

1. Is XState already installed?
   - Check package.json for xstate and @xstate/react
   - What version? (we need v5+)
   - Are there existing state machines in the codebase?

2. TypeScript configuration:
   - Are types properly configured for XState?
   - Any existing XState type utilities?
   - Where should machine definitions live? (/machines, /state, etc.)

3. Existing state management patterns:
   - How is Zustand currently organized?
   - Are there store slices or selectors we should follow?
   - How do components currently subscribe to store changes?

4. Testing infrastructure:
   - Are there existing tests for modal behavior?
   - Testing library setup (Jest, Vitest, Testing Library?)
   - How should we test state machines?
```

**Expected Output**: Technical assessment with installation/setup tasks if needed

---

## Phase 2: XState Machine Design

### 🎯 State Machine Architecture

#### Core Machine: Post-Week Modal Orchestrator

```typescript
// client/src/machines/postWeekModalMachine.ts
import { setup, assign } from 'xstate';

// Types
interface WeeklyOutcome {
  week: number;
  // ... other properties from your actual type
}

interface CampaignResults {
  campaignCompleted: boolean;
  // ... other properties from your actual type
}

type PostWeekContext = {
  weeklyOutcome: WeeklyOutcome | null;
  campaignResults: CampaignResults | null;
  lastProcessedWeek: number | null;
};

type PostWeekEvents =
  | { type: 'WEEK_ADVANCED'; weeklyOutcome: WeeklyOutcome; campaignResults?: CampaignResults }
  | { type: 'CLOSE_WEEK_SUMMARY' }
  | { type: 'CLOSE_CAMPAIGN_RESULTS' }
  | { type: 'MANUAL_OPEN_WEEK_SUMMARY' }
  | { type: 'RESET' };

// Machine Definition
export const postWeekModalMachine = setup({
  types: {
    context: {} as PostWeekContext,
    events: {} as PostWeekEvents
  },
  guards: {
    hasWeeklyOutcome: ({ context }) => context.weeklyOutcome !== null,
    hasCampaignResults: ({ context }) => context.campaignResults?.campaignCompleted === true,
    hasBothResults: ({ context }) => 
      context.weeklyOutcome !== null && context.campaignResults?.campaignCompleted === true,
  },
  actions: {
    storeWeekData: assign({
      weeklyOutcome: ({ event }) => 
        event.type === 'WEEK_ADVANCED' ? event.weeklyOutcome : null,
      campaignResults: ({ event }) => 
        event.type === 'WEEK_ADVANCED' ? (event.campaignResults ?? null) : null,
      lastProcessedWeek: ({ event }) =>
        event.type === 'WEEK_ADVANCED' ? event.weeklyOutcome.week : null,
    }),
    clearData: assign({
      weeklyOutcome: null,
      campaignResults: null,
      lastProcessedWeek: null,
    }),
  }
}).createMachine({
  id: 'postWeekModals',
  initial: 'idle',
  context: {
    weeklyOutcome: null,
    campaignResults: null,
    lastProcessedWeek: null,
  },
  states: {
    idle: {
      on: {
        WEEK_ADVANCED: {
          target: 'determiningSequence',
          actions: 'storeWeekData'
        },
        MANUAL_OPEN_WEEK_SUMMARY: {
          target: 'showingWeekSummary',
          guard: 'hasWeeklyOutcome'
        }
      }
    },
    
    determiningSequence: {
      description: 'Decides which modal(s) to show based on available data',
      always: [
        {
          target: 'showingWeekSummary',
          guard: 'hasWeeklyOutcome',
          description: 'Always show week summary first (campaign results will follow if present)'
        },
        { 
          target: 'idle',
          description: 'No data to show'
        }
      ]
    },
    
    showingWeekSummary: {
      description: 'Week summary modal is visible',
      on: {
        CLOSE_WEEK_SUMMARY: {
          target: 'checkingForCampaign'
        }
      }
    },
    
    checkingForCampaign: {
      description: 'After week summary closes, check if campaign results should show',
      always: [
        {
          target: 'showingCampaignResults',
          guard: 'hasCampaignResults',
          description: 'Campaign completed - show results'
        },
        { 
          target: 'idle',
          actions: 'clearData',
          description: 'No campaign results - return to idle and clear data'
        }
      ]
    },
    
    showingCampaignResults: {
      description: 'Campaign results modal is visible',
      on: {
        CLOSE_CAMPAIGN_RESULTS: {
          target: 'idle',
          actions: 'clearData'
        }
      }
    }
  },
  on: {
    RESET: {
      target: '.idle',
      actions: 'clearData'
    }
  }
});
```

---

### 🎨 Visualization

**Question for LLM**:
```
Generate a Mermaid diagram of the postWeekModalMachine state machine showing:
- All states (idle, determiningSequence, showingWeekSummary, checkingForCampaign, showingCampaignResults)
- All transitions and their event triggers
- Guard conditions on transitions
- Actions performed during transitions

Use this for documentation and team discussion.
```

---

## Phase 3: Implementation

### 📝 Code Changes Required

#### 1. Install Dependencies (if needed)

```bash
npm install xstate@latest @xstate/react@latest
# or
pnpm add xstate@latest @xstate/react@latest
```

---

#### 2. Create Machine File

**File**: `client/src/machines/postWeekModalMachine.ts`

*Use the machine definition from Phase 2 above*

---

#### 3. Update GamePage.tsx

**File**: `client/src/pages/GamePage.tsx`

**Changes**:
```typescript
// ADD IMPORTS
import { useMachine } from '@xstate/react';
import { postWeekModalMachine } from '../machines/postWeekModalMachine';

// INSIDE COMPONENT:

// Initialize machine
const [modalState, sendModalEvent] = useMachine(postWeekModalMachine);

// REMOVE old useEffect:
// useEffect(() => {
//   if (campaignResults?.campaignCompleted) {
//     setShowCampaignResults(true);
//   }
// }, [campaignResults]);

// REPLACE with machine-driven logic:
useEffect(() => {
  // Only trigger when week advancement completes
  if (weeklyOutcome && !isAdvancingWeek) {
    sendModalEvent({ 
      type: 'WEEK_ADVANCED', 
      weeklyOutcome, 
      campaignResults 
    });
  }
}, [weeklyOutcome, campaignResults, isAdvancingWeek, sendModalEvent]);

// REPLACE state checks with machine state:
// const showWeekSummary = ... (old logic)
// const showCampaignResults = ... (old logic)

const showWeekSummary = modalState.matches('showingWeekSummary');
const showCampaignResults = modalState.matches('showingCampaignResults');

// UPDATE modal components:
<WeekSummary 
  isOpen={showWeekSummary}
  weeklyOutcome={modalState.context.weeklyOutcome}
  onClose={() => sendModalEvent({ type: 'CLOSE_WEEK_SUMMARY' })}
/>

<CampaignResultsModal
  isOpen={showCampaignResults}
  campaignResults={modalState.context.campaignResults}
  onClose={() => sendModalEvent({ type: 'CLOSE_CAMPAIGN_RESULTS' })}
/>
```

**Research Questions**:
```
1. What's the exact current structure of GamePage.tsx around line 68?
2. What props do WeekSummary and CampaignResultsModal currently accept?
3. Are there other local state variables (showCampaignResults, etc.) to remove?
4. Where is weeklyOutcome, campaignResults, and isAdvancingWeek coming from? (Zustand selectors?)
```

---

#### 4. Update Dashboard.tsx

**File**: `client/src/components/Dashboard.tsx`

**Changes**:
```typescript
// REMOVE auto-open useEffect entirely:
// useEffect(() => {
//   if (weeklyOutcome && weeklyOutcome.week === (gameState.currentWeek ?? 1) - 1 
//       && !isAdvancingWeek && lastProcessedWeek !== weeklyOutcome.week) {
//     setShowWeekSummary(true);
//     setLastProcessedWeek(weeklyOutcome.week);
//   }
// }, [weeklyOutcome, gameState.currentWeek, isAdvancingWeek, lastProcessedWeek]);

// KEEP manual toggle but connect to machine:
// (This requires Dashboard to either access the machine directly or receive sendModalEvent as prop)

// Option A: Pass machine controls from GamePage as props
interface DashboardProps {
  onManualOpenWeekSummary: () => void;
  // ... other props
}

const Dashboard = ({ onManualOpenWeekSummary, ... }: DashboardProps) => {
  // Use prop instead of local state
  const handleOpenWeekSummary = () => {
    onManualOpenWeekSummary();
  };
  
  // ...
};

// Option B: Create shared machine context (if Dashboard also shows modals)
// (Requires Context API or moving machine to higher level)
```

**Research Questions**:
```
1. What's the exact current structure of Dashboard.tsx around line 28?
2. Where is the manual WeekSummary toggle button? (In sidebar or Dashboard?)
3. Does Dashboard render the WeekSummary component, or does GamePage?
4. What's the relationship between Dashboard and GamePage in the component tree?
5. Should the machine live in a Context provider for shared access?
```

---

#### 5. Remove/Update Local State

**Research Prompt**:
```
Find and list all local useState calls related to modal visibility:

1. Search for:
   - setShowCampaignResults
   - setShowWeekSummary  
   - showCampaignResults
   - showWeekSummary
   - Any other modal visibility state

2. For each, determine:
   - Where is it defined?
   - What sets it to true/false?
   - What components read it?
   - Can it be safely removed and replaced with machine state?

3. Identify any props that pass modal state between components
```

---

## Phase 4: Testing Strategy

### ✅ Test Cases

#### Unit Tests for State Machine

**File**: `client/src/machines/__tests__/postWeekModalMachine.test.ts`

```typescript
import { describe, it, expect } from 'vitest'; // or jest
import { createActor } from 'xstate';
import { postWeekModalMachine } from '../postWeekModalMachine';

describe('postWeekModalMachine', () => {
  it('should start in idle state', () => {
    const actor = createActor(postWeekModalMachine);
    actor.start();
    
    expect(actor.getSnapshot().value).toBe('idle');
  });

  it('should show week summary when week advances with only weeklyOutcome', () => {
    const actor = createActor(postWeekModalMachine);
    actor.start();
    
    actor.send({ 
      type: 'WEEK_ADVANCED', 
      weeklyOutcome: { week: 5 } 
    });
    
    expect(actor.getSnapshot().value).toBe('showingWeekSummary');
  });

  it('should show week summary first, then campaign results when both present', () => {
    const actor = createActor(postWeekModalMachine);
    actor.start();
    
    // Advance with both results
    actor.send({ 
      type: 'WEEK_ADVANCED', 
      weeklyOutcome: { week: 10 },
      campaignResults: { campaignCompleted: true }
    });
    
    // Should show week summary first
    expect(actor.getSnapshot().value).toBe('showingWeekSummary');
    
    // Close week summary
    actor.send({ type: 'CLOSE_WEEK_SUMMARY' });
    
    // Should automatically show campaign results
    expect(actor.getSnapshot().value).toBe('showingCampaignResults');
  });

  it('should return to idle after campaign results close', () => {
    const actor = createActor(postWeekModalMachine);
    actor.start();
    
    actor.send({ 
      type: 'WEEK_ADVANCED', 
      weeklyOutcome: { week: 10 },
      campaignResults: { campaignCompleted: true }
    });
    
    actor.send({ type: 'CLOSE_WEEK_SUMMARY' });
    actor.send({ type: 'CLOSE_CAMPAIGN_RESULTS' });
    
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.weeklyOutcome).toBeNull();
  });

  it('should handle manual week summary open', () => {
    const actor = createActor(postWeekModalMachine);
    actor.start();
    
    // Set up context with previous week data
    actor.send({ 
      type: 'WEEK_ADVANCED', 
      weeklyOutcome: { week: 3 }
    });
    actor.send({ type: 'CLOSE_WEEK_SUMMARY' });
    
    // Manually reopen
    actor.send({ type: 'MANUAL_OPEN_WEEK_SUMMARY' });
    
    expect(actor.getSnapshot().value).toBe('showingWeekSummary');
  });

  it('should not show modals when advancing week with no data', () => {
    const actor = createActor(postWeekModalMachine);
    actor.start();
    
    actor.send({ 
      type: 'WEEK_ADVANCED', 
      weeklyOutcome: null as any // Edge case
    });
    
    expect(actor.getSnapshot().value).toBe('idle');
  });
});
```

---

#### Integration Tests

**File**: `client/src/pages/__tests__/GamePage.integration.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GamePage } from '../GamePage';
import { useGameStore } from '../../store/gameStore';

// Mock the store
vi.mock('../../store/gameStore');

describe('GamePage Modal Integration', () => {
  it('should show week summary then campaign results in sequence', async () => {
    // Setup mock store with campaign completion data
    useGameStore.mockReturnValue({
      weeklyOutcome: { week: 10 },
      campaignResults: { campaignCompleted: true },
      isAdvancingWeek: false,
      // ... other store values
    });

    render(<GamePage />);

    // Week summary should appear first
    expect(screen.getByTestId('week-summary-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('campaign-results-modal')).not.toBeInTheDocument();

    // Close week summary
    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    // Campaign results should now appear
    await waitFor(() => {
      expect(screen.getByTestId('campaign-results-modal')).toBeInTheDocument();
    });
  });

  it('should not show both modals simultaneously', async () => {
    useGameStore.mockReturnValue({
      weeklyOutcome: { week: 10 },
      campaignResults: { campaignCompleted: true },
      isAdvancingWeek: false,
    });

    render(<GamePage />);

    // At any point in time, only one modal should be visible
    const weekSummary = screen.queryByTestId('week-summary-modal');
    const campaignResults = screen.queryByTestId('campaign-results-modal');

    expect(weekSummary || campaignResults).toBeTruthy();
    expect(weekSummary && campaignResults).toBeFalsy();
  });
});
```

**Research Questions**:
```
1. What's the current testing setup? (Jest, Vitest, Testing Library?)
2. Are there existing test files for GamePage or Dashboard?
3. How is the Zustand store mocked in tests?
4. What test IDs or accessibility labels exist on modals?
5. Are there existing integration tests to follow as patterns?
```

---

## Phase 5: Monitoring & Validation

### 📊 Success Metrics

**After Implementation, Verify**:

1. **Functional Requirements**:
   - [ ] Week summary always shows before campaign results
   - [ ] Only one modal visible at a time
   - [ ] Manual week summary toggle still works
   - [ ] Modals show correct data from Zustand store
   - [ ] Closing campaign results clears all modal state

2. **Edge Cases Handled**:
   - [ ] Page refresh during modal display (define expected behavior)
   - [ ] Navigation during modal display (define expected behavior)
   - [ ] Multiple rapid week advancements (should queue or prevent?)
   - [ ] Week advancement fails/errors (modal state resets?)

3. **Developer Experience**:
   - [ ] State machine is visualizable in Stately Inspector
   - [ ] Code is more maintainable than before
   - [ ] New team members can understand the flow
   - [ ] Adding new post-week modals is straightforward

---

### 🔍 Stately Inspector Integration

**Setup for Debugging**:

```typescript
// In development, connect to Stately Inspector
import { createBrowserInspector } from '@statelyai/inspect';

if (import.meta.env.DEV) {
  const inspector = createBrowserInspector();
  
  // When creating the actor:
  const [modalState, sendModalEvent] = useMachine(postWeekModalMachine, {
    inspect: inspector.inspect
  });
}
```

**Research Question**:
```
What's the dev environment setup?
- Vite, Create React App, or other?
- How to conditionally enable inspector?
- Where to document inspector usage for team?
```

---

## Phase 6: Documentation

### 📚 Documentation Checklist

1. **State Machine Documentation**:
   - [ ] Mermaid diagram in code comments
   - [ ] README explaining the machine's purpose
   - [ ] Guard conditions documented
   - [ ] Event triggers documented

2. **Integration Guide**:
   - [ ] How to add new post-week modals
   - [ ] How to test modal sequences
   - [ ] How to debug with Stately Inspector

3. **Team Onboarding**:
   - [ ] Why we chose XState for this
   - [ ] How it prevents the original bug
   - [ ] Link to XState docs for learning

---

## Phase 7: Future Enhancements

### 🚀 Potential Expansions

**After validating the post-week modal orchestrator, consider**:

1. **Global Modal Manager**:
   - Coordinate ALL modals (not just post-week)
   - Handle modal priority/z-index
   - Manage system modals (confirm, bug report) as interruptions

2. **Game Flow State Machine**:
   - Orchestrate: menu → playing → paused → game_over
   - Prevent actions during week advancement
   - Coordinate saving/loading with modal state

3. **Navigation State Machine**:
   - Validate route transitions
   - Handle deep linking with modal state
   - Manage back button behavior

**Research Prompt for Future**:
```
After implementing the post-week modal orchestrator, identify:

1. What other state coordination problems exist?
   - Where do multiple systems fight over control?
   - What other "impossible states" can occur?
   - What other sequences need guaranteed ordering?

2. What's the next highest-impact state machine?
   - Most bugs?
   - Most confusing code?
   - Most requested feature additions?

3. Should we create a global modal coordination system?
   - How many total modals exist?
   - How complex is the modal interaction matrix?
   - Would a global orchestrator simplify or complicate?
```

---

## Rollout Plan

### 🎯 Phased Implementation

**Week 1: Research & Design**
- [ ] Complete all research prompts
- [ ] Answer all "Research Questions"
- [ ] Finalize machine design based on findings
- [ ] Review with team

**Week 2: Implementation**
- [ ] Install dependencies
- [ ] Create machine file
- [ ] Update GamePage.tsx
- [ ] Update Dashboard.tsx
- [ ] Remove old state logic

**Week 3: Testing**
- [ ] Write unit tests for machine
- [ ] Write integration tests
- [ ] Manual QA of edge cases
- [ ] Test with Stately Inspector

**Week 4: Documentation & Deploy**
- [ ] Write documentation
- [ ] Team review
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production

---

## Open Questions for LLM

**Before starting implementation, research and answer**:

### Critical Path Questions:
1. What's the exact current file structure around modal rendering?
2. Where does the machine instance need to live? (GamePage, Context, or higher?)
3. How should Dashboard access the machine? (Props drilling, Context, or separate instance?)
4. What's the expected behavior on page refresh during modals?
5. What's the expected behavior on navigation during modals?

### Technical Questions:
6. Is XState v5 already installed or do we need to add it?
7. What's the testing framework and existing patterns?
8. Where should machine files live in the project structure?
9. Are there TypeScript issues to resolve with the current types?
10. How do we enable Stately Inspector in development?

### Product Questions:
11. Should manual week summary toggle bypass the orchestrator or use it?
12. Can users navigate away during post-week modals?
13. Should post-week modals persist across page refreshes?
14. Are there other modals that should be part of this sequence?
15. What analytics/logging should track modal flow?

---

## Success Criteria

**This implementation is successful when**:

✅ The campaign results + week summary stacking bug is completely eliminated
✅ Modal sequence is guaranteed and predictable  
✅ Code is more maintainable than the dual-useEffect approach
✅ Team can visualize and understand the flow via state diagram
✅ Edge cases are handled gracefully
✅ Tests provide confidence in the implementation
✅ Future modal additions have a clear pattern to follow

---

## Resources

- [XState v5 Documentation](https://stately.ai/docs/xstate)
- [Stately Inspector](https://stately.ai/docs/inspector)
- [@xstate/react Hooks](https://stately.ai/docs/xstate-react)
- [XState Testing Guide](https://stately.ai/docs/testing)
