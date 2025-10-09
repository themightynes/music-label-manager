/**
 * Test factories for creating mock game objects
 */
import type { GameArtist, Executive, DialogueScene, DialogueChoice, WeekSummary } from '@shared/types/gameTypes';

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
