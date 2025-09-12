import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { ROLE_TYPES } from '@/lib/gameData';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DialogueModalProps {
  roleId: string;
  meetingId: string;
  gameId: string;
  onClose: () => void;
  onChoiceSelect: (choiceId: string, effects: any) => Promise<void>;
  onBack?: () => void; // Optional back handler to return to meeting selection
}

export function DialogueModal({ roleId, meetingId, gameId, onClose, onChoiceSelect, onBack }: DialogueModalProps) {
  // Load role and meeting data from API
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['role', roleId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/roles/${roleId}`);
      return response.json();
    }
  });

  const { data: meetingData, isLoading: meetingLoading } = useQuery({
    queryKey: ['meeting', roleId, meetingId], 
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/roles/${roleId}/meetings/${meetingId}`);
      return response.json();
    },
    enabled: !!roleId && !!meetingId
  });

  if (roleLoading || meetingLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading Dialogue</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-white/50">Loading dialogue...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!roleData || !meetingData) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dialogue Unavailable</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-white/50">Dialogue content not available.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const roleInfo = ROLE_TYPES[roleData.name as keyof typeof ROLE_TYPES] || { name: roleData.name, icon: 'fas fa-user' };

  const handleChoiceSelect = async (choiceId: string) => {
    const choice = meetingData.choices.find((c: any) => c.id === choiceId);
    if (!choice) return;

    await onChoiceSelect(choiceId, {
      immediate: choice.effects_immediate || {},
      delayed: choice.effects_delayed || {}
    });
    onClose();
  };

  const renderEffectBadge = (effect: string, value: number) => {
    const isPositive = value > 0;
    const sign = isPositive ? '+' : '';
    
    // Enhanced handling for artist mood and loyalty effects
    if (effect === 'artist_mood') {
      const color = isPositive ? 'bg-green-400/20 text-green-400 border border-green-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30';
      return (
        <Badge className={`text-xs px-2 py-1 rounded-full ${color} flex items-center gap-1`}>
          <i className="fas fa-smile text-xs"></i>
          Mood: {sign}{value}
        </Badge>
      );
    }
    
    if (effect === 'artist_loyalty') {
      const color = isPositive ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30';
      return (
        <Badge className={`text-xs px-2 py-1 rounded-full ${color} flex items-center gap-1`}>
          <i className="fas fa-heart text-xs"></i>
          Loyalty: {sign}{value}
        </Badge>
      );
    }
    
    if (effect === 'artist_popularity') {
      const color = isPositive ? 'bg-purple-400/20 text-purple-400 border border-purple-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30';
      return (
        <Badge className={`text-xs px-2 py-1 rounded-full ${color} flex items-center gap-1`}>
          <i className="fas fa-star text-xs"></i>
          Popularity: {sign}{value}
        </Badge>
      );
    }
    
    // Special handling for money effects
    if (effect === 'money') {
      const color = isPositive ? 'bg-green-400/20 text-green-400 border border-green-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30';
      return (
        <Badge className={`text-xs px-2 py-1 rounded-full ${color} flex items-center gap-1`}>
          <i className="fas fa-dollar-sign text-xs"></i>
          ${Math.abs(value).toLocaleString()}
        </Badge>
      );
    }
    
    // Special handling for creative capital effects
    if (effect === 'creative_capital') {
      const color = isPositive ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30';
      return (
        <Badge className={`text-xs px-2 py-1 rounded-full ${color} flex items-center gap-1`}>
          <i className="fas fa-lightbulb text-xs"></i>
          Creative: {sign}{value}
        </Badge>
      );
    }
    
    // Special handling for reputation effects
    if (effect === 'reputation') {
      const color = isPositive ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30';
      return (
        <Badge className={`text-xs px-2 py-1 rounded-full ${color} flex items-center gap-1`}>
          <i className="fas fa-trophy text-xs"></i>
          Reputation: {sign}{value}
        </Badge>
      );
    }
    
    // Default handling for other effects
    const color = isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger';
    return (
      <Badge className={`text-xs px-2 py-1 rounded-full ${color}`}>
        {sign}{value} {effect}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="border-b border-[#4e324c] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#A75A5B] rounded-lg flex items-center justify-center">
                <i className={`${roleInfo?.icon || 'fas fa-user'} text-white text-xl`}></i>
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  Meeting with {roleInfo?.name || roleData.name}
                </DialogTitle>
                <p className="text-sm text-white/70">Industry Professional</p>
              </div>
            </div>
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="text-white/70 hover:text-white hover:bg-[#A75A5B]/10 hover:border-[#A75A5B]"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Meetings
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-white/90 leading-relaxed">
              {meetingData.prompt}
            </p>
          </div>

          <div className="space-y-3">
            {meetingData.choices.map((choice: any) => (
              <Button
                key={choice.id}
                variant="outline"
                className="w-full text-left p-4 hover:bg-[#A75A5B]/10 hover:border-[#A75A5B] group h-auto"
                onClick={() => handleChoiceSelect(choice.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-white group-hover:text-[#A75A5B] transition-colors">
                      {choice.label}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-1">
                    {Object.entries(choice.effects_immediate || {}).map(([effect, value]) => (
                      <div key={effect} className="flex items-center gap-1">
                        <span className="text-xs text-green-400">IMMEDIATE:</span>
                        {renderEffectBadge(effect, value as number)}
                      </div>
                    ))}
                    {Object.entries(choice.effects_delayed || {}).map(([effect, value]) => (
                      <div key={effect} className="flex items-center gap-1">
                        <span className="text-xs text-orange-400">Later:</span>
                        {renderEffectBadge(effect, value as number)}
                      </div>
                    ))}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
