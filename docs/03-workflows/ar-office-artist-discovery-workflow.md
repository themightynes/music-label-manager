# A&R Office Artist Discovery Workflow

**Status**: ✅ Complete Implementation (September 28, 2025)
**Component**: A&R Office Artist Scouting System
**Integration**: Focus Slots, Executive Meetings, Week Advancement

## 🎯 **System Overview**

The A&R Office provides a dedicated artist discovery system that replaces the previous "all artists available from start" model with a strategic scouting workflow. Players must allocate Focus Slots to discover new artists through three different sourcing approaches, with the Head of A&R becoming unavailable for meetings during active operations.

## 🔄 **Complete User Workflow**

### **Phase 1: Accessing A&R Office**
1. **Navigation**: Player clicks "A&R Office" from the Game Sidebar
2. **Page Load**: A&R Office page displays with Marcus Rodriguez executive avatar
3. **Status Check**: System displays current Focus Slot availability and any active operations

### **Phase 2: Selecting Sourcing Mode**
Player chooses from three sourcing approaches:

#### **🚀 Active Scouting**
- **Description**: Dedicate focus to actively scout the scene
- **Benefits**: Unlocks higher-quality discoveries and detailed insights
- **Cost**: 1 Focus Slot
- **Duration**: Completes after week advancement

#### **🧭 Passive Browsing**
- **Description**: Browse the standard discovery pool
- **Benefits**: Standard artist discovery with normal quality distribution
- **Cost**: 1 Focus Slot
- **Duration**: Completes after week advancement

#### **🎯 Specialized Search**
- **Description**: Target specific genres, venues, or platforms
- **Benefits**: Find niche talent with specialized characteristics
- **Cost**: 1 Focus Slot
- **Duration**: Completes after week advancement

### **Phase 3: Operation Activation**
1. **Validation**: System checks for available Focus Slots (must have ≥1 available)
2. **Slot Consumption**: Selected mode consumes 1 Focus Slot immediately
3. **Executive Status**: Head of A&R becomes "busy" and unavailable for meetings
4. **Operation Tracking**: System begins tracking operation start time and sourcing type
5. **UI Update**: A&R Office shows "Sourcing operation in progress" status

### **Phase 4: Executive Meeting Impact**
- **Head of A&R Unavailability**: During active A&R operations, Head of A&R shows "A&R Busy" status
- **Meeting Prevention**: Executive card becomes disabled with "Sourcing Active" badge
- **Focus Slot Attribution**: Executive Meetings display shows slot allocation (e.g., "Exec: 2 • A&R: 1 • Avail: 0")
- **Operation Details**: Executive card shows sourcing type and start time

### **Phase 5: Week Advancement Processing**
1. **Automatic Completion**: When player advances week, A&R operation completes automatically
2. **Artist Selection**: Game Engine selects random unsigned artist from pool
3. **Discovery Logic**: Filters out already signed artists and previously discovered artists
4. **Quality Variation**: Artist quality/potential varies based on sourcing mode selected
5. **Slot Release**: Focus Slot is freed for next week's use
6. **Data Persistence**: Discovered artist stored in game state flags

### **Phase 6: Artist Discovery Results**
1. **Week Summary**: Week advancement summary shows "A&R sourcing (mode) completed. Discovered [Artist Name]."
2. **Results Loading**: A&R Office automatically loads discovered artists after operation completion
3. **Artist Display**: Discovered artists appear in searchable/filterable table
4. **Artist Information**: Each artist shows name, archetype, talent, popularity, genre, signing cost

### **Phase 7: Artist Evaluation & Signing**
1. **Artist Browser**: Player can search by name/genre and filter by archetype
2. **Signing Decision**: Player reviews artist stats and signing cost
3. **Budget Validation**: System checks if player has sufficient funds for signing cost
4. **Signing Process**: Player clicks "Sign" to recruit artist to roster
5. **Cost Deduction**: Signing cost deducted from label budget
6. **Roster Integration**: Signed artist moves to main Artist Roster
7. **Discovery Cleanup**: Artist removed from discovered artists pool

## 🔧 **Technical Workflow Details**

