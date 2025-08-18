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
}

export function DialogueModal({ roleId, meetingId, gameId, onClose, onChoiceSelect }: DialogueModalProps) {
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
            <div className="text-slate-500">Loading dialogue...</div>
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
            <p className="text-slate-500">Dialogue content not available.</p>
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
    const color = isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger';
    const sign = isPositive ? '+' : '';
    
    return (
      <Badge className={`text-xs px-2 py-1 rounded-full ${color}`}>
        {sign}{value} {effect}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <i className={`${roleInfo?.icon || 'fas fa-user'} text-white text-xl`}></i>
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Meeting with {roleInfo?.name || roleData.name}
              </DialogTitle>
              <p className="text-sm text-slate-600">Industry Professional</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-slate-700 leading-relaxed">
              {meetingData.prompt}
            </p>
          </div>

          <div className="space-y-3">
            {meetingData.choices.map((choice: any) => (
              <Button
                key={choice.id}
                variant="outline"
                className="w-full text-left p-4 hover:bg-slate-50 hover:border-primary group h-auto"
                onClick={() => handleChoiceSelect(choice.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-slate-900 group-hover:text-primary transition-colors">
                      {choice.label}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-1">
                    {Object.entries(choice.effects_immediate || {}).map(([effect, value]) => (
                      <div key={effect}>
                        {renderEffectBadge(effect, value as number)}
                      </div>
                    ))}
                    {Object.entries(choice.effects_delayed || {}).map(([effect, value]) => (
                      <Badge key={effect} className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full">
                        Later: {(value as number) > 0 ? '+' : ''}{value as number} {effect}
                      </Badge>
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
