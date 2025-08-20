# API Design Documentation

**Music Label Manager - REST API Specification**  
*Version: 1.0 (MVP Complete)*

---

## 🌐 API Overview

The Music Label Manager API is a **RESTful HTTP API** built with Express.js, featuring type-safe contracts, comprehensive validation, and transaction-safe operations.

**Base URL**: `http://localhost:5000/api` (development)  
**Authentication**: Session-based with Passport.js  
**Content Type**: `application/json`  
**Response Format**: Consistent JSON with error handling

---

## 🔐 Authentication Endpoints

### **User Registration**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string (3-50 chars)",
  "password": "string (8+ chars)"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

**Error Response (400 Bad Request)**:
```json
{
  "message": "Invalid input",
  "errors": [
    {
      "path": ["password"],
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### **User Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

### **User Logout**
```http
POST /api/auth/logout
```

**Response (200 OK)**:
```json
{
  "success": true
}
```

### **Current User**
```http
GET /api/auth/me
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

---

## 🎮 Core Game Endpoints

### **Get Game State**
```http
GET /api/game/:gameId
Authorization: Required (session)
```

**Response (200 OK)**:
```json
{
  "gameState": {
    "id": "uuid",
    "userId": "uuid",
    "currentMonth": 5,
    "money": 45000,
    "reputation": 35,
    "creativeCapital": 25,
    "focusSlots": 3,
    "usedFocusSlots": 0,
    "playlistAccess": "niche",
    "pressAccess": "blogs",
    "venueAccess": "none",
    "campaignType": "standard",
    "campaignCompleted": false,
    "flags": {},
    "monthlyStats": {},
    "createdAt": "2025-08-18T10:00:00Z",
    "updatedAt": "2025-08-18T10:30:00Z"
  },
  "artists": [
    {
      "id": "uuid",
      "gameId": "uuid",
      "name": "Nova Sterling",
      "archetype": "Visionary",
      "genre": "Experimental Pop",
      "talent": 85,
      "loyalty": 50,
      "mood": 60,
      "popularity": 20,
      "signingCost": 8000,
      "monthlyCost": 1200,
      "signedMonth": 2,
      "isSigned": true,
      "traits": ["perfectionist", "social_media_savvy"]
    }
  ],
  "projects": [
    {
      "id": "uuid",
      "gameId": "uuid",
      "artistId": "uuid",
      "title": "Midnight Dreams",
      "type": "single",
      "genre": "Experimental Pop",
      "stage": "marketing",
      "quality": 85,
      "budget": 7500,
      "budgetUsed": 5625,
      "startMonth": 3,
      "dueMonth": 5,
      "streams": 0,
      "revenue": 0,
      "pressPickups": 0,
      "metadata": {}
    }
  ],
  "roles": [
    {
      "id": "uuid",
      "gameId": "uuid",
      "name": "Sarah Mitchell",
      "title": "Manager",
      "type": "Manager",
      "relationship": 50
    }
  ],
  "monthlyActions": [
    {
      "id": "uuid",
      "gameId": "uuid",
      "month": 4,
      "actionType": "role_meeting",
      "targetId": "manager",
      "results": {
        "choiceId": "supportive_approach",
        "immediate_effects": { "money": 1000, "reputation": 2 }
      },
      "createdAt": "2025-08-18T09:00:00Z"
    }
  ]
}
```

### **Create New Game**
```http
POST /api/game
Authorization: Required (session)
Content-Type: application/json

{
  "campaignType": "standard",
  "currentMonth": 1,
  "money": 75000,
  "reputation": 5,
  "creativeCapital": 10,
  "focusSlots": 3,
  "usedFocusSlots": 0,
  "playlistAccess": "none",
  "pressAccess": "none",
  "venueAccess": "none",
  "rngSeed": "random-string",
  "flags": {},
  "monthlyStats": {},
  "campaignCompleted": false
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "currentMonth": 1,
  "money": 75000,
  "reputation": 5,
  "creativeCapital": 10,
  "focusSlots": 3,
  "usedFocusSlots": 0,
  "playlistAccess": "none",
  "pressAccess": "none", 
  "venueAccess": "none",
  "campaignType": "standard",
  "rngSeed": "generated-seed",
  "flags": {},
  "monthlyStats": {},
  "campaignCompleted": false,
  "createdAt": "2025-08-18T10:00:00Z",
  "updatedAt": "2025-08-18T10:00:00Z"
}
```

