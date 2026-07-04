/**
 * ActionProcessor — player-action processing + the effects hub.
 *
 * Phase 2 engine-seams §2 row 8 (ActionProcessor half) — the LAST and highest-risk
 * extraction, because `applyEffects` is the coupling hub every action routes through
 * (it moves last, once every caller is already a processor). VERBATIM move of:
 *   - `processAction` (the action-type router)
 *   - `processRoleMeeting` (executive meeting → effects + executive updates)
 *   - `processExecutiveActions` (executive mood/loyalty/lastActionWeek updates)
 *   - `processMarketing`
 *   - `processArtistDialogue`
 *   - `applyEffects` (the hub: money/reputation/creative_capital/artist_mood/energy/popularity)
 *   - `processDelayedEffects` (drains delayed-effect flags → applyEffects)
 *
 * Every log line, branch, RNG draw, summary mutation, and storage call is preserved
 * character-for-character, with only `this.` rebound to the injected `WeekContext`
 * (`this.gameState` → `ctx.gameState`, `this.storage` → `ctx.storage`, `this.gameData`
 * → `ctx.gameData`). Cross-cutting method calls rebind as follows:
 *   - intra-class calls stay `this.<method>(ctx, ...)` (processRoleMeeting → applyEffects
 *     + processExecutiveActions; processArtistDialogue → applyEffects; processDelayedEffects
 *     → applyEffects; processAction → the three handlers).
 *   - `selectHighestPopularityArtist` / `loadSignedArtists` were moved to
 *     ArtistStateProcessor (PR-11 Commit A) → called via
 *     `new ArtistStateProcessor().<method>(ctx)` (PR-9 set the cross-processor precedent).
 *   - `processMarketing`'s `this.calculatePressPickups(...)` is inlined to the exact
 *     FinancialSystem call the engine wrapper made — `ctx.financialSystem.calculatePressPickups(
 *     pressAccess, prSpend, reputation, hasStoryFlag, () => ctx.getRandom(0,1),
 *     ctx.financialSystem.getAccessChance.bind(ctx.financialSystem))` — the SAME seeded
 *     press-pickup roll from the SAME stream in the SAME pipeline position (see ReleaseProcessor).
 *
 * RNG INVARIANT (see ./types.ts): role meetings (predetermined tie-break, via
 * ArtistStateProcessor) and `processMarketing` (press-pickup roll) draw from the
 * engine's single seeded stream through `ctx.getRandom`. `applyEffects` itself draws
 * no RNG. Preserving the advanceWeek pipeline order (meeting actions before other
 * actions; delayed effects at their position) preserves the draw order.
 *
 * The processor is stateless — all state flows through the `WeekContext`. Same-signature
 * engine delegates are kept for applyEffects / applyArtistChangesToDatabase-adjacent
 * methods so external callers (advanceWeek + the mood test suites that call applyEffects
 * via `(engine as any).applyEffects`) keep working byte-for-byte.
 */
import type { WeekContext } from './types';
import type { WeekSummary } from '../../types/gameTypes';
import { ArtistChangeHelpers } from '../../types/gameTypes';
import type { GameEngineAction } from '../game-engine';
import { ArtistStateProcessor } from './ArtistStateProcessor';

/**
 * Effect keys that applyEffects's switch actually implements (PR-1, truth infrastructure).
 * 'executive_mood' is intentionally excluded — it's read directly out of
 * effects_immediate by processExecutiveActions (outside this switch) and legitimately
 * never reaches applyEffects's per-key loop as a "live" key; see the default case below,
 * which special-cases it so it doesn't trigger the unknown-key warning.
 */
export const LIVE_EFFECT_KEYS: ReadonlySet<string> = new Set([
  'money',
  'reputation',
  'creative_capital',
  'artist_mood',
  'artist_energy',
  'artist_popularity',
  // Exec-meetings-revival PR-3 (C2 — press/hype momentum channel):
  'press_story_flag',
  'press_momentum'
]);

export class ActionProcessor {
  /**
   * Processes a single player action
   */
  async processAction(ctx: WeekContext, action: GameEngineAction, dbTransaction?: any): Promise<void> {
    const { summary } = ctx;
    console.log('[GAME-ENGINE processAction] Processing action:', JSON.stringify(action, null, 2));
    console.log('[GAME-ENGINE processAction] Action type:', action.actionType);
    console.log('[GAME-ENGINE processAction] Action metadata:', action.metadata);
    console.log('[GAME-ENGINE processAction] ExecutiveId in metadata:', action.metadata?.executiveId);

    switch (action.actionType) {
      case 'role_meeting':
        console.log('[GAME-ENGINE processAction] ✅ MATCHED role_meeting - calling processRoleMeeting');
        await this.processRoleMeeting(ctx, action, dbTransaction);
        break;
      case 'start_project':
        // REDUNDANT: Projects are now handled via database advancement in advanceProjectStages()
        console.warn('[DEPRECATED] start_project actions are no longer used - projects advance automatically from planning stage');
        break;
      case 'marketing':
        await this.processMarketing(ctx, action);
        break;
      case 'artist_dialogue':
        await this.processArtistDialogue(ctx, action);
        break;
    }

    // NOTE: Focus slots are consumed when actions are selected (via API endpoints),
    // not when they're processed. Removing duplicate consumption here.
    // this.gameState.usedFocusSlots = (this.gameState.usedFocusSlots || 0) + 1;
  }

