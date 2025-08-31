import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react';

// Guided Workflow Component - Step-by-step with decision points
export function GuidedPlanReleaseWorkflow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [decisions, setDecisions] = useState({
    artist: null,
    songs: [],
    releaseType: null,
    leadSingle: null,
    marketingApproach: null, // 'simple' | 'advanced'
    marketingBudget: {},
    leadSingleBudget: {},
    timing: {}
  });

  const WORKFLOW_STEPS = [
    {
      id: 1,
      title: 'Choose Artist',
      description: 'Select which artist will release music',
      component: ArtistSelectionStep,
      requiredFields: ['artist'],
      helpText: 'Start by choosing an artist with ready songs and good mood/loyalty stats.'
    },
    {
      id: 2,
      title: 'Select Songs',
      description: 'Pick songs for your release',
      component: SongSelectionStep,
      requiredFields: ['songs'],
      helpText: 'Choose 1 song for a single, 3-5 for an EP, or 8+ for an album.'
    },
    {
      id: 3,
      title: 'Release Strategy',
      description: 'Plan your release approach',
      component: ReleaseStrategyStep,
      requiredFields: ['releaseType'],
      helpText: 'Release type affects bonuses and marketing requirements.'
    },
    {
      id: 4,
      title: 'Marketing Plan',
      description: 'Allocate your promotional budget',
      component: MarketingPlanStep,
      requiredFields: ['marketingApproach', 'marketingBudget'],
      helpText: 'Choose between quick presets or detailed channel control.'
    },
    {
      id: 5,
      title: 'Lead Single',
      description: 'Configure lead single strategy (if applicable)',
      component: LeadSingleStep,
      requiredFields: [], // Optional step
      helpText: 'Lead singles build momentum for EPs and Albums.',
      conditional: (decisions) => decisions.releaseType !== 'single' && decisions.songs.length > 1
    },
    {
      id: 6,
      title: 'Review & Confirm',
      description: 'Final review of your release plan',
      component: ReviewStep,
      requiredFields: [],
      helpText: 'Review all decisions and projected performance.'
    }
  ];

  const currentStepData = WORKFLOW_STEPS.find(step => step.id === currentStep);
  const completedFields = Object.entries(decisions).filter(([key, value]) => 
    Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined
  ).map(([key]) => key);

  const canProceed = () => {
    if (!currentStepData) return false;
    
    // Check if current step's required fields are completed
    return currentStepData.requiredFields.every(field => 
      completedFields.includes(field)
    );
  };

  const getVisibleSteps = () => {
    return WORKFLOW_STEPS.filter(step => 
      !step.conditional || step.conditional(decisions)
    );
  };

  const nextStep = () => {
    const visibleSteps = getVisibleSteps();
    const currentIndex = visibleSteps.findIndex(step => step.id === currentStep);
    if (currentIndex < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentIndex + 1].id);
    }
  };

  const previousStep = () => {
    const visibleSteps = getVisibleSteps();
    const currentIndex = visibleSteps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1].id);
    }
  };

  const visibleSteps = getVisibleSteps();
  const progressPercentage = (visibleSteps.findIndex(step => step.id === currentStep) + 1) / visibleSteps.length * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Step indicator */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Plan Release</h1>
              <Badge variant="outline">
                Step {visibleSteps.findIndex(step => step.id === currentStep) + 1} of {visibleSteps.length}
              </Badge>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-sm text-white/70">
                <span>{currentStepData?.title}</span>
                <span>{Math.round(progressPercentage)}% complete</span>
              </div>
            </div>
            
            {/* Step overview */}
            <div className="flex flex-wrap gap-2">
              {visibleSteps.map(step => {
                const isCompleted = step.requiredFields.every(field => completedFields.includes(field));
                const isCurrent = step.id === currentStep;
                const isPast = visibleSteps.findIndex(s => s.id === step.id) < visibleSteps.findIndex(s => s.id === currentStep);
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-all ${
                      isCurrent 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : isCompleted || isPast
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[#65557c]/20 text-white/50'
                    }`}
                  >
                    {isCompleted || isPast ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    <span>{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{currentStepData?.title}</span>
            {currentStepData?.helpText && (
              <div className="ml-auto">
                <HelpTooltip content={currentStepData.helpText} />
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStepData && React.createElement(currentStepData.component, {
            decisions,
            setDecisions,
            onContinue: canProceed() ? nextStep : null
          })}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            <div className="flex space-x-3">
              {/* Quick decisions indicator */}
              <div className="flex items-center space-x-2 text-sm text-white/70">
                <span>Quick decisions:</span>
                <Badge variant="secondary">{completedFields.length}</Badge>
              </div>
              
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center space-x-2"
              >
                <span>{currentStep === visibleSteps[visibleSteps.length - 1].id ? 'Plan Release' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Smart Decision Recommendation System
function DecisionRecommendation({ type, data, onAccept }) {
  const getRecommendation = () => {
    switch (type) {
      case 'marketing-budget':
        return {
          title: 'Recommended: Balanced Campaign',
          description: 'Based on your song quality and available budget',
          reasoning: 'High-quality songs with digital focus for modern reach',
          budget: { digital: 3000, influencer: 1500, radio: 1000, pr: 500 },
          confidence: 85
        };
      case 'lead-single':
        const bestSong = data.songs?.reduce((best, song) => 
          song.quality > (best?.quality || 0) ? song : best
        );
        return {
          title: `Recommended: "${bestSong?.title}"`,
          description: 'Highest quality song for maximum impact',
          reasoning: `Quality ${bestSong?.quality} with strong ${bestSong?.mood} appeal`,
          confidence: 92
        };
      case 'release-timing':
        return {
          title: 'Recommended: Q4 Release',
          description: 'Holiday season for maximum sales potential',
          reasoning: '25% seasonal bonus during peak consumption period',
          confidence: 78
        };
      default:
        return null;
    }
  };

  const recommendation = getRecommendation();
  if (!recommendation) return null;

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-blue-900">{recommendation.title}</h4>
            <Badge variant="outline" className="text-xs">
              {recommendation.confidence}% match
            </Badge>
          </div>
          <p className="text-sm text-blue-700 mb-2">{recommendation.description}</p>
          <p className="text-xs text-blue-600">{recommendation.reasoning}</p>
          
          <div className="flex space-x-2 mt-3">
            <Button
              size="sm"
              onClick={() => onAccept(recommendation)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Use This
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300"
            >
              I'll Choose
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Risk/Opportunity Indicators
function RiskOpportunityIndicator({ risks, opportunities }) {
  if (risks.length === 0 && opportunities.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      {risks.length > 0 && (
        <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <h5 className="font-medium text-orange-900">Potential Risks</h5>
          </div>
          <ul className="text-sm text-orange-700 space-y-1">
            {risks.map((risk, index) => (
              <li key={index}>• {risk}</li>
            ))}
          </ul>
        </div>
      )}
      
      {opportunities.length > 0 && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <h5 className="font-medium text-green-900">Opportunities</h5>
          </div>
          <ul className="text-sm text-green-700 space-y-1">
            {opportunities.map((opportunity, index) => (
              <li key={index}>• {opportunity}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Individual Step Components (simplified versions)
function ArtistSelectionStep({ decisions, setDecisions }) {
  return (
    <div className="space-y-4">
      <p className="text-white/70">Choose an artist to create a release for.</p>
      {/* Artist selection UI - simplified for focus */}
      <div className="grid gap-4">
        {/* Artist cards with clear selection */}
      </div>
    </div>
  );
}

function SongSelectionStep({ decisions, setDecisions }) {
  return (
    <div className="space-y-4">
      <p className="text-white/70">Select songs for your release. The number of songs determines the release type.</p>
      {/* Song selection with clear type indicators */}
      <div className="grid gap-3">
        {/* Song list with better visual feedback */}
      </div>
    </div>
  );
}

function MarketingPlanStep({ decisions, setDecisions }) {
  return (
    <div className="space-y-4">
      <DecisionRecommendation 
        type="marketing-budget" 
        data={decisions}
        onAccept={(rec) => setDecisions(prev => ({ ...prev, marketingBudget: rec.budget }))}
      />
      
      <div className="flex space-x-4">
        <Button
          variant={decisions.marketingApproach === 'simple' ? 'default' : 'outline'}
          onClick={() => setDecisions(prev => ({ ...prev, marketingApproach: 'simple' }))}
        >
          Quick Setup
        </Button>
        <Button
          variant={decisions.marketingApproach === 'advanced' ? 'default' : 'outline'}
          onClick={() => setDecisions(prev => ({ ...prev, marketingApproach: 'advanced' }))}
        >
          Custom Control
        </Button>
      </div>
      
      {/* Marketing budget UI based on approach */}
    </div>
  );
}

function HelpTooltip({ content }) {
  return (
    <div className="inline-flex items-center justify-center w-5 h-5 bg-[#65557c]/30 rounded-full text-xs text-white/70 cursor-help">
      ?
    </div>
  );
}