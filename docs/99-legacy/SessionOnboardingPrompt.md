# 🎯 Claude Code Session Onboarding - Music Label Manager

**Copy-paste this into any new Claude Code session for instant project context**

---

## 📋 IMMEDIATE ACTIONS (Do these first!)

1. **Read Project Status**: Read `MVP_STATUS.md` for current completion status (~75% complete MVP)
2. **Read Guidelines**: Read these 3 instruction files in order:
   - `docs/ClaudeInstructions.md` - Permanent guardrails & collaboration style  
   - `docs/ClaudeProject.md` - Project structure & tech stack conventions
   - `docs/ClaudeCodeInstructions.md` - **CRITICAL** session management & background process rules
3. **Check Development Context**: Read `ai_instructions.md` for current development priorities

---

## 🎮 PROJECT OVERVIEW

**Project**: Top Roles: Music Label Manager  
**Type**: Browser-based turn-based music industry simulation game  
**Status**: ~75% complete MVP, fully playable core systems  
**Architecture**: React frontend + Express backend + PostgreSQL (Neon)  

### 🏗️ Tech Stack
- **Frontend**: React + TypeScript + Vite, Tailwind + ShadCN/UI, Zustand, React Query
- **Backend**: Express + TypeScript, Drizzle ORM  
- **Database**: PostgreSQL via Neon on Replit
- **Game Engine**: Unified engine in `shared/engine/game-engine.ts`
- **Validation**: Zod schemas throughout

### 📁 Key Project Structure
```
├── client/          # React frontend
├── server/          # Express backend  
├── shared/          # Types, engine, API contracts
├── data/            # Game content JSON (8 roles, 24 meetings, balance config)
├── docs/            # Instructions & documentation
└── MVP_STATUS.md    # Current completion status
```

---

## 🚨 CRITICAL SESSION RULES

### ⚠️ Background Process Management
**NEVER start `npm run dev` in background without explicit user permission!**

❌ **Common mistake that breaks user workflow:**
```bash
npm run dev --run_in_background=true  # DON'T DO THIS during reviews!
```

✅ **Correct approach:**
- **For code reviews/analysis**: Use `Read`, `Glob`, `Grep`, `npm run check` only
- **For development**: Ask "Should I start the dev server?" first
- **Always clean up**: Kill any background processes at session end

### 📋 Session Types
1. **Codebase Review/Planning** → Static analysis tools only
2. **Active Development** → Ask before starting servers  
3. **Testing/Debugging** → Background processes OK with permission

---

## 🎯 CURRENT MVP STATUS (Key Highlights)

### ✅ **What's Working** (~75% Complete)
- ✅ Monthly turn system with 3-action slots
- ✅ Game engine with seeded RNG and resource management
- ✅ Dialogue system with role meetings (95% complete)
- ✅ Project creation workflow (Singles, EPs, Mini-Tours)
- ✅ Access tier progression (Playlist, Press, Venue)
- ✅ Save/export system with multiple slots
- ✅ Professional UI components (modals, forms, dashboards)

### 🚧 **Priority Development Areas**
1. **Artist Signing Workflow** - Major missing feature (~55% complete)
2. **Type Safety Issues** - Database nullable fields vs frontend types
3. **Save/Load Integration** - Wire SaveGameModal into main UI
4. **Side Events Display** - Show random events during advancement
5. **Import JSON** - Complete save system

### 🔍 **Architecture Strengths**
- Unified GameEngine class handles all calculations
- Feature-organized frontend structure  
- Type-safe API contracts with Zod
- Rich game content exceeding MVP requirements
- Professional ShadCN component library

---

## 📚 REQUIRED READING CHECKLIST

Before starting any work, read these files:

- [ ] `MVP_STATUS.md` - Detailed completion status & recent progress
- [ ] `docs/ClaudeInstructions.md` - Permanent collaboration guardrails  
- [ ] `docs/ClaudeProject.md` - Tech stack & project conventions
- [ ] `docs/ClaudeCodeInstructions.md` - **CRITICAL** session management rules
- [ ] `ai_instructions.md` - Current development context & priorities

---

## 🚀 QUICK ORIENTATION COMMANDS

```bash
# Check TypeScript compilation (safe to run)
npm run check

# View project structure
ls -la

# Check current git status  
git status

# Check what's running on port 5000 (if needed)
lsof -i :5000
```

---

## 🎯 COMMON SESSION REQUESTS & APPROACHES

### "Do a codebase review"
✅ Use: `Read`, `Glob`, `Grep`, `npm run check`  
❌ Avoid: Starting servers  
📋 Deliverable: Analysis and development plan

### "Implement feature X"  
✅ Ask: "Should I start the dev server for testing?"  
✅ Use: `Edit`/`Write` + targeted testing  
🧹 Clean up: Kill processes at session end

### "Fix this bug"
✅ May need server for reproduction  
✅ Ask permission first  
✅ Use minimal testing approach

---

## 📝 DEVELOPMENT WORKFLOW

1. **Plan** → Show files to add/edit
2. **Propose** → Runnable code in small chunks  
3. **Build** → Replit-compatible implementation
4. **Verify** → Checklist + manual test steps

### Key Principles
- Preserve game data in `/data` folder
- Never exceed MVP scope  
- Work in small, testable iterations
- Always follow the established architecture patterns

---

## 🔧 PROJECT-SPECIFIC CONTEXT

### Game Engine Location
- **Main Logic**: `shared/engine/game-engine.ts` (unified calculations)
- **API Integration**: `server/routes.ts` (endpoints use GameEngine)
- **Frontend State**: `client/src/store/gameStore.ts` (Zustand for UI state)

### Database Schema
- **Game States**: Core progression tracking
- **Artists**: 3 archetypes with mood/loyalty/popularity  
- **Projects**: Singles/EPs/Tours with budget/quality tracking
- **Roles**: 8 industry relationships with access levels

### Content Files (Don't Modify Without Careful Consideration)
- `data/balance.json` - All game balance numbers
- `data/roles.json` - 8 industry roles with 24+ meetings
- `data/artists.json` - Artist archetypes and personalities  
- `data/events.json` - Side story content

---

## ✅ SUCCESS CRITERIA FOR SESSIONS

- No background processes left running
- Port 5000 available for user's `npm run dev`
- TypeScript compilation clean (`npm run check`)
- Clear development plan or completed feature
- All changes properly documented

---

**Remember**: This is a nearly-complete MVP with excellent architecture. Focus on integration work and completing the remaining ~25% rather than rebuilding existing systems.