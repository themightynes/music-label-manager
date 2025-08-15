import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { ROLE_TYPES, SAMPLE_DIALOGUE } from '@/lib/gameData';

export function DialogueModal() {
  const { currentDialogue, selectDialogueChoice, closeDialogue } = useGameStore();

  if (!currentDialogue) return null;

  const roleInfo = ROLE_TYPES[currentDialogue.roleType as keyof typeof ROLE_TYPES];
  const dialogueData = SAMPLE_DIALOGUE[currentDialogue.roleType as keyof typeof SAMPLE_DIALOGUE]?.[0];

  const handleChoiceSelect = async (choiceIndex: number) => {
    if (!dialogueData?.choices[choiceIndex]) return;

    const choice = dialogueData.choices[choiceIndex];
    await selectDialogueChoice(`choice_${choiceIndex}`, {
      ...choice.effects,
      delayed: choice.delayed
    });
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
    <Dialog open={!!currentDialogue} onOpenChange={closeDialogue}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <i className={`${roleInfo?.icon || 'fas fa-user'} text-white text-xl`}></i>
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Meeting with {roleInfo?.name || currentDialogue.roleType}
              </DialogTitle>
              <p className="text-sm text-slate-600">Industry Professional</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {dialogueData && (
            <>
              <div className="mb-6">
                <p className="text-slate-700 leading-relaxed">
                  {dialogueData.context}
                </p>
              </div>

              <div className="space-y-3">
                {dialogueData.choices.map((choice, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full text-left p-4 hover:bg-slate-50 hover:border-primary group h-auto"
                    onClick={() => handleChoiceSelect(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-slate-900 group-hover:text-primary transition-colors">
                          {choice.text}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-col items-end space-y-1">
                        {Object.entries(choice.effects).map(([effect, value]) => (
                          <div key={effect}>
                            {renderEffectBadge(effect, value as number)}
                          </div>
                        ))}
                        {Object.entries(choice.delayed || {}).map(([effect, value]) => (
                          <Badge key={effect} className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full">
                            Later: {value > 0 ? '+' : ''}{value} {effect}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </>
          )}

          {!dialogueData && (
            <div className="text-center py-8">
              <p className="text-slate-500">Dialogue content not available for this role.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={closeDialogue}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
