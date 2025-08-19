# 🎯 Claude Code Session Onboarding - Music Label Manager
## Strategic Planning + Technical Implementation Integration

**Complete Project Context for Any Claude Session**  
*Version: 2.1 - FOUNDATION MILESTONE ACHIEVED*  
*Updated: August 19, 2025 - Phase 1 Music Creation Cycle COMPLETE*

## 🎉 **RECENT MAJOR ACHIEVEMENT**

**PHASE 1 MUSIC CREATION & RELEASE CYCLE - COMPLETE** ✅ (August 19, 2025)
- ✅ Multi-song recording projects (1-5 songs per project)
- ✅ Automatic song generation during production stages
- ✅ Complete song catalog with "X Total | Y Ready | Z Released" tracking
- ✅ Smart project progression based on song completion
- ✅ Automatic song release when projects complete
- ✅ Quality system with visual indicators (20-100 range)

**Impact**: Game transformed from simple project management to sophisticated music industry simulation

---

## 📚 **CRITICAL: Documentation Structure Overview**

This project now has **comprehensive documentation** organized for different audiences and purposes:

### **Strategic Planning Documentation** 
- **Primary Roadmap**: `docs/01-planning/development_roadmap_2025.md` - 12-week implementation roadmap
- **Interactive System Map**: `docs/01-planning/music_game_system_map.html` - Visual feature interconnections
- **Archived MVP Planning**: `docs/99-legacy/01-mvp-planning/` - Original MVP specifications (completed)
- **Development Status**: `DEVELOPMENT_STATUS.md` - Current sprint status and priorities

### **Technical Implementation Documentation** (`02-07/`)
- **Backend Song Creation**: `docs/05-backend/song-creation-workflow-technical.md` - **NEW** Complete technical docs for PHASE 1 song workflow
- **Updated Database Design**: `docs/02-architecture/database-design.md` - Now includes songs/releases/release_songs schema
- **System Architecture** - Complete technical design and component relationships
- **Database Design** - Schema, relationships, and data patterns
- **User Workflows** - End-to-end technical implementation of user journeys
- **Frontend/Backend Architecture** - Component structure and implementation patterns
- **Development Setup** - Local environment and tooling
- **Content Management** - JSON-based content editing system

**🎯 KEY INSIGHT**: This project has both strategic vision AND complete technical implementation - use both!

---

## 📋 **IMMEDIATE ACTIONS (Do these first!)**

### **1. Understand Current Project Status (5 minutes)**
```bash
# REQUIRED READING ORDER:
1. Read docs/HANDOFF_SUMMARY.md          # Project status & next steps
2. Read DEVELOPMENT_STATUS.md            # Current development phase status (Post-MVP)
3. Read docs/99-legacy/01-mvp-planning/prd.md  # Original MVP requirements (archived)
4. Read docs/02-architecture/system-architecture.md  # Technical foundation
```

### **2. Understand Session Management Rules (2 minutes)**
```bash
# CRITICAL SESSION RULES:
1. Read docs/99-legacy/ClaudeCodeInstructions.md    # Background process management
2. Read docs/99-legacy/ClaudeInstructions.md        # Permanent collaboration guardrails
3. Read docs/99-legacy/ClaudeProject.md             # Project conventions
```

### **3. Check Current Development Context (1 minute)**
```bash
# CURRENT STATE:
1. Read ai_instructions.md              # Current technical state
2. Quick orientation: git status, npm run check
```

---

## 🎮 **PROJECT OVERVIEW & STATUS**

### **Project Identity**
- **Name**: Top Roles: Music Label Manager
- **Type**: Browser-based turn-based music industry simulation game
- **Vision**: "Run your own record label where every chart-topping hit comes down to the relationships you build"
- **Status**: **98% Complete MVP** - Fully playable, release-ready game

### **Core Game Concept** (from strategic docs)
- **Player Fantasy**: Feel like a sharp, connected label exec
- **Core Loop**: Sign artists → manage relationships → release music → respond to industry events
- **Unique Selling Point**: Systems depth + emotional character investment
- **Campaign**: 12-month strategic campaign with scoring and victory conditions

