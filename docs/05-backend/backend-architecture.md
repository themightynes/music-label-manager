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

## 🔧 Server Implementation

### **1. Express.js Route Structure**
RESTful API implementation with middleware integration:

```typescript
// Core game operations
GET    /api/game/:id              // Get complete game state
POST   /api/game                  // Create new game session
PATCH  /api/game/:id              // Update specific fields
POST   /api/advance-month         // Process monthly turn

// Entity management
POST   /api/game/:gameId/artists  // Sign new artist
POST   /api/game/:gameId/projects // Create new project
POST   /api/game/:gameId/actions  // Record player action

// Save system
GET    /api/saves                 // List user's saves
POST   /api/saves                 // Create new save

// Authentication
POST   /api/auth/register         // User registration
POST   /api/auth/login            // User login
POST   /api/auth/logout           // Session termination
GET    /api/auth/me               // Current user
```

### **2. Request Validation with Zod**
Runtime validation for all API endpoints:

```typescript
// Route handler with validation
app.post('/api/game/:gameId/artists', getUserId, async (req, res) => {
  try {
    const validatedData = insertArtistSchema.parse({
      ...req.body,
      gameId: req.params.gameId
    });
    
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

### **3. Content Loading System**
JSON-based game data with caching:

```typescript
// server/data/gameData.ts
export class ServerGameData {
  private static instance: ServerGameData;
  private balanceConfig: any = null;
  
  // Singleton pattern for content caching
  static getInstance(): ServerGameData {
    if (!ServerGameData.instance) {
      ServerGameData.instance = new ServerGameData();
    }
    return ServerGameData.instance;
  }
  
  async loadJSON(filename: string): Promise<any> {
    const filePath = path.join(process.cwd(), 'data', filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  }
  
  async getRoleById(roleId: string): Promise<Role | null> {
    if (!this.rolesData) await this.initialize();
    return this.rolesData.roles.find((role: any) => role.id === roleId);
  }
}
```

---

## 🔐 Authentication Implementation

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

## 🔧 Development Tools

### **Environment Configuration**
```typescript
// Environment variables for development
const config = {
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000')
};
```

### **Database Connection**
```typescript
// server/db.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

const client = neon(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

This backend implementation provides the server infrastructure for the Music Label Manager game with focus on practical development and deployment needs.