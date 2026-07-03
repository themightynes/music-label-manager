import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { GameState } from '@shared/types/gameTypes';
import { Key, Music, Megaphone, Building, Info, ArrowRight, Lock } from 'lucide-react';
import React, { useState } from 'react';

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
          color: 'bg-white/[0.04] text-text-muted border border-white/[0.08]',
          description: 'No playlist connections',
          benefits: [],
          requirements: 'Starting level'
        },
        { 
          name: 'Niche', 
          level: 1, 
          color: 'bg-gradient-to-br from-[rgba(55,224,176,1)] to-[rgba(47,176,255,1)] text-[#04121a] border-0 shadow-glow-positive',
          description: 'Small independent playlists',
          benefits: ['Access to indie playlists', '1K-10K follower playlists', 'Genre-specific placements'],
          requirements: '10+ Reputation',  // Fixed threshold
          futureRequirements: '1 released project'  // Not implemented yet
        },
        { 
          name: 'Mid', 
          level: 2, 
          color: 'bg-gradient-to-br from-neon-cyan to-neon-blue text-[#04121a] border-0 shadow-glow-cyan',
          description: 'Medium-sized curated playlists',
          benefits: ['Mid-tier playlist access', '10K-100K follower playlists', 'Editorial consideration'],
          requirements: '30+ Reputation',  // Fixed threshold
          futureRequirements: '3 released projects'  // Not implemented yet
        },
        { 
          name: 'Flagship', 
          level: 3, 
          color: 'bg-gradient-to-br from-neon-lilac to-action-purple text-white border-0 shadow-glow-purple',
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
          color: 'bg-white/[0.04] text-text-muted border border-white/[0.08]',
          description: 'No media connections',
          benefits: [],
          requirements: 'Starting level'
        },
        { 
          name: 'Blogs', 
          level: 1, 
          color: 'bg-gradient-to-br from-[rgba(55,224,176,1)] to-[rgba(47,176,255,1)] text-[#04121a] border-0 shadow-glow-positive',
          description: 'Music blogs and online publications',
          benefits: ['Blog coverage', 'Online reviews', 'Social media mentions'],
          requirements: '8+ Reputation',  // Fixed threshold
          futureRequirements: 'Press coverage from releases'  // Not implemented yet
        },
        { 
          name: 'Mid-Tier', 
          level: 2, 
          color: 'bg-gradient-to-br from-neon-cyan to-neon-blue text-[#04121a] border-0 shadow-glow-cyan',
          description: 'Regional magazines and radio',
          benefits: ['Regional press', 'Radio interviews', 'Magazine features'],
          requirements: '25+ Reputation',  // Fixed threshold
          futureRequirements: 'Consistent press coverage'  // Not implemented yet
        },
        { 
          name: 'Major', 
          level: 3, 
          color: 'bg-gradient-to-br from-neon-lilac to-action-purple text-white border-0 shadow-glow-purple',
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
          color: 'bg-white/[0.04] text-text-muted border border-white/[0.08]',
          description: 'No venue connections',
          benefits: [],
          requirements: 'Starting level'
        },
        { 
          name: 'Clubs', 
          level: 1, 
          color: 'bg-gradient-to-br from-[rgba(55,224,176,1)] to-[rgba(47,176,255,1)] text-[#04121a] border-0 shadow-glow-positive',
          description: 'Small venues and clubs',
          benefits: ['Club venues (50-500 capacity)', 'Local gig circuit', 'Fan base building'],  // Fixed capacity
          requirements: '5+ Reputation',  // Fixed threshold
          futureRequirements: 'Active artist roster'  // Not implemented yet
        },
        { 
          name: 'Theaters', 
          level: 2, 
          color: 'bg-gradient-to-br from-neon-cyan to-neon-blue text-[#04121a] border-0 shadow-glow-cyan',
          description: 'Mid-sized theaters and venues',
          benefits: ['Theater venues (500-2000 capacity)', 'Regional touring', 'Higher ticket prices'],
          requirements: '20+ Reputation',  // Fixed threshold
          futureRequirements: 'Proven live draw'  // Not implemented yet
        },
        { 
          name: 'Arenas', 
          level: 3, 
          color: 'bg-gradient-to-br from-neon-lilac to-action-purple text-white border-0 shadow-glow-purple',
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

  // Map UI tier names to database keys per tier type
  const uiToDbKey: Record<'playlist'|'press'|'venue', Record<string, string>> = {
    playlist: { Niche: 'niche', Mid: 'mid', Flagship: 'flagship' },
    press: { Blogs: 'blogs', 'Mid-Tier': 'mid_tier', Major: 'national' },
    venue: { Clubs: 'clubs', Theaters: 'theaters', Arenas: 'arenas' },
  };

  // Get the DB key for a given UI tier name, with safe fallback
  const getTierKey = (tierType: 'playlist'|'press'|'venue', tierName: string) =>
    uiToDbKey[tierType]?.[tierName] ?? tierName.toLowerCase().replace('-', '_');

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
    <div className="glass-panel chromatic-hairline p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center">
            <Key className="w-5 h-5 mr-2 text-text-accent" />
            Industry Access Tiers
          </h3>
          <p className="text-sm text-text-body">Build reputation to unlock new opportunities</p>
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
            <div key={tierType} className="bg-surface-inner/50 rounded-[14px] p-4 border border-white/[0.08]">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <IconComponent className="w-4 h-4 text-text-accent" />
                  <div>
                    <h4 className="text-sm font-medium text-text-primary">{tierData.name}</h4>
                    <p className="text-xs text-text-body">{tierData.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs px-2 py-1 rounded-chip ${currentTier.color}`}>
                    {currentTier.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedTier(isExpanded ? null : tierType)}
                    className="text-text-muted hover:text-text-body p-1"
                  >
                    <Info className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {nextTier && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text-body">Progress to {nextTier.name}</span>
                    <span className="font-mono font-medium text-text-primary">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}

              {/* Current Benefits */}
              <div className="text-xs text-text-body">
                <span className="font-medium">Current: </span>
                {currentTier.level === 0 ? 'No special access' : currentTier.description}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-3">
                  {/* All Tiers Overview */}
                  <div>
                    <h5 className="text-xs font-semibold text-text-primary mb-2">Progression Path</h5>
                    <div className="space-y-2">
                      {tierData.tiers.map((tier, index) => (
                        <div key={tier.name} className={`p-2 rounded-chip border ${
                          tier.name === currentTier.name ? 'border-neon-purple/30 bg-neon-purple/10' : 'border-white/[0.06]'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs rounded-chip ${tier.color}`}>{tier.name}</Badge>
                              {/* Unlock week display when available */}
                              {tier.name !== 'None' && (gameState as any).tierUnlockHistory?.[tierType as any]?.[getTierKey(tierType as any, tier.name)] && (
                                <span className="text-xs text-text-muted ml-2">
                                  • Unlocked Week {(gameState as any).tierUnlockHistory[tierType as any][getTierKey(tierType as any, tier.name)]}
                                </span>
                              )}
                              {tier.name === currentTier.name && (
                                <span className="text-xs text-text-accent font-medium">Current</span>
                              )}
                            </div>
                            {tier.level > currentTier.level && <Lock className="w-3 h-3 text-text-muted" />}
                          </div>
                          <p className="text-xs text-text-body mb-1">{tier.description}</p>
                          <p className="text-xs text-text-muted">
                            <span className="font-medium">Requirements: </span>
                            {tier.requirements}
                            {(tier as any).futureRequirements && (
                              <span className="line-through opacity-50"> • {(tier as any).futureRequirements}</span>
                            )}
                          </p>
                          {tier.benefits.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-text-body">Benefits: </span>
                              <ul className="text-xs text-text-muted ml-2">
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
                <div className="text-xs text-text-muted">
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
