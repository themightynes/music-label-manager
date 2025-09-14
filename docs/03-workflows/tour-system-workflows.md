# Tour System Workflows

**Comprehensive guide to tour creation, execution, and analytics workflows**

*Audience: Developers, Product Managers*
*Purpose: Understanding tour system processes and user journeys*

---

## 🎯 **Overview**

The Tour System enables players to book live performances for their artists, from intimate club shows to arena tours. This document maps the complete workflow from tour planning through post-tour analytics.

## 📋 **Tour System Components**

### **Frontend Components**
- `LivePerformanceModal.tsx` (862 lines) - Tour creation interface
- `ActiveTours.tsx` (878 lines) - Tour management and analytics
- `useGameStore` - State management for tours

### **Backend Systems**
- `/api/tour/estimate` - Real-time tour profitability calculations
- `FinancialSystem.ts` - Tour revenue/cost calculations
- `VenueCapacityManager` - Capacity validation and risk assessment

### **Configuration Data**
- `data/balance/markets.json` - Tour revenue formulas
- `data/balance/progression.json` - Venue access tier system

---

## 🎪 **User Journey: Creating a Tour**

### **Phase 1: Tour Planning (LivePerformanceModal)**

```
User clicks "Live Performance" button
    ↓
Modal opens with venue access display
    ↓
User selects performance type:
    • Single Show (1 night, 1 city)
    • Mini Tour (1-2 months, 3-8 cities)
    ↓
User selects available artist
    ↓
User enters tour title (auto-generated)
    ↓
User sets marketing budget per city
    ↓
[Mini Tour only] User sets number of cities
    ↓
User adjusts venue capacity with slider
    ↓
Real-time estimation updates every 500ms
    ↓
User reviews comprehensive breakdown
    ↓
User clicks "Book Performance"
```

### **Phase 2: Real-time Estimation (API Integration)**

```
Frontend sends estimation request
    ↓
POST /api/tour/estimate
    • artistId, cities, budgetPerCity, venueCapacity
    ↓
Server validates inputs and game state
    ↓
VenueCapacityManager validates capacity
    ↓
FinancialSystem calculates detailed breakdown
    ↓
Response includes:
    • Revenue/cost/profit projections
    • City-by-city analysis
    • Sell-through rate analysis
    • Risk assessment
    • Strategic guidance
```

### **Phase 3: Tour Creation (State Management)**

```
User confirms tour creation
    ↓
useGameStore.createProject() called
    ↓
POST /api/game/{gameId}/projects
    • Project type: "Mini-Tour"
    • Stage: "planning"
    • Metadata: cities, venue access, capacity
    ↓
Server deducts total cost from game money
    ↓
Tour appears in Active Tours list
```

---

## ⚙️ **System Workflow: Tour Processing**

### **Tour Lifecycle States**

1. **Planning** - Tour is booked but not yet started
2. **Production** - Tour is in progress, cities being completed
3. **Recorded/Complete** - All cities completed successfully
4. **Cancelled** - Tour terminated early (60% refund)

### **Month Advancement Processing**

```
User advances month with tour in "planning" stage
    ↓
GameEngine processes tour project
    ↓
Tour moves to "production" stage
    ↓
City performance is calculated:
    • Venue capacity determined by access tier
    • Sell-through rate calculated:
        - Base rate (15%)
        - Reputation bonus (5% per point)
        - Artist popularity bonus
        - Marketing quality bonus
    • Ticket revenue = capacity × sell-through × ticket_price
    • Merch revenue = ticket_revenue × 15%
    • Costs = venue_fee + production_fee + marketing_budget
    • Net profit = total_revenue - total_costs
    ↓
City results stored in project.metadata.tourStats
    ↓
If all cities complete: tour moves to "recorded" stage
    ↓
Frontend displays updated tour progress
```

### **Tour Cancellation Workflow**

```
User clicks "Cancel" on active tour
    ↓
Cancellation modal shows breakdown:
    • Original cost
    • Cities completed vs planned
    • Sunk costs (non-refundable)
    • Refund amount (60% of remaining cities)
    ↓
User confirms cancellation
    ↓
useGameStore.cancelProject() called
    ↓
DELETE /api/projects/{projectId}/cancel
    ↓
Server calculates refund and updates game money
    ↓
Tour removed from active list
    ↓
Money returned to player account
```