### **Technical Architecture** 
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Query
- **Backend**: Node.js + Express + TypeScript + PostgreSQL (Neon) + Drizzle ORM
- **Shared**: Unified GameEngine + Zod validation + type-safe API contracts
- **Content**: JSON-based content management system

---

## ✅ **WHAT'S COMPLETE (98% MVP)**

### **Fully Working Core Systems**
- ✅ **Complete 12-month campaign** with turn-based progression and scoring
- ✅ **Artist discovery and signing** with 6 unique artists across 3 archetypes
- ✅ **Project creation workflow** (Singles $3-12k, EPs $15-35k, Mini-Tours $5-15k)
- ✅ **Role-based dialogue system** with 8 industry professionals and 72+ dialogue choices
- ✅ **Resource management** (money, reputation, creative capital, access tiers)
- ✅ **Save/load system** with multiple slots and JSON export/import
- ✅ **Campaign completion** with scoring, victory types, and restart functionality
- ✅ **Professional UI** with responsive design and comprehensive modals

### **Technical Excellence Achieved**
- ✅ **Unified GameEngine** - Single source of truth for all calculations
- ✅ **Type-safe architecture** - TypeScript + Zod validation throughout
- ✅ **Transaction-safe database** - Atomic operations with proper error handling
- ✅ **Component-based UI** - Reusable, maintainable React architecture
- ✅ **JSON-based content** - Easy modification by non-developers

---

## 🚨 **CRITICAL SESSION RULES (Updated)**

### **⚠️ Background Process Management**
**NEVER start background processes without explicit user permission!**

```bash
# ❌ COMMON MISTAKE (causes port conflicts):
npm run dev --run_in_background=true  # DON'T DO THIS during reviews!

# ✅ CORRECT APPROACH:
# For code reviews/analysis: Use Read, Glob, Grep, npm run check only
# For development: Ask "Should I start the dev server?" first
# Always clean up: Kill any background processes at session end
```

### **📋 Session Types & Appropriate Tools**

**1. Strategic Planning/Analysis:**
- ✅ Read planning docs (`01-planning/`)
- ✅ Read implementation docs (`02-07/`)
- ✅ Use static analysis tools only
- ❌ No background servers needed

**2. Codebase Review/Technical Analysis:**
- ✅ Read, Glob, Grep, npm run check
- ✅ Examine architecture documentation
- ❌ No background servers unless explicitly requested

**3. Active Development:**
- ✅ Ask permission: "Should I start the dev server for testing?"
- ✅ Edit, Write, MultiEdit for implementation
- ✅ Use development documentation as reference

**4. Testing/Debugging:**
- ✅ Background processes OK with user permission
- ✅ Always clean up processes at session end

---

## 🎯 **ROLE-BASED QUICK START PATHS**

### **For Strategic Planning & Product Questions**
```bash
# 15-minute strategic context:
1. docs/01-planning/Concept_Vision.md       # Game vision and market positioning
2. docs/01-planning/prd.md                  # Complete product requirements  
3. docs/HANDOFF_SUMMARY.md                  # Current status and roadmap
4. docs/01-planning/mpv_content_scope.md    # Content requirements and targets
```

### **For Technical Development**
```bash
# 20-minute technical foundation:
1. docs/HANDOFF_SUMMARY.md                  # Project status overview
2. docs/06-development/setup.md             # Get coding in 5 minutes
3. docs/02-architecture/system-architecture.md  # Technical design
4. docs/03-workflows/user-workflows.md      # Implementation details
5. MVP_STATUS.md                            # Current completion status
```

### **For UI/UX Work**
```bash
# 15-minute design context:
1. docs/01-planning/ui/ui_workflow_documentation.md  # Original UI analysis
2. docs/04-frontend/frontend-architecture.md        # Component structure
3. docs/03-workflows/user-workflows.md              # User journey implementation
```

### **For Content Creation**
```bash
# 10-minute content system:
1. docs/07-content/content-system.md        # JSON-based content editing
2. docs/03-workflows/game-mechanics.md      # Game systems and balance
3. /data/*.json files                       # Actual game content
```

