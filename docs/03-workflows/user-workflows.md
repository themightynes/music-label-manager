# Complete User Workflows

**Music Label Manager - End-to-End User Journeys**  
*Version: 1.0 (MVP Complete)*

---

## 🎮 Overview

This document details every user interaction and workflow in the Music Label Manager. Each workflow includes the user steps, system responses, and technical implementation details.

---

## 🚀 Core Game Workflows

### **1. New Game Creation**

**User Journey**:
```
1. User visits application
2. Clicks "Create New Game" or starts first session
3. System creates new game with default values
4. Dashboard loads with starting resources
```

**Technical Flow**:
```typescript
// 1. Frontend initiates game creation
const newGameState = await createNewGame('standard');

// 2. Server creates game state
POST /api/game
{
  currentMonth: 1,
  money: 75000,
  reputation: 5,
  creativeCapital: 10,
  focusSlots: 3,
  campaignType: 'standard'
}

// 3. Database transaction
INSERT INTO game_states (user_id, current_month, money, reputation, ...)
INSERT INTO default roles (manager, anr, producer, ...)

// 4. UI updates
- Dashboard shows starting KPIs
- MonthPlanner shows 3 available focus slots
- ArtistRoster shows "No artists signed" state
```

**System State After**:
- New game_states record with UUID
- User has $75,000, 5 reputation, 10 creative capital
- Month 1 of 12-month campaign
- 3 focus slots available

---

### **2. Monthly Turn Workflow**

**User Journey**:
```
1. User views MonthPlanner with available actions
2. Selects up to 3 actions (role meetings, projects, etc.)
3. Each action may trigger dialogue modal
4. User completes action selection
5. Clicks "Advance Month" button
6. System processes turn and shows results
7. Dashboard updates with new state
```

**Detailed Technical Flow**:

#### **Step 1: Action Selection**
```typescript
// User clicks role meeting (e.g., "Meet A&R Rep")
const handleRoleClick = async (roleId: string) => {
  // 1. Add action to selection
  selectAction(actionId);
  
  // 2. Open dialogue modal
  await openDialogue(roleId, 'monthly_check_in');
  
  // 3. Show DialogueModal with role data
  GET /api/roles/anr → returns dialogue choices
};
```

#### **Step 2: Dialogue Interaction**
```typescript
// User selects dialogue choice in modal
const handleChoiceSelect = async (choiceId: string, effects: any) => {
  // 1. Apply immediate effects
  if (effects.money) gameState.money += effects.money;
  if (effects.reputation) gameState.reputation += effects.reputation;
  
  // 2. Store delayed effects in flags
  if (effects.delayed) {
    gameState.flags[`delayed_${choiceId}`] = {
      triggerMonth: currentMonth + 1,
      effects: effects.delayed
    };
  }
  
  // 3. Record action for month processing
  POST /api/game/:gameId/actions
  {
    actionType: 'dialogue',
    results: { roleId, choiceId, effects }
  }
  
  // 4. Close modal and keep action selected
  closeDialogue();
};
```

#### **Step 3: Month Advancement**
```typescript
// User clicks "Advance Month"
const advanceMonth = async () => {
  // 1. Validate selection (has actions selected)
  if (selectedActions.length === 0) return;
  
  // 2. Call advancement API
  POST /api/advance-month
  {
    gameId: gameState.id,
    selectedActions: [
      { actionType: 'role_meeting', targetId: 'anr', metadata: {} },
      { actionType: 'role_meeting', targetId: 'manager', metadata: {} },
      { actionType: 'start_project', targetId: artistId, metadata: { projectType: 'single' }}
    ]
  }
  
  // 3. Server processes in GameEngine
  const monthResult = await gameEngine.advanceMonth(formattedActions);
  
  // 4. Database transaction updates everything
  await db.transaction(async (tx) => {
    await tx.update(gameStates).set(monthResult.gameState);
    await tx.insert(monthlyActions).values(actionRecords);
    await tx.update(projects).set(progressUpdates);
  });
  
  // 5. Response updates client state
  return {
    gameState: updatedGameState,
    summary: monthResult.summary,
    campaignResults: monthResult.campaignResults // if month 12
  };
};
```