  /**
   * Processes a role meeting and applies effects
   */
  async processRoleMeeting(ctx: WeekContext, action: GameEngineAction, dbTransaction?: any): Promise<void> {
    const { summary } = ctx;
    if (!action.targetId) return;

    console.log(`[GAME-ENGINE] processRoleMeeting called with action:`, action);

    // Extract the clean IDs from metadata
    const { roleId, actionId, choiceId } = action.metadata || {};

    if (!roleId || !actionId || !choiceId) {
      console.log(`[GAME-ENGINE] Missing required IDs - roleId: ${roleId}, actionId: ${actionId}, choiceId: ${choiceId}`);
      return;
    }

    console.log(`[GAME-ENGINE] Processing meeting - Role: ${roleId}, Action: ${actionId}, Choice: ${choiceId}`);

    // Get the role data for the name
    const role = await ctx.gameData.getRoleById(roleId);
    const roleName = role?.name || roleId;

    // Load the full action data to get target_scope (FR-18)
    const actionData = await ctx.gameData.getActionById(actionId);
    const targetScope = actionData?.target_scope || 'global'; // Default to global if missing
    const meetingName = actionData?.id || actionId; // Use meeting ID as name for logging

    // Load the actual choice from actions.json
    const choice = await ctx.gameData.getChoiceById(actionId, choiceId);

    if (!choice) {
      console.error(`[GAME-ENGINE] Choice not found for actionId: ${actionId}, choiceId: ${choiceId}`);
      // Fallback to minimal stub to prevent crashes
      const fallbackChoice = {
        effects_immediate: { money: -1000 },
        effects_delayed: {}
      };
      console.log(`[GAME-ENGINE] Using fallback choice data`);

      // Apply fallback effects and return (use global targeting as safe default)
      if (fallbackChoice.effects_immediate) {
        const effects: Record<string, number> = {};
        for (const [key, value] of Object.entries(fallbackChoice.effects_immediate)) {
          if (typeof value === 'number') {
            effects[key] = value;
          }
        }
        await this.applyEffects(ctx, effects, undefined, 'global'); // Global targeting (safe fallback default)
      }
      return;
    }

    console.log(`[GAME-ENGINE] Loaded real choice data:`, {
      actionId,
      choiceId,
      immediateEffects: choice.effects_immediate,
      delayedEffects: choice.effects_delayed
    });

    // Determine artistId based on target_scope (FR-18)
    let targetArtistId: string | undefined = undefined;

    if (targetScope === 'predetermined') {
      // Predetermined: Select artist with highest popularity
      const selectedArtist = await new ArtistStateProcessor().selectHighestPopularityArtist(ctx);
      if (selectedArtist) {
        targetArtistId = selectedArtist.id;
        console.log(`[GAME-ENGINE] Predetermined targeting: Selected ${selectedArtist.name} (popularity: ${selectedArtist.popularity})`);
      } else {
        console.warn(`[GAME-ENGINE] Predetermined targeting failed: No signed artists available`);
      }
    } else if (targetScope === 'user_selected') {
      // User-selected: Extract from action metadata
      targetArtistId = action.metadata?.selectedArtistId
        ?? (action.details as Record<string, any> | undefined)?.selectedArtistId
        ?? (action.metadata as Record<string, any> | undefined)?.metadata?.selectedArtistId;
      if (targetArtistId) {
        // BUGFIX: Removed gameState.artists lookup (property doesn't exist)
        // Artist name will be logged in applyArtistChangesToDatabase()
        console.log(`[GAME-ENGINE] User-selected targeting: Player selected artist ${targetArtistId}`);
      } else {
        // BUGFIX: Throw error early instead of continuing with undefined artistId
        // This prevents the error from occurring later in applyEffects validation
        throw new Error(`[GAME-ENGINE ERROR] user_selected meeting '${actionId}' requires an artist selection but none was provided. Please select an artist before processing this meeting.`);
      }
    } else {
      // Global: No artistId (applies to all artists)
      console.log(`[GAME-ENGINE] Global targeting: Effects will apply to all signed artists`);
    }

    // Apply immediate effects
    // Exec-meetings-revival PR-2: captured outside the `if` so the 'meeting' change
    // entry below can carry the actual numeric effects passed to applyEffects, even
    // when effects_immediate is empty (appliedEffects then stays {}).
    const appliedEffects: Record<string, number> = {};
    if (choice.effects_immediate) {
      // Convert to Record<string, number> for applyEffects
      for (const [key, value] of Object.entries(choice.effects_immediate)) {
        if (typeof value === 'number') {
          appliedEffects[key] = value;
        }
      }
      await this.applyEffects(ctx, appliedEffects, targetArtistId, targetScope, meetingName, choiceId); // Pass all context for logging
    }

    // Queue delayed effects with artist targeting support (Task 2.5, FR-19)
    if (choice.effects_delayed) {
      const flags = ctx.gameState.flags || {};
      const delayedKey = `${action.targetId}-${choiceId}-delayed`;
      (flags as any)[delayedKey] = {
        triggerWeek: (ctx.gameState.currentWeek || 0) + 1,
        effects: choice.effects_delayed,
        artistId: targetArtistId, // Preserve artist targeting for delayed effects
        targetScope: targetScope, // Preserve scope for validation
        meetingName: meetingName, // Preserve context for logging
        choiceId: choiceId
      };
      ctx.gameState.flags = flags;
    }

    // Process executive-specific updates (mood, loyalty)
    // This happens after choice effects are applied
    // Pass choice data so we can extract mood effects
    const actionWithChoice = {
      ...action,
      metadata: {
        ...action.metadata,
        choiceEffects: choice
      }
    };
    await this.processExecutiveActions(ctx, actionWithChoice, dbTransaction);

    summary.changes.push({
      type: 'meeting',
      description: `Met with ${roleName}`,
      roleId: roleId,
      // Exec-meetings-revival PR-2: enrichment so the WeekSummary meetings card has
      // real content — which meeting, which choice, and what it actually did.
      meetingId: actionId,
      choiceId: choiceId,
      choiceLabel: (choice as any).label,
      appliedEffects
    });
  }