---

## 💰 **Financial Calculation Workflow**

### **Revenue Calculation**
```
Base Formula: venue_capacity × sell_through_rate × ticket_price

Ticket Price Calculation:
    base_price (25) + (capacity × 0.03)

Sell-Through Rate Calculation:
    base_rate (0.15)
    + reputation_bonus (reputation × 0.05)
    + popularity_bonus (artist.popularity × weight)
    + marketing_bonus (budget_quality × factor)

Merchandise Revenue:
    ticket_revenue × 0.15
```

### **Cost Calculation**
```
Venue Fees:
    capacity × venue_tier_multiplier

Production Fees:
    base_production_cost + capacity_scaling

Marketing Costs:
    user_defined_budget_per_city

Total Costs Per City:
    venue_fee + production_fee + marketing_cost

Total Tour Cost:
    (costs_per_city × cities) + overhead
```

---

## 📊 **Analytics & Reporting Workflow**

### **Active Tours Display**
```
Tour shows in "Active Tours" tab
    ↓
Progress bar indicates completion percentage
    ↓
Tour budget and current stage displayed
    ↓
[Production stage] Completed cities shown:
    • City number and venue name
    • Attendance and revenue
    • Real-time profit tracking
```

### **Completed Tours Display**
```
Tour moves to "Completed Tours" tab
    ↓
CompletedToursTable renders sortable data:
    • City-by-city performance table
    • Venue names and capacities
    • Attendance rates and revenue
    • Cost breakdowns and profit
    • ROI calculations
    ↓
Expandable city details show:
    • Sell-through analysis breakdown
    • Revenue analysis (tickets + merch)
    • Cost analysis (venue + production + marketing)
    • Net profitability per city
```

### **Tour Performance Metrics**
```
For each completed city:
    • Expected attendance vs actual
    • Revenue breakdown (tickets vs merch)
    • Cost efficiency analysis
    • ROI per city and total tour

Aggregate tour analytics:
    • Total revenue across all cities
    • Average attendance rate
    • Most/least profitable cities
    • Marketing effectiveness analysis
```

---

## 🎯 **Strategic Decision Points**

### **Venue Capacity Selection**
- **Low Risk**: Smaller venues with higher sell-through rates
- **Medium Risk**: Moderate venues balancing capacity and fill rate
- **High Risk**: Large venues with potential for big profits or losses

### **Marketing Budget Allocation**
- **Minimal Budget**: Lower costs but reduced sell-through rates
- **Moderate Budget**: Balanced approach with decent marketing impact
- **Heavy Budget**: Maximum marketing impact but higher risk

### **Tour Length Decisions**
- **Single Shows**: Lower risk, immediate results, limited upside
- **Mini Tours**: Higher investment, economies of scale, greater profit potential

---

## 🔧 **Technical Implementation Notes**

### **Performance Optimizations**
- 500ms debounced API calls for estimation
- Client-side state caching for tour data
- Efficient table rendering for large tour datasets

### **Error Handling**
- Graceful degradation for missing tour data
- Fallback calculations for incomplete city information
- Validation at API boundary for all inputs

### **Data Consistency**
- Server-side calculations ensure consistent results
- Transaction safety for tour creation and cancellation
- Real-time state synchronization between client and server

---

## 🎵 **Integration with Game Systems**

### **Artist Relationship Impact**
- Successful tours improve artist mood and loyalty
- Failed tours (low attendance) negatively impact relationships
- Tour frequency affects artist availability and satisfaction

### **Reputation System Integration**
- Tour success/failure affects label reputation
- Reputation influences future tour sell-through rates
- Regional reputation affects tour performance in different markets

### **Venue Access Progression**
- Better venue access unlocks larger capacity venues
- Access tiers determine available capacity ranges:
  - None: 0-50 capacity
  - Clubs: 50-500 capacity
  - Theaters: 500-2000 capacity
  - Arenas: 2000-10000 capacity

---

This document provides the complete workflow understanding needed for developers and product managers to work with the tour system effectively.