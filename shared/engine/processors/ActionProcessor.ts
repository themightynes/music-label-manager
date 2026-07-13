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
import { seededRandom } from '../../utils/seededRandom';
import { scaleReputationGain } from '../../utils/reputationScaling';
import {
  getMoodModifiers,
  applyMoodModifiersToEffects,
  isNeutral,
  type MoodModifiers,
} from '../../utils/executiveMoodModifier';
import { DEFAULT_EXEC_DELEGATION_CONFIG } from '../../utils/executiveDelegation';
import { pickTargetReleasedSong, pickLatestReleasedRelease } from '../releaseTargeting';
import {
  readInventoryLedger,
  readRevenueTransfers,
  normalizeTransferFraction,
  PHYSICAL_INVENTORY_DEFAULTS,
  REVENUE_TRANSFER_DEFAULTS,
  type InventoryLedgerEntry,
  type RevenueTransferEntry,
} from '../flagsLedgers';

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
  'press_momentum',
  // Exec-meetings-revival PR-4 (C1 — next-release quality channel):
  'quality_bonus',
  // Exec-meetings-revival PR-5 (C3 — next-release awareness channel):
  'awareness_boost',
  // Exec-meetings-revival PR-6 (C4 — outcome variance/risk channel):
  'variance_up',
  'rep_swing',
  // Exec-meetings-revival PR-7 (C5 — prestige/award track):
  'award_chances',
  // Engine-verbs arc Tier 2 (live-economy verbs — the first BACKWARD-acting
  // channels; every key above banks toward a future recording/release, these
  // act on rows that already exist):
  // Slice 8 (M5): clamped awareness bump to the targeted currently-released song.
  'promote_release',
  // Slice 8 (M12): severity-scaled awareness loss on the targeted released song.
  'catalog_damage',
  // Slice 9 (M6): soft-cancel the targeted artist's active recording project.
  'cancel_project',
  // Slice 10 (M9): press physical units against the latest release (flags.inventory ledger).
  'grant_inventory',
  // Slice 10 (M11): sell a share of a release's weekly streaming revenue
  // (flags.revenue_transfers ledger).
  'transfer_revenue_stream'
]);

/**
 * Player-facing explanations for every effect channel, keyed by effect key.
 *
 * LEGIBILITY Slice A (at-choice explanation): the exec-meeting badges tell a
 * player WHICH channel a choice touches, but not what that channel DOES, WHEN it
 * fires, or WHERE it lands. This map is the single home for that vocabulary — a
 * tooltip on each effect badge reads its `text` from here.
 *
 * It is co-located with {@link LIVE_EFFECT_KEYS} on purpose: the two must stay in
 * lockstep (a channel that goes live needs a description; a channel that is
 * removed must lose one). The drift-guard test
 * (`tests/engine/effect-descriptions.test.ts`) asserts this map's keys are
 * EXACTLY `LIVE_EFFECT_KEYS ∪ {executive_mood}` — the same canonical vocabulary
 * the data-lint test enforces on the authored JSON.
 *
 * Copy conventions (match the game's existing player-facing voice):
 *   - second person, concise, no dev jargon, no internal key names;
 *   - `title` is the badge's human label; `text` covers what it does + when it
 *     fires + where it lands;
 *   - self-explanatory channels (exec mood, rep gamble, base resources) still get
 *     an entry (the guard requires total coverage), just a shorter one.
 *
 * Timing vocabulary used in the copy — the four lifecycles from the legibility
 * spec: INSTANT (this week), banks to the next RECORDING SESSION, banks to the
 * next RELEASE, or ACCUMULATES to campaign end. Magnitudes quoted here are
 * balance-JSON knobs (verified against data/balance/*.json at authoring time);
 * keep them in sync with the canonical reference if the knobs are tuned.
 */
export interface EffectChannelDescription {
  /** Human-facing channel name (matches the badge label). */
  title: string;
  /** One-to-two sentence explanation: what it does, when it fires, where it lands. */
  text: string;
}

export const EFFECT_CHANNEL_DESCRIPTIONS: Readonly<Record<string, EffectChannelDescription>> = {
  // --- Base resources (self-explanatory; short entries) ---
  money: {
    title: 'Money',
    text: 'Your cash balance, applied instantly. Spend it now or bank a windfall.',
  },
  reputation: {
    title: 'Reputation',
    text: 'Your label\'s standing in the industry, applied instantly. Higher reputation opens better access and press.',
  },
  creative_capital: {
    title: 'Creative Capital',
    text: 'The currency for creative moves, applied instantly. Spent to fund artistic bets.',
  },
  artist_mood: {
    title: 'Mood',
    text: 'How happy the affected artist is, applied instantly. Happier artists perform better; unhappy ones drift, and low mood also makes recordings less predictable.',
  },
  artist_energy: {
    title: 'Energy',
    text: 'The affected artist\'s energy, applied instantly. Low energy drags down their work.',
  },
  artist_popularity: {
    title: 'Popularity',
    text: 'The affected artist\'s fame, applied instantly. More popular artists pull bigger numbers.',
  },
  // --- Exec-meetings-revival channels ---
  executive_mood: {
    title: 'Exec Mood',
    text: 'How this executive feels about you, applied instantly. A happy exec makes their meetings cheaper and their effects hit harder; a sour one makes everything cost more.',
  },
  press_story_flag: {
    title: 'Press Story',
    text: 'Lines up a press angle that boosts the odds of coverage on your next release. Waits in the wings until that release, then fires once — win or lose. Expires if unused after about two months.',
  },
  press_momentum: {
    title: 'Press Buzz',
    text: 'Ongoing press momentum that raises your coverage odds on every release while it lasts. It builds up as you feed it and cools off a little each week, so keep it warm.',
  },
  quality_bonus: {
    title: 'Quality',
    text: 'A quality boost banked for your next recording session — it lifts every song you record that week, then is spent. A negative value drags that session down. Expires if you don\'t record within about two months.',
  },
  awareness_boost: {
    title: 'Buzz',
    // Awareness slice 3 (fork C): the closing clause cross-references the OTHER
    // "Buzz" — a released song's live awareness stat (SongCatalog chip / release
    // cards), whose tooltip (SONG_BUZZ_TOOLTIP in client/src/lib/releaseBuzz.ts)
    // points back here. Display copy only; no engine behavior.
    text: 'Pre-release buzz banked as Hype — it seeds a release with extra early awareness, which drives more streams out of the gate. When this meeting targets an artist, the Hype banks for THAT artist\'s next planned release; otherwise it banks for your label\'s next planned release. Applied when you plan that release, then spent. Expires unused after about two months. (Separate from a released song\'s live Buzz stat, which this seeds.)',
  },
  variance_up: {
    title: 'Volatility',
    text: 'Widens the range of outcomes on your next recording session — bigger chance of a breakout hit, but also a bigger chance of a flop. It doesn\'t change the average, only the swing. Banked until that session, then spent.',
  },
  rep_swing: {
    title: 'Rep Gamble',
    text: 'A reputation gamble settled right away: the badge shows the swing size, and you\'ll land somewhere between losing and gaining that amount. Pure risk — no guaranteed direction.',
  },
  award_chances: {
    title: 'Prestige',
    text: 'Prestige points toward the end-of-campaign awards. They accumulate all game long, never expire, and pay off in one roll at the finish — more prestige, better odds of winning an award.',
  },
  // --- Engine-verbs arc Tier 2 (live-economy verbs) ---
  promote_release: {
    title: 'Catalog Push',
    text: 'A promotional push behind music you already have out. It lifts the buzz of your hottest released song right away — when this meeting targets an artist, it lifts THAT artist\'s hottest released track — feeding its streams from here on. Does nothing if nothing is out yet.',
  },
  catalog_damage: {
    title: 'Catalog Hit',
    text: 'Damage to music you already have out. Your hottest released song loses buzz immediately — when this targets an artist, it\'s THAT artist\'s hottest released track — and its streams suffer from here on. Does nothing if nothing is out yet.',
  },
  cancel_project: {
    title: 'Project Shutdown',
    text: 'Pulls the plug on the targeted artist\'s active recording project, effective now. Money already spent stays spent, and any songs already recorded are kept — but no more will come from that project.',
  },
  grant_inventory: {
    title: 'Physical Pressing',
    text: 'Presses a physical run tied to the latest release — you pay manufacturing up front, then units sell week by week (faster while the release is buzzing) until they sell out. Stock left on the shelf too long gets written off.',
  },
  transfer_revenue_stream: {
    title: 'Catalog Share Sale',
    text: 'Sells a slice of a released record\'s future streaming income. Every week for the term of the deal, that share of the release\'s streaming revenue goes to the buyer instead of you.',
  },
};

