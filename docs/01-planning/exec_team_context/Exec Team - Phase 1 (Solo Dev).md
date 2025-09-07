---
tags:
  - execteam
---
Based on your [[tech stack]] and the [[Solo Dev Workflow]], here's how to implement the executive system:

## **✅ Completed Tasks (Week 1 - Data Layer)**
**Completed: 2025-09-06**

### **1. Executive Schema Created** (`/shared/schema.ts`)
Added the executives table with the following structure:
```typescript
export const executives = pgTable("executives", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: uuid("game_id").references(() => gameStates.id),
  role: text("role"), // 'head_of_ar', 'cmo', 'cco', 'head_distribution'
  level: integer("level").default(1),
  mood: integer("mood").default(50), // 0-100
  loyalty: integer("loyalty").default(50), // 0-100
  lastActionMonth: integer("last_action_month"),
  metadata: jsonb("metadata"), // For personality traits, history
});
```

### **2. Executive Interface Added** (`/shared/types/gameTypes.ts`)
```typescript
export interface Executive {
  role: string;
  level: number;
  mood: number;
  loyalty: number;
}
```

### **3. Zod Schema Created** (`/shared/schema.ts`)
```typescript
export const insertExecutiveSchema = createInsertSchema(executives).omit({
  id: true,
});
```

### **4. Database Migration Applied**
- Created migration file: `/migrations/0010_add_executives_table.sql`
- Successfully applied to database using `npx drizzle-kit push`
- Verified table structure with foreign key constraints
- Index created on `game_id` for performance

**Migration Command Used:**
```bash
npx drizzle-kit push
```

The executives table is now live in the database with proper constraints and defaults.

### **5. Executive Data Added to roles.json**
Instead of creating a separate `/data/executives.json` file, executive-specific fields were added directly to `/data/roles.json` to avoid file confusion:

```json
{
  "id": "head_ar",
  "name": "Head of A&R",
  "baseSalary": 5000,
  "decisions": ["sign_artist", "scout_talent", "develop_artist", "drop_artist"],
  "expertise": ["talent_scouting", "single_strategy", "genre_positioning", "artist_development"],
  "kpis": ["hit_rate", "pipeline_quality", "artist_retention", "genre_diversity"]
}
```

**Executive roles configured:**
- CEO (id: `ceo`) - Strategic leadership with 0 base salary
- Head of A&R (id: `head_ar`) - Talent scouting with $5000 salary
- Chief Marketing Officer (id: `cmo`) - Marketing/PR with $4000 salary  
- Chief Creative Officer (id: `cco`) - Production oversight with $4500 salary
- Head of Distribution (id: `head_distribution`) - Distribution/operations with $3500 salary

All executive data is now centralized in `/data/roles.json` with proper TypeScript interfaces defined.

## **✅ Completed Tasks (Week 2 - UI Integration)**
**Completed: 2025-09-07**

### 1. **Modified Month Planner** (`/client/src/components/MonthPlanner.tsx`):
- ✅ Integrated ExecutiveTeam component to replace action grid
- ✅ Connected to existing dialogue modal system for executive interactions
- ✅ Maintained focus slot allocation system (3 slots per month)

### 2. **Created Executive Team Component** (`/client/src/components/ExecutiveTeam.tsx`):
- ✅ Displays 5 executive cards (CEO, Head of A&R, CMO, CCO, Head of Distribution)
- ✅ Shows salary requirements and availability status
- ✅ Implements disabled states with enhanced visual fade (opacity-30, bg-black/75)
- ✅ Loads available meetings dynamically from API
- ✅ Meeting selection modal with improved text wrapping and left-alignment

### 3. **Added API Endpoints** (`/server/routes.ts`):
```typescript
// ✅ Get executive/role data with meetings
app.get("/api/roles/:roleId", async (req, res) => {
  // Returns role data with available meetings
});

// ✅ Get specific meeting data for dialogue
app.get("/api/roles/:roleId/meetings/:meetingId", async (req, res) => {
  // Returns meeting prompt and choices
});

// ✅ Process executive actions
app.post('/api/game/:gameId/executive/:execId/action', 
  async (req, res) => {
    // Processes executive decisions with effects
});
```

