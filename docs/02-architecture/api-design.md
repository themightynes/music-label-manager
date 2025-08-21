# API Design Documentation

**Music Label Manager - REST API Specification**  
*System Design Document*

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
      "signed": true,
      "signingMonth": 2
    }
  ],
  "projects": [
    {
      "id": "uuid",
      "gameId": "uuid",
      "title": "Midnight Sessions",
      "type": "Single",
      "artistId": "uuid",
      "stage": "production",
      "quality": 75,
      "budgetPerSong": 5000,
      "totalCost": 5000,
      "costUsed": 3000,
      "songCount": 1,
      "songsCreated": 0,
      "producerTier": "regional",
      "timeInvestment": "standard",
      "dueMonth": 6,
      "startMonth": 4,
      "metadata": {}
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
  "campaignType": "standard"
}
```

**Response (201 Created)**:
```json
{
  "gameState": {
    "id": "uuid",
    "userId": "uuid",
    "currentMonth": 1,
    "money": 500000,
    "reputation": 10,
    "creativeCapital": 15,
    "focusSlots": 2,
    "usedFocusSlots": 0,
    "playlistAccess": "none",
    "pressAccess": "none",
    "venueAccess": "none",
    "campaignType": "standard",
    "campaignCompleted": false,
    "flags": {},
    "monthlyStats": {}
  }
}
```

### **Update Game State**
```http
PUT /api/game/:gameId
Authorization: Required (session)
Content-Type: application/json

{
  "money": 45000,
  "reputation": 35,
  "creativeCapital": 25,
  "flags": { "tutorial_completed": true }
}
```

---

## ⏰ Month Advancement

### **Advance Month**
```http
POST /api/game/:gameId/advance
Authorization: Required (session)
```

**Response (200 OK)**:
```json
{
  "gameState": {
    "currentMonth": 6,
    "money": 47500,
    "reputation": 38,
    "creativeCapital": 27,
    "focusSlots": 3,
    "usedFocusSlots": 0,
    "campaignCompleted": false
  },
  "monthSummary": {
    "revenue": 12500,
    "expenses": 10000,
    "reputationChange": 3,
    "streamsGenerated": 25000,
    "pressMentions": 2,
    "accessUpgrades": ["playlist_niche"],
    "projectsAdvanced": [
      {
        "projectId": "uuid",
        "title": "Midnight Sessions",
        "previousStage": "production",
        "newStage": "marketing"
      }
    ],
    "songsReleased": [
      {
        "songId": "uuid",
        "title": "Digital Dreams",
        "artistName": "Nova Sterling",
        "quality": 78,
        "initialStreams": 15000
      }
    ]
  },
  "campaignComplete": false
}
```

**Campaign Completion Response**:
```json
{
  "gameState": {
    "currentMonth": 12,
    "campaignCompleted": true
  },
  "campaignSummary": {
    "finalScore": 145,
    "scoreBreakdown": {
      "money": 89,
      "reputation": 32,
      "accessTierBonus": 24
    },
    "achievements": [
      "First Hit Single",
      "Reputation Builder"
    ],
    "artistStats": [
      {
        "name": "Nova Sterling",
        "projectsCompleted": 3,
        "totalRevenue": 125000,
        "finalLoyalty": 85
      }
    ]
  }
}
```

---

## 🎤 Artist Management

### **Sign New Artist**
```http
POST /api/game/:gameId/artists/:artistId/sign
Authorization: Required (session)
```

**Response (200 OK)**:
```json
{
  "artist": {
    "id": "uuid",
    "gameId": "uuid",
    "name": "Nova Sterling",
    "signed": true,
    "signingMonth": 5,
    "signingCost": 8000
  },
  "gameState": {
    "money": 37000,
    "usedFocusSlots": 1
  }
}
```

### **Update Artist**
```http
PUT /api/game/:gameId/artists/:artistId
Authorization: Required (session)
Content-Type: application/json

{
  "loyalty": 75,
  "mood": 80,
  "popularity": 45
}
```

---

## 🎵 Project Management

### **Create New Project**
```http
POST /api/game/:gameId/projects
Authorization: Required (session)
Content-Type: application/json

{
  "title": "Summer Vibes EP",
  "type": "EP",
  "artistId": "uuid",
  "songCount": 4,
  "budgetPerSong": 7500,
  "producerTier": "regional",
  "timeInvestment": "extended"
}
```

**Response (201 Created)**:
```json
{
  "project": {
    "id": "uuid",
    "gameId": "uuid",
    "title": "Summer Vibes EP",
    "type": "EP",
    "artistId": "uuid",
    "stage": "planning",
    "quality": 0,
    "budgetPerSong": 7500,
    "totalCost": 30000,
    "costUsed": 0,
    "songCount": 4,
    "songsCreated": 0,
    "producerTier": "regional",
    "timeInvestment": "extended",
    "dueMonth": 8,
    "startMonth": 5
  },
  "gameState": {
    "money": 170000,
    "usedFocusSlots": 2
  }
}
```

### **Update Project**
```http
PUT /api/game/:gameId/projects/:projectId
Authorization: Required (session)
Content-Type: application/json

{
  "stage": "production",
  "quality": 65,
  "costUsed": 15000
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
  "type": "role_dialogue",
  "choiceId": "manager_networking_event_attend",
  "roleType": "manager",
  "month": 5
}
```

**Response (201 Created)**:
```json
{
  "action": {
    "id": "uuid",
    "gameId": "uuid",
    "type": "role_dialogue",
    "choiceId": "manager_networking_event_attend",
    "month": 5,
    "timestamp": "2025-08-18T10:30:00Z"
  },
  "effects": {
    "immediate": {
      "reputation": 3,
      "creativeCapital": -2
    },
    "delayed": {
      "money": 5000
    }
  }
}
```

---

## 💾 Save System

### **Save Game**
```http
POST /api/game/:gameId/save
Authorization: Required (session)
Content-Type: application/json

{
  "name": "Mid-Campaign Save",
  "isAutosave": false
}
```

### **Load Game**
```http
POST /api/saves/:saveId/load
Authorization: Required (session)
```

### **Export Game**
```http
GET /api/game/:gameId/export
Authorization: Required (session)
```

**Response**: JSON file download with complete game state

---

## 🔄 Error Handling

### **Standard Error Response**
```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### **Common HTTP Status Codes**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## 🔧 Request/Response Standards

### **Request Headers**
```http
Content-Type: application/json
Authorization: Session-based (handled by middleware)
```

### **Response Headers**
```http
Content-Type: application/json
Cache-Control: no-cache (for game state endpoints)
```

### **Validation**
- All requests validated with Zod schemas
- Type-safe contracts between client and server
- Detailed error messages for validation failures

### **Transaction Safety**
- All game state changes wrapped in database transactions
- Atomic operations for complex multi-table updates
- Rollback on any failure in the operation chain

---

*This API design supports the complete Music Label Manager game experience with type safety, comprehensive validation, and robust error handling.*