/**
 * Playtest bug #1 fix (2026-07-04): the mood/loyalty deltas an executive meeting
 * produces, returned by {@link ActionProcessor.processExecutiveActions} so the
 * single 'meeting' change entry can carry them (instead of a duplicate
 * 'executive_interaction' "Met with <slug>" row).
 */
export interface ExecutiveInteractionResult {
  moodChange: number;
  newMood: number;
  loyaltyBoost: number;
  newLoyalty: number;
}

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

    // Exec-meetings-revival PR-9 (C6/D) — executive-mood meeting-outcome modifier.
    // HOIST the executive fetch ABOVE effect application so the exec's CURRENT mood
    // can scale this meeting's numeric effects and delayed queue BEFORE they land.
    // CEO meetings have no executive row → no modifier ever. The already-fetched
    // executive is threaded into processExecutiveActions to avoid a double-fetch
    // (its mood/loyalty update semantics stay byte-identical — see that method).
    const executiveId = action.metadata?.executiveId;
    const roleIdForExec = action.metadata?.roleId;
    let executiveForMeeting: any = null;
    if (roleIdForExec !== 'ceo' && executiveId) {
      executiveForMeeting = await ctx.storage.getExecutive(executiveId, dbTransaction);
    }

    // Compute the mood modifiers (neutral no-op when no exec row / mood 30-80).
    let moodModifiers: MoodModifiers | null = null;
    if (executiveForMeeting && typeof executiveForMeeting.mood === 'number') {
      const config = ctx.gameData.getExecMoodModifierConfigSync();
      moodModifiers = getMoodModifiers(executiveForMeeting.mood, config);
      if (!isNeutral(moodModifiers)) {
        console.log(
          `[EXEC MOOD MODIFIER] ${executiveForMeeting.role} mood ${executiveForMeeting.mood} → ` +
          `band=${moodModifiers.band}, costMultiplier=${moodModifiers.costMultiplier}, ` +
          `effectMultiplier=${moodModifiers.effectMultiplier}`
        );
      }
    }
    const modifierFired = moodModifiers != null && !isNeutral(moodModifiers);

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
      // PR-9: transform through the shared mood util BEFORE applyEffects so the
      // scaled numbers are what actually land (and match the client Impact Preview,
      // which routes the same util). Neutral/no-exec → identity transform.
      const immediateToApply = moodModifiers
        ? applyMoodModifiersToEffects(appliedEffects, moodModifiers)
        : appliedEffects;
      // Reflect the scaled numbers in the summary too.
      if (moodModifiers) {
        for (const key of Object.keys(appliedEffects)) {
          appliedEffects[key] = immediateToApply[key];
        }
      }
      await this.applyEffects(ctx, immediateToApply, targetArtistId, targetScope, meetingName, choiceId); // Pass all context for logging

      // Volatility-economy slice 3: applyEffects throttles POSITIVE reputation
      // gains through the global scaling helper. Reflect the SAME scaled value back
      // into appliedEffects (the meeting badge) so it shows what actually landed,
      // not the pre-scaling magnitude. Done AFTER applyEffects so we never mutate
      // the value it consumes (immediateToApply === appliedEffects when there is no
      // mood modifier — mutating before would double-scale). Losses are untouched.
      if (typeof appliedEffects.reputation === 'number') {
        const repCfg = (ctx.gameData.getBalanceConfigSync?.() as any)?.reputation_system;
        appliedEffects.reputation = scaleReputationGain(appliedEffects.reputation, repCfg);
      }

      // Digest honesty (playtest-revision 2026-07-12 round 3, Entry 4): the exec-
      // mood self-effect is surfaced by the dedicated moodChange badge on this
      // change entry (execResult below), so carrying the authored `executive_mood`
      // in appliedEffects too renders a DUPLICATE "Exec Mood" badge on player
      // meetings. Worse, on an AUTONOMOUS (neglect) resolution the authored value
      // no longer lands on the exec at all (neglect_mood_gain 0) — leaving it here
      // would show a PHANTOM exec-mood delta. Drop it from the display record; the
      // real self-effect (0 for neglect) rides on execResult.moodChange.
      delete (appliedEffects as any).executive_mood;
    }

    // Queue delayed effects with artist targeting support (Task 2.5, FR-19)
    if (choice.effects_delayed) {
      const flags = ctx.gameState.flags || {};
      const delayedKey = `${action.targetId}-${choiceId}-delayed`;
      // PR-9: scale delayed effects AT QUEUE TIME so the stored flag entry holds the
      // already-scaled values — downstream consumption (processDelayedEffects) stays
      // untouched and never needs to know about mood.
      const delayedEffects = moodModifiers
        ? applyMoodModifiersToEffects(choice.effects_delayed as Record<string, number>, moodModifiers)
        : choice.effects_delayed;
      (flags as any)[delayedKey] = {
        triggerWeek: (ctx.gameState.currentWeek || 0) + 1,
        effects: delayedEffects,
        artistId: targetArtistId, // Preserve artist targeting for delayed effects
        targetScope: targetScope, // Preserve scope for validation
        meetingName: meetingName, // Preserve context for logging
        choiceId: choiceId
      };
      ctx.gameState.flags = flags;
    }

    // Process executive-specific updates (mood, loyalty)
    // This happens after choice effects are applied
    // Pass choice data so we can extract mood effects, and the ALREADY-FETCHED
    // executive (PR-9) so processExecutiveActions doesn't re-fetch the row.
    const actionWithChoice = {
      ...action,
      metadata: {
        ...action.metadata,
        choiceEffects: choice
      }
    };
    // Playtest bug #1 fix: capture the exec mood/loyalty deltas instead of letting
    // processExecutiveActions push its own duplicate 'executive_interaction' row.
    const execResult = await this.processExecutiveActions(ctx, actionWithChoice, dbTransaction, executiveForMeeting);

    // Playtest bug #7 fix: the player IS the CEO, so "Met with CEO" is nonsensical.
    // Frame a CEO meeting as a solo executive decision rather than a meeting with
    // a hired executive. Non-CEO meetings keep the "Met with <role>" copy.
    const isCeoMeeting = roleId === 'ceo';
    // Executive Delegation arc (Tier 1, §4.6): an autonomously-resolved meeting
    // (the exec ran it while you were out) gets a distinct qualitative
    // description and an additive `autonomous: true` marker so the WeekSummary can
    // group it under "While you were out". Prose stays qualitative (no numbers —
    // the effect badges carry the magnitudes, house regex rule).
    const isAutonomous = action.metadata?.autonomous === true;
    const baseDescription = isAutonomous
      // Playtest-revision (2026-07-12, Entry 1): drop the "while you were out"
      // fiction — the player objected it isn't that they were "out", just that the
      // decision was made without their involvement.
      ? `${roleName} handled this on their own`
      : isCeoMeeting
      ? 'Executive strategy decision'
      : `Met with ${roleName}`;

    summary.changes.push({
      type: 'meeting',
      // Autonomous entries stay qualitative (no numeric mood-band suffix in the
      // prose); the moodBand/effectMultiplier fields below still ride along so the
      // client can render the modifier note as a badge.
      description: (!isAutonomous && modifierFired)
        ? `${baseDescription} — ${this.moodBandDescription(moodModifiers!, executiveForMeeting)}`
        : baseDescription,
      ...(isAutonomous ? { autonomous: true } : {}),
      roleId: roleId,
      // Exec-meetings-revival PR-2: enrichment so the WeekSummary meetings card has
      // real content — which meeting, which choice, and what it actually did.
      meetingId: actionId,
      choiceId: choiceId,
      choiceLabel: (choice as any).label,
      // C92: authored past-tense outcome line. CONDITIONAL spread — an
      // always-present undefined key would diff every golden-master fixture
      // (WeekSummary is snapshotted verbatim; see the _pendingEscalation
      // precedent in game-engine.ts).
      ...((choice as any).outcome_summary
        ? { outcomeSummary: (choice as any).outcome_summary }
        : {}),
      appliedEffects,
      // Playtest bug #1 fix: fold the exec mood/loyalty deltas onto this single
      // 'meeting' entry (CEO meetings have no executive → execResult is null).
      ...(execResult
        ? {
            moodChange: execResult.moodChange,
            newMood: execResult.newMood,
            loyaltyBoost: execResult.loyaltyBoost,
            newLoyalty: execResult.newLoyalty,
          }
        : {}),
      // Exec-meetings-revival PR-9: carry the mood-modifier context so the
      // WeekSummary meetings card can note it fired. Optional/additive.
      ...(modifierFired
        ? {
            moodBand: moodModifiers!.band,
            costMultiplier: moodModifiers!.costMultiplier,
            effectMultiplier: moodModifiers!.effectMultiplier,
          }
        : {})
    });
  }

  /**
   * Exec-meetings-revival PR-9 — human copy for a fired mood modifier, used in the
   * 'meeting' change description. Kept out of the shared util (that stays pure/data)
   * because it's engine-facing prose.
   */
  private moodBandDescription(modifiers: MoodModifiers, executive: any): string {
    const name = executive?.role ? String(executive.role).toUpperCase() : 'The exec';
    switch (modifiers.band) {
      case 'inspired':
        return `${name} was inspired — effects amplified ${Math.round((modifiers.effectMultiplier - 1) * 100)}%`;
      case 'content':
        return `${name} was content — costs cut ${Math.round((1 - modifiers.costMultiplier) * 100)}%`;
      case 'disgruntled':
        return `${name} was disgruntled — costs up ${Math.round((modifiers.costMultiplier - 1) * 100)}%`;
      default:
        return '';
    }
  }

  /**
   * Playtest bug #3 fix (2026-07-04): builds a descriptive label for a delayed-effect
   * payoff instead of the bare "Delayed effect triggered" placeholder. Resolves the
   * originating meeting's human name and, when available, the chosen option's label
   * from the delayed-effect flag's stored context (meetingName = actionId, choiceId).
   * Falls back gracefully when the meeting/choice can't be resolved (e.g. dialogue
   * scenes, or legacy flags missing context) so a payoff is never left unlabeled.
   */
  private async describeDelayedEffect(
    ctx: WeekContext,
    meetingName: string | undefined,
    choiceId: string | undefined
  ): Promise<string> {
    let meetingLabel: string | undefined;
    let choiceLabel: string | undefined;

    if (meetingName) {
      try {
        const actionData = await ctx.gameData.getActionById(meetingName);
        meetingLabel = actionData?.name;
        if (choiceId) {
          const choice = await ctx.gameData.getChoiceById(meetingName, choiceId);
          // C92: prefer the authored past-tense outcome line for payoff
          // attribution; fall back to the raw option label.
          choiceLabel = (choice as any)?.outcome_summary ?? (choice as any)?.label;
        }
      } catch {
        // Resolution is best-effort — fall through to the generic label below.
      }
    }

    if (meetingLabel && choiceLabel) {
      return `Delayed effect: ${meetingLabel} — ${choiceLabel}`;
    }
    if (meetingLabel) {
      return `Delayed effect: ${meetingLabel}`;
    }
    return 'Delayed effect triggered';
  }

  /**
   * Processes executive-specific effects from actions
   * Updates mood, loyalty, and lastActionWeek when executives are used
   */
  async processExecutiveActions(
    ctx: WeekContext,
    action: GameEngineAction,
    dbTransaction?: any,
    // Exec-meetings-revival PR-9: the caller (processRoleMeeting) already fetched the
    // executive row (to compute the mood modifier BEFORE effects landed) — thread it
    // in to avoid a redundant second getExecutive round-trip. When omitted (direct
    // callers/tests), we fall back to fetching, so behavior is byte-identical to before.
    prefetchedExecutive?: any
  ): Promise<ExecutiveInteractionResult | null> {
    // Playtest bug #1 fix (2026-07-04): this method NO LONGER pushes its own
    // 'executive_interaction' "Met with <slug>" change. That produced a DUPLICATE
    // meeting row in the WeekSummary meetings card — one entry with the raw role
    // slug (e.g. "head_ar") carrying the real +Mood/+Loyalty deltas, and a second
    // "Met with Head of A&R" (the 'meeting' entry) carrying only the choice effects.
    // Instead it RETURNS the mood/loyalty deltas so the single 'meeting' change
    // pushed by processRoleMeeting can carry them, and the exec updates still persist.
    const { summary } = ctx;
    // Skip CEO meetings - player IS the CEO, no executive to update
    const roleId = action.metadata?.roleId;
    if (roleId === 'ceo') {
      console.log('[GAME-ENGINE] CEO meeting - player is the CEO, no executive to update');
      return null;
    }

    const executiveId = action.metadata?.executiveId;
    if (!executiveId) {
      console.log('[GAME-ENGINE] No executiveId in action metadata, skipping executive processing');
      return null;
    }

    console.log('[GAME-ENGINE] Processing executive actions for executiveId:', executiveId);

    // Executive Delegation arc — playtest-revision (2026-07-12 round 3): only a
    // PLAYER-attended (manual OR AUTO-endorsed) meeting marks the exec "used" this
    // week. A NEGLECTED (autonomous self-served) meeting does NOT — being used
    // suppresses BOTH idle loyalty-decay AND passive mood-drift (ArtistStateProcessor
    // .processExecutiveMoodDecay reads summary.usedExecutives), and sustained neglect
    // must instead erode loyalty and drift mood toward 50. So neglect no longer
    // counts as engagement (§4.5). This does NOT risk double-processing: the
    // autonomous-resolution candidate list is computed ONCE before its loop
    // (game-engine.resolveAutonomousExecMeetings) and never re-reads usedExecutives.
    const isAutonomous = action.metadata?.autonomous === true;
    if (!isAutonomous) {
      // Track that this executive was engaged by the player this week.
      (summary as any).usedExecutives.add(executiveId);
    }

    // Get executive from database (PR-9: reuse the caller's fetch when provided).
    const executive = prefetchedExecutive ?? await ctx.storage.getExecutive(executiveId, dbTransaction);
    if (!executive) {
      console.log('[GAME-ENGINE] Executive not found:', executiveId);
      return null;
    }

    console.log('[GAME-ENGINE] Current executive state:', {
      role: executive.role,
      mood: executive.mood,
      loyalty: executive.loyalty
    });

    // Executive Delegation arc (Tier 1, §3.4): the mood/loyalty knobs are config
    // now, not hardcoded literals (defaults equal the former +5s → byte-identical).
    const delegationCfg = ctx.gameData.getExecDelegationConfigSync?.() ?? DEFAULT_EXEC_DELEGATION_CONFIG;

    // Apply mood changes from executive-specific choice effects
    let moodChange = 0;
    const choiceEffects = action.metadata?.choiceEffects;
    if (isAutonomous) {
      // NEGLECT path (playtest-revision 2026-07-12 round 3): the exec's personal
      // engagement reward is neglect_mood_gain (default 0) — the authored
      // executive_mood and mood_default_delta do NOT apply to a self-served
      // meeting. This stops neglect from ratcheting mood to the cap; combined
      // with the (now un-suppressed) passive drift, sustained neglect lets mood
      // erode toward 50 (§4.5).
      moodChange = delegationCfg.neglect_mood_gain;
      console.log('[GAME-ENGINE] Autonomous (neglect) resolution — neglect_mood_gain:', moodChange);
    } else if (choiceEffects?.effects_immediate?.executive_mood) {
      // Use executive-specific mood effect if available
      moodChange = choiceEffects.effects_immediate.executive_mood;
      console.log('[GAME-ENGINE] Applied executive_mood effect:', moodChange);
    } else {
      // Default positive boost for interaction (mood_default_delta) — an exec the
      // player engaged (manual OR AUTO-endorsed) feels engaged (§4.4).
      moodChange = delegationCfg.mood_default_delta;
      console.log('[GAME-ENGINE] Applied default executive interaction boost:', moodChange);
    }

    const newMood = Math.max(0, Math.min(100, executive.mood + moodChange));

    // Loyalty gain for engagement (§4.5): a player-attended / AUTO-endorsed
    // meeting grants loyalty_on_use; a NEGLECTED (autonomously self-served)
    // meeting grants neglect_loyalty_gain (default 0 — a self-serve is not
    // endorsement). AUTO-endorse is indistinguishable from a manual pick
    // server-side (both arrive as ordinary role_meeting actions with no
    // `autonomous` marker), so both use loyalty_on_use; auto_endorse_loyalty_gain
    // is a reserved knob if playtest shows AUTO should differ.
    const loyaltyGain = isAutonomous ? delegationCfg.neglect_loyalty_gain : delegationCfg.loyalty_on_use;
    const newLoyalty = Math.min(100, executive.loyalty + loyaltyGain);

    // Update last action week — ONLY on a player-engaged meeting. A neglected
    // (autonomous) resolution must NOT refresh lastActionWeek (playtest-revision
    // 2026-07-12 round 3): leaving it stale is what lets idle loyalty-decay keep
    // firing under sustained neglect, so neglect costs control + loyalty over time
    // rather than parking the exec's stats (§4.1/§4.5).
    const currentWeek = ctx.gameState.currentWeek || 1;

    console.log('[GAME-ENGINE] Updating executive:', {
      moodChange,
      newMood,
      newLoyalty,
      lastActionWeek: isAutonomous ? '(unchanged — neglect)' : currentWeek,
    });

    // Save changes to database
    await ctx.storage.updateExecutive(
      executive.id,
      {
        mood: newMood,
        loyalty: newLoyalty,
        // Neglect leaves lastActionWeek untouched so decay continues to accrue.
        ...(isAutonomous ? {} : { lastActionWeek: currentWeek }),
      },
      dbTransaction
    );

    console.log('[GAME-ENGINE] Executive updated successfully');

    // Playtest bug #1 fix: return the deltas for processRoleMeeting to fold into
    // the single 'meeting' change entry, instead of pushing a duplicate
    // 'executive_interaction' "Met with <slug>" row here.
    return { moodChange, newMood, loyaltyBoost: loyaltyGain, newLoyalty };
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
        case 'reputation': {
          // Volatility-economy slice 3: throttle POSITIVE meeting reputation gains
          // through the shared global gain-scaling helper. A negative meeting effect
          // (reputation loss) passes through unscaled.
          const repSystemCfg = (ctx.gameData.getBalanceConfigSync?.() as any)?.reputation_system;
          const scaledValue = scaleReputationGain(value, repSystemCfg);
          ctx.gameState.reputation = Math.max(0, Math.min(100, (ctx.gameState.reputation || 0) + scaledValue));
          // Track reputation changes in summary for analysis
          if (!summary.reputationChanges) {
            summary.reputationChanges = {};
          }
          const targetKey = artistId || 'global';
          summary.reputationChanges[targetKey] = (summary.reputationChanges[targetKey] || 0) + scaledValue;
          break;
        }
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
          // Per-artist energy targeting (C60): mirrors artist_mood's artistId-targeting
          // branch above — when an artistId is present (e.g. a delayed effect from a
          // one-on-one artist dialogue), apply only to that artist. Otherwise, preserve
          // the existing apply-to-all-signed-artists behavior (role meetings legitimately
          // target the whole roster).
          if (!summary.artistChanges) summary.artistChanges = {};

          if (artistId) {
            // Per-artist targeting: Apply energy change to specific artist
            ArtistChangeHelpers.addEnergy(summary.artistChanges, artistId, value);

            console.log(`[EFFECT PROCESSING] Artist energy effect: ${value > 0 ? '+' : ''}${value} (target: ${artistId})`);

            // Add to summary changes for UI display (using mood type with energyBoost field)
            // BUGFIX: Set moodChange for UI badge display (WeekSummary uses moodChange || 0)
            summary.changes.push({
              type: 'mood',
              description: `Artist energy ${value > 0 ? 'increased' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
              energyBoost: value,
              amount: value,
              moodChange: value, // Add moodChange so UI badge shows correct value
              artistId: artistId
            });

            // Validation: Warn if accumulated changes are extreme
            const artistEnergyChange = ArtistChangeHelpers.getEnergy(summary.artistChanges, artistId);
            if (Math.abs(artistEnergyChange) > 10) {
              console.warn(`[EFFECT VALIDATION] Large accumulated energy change for artist ${artistId}: ${artistEnergyChange}`);
            }
          } else {
            // UNIFIED FORMAT: Apply energy change to all signed artists using per-artist objects
            // This matches the artist_mood global targeting pattern for consistency
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
          }
          break;

        case 'artist_popularity':
          // Per-artist popularity targeting (C60): mirrors artist_mood's artistId-targeting
          // branch above — when an artistId is present (e.g. a delayed effect from a
          // one-on-one artist dialogue), apply only to that artist. Otherwise, preserve
          // the existing apply-to-all-signed-artists behavior (role meetings legitimately
          // target the whole roster).
          if (!summary.artistChanges) summary.artistChanges = {};

          if (artistId) {
            // Per-artist targeting: Apply popularity change to specific artist
            ArtistChangeHelpers.addPopularity(summary.artistChanges, artistId, value);

            console.log(`[EFFECT PROCESSING] Artist popularity effect: ${value > 0 ? '+' : ''}${value} (target: ${artistId})`);

            // Add to summary changes for UI display
            summary.changes.push({
              type: 'popularity',
              description: `Artist popularity ${value > 0 ? 'increased' : 'decreased'} from meeting decision (${value > 0 ? '+' : ''}${value})`,
              amount: value,
              artistId: artistId
            });

            // Validation: Warn if accumulated changes are extreme
            const artistPopularityChange = ArtistChangeHelpers.getPopularity(summary.artistChanges, artistId);
            if (Math.abs(artistPopularityChange) > 10) {
              console.warn(`[EFFECT VALIDATION] Large accumulated popularity change for artist ${artistId}: ${artistPopularityChange}`);
            }
          } else {
            // UNIFIED FORMAT: Apply popularity change to all signed artists using per-artist objects
            // This matches the artist_mood global targeting pattern for consistency
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
          }
          break;

        case 'press_story_flag': {
          // Exec-meetings-revival PR-3 (C2) — one-shot boolean. Any positive authored
          // value sets the flag; it is consumed (and cleared) by the next release's
          // press roll in ReleaseProcessor/FinancialSystem.calculatePressPickups.
          const flags = (ctx.gameState.flags || {}) as Record<string, any>;
          if (value > 0) {
            flags.pressStoryFlag = true;
            // Phase B fix-2: stamp for the expiry check in processDelayedEffects.
            flags.pressStoryFlagWeek = ctx.gameState.currentWeek || 0;
            ctx.gameState.flags = flags;

            summary.changes.push({
              type: 'meeting',
              description: 'Press story queued — next release gets a story angle boost',
              amount: 0,
              appliedEffects: { press_story_flag: 1 }
            });
            console.log('[EFFECT PROCESSING] press_story_flag set (flags.pressStoryFlag = true)');
          } else {
            console.log(`[EFFECT PROCESSING] press_story_flag effect with non-positive value (${value}) ignored`);
          }
          break;
        }

        case 'quality_bonus': {
          // Exec-meetings-revival PR-4 (C1) — next-release quality channel. Signed
          // points bank into flags.pendingQualityBonus; consumed as an ADDITIVE
          // post-formula bonus (then clamped) by every song generated in the week
          // that first consumes it (SongGenerationProcessor.calculateEnhancedSongQuality
          // + the zero-out in processRecordingProjects). Stamps pendingQualityBonusWeek
          // so processDelayedEffects can expire an unconsumed bank after N weeks
          // (pending_quality_bonus_expiry_weeks, data/balance/quality.json).
          const flags = (ctx.gameState.flags || {}) as Record<string, any>;
          const previous = typeof flags.pendingQualityBonus === 'number' ? flags.pendingQualityBonus : 0;
          flags.pendingQualityBonus = previous + value;
          flags.pendingQualityBonusWeek = ctx.gameState.currentWeek || 0;
          ctx.gameState.flags = flags;

          summary.changes.push({
            type: 'meeting',
            description: `Studio focus ${value > 0 ? 'banked' : 'cost'} ${value > 0 ? '+' : ''}${value} quality for the next recording session`,
            amount: value,
            appliedEffects: { quality_bonus: value }
          });
          console.log(`[EFFECT PROCESSING] quality_bonus effect: ${value > 0 ? '+' : ''}${value} (pool now ${flags.pendingQualityBonus}, stamped week ${flags.pendingQualityBonusWeek})`);
          break;
        }

        case 'awareness_boost': {
          // Exec-meetings-revival PR-5 (C3) — next-release awareness channel. Signed
          // authored points bank into a hype pool; consumed at PLAN time
          // (releasePlanningService.planRelease attaches the pool onto the release
          // metadata) OR — for legacy releases planned before buzz-v2 slice 2 — at
          // the release-week path (ReleaseProcessor.processPlannedReleases), where
          // each released song's INITIAL awareness is seeded by the attached/banked
          // pool × awareness_boost_points_per_unit (×8), clamped at 0 (a negative
          // pool suppresses discovery but never drives awareness below zero). Riding
          // the live awareness economy, that seed multiplies weekly streams up to 2×
          // (weeks 1-4 build path + the awareness stream multiplier). Stamps a week
          // so processDelayedEffects can expire an unconsumed bank after N weeks
          // (pending_awareness_boost_expiry_weeks, data/balance/markets.json).
          //
          // Buzz-v2 slice 2 (fork A) — ARTIST SCOPING. When this meeting targets a
          // specific artist (target_scope: user_selected, so `artistId` is the
          // player-picked artist), the boost banks to THAT artist's pool
          // (flags.hypeArtistPools[artistId] = { amount, week }); only that artist's
          // next-planned release consumes it. Truly global meetings (no user_selected
          // artist) keep banking to the label-wide pool (flags.pendingAwarenessBoost),
          // consumed by whichever release is planned first (fork B: first-planned
          // takes all). Artist pools are a NEW additive key; the label pool keys are
          // unchanged so old saves and existing tests keep working.
          const flags = (ctx.gameState.flags || {}) as Record<string, any>;
          const currentWeek = ctx.gameState.currentWeek || 0;
          const artistScoped = targetScope === 'user_selected' && !!artistId;

          let poolTotal: number;
          let scopeLabel: string;
          if (artistScoped) {
            const pools = (flags.hypeArtistPools && typeof flags.hypeArtistPools === 'object')
              ? flags.hypeArtistPools as Record<string, { amount: number; week: number }>
              : {};
            const prev = typeof pools[artistId!]?.amount === 'number' ? pools[artistId!].amount : 0;
            pools[artistId!] = { amount: prev + value, week: currentWeek };
            flags.hypeArtistPools = pools;
            poolTotal = pools[artistId!].amount;
            // Fetch the artist's display name for attribution (best-effort; the pure
            // per-key loop has no dbTransaction, and unit-test stubs pass storage:{}).
            let artistName = 'this artist';
            try {
              const artist = await ctx.storage?.getArtist?.(artistId);
              if (artist?.name) artistName = artist.name;
            } catch { /* name is cosmetic — never block banking */ }
            scopeLabel = `${artistName}'s next release`;
          } else {
            const previous = typeof flags.pendingAwarenessBoost === 'number' ? flags.pendingAwarenessBoost : 0;
            flags.pendingAwarenessBoost = previous + value;
            flags.pendingAwarenessBoostWeek = currentWeek;
            poolTotal = flags.pendingAwarenessBoost;
            scopeLabel = 'your label\'s next planned release';
          }
          ctx.gameState.flags = flags;

          summary.changes.push({
            type: 'meeting',
            description: `Buzz ${value > 0 ? 'building' : 'cooling'} for the next release (${value > 0 ? '+' : ''}${value})`,
            amount: value,
            appliedEffects: { awareness_boost: value }
          });
          // Buzz-v2 slice 1: STRUCTURED banked-hype attribution entry (routine).
          // Additive to the existing 'meeting' entry above (which carries the
          // effect badge in the meetings card); this one drives the routine-stage
          // Hype line + the core-status "N Hype banked" chip. Only emit for actual
          // banks (value !== 0) so byte-stable no-op choices add nothing.
          // Slice 2: the description now names WHERE the hype landed (artist pool vs
          // label pool); hypeTotal carries the pool total after this bank.
          if (value !== 0) {
            summary.changes.push({
              type: 'hype_banked',
              description: `📦 Banked ${value > 0 ? '+' : ''}${value} Hype for ${scopeLabel}`,
              amount: value,
              hypeTotal: poolTotal,
            });
          }
          console.log(`[EFFECT PROCESSING] awareness_boost effect: ${value > 0 ? '+' : ''}${value} banked to ${artistScoped ? `artist ${artistId}` : 'label'} pool (now ${poolTotal}, stamped week ${currentWeek})`);
          break;
        }

        case 'variance_up': {
          // Exec-meetings-revival PR-6 (C4) — outcome variance/risk channel. Signed
          // points bank into flags.pendingVariance; consumed by the next song(s)
          // generated (SongGenerationProcessor.calculateEnhancedSongQuality widens
          // baseVarianceRange and raises the outlier-roll thresholds using this
          // pool), then zeroed in processRecordingProjects (mirrors PR-4's quality
          // bank exactly — same songsGeneratedThisWeek gating). Stamps
          // pendingVarianceWeek so processDelayedEffects can expire an unconsumed
          // bank after pending_variance_expiry_weeks (data/balance/quality.json).
          const flags = (ctx.gameState.flags || {}) as Record<string, any>;
          const previous = typeof flags.pendingVariance === 'number' ? flags.pendingVariance : 0;
          flags.pendingVariance = previous + value;
          flags.pendingVarianceWeek = ctx.gameState.currentWeek || 0;
          ctx.gameState.flags = flags;

          summary.changes.push({
            type: 'meeting',
            description: `Outcomes ${value > 0 ? 'more volatile' : 'more predictable'} for the next recording session (${value > 0 ? '+' : ''}${value})`,
            amount: value,
            appliedEffects: { variance_up: value }
          });
          console.log(`[EFFECT PROCESSING] variance_up effect: ${value > 0 ? '+' : ''}${value} (pool now ${flags.pendingVariance}, stamped week ${flags.pendingVarianceWeek})`);
          break;
        }

        case 'rep_swing': {
          // Exec-meetings-revival PR-6 (C4) — immediate reputation gamble. Resolves
          // RIGHT HERE via an ISOLATED deterministic seeded roll (shared/utils/
          // seededRandom.ts) — NOT ctx.getRandom, so the engine's pinned RNG stream
          // and its draw count are completely undisturbed by this effect. The
          // authored value is the magnitude of the gamble; the roll maps to a
          // uniform integer in [-value, +value] and is applied to reputation with
          // the same 0-100 clamp the 'reputation' case above uses.
          const gameId = ctx.gameState.id || 'unknown-game';
          const currentWeek = ctx.gameState.currentWeek || 0;
          const seed = `${gameId}-week${currentWeek}-repswing-${meetingName || 'unknown-meeting'}-${choiceId || 'unknown-choice'}`;
          const magnitude = Math.abs(value);
          const roll = seededRandom(seed); // [0, 1)
          // Map [0,1) to a uniform integer in [-magnitude, +magnitude] (2*magnitude+1 buckets).
          const rawRolledValue = magnitude === 0
            ? 0
            : Math.floor(roll * (2 * magnitude + 1)) - magnitude;

          // Volatility-economy slice 3: a rep-swing that PAYS OFF is a reputation
          // GAIN and is throttled by the shared global scaling; a swing that
          // BACKFIRES is a loss and applies at full magnitude (positive-only helper).
          const repSystemCfg = (ctx.gameData.getBalanceConfigSync?.() as any)?.reputation_system;
          const rolledValue = scaleReputationGain(rawRolledValue, repSystemCfg);

          const previousReputation = ctx.gameState.reputation || 0;
          ctx.gameState.reputation = Math.max(0, Math.min(100, previousReputation + rolledValue));

          if (!summary.reputationChanges) {
            summary.reputationChanges = {};
          }
          summary.reputationChanges['global'] = (summary.reputationChanges['global'] || 0) + rolledValue;

          const outcomeLabel = rolledValue > 0
            ? `paid off: +${rolledValue} reputation`
            : rolledValue < 0
              ? `backfired: ${rolledValue} reputation`
              : `was a wash: no reputation change`;

          summary.changes.push({
            type: 'meeting',
            description: `Reputation gamble ${outcomeLabel}`,
            amount: rolledValue,
            appliedEffects: { rep_swing: rolledValue }
          });
          console.log(`[EFFECT PROCESSING] rep_swing effect: gambled ±${magnitude}, rolled ${rawRolledValue > 0 ? '+' : ''}${rawRolledValue} → applied ${rolledValue > 0 ? '+' : ''}${rolledValue} (seed: ${seed})`);
          break;
        }

        case 'award_chances': {
          // Exec-meetings-revival PR-7 (C5) — prestige/award track. Signed points
          // accumulate into flags.awardChances with NO expiry and NO decay — this
          // is the one channel that intentionally banks forever, persisting to
          // campaign end (award season). Consumed by AchievementsEngine's
          // campaign-end award roll (isolated seeded RNG, see AchievementsEngine.ts)
          // — there is no weekly consumer, unlike every other bank in this file.
          const flags = (ctx.gameState.flags || {}) as Record<string, any>;
          const previous = typeof flags.awardChances === 'number' ? flags.awardChances : 0;
          flags.awardChances = previous + value;
          ctx.gameState.flags = flags;

          summary.changes.push({
            type: 'meeting',
            description: value > 0
              ? 'Industry standing growing — award season will remember'
              : 'Industry standing took a hit — award season will remember',
            amount: value,
            appliedEffects: { award_chances: value }
          });
          console.log(`[EFFECT PROCESSING] award_chances effect: ${value > 0 ? '+' : ''}${value} (pool now ${flags.awardChances})`);
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
            amount: value,
            appliedEffects: { press_momentum: value }
          });
          console.log(`[EFFECT PROCESSING] press_momentum effect: ${value > 0 ? '+' : ''}${value} (pool now ${flags.pressMomentum})`);
          break;
        }

        case 'promote_release': {
          // Engine-verbs arc slice 8 (M5) — the economy's first BACKWARD-acting
          // verb: a clamped awareness bump applied DIRECTLY to the targeted
          // currently-released song (highest-awareness released song for the
          // targeted artist, or label-wide — shared rule in releaseTargeting.ts).
          // SURGICAL by design: only `awareness` (and its peak mirror) moves; the
          // decay fields (awareness_decay_rate, breakthrough_achieved) are never
          // touched, so the bump simply rides the existing weekly build/decay
          // cycle in ReleaseProcessor.processReleasedProjects. Zero RNG.
          if (!(value > 0)) {
            console.log(`[EFFECT PROCESSING] promote_release with non-positive value (${value}) ignored`);
            break;
          }
          try {
            const releasedSongs = (await ctx.gameData.getReleasedSongs?.(ctx.gameState.id)) || [];
            const target = pickTargetReleasedSong(releasedSongs, artistId);
            if (!target) {
              console.warn(`[EFFECT PROCESSING] promote_release: no currently-released song${artistId ? ` for artist ${artistId}` : ''} — effect skipped${meetingName ? ` (meeting: ${meetingName})` : ''}`);
              break;
            }
            const promoCfg = (ctx.gameData.getBalanceConfigSync?.() as any)?.market_formulas?.release_promotion;
            const maxBump = promoCfg?.max_awareness_bump ?? 15; // knob: markets.json release_promotion
            const bump = Math.min(value, maxBump);
            const currentAwareness = target.awareness ?? 0;
            const newAwareness = Math.round(Math.max(0, Math.min(100, currentAwareness + bump)));
            await ctx.gameData.updateSongs?.([
              {
                songId: target.id,
                awareness: newAwareness,
                peak_awareness: Math.round(Math.max(target.peak_awareness ?? 0, newAwareness)),
              },
            ], ctx.dbTransaction);

            summary.changes.push({
              type: 'meeting',
              description: `Promo push behind "${target.title ?? 'your release'}" — its buzz is climbing again`,
              amount: 0,
              appliedEffects: { promote_release: value },
            });
            console.log(`[EFFECT PROCESSING] promote_release: +${bump} awareness (of authored ${value}, cap ${maxBump}) to "${target.title}" (${currentAwareness} -> ${newAwareness})`);
          } catch (error) {
            console.error('[EFFECT PROCESSING] promote_release failed (effect skipped):', error);
          }
          break;
        }

        case 'catalog_damage': {
          // Engine-verbs arc slice 8 (M12) — severity-scaled awareness LOSS on the
          // targeted released song (same shared target rule as promote_release).
          // Awareness is the future-revenue driver (FinancialSystem.calculateDecayRevenue
          // applies the weeks-5+ awareness modifier), so cutting it here cuts the
          // song's ongoing streams too. peak_awareness is historical — never reduced.
          const severity = Math.abs(value); // authored as positive severity; tolerate a signed value
          if (!(severity > 0)) {
            console.log(`[EFFECT PROCESSING] catalog_damage with zero severity ignored`);
            break;
          }
          try {
            const releasedSongs = (await ctx.gameData.getReleasedSongs?.(ctx.gameState.id)) || [];
            const target = pickTargetReleasedSong(releasedSongs, artistId);
            if (!target) {
              console.warn(`[EFFECT PROCESSING] catalog_damage: no currently-released song${artistId ? ` for artist ${artistId}` : ''} — effect skipped${meetingName ? ` (meeting: ${meetingName})` : ''}`);
              break;
            }
            const dmgCfg = (ctx.gameData.getBalanceConfigSync?.() as any)?.market_formulas?.catalog_damage;
            const perSeverity = dmgCfg?.awareness_loss_fraction_per_severity ?? 0.1; // knob: markets.json catalog_damage
            const maxFraction = dmgCfg?.max_total_fraction ?? 0.8;                    // knob: markets.json catalog_damage
            const lossFraction = Math.min(maxFraction, severity * perSeverity);
            const currentAwareness = target.awareness ?? 0;
            const newAwareness = Math.round(Math.max(0, currentAwareness * (1 - lossFraction)));
            await ctx.gameData.updateSongs?.([
              { songId: target.id, awareness: newAwareness },
            ], ctx.dbTransaction);

            summary.changes.push({
              type: 'meeting',
              description: `"${target.title ?? 'A released track'}" took a hit — its buzz is fading and the streams will follow`,
              amount: 0,
              appliedEffects: { catalog_damage: value },
            });
            console.log(`[EFFECT PROCESSING] catalog_damage: severity ${severity} → -${(lossFraction * 100).toFixed(0)}% awareness on "${target.title}" (${currentAwareness} -> ${newAwareness})`);
          } catch (error) {
            console.error('[EFFECT PROCESSING] catalog_damage failed (effect skipped):', error);
          }
          break;
        }

        case 'cancel_project': {
          // Engine-verbs arc slice 9 (M6) — SOFT-cancel of the targeted artist's
          // ACTIVE recording project (Single/EP in planning/production). Mirrors
          // the tour cancel route's soft-cancel shape (server/routes/projects.ts):
          // completionStatus:'cancelled' + stage:'cancelled' — the stage machine
          // (ProjectStageProcessor, which also skips cancelled explicitly) and the
          // song generator (stage !== 'production') both stop naturally.
          // RULES (MVP): NO refund of any kind (money spent stays spent), and
          // SONGS ALREADY CREATED BY THE PROJECT STAY — they are recorded rows
          // and remain releasable; only future song generation stops.
          // Restart/delay is explicitly deferred (fights the monotonic stage model).
          if (value === 0) {
            console.log(`[EFFECT PROCESSING] cancel_project with zero value ignored`);
            break;
          }
          try {
            const projects = (await ctx.storage?.getProjectsByGame?.(ctx.gameState.id, ctx.dbTransaction)) || [];
            const active = projects.filter((p: any) =>
              ['Single', 'EP'].includes(p.type || '') &&
              ['planning', 'production'].includes(p.stage || '') &&
              p.completionStatus !== 'cancelled' &&
              (!artistId || p.artistId === artistId)
            );
            if (active.length === 0) {
              console.warn(`[EFFECT PROCESSING] cancel_project: no active recording project${artistId ? ` for artist ${artistId}` : ''} — effect skipped${meetingName ? ` (meeting: ${meetingName})` : ''}`);
              break;
            }
            // Deterministic pick: the most recently started active project
            // (highest startWeek), lexicographic id as the final tie-break.
            const target = active.reduce((best: any, p: any) => {
              const bestWeek = best.startWeek ?? 0;
              const pWeek = p.startWeek ?? 0;
              if (pWeek !== bestWeek) return pWeek > bestWeek ? p : best;
              return p.id < best.id ? p : best;
            });

            await ctx.storage?.updateProject?.(target.id, {
              stage: 'cancelled',
              completionStatus: 'cancelled',
              metadata: {
                ...(target.metadata || {}),
                cancelledWeek: ctx.gameState.currentWeek || 0,
                cancelledBy: meetingName || 'effect',
              },
            }, ctx.dbTransaction);

            summary.changes.push({
              type: 'meeting',
              description: `"${target.title}" was shut down mid-production — songs already in the can are kept, but no more are coming`,
              amount: 0,
              projectId: target.id,
              artistId: target.artistId ?? undefined,
              appliedEffects: { cancel_project: value },
            });
            console.log(`[EFFECT PROCESSING] cancel_project: soft-cancelled "${target.title}" (${target.id}, stage was ${target.stage}); ${target.songsCreated || 0}/${target.songCount || 0} songs already created are KEPT`);
          } catch (error) {
            console.error('[EFFECT PROCESSING] cancel_project failed (effect skipped):', error);
          }
          break;
        }

        case 'grant_inventory': {
          // Engine-verbs arc slice 10 (M9 physical_inventory, flags-ledger MVP).
          // Authored value = unit count. Writes a flags.inventory[] ledger entry
          // tied to the targeted artist's LATEST released release (label-wide
          // latest when untargeted). Manufacturing cost (units × unit_cost knob)
          // is charged NOW through the summary (single [FINAL MONEY] point rule);
          // the deterministic weekly sell-through lives in the streaming pass
          // (ReleaseProcessor.processReleasedProjects → flagsLedgers.processInventoryWeek).
          const requestedUnits = Math.round(value);
          if (!(requestedUnits > 0)) {
            console.log(`[EFFECT PROCESSING] grant_inventory with non-positive units (${value}) ignored`);
            break;
          }
          try {
            const releases = (await ctx.storage?.getReleasesByGame?.(ctx.gameState.id, ctx.dbTransaction)) || [];
            const release = pickLatestReleasedRelease(releases, artistId);
            if (!release) {
              console.warn(`[EFFECT PROCESSING] grant_inventory: no released release${artistId ? ` for artist ${artistId}` : ''} — effect skipped${meetingName ? ` (meeting: ${meetingName})` : ''}`);
              break;
            }
            const invCfg = {
              ...PHYSICAL_INVENTORY_DEFAULTS,
              ...(((ctx.gameData.getBalanceConfigSync?.() as any)?.market_formulas?.physical_inventory) || {}),
            };
            const units = Math.min(requestedUnits, invCfg.max_units_per_grant);
            const manufacturingCost = units * invCfg.unit_cost;
            const currentWeek = ctx.gameState.currentWeek || 0;

            const flags = (ctx.gameState.flags || {}) as Record<string, any>;
            const ledger = readInventoryLedger(flags);
            const baseId = `${release.id}-w${currentWeek}`;
            const entry: InventoryLedgerEntry = {
              id: ledger.some((e) => e.id === baseId) ? `${baseId}-${ledger.length}` : baseId,
              releaseId: release.id,
              releaseTitle: release.title || 'Untitled release',
              artistId: release.artistId ?? undefined,
              unitsInitial: units,
              unitsRemaining: units,
              unitCost: invCfg.unit_cost,
              unitPrice: invCfg.unit_price,
              createdWeek: currentWeek,
            };
            flags.inventory = [...ledger, entry];
            ctx.gameState.flags = flags;

            // Charge manufacturing like a meeting cost (same reconciliation path
            // as the 'money' case: summary totals + roleMeetingCosts bucket).
            summary.expenses += manufacturingCost;
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
            summary.expenseBreakdown.roleMeetingCosts += manufacturingCost;

            summary.changes.push({
              type: 'expense',
              description: `Pressed a physical run of "${entry.releaseTitle}" — manufacturing paid up front, units start selling this week`,
              amount: -manufacturingCost,
              releaseId: release.id,
            });
            summary.changes.push({
              type: 'meeting',
              description: `Physical pressing ordered for "${entry.releaseTitle}"`,
              amount: 0,
              appliedEffects: { grant_inventory: value },
            });
            console.log(`[EFFECT PROCESSING] grant_inventory: ${units} units (authored ${value}, cap ${invCfg.max_units_per_grant}) @ cost ${invCfg.unit_cost}/price ${invCfg.unit_price} against "${entry.releaseTitle}" (${release.id}); manufacturing $${manufacturingCost}`);
          } catch (error) {
            console.error('[EFFECT PROCESSING] grant_inventory failed (effect skipped):', error);
          }
          break;
        }

        case 'transfer_revenue_stream': {
          // Engine-verbs arc slice 10 (M11 revenue_stream_transfer, flags-ledger
          // MVP). Authored value = sold fraction of the targeted released
          // release's weekly streaming revenue (>= 1 read as percent), clamped by
          // the max_fraction knob; term = default_weeks knob. Writes a
          // flags.revenue_transfers[] entry; the weekly deduction lives in the
          // streaming pass (ReleaseProcessor.processReleasedProjects →
          // flagsLedgers.processRevenueTransfersWeek). The sale PRICE itself is
          // whatever the authored choice pays via its own 'money' effect — this
          // key only encumbers the stream.
          try {
            const xferCfg = {
              ...REVENUE_TRANSFER_DEFAULTS,
              ...(((ctx.gameData.getBalanceConfigSync?.() as any)?.market_formulas?.revenue_transfer) || {}),
            };
            const fraction = normalizeTransferFraction(value, xferCfg);
            if (!(fraction > 0)) {
              console.log(`[EFFECT PROCESSING] transfer_revenue_stream with non-positive fraction (${value}) ignored`);
              break;
            }
            const releases = (await ctx.storage?.getReleasesByGame?.(ctx.gameState.id, ctx.dbTransaction)) || [];
            const release = pickLatestReleasedRelease(releases, artistId);
            if (!release) {
              console.warn(`[EFFECT PROCESSING] transfer_revenue_stream: no released release${artistId ? ` for artist ${artistId}` : ''} — effect skipped${meetingName ? ` (meeting: ${meetingName})` : ''}`);
              break;
            }
            const currentWeek = ctx.gameState.currentWeek || 0;
            const entry: RevenueTransferEntry = {
              releaseId: release.id,
              releaseTitle: release.title || 'Untitled release',
              fraction,
              startWeek: currentWeek,
              endWeek: currentWeek + xferCfg.default_weeks - 1,
            };
            const flags = (ctx.gameState.flags || {}) as Record<string, any>;
            flags.revenue_transfers = [...readRevenueTransfers(flags), entry];
            ctx.gameState.flags = flags;

            summary.changes.push({
              type: 'meeting',
              description: `Sold a share of "${entry.releaseTitle}"'s streaming income — the buyer collects their cut weekly for the term of the deal`,
              amount: 0,
              releaseId: release.id,
              appliedEffects: { transfer_revenue_stream: value },
            });
            console.log(`[EFFECT PROCESSING] transfer_revenue_stream: fraction ${fraction} (authored ${value}) of "${entry.releaseTitle}" (${release.id}), weeks ${entry.startWeek}-${entry.endWeek}`);
          } catch (error) {
            console.error('[EFFECT PROCESSING] transfer_revenue_stream failed (effect skipped):', error);
          }
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

      // Exec-meetings-revival Phase B fix-2 — press_momentum weekly decay runs
      // BEFORE this week's triggered delayed effects apply. Decay-after-apply
      // eroded freshly-landed momentum in the same call: a +1 authored value
      // (cmo_pr_angle/safe) applied here and decayed to 0 six lines later, so it
      // could never influence any press roll (which run earlier in the weekly
      // pipeline) — the exact silent-no-op problem this revival exists to fix.
      // With decay-first, momentum landing this week survives to be read by next
      // week's press rolls and then decays. Decays 1/week TOWARD 0 from either
      // side (daf7cfe): negative scandal fallout fades over |m| weeks, symmetric
      // with positive buzz.
      if (typeof flags.pressMomentum === 'number' && flags.pressMomentum !== 0) {
        const decayed = flags.pressMomentum > 0
          ? Math.max(0, flags.pressMomentum - 1)
          : Math.min(0, flags.pressMomentum + 1);
        if (decayed !== flags.pressMomentum) {
          console.log(`[PRESS MOMENTUM] Weekly decay: ${flags.pressMomentum} -> ${decayed}`);
        }
        flags.pressMomentum = decayed;
      }

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

              // Playtest bug #3 fix: descriptive label (which meeting + choice)
              // instead of the bare "Delayed effect triggered for artist X".
              const description = await this.describeDelayedEffect(ctx, meetingName, choiceId);
              summary.changes.push({
                type: 'delayed_effect',
                description,
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
              // Playtest bug #3 fix: descriptive label instead of bare
              // "Delayed effect triggered".
              const description = await this.describeDelayedEffect(
                ctx,
                (value as any).meetingName,
                (value as any).choiceId
              );
              summary.changes.push({
                type: 'delayed_effect',
                description,
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

      // (press_momentum decay moved ABOVE the triggered-entry loop — Phase B
      // fix-2; see the comment there.)

      // Exec-meetings-revival Phase B fix-2 — pressStoryFlag expiry. A story flag
      // is only consumed by a release press roll with marketing budget > 0, so an
      // unconsumed flag could otherwise be banked indefinitely (verifier find;
      // quality/awareness banks both got expiry knobs, the press flag didn't).
      // Same stamp-based pattern; knob lives with the press config.
      if (flags.pressStoryFlag === true) {
        const stampedWeek = typeof flags.pressStoryFlagWeek === 'number' ? flags.pressStoryFlagWeek : (ctx.gameState.currentWeek || 0);
        const expiryWeeks = ctx.gameData.getPressConfigSync().press_story_flag_expiry_weeks ?? 8;
        const currentWeek = ctx.gameState.currentWeek || 0;
        if (currentWeek - stampedWeek >= expiryWeeks) {
          console.log(`[PRESS STORY] Expired unconsumed story flag after ${currentWeek - stampedWeek} weeks (limit ${expiryWeeks})`);
          flags.pressStoryFlag = false;
          delete flags.pressStoryFlagWeek;
        }
      }

      // Exec-meetings-revival PR-4 (C1) — pendingQualityBonus expiry. If a banked
      // quality bonus goes unconsumed (no song generation cleared it — see
      // SongGenerationProcessor.processRecordingProjects) for
      // pending_quality_bonus_expiry_weeks weeks after it was stamped, drop it so
      // players can't bank indefinitely. Same once-per-week home as the press
      // momentum decay above.
      if (typeof flags.pendingQualityBonus === 'number' && flags.pendingQualityBonus !== 0) {
        const stampedWeek = typeof flags.pendingQualityBonusWeek === 'number' ? flags.pendingQualityBonusWeek : (ctx.gameState.currentWeek || 0);
        const expiryWeeks = ctx.gameData.getQualityBonusConfigSync().pending_quality_bonus_expiry_weeks;
        const currentWeek = ctx.gameState.currentWeek || 0;
        if (currentWeek - stampedWeek >= expiryWeeks) {
          console.log(`[QUALITY BONUS] Expired unconsumed bonus (${flags.pendingQualityBonus}) after ${currentWeek - stampedWeek} weeks (limit ${expiryWeeks})`);
          flags.pendingQualityBonus = 0;
          delete flags.pendingQualityBonusWeek;
        }
      }

      // Exec-meetings-revival PR-5 (C3) — pendingAwarenessBoost expiry. If a banked
      // awareness boost goes unconsumed (no planned release seeded from it — see
      // ReleaseProcessor.processPlannedReleases) for
      // pending_awareness_boost_expiry_weeks weeks after it was stamped, drop it so
      // players can't bank indefinitely. Same expiry pattern as the PR-4 quality
      // bank above; expiry (not decay) keeps the semantics consistent with C1.
      if (typeof flags.pendingAwarenessBoost === 'number' && flags.pendingAwarenessBoost !== 0) {
        const stampedWeek = typeof flags.pendingAwarenessBoostWeek === 'number' ? flags.pendingAwarenessBoostWeek : (ctx.gameState.currentWeek || 0);
        const expiryWeeks = ctx.gameData.getAwarenessBoostConfigSync().pending_awareness_boost_expiry_weeks;
        const currentWeek = ctx.gameState.currentWeek || 0;
        if (currentWeek - stampedWeek >= expiryWeeks) {
          const expiredAmount = flags.pendingAwarenessBoost;
          console.log(`[AWARENESS BOOST] Expired unconsumed boost (${flags.pendingAwarenessBoost}) after ${currentWeek - stampedWeek} weeks (limit ${expiryWeeks})`);
          flags.pendingAwarenessBoost = 0;
          delete flags.pendingAwarenessBoostWeek;
          // Buzz-v2 slice 1: STRUCTURED expiry attribution (notable). Before this
          // slice, an unconsumed pool aged out silently (console-log only) — a
          // player could bank +6 across meetings and lose it all invisibly.
          if (summary && Array.isArray(summary.changes)) {
            summary.changes.push({
              type: 'hype_expired',
              description: `💨 ${expiredAmount > 0 ? '+' : ''}${expiredAmount} banked Hype faded away unused (no release shipped in ${expiryWeeks} weeks)`,
              amount: expiredAmount,
            });
          }
        }
      }

      // Buzz-v2 slice 2 (fork C) — per-ARTIST-POOL expiry. Each artist pool ages
      // independently from its own last-bank week (matching the single-pool stamp
      // behavior above); attached hype (moved onto a release at plan time) never
      // reaches this sweep. Emits one hype_expired per expired pool, naming the
      // artist so the player knows whose banked hype faded. UNATTACHED pools only.
      if (flags.hypeArtistPools && typeof flags.hypeArtistPools === 'object') {
        const pools = flags.hypeArtistPools as Record<string, { amount: number; week: number }>;
        const expiryWeeks = ctx.gameData.getAwarenessBoostConfigSync().pending_awareness_boost_expiry_weeks;
        const currentWeek = ctx.gameState.currentWeek || 0;
        for (const [poolArtistId, pool] of Object.entries(pools)) {
          if (!pool || typeof pool.amount !== 'number' || pool.amount === 0) continue;
          const stampedWeek = typeof pool.week === 'number' ? pool.week : currentWeek;
          if (currentWeek - stampedWeek >= expiryWeeks) {
            const expiredAmount = pool.amount;
            // Best-effort artist name (cosmetic; unit-test stubs pass storage:{}).
            let artistName = 'an artist';
            try {
              const artist = await ctx.storage?.getArtist?.(poolArtistId, ctx.dbTransaction);
              if (artist?.name) artistName = artist.name;
            } catch { /* name is cosmetic — never block expiry */ }
            console.log(`[AWARENESS BOOST] Expired unconsumed artist pool for ${poolArtistId} (${expiredAmount}) after ${currentWeek - stampedWeek} weeks (limit ${expiryWeeks})`);
            delete pools[poolArtistId];
            if (summary && Array.isArray(summary.changes)) {
              summary.changes.push({
                type: 'hype_expired',
                description: `💨 ${expiredAmount > 0 ? '+' : ''}${expiredAmount} banked Hype for ${artistName} faded away unused (no release shipped in ${expiryWeeks} weeks)`,
                amount: expiredAmount,
              });
            }
          }
        }
        // Drop the container entirely if it emptied, to keep no-op games byte-stable.
        if (Object.keys(pools).length === 0) {
          delete flags.hypeArtistPools;
        }
      }

      // Exec-meetings-revival PR-6 (C4) — pendingVariance expiry. If a banked
      // variance-widen pool goes unconsumed (no song generation cleared it — see
      // SongGenerationProcessor.processRecordingProjects) for
      // pending_variance_expiry_weeks weeks after it was stamped, drop it so
      // players can't bank indefinitely. Same expiry pattern as the PR-4/PR-5
      // banks above; runs AFTER the triggered-entry loop so a variance_up that
      // just landed via a delayed effect this week survives to be read by this
      // week's song generation (2b6f28e ordering lesson).
      if (typeof flags.pendingVariance === 'number' && flags.pendingVariance !== 0) {
        const stampedWeek = typeof flags.pendingVarianceWeek === 'number' ? flags.pendingVarianceWeek : (ctx.gameState.currentWeek || 0);
        const expiryWeeks = ctx.gameData.getVarianceConfigSync().pending_variance_expiry_weeks;
        const currentWeek = ctx.gameState.currentWeek || 0;
        if (currentWeek - stampedWeek >= expiryWeeks) {
          console.log(`[VARIANCE] Expired unconsumed variance pool (${flags.pendingVariance}) after ${currentWeek - stampedWeek} weeks (limit ${expiryWeeks})`);
          flags.pendingVariance = 0;
          delete flags.pendingVarianceWeek;
        }
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
          // Volatility-economy slice 3: throttle the PR-push reputation gain.
          const prRepSystemCfg = (ctx.gameData.getBalanceConfigSync?.() as any)?.reputation_system;
          const prRepGain = scaleReputationGain(pressPickups, prRepSystemCfg);
          ctx.gameState.reputation = Math.min(100, (ctx.gameState.reputation || 0) + prRepGain);
          // C45: count pickups so weeklyStats.pressMentions reflects reality.
          summary.pressMentions = (summary.pressMentions || 0) + pressPickups;
          effectDescription = `PR campaign generated ${pressPickups} press mentions`;
        } else {
          effectDescription = 'PR campaign completed - limited media pickup';
        }
        break;
      }

      case 'digital_ads': {
        // Digital ads improve streaming potential
        const rawStreamingBoost = Math.floor(campaignCost / 1000); // $1k = 1 reputation point
        // Volatility-economy slice 3: throttle the digital-ads reputation gain.
        const digitalRepSystemCfg = (ctx.gameData.getBalanceConfigSync?.() as any)?.reputation_system;
        const streamingBoost = scaleReputationGain(rawStreamingBoost, digitalRepSystemCfg);
        ctx.gameState.reputation = Math.min(100, (ctx.gameState.reputation || 0) + streamingBoost);
        effectDescription = `Digital campaign boosted online presence (+${streamingBoost} reputation)`;
        break;
      }

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