  /**
   * Processes executive-specific effects from actions
   * Updates mood, loyalty, and lastActionWeek when executives are used
   */
  async processExecutiveActions(
    ctx: WeekContext,
    action: GameEngineAction,
    dbTransaction?: any
  ): Promise<void> {
    const { summary } = ctx;
    // Skip CEO meetings - player IS the CEO, no executive to update
    const roleId = action.metadata?.roleId;
    if (roleId === 'ceo') {
      console.log('[GAME-ENGINE] CEO meeting - player is the CEO, no executive to update');
      return;
    }

    const executiveId = action.metadata?.executiveId;
    if (!executiveId) {
      console.log('[GAME-ENGINE] No executiveId in action metadata, skipping executive processing');
      return;
    }

    console.log('[GAME-ENGINE] Processing executive actions for executiveId:', executiveId);

    // Track that this executive was used this week
    (summary as any).usedExecutives.add(executiveId);

    // Get executive from database
    const executive = await ctx.storage.getExecutive(executiveId, dbTransaction);
    if (!executive) {
      console.log('[GAME-ENGINE] Executive not found:', executiveId);
      return;
    }

    console.log('[GAME-ENGINE] Current executive state:', {
      role: executive.role,
      mood: executive.mood,
      loyalty: executive.loyalty
    });

    // Apply mood changes from executive-specific choice effects
    let moodChange = 0;
    const choiceEffects = action.metadata?.choiceEffects;
    if (choiceEffects?.effects_immediate?.executive_mood) {
      // Use executive-specific mood effect if available
      moodChange = choiceEffects.effects_immediate.executive_mood;
      console.log('[GAME-ENGINE] Applied executive_mood effect:', moodChange);
    } else {
      // Default positive boost for interaction (removed artist_mood fallback)
      moodChange = 5;
      console.log('[GAME-ENGINE] Applied default executive interaction boost: +5');
    }

    const newMood = Math.max(0, Math.min(100, executive.mood + moodChange));

    // Boost loyalty for being used (+5 for interaction)
    const newLoyalty = Math.min(100, executive.loyalty + 5);

    // Update last action week
    const currentWeek = ctx.gameState.currentWeek || 1;

    console.log('[GAME-ENGINE] Updating executive:', {
      moodChange,
      newMood,
      newLoyalty,
      lastActionWeek: currentWeek
    });

    // Save changes to database
    await ctx.storage.updateExecutive(
      executive.id,
      {
        mood: newMood,
        loyalty: newLoyalty,
        lastActionWeek: currentWeek
      },
      dbTransaction
    );

    // Add to summary for UI feedback
    summary.changes.push({
      type: 'executive_interaction',
      description: `Met with ${executive.role}`,
      moodChange,
      newMood,
      loyaltyBoost: 5,
      newLoyalty
    });

    console.log('[GAME-ENGINE] Executive updated successfully');
  }

