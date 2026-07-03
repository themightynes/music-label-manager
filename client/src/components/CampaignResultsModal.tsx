import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber } from './motion-primitives/animated-number';
import { ParticleBurst } from './motion-primitives/particle-burst';
import { useStagedReveal } from '@/hooks/useStagedReveal';

interface CampaignResults {
  campaignCompleted: boolean;
  finalScore: number;
  scoreBreakdown: {
    money: number;
    reputation: number;
    artistsSuccessful: number;
    projectsCompleted: number;
    accessTierBonus: number;
  };
  victoryType: 'Commercial Success' | 'Critical Acclaim' | 'Balanced Growth' | 'Survival' | 'Failure';
  summary: string;
  achievements: string[];
}

interface CampaignResultsModalProps {
  campaignResults: CampaignResults;
  onClose: () => void;
  onNewGame: () => void;
}

// --- Staged reveal timeline (Phase 4 PR-5) ---------------------------------
// The five score-breakdown cells stagger in one at a time after the header.
// Stage 0 is the header/score beat; stages 1..5 reveal the breakdown cells in
// order. Total mandatory sequence = sum of STAGE_DELAYS = 1050ms, well under
// the ~3s budget. Reduced motion / a click jump straight to fully revealed.
const BREAKDOWN_COUNT = 5;
const STAGE_COUNT = BREAKDOWN_COUNT + 1; // header + 5 cells
const STAGE_DELAYS = [0, 250, 200, 200, 200, 200];

// A staged reveal cell: fades/slides in once `revealed` flips true. Under
// reduced motion (`instant`) it renders as a plain div, visible immediately.
const RevealCell: React.FC<{
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
      animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      aria-hidden={revealed ? undefined : true}
    >
      {children}
    </motion.div>
  );
};

export function CampaignResultsModal({ campaignResults, onClose, onNewGame }: CampaignResultsModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const instant = !!prefersReducedMotion;

  const getVictoryTypeColor = (victoryType: string) => {
    switch (victoryType) {
      case 'Commercial Success':
        return 'bg-positive';
      case 'Critical Acclaim':
        return 'bg-neon-purple';
      case 'Balanced Growth':
        return 'bg-neon-lilac';
      case 'Survival':
        return 'bg-warning';
      case 'Failure':
        return 'bg-negative';
      default:
        return 'bg-white/40';
    }
  };

  const getVictoryTypeIcon = (victoryType: string) => {
    switch (victoryType) {
      case 'Commercial Success':
        return '💰';
      case 'Critical Acclaim':
        return '⭐';
      case 'Balanced Growth':
        return '🏆';
      case 'Survival':
        return '🛡️';
      case 'Failure':
        return '💔';
      default:
        return '🎮';
    }
  };

  const finalScore = campaignResults.finalScore;

  const { currentStage, isComplete, skip } = useStagedReveal({
    stageCount: STAGE_COUNT,
    stageDelays: STAGE_DELAYS,
    instant,
  });

  // Final-score count-up. AnimatedNumber renders statically on FIRST mount, so
  // we start at 0 (or finalScore under reduced motion, to avoid a 0 flash) and
  // move to the real score right after mount to drive the spring. A click-skip
  // flips `wasSkipped`, jumping AnimatedNumber to the final value.
  const [scoreValue, setScoreValue] = useState(() => (instant ? finalScore : 0));
  const [wasSkipped, setWasSkipped] = useState(false);
  useEffect(() => {
    setScoreValue(finalScore);
  }, [finalScore]);

  // One entry celebration burst (self-gated on reduced motion inside the
  // primitive). `true` triggers a single burst on mount.
  const showEntryBurst = !instant;

  const skipAll = () => {
    skip();
    setWasSkipped(true);
  };
  const handleSkipInteraction = () => {
    if (!isComplete) skipAll();
  };
  const handleSkipKey = () => {
    if (!isComplete) skipAll();
  };

  // Score-breakdown cells, in reveal order. Each is a fact that must always be
  // shown (information parity with the pre-PR static layout).
  const breakdownCells = [
    { value: campaignResults.scoreBreakdown.money, label: 'Money', color: 'text-money' },
    { value: campaignResults.scoreBreakdown.reputation, label: 'Reputation', color: 'text-neon-lilac' },
    { value: campaignResults.scoreBreakdown.artistsSuccessful, label: 'Artist Success', color: 'text-positive' },
    { value: campaignResults.scoreBreakdown.projectsCompleted, label: 'Projects', color: 'text-neon-amber' },
    { value: campaignResults.scoreBreakdown.accessTierBonus, label: 'Access Bonus', color: 'text-neon-cyan' },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto hud-ticks"
        onClickCapture={handleSkipInteraction}
        onKeyDownCapture={handleSkipKey}
      >
        <DialogHeader className="relative border-b border-white/10 pb-6 text-center">
          {/* Entry celebration particles (self-gated on reduced motion). */}
          <ParticleBurst
            trigger={showEntryBurst}
            colors={['#ff4fd8', '#a855f7', '#22d3ee', '#fbbf24']}
            particleCount={28}
          />
          <div className="relative mb-4 text-6xl">
            {getVictoryTypeIcon(campaignResults.victoryType)}
          </div>
          <DialogTitle className="relative font-display text-2xl font-normal lowercase tracking-wide text-aberration">
            Campaign Complete!
          </DialogTitle>
          <div className="relative mt-4">
            <Badge
              className={`border-0 px-4 py-2 text-lg text-white ${getVictoryTypeColor(campaignResults.victoryType)}`}
            >
              {campaignResults.victoryType}
            </Badge>
            <div className="mt-2 font-mono text-3xl font-semibold text-white/90">
              Final Score:{' '}
              <AnimatedNumber
                value={scoreValue}
                skipAnimation={instant || wasSkipped}
                format={(n) => `${Math.round(n)}`}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">
                Your Story
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-white/90">
                {campaignResults.summary}
              </p>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">
                Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {breakdownCells.map((cell, index) => (
                  <RevealCell
                    key={cell.label}
                    revealed={currentStage >= index + 1}
                    instant={instant}
                    className="text-center"
                  >
                    <div className={`font-mono text-xl font-semibold leading-none ${cell.color}`}>
                      {cell.value}
                    </div>
                    <div className="mt-1.5 text-[11.5px] text-white/50">{cell.label}</div>
                  </RevealCell>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          {campaignResults.achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">
                  Achievements Unlocked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {campaignResults.achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 rounded-button border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="text-xl">🏅</div>
                      <div className="font-medium text-white/90">
                        {achievement}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 border-t border-white/10 p-6">
          <Button
            variant="secondary"
            onClick={onClose}
            className="px-8 py-3"
          >
            View Dashboard
          </Button>
          <Button
            onClick={onNewGame}
            className="px-8 py-3"
          >
            Start New Campaign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
