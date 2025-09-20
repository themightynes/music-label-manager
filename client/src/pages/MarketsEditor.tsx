import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertTriangle, FileCode, RotateCcw, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface MarketConfig {
  market_formulas: {
    streaming_calculation: {
      base_formula: string;
      quality_weight: number;
      playlist_weight: number;
      reputation_weight: number;
      marketing_weight: number;
      first_week_multiplier: number;
      longevity_decay: number;
      ongoing_streams: {
        monthly_decay_rate: number;
        revenue_per_stream: number;
        ongoing_factor: number;
        reputation_bonus_factor: number;
        access_tier_bonus_factor: number;
        minimum_revenue_threshold: number;
        max_decay_months: number;
      };
    };
    press_coverage: {
      base_chance: number;
      pr_spend_modifier: number;
      story_flag_bonus: number;
      reputation_modifier: number;
      max_pickups_per_release: number;
    };
    tour_revenue: {
      base_formula: string;
      sell_through_base: number;
      reputation_modifier: number;
      local_popularity_weight: number;
      merch_percentage: number;
      ticket_price_base: number;
      ticket_price_per_capacity: number;
    };
    release_planning: {
      marketing_channels: {
        [key: string]: {
          effectiveness: number;
          description: string;
          synergies: string[];
        };
      };
      seasonal_cost_multipliers: {
        [key: string]: number;
      };
      channel_synergy_bonuses: {
        [key: string]: number;
      };
      diversity_bonus: {
        base: number;
        per_additional_channel: number;
        maximum: number;
      };
      lead_single_strategy: {
        optimal_timing_months_before: number[];
        optimal_timing_bonus: number;
        good_timing_bonus: number;
        default_bonus: number;
        marketing_effectiveness_factor: number;
        budget_scaling_factor: number;
      };
      release_type_bonuses: {
        [key: string]: {
          revenue_multiplier: number;
          marketing_efficiency: number;
        };
      };
    };
    chart_system: {
      competitor_variance_range: number[];
      chart_generation_timing: string;
      top_chart_positions: number;
      bubbling_under_positions: number;
      chart_exit: {
        max_chart_position: number;
        long_tenure_weeks: number;
        long_tenure_position_threshold: number;
        low_streams_threshold: number;
        low_streams_position_threshold: number;
      };
    };
  };
  seasonal_modifiers: {
    [key: string]: number;
  };
}

