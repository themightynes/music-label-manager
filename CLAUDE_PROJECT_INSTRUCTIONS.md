# Music Label Manager - Claude Desktop Project Instructions

## 📋 Project Overview

**Music Label Manager** is a browser-based strategic music industry simulation game where players run a record label, manage artists, create projects (Singles/EPs/Tours), and build industry relationships through a 52-week turn-based campaign.

**Current Status**: Post-MVP (v1.0) - Active v2.0 Development (Week 5 of 12-week sprint)

---

## 🎯 North Star

Build and enhance a sophisticated music industry simulation with:
- **Weekly turn-based progression** through 52-week campaigns (full calendar year)
- **Data-driven game balance** via JSON configuration files
- **Strategic resource management** (money, creative capital, focus slots, artist relationships)
- **Realistic music industry economics** (streaming revenue, chart performance, seasonal effects)
- **Authentic artist relationships** with mood/energy tracking and dialogue interactions

---

## 🏗️ Tech Stack

### **Frontend**
- **React 18** + TypeScript + Vite
- **Routing**: Wouter
- **State Management**: Zustand + TanStack Query (React Query)
- **State Machines**: XState for complex flows (A&R Office, Artist Dialogue)
- **UI Components**: shadcn/ui (New York style) + Tailwind CSS
- **Animations**: Motion.dev (production-grade animation library)
- **Authentication**: Clerk

### **Backend**
- **Runtime**: Node.js with Express
- **Database**: Railway PostgreSQL with standard `pg` driver
- **ORM**: Drizzle ORM with Drizzle Kit migrations
- **Validation**: Zod schemas
- **RNG**: seedrandom for deterministic gameplay

### **Architecture**
- **Game Logic**: Unified GameEngine (`shared/engine/game-engine.ts`) - single source of truth for ALL calculations
- **Financial System**: Modular FinancialSystem (`shared/engine/FinancialSystem.ts`) for all economic calculations
- **Content**: JSON-based data system (`/data/` folder) separated from code
- **Shared Types**: Zod contracts keep client/server in perfect sync

---

## 🗂️ Project Structure

```
music-label-manager/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components (Dashboard, Modals, Forms)
│   │   ├── store/       # Zustand state management
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Client utilities
├── server/              # Express backend
│   ├── routes.ts        # REST API endpoints
│   ├── storage.ts       # Database operations
│   └── services/        # Business logic services
├── shared/              # Shared client/server code
│   ├── engine/          # Game engine & financial system
│   │   ├── game-engine.ts      # Core game logic
│   │   └── FinancialSystem.ts  # Financial calculations
│   ├── schema.ts        # Database schema (Drizzle)
│   └── types/           # Shared TypeScript types
├── data/                # Game content (JSON)
│   ├── balance/         # Modular balance config
│   │   ├── economy.json
│   │   ├── progression.json
│   │   ├── quality.json
│   │   ├── content.json
│   │   └── markets.json
│   ├── artists.json     # Artist pool
│   ├── roles.json       # Executive roles
│   ├── actions.json     # Player actions
│   └── world.json       # Game world config
├── docs/                # Documentation
│   ├── 01-planning/     # Roadmaps & specs
│   ├── 02-architecture/ # System design
│   ├── 03-workflows/    # Process documentation
│   └── 06-development/  # Dev guidelines
└── tests/               # Test suites
```

---

## 🤝 Collaboration Style

### **When asked for something: Plan → Propose → Build → Verify**

1. **Plan**: Show a brief implementation plan with affected files
2. **Propose**: Present specific changes before implementing
3. **Build**: Generate runnable code in small, testable chunks
4. **Verify**: Provide manual test steps and verification checklist

### **Code Development Principles**
- **Small, incremental changes** - avoid monolithic diffs
- **Test in isolation** - one system at a time
- **Ask before starting services** - "Should I start the dev server?"
- **Use static analysis tools** - Read, Glob, Grep for code exploration (NOT background processes)

---

## 🚨 Critical Development Rules

### **🔴 Absolute Requirements**
1. **NEVER start background processes** without explicit user permission
2. **NEVER modify `/data/` JSON files** without preserving structure and validation with Zod schemas
3. **NEVER use inline hex colors** - all colors must use Tailwind utility classes
4. **NEVER import `server/db` in tests** - use `createTestDatabase()` from `tests/helpers/test-db`
5. **ALWAYS preserve `/data/` JSON files** - these are the game's content source
6. **ALWAYS use `apiRequest()` helper** in `queryClient.ts` for API calls (auto-attaches Clerk JWT tokens)

