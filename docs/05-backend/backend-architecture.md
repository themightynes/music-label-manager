# Backend Architecture

**Music Label Manager - Node.js Server Design**  
*Version: 1.0 (MVP Complete)*

---

## 🚀 Backend Overview

The Music Label Manager backend is a **Node.js** application built with **Express.js**, **TypeScript**, and **PostgreSQL**. The architecture emphasizes type safety, transaction integrity, and separation of concerns.

**Technology Stack**:
- **Node.js 18+** with TypeScript
- **Express.js** web framework
- **PostgreSQL** with Drizzle ORM
- **Passport.js** for authentication
- **Zod** for validation
- **Shared types** between client and server

---

## 📁 Server Structure

```
server/
├── index.ts              # Server entry point and configuration
├── routes.ts             # All API endpoints and route handlers
├── auth.ts               # Authentication system (Passport.js)
├── db.ts                 # Database connection and configuration
├── storage.ts            # Data access layer abstraction
├── vite.ts               # Vite integration for development
└── data/
    └── gameData.ts       # Game content server interface

shared/
├── engine/
│   └── game-engine.ts    # Unified game logic engine
├── api/
│   ├── client.ts         # API client for frontend
│   └── contracts.ts      # API request/response types
├── schema.ts             # Database schema and Zod validation
├── types/
│   └── gameTypes.ts      # Shared TypeScript types
└── utils/
    └── dataLoader.ts     # Content loading utilities
```

---

## 🔧 Core Architecture Patterns

### **1. Single Source of Truth Pattern** ✅ MIGRATION COMPLETE
ALL game logic is now centralized in GameEngine with complete separation of concerns:

```typescript
// shared/engine/game-engine.ts
export class GameEngine {
  private rng: seedrandom.PRNG;
  private gameData: ServerGameData;
  
  constructor(
    private gameState: GameState,
    gameData: ServerGameData,
    seed?: string
  ) {
    this.gameData = gameData;
    this.rng = seedrandom(seed || `${gameState.id}-${gameState.currentMonth}`);
  }

  // PRIMARY METHOD: Handles ALL business logic
  async advanceMonth(monthlyActions: GameEngineAction[]): Promise<{
    gameState: GameState;
    summary: MonthSummary;
    campaignResults?: CampaignResults;
  }> {
    // Process all actions, calculate outcomes, update state
    // SINGLE SOURCE OF TRUTH for ALL game calculations
  }
  
  // NEW: Project advancement (moved from routes.ts)
  advanceProjectStages(): void {
    // ALL project stage advancement logic
  }
  
  // NEW: Economic calculations (moved from gameData.ts) 
  calculateEnhancedProjectCost(baseData: any): number
  calculatePerSongProjectCost(songData: any): number
  calculateEconomiesOfScale(projectCount: number): number
}
```

**Benefits**:
- Deterministic gameplay through seeded RNG
- Consistent calculations between environments
- Easy testing and balance modifications
- **ELIMINATED duplicate logic across layers**
- **Clean architectural boundaries** - no business logic leakage
- **Single source of truth** for all game mechanics

### **1.1 Individual Song Revenue System (NEW: Phase 1 Enhancement)**
Enhanced GameEngine with individual song tracking for realistic music industry simulation:

```typescript
// GameEngine processes individual songs instead of aggregate projects
class GameEngine {
  // Enhanced monthly processing with individual song revenue
  private async processReleasedProjects(summary: MonthSummary): Promise<void> {
    try {
      // Get all released songs for this game (not projects)
      const releasedSongs = await this.gameData.getReleasedSongs(this.gameState.id);
      
      for (const song of releasedSongs) {
        // Calculate individual song ongoing revenue
        const ongoingRevenue = this.calculateOngoingSongRevenue(song);
        
        if (ongoingRevenue > 0) {
          // Update individual song metrics
          await this.gameData.updateSongs([{
            songId: song.id,
            monthlyStreams: Math.round(ongoingRevenue / 0.05),
            lastMonthRevenue: ongoingRevenue,
            totalRevenue: (song.totalRevenue || 0) + ongoingRevenue,
            totalStreams: (song.totalStreams || 0) + Math.round(ongoingRevenue / 0.05)
          }]);
          
          summary.revenue += ongoingRevenue;
          summary.changes.push({
            type: 'ongoing_revenue',
            description: `🎵 "${song.title}" ongoing streams`,
            amount: ongoingRevenue
          });
        }
      }
    } catch (error) {
      // Graceful fallback to legacy project-based processing
      await this.processReleasedProjectsLegacy(summary);
    }
  }

  // Individual song revenue calculation
  private calculateOngoingSongRevenue(song: any): number {
    const monthsSinceRelease = this.gameState.currentMonth - song.releaseMonth;
    const baseDecay = Math.pow(0.85, monthsSinceRelease); // 15% monthly decline
    const monthlyStreams = song.initialStreams * baseDecay * reputationBonus * accessBonus * 0.8;
    return Math.round(monthlyStreams * 0.05); // $0.05 per ongoing stream
  }
}
```

