# System Architecture

**Music Label Manager - Complete System Design**  
*Version: 1.0 (MVP Complete)*

---

## 🏗️ High-Level Architecture

The Music Label Manager is a **strategic simulation game** built as a full-stack web application with a unified game engine architecture. The system is designed for scalability, maintainability, and content flexibility.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client (React) │    │  Server (Node)  │    │  Database (PG)  │
│                 │    │                 │    │                 │
│  ┌─────────────┐│    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│  │ Components  ││    │ │ Game Engine │ │    │ │ Game State  │ │
│  │             ││    │ │             │ │    │ │             │ │
│  │ • Dashboard ││    │ │ • Unified   │ │    │ │ • Schemas   │ │
│  │ • Modals    ││◄──►│ │   Logic     │ │◄──►│ │ • Relations │ │
│  │ • Forms     ││    │ │ • Balance   │ │    │ │ • JSONB     │ │
│  └─────────────┘│    │ │ • RNG       │ │    │ │ • Types     │ │
│                 │    │ └─────────────┘ │    │ └─────────────┘ │
│  ┌─────────────┐│    │                 │    │                 │
│  │ State Mgmt  ││    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│  │             ││    │ │ REST API    │ │    │ │ Content     │ │
│  │ • Zustand   ││    │ │             │ │    │ │ Files       │ │
│  │ • React     ││    │ │ • Routes    │ │    │ │             │ │
│  │   Query     ││    │ │ • Auth      │ │    │ │ • JSON      │ │
│  └─────────────┘│    │ │ • Validation│ │    │ │ • Balance   │ │
└─────────────────┘    │ └─────────────┘ │    │ │ • Dialogue  │ │
                       └─────────────────┘    │ └─────────────┘ │
                                              └─────────────────┘
```

---

## 🧩 Core Components

### **1. Unified Game Engine (`/shared/engine/game-engine.ts`)**
**Purpose**: Single source of truth for all game calculations and logic

**Key Responsibilities**:
- Month advancement and turn processing
- Resource calculations (money, reputation, creative capital)
- Project progression and completion
- Artist relationship management
- Access tier progression
- Random event generation
- Campaign completion and scoring

**Architecture Pattern**: 
```typescript
class GameEngine {
  constructor(gameState: GameState, gameData: ServerGameData)
  
  async advanceMonth(actions: GameEngineAction[]): Promise<{
    gameState: GameState;
    summary: MonthSummary;
    campaignResults?: CampaignResults;
  }>
}
```

**Key Benefits**:
- Deterministic gameplay (seeded RNG)
- Consistent calculations between client preview and server execution
- Easy to test and modify game balance
- Clear separation of game logic from UI and API layers

### **2. Database Layer (`/shared/schema.ts`, `/server/storage.ts`)**
**Purpose**: Persistent game state and user data management

**Database Design Principles**:
- **UUIDs**: All primary keys for distributed system compatibility
- **JSONB**: Flexible storage for game flags, metadata, and evolving data
- **Transactions**: Atomic operations for game state changes
- **Relations**: Clear foreign key relationships between entities

**Core Tables**:
```sql
-- User management
users (id, username, password_hash, created_at)

-- Game sessions
game_states (id, user_id, current_month, money, reputation, flags, ...)

-- Game entities
artists (id, game_id, name, archetype, talent, mood, loyalty, ...)
projects (id, game_id, artist_id, title, type, stage, quality, budget, ...)
monthly_actions (id, game_id, month, action_type, target_id, results, ...)

