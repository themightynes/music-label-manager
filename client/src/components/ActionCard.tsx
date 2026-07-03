import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface WeeklyAction {
  id: string;
  name: string;
  type: string;
  icon: string;
  description?: string;
  category: string;
}

interface ActionDetails {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  category: string;
  outcomes?: string[];
  cost?: string;
  duration?: string;
  prerequisites?: string;
  benefits?: string[];
}

interface ActionCardProps {
  action: WeeklyAction;
  actionDetails: ActionDetails;
  isSelected: boolean;
  isRecommended: boolean;
  isUrgent: boolean;
  onSelect: (actionId: string) => void;
  disabled?: boolean;
}

export function ActionCard({ 
  action, 
  actionDetails, 
  isSelected, 
  isRecommended, 
  isUrgent, 
  onSelect, 
  disabled = false 
}: ActionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getBorderClass = () => {
    if (isSelected) return 'border-neon-purple/60 bg-neon-purple/10';
    if (isUrgent) return 'border-negative/60 hover:border-negative';
    if (isRecommended) return 'border-positive/60 hover:border-positive';
    return 'border-white/[0.08] hover:border-white/[0.12]';
  };

  const getRecommendationBadge = () => {
    if (isUrgent) return <Badge variant="destructive" className="text-xs rounded-chip">Urgent</Badge>;
    if (isRecommended) return <Badge variant="default" className="text-xs bg-positive/20 text-positive border border-positive/40 rounded-chip">Recommended</Badge>;
    return null;
  };

  return (
    <Card className={`glass-panel transition-all duration-200 cursor-pointer ${getBorderClass()} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-action-pink to-action-purple text-white rounded-button flex items-center justify-center shadow-action">
              <i className={`${action.icon} text-sm`}></i>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-text-primary">{action.name}</h4>
                <div className="flex items-center space-x-2">
                  {getRecommendationBadge()}
                  {isSelected && (
                    <div className="w-5 h-5 bg-gradient-to-br from-action-pink to-action-purple text-white rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-xs"></i>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-text-body capitalize">{action.type.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onSelect(action.id);
            }}
            disabled={disabled}
            className="text-xs"
          >
            <i className="fas fa-crosshairs mr-1"></i>
            {isSelected ? 'Using Focus Slot' : 'Use Focus Slot'}
          </Button>
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-text-muted">
                Details {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="p-3 pt-0 border-t border-white/[0.06]">
            <div className="space-y-2 text-xs">
              <p className="text-text-primary">{actionDetails.description}</p>

              <div className="flex justify-between bg-neon-purple/10 rounded-chip p-1">
                <span className="text-text-accent font-medium">Focus Cost:</span>
                <span className="font-bold text-text-accent">1 Slot</span>
              </div>

              {actionDetails.cost && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Money Cost:</span>
                  <span className="font-medium font-mono text-money">{actionDetails.cost}</span>
                </div>
              )}

              {actionDetails.duration && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Duration:</span>
                  <span className="font-medium text-text-body">{actionDetails.duration}</span>
                </div>
              )}

              {actionDetails.prerequisites && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Prerequisites:</span>
                  <span className="font-medium text-text-body">{actionDetails.prerequisites}</span>
                </div>
              )}

              {actionDetails.outcomes && actionDetails.outcomes.length > 0 && (
                <div>
                  <span className="text-text-muted">Outcomes:</span>
                  <ul className="mt-1 space-y-1">
                    {actionDetails.outcomes.map((outcome, index) => (
                      <li key={index} className="text-text-body flex items-center">
                        <i className="fas fa-chevron-right text-xs text-text-muted mr-2"></i>
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {actionDetails.benefits && actionDetails.benefits.length > 0 && (
                <div>
                  <span className="text-text-muted">Benefits:</span>
                  <ul className="mt-1 space-y-1">
                    {actionDetails.benefits.map((benefit, index) => (
                      <li key={index} className="text-text-body flex items-center">
                        <i className="fas fa-star text-xs text-warning mr-2"></i>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}