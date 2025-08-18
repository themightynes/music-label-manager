# Claude Project Instructions — Music Industry Sim

This document defines the evolving **project conventions and workflow** for building *Top Roles: Music Label Manager* in Replit.  
Permanent guardrails (collaboration style, no monorepo, content tone, balance protection, developer documentation) live in `ClaudeInstructions.md`.

---
## 1) Tech Stack (Replit-Friendly)
- **Frontend**: React + TypeScript + Vite, Tailwind + shadcn/ui, Zustand, Recharts
- **Backend**: Node + Express, Prisma ORM
- **DB**: PostgreSQL (Neon)
- **Validation**: Zod  
- **RNG**: seedrandom (seeded runs)
- **Saves**: DB first; later export/import JSON

## 2) Project Structure
music-label-manager/
├── src/
│ ├── client/ # React components & pages
│ ├── server/ # Express routes & services
│ └── shared/ # Shared types & utilities
├── data/ # Game content JSON
├── prisma/ # Database schema
├── scripts/ # Utilities & seed scripts
├── docs/ # PRD, MVP, ADRs, playbooks
└── package.json # Single project config

## 3) Developer Documentation (Evolving Playbook)
- **AI_ASSISTANT.md (root)** → directs AIs to instructions/docs  
- **ADRs** (`/docs/adr/`) → track major decisions  
- **JSDoc** → explain resolvers, schemas, game logic  
- **READMEs** in directories → quick onboarding

## 4) Replit Setup & Commands
**Scripts:**
- `dev`: Vite + Express dev server  
- `build`: Production build  
- `start`: Prod server  
- `db:push`: Prisma schema push  
- `db:generate`: Generate Prisma client  
- `db:seed`: Seed database  

**Env vars (`.env.example`):**
DATABASE_URL=...
SEED=default
NODE_ENV=development

## 5) Workflow
- Always scaffold with file diffs + run steps  
- Every DB migration has a matching seed bump  
- Acceptance checks tied to PRD  
- Preserve `/data` content, never overwrite core game files  

## 6) Testing & Verification
- **Smoke flow:** seed → pick 3 actions → advance month → summary screen  
- Unit-light tests for resolvers  
- Dev Debug Panel: world state, rerun turn, force event, change seed  

## 7) MVP Scope Guardrails
- Monthly loop (12 turns, 3 focus slots + optional unlock)  
- Entities: 2 Artists max, 8 Roles, 12 Side Stories, Projects: Single/EP/MiniTour  
- Access Tiers: Playlist, Press, Venue  
- Dialogue: 3–4 options, immediate + delayed effects  
- Seeded RNG visible  
- End-of-Month summary shows 5–8 key deltas  

## 8) UX Conventions
- Screens: Dashboard, Month Planner, Dialogue Modal, Project Sheet, End-of-Month, Saves  
- shadcn cards/badges, toast notifications  
- Accessibility: keyboard nav, font scaling, contrast toggle

## 9) Development Workflow
- Use Replit Agent for infra + deps  
- Always Replit-native solutions  
- Verify current implementation before suggesting code  

---

## 10) Prompts I'll Use
- “Scaffold base project” → file tree, run steps  
- “Add DB + Prisma + Neon” → schema + env + migration + seed  
- “Implement Turn Loop v1” → Zustand store, resolver, UI, summary  
- “Wire Dialogue v1” → JSON schema, loader, modal, effects  
- “Add Access Tiers v1” → badges + gates in resolver  
- “Seed Content Pass 1” → minimal JSON for roles, archetypes, side stories  

Each time: include run/test steps + acceptance checklist.