### **State Machine Management**
- **XState Integration**: A&R operations managed by `arOfficeMachine.ts`
- **State Tracking**: Machine tracks `idle`, `sourcingActive`, and `noSlotsAvailable` states
- **Focus Slot Reservation**: Local optimistic reservation prevents double-booking
- **Server Synchronization**: Real-time sync between client state and server A&R status

### **API Endpoints Used**
- `POST /api/game/:gameId/ar-office/start` - Initiate sourcing operation
- `POST /api/game/:gameId/ar-office/cancel` - Cancel active operation
- `GET /api/game/:gameId/ar-office/status` - Check operation status
- `GET /api/game/:gameId/ar-office/artists` - Load discovered artists

### **Game Engine Integration**
- **Weekly Processing**: `processAROfficeWeekly()` method in GameEngine
- **Artist Pool Management**: Filters signed and previously discovered artists
- **Discovery Persistence**: Artists stored in `gameState.flags.ar_office_discovered_artists` array
- **Legacy Compatibility**: Maintains backward compatibility with existing save games

## 🎮 **Player Strategy Considerations**

### **Resource Management**
- **Focus Slot Allocation**: Players must balance A&R scouting vs Executive meetings
- **Timing Strategy**: When to scout based on current roster needs and available slots
- **Budget Planning**: Manage signing costs alongside other weekly expenses

### **Sourcing Mode Strategy**
- **Active Scouting**: Higher risk/reward for discovering exceptional talent
- **Passive Browsing**: Consistent results for building roster depth
- **Specialized Search**: Targeted discovery for specific genre needs

### **Executive Coordination**
- **A&R vs Meetings**: Cannot use Head of A&R for meetings during scouting operations
- **Weekly Planning**: Consider A&R operations when planning executive interactions
- **Slot Optimization**: Balance between discovery and management activities

## 🔄 **Error Handling & Edge Cases**

### **Insufficient Focus Slots**
- **Prevention**: UI disables sourcing modes when no slots available
- **Recovery**: "Retry" option appears after slot becomes available
- **Clear Messaging**: "No focus slots available" with helpful guidance

### **Operation Cancellation**
- **Manual Cancel**: Player can cancel active operations early
- **Slot Recovery**: Cancelled operations immediately free Focus Slot
- **Data Preservation**: Previously discovered artists retained on cancellation

### **Artist Pool Depletion**
- **Graceful Degradation**: System handles case where all artists signed/discovered
- **Error Messages**: Clear feedback when no new artists available
- **Fallback Logic**: Maintains operation completion even with empty results

## 📊 **Success Metrics & Feedback**

### **Visual Indicators**
- **Progress Status**: Real-time operation progress with sourcing type display
- **Slot Attribution**: Clear breakdown of Focus Slot usage across systems
- **Executive Status**: Visual "busy" indicators for unavailable executives
- **Discovery Count**: Running total of discovered vs signed artists

### **Player Feedback**
- **Week Summaries**: Clear reporting of scouting outcomes in weekly results
- **Cost Transparency**: Upfront signing costs before commitment
- **Quality Indicators**: Artist stats visible before signing decisions
- **Discovery History**: Track of all previously discovered artists

## 🎯 **Business Value Delivered**

### **Strategic Depth**
- **Resource Constraints**: Focus Slots create meaningful trade-offs
- **Discovery Variety**: Three sourcing modes provide strategic choice
- **Executive Integration**: Realistic constraint where A&R activities impact management

### **Player Engagement**
- **Active Discovery**: Players actively hunt for talent vs passive availability
- **Decision Weight**: Scouting requires resource investment and planning
- **Collection Gameplay**: Building roster through strategic discovery operations

### **System Integration**
- **Seamless Flow**: Integrates perfectly with existing Focus Slot and Executive systems
- **Week Advancement**: Natural completion timing aligns with game progression
- **Save Compatibility**: Works with all existing game saves without disruption

---

**Implementation Notes**: This system demonstrates sophisticated state management using XState, seamless API integration, and complex UI coordination across multiple game systems. The workflow provides both strategic depth and operational realism to the artist discovery process.