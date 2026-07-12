import { z } from 'zod';
import { GameState, GameProject } from '../types/gameTypes';
import { RELEVANCE_TAGS, HAPPENING_TYPES, SIDE_EVENT_CATEGORIES } from '../types/gameTypes';
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
  selectedActions: z.array(ActionSchema),
  // C58: optimistic stale-week guard. OPTIONAL so existing callers/tests are
  // unaffected — the server only enforces the guard when this is present. The
  // client ALWAYS sends its currently-known currentWeek so a double-submitted
  // advance click 409s on the second request instead of silently advancing
  // two weeks (see advanceWeekService.ts's guard, right after the
  // `SELECT ... FOR UPDATE` re-read).
  expectedCurrentWeek: z.number().int().optional(),
  // Mandatory Side Events ("Crisis on the Desk"): the player's resolution for a
  // pending crisis, carried WITH the advance (mirrors expectedCurrentWeek).
  // OPTIONAL — absent in the legacy in-results path and week-1/no-crisis advances.
  // The server validates it against flags.pending_side_event before advancing.
  sideEventChoice: z.object({
    eventId: z.string(),
    choiceId: z.string(),
  }).optional()
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
    // Exec-meetings-revival PR-7 (C5): campaign-end award-roll bonus. Optional +
    // defaulted so older persisted campaignResults payloads (pre-PR-7) still
    // validate without a migration.
    awardBonus: z.number().optional().default(0),
  }),
  victoryType: z.enum(['Commercial Success', 'Critical Acclaim', 'Balanced Growth', 'Survival', 'Failure']),
  summary: z.string(),
  achievements: z.array(z.string()),
  // Exec-meetings-revival PR-7 (C5): true when the campaign-end award roll hit.
  industryAward: z.boolean().optional(),
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
  // No fixed cap: the focus-slot count is dynamic (base 3, unlocks a 4th at
  // reputation >= 50 via focus_slots_max). Matches AdvanceWeekRequest, which is
  // uncapped; the effective per-week limit is enforced server-side against
  // gameState.focusSlots. A hardcoded .max() here would silently break the 4th slot.
  selectedActions: z.array(ActionSchema)
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

// ============================================================================
// Side Event Choice (Tier 2, PR-3)
// ============================================================================
// Resolution endpoint for the pending side event set by the engine on a hit
// (game-engine.ts checkForEvents). Effects apply at CHOICE-TIME, outside the
// week transaction, mirroring the artist-dialogue immediate path.

export const SideEventChoiceRequestSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  choiceId: z.string().min(1, "Choice ID is required"),
});

export const SideEventChoiceResponseSchema = z.object({
  success: z.boolean(),
  eventId: z.string(),
  choiceId: z.string(),
  effects: z.record(z.number()),
  delayedEffects: z.record(z.number()),
  message: z.string(),
});

export type SideEventChoiceRequest = z.infer<typeof SideEventChoiceRequestSchema>;
export type SideEventChoiceResponse = z.infer<typeof SideEventChoiceResponseSchema>;

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
  // Delegation-arc §4.3.1: optional self-serving-pick override (see DialogueChoice type).
  self_serving_hint: z.boolean().optional(),
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

// Meeting-relevance Tier 0 (PR-1): relevance-tag enum, derived from the canonical
// RELEVANCE_TAGS array in shared/types/gameTypes.ts (single source of truth).
export const RelevanceTagSchema = z.enum(RELEVANCE_TAGS);

// Tier 2 (PR-1): week-happening-type enum, derived from the canonical
// HAPPENING_TYPES array in shared/types/gameTypes.ts (single source of truth).
export const HappeningTypeSchema = z.enum(HAPPENING_TYPES);

