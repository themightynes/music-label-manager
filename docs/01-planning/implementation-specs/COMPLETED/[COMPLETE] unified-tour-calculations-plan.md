

## Research on Tour Calculations ##


Looking at the code structure, here are the key differences between tour information handling in game-engine.ts vs FinancialSystem.ts:

  🎮 GameEngine.ts - BUSINESS LOGIC & ORCHESTRATION

  Tour State Management:

  // Handles tour progression lifecycle
  case 'Mini-Tour':
    if (stage === 'planning') {
      project.stage = 'production'  // Start tour
    }
    else if (stage === 'production') {
      // Check completion status
      const tourStats = project.metadata?.tourStats
      const citiesCompleted = tourStats?.cities?.length || 0
      const citiesPlanned = project.metadata?.cities || 1

      if (citiesCompleted >= citiesPlanned) {
        project.stage = 'recorded'  // Tour complete
      }
    }

  Tour Data Orchestration:

  // Pre-calculation and city execution logic (lines ~2765+)
  let tourStats = currentMetadata.tourStats || { cities: [] }

  // First city triggers pre-calculation of ALL cities
  if (cityNumber === 1 && !tourStats.preCalculatedCities) {
    const totalRevenue = this.financialSystem.calculateTourRevenue(...)
    const costBreakdown = this.financialSystem.calculateTourCosts(...)

    // Store pre-calculated cities for consistency
    tourStats.preCalculatedCities = preCalculatedCities
  }

  // Execute individual city from pre-calculated data
  const cityData = tourStats.preCalculatedCities[cityNumber - 1]
  tourStats.cities.push(cityData)

  Revenue Integration:

  // Calls FinancialSystem but integrates into game flow
  case 'Mini-Tour':
    revenue = this.calculateTourRevenue(
      project.metadata.venueAccess,
      artistData.popularity,
      this.gameState.reputation,
      project.metadata.cities
    )

  ---
  💰 FinancialSystem.ts - PURE CALCULATIONS

  Revenue Formula Implementation:

  calculateTourRevenue(
    venueTier: string,
    artistPopularity: number,
    localReputation: number,
    cities: number,
    marketingBudgetTotal: number = 0
  ): number {
    // PURE MATHEMATICAL CALCULATION
    const venueCapacity = this.getVenueCapacity(venueTier)

    // SELL-THROUGH FORMULA
    const baseRate = config.sell_through_base
    const reputationBonus = (localReputation / 100) * config.reputation_modifier
    const popularityBonus = (artistPopularity / 100) * config.local_popularity_weight
    const budgetQualityBonus = marketingBudgetPerCity > 0 ?
      (marketingBudgetPerCity / venueCapacity) * 11 / 100 * 0.15 : 0

    const sellThrough = Math.min(1.0, baseRate + reputationBonus + popularityBonus + budgetQualityBonus)        

    // REVENUE CALCULATION
    const ticketPrice = config.ticket_price_base + (venueCapacity * config.ticket_price_per_capacity)
    const ticketRevenue = venueCapacity * sellThrough * ticketPrice
    const merchRevenue = ticketRevenue * config.merch_percentage

    return Math.round((ticketRevenue + merchRevenue) * cities)
  }

  Cost Formula Implementation:

  calculateTourCosts(
    venueTier: string,
    cities: number,
    marketingBudgetTotal: number = 0
  ): {
    totalCosts: number,
    venueFees: number,
    productionFees: number,
    marketingBudget: number,
    breakdown: { venueFeePerCity: number, productionFeePerCity: number, marketingBudgetPerCity: number }        
  } {
    // PURE COST CALCULATION
    const venueCapacity = this.getVenueCapacity(venueTier)
    const venueFeePerCity = venueCapacity * 4        // Infrastructure cost
    const productionFeePerCity = venueCapacity * 2.7 // Production cost
    const totalVenueFees = venueFeePerCity * cities
    const totalProductionFees = productionFeePerCity * cities

    return {
      totalCosts: totalVenueFees + totalProductionFees + marketingBudgetTotal,
      venueFees: totalVenueFees,
      productionFees: totalProductionFees,
      marketingBudget: marketingBudgetTotal,
      breakdown: {
        venueFeePerCity,
        productionFeePerCity,
        marketingBudgetPerCity: marketingBudgetTotal / cities
      }
    }
  }

  ---
  🔍 KEY DIFFERENCES SUMMARY

  | Aspect           | GameEngine.ts                                                                            
                                       | FinancialSystem.ts
                                                                |
  |------------------|---------------------------------------------------------------------------------------------------------------------------------|-------------------
  --------------------------------------------------------------|
  | Purpose          | Tour state management & progression                                                      
                                       | Pure economic
  calculations                                                      |
  | Responsibilities | - Stage transitions (planning→production→recorded)- City execution sequence- Data persistence- Integration with game state      | - Revenue
  formulas- Cost formulas- Economic modeling- Mathematical calculations |
  | Data Handling    | - tourStats.cities[] (completed performances)- tourStats.preCalculatedCities[] (pre-computed)- Stage tracking- City progression | - Input
  parameters- Return calculated values- No state storage                  |
  | Dependencies     | - Database operations- Game state updates- Artist data- Month progression                
                                       | - Configuration
  data (markets.json)- Mathematical formulas- RNG for variance    |
  | Integration      | Calls FinancialSystem methods                                                            
                                       | Provides
  calculations to GameEngine                                             |
  | State Management | Manages project.metadata.tourStats                                                       
                                       | Stateless
  calculation functions                                                 |

  🔄 RELATIONSHIP

  GameEngine.ts is the orchestrator that:
  - Manages when tours start/progress/complete
  - Stores tour performance data in tourStats.cities[]
  - Calls FinancialSystem for calculations
  - Integrates results into game state

  FinancialSystem.ts is the calculator that:
  - Provides pure mathematical formulas
  - Takes inputs, returns calculated values
  - No knowledge of game state or progression
  - Reusable across different contexts

  Flow: GameEngine asks FinancialSystem "what would this tour earn/cost?" → FinancialSystem returns numbers → GameEngine stores results and manages progression.

