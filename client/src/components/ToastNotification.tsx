import { Toaster } from '@/components/ui/toaster';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/store/gameStore';
import { useEffect, useRef, useState } from 'react';

export function ToastNotification() {
  const { toast, dismiss } = useToast();
  const { gameState, monthlyOutcome, projects } = useGameStore();
  const prevGameState = useRef(gameState);
  const prevMonthlyOutcome = useRef(monthlyOutcome);
  const [recentToasts, setRecentToasts] = useState<Set<string>>(new Set());

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Debounce function to prevent duplicate toasts
  const shouldShowToast = (key: string, ttl: number = 2000) => {
    if (recentToasts.has(key)) return false;
    
    setRecentToasts(prev => new Set(prev).add(key));
    setTimeout(() => {
      setRecentToasts(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }, ttl);
    
    return true;
  };

  // Enhanced toast with progress and actions
  const showEnhancedToast = (options: {
    title: string;
    description: string;
    type: 'success' | 'info' | 'warning' | 'achievement';
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
    progress?: number;
  }) => {
    const { title, description, type, duration = 4000, action, progress } = options;
    
    // Enhanced description with progress if provided
    const enhancedDescription = progress !== undefined 
      ? `${description}\n\nProgress: ${Math.round(progress)}%`
      : description;

    const toastConfig: any = {
      title,
      description: enhancedDescription,
      duration,
      className: type === 'achievement' ? 'border-yellow-200 bg-yellow-50' : 
                 type === 'success' ? 'border-green-200 bg-green-50' :
                 type === 'warning' ? 'border-orange-200 bg-orange-50' : 
                 'border-[#A75A5B]/20 bg-[#A75A5B]/10'
    };

    // Add action button if provided
    if (action) {
      toastConfig.action = (
        <ToastAction 
          altText={action.label}
          onClick={action.onClick}
          className="bg-[#23121c] hover:bg-[#A75A5B]/20 border-[#4e324c] text-white"
        >
          {action.label}
        </ToastAction>
      );
    }

    return toast(toastConfig);
  };

  useEffect(() => {
    if (!gameState || !prevGameState.current) {
      prevGameState.current = gameState;
      return;
    }

    const prev = prevGameState.current;
    const current = gameState;

    // Check for money changes with enhanced notifications
    const prevMoney = prev.money || 0;
    const currentMoney = current.money || 0;
    if (prevMoney !== currentMoney) {
      const change = currentMoney - prevMoney;
      const isPositive = change > 0;
      const key = `money-${currentMoney}`;
      
      if (shouldShowToast(key)) {
        showEnhancedToast({
          title: `${isPositive ? '💰' : '💸'} ${isPositive ? 'Revenue' : 'Expense'} ${formatCurrency(Math.abs(change))}`,
          description: `Current balance: ${formatCurrency(currentMoney)}${currentMoney < 10000 ? ' ⚠️ Low funds' : ''}`,
          type: isPositive ? 'success' : currentMoney < 10000 ? 'warning' : 'info',
          duration: 3000,
          ...(currentMoney < 5000 && {
            action: {
              label: 'View Budget',
              onClick: () => {
                // Could navigate to budget view or show financial summary
                console.log('View budget clicked');
              }
            }
          })
        });
      }
    }

    // Check for reputation changes with tier information
    const prevRep = prev.reputation || 0;
    const currentRep = current.reputation || 0;
    if (prevRep !== currentRep) {
      const change = currentRep - prevRep;
      const isPositive = change > 0;
      const reputationTier = currentRep >= 80 ? 'Elite' : 
                           currentRep >= 60 ? 'Established' : 
                           currentRep >= 40 ? 'Rising' : 
                           currentRep >= 20 ? 'Emerging' : 'Unknown';
      
      const key = `reputation-${currentRep}`;
      
      if (shouldShowToast(key)) {
        showEnhancedToast({
          title: `${isPositive ? '⭐' : '📉'} Reputation ${isPositive ? '+' : ''}${change}`,
          description: `Current reputation: ${currentRep} (${reputationTier} tier)`,
          type: isPositive ? 'success' : 'warning',
          duration: 3000,
          progress: currentRep
        });
      }
    }

    // Check for creative capital changes
    const prevCC = prev.creativeCapital || 0;
    const currentCC = current.creativeCapital || 0;
    if (prevCC !== currentCC) {
      const change = currentCC - prevCC;
      const isPositive = change > 0;
      const key = `cc-${currentCC}`;
      
      if (shouldShowToast(key)) {
        showEnhancedToast({
          title: `${isPositive ? '💡' : '🔥'} Creative Capital ${isPositive ? '+' : ''}${change}`,
          description: `Current creative capital: ${currentCC}${currentCC >= 80 ? ' 🌟 Highly creative!' : ''}`,
          type: isPositive ? 'success' : 'warning',
          duration: 3000,
          progress: currentCC
        });
      }
    }

    // Access tier notifications are now handled server-side in MonthSummary
    // This ensures consistency with other progression notifications

    prevGameState.current = gameState;
    prevMonthlyOutcome.current = monthlyOutcome;
  }, [gameState, monthlyOutcome, toast]);

  // Enhanced monthly outcome notifications
  useEffect(() => {
    if (!monthlyOutcome || monthlyOutcome === prevMonthlyOutcome.current) {
      return;
    }

    // Group and process changes more intelligently
    if (monthlyOutcome.changes) {
      const projectCompletions = monthlyOutcome.changes.filter((c: any) => c.type === 'project_complete');
      const revenueChanges = monthlyOutcome.changes.filter((c: any) => c.type === 'revenue');
      const achievements = monthlyOutcome.changes.filter((c: any) => c.type === 'unlock');
      
      // Enhanced: Filter mood and loyalty changes from executive meetings
      const moodChanges = monthlyOutcome.changes.filter((c: any) => 
        c.type === 'mood' && c.description.includes('meeting decision')
      );
      const loyaltyChanges = monthlyOutcome.changes.filter((c: any) => 
        c.type === 'mood' && c.loyaltyBoost && c.description.includes('meeting decision')
      );

      // Enhanced project completion notifications
      projectCompletions.forEach((change: any, index: number) => {
        setTimeout(() => {
          const projectTitle = change.description.match(/: (.*?) - /)?.[1] || 'Unknown Project';
          const revenue = change.amount || 0;
          
          showEnhancedToast({
            title: '🎵 Recording Complete!',
            description: `${projectTitle} songs are recorded and ready for strategic release.`,
            type: 'success',
            duration: 7000,
            action: {
              label: 'View Details',
              onClick: () => {
                // Could navigate to the specific project
                console.log('View project details:', change.projectId);
              }
            }
          });
        }, index * 1500); // Stagger multiple project completions
      });

      // Consolidated revenue notifications
      if (revenueChanges.length > 0) {
        const totalRevenue = revenueChanges.reduce((sum: number, change: any) => sum + (change.amount || 0), 0);
        const streamingRevenue = revenueChanges.filter((c: any) => c.description.includes('Streaming'));
        
        if (streamingRevenue.length > 0) {
          setTimeout(() => {
            showEnhancedToast({
              title: '💿 Streaming Success!',
              description: `Your releases generated ${formatCurrency(totalRevenue)} from streaming this month!`,
              type: 'success',
              duration: 5000,
              action: {
                label: 'View Analytics',
                onClick: () => {
                  console.log('View streaming analytics');
                }
              }
            });
          }, projectCompletions.length * 1500 + 500);
        }
      }

      // Achievement notifications
      achievements.forEach((change: any, index: number) => {
        setTimeout(() => {
          showEnhancedToast({
            title: '🏆 New Achievement!',
            description: change.description,
            type: 'achievement',
            duration: 5000,
            action: {
              label: 'Celebrate',
              onClick: () => {
                console.log('Achievement celebrated');
              }
            }
          });
        }, (projectCompletions.length + revenueChanges.length) * 1500 + index * 1000);
      });

      // Enhanced: Artist mood change notifications from executive meetings
      moodChanges.forEach((change: any, index: number) => {
        setTimeout(() => {
          const isPositive = (change.amount || 0) > 0;
          const moodValue = Math.abs(change.amount || 0);
          
          showEnhancedToast({
            title: `${isPositive ? '😊' : '😔'} Artist Morale ${isPositive ? 'Improved' : 'Declined'}`,
            description: `Executive meeting decision ${isPositive ? 'boosted' : 'lowered'} all artists' mood by ${moodValue} points.`,
            type: isPositive ? 'success' : 'warning',
            duration: 4000,
            action: {
              label: 'View Artists',
              onClick: () => {
                console.log('Navigate to artist roster');
              }
            }
          });
        }, (projectCompletions.length + revenueChanges.length + achievements.length) * 1500 + index * 800);
      });

      // Enhanced: Artist loyalty change notifications from executive meetings  
      loyaltyChanges.forEach((change: any, index: number) => {
        setTimeout(() => {
          const isPositive = (change.loyaltyBoost || 0) > 0;
          const loyaltyValue = Math.abs(change.loyaltyBoost || 0);
          
          showEnhancedToast({
            title: `${isPositive ? '💖' : '💔'} Artist Loyalty ${isPositive ? 'Increased' : 'Decreased'}`,
            description: `Executive meeting decision ${isPositive ? 'strengthened' : 'weakened'} all artists' loyalty by ${loyaltyValue} points.`,
            type: isPositive ? 'success' : 'warning',
            duration: 4000,
            action: {
              label: 'View Artists',
              onClick: () => {
                console.log('Navigate to artist roster');
              }
            }
          });
        }, (projectCompletions.length + revenueChanges.length + achievements.length + moodChanges.length) * 1500 + index * 800);
      });

      // Show month summary action if significant activity
      if (monthlyOutcome.changes.length >= 3) {
        setTimeout(() => {
          showEnhancedToast({
            title: '📊 Busy Month!',
            description: `${monthlyOutcome.changes.length} significant events occurred this month.`,
            type: 'info',
            duration: 6000,
            action: {
              label: 'View Summary',
              onClick: () => {
                // Could trigger month summary modal
                console.log('Show month summary');
              }
            }
          });
        }, 5000);
      }
    }

    prevMonthlyOutcome.current = monthlyOutcome;
  }, [monthlyOutcome, toast]);

  return <Toaster />;
}
