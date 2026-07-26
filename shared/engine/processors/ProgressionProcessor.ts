/**
 * ProgressionProcessor — weekly reputation-gated progression & campaign completion.
 *
 * Phase 2 engine-seams §2 row 2. VERBATIM move of four `GameEngine` methods:
 * `checkProgressionGates`, `updateAccessTiers`, `checkProducerTierUnlocks`, and
 * `checkCampaignCompletion`. Every branch, log line, emoji notification, and
 * flag/gameState write is preserved character-for-character, with only `this.`
 * rebound to the injected `WeekContext` (`this.gameState` → `ctx.gameState`,
 * `this.gameData` → `ctx.gameData`). `AchievementsEngine` is still imported
 * statically, exactly as the pre-extraction engine used it.
 *
 * Post-extraction change (C61): `updateAccessTiers` notifications are now
 * direction-aware — upgrades keep the verbatim legacy strings, but downgrades
 * and drops to 'none' emit honest "Downgraded"/"Lost" copy instead of the old
 * unconditional "Upgraded" (or silence, for drops to 'none').
 *
 * The processor is stateless — all state flows through the `WeekContext`.
 * See ./types.ts for the RNG-order invariant this move preserves (these methods
 * draw no RNG, so order is unaffected).
 */
import type { WeekContext } from './types';
import type { GameChange } from '../../types/gameTypes';
import type { CampaignResults } from '../game-engine';
import { AchievementsEngine } from '../AchievementsEngine';

export class ProgressionProcessor {
  async checkProgressionGates(ctx: WeekContext): Promise<void> {
    const thresholds = ctx.gameData.getProgressionThresholdsSync();

    // Slot unlock functionality has been removed - these were non-functional placeholders
  }