  /**
   * Applies immediate effects to game state
   * @param effects - Effects to apply
   * @param summary - Week summary to update
   * @param artistId - Optional artist ID for targeted effects
   * @param targetScope - Optional scope for validation ('global' | 'predetermined' | 'user_selected' | 'dialogue')
   * @param meetingName - Optional meeting name for logging
   * @param choiceId - Optional choice ID for logging
   */
  async applyEffects(ctx: WeekContext, effects: Record<string, number>, artistId?: string, targetScope?: string, meetingName?: string, choiceId?: string): Promise<void> {
    const { summary } = ctx;
    for (const [key, value] of Object.entries(effects)) {
      switch (key) {
        case 'money':
          // Note: Money changes will be handled by consolidated financial calculation
          if (value > 0) {
            summary.revenue += value;
            // Add change record for positive money from role meetings so it shows in revenue breakdown
            summary.changes.push({
              type: 'revenue',
              description: 'Executive meeting benefit',
              amount: value
            });
          } else {
            summary.expenses += Math.abs(value);
            // Track role meeting costs in breakdown
            if (!summary.expenseBreakdown) {
              summary.expenseBreakdown = {
                weeklyOperations: 0,
                artistSalaries: 0,
                executiveSalaries: 0,
                signingBonuses: 0,
                projectCosts: 0,
                marketingCosts: 0,
                roleMeetingCosts: 0
              };
            }
            summary.expenseBreakdown.roleMeetingCosts += Math.abs(value);
          }
          break;
        case 'reputation':
          ctx.gameState.reputation = Math.max(0, Math.min(100, (ctx.gameState.reputation || 0) + value));
          // Track reputation changes in summary for analysis
          if (!summary.reputationChanges) {
            summary.reputationChanges = {};
          }
          const targetKey = artistId || 'global';
          summary.reputationChanges[targetKey] = (summary.reputationChanges[targetKey] || 0) + value;
          break;
        case 'creative_capital':
          ctx.gameState.creativeCapital = Math.max(0, (ctx.gameState.creativeCapital || 0) + value);
          break;
        case 'artist_mood':
          // Per-artist mood targeting (FR-14, FR-15) with strict validation (Task 2.1)
          if (!summary.artistChanges) summary.artistChanges = {};

          // Strict validation based on target_scope
          if (targetScope === 'global' && artistId) {
            console.warn(`[EFFECT VALIDATION] Global scope meeting provided artistId (${artistId}). Ignoring artistId and applying globally.`);
            // Force global application by clearing artistId
            artistId = undefined;
          } else if ((targetScope === 'predetermined' || targetScope === 'user_selected') && !artistId) {
            throw new Error(`[EFFECT ERROR] ${targetScope} meeting requires artistId but none provided. Scope: ${targetScope}`);
          }

          if (artistId) {
            // Per-artist targeting: Apply mood change to specific artist
            ArtistChangeHelpers.addMood(summary.artistChanges, artistId, value);

            // BUGFIX: Removed gameState.artists validation (property doesn't exist)
            // Artist existence will be validated in applyArtistChangesToDatabase()

            // Task 2.4: Set event source metadata for mood_events logging
            if (!summary.artistChanges[artistId].eventSource) {
              // Determine event type from targetScope and parameters
              if (targetScope === 'dialogue' || choiceId) {
                summary.artistChanges[artistId].eventSource = {
                  type: 'dialogue_choice',
                  sceneId: meetingName, // meetingName contains sceneId for dialogue
                  choiceId: choiceId
                };
              } else if (targetScope && ['predetermined', 'user_selected', 'global'].includes(targetScope)) {
                summary.artistChanges[artistId].eventSource = {
                  type: 'executive_meeting',
                  meetingName: meetingName
                };
              } else {
                summary.artistChanges[artistId].eventSource = {
                  type: 'other'
                };
              }
            }

            // Add comprehensive logging with all debugging context (Task 2.2 & 2.3)
            const logParts = [`target: ${artistId}`];
            if (targetScope) logParts.push(`scope: ${targetScope}`);
            if (meetingName) logParts.push(`meeting: ${meetingName}`);
            if (choiceId) logParts.push(`choice: ${choiceId}`);
            const accumulated = ArtistChangeHelpers.getMood(summary.artistChanges, artistId);
            logParts.push(`accumulated: ${accumulated > 0 ? '+' : ''}${accumulated}`);
            console.log(`[EFFECT PROCESSING] Artist mood effect: ${value > 0 ? '+' : ''}${value} (${logParts.join(', ')})`);

            // Add to summary changes for UI display (will be enriched with artist name in applyArtistChangesToDatabase)
            summary.changes.push({
              type: 'mood',
              description: `Artist morale ${value > 0 ? 'improved' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
              amount: value,
              moodChange: value,
              artistId: artistId,
              source: targetScope || 'predetermined' // Include scope for UI formatting
            });

            // Validation: Warn if accumulated changes are extreme
            if (Math.abs(accumulated) > 10) {
              console.warn(`[EFFECT VALIDATION] Large accumulated mood change for artist ${artistId}: ${accumulated}`);
            }
          } else {
            // Global targeting: Apply mood change to all signed artists (FR-15)
            // BUGFIX: Load from storage instead of non-existent gameState.artists
            const signedArtists = await new ArtistStateProcessor().loadSignedArtists(ctx);

            if (signedArtists.length === 0) {
              console.log(`[EFFECT PROCESSING] Artist mood effect: ${value > 0 ? '+' : ''}${value} (no signed artists, effect skipped)`);
              break;
            }

            // Iterate through all signed artists and apply mood change to each
            signedArtists.forEach(artist => {
              ArtistChangeHelpers.addMood(summary.artistChanges, artist.id, value);
            });

            // Add comprehensive logging for global effect (Task 2.2 & 2.3)
            const logParts = ['target: all artists', 'scope: global'];
            if (meetingName) logParts.push(`meeting: ${meetingName}`);
            if (choiceId) logParts.push(`choice: ${choiceId}`);
            logParts.push(`count: ${signedArtists.length}`);
            console.log(`[EFFECT PROCESSING] Artist mood effect: ${value > 0 ? '+' : ''}${value} (${logParts.join(', ')})`);

            // Add to summary changes for UI display (roster-wide)
            summary.changes.push({
              type: 'mood',
              description: `Artist morale ${value > 0 ? 'improved' : 'decreased'} from meeting decision (all artists, ${value > 0 ? '+' : ''}${value})`,
              amount: value,
              moodChange: value,
              source: 'global' // Include scope for UI formatting
            });

            // Validation: Warn if accumulated changes are extreme for any artist
            signedArtists.forEach(artist => {
              const artistMoodChange = ArtistChangeHelpers.getMood(summary.artistChanges, artist.id);
              if (Math.abs(artistMoodChange) > 10) {
                console.warn(`[EFFECT VALIDATION] Large accumulated mood change for ${artist.name}: ${artistMoodChange}`);
              }
            });
          }
          break;

        case 'artist_energy':
          // UNIFIED FORMAT: Apply energy change to all signed artists using per-artist objects
          // This matches the artist_mood global targeting pattern for consistency
          if (!summary.artistChanges) summary.artistChanges = {};

          // Load all signed artists to apply energy change globally
          const signedArtistsForEnergy = await new ArtistStateProcessor().loadSignedArtists(ctx);

          if (signedArtistsForEnergy.length === 0) {
            console.log(`[EFFECT PROCESSING] Artist energy effect: ${value > 0 ? '+' : ''}${value} (no signed artists, effect skipped)`);
            break;
          }

          // Apply energy change to each signed artist (per-artist object format)
          signedArtistsForEnergy.forEach(artist => {
            ArtistChangeHelpers.addEnergy(summary.artistChanges, artist.id, value);
          });

          // Add comprehensive logging
          console.log(`[EFFECT PROCESSING] Artist energy effect: ${value > 0 ? '+' : ''}${value} applied to ${signedArtistsForEnergy.length} signed artists`);

          // Add to summary changes for UI display (using mood type with energyBoost field)
          // BUGFIX: Set moodChange for UI badge display (WeekSummary uses moodChange || 0)
          summary.changes.push({
            type: 'mood',
            description: `All artists' energy ${value > 0 ? 'increased' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
            energyBoost: value,
            amount: value,
            moodChange: value // Add moodChange so UI badge shows correct value
          });

          // Validation: Warn if accumulated changes are extreme
          signedArtistsForEnergy.forEach(artist => {
            const artistEnergyChange = ArtistChangeHelpers.getEnergy(summary.artistChanges, artist.id);
            if (Math.abs(artistEnergyChange) > 10) {
              console.warn(`[EFFECT VALIDATION] Large accumulated energy change for ${artist.name}: ${artistEnergyChange}`);
            }
          });
          break;

        case 'artist_popularity':
          // UNIFIED FORMAT: Apply popularity change to all signed artists using per-artist objects
          // This matches the artist_mood global targeting pattern for consistency
          if (!summary.artistChanges) summary.artistChanges = {};

          // Load all signed artists to apply popularity change globally
          const signedArtistsForPopularity = await new ArtistStateProcessor().loadSignedArtists(ctx);

          if (signedArtistsForPopularity.length === 0) {
            console.log(`[EFFECT PROCESSING] Artist popularity effect: ${value > 0 ? '+' : ''}${value} (no signed artists, effect skipped)`);
            break;
          }

          // Apply popularity change to each signed artist (per-artist object format)
          signedArtistsForPopularity.forEach(artist => {
            ArtistChangeHelpers.addPopularity(summary.artistChanges, artist.id, value);
          });

          // Add comprehensive logging
          console.log(`[EFFECT PROCESSING] Artist popularity effect: ${value > 0 ? '+' : ''}${value} applied to ${signedArtistsForPopularity.length} signed artists`);

          // Add to summary changes for UI display
          summary.changes.push({
            type: 'popularity',
            description: `All artists' popularity ${value > 0 ? 'increased' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
            amount: value
          });

          // Validation: Warn if accumulated changes are extreme
          signedArtistsForPopularity.forEach(artist => {
            const artistPopularityChange = ArtistChangeHelpers.getPopularity(summary.artistChanges, artist.id);
            if (Math.abs(artistPopularityChange) > 10) {
              console.warn(`[EFFECT VALIDATION] Large accumulated popularity change for ${artist.name}: ${artistPopularityChange}`);
            }
          });
          break;

        case 'press_story_flag': {
          // Exec-meetings-revival PR-3 (C2) — one-shot boolean. Any positive authored
          // value sets the flag; it is consumed (and cleared) by the next release's
          // press roll in ReleaseProcessor/FinancialSystem.calculatePressPickups.
          const flags = (ctx.gameState.flags || {}) as Record<string, any>;
          if (value > 0) {
            flags.pressStoryFlag = true;
            ctx.gameState.flags = flags;

            summary.changes.push({
              type: 'meeting',
              description: 'Press story queued — next release gets a story angle boost',
              amount: 0
            });
            console.log('[EFFECT PROCESSING] press_story_flag set (flags.pressStoryFlag = true)');
          } else {
            console.log(`[EFFECT PROCESSING] press_story_flag effect with non-positive value (${value}) ignored`);
          }
          break;
        }

        case 'press_momentum': {
          // Exec-meetings-revival PR-3 (C2) — decaying pool. Accumulates across
          // meetings; feeds a small additive bonus to press-pickup chance and decays
          // −1/week toward 0 (see ActionProcessor.processDelayedEffects for the decay).
          const flags = (ctx.gameState.flags || {}) as Record<string, any>;
          const previous = typeof flags.pressMomentum === 'number' ? flags.pressMomentum : 0;
          flags.pressMomentum = previous + value;
          ctx.gameState.flags = flags;

          summary.changes.push({
            type: 'meeting',
            description: `Press buzz ${value > 0 ? 'building' : 'cooling'} (${value > 0 ? '+' : ''}${value})`,
            amount: value
          });
          console.log(`[EFFECT PROCESSING] press_momentum effect: ${value > 0 ? '+' : ''}${value} (pool now ${flags.pressMomentum})`);
          break;
        }

        default:
          // MISSING: unknown/unimplemented effect key encountered by applyEffects (PR-1 truth
          // infrastructure). 'executive_mood' is deliberately silent here — it's consumed
          // directly out of effects_immediate by processExecutiveActions, not via this switch.
          if (key !== 'executive_mood') {
            console.warn(
              `[EFFECT VALIDATION] Unknown effect key "${key}" (value: ${value}) dropped` +
              `${meetingName ? ` — meeting: ${meetingName}` : ''}${choiceId ? `, choice: ${choiceId}` : ''}${targetScope ? `, scope: ${targetScope}` : ''}`
            );
          }
          break;
      }
    }
  }

  async processDelayedEffects(ctx: WeekContext): Promise<void> {
    const { summary } = ctx;
    // Delayed effects are stored as keyed entries on flags (object map), not as an array
    try {
      const flags = (ctx.gameState.flags || {}) as Record<string, any>;
      const triggeredKeys: string[] = [];

      // Helper function to clamp values
      const clamp = (value: number, min: number, max: number): number => {
        return Math.max(min, Math.min(max, value));
      };

      for (const [key, value] of Object.entries(flags)) {
        if (
          value &&
          typeof value === 'object' &&
          'triggerWeek' in value &&
          typeof (value as any).triggerWeek === 'number' &&
          (value as any).triggerWeek === (ctx.gameState.currentWeek || 0)
        ) {
          try {
            // Check if this delayed effect has artist targeting (Task 2.5, FR-19)
            if ((value as any).artistId) {
              const artistId = (value as any).artistId;
              const effects = (value as any).effects || {};
              const targetScope = (value as any).targetScope;
              const meetingName = (value as any).meetingName;
              const choiceId = (value as any).choiceId;

              // BUGFIX: Removed gameState.artists validation (property doesn't exist)
              // Artist existence will be validated in applyArtistChangesToDatabase()
              console.log(`[DELAYED EFFECTS] Processing artist-targeted delayed effects for artist ${artistId}:`, effects);

              // Use applyEffects() with artist targeting for delayed effects (Task 2.5)
              const delayedEffectsRecord: Record<string, number> = {};
              for (const [effectKey, effectValue] of Object.entries(effects)) {
                if (typeof effectValue === 'number') {
                  delayedEffectsRecord[effectKey] = effectValue;
                }
              }

              // Apply delayed effects with artist targeting and context
              await this.applyEffects(ctx, delayedEffectsRecord, artistId, targetScope, meetingName, choiceId);

              summary.changes.push({
                type: 'delayed_effect',
                description: `Delayed effect triggered for artist ${artistId}`,
                // Exec-meetings-revival PR-2: mirror the meeting/choice context onto
                // the delayed-effect entry — already available on the flag payload.
                meetingId: meetingName,
                choiceId: choiceId,
                appliedEffects: delayedEffectsRecord
              });
            } else {
              // Old-style delayed effect (global, no scope validation)
              const globalEffects = (value as any).effects || {};
              await this.applyEffects(ctx, globalEffects, undefined, undefined);
              summary.changes.push({
                type: 'delayed_effect',
                description: 'Delayed effect triggered',
                meetingId: (value as any).meetingName,
                choiceId: (value as any).choiceId,
                appliedEffects: globalEffects
              });
            }
          } finally {
            triggeredKeys.push(key);
          }
        }
      }

      // Remove triggered delayed-effect entries while preserving other flags (like A&R discovery)
      for (const key of triggeredKeys) {
        delete flags[key];
      }

      // Exec-meetings-revival PR-3 (C2) — press_momentum weekly decay. This runs
      // once per week (processDelayedEffects is called exactly once from
      // advanceWeek), which is the natural home for flag/state maintenance that
      // isn't itself a triggered delayed-effect entry. −1/week, floors at 0.
      if (typeof flags.pressMomentum === 'number' && flags.pressMomentum !== 0) {
        const decayed = Math.max(0, flags.pressMomentum - 1);
        if (decayed !== flags.pressMomentum) {
          console.log(`[PRESS MOMENTUM] Weekly decay: ${flags.pressMomentum} -> ${decayed}`);
        }
        flags.pressMomentum = decayed;
      }

      ctx.gameState.flags = flags;
    } catch (err) {
      console.warn('[DELAYED EFFECTS] Failed to process delayed effects:', err);
    }
  }

  async processMarketing(ctx: WeekContext, action: GameEngineAction): Promise<void> {
    const { summary } = ctx;
    if (!action.details?.marketingType) return;

    const marketingType = action.details.marketingType;
    const marketingCosts = await ctx.gameData.getMarketingCosts(marketingType);
    const campaignCost = marketingCosts.min + ((marketingCosts.max - marketingCosts.min) * 0.6); // Above-average spend

    // Check if we have enough money
    if ((ctx.gameState.money || 0) < campaignCost) {
      summary.changes.push({
        type: 'expense',
        description: `Cannot afford ${marketingType} campaign - insufficient funds`,
        amount: 0
      });
      return;
    }

    // Track campaign cost for consolidated calculation
    summary.expenses += campaignCost;

    // Track marketing costs in expense breakdown
    if (!summary.expenseBreakdown) {
      summary.expenseBreakdown = {
        weeklyOperations: 0,
        artistSalaries: 0,
        executiveSalaries: 0,
        signingBonuses: 0,
        projectCosts: 0,
        marketingCosts: 0,
        roleMeetingCosts: 0
      };
    }
    summary.expenseBreakdown.marketingCosts += campaignCost;

    // Apply marketing effects based on type
    let effectDescription = '';

    switch (marketingType) {
      case 'pr_push': {
        // PR campaigns improve press pickup chances.
        // Exec-meetings-revival PR-3 (C2): press_momentum feeds this roll's chance
        // too (it's a real press-pickup draw). The one-shot pressStoryFlag is
        // deliberately NOT read/cleared here — its single consumer is the next
        // release's press roll (ReleaseProcessor.calculatePressOutcome), so a
        // player can't burn the flag early on an unrelated PR-push action.
        const pressFlags = (ctx.gameState.flags || {}) as Record<string, any>;
        const pressMomentumForPush = typeof pressFlags.pressMomentum === 'number' ? pressFlags.pressMomentum : 0;
        const pressPickups = ctx.financialSystem.calculatePressPickups(
          ctx.gameState.pressAccess || 'none',
          campaignCost,
          ctx.gameState.reputation || 0,
          false,
          () => ctx.getRandom(0, 1),
          ctx.financialSystem.getAccessChance.bind(ctx.financialSystem),
          pressMomentumForPush
        );
        if (pressPickups > 0) {
          ctx.gameState.reputation = Math.min(100, (ctx.gameState.reputation || 0) + pressPickups);
          // C45: count pickups so weeklyStats.pressMentions reflects reality.
          summary.pressMentions = (summary.pressMentions || 0) + pressPickups;
          effectDescription = `PR campaign generated ${pressPickups} press mentions`;
        } else {
          effectDescription = 'PR campaign completed - limited media pickup';
        }
        break;
      }

      case 'digital_ads':
        // Digital ads improve streaming potential
        const streamingBoost = Math.floor(campaignCost / 1000); // $1k = 1 reputation point
        ctx.gameState.reputation = Math.min(100, (ctx.gameState.reputation || 0) + streamingBoost);
        effectDescription = `Digital campaign boosted online presence (+${streamingBoost} reputation)`;
        break;

      default:
        effectDescription = `${marketingType} campaign completed`;
    }

    summary.changes.push({
      type: 'expense',
      description: effectDescription,
      amount: -campaignCost
    });
  }

  /**
   * Processes artist dialogue interactions
   */
  async processArtistDialogue(ctx: WeekContext, action: GameEngineAction): Promise<void> {
    const { summary } = ctx;
    if (!action.targetId) return;

    const artistId = action.targetId;

    // Extract scene and choice IDs from metadata
    const { sceneId, choiceId } = action.metadata || {};

    if (!sceneId || !choiceId) {
      console.log(`[GAME-ENGINE] Missing required IDs for dialogue - sceneId: ${sceneId}, choiceId: ${choiceId}`);
      return;
    }

    console.log(`[GAME-ENGINE] Processing artist dialogue - Artist: ${artistId}, Scene: ${sceneId}, Choice: ${choiceId}`);

    // Load the actual dialogue choice from dialogue.json
    const choice = await ctx.gameData.getDialogueChoiceById(sceneId, choiceId);

    if (!choice) {
      console.error(`[GAME-ENGINE] Dialogue choice not found for sceneId: ${sceneId}, choiceId: ${choiceId}`);
      // Fallback to minimal stub to prevent crashes
      const fallbackChoice = {
        effects_immediate: { artist_mood: -1 },
        effects_delayed: {}
      };
      console.log(`[GAME-ENGINE] Using fallback dialogue choice data`);

      // Apply fallback effects and return
      if (fallbackChoice.effects_immediate) {
        const effects: Record<string, number> = {};
        for (const [key, value] of Object.entries(fallbackChoice.effects_immediate)) {
          if (typeof value === 'number') {
            effects[key] = value;
          }
        }
        await this.applyEffects(ctx, effects, artistId, 'dialogue', sceneId, choiceId); // Pass all context for logging (Task 2.2)
      }
      return;
    }

    console.log(`[GAME-ENGINE] Loaded dialogue choice data:`, {
      sceneId,
      choiceId,
      immediateEffects: choice.effects_immediate,
      delayedEffects: choice.effects_delayed
    });

    // Apply immediate effects using the standard applyEffects method
    // This handles artist_mood, artist_energy, creative_capital, etc.
    if (choice.effects_immediate) {
      const effects: Record<string, number> = {};
      for (const [key, value] of Object.entries(choice.effects_immediate)) {
        if (typeof value === 'number') {
          effects[key] = value;
        }
      }
      await this.applyEffects(ctx, effects, artistId, 'dialogue', sceneId, choiceId); // Pass all context for logging (Task 2.2)
    }

    // Queue delayed effects for next week with artist targeting (Task 2.5)
    if (choice.effects_delayed) {
      const flags = ctx.gameState.flags || {};
      const delayedKey = `${artistId}-${sceneId}-${choiceId}-delayed`;
      (flags as any)[delayedKey] = {
        triggerWeek: (ctx.gameState.currentWeek || 0) + 1,
        effects: choice.effects_delayed,
        artistId: artistId, // Preserve artist targeting
        targetScope: 'dialogue', // Dialogue is always per-artist
        meetingName: sceneId, // Scene ID as meeting name for logging
        choiceId: choiceId
      };
      ctx.gameState.flags = flags;
    }

    // Add dialogue completion to summary
    summary.changes.push({
      type: 'meeting',
      description: `Artist conversation completed`,
      roleId: artistId
    });
  }
}
