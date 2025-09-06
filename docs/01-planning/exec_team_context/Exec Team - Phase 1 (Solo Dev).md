---
tags:
  - execteam
---
Based on your [[tech stack]] and the [[Solo Dev Workflow]], here's how to implement the executive system:

## **Next Steps: Week 2 Tasks**

## **Week 2: Hook into Existing Systems** (Next Phase)

### 1. **Modify Month Planner** (`/client/src/components/MonthPlanner.tsx`):
- Add executive selection UI alongside current role meetings
- Use existing dialogue modal for executive interactions

### 2. **Update Game Engine** (`/shared/engine/game-engine.ts`):
- Add `processExecutiveActions()` method
- Deduct salaries in `advanceMonth()`
- Start with simple threshold checks

### 3. **Add API Endpoints** (`/server/routes.ts`):
```typescript
router.post('/api/game/:gameId/executive/:execId/action', 
  async (req, res) => {
    // Process executive decision
});
```

## **Week 3: Add Executive Store**

### Create Zustand store (`/client/src/stores/executiveStore.ts`):
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

---

## **✅ Completed Tasks (Week 1 - Data Layer)**

### **1. Executive Schema Created** (`/shared/schema.ts`)
**Completed: 2025-09-06**

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
**Completed: 2025-09-06**

```typescript
export interface Executive {
  role: string;
  level: number;
  mood: number;
  loyalty: number;
}
```

### **3. Zod Schema Created** (`/shared/schema.ts`)
**Completed: 2025-09-06**

```typescript
export const insertExecutiveSchema = createInsertSchema(executives).omit({
  id: true,
});
```

### **4. Database Migration Applied**
**Completed: 2025-09-06**

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
**Completed: 2025-09-06**

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