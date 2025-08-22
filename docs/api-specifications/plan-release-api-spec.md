# Plan Release Feature - API Specifications

**✅ COMPLETED - Phase 2: Strategic Release Planning - Backend API Requirements**
*Enhanced with Economic Balance & Risk Mitigation Features*

> **Implementation Status**: All endpoints successfully implemented and tested
> **Last Updated**: August 22, 2025

---

## Overview

✅ **IMPLEMENTATION COMPLETE** - All API endpoints have been successfully implemented and tested.

This document specifies all API endpoints that were implemented for the enhanced Plan Release functionality, including:
- ✅ **Channel diversity bonus system** (prevents single-channel optimization)
- ✅ **Seasonal cost trade-offs** (Q4 premium pricing with 40% cost increase)
- ✅ **Enhanced lead single effectiveness** (50% contribution with diminishing returns)
- ✅ **Improved marketing diminishing returns** (gentler curve for high-budget campaigns)
- ✅ **Song scheduling conflict resolution system**
- ✅ **Sophisticated performance preview calculations**
- ✅ **Transaction-based release creation with budget management**

---

## 1. Get Artists with Ready Songs

**Purpose**: Fetch all artists who have recorded songs ready for release

```
Endpoint: GET /api/game/{gameId}/artists/ready-for-release
Method: GET
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {sessionToken}' // if using token auth
  'X-Game-Session': '{gameSessionId}' // alternative session approach
}

Query Parameters:
- gameId: string (UUID) - The current game ID
- minSongs?: number (optional) - Minimum ready songs to include artist

Request Body: None

Expected Response (Success - 200):
{
  success: true;
  artists: Array<{
    id: string;
    name: string;
    genre: string;
    mood: number; // 0-100
    loyalty: number; // 0-100
    readySongsCount: number;
    totalSongsCount: number;
    lastProjectMonth?: number;
    archetype?: string;
  }>;
  metadata: {
    totalArtists: number;
    totalReadySongs: number;
    recommendedArtists: string[]; // Artist IDs sorted by readiness
  }
}

Error Responses:
404 Not Found: {
  error: 'GAME_NOT_FOUND';
  message: 'Game session not found or expired';
  gameId: string;
}

403 Forbidden: {
  error: 'UNAUTHORIZED_ACCESS';
  message: 'User does not have access to this game';
  userId: string;
  gameId: string;
}
```

---

## 2. Get Artist's Ready Songs

**Purpose**: Fetch all recorded songs for a specific artist that haven't been released

```
Endpoint: GET /api/game/{gameId}/artists/{artistId}/songs/ready
Method: GET
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {sessionToken}'
}

Path Parameters:
- gameId: string (UUID)
- artistId: string (UUID)

Query Parameters:
- includeDrafts?: boolean (default: false) - Include songs still in production
- sortBy?: 'quality' | 'createdDate' | 'estimatedRevenue' (default: 'quality')
- sortOrder?: 'asc' | 'desc' (default: 'desc')

Request Body: None

Expected Response (Success - 200):
{
  success: true;
  artist: {
    id: string;
    name: string;
    genre: string;
    mood: number;
    loyalty: number;
  };
  songs: Array<{
    id: string;
    title: string;
    quality: number; // 20-100
    genre: string;
    mood: string;
    createdMonth: number;
    isRecorded: boolean;
    isReleased: boolean;
    projectId?: string;
    producerTier: string;
    timeInvestment: string;
    estimatedMetrics: {
      streams: number;
      revenue: number;
      chartPotential: number; // 0-100
    };
    metadata: {
      recordingCost: number;
      budgetPerSong: number;
      artistMoodAtCreation: number;
    };
  }>;
  totalRevenuePotential: number;
  averageQuality: number;
}

Error Responses:
404 Not Found: {
  error: 'ARTIST_NOT_FOUND';
  message: 'Artist not found in this game';
  artistId: string;
  gameId: string;
}

400 Bad Request: {
  error: 'INVALID_PARAMETERS';
  message: 'Invalid query parameters provided';
  invalidParams: string[];
}
```

---

## 3. Get Release Type Configurations (Enhanced)

**Purpose**: Fetch release type definitions, marketing channels, and seasonal configurations with enhanced economic modeling