**Key Features**:
- **Individual song processing**: Each song has separate decay and revenue calculation
- **Quality-based performance**: Initial streams based on individual song quality
- **Monthly updates**: Individual song metrics updated each month
- **Aggregated display**: Projects show sum of individual song performance
- **Backward compatibility**: Graceful fallback for legacy project-based data

### **2. Clean Separation of Concerns** ✅ ARCHITECTURE MIGRATION COMPLETE
Routes.ts now handles ONLY HTTP concerns, GameEngine handles ALL business logic:

```typescript
// server/routes.ts - CLEAN HTTP layer with delegation pattern
app.post("/api/advance-month", getUserId, async (req, res) => {
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Get current game state (DATA LAYER ONLY)
      const [gameState] = await tx
        .select()
        .from(gameStates)
        .where(eq(gameStates.id, gameId));
      
      // 2. DELEGATE ALL BUSINESS LOGIC TO GameEngine
      const gameEngine = new GameEngine(gameStateForEngine, serverGameData);
      const monthResult = await gameEngine.advanceMonth(formattedActions, tx);
      
      // GameEngine now handles:
      // - Project stage advancement (moved FROM routes.ts)
      // - Economic calculations (moved FROM gameData.ts) 
      // - Revenue processing (consolidated)
      // - ALL game logic and formulas
      
      // 3. Update database with GameEngine results (DATA LAYER ONLY)
      const [updatedGameState] = await tx
        .update(gameStates)
        .set({
          currentMonth: monthResult.gameState.currentMonth,
          money: monthResult.gameState.money,
          reputation: monthResult.gameState.reputation,
          // ... all game state updates calculated by GameEngine
        })
        .where(eq(gameStates.id, gameId))
        .returning();
      
      // 4. Save action history (DATA LAYER ONLY)
      await tx.insert(monthlyActions).values(actionRecords);
      
      return { gameState: updatedGameState, summary: monthResult.summary };
    });
    
    res.json(result);
  } catch (error) {
    // Transaction automatically rolls back on error
    res.status(500).json({ message: 'Failed to advance month' });
  }
});
```

#### **Clean Layer Architecture** ✅ MIGRATION COMPLETE
Each layer now has a single, clear responsibility with no overlap:

```typescript
// LAYER 1: HTTP/API (server/routes.ts)
// - Request validation
// - Response formatting  
// - Database transactions
// - NO BUSINESS LOGIC

// LAYER 2: Business Logic (shared/engine/game-engine.ts)
// - ALL game calculations
// - ALL economic formulas
// - ALL project advancement
// - ALL revenue processing
// - NO HTTP or DATABASE concerns

// LAYER 3: Data Access (server/data/gameData.ts)
// - JSON file loading ONLY
// - Static data access ONLY
// - NO CALCULATIONS or BUSINESS LOGIC

// LAYER 4: Database (server/storage.ts)
// - Pure CRUD operations
// - Schema management
// - NO BUSINESS LOGIC
```

**Benefits of Clean Architecture**:
- **Eliminated Violations**: No duplicate logic between layers
- **Clear Responsibilities**: Each layer has one purpose
- **Easy Testing**: Business logic isolated and testable
- **Maintainable**: Changes in one layer don't affect others
- **Professional Architecture**: Industry-standard separation of concerns

### **3. Type-Safe API Contracts**
Shared types ensure consistency between client and server:

```typescript
// shared/api/contracts.ts
export const AdvanceMonthRequest = z.object({
  gameId: z.string().uuid(),
  selectedActions: z.array(z.object({
    actionType: z.enum(['role_meeting', 'start_project', 'marketing']),
    targetId: z.string(),
    metadata: z.record(z.any()).default({})
  }))
});

export const AdvanceMonthResponse = z.object({
  gameState: GameStateSchema,
  summary: MonthSummarySchema,
  campaignResults: CampaignResultsSchema.optional()
});

export type AdvanceMonthRequest = z.infer<typeof AdvanceMonthRequest>;
export type AdvanceMonthResponse = z.infer<typeof AdvanceMonthResponse>;

// Usage in route handler
const request = validateRequest(AdvanceMonthRequest, req.body);
const response: AdvanceMonthResponse = await processAdvanceMonth(request);
res.json(response);
```

**Benefits**:
- Compile-time type checking
- Runtime validation with descriptive errors
- Self-documenting API contracts
- Reduced integration bugs

### **4. Pure Data Access Layer** ✅ BUSINESS LOGIC REMOVED
GameData.ts now provides ONLY static data access with NO calculations:

```typescript
// server/data/gameData.ts - PURE DATA LAYER
export class ServerGameData {
  private balanceConfig: any = null;
  private rolesData: any = null;
  private artistsData: any = null;

  async initialize() {
    // Load all JSON content files ONLY
    this.balanceConfig = await this.loadJSON('balance.json');
    this.rolesData = await this.loadJSON('roles.json');
    this.artistsData = await this.loadJSON('artists.json');
  }

  // PURE DATA ACCESS - NO BUSINESS LOGIC
  async getRoleById(roleId: string): Promise<Role | null> {
    if (!this.rolesData) await this.initialize();
    return this.rolesData.roles.find((role: any) => role.id === roleId);
  }

  async getBalanceConfig(): Promise<any> {
    if (!this.balanceConfig) await this.initialize();
    return this.balanceConfig;
  }

  // REMOVED: calculateProjectCost(), calculateStreamingOutcome(), 
  //          calculateEnhancedProjectCost(), calculatePerSongProjectCost(),
  //          calculateEconomiesOfScale()
  // ALL CALCULATIONS MOVED TO GameEngine
  
  // Simple data access methods for GameEngine
  getStreamingConfigSync(): any { return this.balanceConfig.streaming; }
  getPressConfigSync(): any { return this.balanceConfig.press; }
  getAccessTiersSync(): any { return this.balanceConfig.access_tiers; }
}
```

**Benefits**:
- Non-developers can modify game content
- Version control for game balance 
- A/B testing capability
- **Perfect separation of data from logic**
- **No business logic contamination in data layer**
- **GameEngine has single source for all calculations**

---

## 🛣️ API Design

### **RESTful Endpoint Structure**
```typescript
// Core game operations
GET    /api/game/:id              // Get complete game state with related data
POST   /api/game                  // Create new game session
PATCH  /api/game/:id              // Update specific game state fields
POST   /api/advance-month         // Process monthly turn (primary game loop)

// Entity management
POST   /api/game/:gameId/artists  // Sign new artist with economic validation
POST   /api/game/:gameId/projects // Create new project with budget validation
POST   /api/game/:gameId/actions  // Record player action for analytics

// Content system
GET    /api/roles/:roleId                    // Get role data for dialogue system
GET    /api/roles/:roleId/meetings/:meetingId // Get specific meeting content
GET    /api/dialogue/:roleType              // Legacy dialogue endpoint
GET    /api/artists/:archetype/dialogue     // Artist-specific conversations

// Save system
GET    /api/saves                 // List user's save games
POST   /api/saves                 // Create new save with complete game state

// Authentication
POST   /api/auth/register         // User registration
POST   /api/auth/login            // User login with session creation
POST   /api/auth/logout           // Session termination
GET    /api/auth/me               // Get current user information

// Development/debugging
GET    /api/test-data             // Verify game content loading
GET    /api/validate-types        // Validate data structure integrity
```

### **Authentication & Authorization**
Session-based authentication with Passport.js:

```typescript
// server/auth.ts
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

export const getUserId = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    req.userId = (req.user as any).id;
    return next();
  }
  res.status(401).json({ message: 'User not authenticated' });
};

// Usage in routes
app.get('/api/game/:id', getUserId, async (req, res) => {
  // req.userId automatically available
  const gameState = await storage.getGameState(req.params.id);
  
  // Verify user owns this game state
  if (gameState.userId !== req.userId) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  res.json(gameState);
});
```

### **Input Validation Pattern**
All endpoints use Zod validation:

