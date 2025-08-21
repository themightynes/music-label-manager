import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, DollarSign, TrendingUp, ChevronRight, Menu } from 'lucide-react';

// Mobile-Optimized Plan Release Layout
export function MobilePlanReleaseLayout({ 
  children, 
  gameState, 
  onBack, 
  currentStep, 
  totalSteps,
  metrics 
}) {
  const isMobile = useIsMobile();
  const [showPreview, setShowPreview] = useState(false);

  if (!isMobile) {
    // Desktop layout unchanged
    return children;
  }

  const STEP_NAMES = ['Artist', 'Songs', 'Marketing', 'Review'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header with Progress */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            
            {/* Money indicator */}
            <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-lg text-sm">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-mono font-semibold">${(gameState?.money || 0).toLocaleString()}</span>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{STEP_NAMES[currentStep - 1]}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Preview toggle button */}
            <Sheet open={showPreview} onOpenChange={setShowPreview}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Release Preview</SheetTitle>
                </SheetHeader>
                <MobilePreviewContent metrics={metrics} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main content with optimized scrolling */}
      <main className="px-4 py-4 pb-20">
        {children}
      </main>

      {/* Floating action area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <MobileActionArea 
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={() => {/* handle next */}}
          onPrevious={() => {/* handle previous */}}
          canProceed={true}
        />
      </div>
    </div>
  );
}

