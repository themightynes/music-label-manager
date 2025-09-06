**Claude Code Context Note – Exec Team Phase 1 (Solo Dev) – Week 1**

---

### 1️⃣ Core Purpose  
Add a new **executive system** that replaces the existing 8‑role meeting flow.  
- 5 executives (A&R, CMO, CCO, Distribution/Operations, CEO/player).  
- Each month the player can focus up to **3 executives** (“focus slots”). 
	- Focus slots are already implemented.
- Executives have persistent stats: `level`, `mood`, `loyalty`, `lastActionMonth`, and arbitrary `metadata`.  

---

### 2️⃣ Data Layer (Database + Types)

| File | Purpose | Key Fields |
|------|---------|------------|
| `/shared/schema.ts` | Drizzle schema | `executives` table: <br>• `id: uuid PK`<br>• `gameId: uuid FK → gameStates.id`<br>• `role: text` (e.g., “head_of_ar”)<br>• `level: integer default 1`<br>• `mood: integer default 50`<br>• `loyalty: integer default 50`<br>• `lastActionMonth: integer`<br>• `metadata: jsonb` |
| `/shared/types/gameTypes.ts` | TS type for client | `interface Executive { role:string; level:number; mood:number; /* … */ }` |

---

### 3️⃣ Content / Seed Data

| File | Purpose | Example |
|------|---------|--------|
| `/data/executives.json` | Initial executive definitions (can be expanded) | ```json { "executives":[{ "id":"head_of_ar", "name":"Marcus Rodriguez", "baseSalary":5000, "decisions":["sign_artist","scout_talent"] }] }``` |

---

### 4️⃣ Key Integration Points

| Layer | What to modify / add |
|-------|----------------------|
| **Client** (`/client/src/components/MonthPlanner.tsx`) | Add executive selection UI; use existing dialogue modal for meetings. |
| **Game Engine** (`/shared/engine/game-engine.ts`) | `processExecutiveActions()` – deduct salaries, apply actions. |
| **API** (`/server/routes.ts`) | POST `/api/game/:gameId/executive/:execId/action` – handle action payloads. |
| **State Store** (`/client/src/stores/executiveStore.ts`) | `executives: Executive[]`, `selectExecutive(slot, execId)`, `processExecutiveAction(execId, action)` |

---

### 5️⃣ Development Checklist 

1. Add `executives` table to DB (migration).  
2. Create a basic executive component in Month Planner that pulls from `/data/executives.json`.  
3. Implement one simple executive decision (e.g., CFO approves >$10k expense).  
4. Wire up API endpoint and game‑engine hook to deduct salary & apply effect.  

---

### 6️⃣ Cross‑References

- **System Architecture** – see `Docs/02-architecture/system-architecture.md` for overall engine flow.  
- **Tech Stack** – `Docs/Tech Stack.md`.  
- **Exec Team Docs** – `Music Label Manager/Exec Team - Documentation Overview.md`, `Exec Team System Design Document.md`.  

---

### 7️⃣ Quick Notes for Claude Code

* Keep token usage low: reference only the above file paths and key fields.  
* Use short, precise prompts (e.g., “Add `executives` table to schema” or “Implement `/api/game/:gameId/executive/:execId/action`).  
---