import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActionCard } from './ActionCard';

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

interface ActionSelectionPoolProps {
  actions: MonthlyAction[];
  getActionDetails: (actionId: string) => ActionDetails;
  getActionRecommendation: (actionId: string) => { isRecommended: boolean; isUrgent: boolean; reason?: string };
  selectedActions: string[];
  onSelectAction: (actionId: string) => void;
  onClearAll: () => void;
  onAutoRecommend: () => void;
}

// Category configuration with icons and descriptions
const CATEGORIES = {
  'business': {
    name: 'Business Strategy',
    icon: 'fas fa-briefcase',
    description: 'Strategic planning and business development'
  },
  'talent': {
    name: 'Artist & Talent',
    icon: 'fas fa-users',
    description: 'Artist scouting and talent development'
  },
  'production': {
    name: 'Music Production',
    icon: 'fas fa-music',
    description: 'Recording and production activities'
  },
  'marketing': {
    name: 'Marketing & PR',
    icon: 'fas fa-bullhorn',
    description: 'Promotion and public relations'
  },
  'distribution': {
    name: 'Distribution',
    icon: 'fas fa-shipping-fast',
    description: 'Release and distribution channels'
  },
  'live': {
    name: 'Live Performance',
    icon: 'fas fa-microphone-alt',
    description: 'Concerts and live events'
  }
};

export function ActionSelectionPool({
  actions,
  getActionDetails,
  getActionRecommendation,
  selectedActions,
  onSelectAction,
  onClearAll,
  onAutoRecommend
}: ActionSelectionPoolProps) {
  
  // Group actions by category
  const actionsByCategory = actions.reduce((acc, action) => {
    const categoryKey = action.category || 'business'; // Default fallback
    if (!acc[categoryKey]) {
      acc[categoryKey] = [];
    }
    acc[categoryKey].push(action);
    return acc;
  }, {} as Record<string, MonthlyAction[]>);

  // Get category info with action counts
  const categoryStats = Object.entries(CATEGORIES).map(([key, category]) => {
    const categoryActions = actionsByCategory[key] || [];
    const selectedCount = categoryActions.filter(action => selectedActions.includes(action.id)).length;
    const recommendedCount = categoryActions.filter(action => 
      getActionRecommendation(action.id).isRecommended
    ).length;
    const urgentCount = categoryActions.filter(action => 
      getActionRecommendation(action.id).isUrgent
    ).length;
    
    return {
      key,
      ...category,
      actions: categoryActions,
      selectedCount,
      recommendedCount,
      urgentCount,
      totalCount: categoryActions.length
    };
  }).filter(category => category.totalCount > 0); // Only show categories with actions

  return (
    <div className="space-y-4">
      {/* Header with quick actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Available Actions</h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAutoRecommend}
            disabled={selectedActions.length >= 3}
            className="text-xs"
          >
            <i className="fas fa-magic mr-1"></i>
            Auto-Recommend
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            disabled={selectedActions.length === 0}
            className="text-xs"
          >
            <i className="fas fa-times mr-1"></i>
            Clear All
          </Button>
        </div>
      </div>

      {/* Category tabs */}
      <Tabs defaultValue={categoryStats[0]?.key || 'business'} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1">
          {categoryStats.map((category) => (
            <TabsTrigger
              key={category.key}
              value={category.key}
              className="flex items-center space-x-2 p-2 text-xs"
            >
              <div className="flex items-center space-x-1">
                <i className={`${category.icon} text-sm`}></i>
                <span className="hidden sm:inline">{category.name.split(' ')[0]}</span>
              </div>
              <div className="flex space-x-1">
                {category.selectedCount > 0 && (
                  <Badge variant="default" className="text-xs px-1">
                    {category.selectedCount}
                  </Badge>
                )}
                {category.urgentCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1">
                    {category.urgentCount}
                  </Badge>
                )}
                {category.recommendedCount > 0 && (
                  <Badge variant="default" className="text-xs px-1 bg-green-500">
                    {category.recommendedCount}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Category content */}
        {categoryStats.map((category) => (
          <TabsContent key={category.key} value={category.key} className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <i className={`${category.icon} text-blue-600`}></i>
              <span>{category.description}</span>
              <Badge variant="secondary" className="text-xs">
                {category.totalCount} action{category.totalCount !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {category.actions.map((action) => {
                const actionDetails = getActionDetails(action.id);
                const recommendation = getActionRecommendation(action.id);
                const isSelected = selectedActions.includes(action.id);
                const isDisabled = !isSelected && selectedActions.length >= 3;

                return (
                  <ActionCard
                    key={action.id}
                    action={action}
                    actionDetails={actionDetails}
                    isSelected={isSelected}
                    isRecommended={recommendation.isRecommended}
                    isUrgent={recommendation.isUrgent}
                    onSelect={onSelectAction}
                    disabled={isDisabled}
                  />
                );
              })}
            </div>

            {category.actions.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <i className={`${category.icon} text-2xl mb-2 block text-slate-400`}></i>
                <p className="text-sm">No actions available in this category</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}