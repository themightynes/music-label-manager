// Local view-model types for the Artist page and its tab components.
//
// NOTE: These duplicate shapes from `shared/schema.ts`. They are deduplicated
// here (previously inlined in ArtistPage.tsx) but intentionally NOT swapped for
// the schema types in this PR to avoid type-shape drift risk. Swapping to the
// canonical schema types is tracked as a follow-up.

export interface Artist {
  id: string;
  name: string;
  archetype: string;
  talent?: number | null;
  workEthic?: number | null;
  popularity?: number | null;
  temperament?: number | null;
  energy: number | null;
  mood: number | null;
  signed?: boolean | null;
  signingCost?: number | null;
  weeklyCost?: number | null;
  bio?: string;
  genre?: string;
  age?: number | null;
}

export interface Song {
  id: string;
  title: string;
  quality: number;
  genre: string;
  mood: string;
  artistId: string;
  artistName: string;
  createdWeek: number;
  isRecorded: boolean;
  isReleased: boolean;
  releaseId?: string | null;
  totalStreams?: number;
  totalRevenue?: number;
  weeklyStreams?: number;
  lastWeekRevenue?: number;
  releaseWeek?: number;
  metadata?: any;
}

export interface Project {
  id: string;
  title: string;
  type: 'Single' | 'EP' | 'Mini-Tour';
  artistId: string;
  stage: 'planning' | 'production' | 'released';
  quality: number;
  budget: number;
  budgetUsed: number;
  dueWeek: number;
  startWeek: number;
  metadata?: Record<string, any>;
}

export interface Release {
  id: string;
  title: string;
  type: 'single' | 'ep' | 'album';
  artistId: string;
  status: 'planned' | 'released' | 'catalog';
  releaseWeek?: number;
  songIds: string[];
  streamsGenerated: number;
  revenueGenerated: number;
  marketingBudget?: number;
  metadata?: Record<string, any>;
}