// Tier 2 (PR-1): additive optional context describing WHY a reactive meeting
// was selected for GET /api/roles/:roleId this week — attached ON the selected
// meeting object in the response (spec §2), rendered as the "why now" line in
// PR-2. Present only when the injection stage
// (shared/engine/meetingSelection.ts selectWeeklyMeetingWithHappenings) picked
// a reactive meeting over the normal weighted draw. Dark launch: never
// populated until PR-2 authors reactive_trigger meetings.
export const ReactiveContextSchema = z.object({
  trigger: HappeningTypeSchema,
  artistName: z.string().optional(),
  songTitle: z.string().optional(),
});
export type ReactiveContext = z.infer<typeof ReactiveContextSchema>;

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
  // Meeting-relevance Tier 0 (PR-1): AND semantics, absent = always eligible.
  requires: z.array(RelevanceTagSchema).nonempty().optional(),
  // Tier 2 (PR-1): optional reactive-meeting trigger. Dark launch: no
  // data/actions.json entry sets this yet (PR-2 authors the first ones).
  reactive_trigger: HappeningTypeSchema.optional(),
  // Tier 2 (PR-1): server-attached "why now" context on the SELECTED meeting
  // (never authored in data/actions.json — response-side only).
  reactiveContext: ReactiveContextSchema.optional(),
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
export type RelevanceTagContract = z.infer<typeof RelevanceTagSchema>;
export type WeeklyAction = z.infer<typeof WeeklyActionSchema>;
export type ActionCategory = z.infer<typeof ActionCategorySchema>;
export type ActionsConfig = z.infer<typeof ActionsConfigSchema>;
export type SaveActionsConfigRequest = z.infer<typeof SaveActionsConfigRequestSchema>;
export type SaveActionsConfigResponse = z.infer<typeof SaveActionsConfigResponseSchema>;
export type GetActionsConfigResponse = z.infer<typeof GetActionsConfigResponseSchema>;

// ========================================
// Admin Events Config Schemas (content-editor slice 1)
// ========================================

// Side-event category enum, derived from the canonical SIDE_EVENT_CATEGORIES
// array in shared/types/gameTypes.ts (the RELEVANCE_TAGS/HAPPENING_TYPES
// one-source pattern — see RelevanceTagSchema/HappeningTypeSchema above).
export const SideEventCategorySchema = z.enum(SIDE_EVENT_CATEGORIES);

// Side-event contract schema — reuses DialogueChoiceSchema for choices
// (same shape as meeting choices: id/label/effects_immediate/effects_delayed).
export const SideEventContractSchema = z.object({
  id: z.string(),
  role_hint: z.string(),
  category: SideEventCategorySchema,
  // Executive Delegation arc (Tier 1, §8/fork f): optional per-event targeting
  // mode — 'predetermined' resolves artist-scoped effects against the
  // highest-popularity signed artist. Absent -> existing global behavior.
  target: z.enum(['predetermined']).optional(),
  prompt: z.string(),
  choices: z.array(DialogueChoiceSchema).min(1),
}).passthrough();

// Full events configuration schema. `generated` is optional here (mirroring
// ActionsConfigSchema's convention) even though data/events.json always has
// it and the dataLoader's own schema (shared/utils/dataLoader.ts) requires it.
export const EventsConfigSchema = z.object({
  version: z.string(),
  generated: z.string().optional(),
  events: z.array(SideEventContractSchema),
}).passthrough();

// Admin endpoints for events config
export const adminEventsEndpoints = {
  getConfig: '/api/admin/events-config',
  saveConfig: '/api/admin/events-config',
} as const;

// Request schema for saving events config
export const SaveEventsConfigRequestSchema = z.object({
  config: EventsConfigSchema,
});

// Response schema for saving events config
export const SaveEventsConfigResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  backupCreated: z.boolean().optional(),
});

// Response schema for getting events config
export const GetEventsConfigResponseSchema = EventsConfigSchema;

// Export TypeScript types
export type SideEventCategoryContract = z.infer<typeof SideEventCategorySchema>;
export type SideEventContract = z.infer<typeof SideEventContractSchema>;
export type EventsConfig = z.infer<typeof EventsConfigSchema>;
export type SaveEventsConfigRequest = z.infer<typeof SaveEventsConfigRequestSchema>;
export type SaveEventsConfigResponse = z.infer<typeof SaveEventsConfigResponseSchema>;
export type GetEventsConfigResponse = z.infer<typeof GetEventsConfigResponseSchema>;

// ========================================
// Admin Playtest Feedback Schemas (2026-07-11 form)
// ========================================
// Recording surface for docs/01-planning/PLAYTEST_FEEDBACK_2026-07-11.md.
// The markdown stays the printable source; responses persist as JSON at
// docs/01-planning/playtest-feedback-2026-07-11.responses.json via the
// /api/admin/playtest-feedback endpoint pair (validate → backup → write,
// mirroring the actions-config pattern). Unanswered fields are simply
// empty/null — this is a self-report form, nothing is required.

export const PLAYTEST_FEEDBACK_FORM_ID = 'playtest-feedback-2026-07-11' as const;

// Canonical section ids, in the form's order (§1–§11). The client-side form
// definition (client/src/admin/playtestFeedbackForm.ts) must use exactly
// these ids; the server writes `sections` keys in this order for a stable,
// diffable JSON file.
export const PLAYTEST_SECTION_IDS = [
  'flop_penalty',
  'mood_recording_variance',
  'energy_tour_sellthrough',
  'tour_popularity_saturation',
  'loss_leader_marketing',
  'hype_pools_premarketing',
  'awareness_surfacing',
  'reactive_meetings_side_events',
  'tour_tier1',
  'the_board_reskin',
  'phase4_game_feel',
] as const;