```typescript
// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Route handler example
app.post('/api/game/:gameId/artists', getUserId, async (req, res) => {
  try {
    // Validate input against schema
    const validatedData = insertArtistSchema.parse({
      ...req.body,
      gameId: req.params.gameId
    });
    
    // Process request with validated data
    const artist = await storage.createArtist(validatedData);
    res.json(artist);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        message: 'Invalid artist data', 
        errors: error.errors 
      });
    } else {
      res.status(500).json({ message: 'Failed to create artist' });
    }
  }
});
```

---

## 💾 Data Access Layer

### **Storage Abstraction**
The storage layer provides clean abstraction over database operations:

```typescript
// server/storage.ts
export class Storage {
  constructor(private db: Database) {}

  async getGameState(gameId: string): Promise<GameState | null> {
    const [gameState] = await this.db
      .select()
      .from(gameStates)
      .where(eq(gameStates.id, gameId));
    
    return gameState || null;
  }

  async createGameState(data: Omit<GameState, 'id'>): Promise<GameState> {
    const [gameState] = await this.db
      .insert(gameStates)
      .values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return gameState;
  }

  async updateGameState(gameId: string, updates: Partial<GameState>): Promise<GameState> {
    const [gameState] = await this.db
      .update(gameStates)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(gameStates.id, gameId))
      .returning();
    
    return gameState;
  }

  // Related data fetching for complete game state
  async getGameStateWithRelated(gameId: string): Promise<{
    gameState: GameState;
    artists: Artist[];
    projects: Project[];
    roles: Role[];
    monthlyActions: MonthlyAction[];
  }> {
    const [gameState, artists, projects, roles, monthlyActions] = await Promise.all([
      this.getGameState(gameId),
      this.getArtistsByGame(gameId),
      this.getProjectsByGame(gameId),
      this.getRolesByGame(gameId),
      this.getMonthlyActions(gameId, currentMonth)
    ]);
    
    return { gameState, artists, projects, roles, monthlyActions };
  }

  // Individual Song Management (NEW: Phase 1 Enhancement)
  async getSongsByArtist(artistId: string, gameId: string): Promise<Song[]> {
    return await this.db.select().from(songs)
      .where(and(eq(songs.artistId, artistId), eq(songs.gameId, gameId)))
      .orderBy(desc(songs.createdAt));
  }

  async getReleasedSongs(gameId: string): Promise<Song[]> {
    return await this.db.select().from(songs)
      .where(and(
        eq(songs.gameId, gameId),
        eq(songs.isReleased, true)
      ))
      .orderBy(desc(songs.releaseMonth));
  }

  async updateSongs(songUpdates: { songId: string; [key: string]: any }[]): Promise<void> {
    // Batch update individual songs with new revenue/streaming metrics
    for (const update of songUpdates) {
      const { songId, ...updateData } = update;
      await this.db.update(songs)
        .set(updateData)
        .where(eq(songs.id, songId));
    }
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [newSong] = await this.db.insert(songs).values({
      id: crypto.randomUUID(),
      ...song,
      createdAt: new Date()
    }).returning();
    return newSong;
  }
}
```

### **Database Connection Management**
Efficient connection handling with Drizzle ORM:

```typescript
// server/db.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

const client = neon(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

// Connection pooling configured automatically by Neon
// Supports concurrent connections for multiple users
```

### **Error Handling Strategy**
Comprehensive error handling with proper HTTP status codes:

```typescript
// Error response helper
export function createErrorResponse(
  errorCode: string,
  message: string,
  details?: any
) {
  return {
    error: {
      code: errorCode,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
}

// Usage in route handlers
app.post('/api/advance-month', getUserId, async (req, res) => {
  try {
    const request = validateRequest(AdvanceMonthRequest, req.body);
    const result = await processAdvanceMonth(request);
    res.json(result);
    
  } catch (error) {
    console.error('Advance month error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request data',
        error.errors
      ));
    }
    
    if (error.message.includes('Game not found')) {
      return res.status(404).json(createErrorResponse(
        'GAME_NOT_FOUND',
        'Game session not found'
      ));
    }
    
    res.status(500).json(createErrorResponse(
      'ADVANCE_MONTH_ERROR',
      'Failed to advance month'
    ));
  }
});
```

---

## 🔐 Security Implementation

### **Authentication System**
```typescript
// server/auth.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

// Configure Passport Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'username' },
  async (username: string, password: string, done) => {
    try {
      const user = await findUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Session serialization
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});
```