  /**
   * Updates access tiers based on current reputation and returns tier upgrade notifications
   */
  updateAccessTiers(ctx: WeekContext): GameChange[] {
    const tiers = ctx.gameData.getAccessTiersSync();
    const reputation = ctx.gameState.reputation || 0;
    const tierChanges: GameChange[] = [];

    // Initialize tier unlock history if missing (Task 2.2)
    const gs: any = ctx.gameState as any;
    if (!gs.tierUnlockHistory) {
      gs.tierUnlockHistory = {};
    }

    // Store previous values to detect changes
    const previousPlaylist = ctx.gameState.playlistAccess;
    const previousPress = ctx.gameState.pressAccess;
    const previousVenue = ctx.gameState.venueAccess;

    // Update playlist access
    const playlistTiers = Object.entries(tiers.playlist_access)
      .sort(([,a], [,b]) => b.threshold - a.threshold); // Sort by threshold descending

    for (const [tierName, config] of playlistTiers) {
      if (reputation >= config.threshold) {
        if (ctx.gameState.playlistAccess !== tierName) {
          ctx.gameState.playlistAccess = tierName;
        }
        break;
      }
    }

    // Update press access
    const pressTiers = Object.entries(tiers.press_access)
      .sort(([,a], [,b]) => b.threshold - a.threshold);

    for (const [tierName, config] of pressTiers) {
      if (reputation >= config.threshold) {
        if (ctx.gameState.pressAccess !== tierName) {
          ctx.gameState.pressAccess = tierName;
        }
        break;
      }
    }

    // Update venue access
    const venueTiers = Object.entries(tiers.venue_access)
      .sort(([,a], [,b]) => b.threshold - a.threshold);

    for (const [tierName, config] of venueTiers) {
      if (reputation >= config.threshold) {
        if (ctx.gameState.venueAccess !== tierName) {
          ctx.gameState.venueAccess = tierName;
        }
        break;
      }
    }

    // C61: direction-aware tier-change notifications. The tier lists above are
    // sorted by threshold DESCENDING, so a lower index = a higher tier. Rank of
    // an unknown/unset tier value is list.length (below every real tier), which
    // preserves the legacy "fresh state → first real tier fires an upgrade"
    // behavior and keeps a fresh-game undefined→'none' assignment silent.
    // Upgrades keep the exact legacy "… Access Upgraded" strings (golden master
    // pins them); downgrades no longer lie ("… Access Downgraded"), and a drop
    // all the way to 'none' now announces itself ("… Access Lost").
    //
    // Downgrade/lost notifications are GATED on the previous tier being stamped
    // in tierUnlockHistory: we only announce losing access we previously
    // announced as gained. Real games start every tier at 'none' (schema
    // default) and can only climb through the upgrade branch below, which
    // stamps history — so every legitimate downgrade notifies. Raw-seeded
    // states (test fixtures, e.g. the golden master's venueAccess:'clubs' at
    // reputation 10) carry no stamp and stay silent, exactly like legacy.
    // Known cost: tiers earned before tierUnlockHistory existed (old saves)
    // also downgrade silently — no worse than the pre-fix behavior.
    // TODO: notification copy for downgrade/lost is first-pass factual — a
    // designer will polish it later.
    const tierRank = (list: Array<[string, any]>, tier: string | null | undefined): number => {
      const idx = list.findIndex(([name]) => name === tier);
      return idx === -1 ? list.length : idx;
    };
    const wasEarned = (category: 'playlist' | 'press' | 'venue', tier: string | null | undefined): boolean =>
      !!(tier && gs.tierUnlockHistory?.[category]?.[tier]);

    if (previousPlaylist !== ctx.gameState.playlistAccess) {
      const current = ctx.gameState.playlistAccess;
      const currRank = tierRank(playlistTiers, current);
      const prevRank = tierRank(playlistTiers, previousPlaylist);
      const tierDisplay = current === 'niche' ? 'Niche' :
                         current === 'mid' ? 'Mid-Tier' :
                         current === 'flagship' ? 'Flagship' : current;
      if (current !== 'none' && currRank < prevRank) {
        tierChanges.push({
          type: 'unlock',
          description: `🎵 Playlist Access Upgraded: ${tierDisplay} playlists unlocked! Your releases can now reach wider audiences.`,
          amount: 0
        });

        // Task 2.3: Track unlock week in tierUnlockHistory for playlist
        if (!gs.tierUnlockHistory.playlist) gs.tierUnlockHistory.playlist = {};
        const tierKey = current;
        if (tierKey && !gs.tierUnlockHistory.playlist[tierKey]) {
          gs.tierUnlockHistory.playlist[tierKey] = ctx.gameState.currentWeek || 0;
        }
      } else if (wasEarned('playlist', previousPlaylist) && current === 'none') {
        tierChanges.push({
          type: 'reputation',
          description: `🎵 Playlist Access Lost: your reputation dropped below the playlist threshold — releases no longer get playlist placement.`,
          amount: 0
        });
      } else if (wasEarned('playlist', previousPlaylist) && currRank > prevRank) {
        tierChanges.push({
          type: 'reputation',
          description: `🎵 Playlist Access Downgraded: reduced to ${tierDisplay} playlists — reputation fell below the higher tier's threshold.`,
          amount: 0
        });
      }
    }

    if (previousPress !== ctx.gameState.pressAccess) {
      const current = ctx.gameState.pressAccess;
      const currRank = tierRank(pressTiers, current);
      const prevRank = tierRank(pressTiers, previousPress);
      const tierDisplay = current === 'blogs' ? 'Music Blogs' :
                         current === 'mid_tier' ? 'Mid-Tier Press' :
                         current === 'national' ? 'National Media' : current;
      if (current !== 'none' && currRank < prevRank) {
        tierChanges.push({
          type: 'unlock',
          description: `📰 Press Access Upgraded: ${tierDisplay} coverage unlocked! Your projects will get better media attention.`,
          amount: 0
        });

        // Task 2.4: Track unlock week in tierUnlockHistory for press
        if (!gs.tierUnlockHistory.press) gs.tierUnlockHistory.press = {};
        const tierKey = current;
        if (tierKey && !gs.tierUnlockHistory.press[tierKey]) {
          gs.tierUnlockHistory.press[tierKey] = ctx.gameState.currentWeek || 0;
        }
      } else if (wasEarned('press', previousPress) && current === 'none') {
        tierChanges.push({
          type: 'reputation',
          description: `📰 Press Access Lost: your reputation dropped below the press threshold — outlets are no longer covering your projects.`,
          amount: 0
        });
      } else if (wasEarned('press', previousPress) && currRank > prevRank) {
        tierChanges.push({
          type: 'reputation',
          description: `📰 Press Access Downgraded: reduced to ${tierDisplay} coverage — reputation fell below the higher tier's threshold.`,
          amount: 0
        });
      }
    }

    if (previousVenue !== ctx.gameState.venueAccess) {
      const current = ctx.gameState.venueAccess;
      const currRank = tierRank(venueTiers, current);
      const prevRank = tierRank(venueTiers, previousVenue);
      const tierDisplay = current === 'clubs' ? 'Club Venues' :
                         current === 'theaters' ? 'Theater Venues' :
                         current === 'arenas' ? 'Arena Venues' : current;
      if (current !== 'none' && currRank < prevRank) {
        tierChanges.push({
          type: 'unlock',
          description: `🎭 Venue Access Upgraded: ${tierDisplay} unlocked! Your artists can now perform at larger venues.`,
          amount: 0
        });

        // Task 2.6: Track unlock week in tierUnlockHistory for venue
        if (!gs.tierUnlockHistory.venue) gs.tierUnlockHistory.venue = {};
        const tierKey = current;
        if (tierKey && !gs.tierUnlockHistory.venue[tierKey]) {
          gs.tierUnlockHistory.venue[tierKey] = ctx.gameState.currentWeek || 0;
        }
      } else if (wasEarned('venue', previousVenue) && current === 'none') {
        tierChanges.push({
          type: 'reputation',
          description: `🎭 Venue Access Lost: your reputation dropped below the venue threshold — artists are back to unbooked rooms.`,
          amount: 0
        });
      } else if (wasEarned('venue', previousVenue) && currRank > prevRank) {
        tierChanges.push({
          type: 'reputation',
          description: `🎭 Venue Access Downgraded: reduced to ${tierDisplay} — reputation fell below the higher tier's threshold.`,
          amount: 0
        });
      }
    }

    return tierChanges;
  }