-----------------------------------------------------------------------------------

🚨 MAJOR REDUNDANCIES IDENTIFIED

  1. Duplicate Revenue Calculation Logic

  FinancialSystem.ts (lines 313-348):
  calculateTourRevenue(venueTier, artistPopularity, localReputation, cities, marketingBudgetTotal) {
    const venueCapacity = this.getVenueCapacity(venueTier);

    // SELL-THROUGH FORMULA
    const baseRate = config.sell_through_base
    const reputationBonus = (localReputation / 100) * config.reputation_modifier
    const popularityBonus = (artistPopularity / 100) * config.local_popularity_weight
    const budgetQualityBonus = marketingBudgetPerCity > 0 ?
      (marketingBudgetPerCity / venueCapacity) * 11 / 100 * 0.15 : 0

    const sellThrough = Math.min(1.0, baseRate + reputationBonus + popularityBonus + budgetQualityBonus)        

    const ticketPrice = config.ticket_price_base + (venueCapacity * config.ticket_price_per_capacity)
    const ticketRevenue = venueCapacity * sellThrough * ticketPrice
    const merchRevenue = ticketRevenue * config.merch_percentage

    return Math.round((ticketRevenue + merchRevenue) * cities)
  }

  GameEngine.ts (lines 2799-2809) - DUPLICATE:
  // Calculate sell-through rate using unified formula (extracted from FinancialSystem)
  const marketingBudgetPerCity = marketingBudget / totalCities;
  const baseRate = 0.15;  // ❌ HARDCODED - should use config
  const reputationBonus = reputation / 100 * 0.05;  // ❌ HARDCODED - should use config
  const popularityBonus = (artistPopularity / 100) * 0.6;  // ❌ HARDCODED - should use config
  const budgetQualityBonus = marketingBudgetPerCity > 0 ? (marketingBudgetPerCity / venueCapacity) * 11 / 100 * 0.15 : 0;
  const sellThroughRate = Math.min(1.0, baseRate + reputationBonus + popularityBonus + budgetQualityBonus);     

  const tourConfig = this.gameData.getTourConfigSync();
  const ticketPrice = tourConfig.ticket_price_base + (venueCapacity * tourConfig.ticket_price_per_capacity);    

  2. Duplicate Cost Calculation Logic

  FinancialSystem.ts (lines 357-380):
  calculateTourCosts(venueTier, cities, marketingBudgetTotal) {
    const venueCapacity = this.getVenueCapacity(venueTier);
    const venueFeePerCity = venueCapacity * 4;
    const productionFeePerCity = venueCapacity * 2.7;
    const totalVenueFees = venueFeePerCity * cities;
    const totalProductionFees = productionFeePerCity * cities;

    return {
      totalCosts: totalVenueFees + totalProductionFees + marketingBudgetTotal,
      venueFees: totalVenueFees,
      productionFees: totalProductionFees,
      marketingBudget: marketingBudgetTotal
    }
  }

  GameEngine.ts (lines 2779-2780, 2823-2825) - DUPLICATE:
  // Extract marketing budget from total cost
  const venueFees = venueCapacity * 4 * totalCities;  // ❌ DUPLICATE FORMULA
  const productionFees = venueCapacity * 2.7 * totalCities;  // ❌ DUPLICATE FORMULA

  // Later in loop:
  const venueFee = venueCapacity * 4;  // ❌ DUPLICATE FORMULA
  const productionFee = Math.round(venueCapacity * 2.7);  // ❌ DUPLICATE FORMULA
  const totalCosts = venueFee + productionFee + marketingBudgetPerCity;

  3. Redundant Method Wrapper

  GameEngine.ts (lines 733-747):
  calculateTourRevenue(venueTier, artistPopularity, localReputation, cities, marketingBudgetTotal = 0): number {
    return this.financialSystem.calculateTourRevenue(
      venueTier, artistPopularity, localReputation, cities, marketingBudgetTotal
    );
  }
  Problem: This is a useless wrapper that just delegates to FinancialSystem but then GameEngine ignores it and reimplements the logic anyway!

  4. Hardcoded Values vs Config

  FinancialSystem.ts - Uses configuration:
  const baseRate = config.sell_through_base  // From markets.json
  const reputationBonus = (localReputation / 100) * config.reputation_modifier
  const popularityBonus = (artistPopularity / 100) * config.local_popularity_weight

  GameEngine.ts - Uses hardcoded values:
  const baseRate = 0.15;  // ❌ Should be config.sell_through_base
  const reputationBonus = reputation / 100 * 0.05;  // ❌ Should be config.reputation_modifier
  const popularityBonus = (artistPopularity / 100) * 0.6;  // ❌ Should be config.local_popularity_weight       

  ---
  🔧 CLEANUP RECOMMENDATIONS

  1. Remove Duplicate Logic from GameEngine

  // REMOVE lines 2799-2809 (duplicate sell-through calculation)
  // REMOVE lines 2779-2780 (duplicate cost calculation)
  // REMOVE lines 2823-2825 (duplicate cost calculation in loop)

  // REPLACE with calls to FinancialSystem methods:
  const costBreakdown = this.financialSystem.calculateTourCosts(venueAccess, totalCities, marketingBudget);     
  const revenueCalculation = this.financialSystem.calculateTourRevenue(venueAccess, artistPopularity, reputation, totalCities, marketingBudget);

  2. Remove Useless Wrapper Method

  // REMOVE this entire method from GameEngine.ts (lines 733-747):
  calculateTourRevenue(...) {
    return this.financialSystem.calculateTourRevenue(...);
  }

  // REPLACE calls with direct FinancialSystem access:
  this.financialSystem.calculateTourRevenue(...)

  3. Fix Inconsistent Configuration Usage

  All tour calculations should use the same configuration source (markets.json) rather than mixing config and hardcoded values.

  ---
  📊 REDUNDANCY IMPACT

  Current State:
  - ❌ Same formulas implemented twice with different values
  - ❌ Hardcoded vs configurable inconsistency
  - ❌ 84 lines of duplicate logic in GameEngine
  - ❌ Maintenance nightmare - changes need to be made in two places
  - ❌ Bug risk - formulas can drift apart

  After Cleanup:
  - ✅ Single source of truth for all tour calculations
  - ✅ Consistent configuration usage
  - ✅ ~50+ lines removed from GameEngine
  - ✅ Easier maintenance and testing
  - ✅ No formula drift risk

  The redundancy is quite substantial and should definitely be cleaned up to maintain code quality and prevent bugs.