```
Endpoint: GET /api/game/release-types
Method: GET
Headers: {
  'Content-Type': 'application/json'
}

Request Body: None

Expected Response (Success - 200):
{
  success: true;
  releaseTypes: {
    single: {
      name: 'Single';
      minSongs: 1;
      maxSongs: 1;
      description: string;
      bonusType: string;
      bonusPercentage: number;
      marketingMultiplier: number;
      optimalGenres?: string[];
    };
    ep: {
      name: 'EP';
      minSongs: 3;
      maxSongs: 5;
      description: string;
      bonusType: string;
      bonusPercentage: number;
      marketingMultiplier: number;
      cohesionBonus: number; // Bonus for genre/mood consistency
    };
    album: {
      name: 'Album';
      minSongs: 8;
      maxSongs: 12;
      description: string;
      bonusType: string;
      bonusPercentage: number;
      marketingMultiplier: number;
      cohesionBonus: number;
      artisticBonus: number; // Bonus for high average quality
    };
  };
  
  // Enhanced seasonal modifiers with cost trade-offs
  seasonalModifiers: Array<{
    id: string;
    name: string;
    description: string;
    revenueMultiplier: number; // Performance impact
    marketingCostMultiplier: number; // Cost impact (NEW)
    competitionLevel: 'Low' | 'Medium' | 'High' | 'Maximum'; // (NEW)
    isOptimal: boolean;
    months: number[]; // Which months this applies to
    marketingAdvantages?: string[]; // Benefits of this timing (NEW)
    marketingDisadvantages?: string[]; // Drawbacks of this timing (NEW)
  }>;
  
  // Enhanced marketing channels with diversity bonus system
  marketingChannels: Array<{
    id: string;
    name: string;
    description: string;
    minBudget: number;
    maxBudget: number;
    effectiveness: number; // 0-100
    targetAudience: string;
    diversityWeight: number; // Impact on channel diversity bonus (NEW)
    synergies: string[]; // Channels that work well together (NEW)
    accessRequirement?: {
      type: 'reputation' | 'tier';
      value: number | string;
    };
  }>;
  
  // Channel diversity bonus configuration (NEW)
  diversityBonusSystem: {
    baseBonus: 0.06; // 6% per additional channel
    maxBonus: 0.24; // 24% maximum bonus
    description: 'Multi-channel campaigns receive effectiveness bonuses';
  };
  
  // Enhanced marketing effectiveness formula parameters (NEW)
  marketingFormula: {
    diminishingReturns: {
      exponent: 0.6; // Changed from 0.5 (sqrt) for gentler curve
      baseValue: 5000; // Reference budget for calculations
    };
    effectivenessCap: 2.5; // Maximum marketing multiplier (250%)
    leadSingleContribution: 0.5; // Lead single contributes 50% of its effectiveness
    leadSingleDiminishingReturns: {
      maxBudgetForFullEffect: 8000;
      maxContribution: 0.4;
    };
  };
}

Error Responses:
500 Internal Server Error: {
  error: 'CONFIGURATION_ERROR';
  message: 'Failed to load game configuration';
  details: string;
}
```

---

## 4. Calculate Release Preview (Enhanced)

**Purpose**: Get estimated performance metrics for a planned release with enhanced economic modeling

```
Endpoint: POST /api/game/{gameId}/releases/preview
Method: POST
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {sessionToken}'
}

Request Body: {
  artistId: string;
  songIds: string[];
  releaseType: 'single' | 'ep' | 'album';
  leadSingleId?: string; // For multi-song releases
  seasonalTiming: string;
  scheduledReleaseMonth: number;
  
  // Enhanced marketing budget allocation per channel
  marketingBudget: {
    radio: number;
    digital: number;
    pr: number;
    influencer: number;
  };
  
  // Lead single strategy (for EP/Album releases)
  leadSingleStrategy?: {
    leadSingleId: string;
    leadSingleReleaseMonth: number;
    leadSingleBudget: {
      radio: number;
      digital: number;
      pr: number;
      influencer: number;
    };
  };
}

Expected Response (Success - 200):
{
  success: true;
  preview: {
    releaseType: string;
    songCount: number;
    averageQuality: number;
    estimatedMetrics: {
      baseStreams: number;
      baseRevenue: number;
      finalStreams: number; // After all bonuses
      finalRevenue: number; // After all bonuses
      chartPotential: number; // 0-100
      breakEvenPoint: number; // Months to break even
    };
    bonusBreakdown: {
      releaseTypeBonus: number; // Percentage
      seasonalMultiplier: number;
      marketingMultiplier: number;
      artistMoodBonus: number;
      qualityBonus: number;
      cohesionBonus?: number; // For EPs/Albums
    };
    projectedROI: number; // Percentage
    marketingEffectiveness: number; // 0-100
    risks: Array<{
      type: 'LOW_BUDGET' | 'SEASONAL_TIMING' | 'ARTIST_MOOD' | 'QUALITY_VARIANCE';
      severity: 'low' | 'medium' | 'high';
      description: string;
      impact: number; // Estimated percentage impact
    }>;
    recommendations: Array<{
      type: 'BUDGET' | 'TIMING' | 'SONG_SELECTION' | 'MARKETING';
      suggestion: string;
      potentialImprovement: number; // Percentage
    }>;
  };
  validationWarnings: string[]; // Non-blocking warnings
}

Error Responses:
400 Bad Request: {
  error: 'INVALID_RELEASE_CONFIG';
  message: 'Invalid release configuration';
  details: Array<{
    field: string;
    issue: string;
    suggestion?: string;
  }>;
}

404 Not Found: {
  error: 'SONGS_NOT_FOUND';
  message: 'One or more songs not found or not available';
  missingSongIds: string[];
  unavailableSongIds: string[]; // Songs already in another planned release
}
```