---

## 🗂️ **KEY FILE LOCATIONS BY PURPOSE**

### **Strategic Vision & Requirements**
- `docs/01-planning/Concept_Vision.md` - Original game concept and vision
- `docs/01-planning/prd.md` - Complete product requirements document
- `docs/01-planning/mpv_content_scope.md` - MVP content scope and specifications

### **Technical Architecture**
- `docs/02-architecture/system-architecture.md` - High-level system design
- `docs/02-architecture/database-design.md` - Complete schema and relationships
- `docs/02-architecture/api-design.md` - REST API specification

### **Implementation Guidelines**
- `docs/03-workflows/user-workflows.md` - End-to-end technical user journeys
- `docs/03-workflows/game-mechanics.md` - Complete game systems documentation
- `docs/04-frontend/frontend-architecture.md` - React component patterns
- `docs/05-backend/backend-architecture.md` - Server design patterns

### **Core Game Logic**
- `shared/engine/game-engine.ts` - **SINGLE SOURCE OF TRUTH** for all calculations
- `shared/schema.ts` - Database schema and type definitions
- `server/routes.ts` - API endpoints and business logic

### **Main UI Components**
- `client/src/components/Dashboard.tsx` - Main game interface
- `client/src/components/MonthPlanner.tsx` - Turn-based action system
- `client/src/components/DialogueModal.tsx` - Role conversation system

### **Game Content (Edit with Caution)**
- `data/balance.json` - Economic balance and game formulas
- `data/roles.json` - 8 industry roles with 72+ dialogue choices
- `data/artists.json` - 6 available artists with archetypes and costs
- `data/dialogue.json` - Additional artist conversations

---

## 🚀 **QUICK ORIENTATION COMMANDS**

### **Safe Analysis Commands (Always OK)**
```bash
# Check project health
npm run check                   # TypeScript compilation
git status                      # Current changes
ls -la                         # Project structure

# Check what's running (if anything)
lsof -i :5000                  # Frontend port
lsof -i :3000                  # Alternative port

# Quick file exploration
grep -r "GameEngine" --include="*.ts" .     # Find GameEngine usage
find . -name "*.json" -path "./data/*"      # Game content files
```

### **Development Commands (Ask Permission First)**
```bash
# Start development environment (ASK FIRST!)
npm run dev                    # Full development server

# Database operations
npm run db:studio             # Database GUI
npm run db:migrate            # Apply schema changes

# Testing
npm run test                  # Run tests (when implemented)
npm run lint                  # Code quality checks
```

---

## 🎯 **COMMON SESSION REQUESTS & RESPONSES**

### **"Give me a codebase overview"**
✅ **Response Path**:
1. Read `docs/HANDOFF_SUMMARY.md` for executive overview
2. Read `docs/02-architecture/system-architecture.md` for technical design  
3. Use static analysis tools (Read, Glob, Grep)
4. Provide comprehensive analysis based on documentation + code

### **"Help me understand the game mechanics"**
✅ **Response Path**:
1. Read `docs/01-planning/Concept_Vision.md` for game vision
2. Read `docs/03-workflows/game-mechanics.md` for complete mechanics
3. Examine `data/balance.json` for economic formulas
4. Provide gameplay explanation with strategic context

### **"I want to implement feature X"**
✅ **Response Path**:
1. Check if feature aligns with strategic vision (planning docs)
2. Review existing architecture patterns (technical docs)
3. Ask: "Should I start the dev server to test this?"
4. Implement following established patterns

### **"Review this code/fix this bug"**
✅ **Response Path**:
1. Use static analysis first (Read, Grep, Glob)
2. Check relevant documentation for context
3. If server needed: Ask permission first
4. Provide analysis with architectural context

### **"How do I modify game content?"**
✅ **Response Path**:
1. Reference `docs/07-content/content-system.md`
2. Show JSON file structure in `/data/`
3. Explain validation and testing process
4. No server needed for content-only changes

---

## 📊 **DEVELOPMENT PRIORITIES & ROADMAP**

