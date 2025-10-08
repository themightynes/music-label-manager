#!/usr/bin/env ts-node

import seedrandom from 'seedrandom';
import contentData from './data/balance/content.json';

// Simulate the game engine's getRandom method
function getRandom(rng: seedrandom.PRNG, min: number, max: number): number {
  return min + (rng() * (max - min));
}

// Test song name generation
function testSongNameGeneration() {
  const songNames = contentData.song_generation.name_pools.default;
  console.log(`\n📊 SONG NAME RANDOMIZATION TEST`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total available song names: ${songNames.length}`);
  console.log(`Testing with 300 generations...\n`);

  // Track name frequency
  const nameFrequency: Record<string, number> = {};
  const generatedNames: string[] = [];
  
  // Test with different seeds to simulate different games/weeks
  const testCases = [
    { seed: 'game1-week1', count: 100 },
    { seed: 'game1-week2', count: 100 },
    { seed: 'game2-week1', count: 100 }
  ];

  console.log(`🎲 Generating songs with different seeds:\n`);
  
  testCases.forEach(({ seed, count }) => {
    const rng = seedrandom(seed);
    console.log(`\nSeed: "${seed}" - Generating ${count} songs:`);
    console.log('-'.repeat(60));
    
    const seedNames: string[] = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(getRandom(rng, 0, songNames.length));
      const selectedName = songNames[randomIndex];
      
      seedNames.push(selectedName);
      generatedNames.push(selectedName);
      nameFrequency[selectedName] = (nameFrequency[selectedName] || 0) + 1;
      
      // Show first 10 for each seed
      if (i < 10) {
        console.log(`  ${i + 1}. "${selectedName}" (index: ${randomIndex})`);
      }
    }
    
    if (count > 10) {
      console.log(`  ... (${count - 10} more songs generated)`);
    }
    
    // Check for immediate repetitions in this seed
    let immediateRepeats = 0;
    for (let i = 1; i < seedNames.length; i++) {
      if (seedNames[i] === seedNames[i - 1]) {
        immediateRepeats++;
      }
    }
    if (immediateRepeats > 0) {
      console.log(`  ⚠️  Immediate repetitions found: ${immediateRepeats}`);
    }
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📈 DISTRIBUTION ANALYSIS (300 total generations):\n`);

  // Sort by frequency
  const sortedNames = Object.entries(nameFrequency)
    .sort((a, b) => b[1] - a[1]);

  // Calculate statistics
  const usedNames = sortedNames.length;
  const unusedNames = songNames.length - usedNames;
  const maxFreq = sortedNames[0]?.[1] || 0;
  const minFreq = sortedNames[sortedNames.length - 1]?.[1] || 0;
  const avgFreq = 300 / songNames.length;
  
  console.log(`📊 Statistics:`);
  console.log(`  • Unique names used: ${usedNames}/${songNames.length} (${((usedNames/songNames.length)*100).toFixed(1)}%)`);
  console.log(`  • Names never selected: ${unusedNames}`);
  console.log(`  • Expected average frequency: ${avgFreq.toFixed(2)}`);
  console.log(`  • Actual frequency range: ${minFreq} - ${maxFreq}`);

  // Show most and least frequent
  console.log(`\n🔝 Top 10 Most Frequent Songs:`);
  sortedNames.slice(0, 10).forEach(([name, count], i) => {
    const percentage = ((count / 300) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count));
    console.log(`  ${i + 1}. "${name}": ${count} times (${percentage}%) ${bar}`);
  });

  console.log(`\n🔻 Bottom 10 Least Frequent (that appeared):`);
  sortedNames.slice(-10).forEach(([name, count], i) => {
    const percentage = ((count / 300) * 100).toFixed(1);
    const bar = '█'.repeat(count);
    console.log(`  ${sortedNames.length - 9 + i}. "${name}": ${count} times (${percentage}%) ${bar}`);
  });

  // Check for never-used names
  const neverUsed = songNames.filter(name => !nameFrequency[name]);
  if (neverUsed.length > 0) {
    console.log(`\n❌ Songs Never Selected (${neverUsed.length} total):`);
    neverUsed.slice(0, 10).forEach(name => {
      console.log(`  • "${name}"`);
    });
    if (neverUsed.length > 10) {
      console.log(`  ... and ${neverUsed.length - 10} more`);
    }
  }

  // Check for patterns
  console.log(`\n🔍 Pattern Analysis:`);
  
  // Check for consecutive duplicates
  let consecutiveDupes = 0;
  for (let i = 1; i < generatedNames.length; i++) {
    if (generatedNames[i] === generatedNames[i - 1]) {
      consecutiveDupes++;
    }
  }
  console.log(`  • Consecutive duplicates: ${consecutiveDupes}`);

  // Check if certain indices are favored
  const indexFrequency: Record<number, number> = {};
  testCases.forEach(({ seed, count }) => {
    const rng = seedrandom(seed);
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(getRandom(rng, 0, songNames.length));
      indexFrequency[randomIndex] = (indexFrequency[randomIndex] || 0) + 1;
    }
  });

  // Calculate standard deviation
  const frequencies = Object.values(nameFrequency);
  const mean = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
  const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / frequencies.length;
  const stdDev = Math.sqrt(variance);
  
  console.log(`  • Standard deviation: ${stdDev.toFixed(2)} (lower is more uniform)`);
  console.log(`  • Coefficient of variation: ${((stdDev / mean) * 100).toFixed(1)}%`);

  // Test deterministic behavior
  console.log(`\n🔒 Deterministic Behavior Test:`);
  const testSeed = 'deterministic-test';
  const rng1 = seedrandom(testSeed);
  const rng2 = seedrandom(testSeed);
  
  const names1: string[] = [];
  const names2: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    names1.push(songNames[Math.floor(getRandom(rng1, 0, songNames.length))]);
    names2.push(songNames[Math.floor(getRandom(rng2, 0, songNames.length))]);
  }
  
  const isDeterministic = names1.every((name, i) => name === names2[i]);
  console.log(`  • Same seed produces same sequence: ${isDeterministic ? '✅ YES' : '❌ NO'}`);
  
  if (!isDeterministic) {
    console.log(`    First sequence:  ${names1.slice(0, 3).join(', ')}`);
    console.log(`    Second sequence: ${names2.slice(0, 3).join(', ')}`);
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 SUMMARY:`);
  
  const issues: string[] = [];
  
  if (maxFreq > avgFreq * 3) {
    issues.push(`Some songs appearing too frequently (max: ${maxFreq} vs expected avg: ${avgFreq.toFixed(1)})`);
  }
  
  if (unusedNames > songNames.length * 0.3) {
    issues.push(`Many songs never selected (${unusedNames}/${songNames.length})`);
  }
  
  if (consecutiveDupes > 5) {
    issues.push(`Too many consecutive duplicates (${consecutiveDupes})`);
  }
  
  if (!isDeterministic) {
    issues.push(`Non-deterministic behavior detected`);
  }
  
  if (issues.length === 0) {
    console.log(`  ✅ Randomization appears to be working correctly!`);
    console.log(`  • Good distribution across available names`);
    console.log(`  • Deterministic behavior maintained`);
    console.log(`  • No concerning patterns detected`);
  } else {
    console.log(`  ⚠️  Potential issues detected:`);
    issues.forEach(issue => console.log(`    • ${issue}`));
  }
  
  console.log(`\n${'='.repeat(80)}\n`);
}

// Run the test
testSongNameGeneration();