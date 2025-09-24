import React, { useState } from 'react';
import { BarChart3, TrendingUp, RotateCw, ChevronDown, ChevronUp, Music } from 'lucide-react';
import { Link } from 'wouter';

interface Song {
  id: string;
  title: string;
  weeklyStreams: number;
}

interface TestScenario {
  id: string;
  currentPopularity: number;
  songs: Song[];
  hotSongsCount: number;
  baseBonus: number;
  popularityMultiplier: number;
  finalBonus: number;
  newPopularity: number;
  description: string;
}

interface TestConfig {
  currentPopularity: number;
  songCount: number;
  minStreams: number;
  maxStreams: number;
  hotThreshold: number;
  baseThreshold: number;
  dynamicThreshold: boolean;
  saturationPoint: number;
}

export default function PopularityTester() {
  const [config, setConfig] = useState<TestConfig>({
    currentPopularity: 50,
    songCount: 5,
    minStreams: 5000,
    maxStreams: 2000000,
    hotThreshold: 10000,
    baseThreshold: 3000,
    dynamicThreshold: true,
    saturationPoint: 35
  });

  const [results, setResults] = useState<TestScenario[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);

  // Initialize songs when config changes
  React.useEffect(() => {
    const newSongs: Song[] = [];
    for (let i = 0; i < config.songCount; i++) {
      const streams = Math.floor(
        Math.random() * (config.maxStreams - config.minStreams) + config.minStreams
      );
      newSongs.push({
        id: `song_${i}`,
        title: `Song ${i + 1}`,
        weeklyStreams: streams
      });
    }
    setSongs(newSongs);
  }, [config.songCount, config.minStreams, config.maxStreams]);

  // Enhanced popularity multiplier with configurable saturation point
  const calculatePopularityMultiplier = (currentPopularity: number, saturationPoint: number): number => {
    // More extreme diminishing returns: scales from 1.5x at 0 popularity to 0.2x at high popularity
    const baseMultiplier = 1 / (1 + Math.pow(currentPopularity / saturationPoint, 4));
    return 0.2 + (baseMultiplier * 1.3); // Scales from 1.5 (0.2 + 1.3) to 0.2 (0.2 + 0)
  };

  // Calculate dynamic threshold based on popularity (if enabled)
  const calculateThreshold = (currentPopularity: number, baseThreshold: number, useDynamic: boolean): number => {
    if (!useDynamic) return baseThreshold;

    // EXTREME dynamic threshold: exponential scaling
    // At 0 popularity: baseThreshold
    // At 30 popularity: baseThreshold * 2
    // At 50 popularity: baseThreshold * 4
    // At 70 popularity: baseThreshold * 8
    // At 90 popularity: baseThreshold * 16
    const dynamicMultiplier = Math.pow(2, currentPopularity / 25);
    return Math.round(baseThreshold * dynamicMultiplier);
  };

  // Calculate stream-based popularity bonus - simplified
  const calculateStreamBasedPopularity = (
    songs: Song[],
    currentPopularity: number,
    baseThreshold: number,
    useDynamicThreshold: boolean,
    saturationPoint: number
  ): { baseBonus: number; multiplier: number; finalBonus: number; breakdown: string[]; actualThreshold: number } => {
    // Calculate the actual threshold to use
    const actualThreshold = calculateThreshold(currentPopularity, baseThreshold, useDynamicThreshold);

    // Convert streams to popularity points using logarithmic scaling
    let baseBonus = 0;
    const breakdown: string[] = [];

    songs.forEach((song, index) => {
      if (song.weeklyStreams >= actualThreshold) {
        // Logarithmic scaling: log10(streams/threshold) gives:
        // threshold streams = 0 points, threshold*10 = 1 point, threshold*100 = 2 points
        const streamPoints = Math.log10(song.weeklyStreams / actualThreshold);
        baseBonus += streamPoints;
        breakdown.push(`${song.title}: ${song.weeklyStreams.toLocaleString()} streams = +${streamPoints.toFixed(2)} points`);
      } else {
        breakdown.push(`${song.title}: ${song.weeklyStreams.toLocaleString()} streams = +0 points (below ${actualThreshold.toLocaleString()} threshold)`);
      }
    });

    // Cap total bonus at reasonable level
    baseBonus = Math.min(baseBonus, 10);

    // Apply simple diminishing returns multiplier
    const multiplier = calculatePopularityMultiplier(currentPopularity, saturationPoint);
    const finalBonus = Math.max(0.1, baseBonus * multiplier);

    return { baseBonus, multiplier, finalBonus, breakdown, actualThreshold };
  };

  const runSimulation = () => {
    setIsRunning(true);

    setTimeout(() => {
      const { baseBonus, multiplier, finalBonus, breakdown, actualThreshold } = calculateStreamBasedPopularity(
        songs,
        config.currentPopularity,
        config.baseThreshold,
        config.dynamicThreshold,
        config.saturationPoint
      );

      const newPopularity = Math.min(100, config.currentPopularity + finalBonus);
      const totalStreams = songs.reduce((sum, song) => sum + song.weeklyStreams, 0);
      const hotSongs = songs.filter(song => song.weeklyStreams >= config.hotThreshold);

      let description = `${totalStreams.toLocaleString()} total weekly streams`;
      if (config.currentPopularity > 70) {
        description += ' [diminished at high popularity]';
      }

      const scenario: TestScenario = {
        id: `test_${Date.now()}`,
        currentPopularity: config.currentPopularity,
        songs: [...songs],
        hotSongsCount: hotSongs.length,
        baseBonus,
        popularityMultiplier: multiplier,
        finalBonus,
        newPopularity,
        description
      };

      setResults(prev => [scenario, ...prev].slice(0, 10));
      setIsRunning(false);
    }, 500);
  };

  const updateSongStreams = (songId: string, streams: number) => {
    setSongs(prev => prev.map(song =>
      song.id === songId ? { ...song, weeklyStreams: streams } : song
    ));
  };

  const randomizeSongStreams = () => {
    const newSongs = songs.map(song => ({
      ...song,
      weeklyStreams: Math.floor(
        Math.random() * (config.maxStreams - config.minStreams) + config.minStreams
      )
    }));
    setSongs(newSongs);
  };

  const getPopularityColor = (popularity: number) => {
    if (popularity >= 80) return 'text-purple-400';
    if (popularity >= 60) return 'text-blue-400';
    if (popularity >= 40) return 'text-green-400';
    if (popularity >= 20) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStreamsColor = (streams: number, threshold: number) => {
    if (streams >= threshold) return 'text-green-400 font-bold'; // Hot song
    if (streams >= threshold * 0.8) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-plum-900 via-plum-800 to-plum-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-plum-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-burgundy-600/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-burgundy-400" />
                Popularity Testing Lab
              </h1>
              <p className="text-gray-300 mt-2">
                Test streaming-based popularity bonuses with diminishing returns
              </p>
              <div className="mt-4 p-3 bg-plum-900/30 rounded-lg border border-burgundy-600/20">
                <div className="text-xs text-gray-400 mb-1">OPTIMIZED FORMULA (from testing):</div>
                <div className="text-xs text-burgundy-300 font-mono">
                  Saturation: 35 | Base Threshold: 3,000 | Dynamic: ON<br/>
                  Multiplier: 0.2 + (1.3 × [1 / (1 + (popularity / 35)⁴)])<br/>
                  Points: log₁₀(streams/dynamic_threshold) | Final: Points × Multiplier
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  <div className="font-semibold mb-1">💡 IMPLEMENTATION PLAN:</div>

                  <div className="mb-2">
                    <strong>Primary Integration: Streaming → Popularity</strong><br/>
                    Location: processReleasedProjects (game-engine.ts:825-893)<br/>
                    Add around line 858 where weeklyStreams is calculated:
                  </div>

                  <div className="bg-black/20 p-2 rounded text-xs font-mono mb-2">
                    // Apply streaming-based popularity bonus using optimized formula<br/>
                    if (song.artistId) {'{'}{'<br/>'}
                    {'  '}const artist = await this.storage?.getArtist?.(song.artistId);<br/>
                    {'  '}if (artist) {'{'}{'<br/>'}
                    {'    '}const popularityBonus = this.calculateStreamingPopularityBonus(<br/>
                    {'      '}weeklyStreams, artist.popularity, 3000, true, 35<br/>
                    {'    '});<br/>
                    {'    '}summary.artistChanges[`${'${song.artistId}'}_popularity`] = <br/>
                    {'      '}(summary.artistChanges[`${'${song.artistId}'}_popularity`] || 0) + popularityBonus;<br/>
                    {'  }'}{'<br/>'}
                    {'}'}
                  </div>

                  <div className="mb-2">
                    <strong>Secondary Enhancement: Popularity Effects</strong><br/>
                    Enhance existing popularity usage in:
                  </div>

                  <div className="text-xs">
                    • Song quality (lines 1894-1896): Increase impact from ±5% to ±15%<br/>
                    • Chart success (line 4173): Add popularity bonus to chart potential<br/>
                    • Tour performance (line 2798): Make popularity affect attendance rates
                  </div>

                  <div className="mt-2">
                    <strong>Weekly Processing Integration</strong><br/>
                    processWeeklyPopularityChanges (lines 2446-2485) will automatically handle streaming-based changes via existing summary.artistChanges pattern
                  </div>
                </div>
              </div>
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

            {/* Artist Settings */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-burgundy-300">Artist Settings</h3>

              <div>
                <label className="text-sm text-gray-300">
                  Current Popularity: {config.currentPopularity}
                  <span className={`ml-2 ${getPopularityColor(config.currentPopularity)}`}>
                    (Multiplier: {calculatePopularityMultiplier(config.currentPopularity, config.saturationPoint).toFixed(3)}x)
                  </span>
                </label>
                <input
                  type="range"
                  min="0" max="100" step="5"
                  value={config.currentPopularity}
                  onChange={(e) => setConfig({...config, currentPopularity: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300">
                  Saturation Point: {config.saturationPoint}
                  <span className="text-burgundy-400 ml-2">
                    (where multiplier = 0.85x)
                  </span>
                </label>
                <input
                  type="range"
                  min="30" max="100" step="5"
                  value={config.saturationPoint}
                  onChange={(e) => setConfig({...config, saturationPoint: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300">Number of Songs: {config.songCount}</label>
                <input
                  type="range"
                  min="1" max="10" step="1"
                  value={config.songCount}
                  onChange={(e) => setConfig({...config, songCount: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>
            </div>

            {/* Stream Settings */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-burgundy-300">Stream Settings</h3>

              <div>
                <label className="text-sm text-gray-300">
                  Hot Song Threshold: {config.hotThreshold.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="5000" max="50000" step="5000"
                  value={config.hotThreshold}
                  onChange={(e) => setConfig({...config, hotThreshold: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300">
                  Base Popularity Threshold: {config.baseThreshold.toLocaleString()}
                  {config.dynamicThreshold && (
                    <span className="text-burgundy-400 ml-2">
                      (Actual: {calculateThreshold(config.currentPopularity, config.baseThreshold, config.dynamicThreshold).toLocaleString()})
                    </span>
                  )}
                </label>
                <input
                  type="range"
                  min="1000" max="100000" step="1000"
                  value={config.baseThreshold}
                  onChange={(e) => setConfig({...config, baseThreshold: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dynamicThreshold"
                  checked={config.dynamicThreshold}
                  onChange={(e) => setConfig({...config, dynamicThreshold: e.target.checked})}
                  className="accent-burgundy-500"
                />
                <label htmlFor="dynamicThreshold" className="text-sm text-gray-300">
                  Dynamic Threshold (scales with popularity)
                </label>
              </div>

              <div>
                <label className="text-sm text-gray-300">
                  Min Streams: {config.minStreams.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="1000" max="30000" step="1000"
                  value={config.minStreams}
                  onChange={(e) => setConfig({...config, minStreams: parseInt(e.target.value)})}
                  className="w-full accent-burgundy-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300">
                  Max Streams: {config.maxStreams.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="10000" max="2000000" step="50000"
                  value={config.maxStreams}
                  onChange={(e) => setConfig({...config, maxStreams: parseInt(e.target.value)})}
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
                    Running Test...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-5 w-5" />
                    Test Popularity Bonus
                  </>
                )}
              </button>

              <button
                onClick={randomizeSongStreams}
                className="w-full py-2 bg-plum-700/50 hover:bg-plum-700/70 rounded-lg transition-colors text-sm"
              >
                Randomize Song Streams
              </button>

              <button
                onClick={() => setResults([])}
                className="w-full py-2 bg-plum-700/50 hover:bg-plum-700/70 rounded-lg transition-colors text-sm"
              >
                Clear Results
              </button>
            </div>
          </div>

          {/* Current Songs Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-plum-800/30 backdrop-blur-sm rounded-xl p-6 border border-burgundy-600/30">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Music className="h-5 w-5" />
                Current Songs
                <span className="text-sm font-normal text-gray-400">
                  ({songs.filter(s => s.weeklyStreams >= config.hotThreshold).length} hot songs)
                </span>
              </h3>

              <div className="space-y-3">
                {songs.map((song) => (
                  <div key={song.id} className="bg-plum-900/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{song.title}</span>
                      <span className={getStreamsColor(song.weeklyStreams, config.hotThreshold)}>
                        {song.weeklyStreams.toLocaleString()} streams
                        {song.weeklyStreams >= config.hotThreshold && ' 🔥'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={config.minStreams}
                      max={config.maxStreams}
                      step="10000"
                      value={song.weeklyStreams}
                      onChange={(e) => updateSongStreams(song.id, parseInt(e.target.value))}
                      className="w-full accent-burgundy-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Formula Explanation */}
            <div className="bg-plum-800/30 backdrop-blur-sm rounded-xl p-6 border border-burgundy-600/30">
              <h3 className="text-lg font-bold mb-4">Simple Stream-Based Popularity Formula</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div><strong>Stream Points:</strong> log₁₀(streams/threshold) per song</div>
                <div><strong>Base Threshold:</strong> {config.baseThreshold.toLocaleString()} streams</div>
                {config.dynamicThreshold && (
                  <div><strong>Dynamic Scaling:</strong> Threshold × 2^(popularity/25) [EXTREME]</div>
                )}
                <div><strong>Multiplier:</strong> 0.2 + (1.3 × [1 / (1 + (popularity / {config.saturationPoint})⁴)])</div>
                <div><strong>Final Bonus:</strong> Total Points × Multiplier (min 0.1, max 10)</div>
                <div className="mt-3 p-3 bg-plum-900/30 rounded-lg">
                  <div className="text-burgundy-300 font-medium mb-1">Current Preview:</div>
                  {(() => {
                    const { baseBonus, multiplier, finalBonus, actualThreshold } = calculateStreamBasedPopularity(
                      songs,
                      config.currentPopularity,
                      config.baseThreshold,
                      config.dynamicThreshold,
                      config.saturationPoint
                    );
                    const newPop = Math.min(100, config.currentPopularity + finalBonus);
                    return (
                      <>
                        <div>Active Threshold: {actualThreshold.toLocaleString()} streams</div>
                        <div>Total Stream Points: {baseBonus.toFixed(2)}</div>
                        <div>Multiplier: {multiplier.toFixed(3)}x</div>
                        <div>Final Bonus: +{finalBonus.toFixed(1)}</div>
                        <div className="mt-2 pt-2 border-t border-burgundy-600/30">
                          <div className={`text-lg font-bold ${getPopularityColor(newPop)}`}>
                            New Popularity: {newPop.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-400">
                            {config.currentPopularity} → {newPop.toFixed(1)}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="bg-plum-800/30 backdrop-blur-sm rounded-xl p-12 border border-burgundy-600/30 text-center">
              <TrendingUp className="h-16 w-16 mx-auto text-burgundy-400/50 mb-4" />
              <p className="text-gray-400">
                Configure your test parameters and run a simulation to see popularity results
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
                      Popularity Test: {result.currentPopularity} → {result.newPopularity.toFixed(1)}
                      <span className={`ml-2 ${getPopularityColor(result.newPopularity)}`}>
                        (+{result.finalBonus.toFixed(1)})
                      </span>
                    </h3>
                    <div className="text-sm text-gray-400 mt-1">
                      {result.description}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(showDetails === result.id ? null : result.id)}
                    className="text-burgundy-400 hover:text-burgundy-300"
                  >
                    {showDetails === result.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-plum-900/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Total Streams</div>
                    <div className="text-2xl font-bold text-orange-400">
                      {result.songs.reduce((sum, song) => sum + song.weeklyStreams, 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-plum-900/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Stream Points</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {result.baseBonus.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-plum-900/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Multiplier</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {result.popularityMultiplier.toFixed(3)}x
                    </div>
                  </div>
                  <div className="bg-plum-900/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Final Bonus</div>
                    <div className={`text-2xl font-bold ${getPopularityColor(result.newPopularity)}`}>
                      +{result.finalBonus.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Detailed View */}
                {showDetails === result.id && (
                  <div className="mt-4 pt-4 border-t border-burgundy-600/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2 text-burgundy-300">Song Performance</h4>
                        <div className="space-y-1 text-sm">
                          {result.songs.map((song, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{song.title}:</span>
                              <span className={getStreamsColor(song.weeklyStreams, config.hotThreshold)}>
                                {song.weeklyStreams.toLocaleString()}
                                {song.weeklyStreams >= config.hotThreshold && ' 🔥'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-burgundy-300">Calculation Breakdown</h4>
                        <div className="space-y-1 text-sm text-gray-400">
                          <div>Starting Popularity: {result.currentPopularity}</div>
                          <div>Songs Above Threshold: {result.hotSongsCount}</div>
                          <div>Base Bonus: +{result.baseBonus}</div>
                          <div>Diminishing Returns: {result.popularityMultiplier.toFixed(3)}x</div>
                          <div>Final Bonus: +{result.finalBonus.toFixed(1)}</div>
                          <div className="font-bold text-white">New Popularity: {result.newPopularity.toFixed(1)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}