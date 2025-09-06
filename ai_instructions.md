# AI Assistant Instructions for Music Label Manager

## Quick Context
You're working on **Top Roles: Music Label Manager**, a browser-based music industry simulation game. This is a monorepo with React (Vite) frontend, Express backend, PostgreSQL database (via Neon on Replit), and shared TypeScript code.

## Current State (Updated: August 20, 2025 - Single Source of Truth Migration Complete)
**Latest Session**: CRITICAL ARCHITECTURAL MIGRATION - Eliminated all duplicate logic across layers
- **Tech Stack**: React + Vite, Express, PostgreSQL (Neon), TypeScript, Zustand, React Query
- **Architecture**: CLEAN SEPARATION OF CONCERNS - GameEngine is single source of truth for ALL business logic
- **Game Content**: 8 roles, 24 meetings, 6 artists, 12 events (all in JSON files under /data)
- **Current Phase**: 100% Complete MVP + Clean Architecture Migration

## Completed Major Systems ✅
1. ✅ **Single Source of Truth Architecture** - GameEngine handles ALL business logic, zero duplication
2. ✅ **Unified Game Engine** - Complete in `shared/engine/game-engine.ts` with ALL calculations
3. ✅ **Artist Signing System** - Full discovery, signing, and management
4. ✅ **Project Creation** - Singles, EPs, Mini-Tours with comprehensive modals
5. ✅ **Project Revenue System** - Projects generate revenue, streams, and press coverage on completion
6. ✅ **Dialogue System** - Role meetings with immediate/delayed effects
7. ✅ **Save/Load System** - Multiple slots with export/import capability
8. ✅ **Monthly Turn System** - 3-action planning with resource management
9. ✅ **Access Tier Progression** - Playlist, Press, Venue tier advancement
10. ✅ **Month Summary Display** - Shows detailed results after month advancement
11. ✅ **Clean Layer Separation** - Routes (HTTP only), GameData (data only), GameEngine (logic only)
12. ✅ **Phase 1 & 2 UI/UX Enhancements** - Complete user experience with strategic recommendations

## Key Files & Their Purpose

### Core Game Logic
- `shared/engine/game-engine.ts` - SINGLE SOURCE OF TRUTH for ALL business logic (project advancement, economic calculations, revenue processing)
- `shared/types/gameTypes.ts` - All TypeScript interfaces
- `shared/api/contracts.ts` - API endpoint definitions

### Frontend
- `client/src/store/gameStore.ts` - Zustand store (game state management)
- `client/src/components/Dashboard.tsx` - Main game interface
- `client/src/components/MonthPlanner.tsx` - Enhanced action planning UI with strategic recommendations
- `client/src/components/MonthSummary.tsx` - Monthly results display
- `client/src/components/ProjectCreationModal.tsx` - Project creation interface

### Backend
- `server/routes.ts` - Express HTTP handling ONLY (delegates ALL business logic to GameEngine)
- `server/storage.ts` - Pure database operations ONLY
- `server/data/gameData.ts` - Pure JSON data access ONLY (NO calculations or business logic)

### Game Content (DO NOT MODIFY WITHOUT CAREFUL CONSIDERATION)
- `data/balance.json` - All game balance numbers (includes project revenue formulas)
- `data/roles.json` - 5 industry roles 
- `data/artists.json` - 6 unique artists with archetypes
- `data/events.json` - 12 side events
- `data/dialogue.json` - Additional artist dialogues

## Important Design Decisions

### State Management
- **Server State**: Use React Query (`useQuery`, `useMutation`)
- **UI State**: Use Zustand (modals, selected items, temporary forms)
- **Never**: Duplicate game state between both systems

### API Pattern
```typescript
// All endpoints follow this pattern:
/api/games/:gameId/[resource]
/api/games/:gameId/advance-month
/api/games/:gameId/actions
```

### Architecture Rules (CRITICAL - NEWLY ENFORCED)
1. **GameEngine is single source of truth** - ALL business logic lives here ONLY
2. **Routes.ts handles HTTP concerns ONLY** - No business logic, delegates everything to GameEngine
3. **GameData.ts provides data access ONLY** - No calculations, just JSON file loading
4. **Storage.ts handles database ONLY** - Pure CRUD operations, no business logic
5. **Client previews only** - Client can show calculations but doesn't save

## Common Tasks