### 4. **Updated Game Store Integration** (`/client/src/store/gameStore.ts`):
- ✅ Modified `selectDialogueChoice` to add executive selections to `selectedActions`
- ✅ Tracks focus slot usage (`usedFocusSlots`) when executives are selected
- ✅ Unified flow for both executive and non-executive meetings
- ✅ Executive action IDs format: `executiveId_meetingId_choiceId`

### 5. **Enhanced Selection Summary** (`/client/src/components/SelectionSummary.tsx`):
- ✅ Displays selected executives with their actual meeting names
- ✅ Shows meeting types like "Production Timeline", "Creative Direction", "Budget Management"
- ✅ Removed empty "Execution Order" display
- ✅ Improved executive ID mapping for all formats
- ✅ Visual focus slot indicators with drag-and-drop reordering

### 6. **Fixed Data Loading Issues**:
- ✅ Updated Zod schema in `dataLoader.ts` to include `prompt` and `choices` fields
- ✅ Fixed ESM module issues (removed `__dirname` usage)
- ✅ Ensured meeting data flows correctly through API endpoints

## **Key Implementation Details**

### **Executive Meeting Flow:**
1. User clicks executive card → Meeting selection modal opens
2. User selects meeting → DialogueModal opens with prompt and choices
3. User makes choice → Action added to selectedActions, uses 1 focus slot
4. Selection appears in right panel with executive name and meeting type
5. When 3 slots filled, other executives show "No slots available" overlay

### **UI Enhancements:**
- Executive cards fade to 30% opacity when disabled
- Meeting selection modal expanded to `max-w-3xl` for better readability
- Text properly wraps with `break-words` and `whitespace-normal`
- Left-aligned text throughout for consistency
- Meeting names clearly displayed instead of generic "Strategic Decision"

## **🚧 Week 3: Game Engine Integration (Not Yet Implemented)**

### **Missing Game Engine Updates** (`/shared/engine/game-engine.ts`):
These features from the original Week 2 plan have not been implemented yet:

#### 1. **Process Executive Actions Method**
```typescript
// TODO: Add to GameEngine class
processExecutiveActions(): void {
  // Process each executive's monthly effects
  // Apply mood/loyalty changes
  // Trigger executive-specific events
}
```

#### 2. **Executive Salary Deduction**
```typescript
// TODO: Add to advanceMonth() method
// Deduct executive salaries from monthly budget
const executiveSalaries = this.calculateExecutiveSalaries();
this.gameState.money -= executiveSalaries;
summary.expenses += executiveSalaries;
```

#### 3. **Threshold Checks for Executive Availability**
```typescript
// TODO: Add executive availability logic
getAvailableExecutives(): Executive[] {
  // Check mood thresholds (e.g., mood < 30 = unavailable)
  // Check loyalty requirements
  // Check special conditions (e.g., CEO only available in crisis)
}
```

### **Why These Were Deferred:**
- Current implementation uses existing dialogue system successfully
- Executive salaries are shown but not enforced (simplifies early gameplay)
- All executives always available (reduces frustration while learning)
- Can be added later without breaking existing functionality

### **Impact When Implemented:**
- **Economic Challenge**: Monthly salary drain creates budget pressure
- **Strategic Depth**: Mood/loyalty management adds relationship layer
- **Dynamic Availability**: Executives may refuse meetings if unhappy
- **Long-term Consequences**: Poor management affects future options

## **Week 4: Future Enhancements**

### Potential Executive Store (`/client/src/stores/executiveStore.ts`):
```typescript
interface ExecutiveStore {
  executives: Executive[];
  focusSlots: FocusSlot[];
  selectExecutive: (slot: number, execId: string) => void;
  processExecutiveAction: (execId: string, action: string) => void;
}
```

## **Implementation Tips**

### **Use Your Existing Infrastructure**:
- Leverage the dialogue modal system for executive meetings
- Use the existing `balance.json` structure for executive configs
- Reuse the month advancement flow for executive effects

### **Start with Shims**:
```typescript
// In game-engine.ts
getExecutiveMood(execId: string): number {
  return 50; // SHIM: Always neutral for now
}
```

### **Use TypeScript for Safety**:
```typescript
// Define all executive types upfront
type ExecutiveRole = 'ceo' | 'head_ar' | 'cmo' | 'cco' | 'head_distribution';
type ExecutiveAction = 'approve' | 'deny' | 'delegate';
```