### **🟡 Strong Preferences**
- **Ask before starting dev server**: "Should I start the dev server?"
- **Use static analysis**: Prefer Read, Glob, Grep over bash commands for code exploration
- **Follow documentation governance**: Check existing docs before creating new ones
- **One layer at a time**: Never build multiple interdependent systems simultaneously
- **Stub and ship**: `return true; // TODO: make smarter` is valid first implementation

---

## 🎨 UI/UX Standards

### **Color System**
- **Brand Colors**: Use `brand-*` Tailwind classes for game-specific UI
  - Examples: `bg-brand-burgundy`, `text-brand-rose`, `border-brand-gold`
- **Semantic Colors**: Use semantic classes for generic UI
  - Examples: `bg-success`, `text-warning`, `bg-sidebar`
- **Tier Badges**: Bronze (amber), Silver (gray), Gold (brand-gold), Platinum (purple)
- **Documentation**: See comprehensive color system in `tailwind.config.ts` header comments
- **NEVER use inline hex colors** - always use Tailwind utility classes

### **Component Library**
- **shadcn/ui** (New York style) with TypeScript
- **Location**: `client/src/components/ui/`
- **Add new components**: `npx shadcn@latest add [component-name]` from project root
- **Import alias**: `@/components/ui/[component]`

---

## 🔐 Authentication & API Integration

### **Authentication (Clerk)**
- Use Clerk React hooks and components: `useUser()`, `useAuth()`, `<SignedIn>`, `<SignedOut>`, `<UserButton>`
- **NEVER roll your own auth helpers** - compose Clerk primitives
- Reference Clerk documentation for additional components

### **API Calls**
- **ALWAYS use `apiRequest()` helper** from `queryClient.ts`
- Automatically attaches Clerk JWT tokens
- Prevents duplicate auth logic
- Example: `apiRequest<GameState>('/api/game/123')`

---

## 🗄️ Database & Deployment

### **Railway PostgreSQL Environment**
- **Database**: Railway PostgreSQL with standard `pg` driver (migrated from Neon serverless)
- **Connection**: Uses `DATABASE_URL` environment variable with SSL enabled
- **Pool Settings**: Max 10 connections, 30s idle timeout, 10s connection timeout
- **SSL Config**: `rejectUnauthorized: false` required for Railway's certificates
- **Local Development**: Default port 5000 for main application
- **Alternative ports**: Use ports 3000, 8000, or 8080 for testing servers

### **Database Migrations**
- **Tool**: Drizzle Kit
- **Generate**: `npm run db:generate` (creates migration SQL)
- **Push**: `npm run db:push` (applies migrations to database)
- **Studio**: `npm run db:studio` (visual database browser)

---

## ✅ Validation Commands

```bash
npm run check        # TypeScript compilation check
npm run dev          # Start both client (5173) and server (5000) with hot reload
npm test             # Run tests in watch mode
npm run test:run     # Run tests once (CI mode)
npm run test:ui      # Interactive test UI
npm run test:coverage # Coverage report
npm run db:push      # Apply database schema changes
npm run db:studio    # Visual database browser
```

**Clean up server**: `pkill -f "tsx server"` (if server process lingers)

---

## 🧪 Testing Framework

### **Vitest (Native Vite Integration)**
- **Framework**: Vitest with Jest-compatible API
- **React Testing**: `@testing-library/react` + `@testing-library/jest-dom`
- **Test Files**: Use `*.test.ts` or `*.spec.ts` naming convention
- **Setup**: Global test configuration in `tests/setup.ts`
- **Structure**: Wrap tests in `describe()` blocks, use `it()` or `test()` for assertions
- **Commands**: `npm test` (watch), `npm run test:ui` (interactive), `npm run test:coverage`

### **Database Testing**
- **NEVER import `server/db` in tests** - pollutes production database
- **ALWAYS use `createTestDatabase()`** from `tests/helpers/test-db`
- Creates isolated test database for each test suite

---

## 🎮 Game Engine Architecture

### **Unified Game Engine (`shared/engine/game-engine.ts`)**
- **Single source of truth** for ALL game calculations and business logic
- **Deterministic gameplay** with seeded RNG
- **Configuration-driven** using balance.json

**Key Responsibilities**:
- Week advancement and turn processing
- Resource calculations (money, reputation, creative capital)
- Project advancement and completion
- Streaming and revenue calculations
- Artist relationship management (mood/energy targeting)
- Access tier progression
- Random event generation
- Campaign completion and scoring

