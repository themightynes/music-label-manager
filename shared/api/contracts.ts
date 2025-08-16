import { z } from 'zod';
import { GameState, GameProject } from '../types/gameTypes';

// Action schema for consistency
export const ActionSchema = z.object({
  actionType: z.enum(['project', 'marketing', 'dialogue', 'meeting']),
  targetId: z.string(),
  metadata: z.record(z.any()).optional()
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
  monthlyActions: z.array(z.any())
});

// Month advancement schemas
export const AdvanceMonthRequest = z.object({
  gameId: z.string().uuid(),
  selectedActions: z.array(z.object({
    actionType: z.string(),
    targetId: z.string(),
    metadata: z.record(z.any()).optional()
  }))
});

export const AdvanceMonthResponse = z.object({
  gameState: z.custom<GameState>(),
  revenue: z.number(),
  expenses: z.number(),
  reputationChange: z.number(),
  monthlyOutcome: z.object({
    month: z.number(),
    revenue: z.number(),
    expenses: z.number(),
    netChange: z.number(),
    reputationChange: z.number(),
    actions: z.array(z.any()),
    endingCash: z.number()
  }),
  events: z.array(z.any())
});

// Action selection schemas
export const SelectActionsRequest = z.object({
  gameId: z.string().uuid(),
  selectedActions: z.array(z.string()).max(3)
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
  artist: z.object({
    id: z.string().uuid(),
    name: z.string(),
    archetype: z.string(),
    mood: z.number(),
    loyalty: z.number(),
    popularity: z.number(),
    signedMonth: z.number().nullable(),
    isSigned: z.boolean(),
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
export type AdvanceMonthRequest = z.infer<typeof AdvanceMonthRequest>;
export type AdvanceMonthResponse = z.infer<typeof AdvanceMonthResponse>;
export type SelectActionsRequest = z.infer<typeof SelectActionsRequest>;
export type SelectActionsResponse = z.infer<typeof SelectActionsResponse>;
export type SignArtistRequest = z.infer<typeof SignArtistRequest>;
export type SignArtistResponse = z.infer<typeof SignArtistResponse>;
export type StartProjectRequest = z.infer<typeof StartProjectRequest>;
export type StartProjectResponse = z.infer<typeof StartProjectResponse>;
export type ErrorResponse = z.infer<typeof ErrorResponse>;

// API route constants
export const API_ROUTES = {
  GAME_STATE: '/api/game-state',
  ADVANCE_MONTH: '/api/advance-month',
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