// Canonical §12 knob-strength rows, in table order.
export const PLAYTEST_KNOB_IDS = [
  'flop_reputation_penalty',
  'low_mood_recording_variance',
  'energy_tour_sellthrough',
  'tour_popularity_saturation',
  'hype_pools_premarketing',
  'side_event_frequency',
  'meeting_relevance_why_now',
  'staged_reveal_pacing',
] as const;

// The Feel scale used everywhere in the form: dead / flat / works / sings.
export const PlaytestFeelSchema = z.enum(['dead', 'flat', 'works', 'sings']);

// §12 strength read per system: too weak / about right / too strong.
export const PlaytestStrengthSchema = z.enum(['too_weak', 'about_right', 'too_strong']);

// One mechanic section (§1–§11): exposure ticks (ids of ticked options —
// single- vs multi-tick is a client-side rendering rule mirroring the
// markdown), the feel rating, the "anything off" line, and one free-text
// answer per designer question (positional, matching the form definition).
export const PlaytestSectionResponseSchema = z.object({
  exposure: z.array(z.string()).default([]),
  feel: PlaytestFeelSchema.nullable().default(null),
  anythingOff: z.string().default(''),
  designerAnswers: z.array(z.string()).default([]),
});

// Full response document. `savedAt` is stamped server-side on save.
export const PlaytestFeedbackResponsesSchema = z.object({
  formId: z.literal(PLAYTEST_FEEDBACK_FORM_ID).default(PLAYTEST_FEEDBACK_FORM_ID),
  savedAt: z.string().nullable().default(null),
  sections: z.record(z.string(), PlaytestSectionResponseSchema).default({}),
  knobStrength: z.record(z.string(), PlaytestStrengthSchema.nullable()).default({}),
  oneKnobChange: z.string().default(''),
  topPriorities: z.array(z.string()).length(3).default(['', '', '']),
  pullBack: z.string().default(''),
  gutCheck: z.string().default(''),
});

// ========================================
// Admin Playtest Feedback Schemas — V2 (2026-07-12 "Round 2" form)
// ========================================
// Round 2 recording surface for docs/01-planning/PLAYTEST_FEEDBACK_2026-07-12.md.
// The round-1 (2026-07-11) constants/schemas above stay UNTOUCHED — the v1
// responses file is a historical record and must remain loadable forever.
// Versioning approach: the SAME /api/admin/playtest-feedback endpoint pair
// serves both forms, keyed by a validated formId from the fixed two-entry
// allowlist below (GET ?formId=…, POST responses.formId). No new routes, so
// the route manifest is unchanged.

export const PLAYTEST_FEEDBACK_FORM_ID_V2 = 'playtest-feedback-2026-07-12' as const;

// Canonical V2 section ids, in the form's order (§1–§10).
export const PLAYTEST_SECTION_IDS_V2 = [
  'mandatory_crisis_events',
  'energy_lifecycle',
  'mood_outcomes',
  'mood_recording_variance_retest',
  'flop_drama',
  'reputation_pacing',
  'creative_capital_income',
  'meeting_relevance_whynow',
  'hype_attach_ux',
  'board_waiting_brief',
] as const;

// Canonical V2 §11 knob-strength rows, in table order. Every row here was
// tuned (or newly created) in direct response to round 1.
export const PLAYTEST_KNOB_IDS_V2 = [
  'energy_drain_rate',
  'idle_recovery_rate',
  'mood_swing_size',
  'flop_sting',
  'reputation_pacing',
  'creative_capital_income',
  'crisis_frequency',
  'crisis_slot_cost',
] as const;

// V2 response document: identical shape to V1, distinguished only by the
// formId literal (feel/strength scales and section-response shape are shared
// deliberately — the whole point of the versioned system is diffable,
// same-shaped rounds).
export const PlaytestFeedbackResponsesV2Schema = PlaytestFeedbackResponsesSchema.extend({
  formId: z.literal(PLAYTEST_FEEDBACK_FORM_ID_V2).default(PLAYTEST_FEEDBACK_FORM_ID_V2),
});

// Union used by the endpoint pair: V2 first so a document with no explicit
// formId defaults to the ACTIVE form (v2). An explicit v1 formId still
// parses via the v1 branch.
export const AnyPlaytestFeedbackResponsesSchema = z.union([
  PlaytestFeedbackResponsesV2Schema,
  PlaytestFeedbackResponsesSchema,
]);

