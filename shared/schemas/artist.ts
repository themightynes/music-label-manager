import { z } from 'zod';

export const ArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.enum(['Visionary', 'Workhorse', 'Trendsetter']),
  mood: z.number(),
  energy: z.number(),
  popularity: z.number(),
  signedWeek: z.number().nullable().optional(),
  signed: z.boolean().optional(),
  gameId: z.string().nullable().optional(),
  talent: z.number().optional(),
  workEthic: z.number().optional(),
  temperament: z.number().optional(),
  signingCost: z.number().optional(),
  weeklyCost: z.number().optional(),
  bio: z.string().optional(),
  genre: z.string().optional(),
  age: z.number().optional()
});

export type Artist = z.infer<typeof ArtistSchema>;
