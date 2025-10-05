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
        return 'bg-green-500';
      case 'Critical Acclaim':
        return 'bg-brand-burgundy-dark';
      case 'Balanced Growth':
        return 'bg-brand-burgundy/100';
      case 'Survival':
        return 'bg-yellow-500';
      case 'Failure':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center border-b border-brand-purple pb-6">
          <div className="text-6xl mb-4">
            {getVictoryTypeIcon(campaignResults.victoryType)}
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            Campaign Complete!
          </DialogTitle>
          <div className="mt-4">
            <Badge 
              className={`text-white text-lg px-4 py-2 ${getVictoryTypeColor(campaignResults.victoryType)}`}
            >
              {campaignResults.victoryType}
            </Badge>
            <div className="text-3xl font-bold text-white/90 mt-2">
              Final Score: {campaignResults.finalScore}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">
                Your Story
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/90 leading-relaxed">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {campaignResults.scoreBreakdown.money}
                  </div>
                  <div className="text-sm text-white/70">Money</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-burgundy-dark">
                    {campaignResults.scoreBreakdown.reputation}
                  </div>
                  <div className="text-sm text-white/70">Reputation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-burgundy">
                    {campaignResults.scoreBreakdown.artistsSuccessful}
                  </div>
                  <div className="text-sm text-white/70">Artist Success</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {campaignResults.scoreBreakdown.projectsCompleted}
                  </div>
                  <div className="text-sm text-white/70">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {campaignResults.scoreBreakdown.accessTierBonus}
                  </div>
                  <div className="text-sm text-white/70">Access Bonus</div>
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
                      className="flex items-center space-x-3 p-3 bg-brand-dark-card/20 rounded-lg"
                    >
                      <div className="text-xl">🏅</div>
                      <div className="text-white/90 font-medium">
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
        <div className="flex justify-center space-x-4 p-6 border-t border-brand-purple">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-8 py-3"
          >
            View Dashboard
          </Button>
          <Button
            onClick={onNewGame}
            className="px-8 py-3 bg-primary text-white hover:bg-brand-burgundy"
          >
            Start New Campaign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}