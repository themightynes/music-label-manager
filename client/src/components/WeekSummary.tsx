import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Music, Trophy, Zap, X, BarChart3, Unlock, Users } from 'lucide-react';
import { ChartPerformanceCard } from './ChartPerformanceCard';
import { AnimatedNumber } from './motion-primitives/animated-number';
import { GlowEffect } from './motion-primitives/glow-effect';
import { ParticleBurst } from './motion-primitives/particle-burst';
import { useStagedReveal } from '@/hooks/useStagedReveal';
import { playSound } from '@/lib/audio';
import { classifyChartUpdate } from '@shared/utils/changeImportance';
import { LIVE_EFFECT_KEYS } from '@shared/engine/processors/ActionProcessor';
import { WeekSummary as WeekSummaryType, GameChange, ChartUpdate } from '../../../shared/types/gameTypes';

interface WeekSummaryProps {
  weeklyStats: WeekSummaryType;
  onAdvanceWeek: () => void;
  isAdvancing?: boolean;
  isWeekResults?: boolean;
  onClose?: () => void;
}

// --- Staged reveal timeline (Phase 4 PR-3) ---------------------------------
// Stage indices, in reveal order. Each Overview group fades in when its stage
// is active:
//   0: net income hero figure (AnimatedNumber count-up) + financial bar (the frame)
//   1: revenue sources
//   2: HERO moments (chart No. 1s, tier unlocks — moved INTO the modal)
//   3: notable changes (chart highlights, notable achievements/releases)
//   4: routine (mood, routine achievements, performance summary)
const STAGE_REVENUE = 1;
const STAGE_HERO = 2;
const STAGE_NOTABLE = 3;
const STAGE_ROUTINE = 4;
const STAGE_COUNT = 5;
// ms BEFORE revealing each stage (index 0 = initial beat). Sum = total mandatory
// sequence = 1800ms, comfortably under the ~4s worst-case budget.
const STAGE_DELAYS = [0, 450, 500, 450, 400];

// A staged reveal group: fades/slides in once `revealed` flips true. Under
// reduced motion (`instant`) it renders as a plain div, everything visible
// immediately. MODULE scope on purpose: defining this inside WeekSummary gave
// it a new function identity every render, so React remounted each group
// subtree on every stage tick and (with initial={false}) the motion.divs
// snapped to their animate target — the fade/slide never actually played.
const RevealGroup: React.FC<{
  revealed: boolean;
  instant: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ revealed, instant, className, children }) => {
  if (instant) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 12 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ pointerEvents: revealed ? undefined : 'none' }}
      aria-hidden={revealed ? undefined : true}
    >
      {children}
    </motion.div>
  );
};

// --- Meetings card formatting (exec-meetings-revival PR-2) -----------------
// Module scope: pure formatting helpers, no reason to redefine per render.

/** Human label for a live effect key, mirroring DialogueInterface's badge copy. */
function formatMeetingEffectLabel(key: string): string {
  switch (key) {
    case 'money':
      return 'Money';
    case 'reputation':
      return 'Rep';
    case 'creative_capital':
      return 'Creative';
    case 'artist_mood':
      return 'Mood';
    case 'artist_energy':
      return 'Energy';
    case 'artist_popularity':
      return 'Popularity';
    case 'executive_mood':
      return 'Exec Mood';
    case 'press_story_flag':
      return 'Press Story';
    case 'press_momentum':
      return 'Press Buzz';
    case 'quality_bonus':
      return 'Quality';
    case 'awareness_boost':
      return 'Buzz';
    case 'variance_up':
      // Exec-meetings-revival PR-6 (C4) — a volatility knob, not a value delta.
      return 'Volatility';
    case 'rep_swing':
      // Exec-meetings-revival PR-6 (C4) — pre-roll gamble magnitude when shown
      // at choice-preview time; post-roll the appliedEffects value IS the
      // resolved reputation delta (see formatAppliedEffects's own-sign handling).
      return 'Rep Gamble';
    case 'award_chances':
      // Exec-meetings-revival PR-7 (C5) — prestige/award track (never expires).
      return 'Prestige';
    default:
      return key.replace(/_/g, ' ');
  }
}