### **Update Game State**
```http
PATCH /api/game/:gameId
Authorization: Required (session)
Content-Type: application/json

{
  "money": 50000,
  "reputation": 40,
  "flags": {
    "signed_artists_count": 2,
    "second_artist_unlocked": true
  }
}
```

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "money": 50000,
  "reputation": 40,
  "flags": {
    "signed_artists_count": 2,
    "second_artist_unlocked": true
  },
  "updatedAt": "2025-08-18T10:30:00Z"
}
```

---

## ⏰ Month Advancement

### **Advance Month (Primary Game Loop)** ✅ SINGLE SOURCE OF TRUTH
```http
POST /api/advance-month
Authorization: Required (session)
Content-Type: application/json

{
  "gameId": "uuid",
  "selectedActions": [
    {
      "actionType": "role_meeting",
      "targetId": "manager",
      "metadata": {}
    },
    {
      "actionType": "role_meeting", 
      "targetId": "anr",
      "metadata": {}
    },
    {
      "actionType": "start_project",
      "targetId": "artist-uuid",
      "metadata": {
        "projectType": "single",
        "title": "New Song"
      }
    }
  ]
}

// ARCHITECTURE: Routes.ts handles HTTP validation/transactions, GameEngine processes ALL business logic
// - Project advancement logic: IN GameEngine
// - Economic calculations: IN GameEngine  
// - Revenue processing: IN GameEngine
// - No duplicate logic between layers
```

**Response (200 OK)**: ✅ ALL CALCULATIONS FROM GameEngine
```json
{
  "gameState": {
    "id": "uuid",
    "currentMonth": 6,
    "money": 42000,
    "reputation": 38,
    "creativeCapital": 27,
    "usedFocusSlots": 0,
    "flags": {},
    "monthlyStats": {},
    "updatedAt": "2025-08-18T10:35:00Z"
  },
  "summary": {
    "month": 6,
    "changes": [
      {
        "type": "meeting",
        "description": "Met with Sarah Mitchell",
        "roleId": "manager"
      },
      {
        "type": "expense", 
        "description": "Monthly operational costs",
        "amount": -4200
      },
      {
        "type": "project_advance",
        "description": "Advanced project stages", 
        "note": "GameEngine handled ALL advancement logic"
      },
      {
        "type": "streaming_revenue",
        "description": "Individual song revenue decay",
        "amount": 1250,
        "note": "GameEngine calculated ALL economic formulas"
      }
    ],
    "revenue": 1250,
    "expenses": 11700,
    "reputationChanges": {
      "global": 3
    },
    "events": []
  },
  "campaignResults": null
}

// NOTE: ALL business logic calculations performed by GameEngine
// Routes.ts only manages HTTP request/response and database transactions
```

**Campaign Completion Response (Month 12)**:
```json
{
  "gameState": {
    "currentMonth": 12,
    "campaignCompleted": true
  },
  "summary": {
    "month": 12,
    "changes": [
      {
        "type": "unlock",
        "description": "🎉 Campaign Completed! Final Score: 145",
        "amount": 145
      }
    ]
  },
  "campaignResults": {
    "campaignCompleted": true,
    "finalScore": 145,
    "scoreBreakdown": {
      "money": 65,
      "reputation": 40,
      "artistsSuccessful": 2,
      "projectsCompleted": 3,
      "accessTierBonus": 35
    },
    "victoryType": "Balanced Growth",
    "summary": "Your label achieved remarkable balanced growth! With $65k and 200 reputation, you've built a sustainable business that excels in both artistic integrity and commercial success.",
    "achievements": [
      "💰 Profitable - Ended with $50k+",
      "⭐ Industry Legend - 200+ Reputation",
      "🎵 Media Mogul - Maximum playlist and press access"
    ]
  }
}
```

---

## 🎤 Artist Management

### **Sign New Artist**
```http
POST /api/game/:gameId/artists
Authorization: Required (session)
Content-Type: application/json

{
  "name": "Nova Sterling",
  "archetype": "Visionary",
  "genre": "Experimental Pop",
  "talent": 85,
  "loyalty": 50,
  "mood": 50,
  "popularity": 0,
  "signingCost": 8000,
  "monthlyCost": 1200,
  "signedMonth": 5,
  "isSigned": true,
  "traits": ["perfectionist", "social_media_savvy"]
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "gameId": "uuid",
  "name": "Nova Sterling",
  "archetype": "Visionary",
  "genre": "Experimental Pop",
  "talent": 85,
  "loyalty": 50,
  "mood": 50,
  "popularity": 0,
  "signingCost": 8000,
  "monthlyCost": 1200,
  "signedMonth": 5,
  "isSigned": true,
  "traits": ["perfectionist", "social_media_savvy"],
  "createdAt": "2025-08-18T10:00:00Z",
  "updatedAt": "2025-08-18T10:00:00Z"
}
```

**Error Response (400 Bad Request)**:
```json
{
  "message": "Insufficient funds to sign artist"
}
```

### **Update Artist**
```http
PATCH /api/artists/:artistId
Authorization: Required (session)
Content-Type: application/json

