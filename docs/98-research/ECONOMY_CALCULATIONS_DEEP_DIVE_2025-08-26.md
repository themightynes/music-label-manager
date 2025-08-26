# Music Label Manager - Economy Calculations Deep Dive

## Core Economic Systems

### 1. Revenue Generation Systems

#### **Streaming Revenue** (Primary Income Source)
```javascript
// Initial Release Streams Calculation
baseStreams = quality * quality_weight (0.35) 
            + playlist_access * playlist_weight (0.25)
            + reputation * reputation_weight (0.20)
            + marketing * marketing_weight (0.20)
            
firstWeekStreams = baseStreams * first_week_multiplier (2.5) * rng_variance

// Revenue Conversion
revenue = streams * revenue_per_stream ($0.05)
```

#### **Ongoing Revenue Decay** (Monthly Passive Income)
```javascript
// Monthly decay formula for released songs
monthsSinceRelease = currentMonth - releaseMonth
decayedStreams = initialStreams * (decay_rate ^ monthsSinceRelease)
// decay_rate = 0.85 (15% monthly decline)

// Modifiers
reputationBonus = reputation * 0.002
accessTierBonus = accessTier * 0.1
ongoingFactor = 0.8

monthlyRevenue = decayedStreams * revenue_per_stream * (1 + bonuses)
// Minimum threshold: $1 (below this, revenue stops)
```

#### **Tour Revenue**
```javascript
// Tour revenue calculation
venueCapacity = getVenueCapacity(tier) // Ranges: clubs(50-500), theaters(500-2000), arenas(2000-20000)
sellThrough = sell_through_base (0.60) 
            + (reputation * reputation_modifier)
            * (1 + artistPopularity/100 * local_popularity_weight)
            
ticketPrice = ticket_price_base ($25) + (venueCapacity * 0.05)
ticketRevenue = venueCapacity * sellThrough * ticketPrice
merchRevenue = ticketRevenue * merch_percentage (0.15)

totalTourRevenue = (ticketRevenue + merchRevenue) * cities
```

### 2. Cost Structures

#### **Project Costs**
```javascript
// Base project costs (from balance/economy.json)
single: $3,000 - $12,000 (1 song)
ep: $15,000 - $35,000 (5 songs default)
mini_tour: $5,000 - $15,000

// Enhanced project cost calculation
baseCost = project_costs[projectType].min
producerMultiplier = producer_tier_system[tier].multiplier // local(1.0), regional(1.8), national(3.2), legendary(5.5)
timeMultiplier = time_investment_system[time].multiplier // rushed(0.7), standard(1.0), extended(1.4), perfectionist(2.1)

totalCost = baseCost * producerMultiplier * timeMultiplier * qualityModifier

// Per-song cost system for multi-song projects
perSongCost = baseCost / songCount
economyOfScale = getScaleMultiplier(songCount) // 1-2 songs(1.0), 2-4(0.9), 4-7(0.85), 7+(0.8)
finalCost = perSongCost * songCount * economyOfScale
```

#### **Monthly Operating Costs**
```javascript
// Base monthly burn
monthlyBurn = random(monthly_burn_base) // $3,000 - $6,000

// Artist salaries (per artist)
artistMonthlyCost = artist.monthlyFee // Default: $1,200
loyaltyDiscount = loyalty > 80 ? 0.8 : 1.0
stressPremium = stress > 70 ? 1.2 : 1.0
finalArtistCost = artistMonthlyCost * loyaltyDiscount * stressPremium

totalMonthlyExpenses = monthlyBurn + sum(allArtistCosts)
```

#### **Marketing Costs**
```javascript
// Marketing channel costs (from balance/economy.json)
pr_push: $2,000 - $6,000
digital_ads: $1,000 - $8,000  
radio_push: $2,500 - $10,000

// Seasonal cost multipliers
Q1: 0.85x (cheaper)
Q2: 0.95x
Q3: 1.1x
Q4: 1.4x (most expensive - holiday season)

// Channel synergy bonuses
radio + digital: +15% effectiveness
pr + influencer: +12% effectiveness
full spectrum (all channels): +10% effectiveness
```

### 3. Quality & Budget System

#### **Budget Impact on Quality**
```javascript
// Budget efficiency breakpoints (per song)
minimum_viable: 0.6x base cost (quality penalty)
optimal_efficiency: 1.0x base cost (baseline)
luxury_threshold: 2.0x base cost (good bonus)
diminishing_threshold: 3.0x base cost (max bonus starts)

// Quality bonus calculation
budgetRatio = budgetPerSong / minPerSongCost
if (budgetRatio < 0.6) budgetBonus = -5
else if (budgetRatio <= 1.0) budgetBonus = linear(0 to 10)
else if (budgetRatio <= 2.0) budgetBonus = linear(10 to 20)
else budgetBonus = 20 + diminishing_returns(up to max 25)

// Max budget bonus: 25 quality points
```

