import { z } from 'zod';
import { GameState, GameProject } from '../types/gameTypes';
import { ArtistSchema } from '../schemas/artist';

// API Response schemas
const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// Game endpoints
export const gameEndpoints = {
  // Game state
  getGame: '/api/games/:gameId',
  createGame: '/api/games',
  saveGame: '/api/games/:gameId',

  // Game actions
  advanceWeek: '/api/games/:gameId/advance-week',
  selectActions: '/api/games/:gameId/actions',

  // Game resources
  getArtists: '/api/games/:gameId/artists',
  getProjects: '/api/games/:gameId/projects',
  getRoles: '/api/games/:gameId/roles',

  // Dialogues
  getDialogue: '/api/games/:gameId/dialogues/:dialogueId',
  selectChoice: '/api/games/:gameId/dialogues/:dialogueId/choices/:choiceId',
};

// Bug report endpoints
export const bugEndpoints = {
  list: '/api/bug-reports',
  updateStatus: '/api/bug-reports/:id/status',
} as const;

// Action schema for consistency
export const ActionSchema = z.object({
  actionType: z.enum(['role_meeting', 'start_project', 'marketing', 'artist_dialogue']),
  targetId: z.string().nullable(), // Can be role type, project ID, or artist ID
  metadata: z.record(z.any()).optional()
});

// HARDCODED: Expand severity taxonomy when dedicated QA workflow lands
export const bugSeverityEnum = z.enum(['low', 'medium', 'high', 'critical'] as const);
// HARDCODED: Update affected area taxonomy once module ownership stabilizes
export const bugAreaEnum = z.enum(['gameplay', 'ui', 'audio', 'performance', 'data', 'other'] as const);
// HARDCODED: Revisit frequency values after gathering telemetry
export const bugFrequencyEnum = z.enum(['once', 'intermittent', 'always'] as const);
// HARDCODED: Expand status taxonomy if workflow requires additional states (e.g., 'duplicate', 'wont_fix')
export const bugStatusEnum = z.enum(['new', 'in_review', 'completed'] as const);

export const BugReportRequestSchema = z.object({
  summary: z.string().min(6).max(200),
  severity: bugSeverityEnum,
  area: bugAreaEnum,
  frequency: bugFrequencyEnum,
  whatHappened: z.string().min(15).max(2000),
  stepsToReproduce: z.string().max(2000).optional(),
  expectedResult: z.string().max(1000).optional(),
  additionalContext: z.string().max(1500).optional(),
  contactEmail: z.string().email().optional(),
  metadata: z.object({
    gameId: z.string().optional(),
    currentWeek: z.number().int().optional(),
    userAgent: z.string().optional(),
    platform: z.string().optional(),
    language: z.string().optional(),
    timeZone: z.string().optional(),
    url: z.string().optional(),
    screen: z.object({
      width: z.number().optional(),
      height: z.number().optional()
    }).optional()
  }).partial().optional()
});

export const BugReportResponseSchema = z.object({
  success: z.boolean(),
  reportId: z.string().uuid(),
  message: z.string().optional()
});

export const BugReportRecordSchema = z.object({
  id: z.string().uuid(),
  submittedAt: z.string(),
  summary: z.string(),
  severity: bugSeverityEnum,
  area: bugAreaEnum,
  frequency: bugFrequencyEnum,
  status: bugStatusEnum.default('new'),
  whatHappened: z.string(),
  stepsToReproduce: z.string().nullable(),
  expectedResult: z.string().nullable(),
  additionalContext: z.string().nullable(),
  reporter: z.object({
    userId: z.string(),
    clerkUserId: z.string().nullable(),
    contactEmail: z.string().nullable()
  }),
  metadata: z.object({
    gameId: z.string().optional(),
    currentWeek: z.number().int().optional(),
    userAgent: z.string().optional(),
    platform: z.string().optional(),
    language: z.string().optional(),
    timeZone: z.string().optional(),
    url: z.string().optional(),
    screen: z.object({
      width: z.number().optional(),
      height: z.number().optional()
    }).optional(),
    ip: z.string().optional()
  }).partial()
});

export const BugReportListResponseSchema = z.object({
  success: z.boolean(),
  reports: z.array(BugReportRecordSchema),
  count: z.number()
});

export const BugReportStatusUpdateRequestSchema = z.object({
  status: bugStatusEnum
});

export const BugReportStatusUpdateResponseSchema = z.object({
  success: z.boolean(),
  reportId: z.string().uuid(),
  status: bugStatusEnum
});

// Game state request/response schemas
export const GetGameStateRequest = z.object({
  gameId: z.string().uuid().optional()
});