### **Current Status: 98% Complete MVP**
The game is **fully playable** with all core systems working. Focus areas:

### **Phase 2: Enhanced Features (Next 2-4 weeks)**
1. **Artist Relationship System** - Implement mood/loyalty consequences
2. **Marketing Campaigns** - Add PR pushes and digital ads with ROI tracking
3. **Industry Events** - Random opportunities and market dynamics
4. **Enhanced Project Management** - Budget allocation and quality improvements

### **Phase 3: Production Features (Next 4-6 weeks)**
1. **Multi-user Support** - Leaderboards and competitions  
2. **Advanced Analytics** - Performance tracking and insights
3. **Social Features** - Artist sharing and label comparisons
4. **Mobile Optimization** - Touch-friendly interface improvements

### **Phase 4: Scale & Polish (Next 2-3 weeks)**
1. **Performance Optimization** - Bundle size and load time improvements
2. **Production Monitoring** - Error tracking and performance metrics
3. **Comprehensive Testing** - Unit, integration, and E2E test suites

---

## 💡 **ARCHITECTURAL INSIGHTS**

### **Key Design Decisions Made**
- **Unified Game Engine**: All calculations in `shared/engine/game-engine.ts`
- **JSON-based Content**: Non-developers can modify game content
- **Type Safety**: TypeScript + Zod throughout the stack
- **Transaction Safety**: Database consistency through proper transactions
- **Component Architecture**: Reusable React components with clear responsibilities

### **Strategic Vision Realized**
- **"Relationships matter"** → Dialogue system with 8 industry professionals
- **"Strategic depth"** → Resource management with access tier progression
- **"Authentic feel"** → Real industry economics and role-based interactions
- **"Replayable"** → 12-month campaigns with scoring and victory conditions

---

## ✅ **SESSION SUCCESS CRITERIA**

### **Every Session Should End With**
- ✅ No background processes left running (check with `lsof -i :5000`)
- ✅ Port 5000 available for user's `npm run dev` 
- ✅ TypeScript compilation clean (`npm run check`)
- ✅ Clear understanding of strategic vision + technical implementation
- ✅ Actionable recommendations or completed work
- ✅ Updated documentation if needed

### **Session Quality Indicators**
- ✅ Referenced both strategic planning AND technical documentation
- ✅ Preserved existing architecture patterns
- ✅ Aligned recommendations with product vision
- ✅ Provided implementation details with strategic context

---

## 🔍 **TROUBLESHOOTING GUIDE**

### **If Confused About Project Direction**
1. Read `docs/01-planning/Concept_Vision.md` for strategic north star
2. Check `docs/HANDOFF_SUMMARY.md` for current priorities
3. Review `MVP_STATUS.md` for what's already complete

### **If Unclear About Technical Implementation**
1. Start with `docs/02-architecture/system-architecture.md`
2. Check `docs/03-workflows/user-workflows.md` for specific flows
3. Examine actual code in key files listed above

### **If Session Rules Are Unclear**
1. Always read `docs/99-legacy/ClaudeCodeInstructions.md` first
2. Follow the background process management rules strictly
3. When in doubt, ask permission before starting servers

---

## 🏆 **FINAL NOTES**

### **This Project Is Special Because**
- **98% Complete MVP** - Rarely do you inherit such a complete, polished system
- **Comprehensive Documentation** - Both strategic vision AND technical implementation
- **Professional Quality** - Production-ready architecture and design
- **Clear Roadmap** - Well-defined next steps and growth phases

### **Your Role as Claude**
- **Preserve Excellence** - Maintain the high-quality architecture and design patterns
- **Bridge Strategy & Technical** - Use both planning docs and implementation docs
- **Enable Growth** - Help extend the system following established patterns
- **Maintain Vision** - Keep the strategic product vision in mind for all decisions

**Welcome to the Music Label Manager project! You're joining a well-architected, nearly complete system with excellent documentation. Use both the strategic planning foundation and technical implementation details to provide the best possible assistance.**

---

*This onboarding document integrates strategic planning with technical implementation to provide complete project context for any Claude session.*