#### **Step 4: Results Display**
```typescript
// Client receives advancement results
const result = await advanceMonth();

// 1. Update Zustand store
set({
  gameState: result.gameState,
  selectedActions: [], // Reset for next month
  campaignResults: result.campaignResults // Triggers completion modal if present
});

// 2. Dashboard updates automatically through state
// - KPICards show new money/reputation
// - MonthPlanner shows next month
// - ActiveProjects show updated stages
```

**System State Changes**:
- `current_month` incremented
- Resources updated (money, reputation, creative capital)
- `selected_actions` reset to empty
- Project stages advanced
- Monthly burn applied ($3-6k operational costs)
- Campaign completion checked (if month 12)

---

### **3. Artist Discovery & Signing**

**User Journey**:
```
1. User clicks "Discover Artists" in ArtistRoster
2. ArtistDiscoveryModal opens with available artists
3. User reviews artist details (archetype, costs, traits)
4. Clicks "Sign Artist" on preferred choice
5. System validates budget and processes signing
6. ArtistRoster updates with new signed artist
```

**Technical Implementation**:

#### **Step 1: Artist Discovery**
```typescript
// User opens discovery modal
<ArtistDiscoveryModal 
  onArtistSelect={handleArtistSign}
  gameState={gameState}
/>

// Modal loads available artists
const availableArtists = [
  {
    id: 'nova_sterling',
    name: 'Nova Sterling',
    archetype: 'Visionary',
    genre: 'Experimental Pop',
    talent: 85,
    signingCost: 8000,
    monthlyCost: 1200,
    traits: ['perfectionist', 'social_media_savvy']
  },
  // ... more artists
];
```

#### **Step 2: Signing Process**
```typescript
const handleArtistSign = async (artistData: Artist) => {
  // 1. Validate budget
  if (gameState.money < artistData.signingCost) {
    throw new Error('Insufficient funds');
  }
  
  // 2. API call to sign artist
  POST /api/game/:gameId/artists
  {
    name: artistData.name,
    archetype: artistData.archetype,
    talent: artistData.talent,
    signingCost: artistData.signingCost,
    monthlyCost: artistData.monthlyCost,
    signedMonth: gameState.currentMonth
  }
  
  // 3. Server processes transaction
  await db.transaction(async (tx) => {
    // Create artist record
    const artist = await tx.insert(artists).values(artistData);
    
    // Deduct signing cost
    await tx.update(gameStates)
      .set({ money: gameState.money - signingCost })
      .where(eq(gameStates.id, gameId));
    
    // Update artist count for monthly costs
    const flags = { ...gameState.flags, signed_artists_count: currentCount + 1 };
    await tx.update(gameStates).set({ flags });
  });
  
  // 4. Update client state
  set({
    artists: [...artists, newArtist],
    gameState: { ...gameState, money: newMoney }
  });
};
```

**System State Changes**:
- New `artists` record created
- `money` reduced by signing cost
- `flags.signed_artists_count` updated for monthly burn calculation
- Artist appears in ArtistRoster component

---

### **4. Project Creation Workflow**

**User Journey**:
```
1. User selects "Start Project" action in MonthPlanner
2. ProjectCreationModal opens with project options
3. User selects project type (Single, EP, Mini-Tour)
4. User selects artist and enters project details
5. System validates budget and creates project
6. Project appears in ActiveProjects with "Planning" stage
```

**Technical Implementation**:

#### **Step 1: Project Selection**
```typescript
// User selects project action
const projectAction = {
  actionType: 'start_project',
  targetId: selectedArtistId,
  metadata: {
    projectType: 'single', // or 'ep', 'mini-tour'
    title: 'New Single Name',
    genre: 'Indie Rock'
  }
};
```

#### **Step 2: GameEngine Processing**
```typescript
// During month advancement, GameEngine processes project
private async processProjectStart(action: GameEngineAction, summary: MonthSummary) {
  const projectType = action.details.projectType;
  const projectCosts = await this.gameData.getProjectCosts(projectType);
  const baseCost = projectCosts.min + ((projectCosts.max - projectCosts.min) * 0.5);
  
  // Validate budget
  if (this.gameState.money < baseCost) {
    summary.changes.push({
      type: 'expense',
      description: `Cannot afford ${projectType} - insufficient funds`,
      amount: 0
    });
    return;
  }
  
  // Create project (handled separately in database)
  const newProject = {
    title: action.details.title,
    type: projectType,
    artistId: action.targetId,
    stage: 'planning',
    quality: 40 + Math.floor(this.getRandom(0, 20)),
    budget: baseCost,
    startMonth: this.gameState.currentMonth
  };
}
```