{
  "mood": 75,
  "loyalty": 60,
  "popularity": 25
}
```

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "mood": 75,
  "loyalty": 60,
  "popularity": 25,
  "updatedAt": "2025-08-18T10:30:00Z"
}
```

---

## 🎵 Project Management

### **Create New Project with Economic Decisions** ✅ ENHANCED
```http
POST /api/game/:gameId/projects
Authorization: Required (session)
Content-Type: application/json

{
  "title": "Midnight Dreams",
  "type": "EP",
  "artistId": "uuid",
  "songCount": 3,
  
  // Economic Decision Parameters ✅ NEW
  "budgetPerSong": 5000,              // Budget allocation per song
  "producerTier": "regional",         // local|regional|national|legendary
  "timeInvestment": "extended",       // rushed|standard|extended|perfectionist
  "totalCost": 21000,                 // Calculated total project cost
  
  // Optional Legacy Parameters
  "stage": "planning",
  "metadata": {
    "expectedQuality": 72,            // UI quality preview estimate
    "costBreakdown": {
      "baseCost": 15000,
      "producerMultiplier": 1.8,
      "timeMultiplier": 1.4
    }
  }
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "gameId": "uuid",
  "artistId": "uuid",
  "title": "Midnight Dreams",
  "type": "EP",
  "stage": "planning",
  "quality": 0,
  
  // Economic Decision Fields ✅ NEW
  "budgetPerSong": 5000,
  "producerTier": "regional",
  "timeInvestment": "extended",
  "totalCost": 21000,
  "costUsed": 0,
  "songCount": 3,
  "songsCreated": 0,
  
  // Legacy Fields
  "startMonth": null,
  "dueMonth": null,
  "completedMonth": null,
  "streams": 0,
  "revenue": 0,
  "pressPickups": 0,
  "metadata": null,
  "createdAt": "2025-01-19T10:00:00Z",
  "updatedAt": "2025-01-19T10:00:00Z"
}
```

**Validation Rules for Economic Parameters**:
- `budgetPerSong`: Integer, minimum 1000, maximum 50000
- `producerTier`: Must be one of: `"local"`, `"regional"`, `"national"`, `"legendary"`
- `timeInvestment`: Must be one of: `"rushed"`, `"standard"`, `"extended"`, `"perfectionist"`
- `songCount`: Integer, minimum 1, maximum 5 (varies by project type)
- `totalCost`: Calculated automatically from economic decisions

**Economic Impact**:
- Budget affects song quality through efficiency breakpoints
- Producer tier adds quality bonus (+0 to +20) and cost multiplier (1.0x to 5.5x)
- Time investment affects quality (-10 to +15) and cost multiplier (0.7x to 2.1x)

### **Update Project**
```http
PATCH /api/projects/:projectId
Authorization: Required (session)
Content-Type: application/json

{
  "stage": "production",
  "quality": 70,
  "budgetUsed": 3750
}
```

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "stage": "production",
  "quality": 70,
  "budgetUsed": 3750,
  "updatedAt": "2025-08-18T10:30:00Z"
}
```

---

## 📝 Action History

### **Record Player Action**
```http
POST /api/game/:gameId/actions
Authorization: Required (session)
Content-Type: application/json