-----------------------------------------------------------------------------------

🎯 TOUR CALCULATIONS RESPONSIBILITY CHART

  🔍 ROOT CAUSE ANALYSIS

  Why the redundancy exists: Tour economics are needed in 3 different contexts:

  1. 📱 Frontend Estimation - Users planning tours need cost/revenue previews
  2. ⚙️ Backend Processing - GameEngine needs actual calculations during gameplay
  3. 📊 Display Logic - UI components showing completed tour analytics

  ❌ Current Broken State: Each context implemented its own math → 3-way redundancy

  ✅ The Fix: Single Source of Truth → Everyone calls FinancialSystem

  ---
  📊 RESPONSIBILITY DIVISION CHART

  💰 FinancialSystem.ts - THE CALCULATOR

  Role: Single source of truth for ALL tour mathematics

  KEEPS (Enhanced):
  ✅ calculateTourRevenue() - Master revenue formula
  ✅ calculateTourCosts() - Master cost formula
  ✅ getVenueCapacity() - Venue capacity logic
  ✅ Configuration loading from markets.json
  ✅ All economic constants and formulas

  NEW METHODS TO ADD:
  ✅ calculateTourEstimate() - Frontend-friendly estimation
  ✅ calculateDetailedTourBreakdown() - Full economics with city details
  ✅ validateTourParameters() - Input validation

  Responsibilities:
  - Pure mathematical calculations
  - Configuration management
  - Formula consistency
  - Economic modeling
  - No game state knowledge
  - Stateless operations

  ---
  🎮 GameEngine.ts - THE ORCHESTRATOR

  Role: Game state management and tour progression

  KEEPS (Streamlined):
  ✅ Tour stage progression (planning → production → recorded)
  ✅ City execution sequence management
  ✅ Data persistence (tourStats.cities[])
  ✅ Integration with game state
  ✅ Month advancement logic
  ✅ Tour completion detection

  REMOVES (Delegates to FinancialSystem):
  ❌ calculateTourRevenue() wrapper method (lines 733-747)
  ❌ Duplicate sell-through calculation (lines 2799-2809)
  ❌ Duplicate cost calculation (lines 2779-2780, 2823-2825)
  ❌ Hardcoded economic constants
  ❌ All mathematical formulas

  NEW APPROACH:
  ✅ Call financialSystem.calculateDetailedTourBreakdown()
  ✅ Store results in tourStats without recalculating

  Responsibilities:
  - Tour lifecycle management
  - Database operations
  - Game state updates
  - Tour progression logic
  - City completion tracking
  - NO MATH - asks FinancialSystem for all calculations

  ---