#### **Step 3: Database Creation**
```typescript
// Server creates project record
POST /api/game/:gameId/projects
{
  title: 'New Single Name',
  type: 'single',
  artistId: selectedArtistId,
  stage: 'planning',
  quality: 45,
  budget: 7500,
  startMonth: currentMonth
}

// Database transaction
await db.insert(projects).values({
  id: uuid(),
  gameId: gameId,
  artistId: artistId,
  title: projectData.title,
  type: projectData.type,
  stage: 'planning',
  quality: projectData.quality,
  budget: projectData.budget,
  startMonth: currentMonth
});
```

#### **Step 4: Project Progression**
```typescript
// Each month, projects auto-advance stages
const stages = ['planning', 'production', 'marketing', 'released'];
const currentStageIndex = stages.indexOf(project.stage);
const monthsElapsed = currentMonth - project.startMonth;

// Auto-progression logic
if (monthsElapsed >= 1 && currentStageIndex === 0) {
  newStage = 'production'; // planning → production
} else if (monthsElapsed >= 2 && currentStageIndex === 1) {
  newStage = 'marketing';  // production → marketing  
} else if (monthsElapsed >= 3 && currentStageIndex === 2) {
  newStage = 'released';   // marketing → released
}

// Quality increases each stage
newQuality = Math.min(100, currentQuality + 25);
```

**System State Changes**:
- New `projects` record created
- `money` reduced by project cost
- Project visible in ActiveProjects component
- Automatic stage progression over subsequent months

---

### **5. Save & Load System**

**User Journey**:
```
1. User clicks save icon in Dashboard header
2. SaveGameModal opens with 3 save slots
3. User enters save name and clicks save
4. System creates save with current game state
5. Save appears in slot with metadata
6. User can later click "Load" to restore save
```

**Technical Implementation**:

#### **Save Process**
```typescript
const handleSave = async (saveName: string) => {
  // 1. Gather complete game state
  const saveData = {
    name: saveName,
    gameState: {
      gameState: gameState,
      artists: artists,
      projects: projects,
      roles: roles
    },
    month: gameState.currentMonth,
    isAutosave: false
  };
  
  // 2. API call
  POST /api/saves
  {
    name: 'My Campaign Save',
    gameState: { /* complete state */ },
    month: 8,
    isAutosave: false
  }
  
  // 3. Database storage
  await db.insert(gameSaves).values({
    userId: req.userId,
    name: saveData.name,
    gameState: saveData.gameState, // JSONB column
    month: saveData.month,
    createdAt: new Date()
  });
};
```

#### **Load Process**
```typescript
const handleLoad = async (saveId: string) => {
  // 1. Fetch save data
  GET /api/saves → returns user's saves
  
  // 2. Find specific save
  const save = saves.find(s => s.id === saveId);
  const savedGameData = save.gameState;
  
  // 3. Restore complete state
  set({
    gameState: savedGameData.gameState,
    artists: savedGameData.artists || [],
    projects: savedGameData.projects || [],
    roles: savedGameData.roles || [],
    selectedActions: [], // Reset for clean state
    campaignResults: null,
    monthlyOutcome: null
  });
  
  // 4. Update game context
  setGameId(savedGameData.gameState.id);
};
```

**System State Changes**:
- New `game_saves` record with JSONB snapshot
- Complete game state restoration from save
- All UI components update to reflect loaded state

---

### **6. Campaign Completion Workflow**

**User Journey**:
```
1. User reaches month 12 through normal gameplay
2. Month advancement triggers campaign completion
3. CampaignResultsModal automatically appears
4. User sees final score, victory type, and achievements
5. User clicks "Start New Campaign" to restart
```

**Technical Implementation**:

#### **Completion Detection**
```typescript
// In GameEngine.checkCampaignCompletion()
private async checkCampaignCompletion(summary: MonthSummary): Promise<CampaignResults | undefined> {
  const currentMonth = this.gameState.currentMonth || 0;
  const campaignLength = 12; // From balance config
  
  // Only complete if we've reached final month
  if (currentMonth < campaignLength) {
    return undefined;
  }
  
  // Mark campaign as completed
  this.gameState.campaignCompleted = true;
  
  // Calculate final score
  const scoreBreakdown = {
    money: Math.max(0, Math.floor((this.gameState.money || 0) / 1000)),
    reputation: Math.max(0, Math.floor((this.gameState.reputation || 0) / 5)),
    artistsSuccessful: 0, // Based on artist success metrics
    projectsCompleted: 0, // Based on completed projects
    accessTierBonus: this.calculateAccessTierBonus()
  };
  
  const finalScore = Object.values(scoreBreakdown).reduce((total, score) => total + score, 0);
  
  return {
    campaignCompleted: true,
    finalScore,
    scoreBreakdown,
    victoryType: this.determineVictoryType(finalScore, scoreBreakdown),
    summary: this.generateCampaignSummary(victoryType, finalScore, scoreBreakdown),
    achievements: this.calculateAchievements(scoreBreakdown)
  };
}
```

#### **Modal Display**
```typescript
// GamePage watches for campaign results
const { campaignResults } = useGameStore();

useEffect(() => {
  if (campaignResults?.campaignCompleted) {
    setShowCampaignResults(true);
  }
}, [campaignResults]);

// Modal renders with results
<CampaignResultsModal
  campaignResults={campaignResults}
  onClose={() => setShowCampaignResults(false)}
  onNewGame={handleNewGame}
/>
```

#### **New Game Restart**
```typescript
const handleNewGame = async () => {
  // 1. Create fresh game state
  const newGameState = await createNewGame('standard');
  
  // 2. Clear React Query cache
  queryClient.clear();
  queryClient.setQueryData(['gameState', newGameState.id], newGameState);
  
  // 3. Reset all game state
  set({
    gameState: newGameState,
    artists: [],
    projects: [],
    selectedActions: [],
    campaignResults: null,
    monthlyOutcome: null
  });
  
  // 4. Update game context
  setGameId(newGameState.id);
  setShowCampaignResults(false);
};
```

**System State Changes**:
- `campaign_completed` set to true
- Campaign results calculated and stored
- Modal triggers automatically
- Fresh game state created on restart

---

## 🔄 Error Handling Workflows

### **Insufficient Funds Scenarios**
```typescript
// Artist signing with insufficient funds
if (gameState.money < artist.signingCost) {
  showToast({
    title: 'Insufficient Funds',
    description: `Need $${artist.signingCost.toLocaleString()} to sign ${artist.name}`,
    variant: 'destructive'
  });
  return;
}

// Project creation with insufficient budget
if (gameState.money < projectCost) {
  summary.changes.push({
    type: 'expense',
    description: `Cannot afford ${projectType} - insufficient funds`,
    amount: 0
  });
}
```

### **Network Error Recovery**
```typescript
// API call with error handling
try {
  const result = await advanceMonth();
} catch (error) {
  setIsAdvancingMonth(false);
  showToast({
    title: 'Connection Error',
    description: 'Failed to advance month. Please try again.',
    variant: 'destructive'
  });
  console.error('Advance month failed:', error);
}
```

### **Save/Load Error Handling**
```typescript
// Save error recovery
try {
  await saveGame(newSaveName);
  showToast({
    title: 'Game Saved',
    description: `Saved as "${newSaveName}"`,
  });
} catch (error) {
  showToast({
    title: 'Save Failed',
    description: 'Could not save game. Please try again.',
    variant: 'destructive'
  });
}
```

---

## 📊 Analytics & Tracking

### **User Action Tracking**
Every user action is recorded in `monthly_actions` table:
```typescript
// Action recording
POST /api/game/:gameId/actions
{
  month: currentMonth,
  actionType: 'role_meeting',
  targetId: 'anr',
  results: {
    choiceId: 'supportive_approach',
    immediate_effects: { money: 1000, reputation: 2 },
    delayed_effects: { trigger_month: 8, money: 3000 }
  }
}
```

### **Performance Metrics**
- Monthly revenue/expenses tracked in `monthly_stats`
- Project success rates calculated from completion data
- Artist relationship progression monitored
- Access tier advancement timing recorded

---

This comprehensive workflow documentation ensures that new developers can understand exactly how users interact with the system and how each interaction flows through the technical architecture.