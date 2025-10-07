🎵 SONG QUALITY FORMULAS

  // Base Quality Calculation
  baseQuality = 40 + random(0, 20)
  talentBonus = (artist.talent - 50) * 0.3              // -15 to +15
  workEthicBonus = (artist.workEthic - 50) * 0.2        // -10 to +10
  creativityBonus = (artist.creativity - 50) * 0.25      // -12.5 to +12.5
  moodMultiplier = getMoodMultiplier(artist.mood)        // 0.7x to 1.25x

  songQuality = (baseQuality + talentBonus + workEthicBonus + creativityBonus
                 + producerBonus + timeBonus + budgetBonus) * moodMultiplier

  // Final bounds: 20-100

  💰 REVENUE FORMULAS

  // Streaming Revenue
  moodMultiplier = {
    [0-20]: 0.70,    // Very Low (-30%)
    [21-40]: 0.85,   // Low (-15%)
    [41-60]: 1.00,   // Neutral
    [61-80]: 1.10,   // Good (+10%)
    [81-100]: 1.25   // Excellent (+25%)
  }

  baseStreams = (quality * 0.35) + (playlist * 0.25) + (reputation * 0.20) + (marketing * 0.20)
  finalStreams = baseStreams * moodMultiplier * popularityBonus * massAppealMultiplier

  // Popularity affects streaming
  popularityBonus = 1 + (artist.popularity / 200)        // 1.0x to 1.5x
  massAppealMultiplier = 1 + (artist.massAppeal / 100)   // 1.0x to 2.0x

  streamingRevenue = finalStreams * 0.05  // $0.05 per stream

  🧠 PSYCHOLOGICAL FORMULAS

  // Mood Decay (Monthly)
  monthsSinceAttention = currentMonth - artist.lastAttentionMonth
  baseDecay = min(5, monthsSinceAttention * 2)          // Max -10/month
  workEthicReduction = (artist.workEthic / 100) * 0.5   // Up to 50% reduction
  actualMoodDecay = baseDecay * (1 - workEthicReduction)

  newMood = max(0, artist.mood - actualMoodDecay)

  // Stress Accumulation
  projectStress = activeProjects * 5                     // Per active project
  roiStress = negativeROI ? abs(roi * 0.1) : 0         // From losses
  releaseStress = releasesThisMonth * 10                // Per release
  recordingStress = recordingSessions * 3                // Per session

  totalStress = projectStress + roiStress + releaseStress + recordingStress
  artist.stress = min(100, artist.stress + totalStress)

  // Stress → Mood Impact
  moodReduction = artist.stress * 0.3
  artist.mood = max(0, artist.mood - moodReduction)

  // Creativity Fluctuation
  naturalCycle = sin(currentMonth * 0.3) * 10           // -10 to +10 wave
  stressImpact = -(artist.stress * 0.4)                 // Up to -40
  moodBoost = artist.mood > 70 ? 10 : 0                 // +10 when happy

  artist.creativity = clamp(0, 100,
    baseCreativity + naturalCycle + stressImpact + moodBoost)

  📈 GROWTH FORMULAS

  // Popularity Growth (Monthly)
  streamingImpact = log10(monthlyStreams + 1) * 2       // Logarithmic growth
  massAppealBoost = artist.massAppeal / 50              // 0 to 2x multiplier
  chartBonus = hitSingle ? 5 : 0                        // Bonus for chart success

  popularityGrowth = (streamingImpact * massAppealBoost) + chartBonus
  artist.popularity = min(100, artist.popularity + popularityGrowth)

  // Loyalty Changes
  positiveEvents = successfulReleases + bonusesPaid + creativeControl
  negativeEvents = failedProjects + rejectedRequests + overwork

  loyaltyChange = (positiveEvents * 2) - (negativeEvents * 3)
  artist.loyalty = clamp(0, 100, artist.loyalty + loyaltyChange)

  ⏱️ TIME & EFFICIENCY FORMULAS

  // Project Duration
  baseDuration = getProjectBaseDuration(type)           // e.g., 3 months for EP
  moodEfficiency = 1 / moodMultiplier                   // Good mood = faster
  workEthicBonus = 1 - (artist.workEthic - 50) * 0.005  // ±25% speed

  finalDuration = baseDuration * moodEfficiency * workEthicBonus

  // Recording Session Efficiency
  baseSessionQuality = 50
  talentImpact = artist.talent * 0.3
  creativityImpact = artist.creativity * 0.2
  stressPenalty = artist.stress * 0.2

  sessionQuality = baseSessionQuality + talentImpact + creativityImpact - stressPenalty

  🎯 ARCHETYPE CALCULATION

  // Dynamic Archetype (Recalculated Monthly)
  visionaryScore = (artist.talent * 1.5 + artist.creativity * 1.5) / 2
  workhorseScore = (artist.workEthic * 2 + artist.talent * 0.5) / 2
  trendsetterScore = (artist.massAppeal * 1.5 + artist.creativity) / 2

  artist.archetype = highest(visionaryScore, workhorseScore, trendsetterScore)

  // Archetype affects dialogue options and event probabilities
  dialogueWeight = {
    visionary: { creative: 1.5, commercial: 0.7, experimental: 1.3 },
    workhorse: { reliable: 1.5, quick: 1.2, steady: 1.4 },
    trendsetter: { viral: 1.5, mainstream: 1.3, social: 1.2 }
  }

  💸 COST FORMULAS

  // Monthly Artist Cost
  baseMonthlyCost = artist.monthlyCost                  // $600-2000
  loyaltyDiscount = artist.loyalty > 80 ? 0.8 : 1.0    // 20% discount
  stressPremium = artist.stress > 70 ? 1.2 : 1.0       // 20% premium

  finalMonthlyCost = baseMonthlyCost * loyaltyDiscount * stressPremium

  // Project Cost Adjustments
  artistDemandMultiplier = 1 + (artist.popularity / 100) // Popular = expensive
  moodNegotiation = artist.mood < 40 ? 1.3 : 1.0        // Unhappy = costly

  projectCost = baseCost * artistDemandMultiplier * moodNegotiation

  🎭 PERFORMANCE FORMULAS

  // Tour Performance
  baseAttendance = venueCapacity * 0.6
  popularityBoost = artist.popularity / 100              // 0 to 1x
  moodPerformance = moodMultiplier                       // 0.7x to 1.25x
  massAppealDraw = 1 + (artist.massAppeal / 200)        // 1.0x to 1.5x

  actualAttendance = baseAttendance * popularityBoost * moodPerformance * massAppealDraw

  // Merchandise Sales
  merchRevenue = actualAttendance * 15 * (artist.popularity / 50)

  🔄 FEEDBACK LOOPS

  // Primary Loop: Stress → Mood → Creativity → Quality → ROI → Stress
  // Secondary Loop: Popularity → Revenue → Investment → Growth → Popularity
  // Balancing Loop: Work Ethic → Mood Stability → Consistent Output

  // Death Spiral Prevention
  if (artist.stress > 90 && artist.mood < 20) {
    // Force intervention event
    triggerEvent("artist_breakdown_intervention")
  }

  // Success Spiral Cap
  if (artist.popularity > 95 && monthlyRevenue > 1000000) {
    // Introduce challenges
    triggerEvent("fame_complications")
  }

  📊 COMPOUND EFFECTS

  // Total Artist Value Score (for AI decisions)
  artistValue = (
    (artist.talent * 2) +
    (artist.popularity * 3) +
    (artist.loyalty * 1.5) +
    (artist.workEthic * 1) +
    (100 - artist.stress) +
    (artist.creativity * 1.5) +
    (artist.massAppeal * 2)
  ) / 10

  // Career Trajectory Prediction
  trajectoryScore = (
    popularityGrowthRate * 3 +
    avgProjectQuality * 2 +
    (100 - burnoutRisk) * 1.5
  ) / 6.5

● Update Todos
  ⎿  ☒ Document all formulas affecting artists after implementation        
     ☒ Organize formulas by category (Quality, Revenue, Psychology, Growth)
     ☒ Map formula dependencies and interactions
     ☒ Identify feedback loops and balancing points


● Claude Opus limit reached, now using Sonnet 4

● 🎯 CRITICAL BALANCING THRESHOLDS

  // Danger Zones
  STRESS_WARNING = 70      // UI shows orange warning
  STRESS_CRITICAL = 85     // UI shows red alert, forces events
  MOOD_WARNING = 30        // Performance penalties begin
  MOOD_CRITICAL = 15       // Major performance hit

  // Success Zones
  MOOD_OPTIMAL = 70        // Performance bonuses kick in
  POPULARITY_BREAKTHROUGH = 60  // Unlock higher tier venues/deals
  LOYALTY_DEVOTED = 80     // High relationship quality (display only)

  // Natural Limits
  MAX_POPULARITY_GAIN = 15      // Per month cap
  MAX_STRESS_ACCUMULATION = 25  // Per month cap
  CREATIVITY_CYCLE_AMPLITUDE = 20  // ±20 from natural wave