### Adding a New Feature
1. Define types in `shared/types/gameTypes.ts`
2. Add API contract in `shared/api/contracts.ts`
3. Implement server endpoint in `server/routes.ts`
4. Create React Query hook in `client/src/features/[feature]/hooks/`
5. Build UI component
6. Update this document

### Modifying Game Balance
1. Edit values in `data/balance.json`
2. Run validation: `npm run validate` (if exists)
3. Test in game
4. Document change in CHANGELOG.md

### Debugging Turn Resolution
1. Check `GameEngine.advanceMonth()` in shared/engine
2. Look at `monthlyActions` table in database
3. Verify effects are being applied in `applyEffects()`
4. Check browser console for client errors
5. Check server logs for backend errors

## Testing Approach
- Unit tests: Calculations in GameEngine
- Integration tests: API endpoints
- E2E tests: Complete month cycle
- Manual tests: Dialogue flows, UI interactions

## Previous Issues - ALL RESOLVED ✅
1. ✅ **API Mismatch**: Server routes don't match contracts.ts - FIXED
2. ✅ **Hard-coded IDs**: Some components use hard-coded game IDs - FIXED  
3. ✅ **Duplicate Logic**: Some calculations exist in both client and server - **ELIMINATED**
4. ✅ **Missing Features**: Dialogue UI, project pipelines, event triggers - ALL IMPLEMENTED
5. ✅ **Project Stage Advancement Split**: Routes.ts vs GameEngine logic - **CONSOLIDATED**
6. ✅ **Duplicate Streaming Calculations**: GameData.ts vs GameEngine methods - **ELIMINATED**
7. ✅ **Business Logic in Data Layer**: Economic calculations in wrong layer - **MOVED TO GameEngine**

## Replit-Specific Notes
- Database: PostgreSQL via Neon (connection string in Secrets)
- Deployment: Use Replit's deployment feature
- Storage: No localStorage limits, but prefer database
- Resources: 4 vCPUs, 8 GiB memory on Core plan

## Code Style Guide
```typescript
// Use descriptive names
const calculateStreamingRevenue = () => {}

// Document complex logic
/**
 * Calculates streaming revenue using quality, playlist access,
 * reputation, and marketing spend as inputs
 */

// Prefer types over interfaces for unions
type ProjectType = 'single' | 'ep' | 'tour';

// Use Zod for runtime validation
const schema = z.object({ ... });
```

## When Stuck
1. Check this document first
2. Look at similar code in the codebase
3. Check `shared/types/gameTypes.ts` for data structures
4. Review `data/balance.json` for game mechanics
5. Ask: "Is this a client, server, or shared concern?"

## DO NOT
- ❌ Add game logic ANYWHERE except GameEngine
- ❌ Put business logic in routes.ts (HTTP handling only)
- ❌ Put calculations in gameData.ts (data access only)
- ❌ Duplicate logic between layers
- ❌ Modify JSON data without updating types
- ❌ Use `any` type without TODO comment
- ❌ Skip documentation for new features
- ❌ Duplicate state between React Query and Zustand

## Quick Commands
```bash
# Start development
npm run dev

# Run tests (when implemented)
npm test

# Check types
npm run type-check

# Database operations
npm run db:push
npm run db:seed
```

## Recent Changes
- **August 20, 2025: CRITICAL ARCHITECTURAL MIGRATION COMPLETED**
  - **Single Source of Truth**: GameEngine now handles ALL business logic
  - **Project Advancement**: Moved ALL logic from routes.ts to GameEngine.advanceProjectStages()
  - **Economic Calculations**: Moved calculateEnhancedProjectCost, calculatePerSongProjectCost, calculateEconomiesOfScale from gameData.ts to GameEngine
  - **Duplicate Logic Elimination**: Removed duplicate methods from gameData.ts
  - **Clean Separation**: Routes.ts = HTTP only, GameData.ts = data only, GameEngine = logic only
- August 18, 2025: **Phase 1 & 2 UI/UX Enhancements Completed**
- December 18, 2024: Fixed project revenue generation system
- December 18, 2024: Integrated MonthSummary display for advancement results
- August 18, 2025: Unified game engine created in shared/engine
- August 18, 2025: Completed artist signing system
- August 18, 2025: Implemented save/load functionality

---

*Keep this document updated as the codebase evolves!*