📱 Frontend (LivePerformancePage.tsx) - THE ESTIMATOR

  Role: User tour planning interface

  REMOVES (Delegates to FinancialSystem):
  ❌ calculateEstimatedRevenue() function (lines 194-235)
  ❌ costCalculation logic (lines 237-253)
  ❌ Hardcoded formulas:
     - budgetQualityBonus = (budgetPerCity / venueCapacity) * 11 / 100 * 0.15
     - venueFeePerCity = venueCapacity * 4
     - productionFeePerCity = venueCapacity * 2.7

  NEW APPROACH:
  ✅ Call API endpoint that uses FinancialSystem
  ✅ POST /api/tour/estimate with parameters
  ✅ Display returned calculations

  Responsibilities:
  - User input collection
  - Tour parameter validation
  - API calls for estimates
  - Results display
  - NO MATH - gets all calculations from backend

  ---
  🌐 New API Endpoint - THE BRIDGE

  Role: Connect frontend estimates to backend calculations

  NEW ADDITION:
  // routes.ts
  POST /api/tour/estimate
  {
    artistId, cities, budgetPerCity, venueAccess
  } → {
    estimatedRevenue, totalCosts, breakdown, canAfford
  }

  Implementation:
  ✅ Extract artist data
  ✅ Call financialSystem.calculateTourEstimate()
  ✅ Return formatted results

  Responsibilities:
  - Frontend/backend bridge
  - Parameter extraction
  - FinancialSystem integration
  - Response formatting

  ---
  🔄 DATA FLOW (After Fix)

  1. 📱 Tour Planning Flow

  Frontend Form → API /tour/estimate → FinancialSystem.calculateTourEstimate() → Return JSON → Display

  2. ⚙️ Tour Execution Flow

  GameEngine.advanceMonth() → financialSystem.calculateDetailedTourBreakdown() → Store in tourStats.cities[]

  3. 📊 Tour Display Flow

  ActiveTours.tsx → Read tourStats.cities[] → Display (no calculations)

  ---
  📋 IMPLEMENTATION STEPS

  Phase 1: Enhance FinancialSystem

  1. ✅ Add calculateTourEstimate() for frontend
  2. ✅ Add calculateDetailedTourBreakdown() for GameEngine
  3. ✅ Add input validation methods

  Phase 2: Create API Bridge

  1. ✅ Add POST /api/tour/estimate endpoint
  2. ✅ Connect to FinancialSystem
  3. ✅ Return formatted estimates

  Phase 3: Clean GameEngine

  1. ❌ Remove duplicate calculation logic (84+ lines)
  2. ❌ Remove wrapper methods
  3. ✅ Replace with FinancialSystem calls

  Phase 4: Clean Frontend

1. ❌ Remove calculation logic from LivePerformancePage
  2. ✅ Replace with API calls
  3. ✅ Update UI to display API results

  ---
  ✨ BENEFITS AFTER CLEANUP

  | Metric           | Before                        | After                  |
  |------------------|-------------------------------|------------------------|
  | Code Duplication | 3 copies of same math         | Single source of truth |
  | Lines of Code    | ~300 lines of duplicate logic | ~100 lines total       |
  | Consistency      | Hardcoded vs config conflicts | Always uses config     |
  | Maintainability  | Change in 3 places            | Change in 1 place      |
  | Bug Risk         | Formula drift across files    | Impossible to drift    |
  | Testing          | Test 3 implementations        | Test 1 implementation  |

  ---
  🎯 ANSWER TO YOUR QUESTION

  "Is this data being used by both frontend estimated revenue and cost calculations and backend implementation? Is that why it's redundant?"

  YES EXACTLY! 🎯

  The redundancy exists because tour calculations are needed in multiple contexts:

  1. Frontend needs estimates for user planning
  2. Backend needs calculations for actual gameplay
  3. Both implemented the same math instead of sharing it

  The Fix: Make everyone call FinancialSystem. No more math outside of FinancialSystem.

  Result: Single source of truth, no redundancy, consistent formulas everywhere.