// Mobile-optimized artist selection
export function MobileArtistGrid({ artists, selectedArtist, onSelect }) {
  return (
    <div className="space-y-3">
      {artists.map(artist => (
        <div
          key={artist.id}
          className={`p-4 border rounded-lg transition-all ${
            selectedArtist === artist.id 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-200'
          }`}
          onClick={() => onSelect(artist.id)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{artist.name}</h3>
              <Badge variant="outline" className="text-xs mt-1">{artist.genre}</Badge>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
          
          {/* Compact stats */}
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <div className="font-semibold text-green-600">{artist.readySongs}</div>
              <div className="text-xs text-slate-500">Songs</div>
            </div>
            <div>
              <div className="font-semibold">{artist.mood}%</div>
              <div className="text-xs text-slate-500">Mood</div>
            </div>
            <div>
              <div className="font-semibold">{artist.loyalty}%</div>
              <div className="text-xs text-slate-500">Loyalty</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Mobile-optimized song selection with better touch targets
export function MobileSongList({ songs, selectedSongs, onToggle }) {
  return (
    <div className="space-y-3">
      {songs.map(song => {
        const isSelected = selectedSongs.includes(song.id);
        return (
          <div
            key={song.id}
            className={`p-4 border rounded-lg transition-all ${
              isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
            }`}
            onClick={() => onToggle(song.id)}
          >
            <div className="flex items-start space-x-3">
              {/* Large touch target for checkbox */}
              <div className="pt-1">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                }`}>
                  {isSelected && <div className="w-3 h-3 bg-white rounded-sm" />}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 truncate">{song.title}</h4>
                
                {/* Stacked info for mobile */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs ${getQualityColor(song.quality)}`}>
                      {song.quality} Quality
                    </Badge>
                    <Badge variant="outline" className="text-xs">{song.mood}</Badge>
                  </div>
                  
                  <div className="text-sm text-slate-600">
                    <div>{song.estimatedStreams.toLocaleString()} streams</div>
                    <div>${song.estimatedRevenue.toLocaleString()} revenue</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Mobile-optimized marketing with accordion
export function MobileMarketingBudget({ channels, budgets, setBudgets, gameState }) {
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  
  return (
    <div className="space-y-3">
      {channels.map(channel => {
        const budget = budgets[channel.id] || 0;
        const isActive = budget > 0;
        const isExpanded = activeChannel === channel.id;
        
        return (
          <div key={channel.id} className="border rounded-lg overflow-hidden">
            {/* Channel header - large touch target */}
            <div
              className={`p-4 transition-all ${
                isActive ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
              onClick={() => setActiveChannel(isExpanded ? null : channel.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <i className={`${channel.icon} text-lg ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <h5 className="font-medium text-slate-900">{channel.name}</h5>
                    <p className="text-xs text-slate-500">{channel.targetAudience}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">${budget.toLocaleString()}</div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`} />
                </div>
              </div>
            </div>
            
            {/* Expanded controls */}
            {isExpanded && (
              <div className="p-4 border-t bg-white">
                <p className="text-sm text-slate-600 mb-4">{channel.description}</p>
                
                {/* Large touch-friendly slider */}
                <div className="space-y-4">
                  <MobileBudgetSlider
                    value={budget}
                    min={0}
                    max={Math.min(channel.maxBudget, gameState?.money || 0)}
                    step={250}
                    onChange={(value) => setBudgets(prev => ({ ...prev, [channel.id]: value }))}
                  />
                  
                  {/* Quick preset buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBudgets(prev => ({ ...prev, [channel.id]: 0 }))}
                    >
                      None
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBudgets(prev => ({ ...prev, [channel.id]: channel.minBudget }))}
                    >
                      Min
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBudgets(prev => ({ 
                        ...prev, 
                        [channel.id]: Math.round(channel.maxBudget * 0.6) 
                      }))}
                    >
                      Good
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBudgets(prev => ({ ...prev, [channel.id]: channel.maxBudget }))}
                    >
                      Max
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Custom mobile slider with better touch handling
function MobileBudgetSlider({ value, min, max, step, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Budget</span>
        <span className="font-mono font-semibold">${value.toLocaleString()}</span>
      </div>
      
      {/* Custom slider with larger touch target */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-8 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-thumb-large"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>${min.toLocaleString()}</span>
          <span>${max.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Mobile preview content
function MobilePreviewContent({ metrics }) {
  return (
    <div className="space-y-4 pt-4">
      {/* Key metrics in large, readable format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {metrics.estimatedStreams?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-slate-600">Est. Streams</div>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            ${metrics.estimatedRevenue?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-slate-600">Est. Revenue</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            -${metrics.totalMarketingCost?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-slate-600">Marketing Cost</div>
        </div>
        <div className="text-center p-4 bg-slate-50 rounded-lg">
          <div className={`text-2xl font-bold ${
            (metrics.projectedROI || 0) > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {(metrics.projectedROI || 0) > 0 ? '+' : ''}{metrics.projectedROI || 0}%
          </div>
          <div className="text-sm text-slate-600">ROI</div>
        </div>
      </div>
      
      {/* Additional details in expandable sections */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>
        
        <TabsContent value="breakdown" className="mt-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Release Bonus:</span>
              <span>+{metrics.releaseBonus || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span>Seasonal:</span>
              <span>+{Math.round(((metrics.seasonalMultiplier || 1) - 1) * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Marketing:</span>
              <span>+{Math.round(((metrics.marketingMultiplier || 1) - 1) * 100)}%</span>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="channels" className="mt-4">
          <div className="space-y-2 text-sm">
            {/* Channel breakdown */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Mobile action area for navigation
function MobileActionArea({ currentStep, totalSteps, onNext, onPrevious, canProceed }) {
  return (
    <div className="flex space-x-3">
      {currentStep > 1 && (
        <Button
          variant="outline"
          onClick={onPrevious}
          className="flex-1"
        >
          Previous
        </Button>
      )}
      
      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="flex-1"
      >
        {currentStep === totalSteps ? 'Plan Release' : 'Continue'}
      </Button>
    </div>
  );
}

function getQualityColor(quality: number) {
  if (quality >= 90) return 'text-green-600 bg-green-100';
  if (quality >= 80) return 'text-blue-600 bg-blue-100';
  if (quality >= 70) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

/* CSS for better mobile slider styling */
const mobileSliderStyles = `
.slider-thumb-large::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.slider-thumb-large::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
`;