import type { Artist, Song, Release } from '../types';

// Minimal mock props shared across Artist tab render smoke tests.

export const mockArtist: Artist = {
  id: 'artist-1',
  name: 'Nova Sterling',
  archetype: 'Visionary',
  talent: 80,
  workEthic: 70,
  popularity: 42,
  temperament: 55,
  energy: 65,
  mood: 75,
  signed: true,
  signingCost: 5000,
  weeklyCost: 1200,
};

export const mockReleasedSong: Song = {
  id: 'song-1',
  title: 'Midnight Echoes',
  quality: 88,
  genre: 'pop',
  mood: 'energetic',
  artistId: 'artist-1',
  artistName: 'Nova Sterling',
  createdWeek: 3,
  isRecorded: true,
  isReleased: true,
  releaseId: 'release-1',
  totalStreams: 1_500_000,
  totalRevenue: 42_000,
  weeklyStreams: 25_000,
  releaseWeek: 5,
};

export const mockUnreleasedSong: Song = {
  id: 'song-2',
  title: 'Draft Idea',
  quality: 62,
  genre: 'rock',
  mood: 'melancholic',
  artistId: 'artist-1',
  artistName: 'Nova Sterling',
  createdWeek: 8,
  isRecorded: true,
  isReleased: false,
  releaseId: null,
};

export const mockReleasedRelease: Release = {
  id: 'release-1',
  title: 'First Light EP',
  type: 'ep',
  artistId: 'artist-1',
  status: 'released',
  releaseWeek: 5,
  songIds: ['song-1'],
  streamsGenerated: 1_500_000,
  revenueGenerated: 42_000,
  marketingBudget: 3000,
};

export const mockPlannedRelease: Release = {
  id: 'release-2',
  title: 'Second Wind Single',
  type: 'single',
  artistId: 'artist-1',
  status: 'planned',
  releaseWeek: 12,
  songIds: ['song-2'],
  streamsGenerated: 0,
  revenueGenerated: 0,
};

export const mockMoodStatus = {
  status: 'Happy',
  color: 'text-green-600',
  bgColor: 'bg-green-500/10',
};

export const mockArchetypeInfo = {
  color: 'text-brand-burgundy-dark',
  icon: () => null,
  description: 'Creative and experimental',
};

export const mockInsights = {
  projects: 1,
  releasedProjects: 1,
  totalRevenue: 42_000,
  archetype: 'Visionary',
  mood: 75,
  energy: 65,
  loyalty: 65,
  popularity: 42,
};