-- Save system
game_saves (id, user_id, name, game_state, month, created_at)
```

### **3. Content Management System (`/data/*.json`)**
**Purpose**: Game content separated from code for easy modification

**Content Structure**:
- **`balance.json`**: Economic balance, costs, formulas, and progression thresholds
- **`roles.json`**: Industry role definitions with dialogue trees and meeting options
- **`dialogue.json`**: Artist conversations and choice consequences
- **`artists.json`**: Available artists with archetypes, costs, and traits
- **`events.json`**: Random events with triggers and outcomes
- **`world.json`**: Game world configuration and access tiers

**Benefits**:
- Non-developers can modify game content
- Easy A/B testing of game balance
- Content versioning and rollback capability
- Localization-ready structure

### **4. API Layer (`/server/routes.ts`)**
**Purpose**: RESTful API with proper validation and error handling

**API Design Patterns**:
- **Type-safe contracts**: Zod validation for all inputs/outputs
- **Database transactions**: Atomic operations for game state changes
- **Error boundaries**: Consistent error handling and user feedback
- **Authentication middleware**: Session-based user management

**Key Endpoints**:
```typescript
// Core game operations
GET    /api/game/:id              // Get game state with related data
POST   /api/game                  // Create new game
PATCH  /api/game/:id              // Update game state
POST   /api/advance-month         // Process monthly turn

// Entity management
POST   /api/game/:gameId/artists  // Sign new artist
POST   /api/game/:gameId/projects // Create new project
POST   /api/game/:gameId/actions  // Record player action

// Content system
GET    /api/roles/:roleId         // Get role dialogue data
GET    /api/roles/:roleId/meetings/:meetingId  // Get specific meeting

// Save system
GET    /api/saves                 // List user saves
POST   /api/saves                 // Create new save
```

---

## 🔄 Data Flow Architecture

### **Monthly Turn Cycle**
The core game loop follows this pattern:

```
1. Player selects actions (up to 3) in MonthPlanner
   ↓
2. Dashboard calls Zustand store's advanceMonth()
   ↓
3. Zustand store calls /api/advance-month with selected actions
   ↓
4. Server creates database transaction
   ↓
5. GameEngine processes actions and calculates outcomes
   ↓
6. Database updates: game state, projects, monthly actions
   ↓
7. Response returns: updated game state, summary, campaign results
   ↓
8. Zustand store updates state and sets campaignResults if month 12
   ↓
9. GamePage detects campaignResults and shows completion modal
```

### **Dialogue System Flow**
Role-based conversations follow this pattern:

```
1. Player clicks role in MonthPlanner (e.g., "Meet A&R Rep")
   ↓
2. MonthPlanner maps role ID and opens dialogue
   ↓
3. DialogueModal fetches role data from /api/roles/:roleId
   ↓
4. Player selects dialogue choice with immediate/delayed effects
   ↓
5. selectDialogueChoice() applies immediate effects to game state
   ↓
6. Action is added to selectedActions for month advancement
   ↓
7. Monthly turn processes dialogue choice through GameEngine
```

### **Save/Load System Flow**

```
Save Flow:
1. Player clicks save button → SaveGameModal opens
2. Player enters save name → validation
3. Current game state + related data serialized
4. POST /api/saves with userId from auth middleware
5. Database stores save with metadata

Load Flow:
1. Player clicks load on save slot
2. loadGameFromSave() fetches save data
3. Game state restored in Zustand store
4. UI updates to reflect loaded game state
```

---

## 🎯 Architecture Decisions & Rationale

### **1. Unified Game Engine**
**Decision**: Single GameEngine class handles all calculations  
**Rationale**: 
- Ensures consistency between client previews and server execution
- Makes testing and balance changes easier
- Provides single source of truth for game logic
- Enables deterministic gameplay through seeded RNG

### **2. JSON-Based Content System**
**Decision**: Game content in JSON files rather than database  
**Rationale**:
- Allows non-developers to modify game content
- Enables version control of game balance
- Faster iteration on content changes
- Easier to implement content management tools

### **3. Zustand + React Query State Management**
**Decision**: Dual state management approach  
**Rationale**:
- Zustand for game state that needs persistence
- React Query for server state and caching
- Clear separation of concerns
- Optimistic updates with server reconciliation

### **4. Component-Based UI Architecture**
**Decision**: Modular components with clear responsibilities  
**Rationale**:
- Reusable UI components across features
- Easy to test individual components
- Clear data flow and state management
- Maintainable codebase as features grow

### **5. Transaction-Based Database Operations**
**Decision**: Database transactions for all game state changes  
**Rationale**:
- Ensures data consistency during complex operations
- Prevents partial updates that could corrupt game state
- Enables atomic rollback on errors
- Professional-grade data integrity

---

## 🔐 Security & Authentication

### **Current Implementation**
- **Session-based authentication** using Passport.js
- **Password hashing** with industry-standard bcrypt
- **User ID middleware** automatically adds userId to requests
- **Input validation** using Zod schemas on all endpoints
- **SQL injection protection** through Drizzle ORM parameterized queries

### **Production Considerations**
- HTTPS enforcement in production
- Rate limiting on API endpoints
- Content Security Policy headers
- Session store configuration for production
- Environment variable management for secrets

---

## 📈 Scalability Considerations

### **Current Architecture Supports**
- **Horizontal scaling** of server instances (stateless design)
- **Database connection pooling** for concurrent users
- **Content caching** through JSON file system
- **Client-side state optimization** through React Query

### **Future Scaling Options**
- **Redis session store** for multi-instance deployments
- **Content CDN** for JSON files and static assets
- **Database read replicas** for analytics and reporting
- **Microservices extraction** for specific features (analytics, social features)

---

## 🧪 Testing Strategy

### **Current Testing Approach**
- **Type safety** through TypeScript compilation
- **Runtime validation** through Zod schemas
- **Manual testing** of complete user workflows
- **Game balance validation** through JSON schema validation

### **Recommended Testing Expansion**
- **Unit tests** for GameEngine calculations
- **Integration tests** for API endpoints
- **Component tests** for UI behavior
- **End-to-end tests** for complete user workflows

---

This architecture provides a solid foundation for the MVP and is designed to scale efficiently as the game grows in complexity and user base.