export const GetGameStateResponse = z.object({
  gameState: z.custom<GameState>(),
  artists: z.array(z.any()),
  projects: z.array(z.any()),
  roles: z.array(z.any()),
  weeklyActions: z.array(z.any())
});

// Week advancement schemas
export const AdvanceWeekRequest = z.object({
  gameId: z.string().uuid(),
  selectedActions: z.array(ActionSchema)
});

export const CampaignResultsSchema = z.object({
  campaignCompleted: z.boolean(),
  finalScore: z.number(),
  scoreBreakdown: z.object({
    money: z.number(),
    reputation: z.number(),
    artistsSuccessful: z.number(),
    projectsCompleted: z.number(),
    accessTierBonus: z.number(),
  }),
  victoryType: z.enum(['Commercial Success', 'Critical Acclaim', 'Balanced Growth', 'Survival', 'Failure']),
  summary: z.string(),
  achievements: z.array(z.string()),
});

export const AdvanceWeekResponse = z.object({
  gameState: z.custom<GameState>(),
  summary: z.object({
    week: z.number(),
    changes: z.array(z.any()),
    revenue: z.number(),
    expenses: z.number(),
    reputationChanges: z.record(z.number()),
    events: z.array(z.any()),
  }),
  campaignResults: CampaignResultsSchema.optional(),
});

// Action selection schemas
export const SelectActionsRequest = z.object({
  gameId: z.string().uuid(),
  selectedActions: z.array(ActionSchema).max(3)
});

export const SelectActionsResponse = z.object({
  success: z.boolean(),
  gameState: z.custom<GameState>()
});

// Artist management schemas
export const SignArtistRequest = z.object({
  gameId: z.string().uuid(),
  artistData: z.object({
    name: z.string().min(1).max(50),
    archetype: z.enum(['Visionary', 'Workhorse', 'Trendsetter']),
    metadata: z.record(z.any()).optional()
  })
});

export const SignArtistResponse = z.object({
  artist: ArtistSchema.pick({
    id: true,
    name: true,
    archetype: true,
    mood: true,
    energy: true,
    popularity: true,
    signedWeek: true,
    signed: true,
    gameId: true
  }).extend({
    id: z.string().uuid(),
    signedWeek: z.number().nullable(),
    signed: z.boolean(),
    gameId: z.string().nullable()
  }),
  updatedGameState: z.custom<GameState>()
});

// Project management schemas
export const StartProjectRequest = z.object({
  gameId: z.string().uuid(),
  projectData: z.object({
    title: z.string().min(1).max(100),
    type: z.enum(['Single', 'EP', 'Mini-Tour']),
    artistId: z.string().uuid(),
    metadata: z.record(z.any()).optional()
  })
});

export const StartProjectResponse = z.object({
  project: z.custom<GameProject>(),
  updatedGameState: z.custom<GameState>()
});

// Error response schema
export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(z.any()).optional()
});

// Export all types
export type ActionType = z.infer<typeof ActionSchema>;
export type GetGameStateRequest = z.infer<typeof GetGameStateRequest>;
export type GetGameStateResponse = z.infer<typeof GetGameStateResponse>;
export type AdvanceWeekRequest = z.infer<typeof AdvanceWeekRequest>;
export type AdvanceWeekResponse = z.infer<typeof AdvanceWeekResponse>;
export type SelectActionsRequest = z.infer<typeof SelectActionsRequest>;
export type SelectActionsResponse = z.infer<typeof SelectActionsResponse>;
export type SignArtistRequest = z.infer<typeof SignArtistRequest>;
export type SignArtistResponse = z.infer<typeof SignArtistResponse>;
export type StartProjectRequest = z.infer<typeof StartProjectRequest>;
export type StartProjectResponse = z.infer<typeof StartProjectResponse>;
export type ErrorResponse = z.infer<typeof ErrorResponse>;
export type GameEndpoints = typeof gameEndpoints;
export type BugReportRequest = z.infer<typeof BugReportRequestSchema>;
export type BugReportResponse = z.infer<typeof BugReportResponseSchema>;
export type BugReportRecord = z.infer<typeof BugReportRecordSchema>;
export type BugReportListResponse = z.infer<typeof BugReportListResponseSchema>;
export type BugReportStatus = z.infer<typeof bugStatusEnum>;
export type BugReportStatusUpdateRequest = z.infer<typeof BugReportStatusUpdateRequestSchema>;
export type BugReportStatusUpdateResponse = z.infer<typeof BugReportStatusUpdateResponseSchema>;

// ========================================
// Artist Dialogue Schemas
// ========================================