/** One line per applied effect delta, e.g. "+5 Rep", "-1000 Money". */
function formatAppliedEffects(effects: Record<string, number> | undefined): string[] {
  if (!effects) return [];
  return Object.entries(effects)
    .filter(
      ([key, value]) =>
        typeof value === 'number' &&
        value !== 0 &&
        // Badge honesty (PR-2 fix): delayed_effect changes carry the RAW authored
        // effects_delayed record, which can still contain dead keys until the
        // channel PRs land — never render a badge the engine didn't apply.
        (LIVE_EFFECT_KEYS.has(key) || key === 'executive_mood')
    )
    .map(([key, value]) => {
      // variance_up is a volatility magnitude, not a signed value delta — always
      // rendered with ± regardless of the (rare) authored sign.
      if (key === 'variance_up') {
        return `±${Math.abs(value)} ${formatMeetingEffectLabel(key)}`;
      }
      return `${value > 0 ? '+' : ''}${value} ${formatMeetingEffectLabel(key)}`;
    });
}

export function WeekSummary({ weeklyStats, onAdvanceWeek, isAdvancing, isWeekResults, onClose }: WeekSummaryProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'projects'>('overview');
  const prefersReducedMotion = useReducedMotion();
  const instant = !!prefersReducedMotion;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'project_complete': return '🎵'; // Changed from 🎉 for recording completion
      case 'revenue': return '💰';
      case 'ongoing_revenue': return '📻';
      case 'release': return '🚀'; // New releases generating initial revenue
      case 'expense': return '💸';
      case 'unlock': return '🔓';
      case 'artist': return '🎤';
      case 'mood': return '💭'; // Mood changes
      case 'reputation': return '⭐'; // Reputation changes
      default: return '📊';
    }
  };

  // NEW: Determine the scope of a mood change
  type MoodScope = 'global' | 'predetermined' | 'user_selected' | 'routine';
  const determineMoodScope = (change: GameChange): MoodScope => {
    // Check source field directly for scope value
    if (change.source) {
      if (change.source === 'user_selected') {
        return 'user_selected';
      }
      if (change.source === 'predetermined') {
        return 'predetermined';
      }
      if (change.source === 'global') {
        return 'global';
      }
      // BUGFIX: Match both 'weekly_routine' and 'weekly_drift' for natural mood changes
      if (change.source === 'weekly_routine' || change.source === 'weekly_drift') {
        return 'routine';
      }
    }

    // Fallback: If has artistId but no clear source, could be user_selected or predetermined
    if (change.artistId) {
      // Default to predetermined for per-artist meeting effects without explicit source
      return 'predetermined';
    }

    // No artistId means global effect
    return 'global';
  };

  // NEW: Get scope icon based on mood scope
  const getScopeIcon = (scope: MoodScope): string => {
    switch (scope) {
      case 'global': return '🌍';
      case 'predetermined': return '⭐';
      case 'user_selected': return '👤';
      case 'routine': return '🔄';
      default: return '💭';
    }
  };

  // NEW: Format mood change description with scope-specific formatting
  const formatMoodChange = (change: GameChange): string => {
    const scope = determineMoodScope(change);

    // Extract artist name from description if present, or use artistId
    // Most mood changes should have the artist name in the description already
    const description = change.description || 'Mood Change';

    // Format based on scope (no icon in text - it's displayed separately)
    switch (scope) {
      case 'global':
        return `${description} (All Artists)`;

      case 'predetermined':
        return `${description} (Most Popular)`;

      case 'user_selected':
        return `${description} (Your Choice)`;

      case 'routine':
        return `${description}`; // Routine changes already have descriptive text

      default:
        return `${description}`;
    }
  };

  const categorizeChanges = (changes: GameChange[]) => {
    const categories = {
      revenue: [] as GameChange[],
      expenses: [] as GameChange[],
      achievements: [] as GameChange[],
      mood: [] as GameChange[],
      // Exec-meetings-revival PR-2: meeting/executive-interaction/delayed-effect
      // changes get their own bucket so exec decay notices (previously silently
      // dropped into "other" and never rendered) become visible for the first time.
      meetings: [] as GameChange[],
      other: [] as GameChange[]
    };

    changes.forEach(change => {
      if (change.type === 'revenue' || change.type === 'ongoing_revenue' || change.type === 'release') {
        categories.revenue.push(change);
      } else if (change.type === 'expense') {
        categories.expenses.push(change);
      } else if (change.type === 'unlock' || change.type === 'reputation') {
        categories.achievements.push(change);
      } else if (change.type === 'mood') {
        categories.mood.push(change);
      } else if (
        change.type === 'meeting' ||
        change.type === 'executive_interaction' ||
        change.type === 'delayed_effect'
      ) {
        categories.meetings.push(change);
      } else if (change.type === 'project_complete') {
        // Projects go to other category, will be shown in Projects tab
        categories.other.push(change);
      } else {
        categories.other.push(change);
      }
    });

    return categories;
  };

  const revenue = weeklyStats?.revenue || 0;
  const expenses = weeklyStats?.expenses || 0;
  const netIncome = revenue - expenses;
  const changes = weeklyStats?.changes || [];
  const categorizedChanges = categorizeChanges(changes);

  // Player-facing chart updates (competitor rows are ambient noise).
  const playerChartUpdates = useMemo(
    () => (weeklyStats?.chartUpdates || []).filter((u: ChartUpdate) => !u.isCompetitorSong),
    [weeklyStats?.chartUpdates]
  );

  // HERO moments now live IN the modal (fixing the missable-toast gap):
  //  - tier/access unlocks (always hero per the changeImportance classifier)
  //  - No. 1 chart outcomes (debut at #1 or climb to #1)
  const heroUnlocks = useMemo(
    () => changes.filter((c) => c.type === 'unlock'),
    [changes]
  );
  const heroChartUpdates = useMemo(
    () => playerChartUpdates.filter((u) => classifyChartUpdate(u) === 'hero'),
    [playerChartUpdates]
  );
  const hasHeroMoments = heroUnlocks.length > 0 || heroChartUpdates.length > 0;

  // The achievements card keeps reputation lines; unlocks are pulled out into
  // the celebrated hero section above so they are never missed.
  const nonUnlockAchievements = useMemo(
    () => categorizedChanges.achievements.filter((c) => c.type !== 'unlock'),
    [categorizedChanges.achievements]
  );

  const { currentStage, isComplete, skip } = useStagedReveal({
    stageCount: STAGE_COUNT,
    stageDelays: STAGE_DELAYS,
    instant,
  });

  // --- Celebration tier (Phase 4 PR-5) -------------------------------------
  // The hero stage gets a distinct fanfare when a No. 1 chart update lands:
  // a single ParticleBurst over the Milestone Moments card. The store already
  // plays the week's priority sting (hero-fanfare / campaign-end / etc.) once
  // per advance, so we DO NOT add sound to the hero stage here (that would
  // double up). The two previously-unwired stage stings are handled below.
  const hasNo1 = heroChartUpdates.length > 0;
  // Fire particles once the hero stage reveals, only when there's a No. 1 and
  // we're not in instant/skip mode. `heroStageRevealed` flips true exactly once
  // and never back, so ParticleBurst emits a single burst.
  const heroStageRevealed = !instant && currentStage >= STAGE_HERO;
  const fireHeroParticles = heroStageRevealed && hasNo1;

  // Notable-stage sting: when the NOTABLE stage reveals with notable content
  // (chart highlights or non-unlock achievements), play the notable-chime once.
  // Suppressed under instant/reduced-motion and when skipped (the reveal jumps
  // straight to complete, so the staged chime is intentionally silent). The
  // audio manager itself de-dupes to the highest-priority sound; notable-chime
  // is not one the store fires, so there is no conflict with the week sting.
  const hasNotableContent = playerChartUpdates.length > 0 || nonUnlockAchievements.length > 0;
  const notableChimePlayed = useRef(false);
  useEffect(() => {
    if (instant) return; // reduced-motion / skip toggle → no stage chime
    if (notableChimePlayed.current) return;
    if (currentStage >= STAGE_NOTABLE && !isComplete && hasNotableContent) {
      notableChimePlayed.current = true;
      playSound('notable-chime');
    }
  }, [currentStage, isComplete, instant, hasNotableContent]);

  // Net-income hero count-up. AnimatedNumber renders STATICALLY on first mount
  // (by PR-1 design) and only animates on value CHANGES — so mounting with
  // netIncome already final meant the count-up never played. Instead, start a
  // local hero value at 0 (or at netIncome under reduced motion, so there is
  // never a $0 flash) and move it to netIncome right after mount to trigger
  // the spring. A click-skip flips `wasSkipped`, which makes AnimatedNumber
  // jump to the final value mid-flight.
  const [heroValue, setHeroValue] = useState(() => (instant ? netIncome : 0));
  const [wasSkipped, setWasSkipped] = useState(false);
  useEffect(() => {
    setHeroValue(netIncome);
  }, [netIncome]);

  // Skip on any click / keypress inside the modal while the sequence is running.
  // Once revealed, interactions behave normally (tabs, close button, footer).
  const skipAll = () => {
    skip();
    setWasSkipped(true);
  };
  const handleSkipInteraction = () => {
    if (!isComplete) skipAll();
  };
  const handleSkipKey = (_e: React.KeyboardEvent) => {
    if (!isComplete) skipAll();
  };

  // Switching tabs mid-sequence completes the reveal so returning to Overview
  // shows the final state (the Charts/Projects tabs are static regardless).
  const handleTabChange = (value: string) => {
    if (!isComplete) skipAll();
    setActiveTab(value as 'overview' | 'charts' | 'projects');
  };

  const hasResults = isWeekResults && (changes.length > 0 || playerChartUpdates.length > 0);

  const overviewBody = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Sources (stage 1) */}
        {categorizedChanges.revenue.length > 0 && (
          <RevealGroup revealed={currentStage >= STAGE_REVENUE} instant={instant}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-positive text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>Revenue Sources</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categorizedChanges.revenue.map((change: GameChange, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-positive/[0.08] rounded-[12px] border border-positive/20">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm">{getChangeIcon(change.type)}</span>
                      <span className="text-sm font-medium text-text-primary">{change.description}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-positive border-positive/40 font-semibold">
                      +{formatCurrency(change.amount || 0)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </RevealGroup>
        )}

        {/* HERO MOMENTS (stage 2): tier unlocks + No. 1 chart outcomes.
            Elevated treatment via GlowEffect + .text-aberration. Moved into the
            modal so a player reading results never misses an unlock. */}
        {hasHeroMoments && (
          <RevealGroup revealed={currentStage >= STAGE_HERO} instant={instant}>
            <Card className="relative overflow-hidden border-neon-magenta/40">
              <GlowEffect
                mode="pulse"
                blur="stronger"
                colors={['#ff4fd8', '#a855f7', '#22d3ee']}
                className="opacity-[0.18]"
              />
              {/* Celebration particles: one burst when the hero stage reveals a
                  No. 1 chart update. Self-gated on reduced motion. */}
              <ParticleBurst
                trigger={fireHeroParticles}
                colors={['#ff4fd8', '#a855f7', '#22d3ee', '#fbbf24']}
                particleCount={26}
              />
              <CardHeader className="relative">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Trophy className="h-4 w-4 text-neon-magenta" />
                  <span className="text-aberration font-bold uppercase tracking-wide">Milestone Moments</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-3">
                {/* Tier / access unlocks */}
                {heroUnlocks.map((change: GameChange, index: number) => (
                  <div
                    key={`unlock-${index}`}
                    className="flex items-center justify-between p-3 rounded-[12px] border border-neon-magenta/40 bg-gradient-to-r from-neon-magenta/[0.16] to-neon-purple/[0.10] shadow-glow-purple"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-neon-magenta/20 border border-neon-magenta/40">
                        <Unlock className="h-4 w-4 text-neon-magenta" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-neon-magenta/80">New Access Unlocked</div>
                        <span className="text-sm font-semibold text-text-primary">{change.description}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {/* No. 1 chart outcomes */}
                {heroChartUpdates.map((update: ChartUpdate, index: number) => (
                  <div
                    key={`chart-${index}`}
                    className="flex items-center justify-between p-3 rounded-[12px] border border-neon-amber/40 bg-gradient-to-r from-neon-amber/[0.16] to-neon-magenta/[0.10] shadow-glow-purple"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-neon-amber/20 border border-neon-amber/40">
                        <Trophy className="h-4 w-4 text-neon-amber" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-neon-amber/80">
                          {update.isDebut ? 'No. 1 Debut' : 'No. 1'}
                        </div>
                        <span className="text-sm font-semibold text-text-primary">
                          {update.songTitle} — {update.artistName}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-neon-amber border-neon-amber/40 font-semibold">
                      #1
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </RevealGroup>
        )}

        {/* Chart Performance Summary for Overview (stage 3, notable) */}
        {playerChartUpdates.length > 0 && (
          <RevealGroup revealed={currentStage >= STAGE_NOTABLE} instant={instant}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-neon-amber text-sm">
                  <BarChart3 className="h-4 w-4" />
                  <span>Chart Highlights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartPerformanceCard
                  chartUpdates={playerChartUpdates}
                  showHeader={false}
                  compact={true}
                  variant="dark"
                  className="border-0 p-0 bg-transparent"
                />
              </CardContent>
            </Card>
          </RevealGroup>
        )}

        {/* Achievements (stage 3, notable) — unlocks already shown as heroes above */}
        {nonUnlockAchievements.length > 0 && (
          <RevealGroup revealed={currentStage >= STAGE_NOTABLE} instant={instant}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-neon-lilac text-sm">
                  <Trophy className="h-4 w-4" />
                  <span>Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nonUnlockAchievements.map((change: GameChange, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-neon-purple/10 rounded-[12px] border border-neon-purple/20">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm">{getChangeIcon(change.type)}</span>
                      <span className="text-sm font-medium text-neon-lilac">{change.description}</span>
                    </div>
                    {change.type === 'reputation' && change.amount !== undefined && change.amount !== 0 && (
                      <Badge variant="outline" className="text-xs font-mono text-neon-lilac border-neon-purple/40 font-semibold">
                        {change.amount > 0 ? '+' : ''}{change.amount}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </RevealGroup>
        )}

        {/* Mood Changes (stage 4, routine) */}
        {categorizedChanges.mood.length > 0 && (
          <RevealGroup revealed={currentStage >= STAGE_ROUTINE} instant={instant}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-neon-lilac text-sm">
                  <span className="text-base">💭</span>
                  <span>Mood Changes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categorizedChanges.mood.map((change: GameChange, index: number) => {
                  const scope = determineMoodScope(change);
                  const scopeIcon = getScopeIcon(scope);
                  const moodDelta = change.moodChange || 0;
                  const isPositive = moodDelta >= 0;

                  // Determine scope-specific styling
                  const scopeColors: Record<MoodScope, string> = {
                    global: 'bg-neon-blue/20 text-neon-blue border-neon-blue/30',
                    predetermined: 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30',
                    user_selected: 'bg-neon-purple/20 text-neon-lilac border-neon-purple/30',
                    routine: 'bg-white/[0.06] text-white/60 border-white/[0.12]',
                  };

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-[12px] border ${
                        isPositive
                          ? 'bg-neon-purple/10 border-neon-purple/20'
                          : 'bg-neon-amber/10 border-neon-amber/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Scope Icon with visual styling */}
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg border ${
                            scopeColors[scope]
                          }`}
                        >
                          {scopeIcon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-white/90">
                            {formatMoodChange(change)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs font-mono font-semibold flex-shrink-0 ${
                              isPositive
                                ? 'text-neon-lilac border-neon-purple/40'
                                : 'text-neon-amber border-neon-amber/40'
                            }`}
                          >
                            {isPositive ? '+' : ''}{moodDelta}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </RevealGroup>
        )}

        {/* Meetings (stage 4, routine) — meeting/executive_interaction/delayed_effect
            changes. Mirrors the Mood card pattern. Executive decay notices (loyalty
            drop from neglect) are now visible for the first time (case-file §2/§6d);
            they carry importance: 'notable' from classifyChange but are rendered here
            regardless of importance tier — the staged reveal already gates them to
            the routine stage via this card's placement, not per-item hero/notable
            styling. */}
        {categorizedChanges.meetings.length > 0 && (
          <RevealGroup revealed={currentStage >= STAGE_ROUTINE} instant={instant}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-neon-cyan text-sm">
                  <Users className="h-4 w-4" />
                  <span>Meetings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categorizedChanges.meetings.map((change: GameChange, index: number) => {
                  const isExecInteraction = change.type === 'executive_interaction';
                  const isLoyaltyDecay = isExecInteraction && (change.loyaltyChange ?? 0) < 0;
                  const appliedLines = formatAppliedEffects(change.appliedEffects);

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-[12px] border ${
                        isLoyaltyDecay
                          ? 'bg-neon-amber/10 border-neon-amber/20'
                          : 'bg-surface-inner/40 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white/90">
                            {change.description}
                          </span>
                          {change.choiceLabel && (
                            <p className="text-xs text-text-muted mt-0.5 truncate">
                              {change.choiceLabel}
                            </p>
                          )}
                          {appliedLines.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {appliedLines.map((line, lineIdx) => (
                                <Badge
                                  key={lineIdx}
                                  variant="outline"
                                  className="text-xs font-mono rounded-pill text-neon-cyan border-neon-cyan/40"
                                >
                                  {line}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Exec mood/loyalty deltas from processExecutiveActions ("Met
                            with X") or the decay path (loyalty-only, no mood pairing). */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {change.moodChange !== undefined && change.moodChange !== 0 && (
                            <Badge
                              variant="outline"
                              className={`text-xs font-mono font-semibold ${
                                change.moodChange > 0
                                  ? 'text-positive border-positive/40'
                                  : 'text-negative border-negative/40'
                              }`}
                            >
                              {change.moodChange > 0 ? '+' : ''}{change.moodChange} Mood
                            </Badge>
                          )}
                          {change.loyaltyBoost !== undefined && change.loyaltyBoost !== 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs font-mono font-semibold text-positive border-positive/40"
                            >
                              +{change.loyaltyBoost} Loyalty
                            </Badge>
                          )}
                          {isLoyaltyDecay && (
                            <Badge
                              variant="outline"
                              className="text-xs font-mono font-semibold text-neon-amber border-neon-amber/40"
                            >
                              {change.loyaltyChange} Loyalty
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </RevealGroup>
        )}
      </div>

      {/* Performance Summary (stage 4, routine) */}
      <RevealGroup revealed={currentStage >= STAGE_ROUTINE} instant={instant}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className={`inline-flex items-center space-x-2 p-4 rounded-xl ${
                netIncome >= 0 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
              }`}>
                {netIncome >= 0 ? (
                  <Zap className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span className="text-sm font-semibold">
                  {netIncome >= 0 ?
                    `Excellent! You generated ${formatCurrency(netIncome)} in profit this week.` :
                    `Focus needed: You had a ${formatCurrency(Math.abs(netIncome))} loss this week.`
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </RevealGroup>
    </div>
  );

  return (
    <motion.div
      className="glass-panel chromatic-hairline hud-ticks rounded-card w-full max-w-7xl mx-auto text-text-primary"
      initial={instant ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClickCapture={handleSkipInteraction}
      onKeyDownCapture={handleSkipKey}
    >
      {/* Header Section - Clean and prominent */}
      <div className="px-8 py-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {isWeekResults ? `Week ${weeklyStats?.week || ''} Results` : 'Week Summary'}
            </h1>
            <p className="text-sm text-text-body mt-1">
              Your financial performance and key achievements
            </p>
          </div>

          {/* Close button - only show if onClose is provided */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-text-body hover:text-text-primary hover:bg-white/[0.08]"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {/* Big prominent net income display (hero count-up) */}
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-[12px] ${netIncome >= 0 ? 'bg-positive/[0.14]' : 'bg-negative/[0.14]'}`}>
                {netIncome >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-positive" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-negative" />
                )}
              </div>
              <div>
                <div className={`text-2xl font-bold font-mono ${
                  netIncome >= 0 ? 'text-positive' : 'text-negative'
                }`}>
                  <AnimatedNumber
                    value={heroValue}
                    skipAnimation={instant || wasSkipped}
                    format={(n) => `${netIncome >= 0 ? '+' : ''}${formatCurrency(Math.round(n))}`}
                  />
                </div>
                <div className="text-sm text-text-muted font-medium">Net Income</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Bar - Horizontal layout for easy scanning */}
      <div className="px-8 py-6 border-b border-white/[0.06]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Revenue Card */}
          <div className="glass-panel rounded-[14px] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-positive/[0.14] rounded-[12px]">
                  <TrendingUp className="h-5 w-5 text-positive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-positive">Revenue</h3>
                  <p className="text-xs text-text-muted">Income earned</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-money">
                  {formatCurrency(revenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="glass-panel rounded-[14px] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-negative/[0.14] rounded-[12px]">
                  <TrendingDown className="h-5 w-5 text-negative" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-negative">Expenses</h3>
                  <p className="text-xs text-text-muted">Costs incurred</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono text-money">
                  {formatCurrency(expenses)}
                </div>
              </div>
            </div>
          </div>

          {/* Profit Margin Card */}
          <div className="glass-panel rounded-[14px] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-[12px] ${netIncome >= 0 ? 'bg-neon-lilac/[0.14]' : 'bg-neon-amber/[0.14]'}`}>
                  <DollarSign className={`h-5 w-5 ${netIncome >= 0 ? 'text-neon-lilac' : 'text-neon-amber'}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${netIncome >= 0 ? 'text-neon-lilac' : 'text-neon-amber'}`}>
                    Profit Margin
                  </h3>
                  <p className="text-xs text-text-muted">Performance ratio</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold font-mono ${netIncome >= 0 ? 'text-neon-lilac' : 'text-neon-amber'}`}>
                  {revenue > 0 ? `${((netIncome / revenue) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual breakdown bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-label">Financial Breakdown</h4>
            <div className="text-xs text-text-muted">
              Revenue vs Expenses
            </div>
          </div>

          <div className="relative bg-white/[0.08] rounded-pill h-4 overflow-hidden">
            {revenue > 0 && (
              <div
                className="absolute left-0 top-0 h-full bg-positive rounded-pill transition-all duration-500"
                style={{ width: `${(revenue / (revenue + expenses)) * 100}%` }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xs font-medium text-text-primary/90">
                {revenue > 0 ? `${formatCurrency(revenue)} earned` : 'No revenue'}
                {expenses > 0 && ` • ${formatCurrency(expenses)} spent`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-8 py-6">
        {hasResults ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Charts</span>
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center space-x-2">
                <Music className="h-4 w-4" />
                <span>Projects</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {overviewBody}
            </TabsContent>

            <TabsContent value="charts" className="space-y-6">
              {playerChartUpdates.length > 0 ? (
                <div className="space-y-6">
                  <ChartPerformanceCard
                    chartUpdates={playerChartUpdates}
                    variant="dark"
                    className="border-white/[0.08]"
                  />

                  {/* Chart Movement Summary */}
                  <Card className="border-white/[0.08]">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-white text-sm">
                        <BarChart3 className="h-4 w-4" />
                        <span>Chart Movement Analysis</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold font-mono text-neon-yellow">
                            {playerChartUpdates.filter((u: ChartUpdate) => u.isDebut).length}
                          </div>
                          <div className="text-sm text-white/70">New Debuts</div>
                          <div className="text-xs text-white/50 mt-1">Your songs entering charts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold font-mono text-positive">
                            {playerChartUpdates.filter((u: ChartUpdate) => u.movement && u.movement > 0).length}
                          </div>
                          <div className="text-sm text-white/70">Climbing</div>
                          <div className="text-xs text-white/50 mt-1">Your songs moving up</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold font-mono text-neon-cyan">
                            {playerChartUpdates.filter((u: ChartUpdate) => u.position && u.position <= 10).length}
                          </div>
                          <div className="text-sm text-white/70">Top 10</div>
                          <div className="text-xs text-white/50 mt-1">Your songs in elite positions</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-white/[0.08]">
                  <CardContent className="p-12 text-center">
                    <div className="w-[52px] h-[52px] rounded-[14px] bg-neon-purple/[0.12] border border-neon-purple/[0.32] shadow-glow-purple flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-5 w-5 text-neon-lilac" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/85 mb-2">No Chart Activity</h3>
                    <p className="text-xs text-white/45">No songs charted this week</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              {changes.filter((c: GameChange) => c.type === 'project_complete' || c.type === 'song_release').length > 0 ? (
                <div className="grid gap-4">
                  {changes.filter((c: GameChange) => c.type === 'project_complete' || c.type === 'song_release').map((change: GameChange, index: number) => (
                    <Card key={index} className="border-white/[0.08] hover:shadow-panel transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-positive/[0.14] rounded-full">
                              <Music className="h-5 w-5 text-positive" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-text-primary">{change.description}</h4>
                              <div className="flex items-center space-x-4 text-xs text-white/50 mt-1">
                                <span>Revenue: <span className="font-mono text-money">{formatCurrency(change.amount || 0)}</span></span>
                                {change.projectId && <span className="font-mono">Project ID: {change.projectId}</span>}
                              </div>
                            </div>
                          </div>
                          <Badge className="rounded-pill bg-positive/[0.14] border border-positive/40 font-mono text-positive px-2 py-1 text-xs">
                            {change.type === 'project_complete' ? 'Recorded' : 'Released'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-white/[0.08]">
                  <CardContent className="p-12 text-center">
                    <div className="w-[52px] h-[52px] rounded-[14px] bg-neon-cyan/[0.12] border border-neon-cyan/[0.32] shadow-glow-cyan flex items-center justify-center mx-auto mb-4">
                      <Music className="h-5 w-5 text-neon-cyan" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/85 mb-2">No Projects Completed</h3>
                    <p className="text-xs text-white/45">No projects were completed this week</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Empty state for no results */
          <Card className="border-white/[0.08]">
            <CardContent className="p-12 text-center">
              <div className="w-[52px] h-[52px] rounded-[14px] bg-neon-purple/[0.12] border border-neon-purple/[0.32] shadow-glow-purple mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-neon-lilac" />
              </div>
              <h3 className="text-base font-semibold text-white/85 mb-2">No Results Available</h3>
              <p className="text-sm text-white/45">No detailed results are available for this week</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-6 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-md mx-auto">
          <Button
            onClick={onAdvanceWeek}
            disabled={isAdvancing}
            size="lg"
            className="w-full bg-gradient-to-br from-action-pink to-action-purple text-white font-semibold py-4 px-6 rounded-button transition-all duration-200 shadow-action hover:opacity-95"
          >
            {isAdvancing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Advancing...
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                {isWeekResults ? (
                  <>
                    <DollarSign className="h-5 w-5" />
                    <span>Back to Dashboard</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    <span>Continue to Next Week</span>
                  </>
                )}
              </span>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