#### **Producer & Time Investment Bonuses**
```javascript
// Producer tier quality bonuses
local: +0 quality
regional: +5 quality
national: +12 quality
legendary: +20 quality

// Time investment quality bonuses
rushed: -10 quality
standard: +0 quality
extended: +8 quality
perfectionist: +15 quality

// Final quality calculation
finalQuality = baseQuality + budgetBonus + producerBonus + timeBonus + artistMoodModifier
// Clamped between 20-100
```

### 4. Economic Progression & Balance

#### **Starting Conditions**
- Starting money: $500,000
- Monthly burn: $3,000 - $6,000
- Bankruptcy threshold: -$10,000

#### **Revenue Scaling by Access Tiers**
```javascript
// Playlist access multipliers (affects streaming)
none: 0.3x
emerging: 0.7x
mainstream: 1.0x
premium: 1.5x

// Press access (affects marketing effectiveness)
none: 0% base chance
local: 15% base chance
national: 30% base chance
global: 45% base chance

// Venue access (affects tour capacity/revenue)
none: 0-50 capacity
clubs: 50-500 capacity
theaters: 500-2000 capacity
arenas: 2000-20000 capacity
```

#### **Economic Feedback Loops**

**Positive Spiral:**
Quality → Streams → Revenue → Budget → Better Production → Higher Quality

**Negative Spiral Protection:**
- Minimum revenue threshold ($1) prevents endless decay
- Bankruptcy threshold (-$10,000) allows recovery
- Monthly burn caps prevent instant failure

**Balancing Mechanisms:**
- Diminishing returns on budget (caps at 25 quality bonus)
- Decay rate (0.85) ensures old releases fade
- RNG variance (0.9-1.1x) adds unpredictability
- Seasonal modifiers create strategic timing decisions

### 5. Key Economic Formulas

#### **ROI Calculation**
```javascript
projectROI = (totalRevenue - totalCost) / totalCost * 100
// Break-even: ROI = 0%
// Success threshold: ROI > 50%
```

#### **Stream-to-Revenue Conversion**
```javascript
// Fixed rate across all calculations
$0.05 per stream
// 20,000 streams = $1,000 revenue
// 100,000 streams = $5,000 revenue
// 1,000,000 streams = $50,000 revenue
```

#### **Marketing Effectiveness**
```javascript
marketingROI = additionalStreams * revenue_per_stream / marketingSpend
// Target: >1.5x return on marketing investment

// Press pickup calculation
pressChance = base_chance + (pr_spend * 0.001) + (reputation * 0.008)
maxPickups = min(8, calculated_pickups)
```

### 6. Critical Economic Thresholds

**Survival Metrics:**
- Minimum monthly revenue needed: ~$5,000 (covers monthly burn + 1 artist)
- Break-even single: ~60 quality with mainstream playlist access
- Break-even EP: ~70 quality with good marketing
- Profitable tour: Theaters tier with 70+ artist popularity

**Growth Targets:**
- Month 1-3: Survive, build reputation (target: 10+ rep)
- Month 4-6: Achieve profitability (target: positive monthly cash flow)
- Month 7-9: Scale operations (target: 2-3 profitable artists)
- Month 10-12: Maximize revenue (target: $100k+ monthly revenue)

### 7. Economic Strategy Tips

**Early Game (Months 1-4):**
- Focus on singles (lower cost, faster turnaround)
- Use local producers (1.0x cost multiplier)
- Standard time investment (balanced cost/quality)
- Minimal marketing until playlist access improves

**Mid Game (Months 5-8):**
- Transition to EPs (better economies of scale)
- Upgrade to regional producers (+5 quality)
- Invest in marketing when you have mainstream access
- Start touring when venues unlock

**Late Game (Months 9-12):**
- Maximize quality with national/legendary producers
- Extended time investment for quality bonus
- Full marketing campaigns with channel synergies
- Arena tours for maximum revenue

### Economic System Architecture

The economy runs through the unified GameEngine (`shared/engine/game-engine.ts`) with:
- Deterministic calculations using seeded RNG
- Balance configuration from modular JSON files (`data/balance/`)
- Real-time revenue tracking per song/project
- Transparent financial reporting in month summaries

All calculations are server-authoritative to prevent manipulation and ensure consistency across game sessions.