{
  "month": 5,
  "actionType": "dialogue",
  "results": {
    "roleType": "manager",
    "choiceId": "supportive_approach",
    "immediate_effects": { "money": 1000, "reputation": 2 },
    "delayed_effects": { "trigger_month": 7, "money": 3000 }
  }
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "gameId": "uuid",
  "month": 5,
  "actionType": "dialogue",
  "targetId": null,
  "choiceId": null,
  "results": {
    "roleType": "manager",
    "choiceId": "supportive_approach",
    "immediate_effects": { "money": 1000, "reputation": 2 },
    "delayed_effects": { "trigger_month": 7, "money": 3000 }
  },
  "createdAt": "2025-08-18T10:00:00Z"
}
```

---

## 🗨️ Dialogue System

### **Get Role Data**
```http
GET /api/roles/:roleId
```

**Example**: `GET /api/roles/manager`

**Response (200 OK)**:
```json
{
  "id": "manager",
  "name": "Sarah Mitchell",
  "title": "Music Label Manager",
  "type": "Manager",
  "relationship": 50,
  "description": "Your experienced manager who helps with strategic decisions and industry connections.",
  "meetings": [
    {
      "id": "monthly_check_in",
      "context": "Monthly strategy discussion",
      "prompt": "How should we approach our strategic priorities this month?",
      "choices": [
        {
          "id": "aggressive_growth",
          "text": "Focus on aggressive growth and expansion",
          "effects_immediate": { "money": -1000, "reputation": 3 },
          "effects_delayed": { "trigger_month": 8, "money": 5000 }
        },
        {
          "id": "steady_building",
          "text": "Take a steady, sustainable approach",
          "effects_immediate": { "reputation": 1, "creative_capital": 2 },
          "effects_delayed": { "trigger_month": 7, "reputation": 2 }
        }
      ]
    }
  ]
}
```

### **Get Specific Meeting**
```http
GET /api/roles/:roleId/meetings/:meetingId
```

**Example**: `GET /api/roles/manager/meetings/monthly_check_in`

**Response (200 OK)**:
```json
{
  "id": "monthly_check_in",
  "context": "Monthly strategy discussion",
  "prompt": "How should we approach our strategic priorities this month?",
  "choices": [
    {
      "id": "aggressive_growth",
      "text": "Focus on aggressive growth and expansion",
      "effects_immediate": { "money": -1000, "reputation": 3 },
      "effects_delayed": { "trigger_month": 8, "money": 5000 }
    }
  ]
}
```

### **Get Artist Dialogue**
```http
GET /api/artists/:archetype/dialogue
```

**Example**: `GET /api/artists/Visionary/dialogue`

**Response (200 OK)**:
```json
{
  "archetype": "Visionary",
  "conversations": [
    {
      "id": "creative_feedback",
      "context": "Discussing creative direction",
      "prompt": "I've been thinking about our artistic direction...",
      "choices": [
        {
          "id": "encourage_experimentation",
          "text": "I love your experimental approach. Keep pushing boundaries!",
          "effects_immediate": { "creative_capital": 3 },
          "artist_effects": { "mood": 5, "loyalty": 2 }
        }
      ]
    }
  ]
}
```

---

## 💾 Save System

### **Get User Saves**
```http
GET /api/saves
Authorization: Required (session)
```

**Response (200 OK)**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Campaign - Month 8 Success",
    "month": 8,
    "isAutosave": false,
    "gameState": {
      "gameState": { /* complete game state */ },
      "artists": [ /* artist array */ ],
      "projects": [ /* project array */ ],
      "roles": [ /* role array */ ]
    },
    "createdAt": "2025-08-18T09:00:00Z",
    "updatedAt": "2025-08-18T09:00:00Z"
  }
]
```

### **Create Save**
```http
POST /api/saves
Authorization: Required (session)
Content-Type: application/json

{
  "name": "Campaign - Month 8 Success",
  "gameState": {
    "gameState": { /* complete game state */ },
    "artists": [ /* artist array */ ],
    "projects": [ /* project array */ ],
    "roles": [ /* role array */ ]
  },
  "month": 8,
  "isAutosave": false
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Campaign - Month 8 Success",
  "month": 8,
  "isAutosave": false,
  "gameState": { /* saved game data */ },
  "createdAt": "2025-08-18T10:00:00Z",
  "updatedAt": "2025-08-18T10:00:00Z"
}
```

---

## 🔍 Development Endpoints

### **Test Data Loading**
```http
GET /api/test-data
```

**Response (200 OK)**:
```json
{
  "counts": {
    "roles": 8,
    "artists": 6,
    "events": 12
  },
  "sample": {
    "role": {
      "name": "Sarah Mitchell",
      "relationship": 50
    }
  },
  "status": "Data loaded successfully"
}
```

### **Validate Data Types**
```http
GET /api/validate-types
```

**Response (200 OK)**:
```json
{
  "validation": {
    "role": {
      "found": true,
      "data": { /* role object */ },
      "hasValidStructure": true
    },
    "artist": {
      "found": true,
      "data": { /* artist object */ },
      "hasValidStructure": true
    }
  },
  "integrity": {
    "roles_valid": true,
    "artists_valid": true,
    "balance_valid": true
  },
  "status": "Type validation complete"
}
```

---

## ❌ Error Handling