export const ArtistDialogueRequestSchema = z.object({
  artistId: z.string().uuid("Artist ID must be a valid UUID"),
  sceneId: z.string().min(1, "Scene ID is required"),
  choiceId: z.string().min(1, "Choice ID is required")
});

export const ArtistDialogueResponseSchema = z.object({
  success: z.boolean(),
  artistId: z.string().uuid(),
  artistName: z.string(),
  sceneId: z.string(),
  choiceId: z.string(),
  effects: z.record(z.number()),
  delayedEffects: z.record(z.number()),
  message: z.string()
});

export type ArtistDialogueRequest = z.infer<typeof ArtistDialogueRequestSchema>;
export type ArtistDialogueResponse = z.infer<typeof ArtistDialogueResponseSchema>;

// Backward compatibility - keep existing routes for now
export const API_ROUTES = {
  GAME_STATE: '/api/game-state',
  ADVANCE_WEEK: '/api/advance-week',
  SELECT_ACTIONS: '/api/select-actions',
  SIGN_ARTIST: '/api/game/:gameId/artists',
  START_PROJECT: '/api/game/:gameId/projects',
  GET_GAME: '/api/game/:id'
} as const;

// Validation helpers
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

export function createErrorResponse(error: string, message: string, details?: any[]): ErrorResponse {
  return { error, message, details };
}

// ========================================
// Admin Actions Config Schemas
// ========================================

// Choice effect schema - flexible object with number properties (defaults to empty object)
export const ChoiceEffectSchema = z.record(z.number()).default({});

// Dialogue choice schema
export const DialogueChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  effects_immediate: ChoiceEffectSchema,
  effects_delayed: ChoiceEffectSchema,
});

// Action details schema (for non-meeting actions)
export const ActionDetailsSchema = z.object({
  cost: z.string(),
  duration: z.string(),
  prerequisites: z.string(),
  outcomes: z.array(z.string()),
  benefits: z.array(z.string()),
}).optional();

// Action recommendations schema
export const ActionRecommendationsSchema = z.object({
  urgent_when: z.record(z.any()).optional(),
  recommended_when: z.record(z.any()).optional(),
  reasons: z.record(z.string()).optional(),
}).optional();

// Target scope enum
export const TargetScopeSchema = z.enum(['global', 'predetermined', 'user_selected']);

// Weekly action schema (role meetings and other actions)
export const WeeklyActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  icon: z.string(),
  description: z.string().default(''),
  role_id: z.string().default(''),
  meeting_id: z.string().default(''),
  category: z.string(),
  project_type: z.string().optional(),
  campaign_type: z.string().optional(),
  prompt: z.string().default(''),
  prompt_before_selection: z.string().optional(),
  target_scope: TargetScopeSchema.default('global'),
  choices: z.array(DialogueChoiceSchema).default([]),
  details: ActionDetailsSchema,
  recommendations: ActionRecommendationsSchema,
}).passthrough();

// Action category schema
export const ActionCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  color: z.string(),
});

// Full actions configuration schema
export const ActionsConfigSchema = z.object({
  version: z.string(),
  generated: z.string().optional(),
  description: z.string().optional(),
  weekly_actions: z.array(WeeklyActionSchema),
  action_categories: z.array(ActionCategorySchema).default([]),
}).passthrough();

// Admin endpoints for actions config
export const adminActionsEndpoints = {
  getConfig: '/api/admin/actions-config',
  saveConfig: '/api/admin/actions-config',
} as const;

// Request schema for saving actions config
export const SaveActionsConfigRequestSchema = z.object({
  config: ActionsConfigSchema,
});

// Response schema for saving actions config
export const SaveActionsConfigResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  backupCreated: z.boolean().optional(),
});

// Response schema for getting actions config
export const GetActionsConfigResponseSchema = ActionsConfigSchema;

// Export TypeScript types
export type ChoiceEffect = z.infer<typeof ChoiceEffectSchema>;
export type DialogueChoiceContract = z.infer<typeof DialogueChoiceSchema>;
export type ActionDetails = z.infer<typeof ActionDetailsSchema>;
export type ActionRecommendations = z.infer<typeof ActionRecommendationsSchema>;
export type TargetScope = z.infer<typeof TargetScopeSchema>;
export type WeeklyAction = z.infer<typeof WeeklyActionSchema>;
export type ActionCategory = z.infer<typeof ActionCategorySchema>;
export type ActionsConfig = z.infer<typeof ActionsConfigSchema>;
export type SaveActionsConfigRequest = z.infer<typeof SaveActionsConfigRequestSchema>;
export type SaveActionsConfigResponse = z.infer<typeof SaveActionsConfigResponseSchema>;
export type GetActionsConfigResponse = z.infer<typeof GetActionsConfigResponseSchema>;