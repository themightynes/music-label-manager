# AI Assistant Instructions for Music Label Manager

## Quick Context
You're working on **Top Roles: Music Label Manager**, a browser-based music industry simulation game. This is a monorepo with React (Vite) frontend, Express backend, PostgreSQL database (via Neon on Replit), and shared TypeScript code.

## Current State (Updated: August 18, 2025)
- **Tech Stack**: React + Vite, Express, PostgreSQL (Neon), TypeScript, Zustand, React Query
- **Architecture**: Unified monorepo with clean separation (client/, server/, shared/)
- **Game Content**: 8 roles, 24 meetings, 6 artists, 12 events (all in JSON files under /data)
- **Current Phase**: 99.5% Complete MVP - Phase 2 UI/UX Enhancements Complete

## Completed Major Systems ✅
1. ✅ **Unified Game Engine** - Complete in `shared/engine/game-engine.ts`
2. ✅ **Artist Signing System** - Full discovery, signing, and management
3. ✅ **Project Creation** - Singles, EPs, Mini-Tours with comprehensive modals
4. ✅ **Project Revenue System** - Projects generate revenue, streams, and press coverage on completion
5. ✅ **Dialogue System** - Role meetings with immediate/delayed effects
6. ✅ **Save/Load System** - Multiple slots with export/import capability
7. ✅ **Monthly Turn System** - 3-action planning with resource management
8. ✅ **Access Tier Progression** - Playlist, Press, Venue tier advancement
9. ✅ **Month Summary Display** - Shows detailed results after month advancement
10. ✅ **Simplified Architecture** - All components consolidated to `/components` folder
11. ✅ **Phase 1 UI/UX Enhancements** - Revenue tracking, ROI calculations, enhanced notifications, and tabbed month summary
12. ✅ **Phase 2 UI/UX Enhancements** - Rich contextual information, strategic recommendations, and comprehensive feedback systems

## Key Files & Their Purpose

### Core Game Logic
- `shared/engine/game-engine.ts` - SINGLE SOURCE OF TRUTH for all calculations
- `shared/types/gameTypes.ts` - All TypeScript interfaces
- `shared/api/contracts.ts` - API endpoint definitions

### Frontend
- `client/src/store/gameStore.ts` - Zustand store (game state management)
- `client/src/components/Dashboard.tsx` - Main game interface
- `client/src/components/MonthPlanner.tsx` - Enhanced action planning UI with strategic recommendations
- `client/src/components/MonthSummary.tsx` - Monthly results display
- `client/src/components/ProjectCreationModal.tsx` - Project creation interface

### Backend
- `server/routes.ts` - Express API endpoints
- `server/storage.ts` - Database operations
- `server/data/gameData.ts` - Wrapper for loading JSON content

### Game Content (DO NOT MODIFY WITHOUT CAREFUL CONSIDERATION)
- `data/balance.json` - All game balance numbers (includes project revenue formulas)
- `data/roles.json` - 8 industry roles with meetings
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

### Game Engine Rules
1. **Server is authoritative** - Only server changes game state
2. **Client previews only** - Client can show calculations but doesn't save
3. **All formulas in one place** - `shared/engine/GameEngine.ts`

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

## Known Issues / Tech Debt
1. ~~**API Mismatch**: Server routes don't match contracts.ts~~ FIXED
2. ~~**Hard-coded IDs**: Some components use hard-coded game IDs~~ FIXED
3. ~~**Duplicate Logic**: Some calculations exist in both client and server~~ FIXED
4. ~~**Missing Features**: Dialogue UI, project pipelines, event triggers~~ ALL IMPLEMENTED

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
- ❌ Add game logic to client-only code
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
- August 18, 2025: **Phase 1 & 2 UI/UX Enhancements Completed**
  - **Phase 1**: ActiveProjects revenue tracking and ROI calculations, MonthSummary tabbed interface and rich categorization, ToastNotification progress indicators and action buttons
  - **Phase 2**: MonthPlanner detailed action metadata and strategic recommendations, AccessTierBadges complete redesign with progression paths, ArtistRoster comprehensive analytics and management insights
- December 18, 2024: Fixed project revenue generation system
- December 18, 2024: Integrated MonthSummary display for advancement results
- December 18, 2024: Linked ProjectCreationModal to ActiveProjects
- December 18, 2024: Enhanced toast notifications for all game events
- December 18, 2024: Consolidated and simplified component architecture
- December 18, 2024: Removed duplicate components from features folder
- August 18, 2025: Unified game engine created in shared/engine
- August 18, 2025: Completed artist signing system
- August 18, 2025: Implemented save/load functionality

---

*Keep this document updated as the codebase evolves!*