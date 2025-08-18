import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { GameState } from '@shared/schema';
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
          color: 'bg-slate-400 text-white',
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
          requirements: '15+ Reputation, 1 released project'
        },
        { 
          name: 'Mid', 
          level: 2, 
          color: 'bg-blue-500 text-white',
          description: 'Medium-sized curated playlists',
          benefits: ['Mid-tier playlist access', '10K-100K follower playlists', 'Editorial consideration'],
          requirements: '35+ Reputation, 3 released projects'
        },
        { 
          name: 'Flagship', 
          level: 3, 
          color: 'bg-purple-500 text-white',
          description: 'Major platform editorial playlists',
          benefits: ['Flagship playlist access', '100K+ follower playlists', 'Algorithm boost'],
          requirements: '60+ Reputation, 5 released projects, Major label status'
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
          color: 'bg-slate-400 text-white',
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
          requirements: '10+ Reputation, Press coverage from releases'
        },
        { 
          name: 'Mid-Tier', 
          level: 2, 
          color: 'bg-blue-500 text-white',
          description: 'Regional magazines and radio',
          benefits: ['Regional press', 'Radio interviews', 'Magazine features'],
          requirements: '30+ Reputation, Consistent press coverage'
        },
        { 
          name: 'Major', 
          level: 3, 
          color: 'bg-purple-500 text-white',
          description: 'National media and major publications',
          benefits: ['National press', 'TV appearances', 'Major publication features'],
          requirements: '55+ Reputation, Industry recognition'
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
          color: 'bg-slate-400 text-white',
          description: 'No venue connections',
          benefits: [],
          requirements: 'Starting level'
        },
        { 
          name: 'Clubs', 
          level: 1, 
          color: 'bg-green-500 text-white',
          description: 'Small venues and clubs',
          benefits: ['Club venues (100-500 capacity)', 'Local gig circuit', 'Fan base building'],
          requirements: '20+ Reputation, Active artist roster'
        },
        { 
          name: 'Theaters', 
          level: 2, 
          color: 'bg-blue-500 text-white',
          description: 'Mid-sized theaters and venues',
          benefits: ['Theater venues (500-2000 capacity)', 'Regional touring', 'Higher ticket prices'],
          requirements: '40+ Reputation, Proven live draw'
        },
        { 
          name: 'Arenas', 
          level: 3, 
          color: 'bg-purple-500 text-white',
          description: 'Large arenas and stadiums',
          benefits: ['Arena venues (2000+ capacity)', 'National touring', 'Premium revenue'],
          requirements: '65+ Reputation, Established fanbase'
        }
      ]
    }
  };

  const getCurrentTier = (tierType: keyof typeof accessTiers) => {
    const currentTierName = tierType === 'playlist' ? gameState.playlistAccess :
                           tierType === 'press' ? gameState.pressAccess :
                           gameState.venueAccess;
    
    return accessTiers[tierType].tiers.find(t => t.name === currentTierName) || accessTiers[tierType].tiers[0];
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
      playlist: [15, 35, 60],
      press: [10, 30, 55],
      venue: [20, 40, 65]
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
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardHeader>
        <CardTitle className="text-slate-900 flex items-center">
          <Key className="w-5 h-5 mr-2 text-primary" />
          Industry Access Tiers
        </CardTitle>
        <p className="text-sm text-slate-600">Build reputation to unlock new opportunities</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(accessTiers) as Array<keyof typeof accessTiers>).map(tierType => {
          const tierData = accessTiers[tierType];
          const currentTier = getCurrentTier(tierType);
          const nextTier = getNextTier(tierType);
          const progress = getProgressToNextTier(tierType);
          const IconComponent = tierData.icon;
          const isExpanded = expandedTier === tierType;

          return (
            <div key={tierType} className="border border-slate-200 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium text-slate-900">{tierData.name}</h4>
                    <p className="text-xs text-slate-600">{tierData.description}</p>
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
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {nextTier && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">Progress to {nextTier.name}</span>
                    <span className="font-medium text-slate-700">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs mt-1 text-slate-500">
                    <span>Current: {currentTier.name}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>Next: {nextTier.name}</span>
                  </div>
                </div>
              )}

              {/* Current Tier Benefits */}
              <div className="text-xs text-slate-600 mb-2">
                <span className="font-medium">Current Benefits: </span>
                {currentTier.level === 0 ? 'No special access' : currentTier.description}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
                  {/* All Tiers Overview */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-700 mb-2">Progression Path</h5>
                    <div className="space-y-2">
                      {tierData.tiers.map((tier, index) => (
                        <div key={tier.name} className={`p-2 rounded border ${
                          tier.name === currentTier.name ? 'border-blue-300 bg-blue-50' : 'border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs ${tier.color}`}>{tier.name}</Badge>
                              {tier.name === currentTier.name && (
                                <span className="text-xs text-blue-600 font-medium">Current</span>
                              )}
                            </div>
                            {tier.level > currentTier.level && <Lock className="w-3 h-3 text-slate-400" />}
                          </div>
                          <p className="text-xs text-slate-600 mb-1">{tier.description}</p>
                          <p className="text-xs text-slate-500">
                            <span className="font-medium">Requirements: </span>
                            {tier.requirements}
                          </p>
                          {tier.benefits.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-slate-600">Benefits: </span>
                              <ul className="text-xs text-slate-500 ml-2">
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
                <div className="text-xs text-slate-500">
                  <span className="font-medium">Next Unlock: </span>
                  {nextTier.requirements}
                </div>
              )}
            </div>
          );
        })}

        {/* Overall Progress Summary */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h5 className="text-sm font-semibold text-slate-800 mb-2">Your Industry Standing</h5>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center">
              <div className="font-medium text-slate-700">Reputation</div>
              <div className="text-lg font-bold text-blue-600">{gameState.reputation || 0}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-slate-700">Access Level</div>
              <div className="text-lg font-bold text-purple-600">
                {getCurrentTier('playlist').level + getCurrentTier('press').level + getCurrentTier('venue').level}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-slate-700">Total Unlocks</div>
              <div className="text-lg font-bold text-green-600">
                {accessTiers.playlist.tiers.filter(t => t.level <= getCurrentTier('playlist').level).length +
                 accessTiers.press.tiers.filter(t => t.level <= getCurrentTier('press').level).length +
                 accessTiers.venue.tiers.filter(t => t.level <= getCurrentTier('venue').level).length - 3}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
