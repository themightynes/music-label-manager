import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { GameState } from '@shared/types/gameTypes';
import { Key, Music, Megaphone, Building, Info, ArrowRight, Lock } from 'lucide-react';
import { useState } from 'react';

interface AccessTierBadgesProps {
  gameState: GameState;
}

export function AccessTierBadges({ gameState }: AccessTierBadgesProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  if (!gameState) return null;

  // Define access tier progressions and requirements
  const accessTiers = {
    playlist: {
      icon: Music,
      name: 'Playlist Access',
      description: 'Streaming platform relationships',
      tiers: [
        { 
          name: 'None', 
          level: 0, 
          color: 'bg-[#65557c] text-white',
          description: 'No playlist connections',
          benefits: [],
          requirements: 'Starting level'
        },
        { 
          name: 'Niche', 
          level: 1, 
          color: 'bg-green-500 text-white',
          description: 'Small independent playlists',
          benefits: ['Access to indie playlists', '1K-10K follower playlists', 'Genre-specific placements'],
          requirements: '10+ Reputation',  // Fixed threshold
          futureRequirements: '1 released project'  // Not implemented yet
        },
        { 
          name: 'Mid', 
          level: 2, 
          color: 'bg-[#A75A5B]/100 text-white',
          description: 'Medium-sized curated playlists',
          benefits: ['Mid-tier playlist access', '10K-100K follower playlists', 'Editorial consideration'],
          requirements: '30+ Reputation',  // Fixed threshold
          futureRequirements: '3 released projects'  // Not implemented yet
        },
        { 
          name: 'Flagship', 
          level: 3, 
          color: 'bg-[#791014] text-white',
          description: 'Major platform editorial playlists',
          benefits: ['Flagship playlist access', '100K+ follower playlists', 'Algorithm boost'],
          requirements: '60+ Reputation',  // Fixed threshold
          futureRequirements: '5 released projects, Major label status'  // Not implemented yet
        }
      ]
    },
    press: {
      icon: Megaphone,
      name: 'Press Access',
      description: 'Media coverage and publicity',
      tiers: [
        { 
          name: 'None', 
          level: 0, 
          color: 'bg-[#65557c] text-white',
          description: 'No media connections',
          benefits: [],
          requirements: 'Starting level'
        },
        { 
          name: 'Blogs', 
          level: 1, 
          color: 'bg-green-500 text-white',
          description: 'Music blogs and online publications',
          benefits: ['Blog coverage', 'Online reviews', 'Social media mentions'],
          requirements: '8+ Reputation',  // Fixed threshold
          futureRequirements: 'Press coverage from releases'  // Not implemented yet
        },
        { 
          name: 'Mid-Tier', 
          level: 2, 
          color: 'bg-[#A75A5B]/100 text-white',
          description: 'Regional magazines and radio',
          benefits: ['Regional press', 'Radio interviews', 'Magazine features'],
          requirements: '25+ Reputation',  // Fixed threshold
          futureRequirements: 'Consistent press coverage'  // Not implemented yet
        },
        { 
          name: 'Major', 
          level: 3, 
          color: 'bg-[#791014] text-white',
          description: 'National media and major publications',
          benefits: ['National press', 'TV appearances', 'Major publication features'],
          requirements: '50+ Reputation',  // Fixed threshold
          futureRequirements: 'Industry recognition'  // Not implemented yet
        }
      ]
    },
    venue: {
      icon: Building,
      name: 'Venue Access',
      description: 'Live performance opportunities',
      tiers: [
        { 
          name: 'None', 
          level: 0, 
          color: 'bg-[#65557c] text-white',
          description: 'No venue connections',
          benefits: [],
          requirements: 'Starting level'
        },
        { 
          name: 'Clubs', 
          level: 1, 
          color: 'bg-green-500 text-white',
          description: 'Small venues and clubs',
          benefits: ['Club venues (50-500 capacity)', 'Local gig circuit', 'Fan base building'],  // Fixed capacity
          requirements: '5+ Reputation',  // Fixed threshold
          futureRequirements: 'Active artist roster'  // Not implemented yet
        },
        { 
          name: 'Theaters', 
          level: 2, 
          color: 'bg-[#A75A5B]/100 text-white',
          description: 'Mid-sized theaters and venues',
          benefits: ['Theater venues (500-2000 capacity)', 'Regional touring', 'Higher ticket prices'],
          requirements: '20+ Reputation',  // Fixed threshold
          futureRequirements: 'Proven live draw'  // Not implemented yet
        },
        { 
          name: 'Arenas', 
          level: 3, 
          color: 'bg-[#791014] text-white',
          description: 'Large arenas and stadiums',
          benefits: ['Arena venues (2000-20000 capacity)', 'National touring', 'Premium revenue'],  // Fixed capacity
          requirements: '45+ Reputation',  // Fixed threshold
          futureRequirements: 'Established fanbase'  // Not implemented yet
        }
      ]
    }
  };

  // Map lowercase tier names from game state to UI display names
  const tierNameMap: Record<string, string> = {
    // Playlist tiers
    'none': 'None',
    'niche': 'Niche',
    'mid': 'Mid',
    'flagship': 'Flagship',
    // Press tiers  
    'blogs': 'Blogs',
    'mid_tier': 'Mid-Tier',
    'national': 'Major',
    // Venue tiers
    'clubs': 'Clubs',
    'theaters': 'Theaters',
    'arenas': 'Arenas'
  };

  const getCurrentTier = (tierType: keyof typeof accessTiers) => {
    const currentTierName = tierType === 'playlist' ? gameState.playlistAccess :
                           tierType === 'press' ? gameState.pressAccess :
                           gameState.venueAccess;
    
    // Map lowercase tier names from gameState to UI tier names
    const mappedName = currentTierName ? (tierNameMap[currentTierName] || 'None') : 'None';
    return accessTiers[tierType].tiers.find(t => t.name === mappedName) || accessTiers[tierType].tiers[0];
  };

  const getNextTier = (tierType: keyof typeof accessTiers) => {
    const currentTier = getCurrentTier(tierType);
    return accessTiers[tierType].tiers.find(t => t.level === currentTier.level + 1);
  };

  const getProgressToNextTier = (tierType: keyof typeof accessTiers) => {
    const currentTier = getCurrentTier(tierType);
    const nextTier = getNextTier(tierType);
    
    if (!nextTier) return 100; // Already at max tier
    
    const currentRep = gameState.reputation || 0;
    
    // Simplified progress calculation based on reputation milestones
    const repRequirements = {
      playlist: [10, 30, 60],  // Actual thresholds from balance config
      press: [8, 25, 50],      // Actual thresholds from balance config
      venue: [5, 20, 45]       // Actual thresholds from balance config
    };
    
    const targetRep = repRequirements[tierType][currentTier.level];
    if (!targetRep) return 100;
    
    if (currentTier.level === 0) {
      return Math.min((currentRep / targetRep) * 100, 100);
    }
    
    const prevRep = repRequirements[tierType][currentTier.level - 1] || 0;
    return Math.min(((currentRep - prevRep) / (targetRep - prevRep)) * 100, 100);
  };

  return (
    <div className="bg-[#23121c] rounded-[10px] shadow-lg border border-[#4e324c] p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Key className="w-5 h-5 mr-2 text-[#A75A5B]" />
            Industry Access Tiers
          </h3>
          <p className="text-sm text-white/70">Build reputation to unlock new opportunities</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(accessTiers) as Array<keyof typeof accessTiers>).map(tierType => {
          const tierData = accessTiers[tierType];
          const currentTier = getCurrentTier(tierType);
          const nextTier = getNextTier(tierType);
          const progress = getProgressToNextTier(tierType);
          const IconComponent = tierData.icon;
          const isExpanded = expandedTier === tierType;

          return (
            <div key={tierType} className="bg-[#3c252d]/[0.66] rounded-[8px] p-4 border border-[#65557c]">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <IconComponent className="w-4 h-4 text-[#A75A5B]" />
                  <div>
                    <h4 className="text-sm font-medium text-white">{tierData.name}</h4>
                    <p className="text-xs text-white/70">{tierData.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs px-2 py-1 ${currentTier.color}`}>
                    {currentTier.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedTier(isExpanded ? null : tierType)}
                    className="text-white/50 hover:text-white/70 p-1"
                  >
                    <Info className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {nextTier && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/70">Progress to {nextTier.name}</span>
                    <span className="font-medium text-white/90">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}

              {/* Current Benefits */}
              <div className="text-xs text-white/70">
                <span className="font-medium">Current: </span>
                {currentTier.level === 0 ? 'No special access' : currentTier.description}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-[#4e324c] space-y-3">
                  {/* All Tiers Overview */}
                  <div>
                    <h5 className="text-xs font-semibold text-white/90 mb-2">Progression Path</h5>
                    <div className="space-y-2">
                      {tierData.tiers.map((tier, index) => (
                        <div key={tier.name} className={`p-2 rounded border ${
                          tier.name === currentTier.name ? 'border-[#A75A5B]/30 bg-[#A75A5B]/10' : 'border-[#4e324c]'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs ${tier.color}`}>{tier.name}</Badge>
                              {tier.name === currentTier.name && (
                                <span className="text-xs text-[#A75A5B] font-medium">Current</span>
                              )}
                            </div>
                            {tier.level > currentTier.level && <Lock className="w-3 h-3 text-white/50" />}
                          </div>
                          <p className="text-xs text-white/70 mb-1">{tier.description}</p>
                          <p className="text-xs text-white/50">
                            <span className="font-medium">Requirements: </span>
                            {tier.requirements}
                            {(tier as any).futureRequirements && (
                              <span className="line-through opacity-50"> • {(tier as any).futureRequirements}</span>
                            )}
                          </p>
                          {tier.benefits.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-white/70">Benefits: </span>
                              <ul className="text-xs text-white/50 ml-2">
                                {tier.benefits.map((benefit, idx) => (
                                  <li key={idx}>• {benefit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Next Tier Requirements */}
              {nextTier && !isExpanded && (
                <div className="text-xs text-white/50">
                  <span className="font-medium">Next Unlock: </span>
                  {nextTier.requirements}
                  {(nextTier as any).futureRequirements && (
                    <span className="line-through opacity-50"> • {(nextTier as any).futureRequirements}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
