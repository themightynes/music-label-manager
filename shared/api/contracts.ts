import { z } from 'zod';
import { GameState, GameProject } from '../types/gameTypes';

// Request/Response schemas
export const AdvanceMonthRequest = z.object({
  gameId: z.string().uuid(),
  selectedActions: z.array(z.object({
    actionType: z.enum(['project', 'marketing', 'dialogue']),
    targetId: z.string(),
    metadata: z.record(z.any()).optional()
  }))
});

export const AdvanceMonthResponse = z.object({
  updatedState: z.custom<GameState>(),
  revenue: z.number(),
  expenses: z.number(),
  events: z.array(z.any())
});

export const SignArtistRequest = z.object({
  gameId: z.string().uuid(),
  artistData: z.object({
    name: z.string(),
    archetype: z.enum(['Visionary', 'Workhorse', 'Trendsetter']),
    metadata: z.record(z.any()).optional()
  })
});

export const StartProjectRequest = z.object({
  gameId: z.string().uuid(),
  projectData: z.object({
    title: z.string(),
    type: z.enum(['Single', 'EP', 'Mini-Tour']),
    artistId: z.string().uuid(),
    metadata: z.record(z.any()).optional()
  })
});

export type AdvanceMonthRequest = z.infer<typeof AdvanceMonthRequest>;
export type AdvanceMonthResponse = z.infer<typeof AdvanceMonthResponse>;
export type SignArtistRequest = z.infer<typeof SignArtistRequest>;
export type StartProjectRequest = z.infer<typeof StartProjectRequest>;

export interface ArtistResponse {
  id: string;
  name: string;
  archetype: string;
  gameId: string;
}

export interface ProjectResponse extends GameProject {}