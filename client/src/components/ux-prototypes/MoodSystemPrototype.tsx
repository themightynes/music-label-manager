import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Heart,
  BarChart3,
  Lightbulb,
  Calendar,
  Info
} from 'lucide-react';

/**
 * MoodSystemPrototype - UI Mockup for Artist Mood System Features
 *
 * This is a PROTOTYPE component with dummy data for design review.
 * NO backend integration - pure visual mockup.
 *
 * Sections (Simplified):
 * 1. Mood Event Notifications
 * 2. Mood Recommendations
 * 3. Enhanced Artist Card with Predictions
 *
 * Removed sections (not being implemented):
 * - Mood History Chart (Section 1 - removed)
 * - Mood Analytics Dashboard (Section 4 - removed)
 *
 * Task: 1.1 - Create MoodSystemPrototype component
 * Related: docs/01-planning/implementation-specs/[IN-PROGRESS] artist-mood-plan.md
 */
export function MoodSystemPrototype() {
  // STUB: Mock mood events
  const MOCK_MOOD_EVENTS = [
    {
      id: 1,
      type: 'warning',
      artistName: 'Nova',
      mood: 35,
      message: 'Nova seems stressed and unhappy',
      action: 'Consider reducing workload or scheduling a meeting',
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      id: 2,
      type: 'opportunity',
      artistName: 'Phoenix',
      mood: 85,
      message: 'Phoenix is in excellent spirits!',
      action: 'Perfect time for ambitious projects',
      icon: Sparkles,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      id: 3,
      type: 'critical',
      artistName: 'Echo',
      mood: 18,
      message: 'Echo is extremely unhappy',
      action: 'Urgent: Address issues immediately',
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
    {
      id: 4,
      type: 'info',
      artistName: 'Nova',
      mood: 72,
      message: 'Nova\'s mood improved after hit single',
      action: 'Momentum building - keep it going',
      icon: TrendingUp,
      color: 'text-brand-gold',
      bgColor: 'bg-brand-gold/10'
    }
  ];

  // STUB: Mock recommendations
  const MOCK_RECOMMENDATIONS = [
    {
      id: 1,
      priority: 'high',
      artistName: 'Nova',
      title: 'Reduce Workload',
      description: 'Nova is working on 3 projects simultaneously. Consider spacing out projects.',
      actionType: 'workload',
      impact: '+8 mood expected'
    },
    {
      id: 2,
      priority: 'high',
      artistName: 'Echo',
      title: 'Schedule Artist Meeting',
      description: 'Echo hasn\'t had a dialogue interaction in 10 weeks. Check in soon.',
      actionType: 'dialogue',
      impact: '+5 mood expected'
    },
    {
      id: 3,
      priority: 'medium',
      artistName: 'Phoenix',
      title: 'Start Ambitious Project',
      description: 'Phoenix is in excellent mood - perfect time for a challenging EP or tour.',
      actionType: 'project',
      impact: 'Maximize quality bonus'
    },
    {
      id: 4,
      priority: 'medium',
      artistName: 'Nova',
      title: 'Address Recent Flop',
      description: 'Last single underperformed. Consider marketing boost or mood recovery time.',
      actionType: 'recovery',
      impact: 'Prevent further decline'
    },
    {
      id: 5,
      priority: 'low',
      artistName: 'Phoenix',
      title: 'Maintain Momentum',
      description: 'Phoenix has 2 consecutive hits. Keep the success streak going!',
      actionType: 'momentum',
      impact: '+2 momentum bonus'
    }
  ];

  // STUB: Mock artist data
  const MOCK_ARTIST = {
    name: 'Nova',
    archetype: 'Visionary',
    mood: 72,
    energy: 65,
    activeProjects: 3,
    recentPerformance: 0.85, // 85% success rate
    moodFactors: [
      { factor: 'Workload', impact: -15, description: '3 active projects (high stress)' },
      { factor: 'Recent Hit Single', impact: +8, description: 'Last release performed well' },
      { factor: 'Natural Drift', impact: +2, description: 'Returning to baseline mood' },
      { factor: 'Archetype Bonus', impact: +2, description: 'Visionary enjoys creative work' }
    ],
    predictedMood: 75,
    predictionConfidence: 0.78
  };

  const getMoodLevelInfo = (mood: number) => {
    if (mood >= 81) return { label: 'Excellent', color: 'bg-success', textColor: 'text-success', emoji: '💚' };
    if (mood >= 61) return { label: 'Good', color: 'bg-brand-gold', textColor: 'text-brand-gold', emoji: '🟢' };
    if (mood >= 41) return { label: 'Neutral', color: 'bg-gray-500', textColor: 'text-gray-400', emoji: '🟡' };
    if (mood >= 21) return { label: 'Low', color: 'bg-warning', textColor: 'text-warning', emoji: '🟠' };
    return { label: 'Very Low', color: 'bg-destructive', textColor: 'text-destructive', emoji: '🔴' };
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'bg-destructive/20 text-destructive',
      medium: 'bg-warning/20 text-warning',
      low: 'bg-brand-gold/20 text-brand-gold'
    };
    return variants[priority as keyof typeof variants] || variants.medium;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Heart className="w-8 h-8 text-brand-rose" />
          Artist Mood System - UI Prototype
        </h1>
        <p className="text-white/70 text-sm">
          Visual mockup with dummy data for design review. No backend integration.
        </p>
        <Badge variant="secondary" className="text-xs">
          Task 1.1 - MoodSystemPrototype.tsx
        </Badge>
      </div>

      {/* Section 1: Mood Event Notifications Mockup */}
      <Card className="bg-sidebar border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Section 1: Mood Event Notifications
            <Badge variant="outline" className="ml-auto text-xs">Task 1.3</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-white/70 text-sm mb-4">
            Sample warning events (mood &lt;40) and opportunity events (mood &gt;80)
          </div>

          {MOCK_MOOD_EVENTS.map(event => (
            <div
              key={event.id}
              className={`p-4 rounded-lg ${event.bgColor} border border-white/10`}
            >
              <div className="flex items-start gap-3">
                <event.icon className={`w-5 h-5 ${event.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{event.artistName}</span>
                    <Badge className={getMoodLevelInfo(event.mood).textColor + ' bg-transparent border-current'}>
                      {getMoodLevelInfo(event.mood).emoji} {event.mood}
                    </Badge>
                  </div>
                  <p className="text-white/90 text-sm">{event.message}</p>
                  <p className="text-white/60 text-xs">{event.action}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 2: Mood Recommendations Mockup */}
      <Card className="bg-sidebar border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Lightbulb className="w-5 h-5 text-brand-gold" />
            Section 2: AI-Driven Mood Recommendations
            <Badge variant="outline" className="ml-auto text-xs">Task 1.4</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-white/70 text-sm mb-4">
            Actionable recommendations based on mood state with priority indicators
          </div>

          {MOCK_RECOMMENDATIONS.map(rec => (
            <div
              key={rec.id}
              className="p-4 rounded-lg bg-black/20 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityBadge(rec.priority)}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                    <span className="font-semibold text-white">{rec.artistName}</span>
                  </div>
                  <h4 className="text-white font-medium">{rec.title}</h4>
                  <p className="text-white/70 text-sm">{rec.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-brand-gold text-xs font-medium">{rec.impact}</span>
                    <Button size="sm" variant="outline" className="text-xs">
                      Take Action
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 3: Enhanced Artist Card Mockup */}
      <Card className="bg-sidebar border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Heart className="w-5 h-5 text-brand-rose" />
            Section 3: Enhanced Artist Card with Predictions
            <Badge variant="outline" className="ml-auto text-xs">Task 1.6</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-white/70 text-sm mb-4">
            Extended mood indicator with factors, predictions, performance attribution, and management tips
          </div>

          {/* Artist Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-burgundy/30 flex items-center justify-center text-2xl">
              🎤
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white">{MOCK_ARTIST.name}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{MOCK_ARTIST.archetype}</Badge>
                <Badge className={getMoodLevelInfo(MOCK_ARTIST.mood).textColor + ' bg-transparent border-current'}>
                  {getMoodLevelInfo(MOCK_ARTIST.mood).emoji} Mood: {MOCK_ARTIST.mood}
                </Badge>
              </div>
            </div>
          </div>

          {/* Mood Factors */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Info className="w-4 h-4" />
              Mood Factors
            </h4>
            {MOCK_ARTIST.moodFactors.map((factor, idx) => (
              <div key={idx} className="bg-black/20 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium">{factor.factor}</span>
                  <Badge
                    className={
                      factor.impact > 0
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }
                  >
                    {factor.impact > 0 ? '+' : ''}{factor.impact}
                  </Badge>
                </div>
                <p className="text-white/60 text-xs">{factor.description}</p>
              </div>
            ))}
          </div>

          {/* Mood Prediction */}
          <div className="bg-brand-gold/10 border border-brand-gold/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-brand-gold" />
              <span className="text-sm font-semibold text-white">Next Month Prediction</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{MOCK_ARTIST.predictedMood}</div>
                <div className="text-xs text-white/50">
                  {Math.round(MOCK_ARTIST.predictionConfidence * 100)}% confidence
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </div>

          {/* Project Performance Attribution */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white">Recent Project Impact</h4>
            <div className="bg-success/10 border border-success/30 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium text-sm">Latest Single</div>
                  <div className="text-white/60 text-xs">85% success rate</div>
                </div>
                <div className="text-right">
                  <div className="text-success font-bold">+8 mood</div>
                  <div className="text-success/60 text-xs">+25% quality bonus</div>
                </div>
              </div>
            </div>
          </div>

          {/* Management Tips */}
          <div className="bg-brand-burgundy/10 border border-brand-burgundy/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-brand-gold" />
              <span className="text-sm font-semibold text-white">Management Tip</span>
            </div>
            <p className="text-white/70 text-sm">
              {MOCK_ARTIST.name} is in good spirits! This is an excellent time to start ambitious projects
              for maximum quality bonuses. Consider reducing workload from 3 to 2 projects to maintain this mood.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer Notes */}
      <Card className="bg-brand-burgundy/10 border-brand-burgundy/30">
        <CardContent className="p-4">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Prototype Notes
          </h4>
          <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
            <li>All data is HARDCODED/STUB for visual design review</li>
            <li>No backend API calls - pure UI mockup</li>
            <li>Uses existing UI patterns from ArtistRoster and Dashboard</li>
            <li>Brand colors from Tailwind config (brand-burgundy, brand-gold, brand-rose)</li>
            <li><strong className="text-warning">Sections Removed:</strong> Mood History Chart (1) and Analytics Dashboard (4) - not being implemented</li>
            <li><strong className="text-success">Simplified Focus:</strong> Event notifications, recommendations, and artist-specific predictions only</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