### **Financial System (`shared/engine/FinancialSystem.ts`)**
- **Pure functions** (no side effects)
- **Modular calculations** extracted from GameEngine
- All financial calculations: costs, revenue, ROI, budgets, salaries
- Tour economics, release performance, streaming decay

---

## 📊 Content Management System

### **Data-Driven Design**
- **ALL game content lives in `/data/` JSON files**
- **Separation of content from code** - balance changes don't require code deployment
- **Zod validation** - all JSON data must validate with schemas

### **Balance System (`/data/balance/`)**
```
balance/
├── economy.json      # Economic costs and formulas
├── progression.json  # Reputation and access tier systems
├── quality.json      # Song quality calculation rules
├── content.json      # Song name pools and mood types
├── markets.json      # Market barriers and seasonal effects
├── projects.json     # Project durations and timing
└── config.json       # Version metadata
```

### **Game Content Files**
- **`artists.json`**: Available artist pool and characteristics
- **`roles.json`**: Executive roles, salaries, dialogue trees
- **`actions.json`**: Player actions, costs, effects, recommendations
- **`world.json`**: Game world configuration and access tiers

---

## 🔀 XState & State Machines

### **When to Use XState**
- **Multi-step flows** requiring complex state transitions
- **Asynchronous operations** with multiple success/failure paths
- **Feature-specific workflows** (A&R Office operations, Artist Dialogue)

### **Implementation Notes**
- Co-locate machines with the feature they support
- Share contracts through `shared/` when both client and server dispatch same events
- Attach `@statelyai/inspect` only in dev contexts (guard with `if (import.meta.env.DEV)`)
- Keeps visualization tooling out of production bundles

### **Current XState Implementations**
- **A&R Office Machine** (`arOfficeMachine.ts`): Artist discovery operations
- **Artist Dialogue Machine** (`artistDialogueMachine.ts`): Dialogue interactions

---

## 🎯 Implementation Philosophy

### **Core Principles**
1. **One Layer at a Time**: Never build multiple interdependent systems simultaneously
2. **Stub and Ship**: `return true; // TODO: make smarter` is valid first implementation
3. **48-Hour Rule**: Any feature should show visible progress within 2 days
4. **One Decision**: Each iteration adds exactly ONE decision point for players
5. **Annotate Everything**: Mark all hardcoded values, stubs, and missing features
6. **Commit incomplete working code > complete non-working code**

### **Annotation Standards**
```javascript
// STUB: Will be replaced with complex logic in Phase 2
return 50;

// HARDCODED: Should read from balance.json eventually
const approvalThreshold = 10000;

// TODO: Add artist personality factors to mood calculation
function calculateMood() { return Math.random() * 100; }

// MISSING: Reputation system integration needed
```

**Why?** Easy to grep for `STUB:`, `HARDCODED:`, `TODO:`, and `MISSING:` to find enhancement opportunities

---

## 📚 Essential Documentation

### **Getting Oriented**
- **Project Overview**: Use `/onboard` slash command for comprehensive onboarding
- **Current Status**: `DEVELOPMENT_STATUS.md` - what's complete, what's next
- **Project Instructions**: `CLAUDE.md` - session-level instructions and reminders

### **Architecture & Design**
- **System Architecture**: `docs/02-architecture/system-architecture.md`
- **Database Design**: `docs/02-architecture/database-design.md`
- **API Design**: `docs/02-architecture/api-design.md`
- **Frontend Patterns**: `docs/04-frontend/frontend-architecture.md`
- **Backend Implementation**: `docs/05-backend/backend-architecture.md`

### **Content Editing**
- **Content Editing Guide**: `docs/06-development/content-editing-guide.md`
- **Data Schemas**: `docs/02-architecture/content-data-schemas.md`

### **Workflows**
- **User Flows**: `docs/03-workflows/user-interaction-flows.md`
- **System Flows**: `docs/03-workflows/game-system-workflows.md`
- **Save/Load System**: `docs/03-workflows/save-load-system-workflow.md`
- **Mood Targeting System**: `docs/03-workflows/mood-targeting-system-workflow.md`

### **Documentation Standards**
- **Governance**: `docs/06-development/documentation-governance.md`
- **Navigation**: `docs/README.md` - complete documentation map

---

## 🎯 AI-Assisted Development Tasks

### **PRD-Based Feature Development**
When user requests structured feature development, use these workflow files:
- **Create PRD**: `/docs/ai-dev-tasks/create-prd.md`
- **Generate Tasks**: `/docs/ai-dev-tasks/generate-tasks.md`
- **Process Task List**: `/docs/ai-dev-tasks/process-task-list.md`

