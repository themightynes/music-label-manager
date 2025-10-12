/**
 * Test factories for creating mock game objects
 */
import type { GameArtist, GameState, Executive, DialogueScene, DialogueChoice, WeekSummary } from '@shared/types/gameTypes';
import type { Artist } from '@shared/schema';

/**
 * Creates a test GameArtist with all required fields
 * Override any fields by passing them in the options
 */
export function createTestArtist(overrides: Partial<GameArtist> = {}): GameArtist {
  return {
    id: 'test_artist_1',
    name: 'Test Artist',
    archetype: 'Visionary',
    talent: 75,
    workEthic: 70,
    popularity: 50,
    temperament: 60,
    energy: 80,
    mood: 50,
    signed: true,
    ...overrides,
  };
}

/**
 * Creates a test database Artist with all required fields
 * This is the database schema type, not the GameArtist type
 */
export function createTestDBArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 'test_artist_1',
    name: 'Test Artist',
    archetype: 'Visionary',
    genre: 'pop',
    mood: 50,
    energy: 80,
    popularity: 50,
    signedWeek: null,
    signed: true,
    weeklyCost: 1200,
    gameId: null,
    talent: 75,
    workEthic: 70,
    stress: 0,
    creativity: 50,
    massAppeal: 50,
    lastAttentionWeek: 1,
    experience: 0,
    temperament: 60,
    signingCost: null,
    bio: null,
    age: null,
    moodHistory: [],
    lastMoodEvent: null,
    moodTrend: 0,
    ...overrides,
  };
}

/**
 * Creates a test Executive with all required fields
 */
export function createTestExecutive(overrides: Partial<Executive> = {}): Executive {
  return {
    id: 'test_exec_1',
    role: 'producer',
    level: 1,
    mood: 50,
    loyalty: 50,
    ...overrides,
  };
}

/**
 * Creates a test DialogueChoice with all required fields
 */
export function createTestDialogueChoice(overrides: Partial<DialogueChoice> = {}): DialogueChoice {
  return {
    id: 'choice_1',
    label: 'Test Choice',
    effects_immediate: {},
    effects_delayed: {},
    ...overrides,
  };
}

/**
 * Creates a test DialogueScene with all required fields
 */
export function createTestDialogueScene(overrides: Partial<DialogueScene> = {}): DialogueScene {
  return {
    id: 'scene_1',
    speaker: 'Test Artist',
    archetype: 'Visionary',
    prompt: 'Test dialogue prompt',
    choices: [createTestDialogueChoice()],
    ...overrides,
  };
}

/**
 * Creates a test WeekSummary with all required fields
 */
export function createTestWeekSummary(overrides: Partial<WeekSummary> = {}): WeekSummary {
  return {
    week: 1,
    changes: [],
    revenue: 0,
    expenses: 0,
    reputationChanges: {},
    events: [],
    artistChanges: {},
    ...overrides,
  };
}

/**
 * Creates a test GameState with all required fields matching the database schema
 * Override any fields by passing them in the options
 */
export function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test_game_1',
    userId: 'test_user_1',
    currentWeek: 1,
    money: 100000,
    reputation: 0,
    creativeCapital: 0,
    focusSlots: 3,
    usedFocusSlots: 0,
    arOfficeSlotUsed: false,
    playlistAccess: 'none',
    pressAccess: 'none',
    venueAccess: 'none',
    campaignType: 'Balanced',
    campaignCompleted: false,
    rngSeed: 'test-seed',
    arOfficeSourcingType: null,
    arOfficePrimaryGenre: null,
    arOfficeSecondaryGenre: null,
    arOfficeOperationStart: null,
    flags: {},
    weeklyStats: {},
    tierUnlockHistory: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