### **Data Protection**
```typescript
// SQL injection protection through Drizzle ORM
await db
  .select()
  .from(gameStates)
  .where(eq(gameStates.id, gameId)); // Parameterized query

// Input sanitization through Zod schemas
const sanitizedData = GameStateSchema.parse(userInput);

// Access control
if (gameState.userId !== req.userId) {
  return res.status(403).json({ message: 'Access denied' });
}
```

### **Environment Configuration**
```typescript
// Environment variables for security
const config = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000')
};

// HTTPS enforcement in production
if (config.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

## 📊 Performance Optimizations

### **Database Query Optimization**
```typescript
// Batch related data fetching
async getGameStateWithRelated(gameId: string) {
  // Use Promise.all for parallel queries
  const [gameState, artists, projects] = await Promise.all([
    this.getGameState(gameId),
    this.getArtistsByGame(gameId),
    this.getProjectsByGame(gameId)
  ]);
  
  return { gameState, artists, projects };
}

// Indexed queries for performance
// Database indexes created on:
// - game_states.user_id
// - artists.game_id
// - projects.game_id
// - monthly_actions.game_id
```

### **Caching Strategy**
```typescript
// Content caching (game data files)
class ServerGameData {
  private static instance: ServerGameData;
  private balanceConfig: any = null;
  
  // Singleton pattern for content caching
  static getInstance(): ServerGameData {
    if (!ServerGameData.instance) {
      ServerGameData.instance = new ServerGameData();
    }
    return ServerGameData.instance;
  }
  
  // Lazy loading with memory cache
  async getBalanceConfig(): Promise<any> {
    if (!this.balanceConfig) {
      this.balanceConfig = await this.loadJSON('balance.json');
    }
    return this.balanceConfig;
  }
}
```

### **Request/Response Optimization**
```typescript
// Response compression
import compression from 'compression';
app.use(compression());

// Request size limits
app.use(express.json({ limit: '1mb' }));

// Response caching headers for static content
app.use('/api/data', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  next();
});
```

---

## 🧪 Testing Strategy

### **Unit Testing**
```typescript
// Example: GameEngine test
describe('GameEngine', () => {
  let gameEngine: GameEngine;
  let mockGameData: ServerGameData;
  
  beforeEach(() => {
    const gameState = createTestGameState();
    mockGameData = createMockGameData();
    gameEngine = new GameEngine(gameState, mockGameData, 'test-seed');
  });
  
  it('should calculate monthly burn correctly', async () => {
    const actions = [{ actionType: 'role_meeting', targetId: 'manager' }];
    const result = await gameEngine.advanceMonth(actions);
    
    expect(result.summary.expenses).toBeGreaterThan(3000);
    expect(result.summary.expenses).toBeLessThan(6000);
  });
  
  it('should complete campaign at month 12', async () => {
    gameEngine.gameState.currentMonth = 11;
    const result = await gameEngine.advanceMonth([]);
    
    expect(result.campaignResults).toBeDefined();
    expect(result.campaignResults.campaignCompleted).toBe(true);
  });
});
```

### **Integration Testing**
```typescript
// Example: API endpoint test
describe('POST /api/advance-month', () => {
  it('should advance month and return updated game state', async () => {
    const response = await request(app)
      .post('/api/advance-month')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        gameId: testGameId,
        selectedActions: [
          { actionType: 'role_meeting', targetId: 'manager', metadata: {} }
        ]
      });
    
    expect(response.status).toBe(200);
    expect(response.body.gameState.currentMonth).toBe(2);
    expect(response.body.summary).toBeDefined();
  });
});
```

---

## 🚀 Deployment Considerations

### **Production Configuration**
```typescript
// Production environment setup
const productionConfig = {
  // Database connection pooling
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_POOL_SIZE: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
  
  // Session configuration
  SESSION_SECRET: process.env.SESSION_SECRET, // Required in production
  SESSION_STORE: 'redis', // For multi-instance deployment
  
  // Security headers
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  RATE_LIMIT_REQUESTS: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
  
  // Monitoring
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_METRICS: process.env.ENABLE_METRICS === 'true'
};
```

### **Scaling Considerations**
- **Horizontal scaling**: Stateless server design allows multiple instances
- **Database scaling**: Read replicas for analytics, connection pooling
- **Content delivery**: CDN for static JSON files
- **Session storage**: Redis for distributed session management
- **Load balancing**: Nginx or cloud load balancer for traffic distribution

---

This backend architecture provides a robust, scalable foundation that handles the current MVP requirements and is designed to grow with the application's needs.