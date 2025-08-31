import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface MonthlyAction {
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
  action: MonthlyAction;
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
    if (isSelected) return 'border-[#A75A5B] bg-[#A75A5B]/10';
    if (isUrgent) return 'border-red-400 hover:border-red-500';
    if (isRecommended) return 'border-[#5AA75A] hover:border-[#4A8F4A]';
    return 'border-[#4e324c] hover:border-[#4e324c]';
  };

  const getRecommendationBadge = () => {
    if (isUrgent) return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
    if (isRecommended) return <Badge variant="default" className="text-xs bg-[#5AA75A] text-white">Recommended</Badge>;
    return null;
  };

  return (
    <Card className={`transition-all duration-200 cursor-pointer ${getBorderClass()} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-[#A75A5B] to-[#8B4A6C] text-white rounded-lg flex items-center justify-center">
              <i className={`${action.icon} text-sm`}></i>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-white">{action.name}</h4>
                <div className="flex items-center space-x-2">
                  {getRecommendationBadge()}
                  {isSelected && (
                    <div className="w-5 h-5 bg-[#A75A5B]/100 text-white rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-xs"></i>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-white/70 capitalize">{action.type.replace('_', ' ')}</p>
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
              <Button variant="ghost" size="sm" className="text-xs text-white/50">
                Details {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="p-3 pt-0 border-t border-[#4e324c]/50">
            <div className="space-y-2 text-xs">
              <p className="text-white/90">{actionDetails.description}</p>
              
              <div className="flex justify-between bg-[#A75A5B]/10 rounded p-1">
                <span className="text-[#A75A5B] font-medium">Focus Cost:</span>
                <span className="font-bold text-[#A75A5B]">1 Slot</span>
              </div>
              
              {actionDetails.cost && (
                <div className="flex justify-between">
                  <span className="text-white/50">Money Cost:</span>
                  <span className="font-medium">{actionDetails.cost}</span>
                </div>
              )}
              
              {actionDetails.duration && (
                <div className="flex justify-between">
                  <span className="text-white/50">Duration:</span>
                  <span className="font-medium">{actionDetails.duration}</span>
                </div>
              )}
              
              {actionDetails.prerequisites && (
                <div className="flex justify-between">
                  <span className="text-white/50">Prerequisites:</span>
                  <span className="font-medium">{actionDetails.prerequisites}</span>
                </div>
              )}
              
              {actionDetails.outcomes && actionDetails.outcomes.length > 0 && (
                <div>
                  <span className="text-white/50">Outcomes:</span>
                  <ul className="mt-1 space-y-1">
                    {actionDetails.outcomes.map((outcome, index) => (
                      <li key={index} className="text-white/70 flex items-center">
                        <i className="fas fa-chevron-right text-xs text-white/50 mr-2"></i>
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {actionDetails.benefits && actionDetails.benefits.length > 0 && (
                <div>
                  <span className="text-white/50">Benefits:</span>
                  <ul className="mt-1 space-y-1">
                    {actionDetails.benefits.map((benefit, index) => (
                      <li key={index} className="text-white/70 flex items-center">
                        <i className="fas fa-star text-xs text-yellow-500 mr-2"></i>
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