export default function MarketsEditor() {
  const [configText, setConfigText] = useState<string>('');
  const [originalConfig, setOriginalConfig] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const { toast } = useToast();

  // Load markets.json on component mount
  useEffect(() => {
    loadMarketsConfig();
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(configText !== originalConfig && configText !== '');
    setSavedSuccessfully(false);
  }, [configText, originalConfig]);

  const loadMarketsConfig = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, you'd fetch from your backend
      // For now, we'll simulate loading the current config
      const response = await fetch('/api/dev/markets-config');
      if (!response.ok) {
        // Fallback: load from the data we know exists
        const fallbackConfig = {
          "market_formulas": {
            "streaming_calculation": {
              "base_formula": "quality * playlist_access * reputation * ad_spend * rng",
              "quality_weight": 0.35,
              "playlist_weight": 0.25,
              "reputation_weight": 0.20,
              "marketing_weight": 0.20,
              "first_week_multiplier": 2.5,
              "longevity_decay": 0.85,
              "ongoing_streams": {
                "monthly_decay_rate": 0.85,
                "revenue_per_stream": 0.05,
                "ongoing_factor": 0.8,
                "reputation_bonus_factor": 0.002,
                "access_tier_bonus_factor": 0.1,
                "minimum_revenue_threshold": 1,
                "max_decay_months": 24
              }
            },
            "press_coverage": {
              "base_chance": 0.15,
              "pr_spend_modifier": 0.001,
              "story_flag_bonus": 0.30,
              "reputation_modifier": 0.008,
              "max_pickups_per_release": 8
            },
            "tour_revenue": {
              "base_formula": "venue_capacity * sell_through * ticket_price * artist_popularity",
              "sell_through_base": 0.15,
              "reputation_modifier": 0.05,
              "local_popularity_weight": 0.6,
              "merch_percentage": 0.15,
              "ticket_price_base": 25,
              "ticket_price_per_capacity": 0.03
            },
            "release_planning": {
              "marketing_channels": {
                "radio": {
                  "effectiveness": 0.85,
                  "description": "High reach, mainstream appeal",
                  "synergies": ["digital"]
                },
                "digital": {
                  "effectiveness": 0.92,
                  "description": "Targeted, cost-effective",
                  "synergies": ["radio", "influencer"]
                },
                "pr": {
                  "effectiveness": 0.78,
                  "description": "Industry credibility, slower build",
                  "synergies": ["influencer"]
                },
                "influencer": {
                  "effectiveness": 0.88,
                  "description": "Social engagement, younger demographics",
                  "synergies": ["pr", "digital"]
                }
              },
              "seasonal_cost_multipliers": {
                "q1": 0.85,
                "q2": 0.95,
                "q3": 1.1,
                "q4": 1.4
              },
              "channel_synergy_bonuses": {
                "radio_digital": 0.15,
                "pr_influencer": 0.12,
                "full_spectrum": 0.10
              },
              "diversity_bonus": {
                "base": 1.0,
                "per_additional_channel": 0.08,
                "maximum": 1.4
              },
              "lead_single_strategy": {
                "optimal_timing_months_before": [1, 2],
                "optimal_timing_bonus": 1.25,
                "good_timing_bonus": 1.15,
                "default_bonus": 1.05,
                "marketing_effectiveness_factor": 0.3,
                "budget_scaling_factor": 2000
              },
              "release_type_bonuses": {
                "single": {
                  "revenue_multiplier": 1.2,
                  "marketing_efficiency": 1.1
                },
                "ep": {
                  "revenue_multiplier": 1.15,
                  "marketing_efficiency": 1.05
                },
                "album": {
                  "revenue_multiplier": 1.25,
                  "marketing_efficiency": 0.95
                }
              }
            },
            "chart_system": {
              "competitor_variance_range": [0.8, 1.2],
              "chart_generation_timing": "post_releases",
              "top_chart_positions": 100,
              "bubbling_under_positions": 200,
              "chart_exit": {
                "max_chart_position": 100,
                "long_tenure_weeks": 30,
                "long_tenure_position_threshold": 80,
                "low_streams_threshold": 1000,
                "low_streams_position_threshold": 90
              }
            }
          },
          "seasonal_modifiers": {
            "q1": 0.85,
            "q2": 0.95,
            "q3": 0.90,
            "q4": 1.25
          }
        };

        const formattedConfig = JSON.stringify(fallbackConfig, null, 2);
        setConfigText(formattedConfig);
        setOriginalConfig(formattedConfig);
      } else {
        const config = await response.json();
        const formattedConfig = JSON.stringify(config, null, 2);
        setConfigText(formattedConfig);
        setOriginalConfig(formattedConfig);
      }
    } catch (error) {
      console.error('Failed to load markets config:', error);
      toast({
        title: "Load Error",
        description: "Failed to load markets configuration. Using fallback data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateConfig = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);

      // Basic structure validation
      if (!parsed.market_formulas) {
        setValidationError("Missing 'market_formulas' root property");
        return false;
      }

      if (!parsed.seasonal_modifiers) {
        setValidationError("Missing 'seasonal_modifiers' root property");
        return false;
      }

      // Validate required sections
      const requiredSections = [
        'streaming_calculation',
        'press_coverage',
        'tour_revenue',
        'release_planning',
        'chart_system'
      ];

      for (const section of requiredSections) {
        if (!parsed.market_formulas[section]) {
          setValidationError(`Missing required section: market_formulas.${section}`);
          return false;
        }
      }

      setValidationError(null);
      return true;
    } catch (error) {
      setValidationError(`JSON Parse Error: ${error.message}`);
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateConfig(configText)) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/dev/markets-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: JSON.parse(configText)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setOriginalConfig(configText);
      setSavedSuccessfully(true);
      toast({
        title: "Save Successful",
        description: "Markets configuration has been updated successfully.",
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Save Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfigText(originalConfig);
    setValidationError(null);
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(configText);
      const formatted = JSON.stringify(parsed, null, 2);
      setConfigText(formatted);
      toast({
        title: "Formatted",
        description: "JSON has been formatted successfully.",
      });
    } catch (error) {
      toast({
        title: "Format Error",
        description: "Invalid JSON - cannot format.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-plum-900 via-plum-800 to-plum-900 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-burgundy-400" />
          <span className="text-lg">Loading markets configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-plum-900 via-plum-800 to-plum-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-plum-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-burgundy-600/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="h-8 w-8 text-burgundy-400" />
                Markets.json Configuration Editor
              </h1>
              <p className="text-gray-300 mt-2">
                Edit game balance and market formulas in real-time
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${hasChanges ? 'bg-yellow-400' : 'bg-green-400'}`} />
                  <span className="text-sm text-gray-400">
                    {hasChanges ? 'Unsaved changes' : 'No changes'}
                  </span>
                </div>
                {savedSuccessfully && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Saved successfully</span>
                  </div>
                )}
              </div>
            </div>
            <Link href="/">
              <button className="px-4 py-2 bg-burgundy-600 hover:bg-burgundy-700 rounded-lg transition-colors">
                Back to Game
              </button>
            </Link>
          </div>
        </div>

        {/* Main Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 bg-plum-800/30 backdrop-blur-sm rounded-xl p-6 border border-burgundy-600/30">
            <h2 className="text-xl font-bold mb-4">Editor Controls</h2>

            <div className="space-y-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !!validationError}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>

              <Button
                onClick={handleReset}
                disabled={!hasChanges}
                variant="outline"
                className="w-full border-burgundy-600/50 hover:bg-burgundy-600/20"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Changes
              </Button>

              <Button
                onClick={formatJSON}
                variant="outline"
                className="w-full border-plum-600/50 hover:bg-plum-600/20"
              >
                <FileCode className="h-4 w-4 mr-2" />
                Format JSON
              </Button>

              <Button
                onClick={loadMarketsConfig}
                variant="outline"
                className="w-full border-gray-600/50 hover:bg-gray-600/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload from File
              </Button>
            </div>

            {/* Validation Status */}
            <div className="mt-6 pt-4 border-t border-burgundy-600/30">
              <h3 className="text-sm font-semibold mb-3 text-burgundy-300">Validation Status</h3>
              {validationError ? (
                <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-600/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-400">Invalid JSON</div>
                    <div className="text-xs text-red-300 mt-1">{validationError}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-600/30 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <div className="text-sm text-green-400">Valid Configuration</div>
                </div>
              )}
            </div>

            {/* Quick Reference */}
            <div className="mt-6 pt-4 border-t border-burgundy-600/30">
              <h3 className="text-sm font-semibold mb-3 text-burgundy-300">Quick Reference</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div><strong>Streaming:</strong> quality_weight, playlist_weight</div>
                <div><strong>Marketing:</strong> marketing_channels effectiveness</div>
                <div><strong>Tours:</strong> sell_through_base, reputation_modifier</div>
                <div><strong>Seasonal:</strong> q1-q4 multipliers</div>
                <div><strong>Charts:</strong> competitor_variance_range</div>
              </div>
            </div>
          </div>

          {/* JSON Editor */}
          <div className="lg:col-span-3 bg-plum-800/30 backdrop-blur-sm rounded-xl p-6 border border-burgundy-600/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">markets.json Content</h2>
              <div className="text-sm text-gray-400">
                Lines: {configText.split('\n').length} | Characters: {configText.length}
              </div>
            </div>

            <div className="relative">
              <Textarea
                value={configText}
                onChange={(e) => {
                  setConfigText(e.target.value);
                  validateConfig(e.target.value);
                }}
                className="min-h-[600px] font-mono text-sm bg-black/20 border-burgundy-600/50 text-white resize-none"
                placeholder="Loading configuration..."
                style={{
                  fontSize: '14px',
                  lineHeight: '1.5',
                  tabSize: 2,
                  fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace'
                }}
              />

              {/* Line numbers overlay would go here in a more advanced implementation */}
            </div>

            {/* File Info */}
            <div className="mt-4 p-3 bg-plum-900/30 rounded-lg">
              <div className="text-xs text-gray-400">
                <div className="mb-1"><strong>File:</strong> /data/balance/markets.json</div>
                <div><strong>Purpose:</strong> Game balance configuration for streaming, marketing, tours, and chart calculations</div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-400">Developer Tool Warning</div>
              <div className="text-sm text-yellow-300 mt-1">
                This editor directly modifies game balance. Changes affect all aspects of gameplay including streaming revenue,
                marketing effectiveness, tour profitability, and chart performance. Test changes carefully and backup important configurations.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}