### **Standard Error Response Format**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional error context */ },
    "timestamp": "2025-08-18T10:00:00Z"
  }
}
```

### **Common Error Codes**

#### **Authentication Errors (401)**
```json
{
  "message": "Authentication required"
}
```

#### **Authorization Errors (403)**
```json
{
  "message": "Access denied"
}
```

#### **Validation Errors (400)**
```json
{
  "message": "Invalid request data",
  "errors": [
    {
      "path": ["selectedActions", 0, "actionType"],
      "message": "Expected role_meeting, received invalid_action"
    }
  ]
}
```

#### **Not Found Errors (404)**
```json
{
  "error": {
    "code": "GAME_NOT_FOUND",
    "message": "Game session not found"
  }
}
```

#### **Server Errors (500)**
```json
{
  "error": {
    "code": "ADVANCE_MONTH_ERROR",
    "message": "Failed to advance month"
  }
}
```

---

## 🎵 Song Management Endpoints

### **Get All Songs for Game**
```http
GET /api/game/:gameId/songs
Authorization: Required (session)
```

**Response (200 OK)**:
```json
[
  {
    "id": "uuid",
    "title": "Midnight Dreams",
    "artistId": "uuid",
    "gameId": "uuid",
    "quality": 67,
    "genre": "pop",
    "mood": "melancholic",
    "createdMonth": 3,
    "producerTier": "local",
    "timeInvestment": "standard",
    "isRecorded": true,
    "isReleased": true,
    "releaseId": "uuid",
    
    // Individual Revenue & Streaming Metrics
    "initialStreams": 3350,
    "totalStreams": 3350,
    "totalRevenue": 1675,
    "monthlyStreams": 3350,
    "lastMonthRevenue": 1675,
    "releaseMonth": 5,
    
    "metadata": {
      "projectId": "uuid",
      "artistMood": 60,
      "releasedAt": "2025-08-18T10:00:00Z"
    },
    "createdAt": "2025-08-18T09:30:00Z"
  }
]
```

### **Get Songs for Specific Artist**
```http
GET /api/game/:gameId/artists/:artistId/songs
Authorization: Required (session)
```

**Response (200 OK)**:
```json
[
  {
    "id": "uuid",
    "title": "City Lights", 
    "artistId": "uuid",
    "gameId": "uuid",
    "quality": 58,
    "genre": "pop",
    "mood": "upbeat",
    "createdMonth": 4,
    "isRecorded": true,
    "isReleased": true,
    "initialStreams": 2900,
    "totalStreams": 2900,
    "totalRevenue": 1450,
    "monthlyStreams": 2900,
    "lastMonthRevenue": 1450,
    "releaseMonth": 5,
    "metadata": {
      "projectId": "uuid"
    },
    "createdAt": "2025-08-18T09:45:00Z"
  }
]
```

### **Get Released Songs for Revenue Processing**
```http
GET /api/game/:gameId/songs/released
Authorization: Required (session)
```

**Response (200 OK)**:
```json
[
  {
    "id": "uuid",
    "title": "Hearts on Fire",
    "artistId": "uuid", 
    "quality": 64,
    "initialStreams": 3200,
    "totalStreams": 3200,
    "totalRevenue": 1600,
    "monthlyStreams": 3200,
    "lastMonthRevenue": 1600,
    "releaseMonth": 5,
    "metadata": {
      "projectId": "uuid"
    }
  }
]
```

**Key Features**:
- **Individual song tracking**: Each song has separate revenue and streaming metrics
- **Quality-based performance**: Initial streams calculated from individual song quality
- **Monthly decay processing**: Individual songs processed for ongoing revenue
- **Project aggregation**: Recording sessions show sum of individual song metrics
- **Real-time updates**: Song metrics updated monthly during advance-month processing

---

## 🔒 Security Considerations

### **Input Validation**
- All inputs validated with Zod schemas
- SQL injection prevention through parameterized queries
- File upload restrictions (future feature)
- Request size limits (1MB JSON)

### **Authentication & Authorization**
- Session-based authentication with Passport.js
- CSRF protection with session tokens
- User ownership validation for all game resources
- Rate limiting on authentication endpoints

### **Data Protection**
- Password hashing with bcrypt
- Session secrets in environment variables
- HTTPS enforcement in production
- Database connection encryption

### **Architecture Security**
- **Single Source of Truth**: GameEngine prevents logic duplication vulnerabilities
- **Clear Separation**: Routes.ts handles only HTTP concerns, reducing attack surface
- **Transaction Safety**: Database operations are atomic and consistent
- **Validation Layers**: Input validation in routes, business logic validation in GameEngine

---

This comprehensive API documentation provides everything needed to integrate with and extend the Music Label Manager backend system.