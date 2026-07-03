import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export function CampaignResultsModal({ campaignResults, onClose, onNewGame }: CampaignResultsModalProps) {
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto hud-ticks">
        <DialogHeader className="border-b border-white/10 pb-6 text-center">
          <div className="mb-4 text-6xl">
            {getVictoryTypeIcon(campaignResults.victoryType)}
          </div>
          <DialogTitle className="font-display text-2xl font-normal lowercase tracking-wide text-aberration">
            Campaign Complete!
          </DialogTitle>
          <div className="mt-4">
            <Badge
              className={`border-0 px-4 py-2 text-lg text-white ${getVictoryTypeColor(campaignResults.victoryType)}`}
            >
              {campaignResults.victoryType}
            </Badge>
            <div className="mt-2 font-mono text-3xl font-semibold text-white/90">
              Final Score: {campaignResults.finalScore}
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
                <div className="text-center">
                  <div className="font-mono text-xl font-semibold leading-none text-money">
                    {campaignResults.scoreBreakdown.money}
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-white/50">Money</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xl font-semibold leading-none text-neon-lilac">
                    {campaignResults.scoreBreakdown.reputation}
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-white/50">Reputation</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xl font-semibold leading-none text-positive">
                    {campaignResults.scoreBreakdown.artistsSuccessful}
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-white/50">Artist Success</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xl font-semibold leading-none text-neon-amber">
                    {campaignResults.scoreBreakdown.projectsCompleted}
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-white/50">Projects</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xl font-semibold leading-none text-neon-cyan">
                    {campaignResults.scoreBreakdown.accessTierBonus}
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-white/50">Access Bonus</div>
                </div>
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