// Fixed allowlist: formId → canonical id lists. The server derives the
// responses-file path and stable key order from this registry; anything not
// in it is rejected with 400.
export const PLAYTEST_FORM_REGISTRY = {
  [PLAYTEST_FEEDBACK_FORM_ID_V2]: {
    sectionIds: PLAYTEST_SECTION_IDS_V2 as readonly string[],
    knobIds: PLAYTEST_KNOB_IDS_V2 as readonly string[],
  },
  [PLAYTEST_FEEDBACK_FORM_ID]: {
    sectionIds: PLAYTEST_SECTION_IDS as readonly string[],
    knobIds: PLAYTEST_KNOB_IDS as readonly string[],
  },
} as const;

export type PlaytestFormId = keyof typeof PLAYTEST_FORM_REGISTRY;

export function isPlaytestFormId(value: string): value is PlaytestFormId {
  return value in PLAYTEST_FORM_REGISTRY;
}

// The form the admin page currently records against.
export const ACTIVE_PLAYTEST_FORM_ID: PlaytestFormId = PLAYTEST_FEEDBACK_FORM_ID_V2;

// Admin endpoints for playtest feedback
export const adminPlaytestFeedbackEndpoints = {
  getResponses: '/api/admin/playtest-feedback',
  saveResponses: '/api/admin/playtest-feedback',
} as const;

// Request schema for saving playtest feedback responses (either form version;
// the server keys the target file off the validated formId).
export const SavePlaytestFeedbackRequestSchema = z.object({
  responses: AnyPlaytestFeedbackResponsesSchema,
});

// Response schema for saving playtest feedback responses
export const SavePlaytestFeedbackResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  backupCreated: z.boolean().optional(),
  savedAt: z.string().optional(),
});

// Response schema for getting playtest feedback responses (either version)
export const GetPlaytestFeedbackResponseSchema = AnyPlaytestFeedbackResponsesSchema;

// Builds the empty default response document for any registered form (GET
// returns this when that form's responses file does not exist yet), with
// every canonical section/knob key present in stable order so the client can
// prefill without guessing keys.
export function buildEmptyPlaytestFeedbackResponsesFor(
  formId: PlaytestFormId
): AnyPlaytestFeedbackResponses {
  const registry = PLAYTEST_FORM_REGISTRY[formId];
  const sections: Record<string, PlaytestSectionResponse> = {};
  for (const id of registry.sectionIds) {
    sections[id] = { exposure: [], feel: null, anythingOff: '', designerAnswers: [] };
  }
  const knobStrength: Record<string, PlaytestStrength | null> = {};
  for (const id of registry.knobIds) {
    knobStrength[id] = null;
  }
  return {
    formId,
    savedAt: null,
    sections,
    knobStrength,
    oneKnobChange: '',
    topPriorities: ['', '', ''],
    pullBack: '',
    gutCheck: '',
  } as AnyPlaytestFeedbackResponses;
}

// V1 builder — kept with its original signature (historical callers + tests).
export function buildEmptyPlaytestFeedbackResponses(): PlaytestFeedbackResponses {
  return buildEmptyPlaytestFeedbackResponsesFor(
    PLAYTEST_FEEDBACK_FORM_ID
  ) as PlaytestFeedbackResponses;
}

// V2 builder — the active form's empty default.
export function buildEmptyPlaytestFeedbackResponsesV2(): PlaytestFeedbackResponsesV2 {
  return buildEmptyPlaytestFeedbackResponsesFor(
    PLAYTEST_FEEDBACK_FORM_ID_V2
  ) as PlaytestFeedbackResponsesV2;
}

// Export TypeScript types
export type PlaytestFeel = z.infer<typeof PlaytestFeelSchema>;
export type PlaytestStrength = z.infer<typeof PlaytestStrengthSchema>;
export type PlaytestSectionResponse = z.infer<typeof PlaytestSectionResponseSchema>;
export type PlaytestFeedbackResponses = z.infer<typeof PlaytestFeedbackResponsesSchema>;
export type PlaytestFeedbackResponsesV2 = z.infer<typeof PlaytestFeedbackResponsesV2Schema>;
export type AnyPlaytestFeedbackResponses = z.infer<typeof AnyPlaytestFeedbackResponsesSchema>;
export type SavePlaytestFeedbackRequest = z.infer<typeof SavePlaytestFeedbackRequestSchema>;
export type SavePlaytestFeedbackResponse = z.infer<typeof SavePlaytestFeedbackResponseSchema>;
export type GetPlaytestFeedbackResponse = z.infer<typeof GetPlaytestFeedbackResponseSchema>;