  /**
   * Checks for producer tier unlocks and adds progression notifications
   */
  checkProducerTierUnlocks(ctx: WeekContext): void {
    const { summary } = ctx;
    const reputation = ctx.gameState.reputation || 0;
    const producerSystem = ctx.gameData.getProducerTierSystemSync();

    // Track which tiers were previously unlocked - properly handle flags
    const flags = ctx.gameState.flags || {};
    let unlockedTiers = (flags as any)['unlocked_producer_tiers'];

    // Initialize unlockedTiers if it doesn't exist yet
    if (!unlockedTiers) {
      unlockedTiers = ['local']; // Start with local tier
      (flags as any)['unlocked_producer_tiers'] = unlockedTiers;
      ctx.gameState.flags = flags;
    }

    let newUnlocks = false;
    const availableTiers = ctx.gameData.getAvailableProducerTiers(reputation);

    for (const tierName of availableTiers) {
      if (!unlockedTiers.includes(tierName)) {
        unlockedTiers.push(tierName);
        newUnlocks = true;

        const tierData = producerSystem[tierName];
        summary.changes.push({
          type: 'unlock',
          description: `🎛️ Producer Tier Unlocked: ${tierName.charAt(0).toUpperCase() + tierName.slice(1)} - ${tierData.description}`,
          amount: 0
        });

        console.log(`[PROGRESSION] Producer tier unlocked: ${tierName} (reputation: ${reputation})`);
      }
    }

    // Always update the flags to ensure persistence
    (flags as any)['unlocked_producer_tiers'] = unlockedTiers;
    ctx.gameState.flags = flags;
  }

  async checkCampaignCompletion(ctx: WeekContext): Promise<CampaignResults | undefined> {
    const { summary } = ctx;
    const currentWeek = ctx.gameState.currentWeek || 0;
    const balanceConfig = await ctx.gameData.getBalanceConfig();
    const campaignLength = balanceConfig.time_progression.campaign_length_weeks;

    // Only complete campaign if we've reached the final week
    if (currentWeek < campaignLength) {
      return undefined;
    }

    // Mark campaign as completed
    ctx.gameState.campaignCompleted = true;

    // Calculate complete campaign results
    // Exec-meetings-revival PR-7 (C5): award-roll knobs come from the same
    // balance-JSON accessor pattern as every other channel (progression.json
    // reputation_system, via ServerGameData.getAwardConfigSync).
    const awardConfig = ctx.gameData.getAwardConfigSync();
    const campaignResults = AchievementsEngine.calculateCampaignResults(ctx.gameState, awardConfig);

    // Add campaign completion to summary
    summary.changes.push({
      type: 'unlock',
      description: `🎉 Campaign Completed! Final Score: ${campaignResults.finalScore}`,
      amount: campaignResults.finalScore
    });

    return campaignResults;
  }
}