---

## 5. Create Planned Release

**Purpose**: Create a new planned release and schedule it for future month

```
Endpoint: POST /api/game/{gameId}/releases/plan
Method: POST
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {sessionToken}'
}

Request Body: {
  artistId: string;
  title: string;
  type: 'single' | 'ep' | 'album';
  songIds: string[];
  leadSingleId?: string; // For multi-song releases
  marketingBudget: number;
  marketingChannels: string[];
  seasonalTiming: string;
  scheduledReleaseMonth: number;
  metadata: {
    estimatedStreams: number;
    estimatedRevenue: number;
    releaseBonus: number;
    seasonalMultiplier: number;
    userNotes?: string;
  }
}

Expected Response (Success - 201):
{
  success: true;
  release: {
    id: string;
    title: string;
    type: string;
    artistId: string;
    artistName: string;
    songIds: string[];
    leadSingleId?: string;
    marketingBudget: number;
    marketingChannels: string[];
    scheduledReleaseMonth: number;
    status: 'planned';
    estimatedMetrics: {
      streams: number;
      revenue: number;
      roi: number;
      chartPotential: number;
    };
    createdAt: string; // ISO datetime
    createdByMonth: number;
  };
  updatedGameState: {
    money: number; // Reduced by marketing budget
    plannedReleases: Array<{
      id: string;
      title: string;
      artistName: string;
      type: string;
      scheduledMonth: number;
      status: string;
    }>;
    artistsAffected: Array<{
      artistId: string;
      songsReserved: number;
      moodImpact?: number; // Positive for excitement about release
    }>;
  };
  achievements?: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
  }>; // If planning release unlocks any achievements
}

Error Responses:
400 Bad Request: {
  error: 'VALIDATION_ERROR';
  message: 'Release validation failed';
  details: Array<{
    field: string;
    error: string;
    currentValue?: any;
    expectedValue?: any;
  }>;
}

402 Payment Required: {
  error: 'INSUFFICIENT_FUNDS';
  message: 'Not enough money for marketing budget';
  required: number;
  available: number;
  suggestions: Array<{
    action: string;
    description: string;
    potentialSavings: number;
  }>;
}

409 Conflict: {
  error: 'SONG_ALREADY_SCHEDULED';
  message: 'Some songs are already part of a planned release';
  conflictingSongs: Array<{
    songId: string;
    songTitle: string;
    conflictingReleaseId: string;
    conflictingReleaseTitle: string;
  }>;
  resolutionOptions: Array<{
    action: 'REMOVE_FROM_EXISTING' | 'CHOOSE_DIFFERENT_SONGS';
    description: string;
  }>;
}

422 Unprocessable Entity: {
  error: 'BUSINESS_RULE_VIOLATION';
  message: 'Release violates business rules';
  violations: Array<{
    rule: string;
    description: string;
    severity: 'warning' | 'error';
    canOverride: boolean;
  }>;
}
```

---

## 6. Get Planned Releases

**Purpose**: Fetch all planned releases for the current game

