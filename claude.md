# Music Label Manager - Claude Instructions

## 🎯 Project Overview
Building **Top Roles: Music Label Manager** - browser-based music industry simulation MVP.

**Current Status**: Phase 1 Core Implementation (streaming revenue decay ✅)  
**Next Phase**: Multi-song project management and producer tier system

## 🚨 Critical Session Management
**NEVER start background processes without explicit permission**
- Use static analysis first: `Read`, `Glob`, `Grep`, `npm run check`
- Ask before servers: "Should I start the dev server to test this?"
- Always clean up: `pkill -f "tsx server"` before session end

## 📋 Development Context

### Tech Stack & Architecture
- **Frontend**: React + TypeScript + Vite, Tailwind + shadcn/ui
- **Backend**: Express + Prisma ORM + Neon PostgreSQL
- **Validation**: Zod schemas for all JSON data
- **Approach**: Plan → Propose → Build → Verify (small chunks)

### Current Implementation Priority
1. **✅ Streaming Revenue Decay** - 85% monthly decline implemented
2. **🔄 Music Creation & Release Cycle** - Multi-song project system (next)
3. **⏳ Producer Tier System** - Strategic quality vs cost decisions
4. **⏳ Access Tier Progression** - Reputation-gated opportunities

### MVP Scope Guardrails
- Monthly turns (12 months, 3 focus slots)
- Entities: 2 Artists max, 8 Roles, 12 Side Stories
- Projects: Single/EP/Mini-Tour only
- Must preserve `/data/` JSON files

## 📚 Documentation References

### Architecture & Planning
- **Development Roadmap**: `docs/01-planning/development_roadmap_2025.md`
- **System Architecture**: `docs/02-architecture/system-architecture.md`
- **Database Design**: `docs/02-architecture/database-design.md`
- **API Design**: `docs/02-architecture/api-design.md`

### Implementation Guidance
- **Game Mechanics**: `docs/03-workflows/game-mechanics.md`
- **User Workflows**: `docs/03-workflows/user-workflows.md`
- **Frontend Architecture**: `docs/04-frontend/frontend-architecture.md`
- **Backend Architecture**: `docs/05-backend/backend-architecture.md`


## 🎮 JSON Systems Ready
- `data/balance.ts` - Economic formulas, costs, quality bonuses
- `data/roles.json` - 8 industry roles with 72+ dialogue choices
- `data/artists.json` - Artist archetypes and development systems
- `data/events.json` - 12 side stories with branching outcomes

## 🎵 Content Philosophy
**Tone**: Heightened drama (Empire, Nashville, High Fidelity inspiration)  
**Every scene should feel like a TV show cold open or finale**

## ✅ Success Criteria
- `npm run dev` runs client + server with hot reload
- Neon PostgreSQL integrated with Prisma
- JSON validates with Zod schemas
- Playable 12-month campaign end-to-end

---
*Detailed technical specs and implementation guides in /docs/ - reference by category above*