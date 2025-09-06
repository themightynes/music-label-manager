---
tags:
  - execteam
---
---


```txt
# PHASE 1 SOLO DEV – CONTEXT NOTE
# --------------------------------
# This file contains ONLY the information Claude Code needs to build
# the executive layer in the Music Label Manager.  It is a distilled
# version of the relevant docs: System Architecture, Tech Stack,
# Exec Team Design, Data Schema & Paths.

## 1. Project Skeleton (paths that will be touched)
- /shared/schema.ts                     ← add `executives` table
- /shared/types/gameTypes.ts            ← extend `Executive` interface
- /data/executives.json                ← definition file for execs
- /client/src/components/MonthPlanner.tsx  ← add executive UI
- /client/src/stores/executiveStore.ts    ← new Zustand store
- /shared/engine/game-engine.ts          ← add `processExecutiveActions()`
- /server/routes.ts                      ← POST `/api/game/:gameId/executive/:execId/action`
- /data/executive_actions.json           ← (optional) action definitions

## 2. Tech Stack & Core Libraries
- Frontend: React 18 + TypeScript + Vite + Tailwind + Zustand + React‑Query
- Backend: Express + Prisma ORM + Neon PostgreSQL
- Validation: Zod schemas for all JSON data
- RNG & balance: `balance.ts` (exported as `BALANCE`)
- Database: Drizzle ORM (`pgTable`) with UUID PKs and JSONB columns

## 3. Existing Game Engine Structure
```
class GameEngine {
  constructor(gameState: GameState, gameData: ServerGameData) { … }
  advanceMonth(actions: GameEngineAction[]): Promise<{gameState, summary}>
  // other existing methods …
}
```
- `advanceMonth` runs all month‑turn logic in a single DB transaction.
- Existing actions (role meetings, project creation, marketing pushes) are stored in `actions.json`.
- The engine already exposes `processProjectStages`, `calculateEconomiesOfScale`, etc.

## 4. Executive System Overview
### 4.1 Roles & Hierarchy
| Exec | Primary Function |
|------|------------------|
| Head of A&R | Talent scouting, artist development, showcase events |
| Chief Marketing Officer (CMO) | PR, digital marketing, brand sponsorships |
| Chief Creative Officer (CCO) | Production quality, creative risk approval |
| Head of Distribution/Operations | Streaming deals, tour logistics, merch |
| CEO (Player) | 3 focus slots per month, delegates to executives |

### 4.2 Focus Slot System
- 3 focus slots each month.
- Each slot selects one executive → triggers a meeting dialog.
- Choices cost money / creative capital; affect mood/loyalty.

### 4.3 Data Structures (simplified)
```ts
// shared/schema.ts – add this table
export const executives = pgTable("executives", {
  id: uuid("id").primaryKey(),
  gameId: uuid("game_id").references(() => gameStates.id),
  role: text("role"),          // 'head_of_ar', 'cmo', etc.
  level: integer("level").default(1),
  mood: integer("mood").default(50),        // 0–100
  loyalty: integer("loyalty").default(50),   // 0–100
  lastActionMonth: integer("last_action_month"),
  metadata: jsonb("metadata") // personality traits, history
});

// shared/types/gameTypes.ts – extend this interface
interface Executive {
  role: string;
  level: number;
  mood: number;
  loyalty: number;
}
```

### 4.4 JSON Files
- `/data/executives.json` – list of exec definitions (id, name, baseSalary, decisions)
```json
{
  "executives": [
    {
      "id": "head_of_ar",
      "name": "Marcus Rodriguez",
      "baseSalary": 5000,
      "decisions": ["sign_artist", "scout_talent"]
    }
    // … other execs …
  ]
}
```
- (Optional) `/data/executive_actions.json` – action templates per executive.

### 4.5 API Endpoint
```ts
router.post('/api/game/:gameId/executive/:execId/action', async (req, res) => {
  const { gameId, execId } = req.params;
  const { action, options } = req.body; // e.g., {action: 'sign_artist', options:{artistId:'123'}}
  // Validate, fetch GameState, call engine.processExecutiveActions(...)
});
```

### 4.6 Engine Extension
Add method to `GameEngine`:
```ts
processExecutiveActions(execId: string, action: ExecutiveAction): void {
  // deduct salary, apply costs, update mood/loyalty,
  // trigger immediate/delayed/ongoing effects.
}
```
- Called from `advanceMonth` after other month actions.

### 4.7 Client‑Side Store
```ts
// executiveStore.ts
interface ExecutiveStore {
  executives: Executive[];
  focusSlots: FocusSlot[];          // { slotIndex: number, execId?: string }
  selectExecutive(slot: number, execId: string): void;
  processExecutiveAction(execId: string, action: string): void;
}
```
- Use React‑Query to sync with `/api/game/:gameId`.

### 4.8 MonthPlanner UI
- Add a new section “Focus Slots” next to existing role meetings.
- For each slot, show dropdown of executives (from store).
- On selection, open dialog modal (`ExecutiveMeeting.tsx`) that pulls from `executive_actions.json` or hard‑coded sample.

## 5. Implementation Roadmap (48 h Sprint)

1. **Schema & DB** – Add `executives` table; run migration.
2. **Data Load** – Import `/data/executives.json`; seed execs per game on creation.
3. **Engine Hook** – Implement `processExecutiveActions()`; integrate into month loop.
4. **API Route** – POST endpoint to trigger actions; validate with Zod.
5. **Store & UI** – Zustand store, MonthPlanner update, ExecutiveMeeting component.
6. **Testing** – Unit tests for engine logic, API integration test, manual UI flow.

## 6. Things NOT Needed for Phase 1
- Full action templates (you can stub simple actions).
- Mood/loyalty progression logic beyond defaults.
- Random event system or advanced effect timing.
- Detailed character bible or dialogue samples – only basic placeholders required now.

---

### How to Use This Note

1. **Copy** the entire block into a new note called `Phase 1 Context.md`.
2. When prompting Claude Code, include this note *before* your implementation prompt:

```
<<Phase 1 Context>>
<your code prompt>
```

3. Claude will now have all the type definitions, paths, and minimal logic it needs to write Phase 1 code without pulling unrelated docs.

---

**Happy coding!**