import React, { useState } from 'react';
import { BarChart3, Beaker, RotateCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'wouter';

interface TestScenario {
  id: string;
  talent: number;
  workEthic: number;
  popularity: number;
  mood: number;
  producer: string;
  time: string;
  budget: string;
  budgetPerSong: number;
  minViableCost: number;
  efficiency: number;
  budgetMult: number;
  qualities: number[];
  avgQuality: number;
  minQuality: number;
  maxQuality: number;
  variance: number;
  expectedVariance: number;
  totalCost: number;
}

interface TestConfig {
  talent: number;
  workEthic: number;
  popularity: number;
  mood: number;
  producer: string;
  time: string;
  budgetLevel: string;
  songCount: number;
  simulations: number;
}

const PRODUCER_SKILLS = {
  local: 40,
  regional: 55,
  national: 75,
  legendary: 95
};

const PRODUCER_MULTIPLIERS = {
  local: 1.0,
  regional: 1.5,
  national: 2.5,
  legendary: 5.5
};

const TIME_MULTIPLIERS = {
  rushed: 0.7,
  standard: 1.0,
  extended: 1.4,
  perfectionist: 2.1
};

const TIME_QUALITY_MULTIPLIERS = {
  rushed: 0.9,
  standard: 1.0,
  extended: 1.1,
  perfectionist: 1.2
};

const BUDGET_LEVELS = [
  { name: 'minimum', mult: 0.5, color: 'text-red-500' },
  { name: 'below', mult: 0.7, color: 'text-orange-500' },
  { name: 'efficient', mult: 1.0, color: 'text-green-500' },
  { name: 'premium', mult: 1.5, color: 'text-blue-500' },
  { name: 'luxury', mult: 2.5, color: 'text-purple-500' }
];

export default function QualityTester() {
  const [config, setConfig] = useState<TestConfig>({
    talent: 50,
    workEthic: 60,
    popularity: 30,
    mood: 50,
    producer: 'regional',
    time: 'standard',
    budgetLevel: 'efficient',
    songCount: 5,
    simulations: 10
  });
  
  const [results, setResults] = useState<TestScenario[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);

  // Simplified quality calculation
  const calculateQuality = (
    talent: number,
    workEthic: number,
    popularity: number,
    mood: number,
    producer: string,
    time: string,
    budgetPerSong: number,
    songCount: number
  ) => {
    // Base quality from talent and producer skill
    const producerSkill = PRODUCER_SKILLS[producer as keyof typeof PRODUCER_SKILLS];
    const baseQuality = (talent * 0.65 + producerSkill * 0.35);
    
    // Time factor with work ethic synergy
    const timeMultiplier = TIME_QUALITY_MULTIPLIERS[time as keyof typeof TIME_QUALITY_MULTIPLIERS];
    const workEthicBonus = (workEthic / 100) * 0.3;
    const timeFactor = timeMultiplier * (1 + workEthicBonus);
    
    // Popularity factor (balanced: 0.95x to 1.05x range)
    const popularityFactor = 0.95 + 0.1 * Math.sqrt(popularity / 100);
    
    // Mood factor
    const moodFactor = 0.9 + 0.2 * (mood / 100);
    
    // Session fatigue
    const focusFactor = Math.pow(0.97, Math.max(0, songCount - 3));
    
    // Budget factor (simplified)
    const minViableCost = calculateMinViableCost(producer, time, songCount);
    let efficiencyRatio = budgetPerSong / minViableCost;
    
    // Apply dampening factor (matching backend logic)
    const dampeningFactor = 0.7; // Must match quality.json
    efficiencyRatio = 1 + dampeningFactor * (efficiencyRatio - 1);
    
    let budgetFactor = 1.0;
    
    if (efficiencyRatio < 0.6) {
      budgetFactor = 0.65;
    } else if (efficiencyRatio < 0.8) {
      budgetFactor = 0.65 + (0.85 - 0.65) * ((efficiencyRatio - 0.6) / 0.2);
    } else if (efficiencyRatio <= 1.2) {
      budgetFactor = 0.85 + (1.05 - 0.85) * ((efficiencyRatio - 0.8) / 0.4);
    } else if (efficiencyRatio <= 2.0) {
      budgetFactor = 1.05 + (1.20 - 1.05) * ((efficiencyRatio - 1.2) / 0.8);
    } else if (efficiencyRatio <= 3.5) {
      budgetFactor = 1.20 + (1.35 - 1.20) * ((efficiencyRatio - 2.0) / 1.5);
    } else {
      budgetFactor = 1.35 + Math.log(1 + efficiencyRatio - 3.5) * 0.025;
    }
    
    // Skill-based variance with outlier system
    const combinedSkill = (talent + producerSkill) / 2;
    const baseVarianceRange = 35 - (30 * (combinedSkill / 100)); // 35% down to 5%
    
    // Check for outlier events (10% chance total)
    const outlierRoll = Math.random();
    let variance: number;
    
    if (outlierRoll < 0.05) {
      // 5% chance of breakout hit
      const outlierBoost = 1.5 + (0.5 * (1 - combinedSkill / 100)); // 1.5x to 2.0x
      variance = outlierBoost;
    } else if (outlierRoll < 0.10) {
      // 5% chance of critical failure
      const outlierPenalty = 0.5 + (0.2 * (combinedSkill / 100)); // 0.5x to 0.7x
      variance = outlierPenalty;
    } else {
      // 90% normal variance
      variance = 1 + ((Math.random() * 2 - 1) * baseVarianceRange / 100);
    }
    
    // Combine all factors
    let quality = baseQuality * timeFactor * popularityFactor * focusFactor * budgetFactor * moodFactor * variance;
    
    // Floor and ceiling
    quality = Math.round(Math.min(98, Math.max(25, quality)));
    
    return quality;
  };
  
  const calculateMinViableCost = (producer: string, time: string, songCount: number) => {
    const baseCostPerSong = 4000; // EP base cost
    const economies = 1 - Math.min(0.3, (songCount - 1) * 0.05); // Economies of scale
    const baselineMultiplier = 1.5; // Baseline quality multiplier
    
    return baseCostPerSong * economies * baselineMultiplier;
  };
  
  const calculateProjectCost = (budgetPerSong: number, songCount: number, producer: string, time: string) => {
    const producerMult = PRODUCER_MULTIPLIERS[producer as keyof typeof PRODUCER_MULTIPLIERS];
    const timeMult = TIME_MULTIPLIERS[time as keyof typeof TIME_MULTIPLIERS];
    return Math.round(budgetPerSong * songCount * producerMult * timeMult);
  };

  const runSimulation = () => {
    setIsRunning(true);
    const newResults: TestScenario[] = [];
    
    // Create test configurations
    const configurations: Partial<TestConfig>[] = comparisonMode ? [
      { producer: 'local' },
      { producer: 'regional' },
      { producer: 'national' },
      { producer: 'legendary' }
    ] : [config];
    
    configurations.forEach(testConfig => {
      const mergedConfig = { ...config, ...testConfig };
      const {
        talent, workEthic, popularity, mood,
        producer, time, budgetLevel, songCount, simulations
      } = mergedConfig;
      
      // Calculate budget
      const budget = BUDGET_LEVELS.find(b => b.name === budgetLevel);
      const minViableCost = calculateMinViableCost(producer, time, songCount);
      const budgetPerSong = Math.round(minViableCost * (budget?.mult || 1));
      // Apply dampening to the displayed efficiency as well
      const rawEfficiency = budgetPerSong / minViableCost;
      const dampeningFactor = 0.7;
      const efficiency = 1 + dampeningFactor * (rawEfficiency - 1);
      
      // Get project cost
      const totalCost = calculateProjectCost(budgetPerSong, songCount, producer, time);
      
      // Calculate budget multiplier
      let efficiencyRatio = budgetPerSong / minViableCost;
      
      // Apply dampening factor (matching backend logic)
      // dampeningFactor already declared above
      efficiencyRatio = 1 + dampeningFactor * (efficiencyRatio - 1);
      
      let budgetMult = 1.0;
      
      if (efficiencyRatio < 0.6) {
        budgetMult = 0.65;
      } else if (efficiencyRatio < 0.8) {
        budgetMult = 0.65 + (0.85 - 0.65) * ((efficiencyRatio - 0.6) / 0.2);
      } else if (efficiencyRatio <= 1.2) {
        budgetMult = 0.85 + (1.05 - 0.85) * ((efficiencyRatio - 0.8) / 0.4);
      } else if (efficiencyRatio <= 2.0) {
        budgetMult = 1.05 + (1.20 - 1.05) * ((efficiencyRatio - 1.2) / 0.8);
      } else if (efficiencyRatio <= 3.5) {
        budgetMult = 1.20 + (1.35 - 1.20) * ((efficiencyRatio - 2.0) / 1.5);
      } else {
        budgetMult = 1.35 + Math.log(1 + efficiencyRatio - 3.5) * 0.025;
      }
      
      // Calculate expected variance (updated formula)
      const producerSkill = PRODUCER_SKILLS[producer as keyof typeof PRODUCER_SKILLS];
      const combinedSkill = (talent + producerSkill) / 2;
      const expectedVariance = 35 - (30 * (combinedSkill / 100)); // Updated to match new system
      
      // Run simulations
      const allQualities: number[] = [];
      
      for (let sim = 0; sim < simulations; sim++) {
        for (let i = 0; i < songCount; i++) {
          const quality = calculateQuality(
            talent, workEthic, popularity, mood,
            producer, time, budgetPerSong, songCount
          );
          allQualities.push(quality);
        }
      }
      
      // Calculate statistics
      const avgQuality = allQualities.reduce((a, b) => a + b, 0) / allQualities.length;
      const minQuality = Math.min(...allQualities);
      const maxQuality = Math.max(...allQualities);
      const variance = ((maxQuality - minQuality) / avgQuality) * 100;
      
      const scenario: TestScenario = {
        id: `${producer}_${time}_${budgetLevel}_${Date.now()}`,
        talent, workEthic, popularity, mood,
        producer, time, budget: budgetLevel,
        budgetPerSong, minViableCost: Math.round(minViableCost),
        efficiency, budgetMult,
        qualities: allQualities.slice(0, songCount),
        avgQuality, minQuality, maxQuality,
        variance, expectedVariance,
        totalCost
      };
      
      newResults.push(scenario);
    });
    
    setResults(prev => [...newResults, ...prev].slice(0, 20));
    setIsRunning(false);
  };
  
  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-green-500';
    if (quality >= 60) return 'text-blue-500';
    if (quality >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getBudgetColor = (efficiency: number) => {
    if (efficiency < 0.6) return 'text-red-500';
    if (efficiency < 0.8) return 'text-orange-500';
    if (efficiency <= 1.2) return 'text-green-500';
    if (efficiency <= 2.0) return 'text-blue-500';
    return 'text-purple-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-plum-900 via-plum-800 to-plum-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-plum-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-burgundy-600/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Beaker className="h-8 w-8 text-burgundy-400" />
                Song Quality Testing Lab
              </h1>
              <p className="text-gray-300 mt-2">
                Simulate recording sessions and analyze quality outcomes
              </p>
            </div>
            <Link href="/">
              <button className="px-4 py-2 bg-burgundy-600 hover:bg-burgundy-700 rounded-lg transition-colors">
                Back to Game
              </button>
            </Link>
          </div>
        </div>
        
        {/* Configuration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1 bg-plum-800/30 backdrop-blur-sm rounded-xl p-6 border border-burgundy-600/30">
            <h2 className="text-xl font-bold mb-4">Test Configuration</h2>
            
            {/* Artist Attributes */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-burgundy-300">Artist Attributes</h3>
              
              <div>
                <label className="text-sm text-gray-300">Talent: {config.talent}</label>
                <input
                  type="range"
                  min="20" max="95" step="5"
                  value={config.talent}
                  onChange={(e) => setConfig({...config, talent: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300">Work Ethic: {config.workEthic}</label>
                <input
                  type="range"
                  min="20" max="95" step="5"
                  value={config.workEthic}
                  onChange={(e) => setConfig({...config, workEthic: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300">Popularity: {config.popularity}</label>
                <input
                  type="range"
                  min="0" max="100" step="10"
                  value={config.popularity}
                  onChange={(e) => setConfig({...config, popularity: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300">Mood: {config.mood}</label>
                <input
                  type="range"
                  min="20" max="95" step="5"
                  value={config.mood}
                  onChange={(e) => setConfig({...config, mood: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>
            </div>
            
            {/* Project Settings */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-burgundy-300">Project Settings</h3>
              
              <div>
                <label className="text-sm text-gray-300">Producer Tier</label>
                <select
                  value={config.producer}
                  onChange={(e) => setConfig({...config, producer: e.target.value})}
                  className="w-full bg-plum-900 border border-burgundy-600/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-burgundy-500"
                  style={{ backgroundColor: 'rgb(44, 34, 42)' }}
                >
                  <option value="local" className="bg-plum-800">Local (40 skill)</option>
                  <option value="regional" className="bg-plum-800">Regional (55 skill)</option>
                  <option value="national" className="bg-plum-800">National (75 skill)</option>
                  <option value="legendary" className="bg-plum-800">Legendary (95 skill)</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-300">Time Investment</label>
                <select
                  value={config.time}
                  onChange={(e) => setConfig({...config, time: e.target.value})}
                  className="w-full bg-plum-900 border border-burgundy-600/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-burgundy-500"
                  style={{ backgroundColor: 'rgb(44, 34, 42)' }}
                >
                  <option value="rushed" className="bg-plum-800">Rushed (-10%)</option>
                  <option value="standard" className="bg-plum-800">Standard (0%)</option>
                  <option value="extended" className="bg-plum-800">Extended (+10%)</option>
                  <option value="perfectionist" className="bg-plum-800">Perfectionist (+20%)</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-300">Budget Level</label>
                <select
                  value={config.budgetLevel}
                  onChange={(e) => setConfig({...config, budgetLevel: e.target.value})}
                  className="w-full bg-plum-900 border border-burgundy-600/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-burgundy-500"
                  style={{ backgroundColor: 'rgb(44, 34, 42)' }}
                >
                  {BUDGET_LEVELS.map(level => (
                    <option key={level.name} value={level.name} className="bg-plum-800">
                      {level.name} ({level.mult}x minimum)
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-300">Songs: {config.songCount}</label>
                <input
                  type="range"
                  min="1" max="10" step="1"
                  value={config.songCount}
                  onChange={(e) => setConfig({...config, songCount: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300">Simulations: {config.simulations}</label>
                <input
                  type="range"
                  min="5" max="50" step="5"
                  value={config.simulations}
                  onChange={(e) => setConfig({...config, simulations: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>
            </div>
            
            {/* Controls */}
            <div className="space-y-3">
              <button
                onClick={runSimulation}
                disabled={isRunning}
                className="w-full py-3 bg-gradient-to-r from-burgundy-600 to-burgundy-700 hover:from-burgundy-700 hover:to-burgundy-800 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RotateCw className="h-5 w-5 animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-5 w-5" />
                    Run Simulation
                  </>
                )}
              </button>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="comparison"
                  checked={comparisonMode}
                  onChange={(e) => setComparisonMode(e.target.checked)}
                  className="accent-burgundy-500"
                />
                <label htmlFor="comparison" className="text-sm text-gray-300">
                  Compare all producer tiers
                </label>
              </div>
              
              <button
                onClick={() => setResults([])}
                className="w-full py-2 bg-plum-700/50 hover:bg-plum-700/70 rounded-lg transition-colors text-sm"
              >
                Clear Results
              </button>
            </div>
          </div>
          
          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-4">
            {results.length === 0 ? (
              <div className="bg-plum-800/30 backdrop-blur-sm rounded-xl p-12 border border-burgundy-600/30 text-center">
                <Beaker className="h-16 w-16 mx-auto text-burgundy-400/50 mb-4" />
                <p className="text-gray-400">
                  Configure your test parameters and run a simulation to see results
                </p>
              </div>
            ) : (
              results.map((result) => (
                <div
                  key={result.id}
                  className="bg-plum-800/30 backdrop-blur-sm rounded-xl p-6 border border-burgundy-600/30"
                >
                  {/* Result Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {result.producer.charAt(0).toUpperCase() + result.producer.slice(1)} Producer,
                        {' '}{result.time.charAt(0).toUpperCase() + result.time.slice(1)} Time,
                        {' '}{result.budget.charAt(0).toUpperCase() + result.budget.slice(1)} Budget
                      </h3>
                      <div className="flex gap-4 mt-1 text-sm text-gray-400">
                        <span>T{result.talent} Artist</span>
                        <span>${result.budgetPerSong}/song</span>
                        <span className={getBudgetColor(result.efficiency)}>
                          {result.efficiency.toFixed(2)}x minimum
                        </span>
                        <span>Total: ${result.totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetails(showDetails === result.id ? null : result.id)}
                      className="text-burgundy-400 hover:text-burgundy-300"
                    >
                      {showDetails === result.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {/* Quality Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-plum-900/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Average</div>
                      <div className={`text-2xl font-bold ${getQualityColor(result.avgQuality)}`}>
                        {result.avgQuality.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-plum-900/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Min-Max</div>
                      <div className="text-lg font-bold">
                        {result.minQuality}-{result.maxQuality}
                      </div>
                    </div>
                    <div className="bg-plum-900/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Variance</div>
                      <div className="text-lg font-bold">
                        {result.variance.toFixed(1)}%
                        <span className="text-xs text-gray-400 ml-1">
                          (±{result.expectedVariance.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="bg-plum-900/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Value</div>
                      <div className="text-lg font-bold text-green-400">
                        {(result.avgQuality / (result.totalCost / 1000)).toFixed(1)}
                        <span className="text-xs text-gray-400 ml-1">Q/$1k</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quality Distribution Bar */}
                  <div className="bg-plum-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Quality Distribution</span>
                      <span className="text-xs text-gray-400">
                        Budget Mult: {result.budgetMult.toFixed(3)}x
                      </span>
                    </div>
                    <div className="relative h-8 bg-plum-800/50 rounded-lg overflow-hidden">
                      <div
                        className="absolute h-full bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 opacity-30"
                        style={{ width: '100%' }}
                      />
                      <div
                        className="absolute h-full bg-burgundy-500/50"
                        style={{
                          left: `${(result.minQuality / 100) * 100}%`,
                          width: `${((result.maxQuality - result.minQuality) / 100) * 100}%`
                        }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white"
                        style={{ left: `${(result.avgQuality / 100) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">0</span>
                      <span className="text-xs text-gray-500">25</span>
                      <span className="text-xs text-gray-500">50</span>
                      <span className="text-xs text-gray-500">75</span>
                      <span className="text-xs text-gray-500">100</span>
                    </div>
                  </div>
                  
                  {/* Detailed View */}
                  {showDetails === result.id && (
                    <div className="mt-4 pt-4 border-t border-burgundy-600/30">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2 text-burgundy-300">Artist Stats</h4>
                          <div className="space-y-1 text-gray-400">
                            <div>Talent: {result.talent}</div>
                            <div>Work Ethic: {result.workEthic}</div>
                            <div>Popularity: {result.popularity}</div>
                            <div>Mood: {result.mood}</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2 text-burgundy-300">Financial Analysis</h4>
                          <div className="space-y-1 text-gray-400">
                            <div>Min Viable: ${result.minViableCost}</div>
                            <div>Actual Budget: ${result.budgetPerSong}</div>
                            <div>Efficiency: {result.efficiency.toFixed(2)}x</div>
                            <div>Budget Multiplier: {result.budgetMult.toFixed(3)}x</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2 text-burgundy-300">Sample Song Qualities</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.qualities.map((q, i) => (
                            <span
                              key={i}
                              className={`px-2 py-1 rounded-lg bg-plum-900/50 ${getQualityColor(q)}`}
                            >
                              Song {i + 1}: {q.toFixed(0)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Summary Statistics */}
        {results.length > 0 && (
          <div className="bg-plum-800/30 backdrop-blur-sm rounded-xl p-6 border border-burgundy-600/30">
            <h2 className="text-xl font-bold mb-4">Session Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400">Best Quality</div>
                <div className="text-2xl font-bold text-green-400">
                  {Math.max(...results.map(r => r.avgQuality)).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Best Value</div>
                <div className="text-2xl font-bold text-blue-400">
                  {Math.max(...results.map(r => r.avgQuality / (r.totalCost / 1000))).toFixed(1)}
                  <span className="text-sm text-gray-400 ml-1">Q/$1k</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Lowest Cost</div>
                <div className="text-2xl font-bold text-yellow-400">
                  ${Math.min(...results.map(r => r.totalCost)).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Most Consistent</div>
                <div className="text-2xl font-bold text-purple-400">
                  {Math.min(...results.map(r => r.variance)).toFixed(1)}%
                  <span className="text-sm text-gray-400 ml-1">variance</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}