These provide standardized templates for feature planning, task breakdown, and implementation tracking.

---

## 🚀 Quick Start for New Sessions

### **1. Understand Current Status**
- Run `/onboard` command for comprehensive orientation
- Check `DEVELOPMENT_STATUS.md` for latest progress
- Review `CLAUDE.md` for session-level reminders

### **2. Project Health Check**
```bash
git status           # Check working tree status
npm run check        # Verify TypeScript compilation
npm test:run         # Run full test suite
```

### **3. Ask Before Acting**
- "Should I start the dev server?" - ALWAYS ask before `npm run dev`
- "Should I clean up lingering processes?" - ALWAYS ask before `pkill`
- "Should I push database changes?" - ALWAYS ask before `npm run db:push`

### **4. Use Static Analysis First**
- **Read** - Read files to understand code
- **Glob** - Find files by pattern (e.g., `**/*.tsx`)
- **Grep** - Search file contents (e.g., `pattern: "useGameStore"`)
- **Avoid Bash** for code exploration - use specialized tools

---

## 🎮 Current Game Features (October 2025)

### **✅ Core Systems (Complete)**
- **52-week campaign** with full calendar year progression
- **Artist management** with mood/energy/popularity tracking
- **Recording sessions** with quality system (budget, producer tier, time investment)
- **Release planning** with marketing channels and seasonal timing
- **Tour system** with venue capacity management and city-by-city economics
- **Chart system** with Top 100 weekly charts and competitor songs
- **Executive team** with 5 roles, focus slots, and relationship management
- **A&R Office** with three sourcing modes and artist discovery workflow
- **Artist dialogue** with mood-based interactions and per-artist targeting
- **Creative capital** resource management system
- **Streaming revenue** with decay mechanics and catalog longevity
- **Access tier progression** (Bronze → Silver → Gold → Platinum)
- **Save/load system** with multiple save slots
- **Admin portal** with role-based access control (Clerk metadata)

### **🚧 In Progress (Week 5 of 12)**
- **Awareness system** backend integration (cultural penetration mechanics)
- **Regional market barriers** (geographic progression)
- **Advanced marketing strategy** (long-term vs short-term ROI)

---

## 🔮 Development Context for AI

### **What Claude Should Know**
1. This is a **real working game** with real users, not a prototype
2. **MVP is complete** - we're in post-MVP enhancement phase
3. **Railway deployment** is production environment
4. **Documentation is comprehensive** - always check existing docs first
5. **Test coverage matters** - maintain existing test quality
6. **Balance changes are frequent** - content lives in JSON for easy iteration

### **What Claude Should Do**
1. **Ask clarifying questions** before implementing features
2. **Check existing patterns** in codebase before creating new approaches
3. **Use documentation** to understand system architecture
4. **Follow annotation standards** for stubs and TODOs
5. **Test incrementally** - one layer at a time
6. **Preserve backward compatibility** when refactoring

### **What Claude Should NOT Do**
1. **Don't start services without permission** - always ask first
2. **Don't create new documentation** without checking governance
3. **Don't refactor working systems** without clear justification
4. **Don't ignore test failures** - investigate and fix
5. **Don't use inline colors** - always use Tailwind classes
6. **Don't pollute production DB in tests** - use `createTestDatabase()`

---

## 🎯 Success Criteria

### **Technical Excellence**
- ✅ `npm run check` passes with zero TypeScript errors
- ✅ All tests pass with `npm run test:run`
- ✅ Hot reload works for both client and server
- ✅ Railway PostgreSQL integrated and migrations applied
- ✅ JSON validates with Zod schemas

### **Gameplay Excellence**
- ✅ Playable 52-week campaign end-to-end
- ✅ All core systems functional and tested
- ✅ Balance feels strategic and engaging
- ✅ UI is responsive and intuitive
- ✅ Game state persists correctly

### **Development Excellence**
- ✅ Code follows established patterns
- ✅ Documentation is up-to-date
- ✅ Stubs and TODOs are clearly marked
- ✅ Changes are incremental and testable
- ✅ No hardcoded magic numbers (use balance.json)

---

## 📞 Support & Feedback

### **Help Commands**
- `/help` - Get help with using Claude Code
- `/onboard` - Comprehensive project onboarding

### **Feedback**
- Report issues at: https://github.com/anthropics/claude-code/issues

---

**Last Updated**: October 13, 2025
**Project Status**: Post-MVP (v1.0) - Active v2.0 Development
**Current Sprint**: Week 5 of 12-week roadmap
**Documentation Version**: 2.0.0