```
Endpoint: GET /api/game/{gameId}/releases/planned
Method: GET
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {sessionToken}'
}

Query Parameters:
- artistId?: string (optional) - Filter by specific artist
- status?: 'planned' | 'in_progress' | 'completed' (optional)
- upcomingOnly?: boolean (default: false) - Only future releases

Request Body: None

Expected Response (Success - 200):
{
  success: true;
  plannedReleases: Array<{
    id: string;
    title: string;
    type: string;
    artist: {
      id: string;
      name: string;
      genre: string;
    };
    songs: Array<{
      id: string;
      title: string;
      quality: number;
    }>;
    leadSingleId?: string;
    marketingBudget: number;
    marketingChannels: string[];
    scheduledReleaseMonth: number;
    status: 'planned' | 'in_progress' | 'completed';
    estimatedMetrics: {
      streams: number;
      revenue: number;
      roi: number;
    };
    actualMetrics?: { // Only for completed releases
      streams: number;
      revenue: number;
      roi: number;
      chartPosition?: number;
    };
    createdAt: string;
    releasedAt?: string; // For completed releases
  }>;
  summary: {
    totalPlanned: number;
    totalInvestment: number;
    estimatedReturn: number;
    averageROI: number;
    nextReleaseMonth?: number;
  };
}

Error Responses:
404 Not Found: {
  error: 'NO_PLANNED_RELEASES';
  message: 'No planned releases found for this game';
  gameId: string;
}
```

---

## 7. Update Planned Release

**Purpose**: Modify a planned release before it's executed

```
Endpoint: PUT /api/game/{gameId}/releases/{releaseId}/plan
Method: PUT
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {sessionToken}'
}

Request Body: {
  title?: string;
  songIds?: string[]; // Can add/remove songs if not yet in production
  leadSingleId?: string;
  marketingBudget?: number;
  marketingChannels?: string[];
  scheduledReleaseMonth?: number; // Can reschedule if not too close
  userNotes?: string;
}

Expected Response (Success - 200):
{
  success: true;
  updatedRelease: {
    // Same structure as create response
  };
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    impact: string; // Description of how this affects the release
  }>;
  budgetAdjustment: number; // Positive = refund, Negative = additional cost
  updatedGameState: {
    money: number;
  };
}

Error Responses:
400 Bad Request: {
  error: 'MODIFICATION_NOT_ALLOWED';
  message: 'Release cannot be modified at this stage';
  reasons: string[];
  currentStatus: string;
  allowedModifications: string[];
}

404 Not Found: {
  error: 'RELEASE_NOT_FOUND';
  message: 'Planned release not found';
  releaseId: string;
}
```

---

## 8. Cancel Planned Release

**Purpose**: Cancel a planned release and refund marketing budget

```
Endpoint: DELETE /api/game/{gameId}/releases/{releaseId}/plan
Method: DELETE
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {sessionToken}'
}

Query Parameters:
- reason?: string (optional) - Cancellation reason for analytics

Request Body: None

Expected Response (Success - 200):
{
  success: true;
  cancelledRelease: {
    id: string;
    title: string;
    artistName: string;
    type: string;
  };
  refund: {
    marketingBudget: number;
    penalties: number; // If cancelling close to release date
    netRefund: number;
  };
  updatedGameState: {
    money: number;
  };
  songsReleased: string[]; // Song IDs now available for other releases
  artistMoodImpact: {
    artistId: string;
    moodChange: number; // Negative impact from cancelled release
    reason: string;
  };
}

Error Responses:
400 Bad Request: {
  error: 'CANCELLATION_NOT_ALLOWED';
  message: 'Release cannot be cancelled at this stage';
  currentStatus: string;
  reason: string;
}

404 Not Found: {
  error: 'RELEASE_NOT_FOUND';
  message: 'Planned release not found';
  releaseId: string;
}
```

---

## Implementation Notes for UI

### Key Integration Points in PlanReleasePage.tsx:

1. **Line 147**: Artist selection triggers `GET /api/game/{gameId}/artists/ready-for-release`
2. **Line 189**: Artist change triggers `GET /api/game/{gameId}/artists/{artistId}/songs/ready`
3. **Line 205**: Release type configuration loads from `GET /api/game/release-types`
4. **Line 298**: Real-time preview calculations call `POST /api/game/{gameId}/releases/preview`
5. **Line 355**: Final release creation calls `POST /api/game/{gameId}/releases/plan`

### Error Handling Strategy:
- All API calls should implement retry logic with exponential backoff
- Network errors should show user-friendly messages with retry options
- Validation errors should highlight specific form fields
- Business rule violations should offer alternative solutions
- Loading states should prevent multiple simultaneous submissions

### Caching Strategy:
- Release type configurations can be cached for the session
- Artist data should be refetched when returning to the page
- Preview calculations should debounce user input changes
- Successful release creation should invalidate relevant caches

---

*This API specification provides the complete backend contract for implementing Phase 2: Strategic Release Planning functionality.*