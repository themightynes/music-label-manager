# Frontend Architecture

**Music Label Manager - React Application Design**  
*Version: 1.1 (MVP Complete + Dark Plum Theme)*
*Last Updated: August 31, 2025*

---

## 🎨 Frontend Overview

The Music Label Manager frontend is a **React 18** application built with **TypeScript**, **Vite**, and **Tailwind CSS**. The architecture emphasizes component reusability, type safety, and clean state management.

**Technology Stack**:
- **React 18** with Hooks and Context
- **TypeScript** for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for styling with custom plum/burgundy theme
- **Zustand** for game state management
- **React Query** for server state management
- **Shadcn/UI** for component library with dark theme customization

---

## 🎨 Visual Theme System

### **Theme Architecture Overview**
*Updated: August 31, 2025*

The Music Label Manager frontend features a **comprehensive dark plum/burgundy theme** designed for an immersive gaming experience. The theme system replaces the previous light slate design with a cohesive dark aesthetic that enhances readability and visual appeal.

### **Core Theme Implementation**

#### **1. Background System**
```css
/* Layered background approach */
body::before {
  /* Base background color layer */
  background-color: hsl(var(--background));
  z-index: -2;
}

body::after {
  /* Full-coverage background image */
  background-image: url('/plum_background.880Z.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  opacity: 1;
  z-index: -1;
}
```

**Key Features**:
- **Dual-layer system**: Base color + overlay image for rich visual depth
- **Fixed attachment**: Background image stays fixed during scrolling
- **Full opacity**: Complete image visibility for maximum immersion
- **Responsive scaling**: Cover ensures proper scaling across all devices

#### **2. Component Color Scheme**

**Primary Components**:
```typescript
// Card components
const Card = {
  background: '#23121c',    // Dark plum container
  border: '#4e324c',        // Plum border
  text: '#ffffff',          // White primary text
  textSecondary: 'rgba(255, 255, 255, 0.7)' // White/70 secondary
};

// Header elements
const Header = {
  background: '#2C222A',    // Base plum background
  border: '#4e324c',        // Consistent plum borders
  text: '#ffffff'           // White text
};

// Interactive elements
const Interactive = {
  primary: '#A75A5B',       // Plum accent for buttons
  secondary: '#791014',     // Burgundy secondary
  hover: '#D99696',         // Light plum hover states
  outline: '#4e324c'        // Plum outlines
};
```

#### **3. Typography System**
- **Primary Text**: Pure white (#ffffff) for maximum readability
- **Secondary Text**: White at 70% opacity for hierarchy
- **Font Stack**: Inter for UI, JetBrains Mono for numeric values
- **Contrast Ratios**: All combinations exceed WCAG AA standards

#### **4. CSS Variable Integration**
```css
:root {
  --secondary: #791014;
  --secondary-foreground: hsl(0 0% 100%);
}

.dark {
  --secondary: #791014;
  --secondary-foreground: hsl(0 0% 100%);
}
```

### **Component Theme Applications**

#### **Shadcn/UI Customizations**
All base components have been updated with the plum theme:

```typescript
// Card component theming
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[10px] bg-[#23121c] border border-[#4e324c] text-white shadow-sm",
        className
      )}
      {...props}
    />
  )
);

// Button variant theming
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium...",
  {
    variants: {
      variant: {
        default: "bg-[#A75A5B] text-[#A75A5B]-foreground hover:bg-[#A75A5B]/90",
        outline: "border border-[#4e324c] bg-transparent text-white hover:bg-[#A75A5B]/20",
        secondary: "bg-[#3c252d] text-white hover:bg-[#3c252d]/80",
        ghost: "hover:bg-[#A75A5B]/10 hover:text-white"
      }
    }
  }
);
```

#### **40+ Component Updates**
The following components received comprehensive theme updates:
- **UI Components**: All cards, buttons, inputs, dialogs, and navigation elements
- **Game Components**: Dashboard, artist roster, project tracking, month planner
- **Modals**: All modal dialogs with consistent dark theming
- **Status Indicators**: KPI cards, progress bars, badges, and notifications

### **Theme Benefits**

#### **User Experience**
- **Immersive Gaming**: Dark theme creates focus on game content
- **Reduced Eye Strain**: Dark backgrounds easier on eyes during extended play
- **Professional Aesthetic**: Burgundy/plum palette suggests music industry sophistication
- **Visual Hierarchy**: Clear distinction between interactive and static elements

#### **Technical Benefits**
- **Consistent Implementation**: Single source of truth for all theme values
- **Easy Maintenance**: CSS variables allow quick theme adjustments
- **Performance Optimized**: Minimal CSS overhead with efficient class structure
- **Accessibility Compliant**: High contrast ratios throughout

#### **Design Cohesion**
- **10px Border Radius**: Modern rounded corners across all components
- **Consistent Spacing**: Uniform padding and margins following design system
- **Color Harmony**: Plum/burgundy palette creates visual unity
- **Responsive Design**: Theme adapts seamlessly across all screen sizes

### **Migration from Light Theme**
The August 31, 2025 update represented a complete visual transformation:

**Before (Light Theme)**:
- White/light gray backgrounds
- Slate-600 text colors  
- Purple accent colors
- Standard gray borders
- Light card containers

**After (Dark Plum Theme)**:
- Dark plum backgrounds (#2C222A, #23121c)
- White/white-70 text for readability
- Burgundy accent colors (#791014)
- Plum borders (#4e324c) 
- Background image integration
- 10px rounded corners for modern aesthetic

This transformation maintains all functionality while dramatically improving visual appeal and user experience.

---

## 📁 Project Structure

```
client/src/
├── components/           # Shared UI components
│   ├── Dashboard.tsx     # Main game dashboard
│   ├── MonthPlanner.tsx  # Enhanced action planner with strategic recommendations
│   ├── DialogueModal.tsx # Role conversation system
│   ├── SaveGameModal.tsx # Save/load system
│   ├── ArtistDiscoveryModal.tsx  # Artist signing
│   ├── ProjectCreationModal.tsx  # Project creation
│   ├── CampaignResultsModal.tsx  # Game completion
│   ├── KPICards.tsx      # Resource display
│   ├── ArtistRoster.tsx  # Enhanced artist management with analytics and insights
│   ├── SongCatalog.tsx   # Individual song tracking with revenue and streaming metrics
│   ├── ActiveProjects.tsx # Enhanced project tracking with aggregated song analytics and ROI calculations
│   ├── AccessTierBadges.tsx # Detailed progression system with requirements
│   └── ui/               # Base UI components (Shadcn)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── card.tsx
│       └── ...
├── contexts/             # React contexts
│   ├── AuthContext.tsx   # Authentication state
│   └── GameContext.tsx   # Game session management
├── features/             # Feature-based organization
│   └── game-state/
│       ├── components/   # Feature-specific components
│       └── hooks/        # Custom hooks
├── hooks/                # Shared custom hooks
├── lib/                  # Utilities and configuration
├── pages/                # Top-level page components
├── store/                # Zustand stores
└── types/                # TypeScript type definitions
```

---

## 🧩 Component Architecture

### **Component Hierarchy**
```
App.tsx
├── AuthProvider (AuthContext)
├── GameProvider (GameContext)
└── Router
    ├── LoginPage.tsx
    └── GamePage.tsx
        ├── ErrorBoundary
        ├── Dashboard.tsx (Main Game Interface)
        │   ├── Header (KPIs, Save Button)
        │   ├── MonthPlanner.tsx (Enhanced Action Selection with Recommendations)
        │   ├── AccessTierBadges.tsx (Detailed Progression System)
        │   ├── ArtistRoster.tsx (Enhanced Artist Management with Analytics)
        │   ├── ActiveProjects.tsx (Enhanced Project Tracking with Revenue Analytics)
        │   └── QuickStats.tsx (Summary Info)
        └── Modals (Conditional Rendering)
            ├── DialogueModal.tsx
            ├── SaveGameModal.tsx
            ├── ArtistDiscoveryModal.tsx
            ├── ProjectCreationModal.tsx
            └── CampaignResultsModal.tsx
```

### **Core Components**

#### **Dashboard.tsx** - Main Game Interface
```typescript
export function Dashboard() {
  const { gameState, isAdvancingMonth, advanceMonth, currentDialogue, closeDialogue } = useGameStore();
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleAdvanceMonth = async () => {
    try {
      await advanceMonth();
    } catch (error) {
      console.error('Failed to advance month:', error);
    }
  };

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-[#2C222A] shadow-sm border-b border-[#4e324c]">
        {/* Game title, month counter, money display, save button */}
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <KPICards />
          <AccessTierBadges gameState={gameState} />
          <MonthPlanner onAdvanceMonth={handleAdvanceMonth} isAdvancing={isAdvancingMonth} />
        </div>
        
        <div className="lg:col-span-4">
          <ArtistRoster />
          <ActiveProjects />
          <QuickStats />
        </div>
      </main>

      {/* Conditional Modals */}
      {currentDialogue && (
        <DialogueModal
          roleId={currentDialogue.roleType}
          meetingId={currentDialogue.sceneId}
          gameId={gameState.id}
          onClose={closeDialogue}
        />
      )}
      
      <SaveGameModal open={showSaveModal} onOpenChange={setShowSaveModal} />
    </div>
  );
}
```

**Responsibilities**:
- Main layout and responsive grid with dark plum theming
- Modal orchestration with consistent color scheme
- Game state display with white text on dark backgrounds
- Action coordination between components
- Background image integration and visual hierarchy

#### **MonthPlanner.tsx** - Enhanced Turn-Based Action System with Strategic Recommendations
```typescript
export function MonthPlanner({ onAdvanceMonth, isAdvancing }: MonthPlannerProps) {
  const { gameState, selectedActions, selectAction, removeAction, openDialogue } = useGameStore();
  
  const industryRoles = [
    { id: 'meet_manager', name: 'Sarah Mitchell', title: 'Manager', type: 'Manager' },
    { id: 'meet_ar', name: 'Marcus Chen', title: 'A&R Rep', type: 'A&R' },
    // ... more roles
  ];

  const handleRoleClick = async (roleId: string, actionId: string) => {
    // Role ID mapping for dialogue system
    const roleMapping: Record<string, string> = {
      'meet_manager': 'manager',
      'meet_ar': 'anr',
      'meet_operations': 'ops'
    };
    
    const mappedRoleId = roleMapping[roleId] || roleId;
    const meetingId = 'monthly_check_in';
    
    // Add action to selected list AND open dialogue
    selectAction(actionId);
    await openDialogue(mappedRoleId, meetingId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Month {gameState?.currentMonth || 1} Action Planner</CardTitle>
        <CardDescription>
          Select up to {focusSlots} actions to focus on this month
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Industry Roles Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {industryRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onClick={() => handleRoleClick(role.id, role.id)}
              isSelected={selectedActions.includes(role.id)}
            />
          ))}
        </div>
        
        {/* Project Options Section */}
        <ProjectOptions gameState={gameState} />
        
        {/* Advance Month Button */}
        <Button 
          onClick={onAdvanceMonth}
          disabled={selectedActions.length === 0 || isAdvancing}
          className="w-full"
        >
          {isAdvancing ? 'Processing...' : `Advance to Month ${(gameState?.currentMonth || 1) + 1}`}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Responsibilities**:
- Enhanced action selection UI with detailed metadata (costs, durations, outcomes)
- Strategic recommendation system based on current game state
- Project pipeline visualization with progress indicators
- Interactive action details with hover-based information
- Intelligent action categorization (urgent, recommended, situational)
- Role meeting triggers
- Project creation workflow
- Month advancement initiation

#### **DialogueModal.tsx** - Role Conversation System
```typescript
export function DialogueModal({ roleId, meetingId, gameId, onClose, onChoiceSelect }: DialogueModalProps) {
  const [roleData, setRoleData] = useState<Role | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    const loadRoleData = async () => {
      try {
        const response = await fetch(`/api/roles/${roleId}`);
        const data = await response.json();
        setRoleData(data);
        
        const meeting = data.meetings?.find((m: Meeting) => m.id === meetingId);
        setSelectedMeeting(meeting || data.meetings?.[0]);
      } catch (error) {
        console.error('Failed to load role data:', error);
      }
    };

    loadRoleData();
  }, [roleId, meetingId]);

  const handleChoiceSelect = async (choice: DialogueChoice) => {
    if (onChoiceSelect) {
      await onChoiceSelect(choice.id, choice.effects_immediate || {});
    }
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <RoleIcon type={roleData?.type} />
            Meeting with {roleData?.name}
          </DialogTitle>
          <DialogDescription>
            {selectedMeeting?.context || "Monthly check-in conversation"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-[#3c252d]/10 p-4 rounded-lg">
            <p className="text-sm text-white/70 italic">
              "{selectedMeeting?.prompt || "How are things going this month?"}"
            </p>
          </div>

          <div className="space-y-3">
            {selectedMeeting?.choices?.map((choice) => (
              <ChoiceButton
                key={choice.id}
                choice={choice}
                onClick={() => handleChoiceSelect(choice)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Responsibilities**:
- Load role dialogue data from API
- Display conversation choices with effect previews
- Apply immediate effects on choice selection
- Integrate with action selection system

#### **SaveGameModal.tsx** - Save/Load System
```typescript
export function SaveGameModal({ open, onOpenChange }: SaveGameModalProps) {
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [newSaveName, setNewSaveName] = useState('');
  const { saveGame, loadGameFromSave } = useGameStore();

  const fetchSaves = async () => {
    try {
      const response = await fetch('/api/saves');
      const data = await response.json();
      setSaves(data);
    } catch (error) {
      console.error('Failed to fetch saves:', error);
    }
  };

  const handleSave = async () => {
    try {
      await saveGame(newSaveName);
      await fetchSaves(); // Refresh save list
      setNewSaveName('');
      alert('Game saved successfully!');
    } catch (error) {
      alert('Failed to save game. Please try again.');
    }
  };

  const handleLoad = async (saveId: string) => {
    try {
      await loadGameFromSave(saveId);
      onOpenChange(false);
      alert('Game loaded successfully!');
    } catch (error) {
      alert('Failed to load game. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Save & Load Game</DialogTitle>
        </DialogHeader>

        {/* Save New Game Section */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter save name..."
              value={newSaveName}
              onChange={(e) => setNewSaveName(e.target.value)}
            />
            <Button onClick={handleSave} disabled={!newSaveName.trim()}>
              Save Game
            </Button>
          </div>
        </div>

        {/* Existing Saves */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, index) => {
            const save = saves[index];
            return (
              <SaveSlot
                key={index}
                save={save}
                onLoad={() => save && handleLoad(save.id)}
                onDelete={() => save && handleDelete(save.id)}
              />
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Responsibilities**:
- Save game state with user-defined names
- Display save slots with metadata
- Load game state from saves
- Export/import functionality

#### **ProjectCreationModal.tsx** - Economic Decision System ✅ ENHANCED
```typescript
interface ProjectCreationModalProps {
  open: boolean;
  onClose: () => void;
  artistId: string;
  gameId: string;
}

export function ProjectCreationModal({ open, onClose, artistId, gameId }: ProjectCreationModalProps) {
  const [projectType, setProjectType] = useState<'Single' | 'EP' | 'Album'>('Single');
  const [budgetPerSong, setBudgetPerSong] = useState(3000);
  const [producerTier, setProducerTier] = useState<'local' | 'regional' | 'national' | 'legendary'>('local');
  const [timeInvestment, setTimeInvestment] = useState<'rushed' | 'standard' | 'extended' | 'perfectionist'>('standard');
  const [songCount, setSongCount] = useState(1);

  // ✅ NEW: Real-time quality preview calculation
  const calculateQualityPreview = () => {
    const baseQuality = 50; // Average base
    const artistMoodBonus = artist?.mood ? Math.floor((artist.mood - 50) / 5) : 0;
    const producerBonus = getProducerTierSystemSync()[producerTier]?.quality_bonus || 0;
    const timeBonus = getTimeInvestmentSystemSync()[timeInvestment]?.quality_bonus || 0;
    const budgetBonus = calculateBudgetQualityBonus(budgetPerSong, projectType);
    const songCountImpact = calculateSongCountQualityImpact(songCount);
    
    return Math.min(100, Math.round(
      (baseQuality + artistMoodBonus + producerBonus + timeBonus + budgetBonus) * songCountImpact
    ));
  };

  // ✅ NEW: Total cost calculation with multipliers
  const calculateTotalCost = () => {
    const baseCost = budgetPerSong * songCount;
    const producerMultiplier = getProducerTierSystemSync()[producerTier]?.multiplier || 1.0;
    const timeMultiplier = getTimeInvestmentSystemSync()[timeInvestment]?.multiplier || 1.0;
    
    return Math.round(baseCost * producerMultiplier * timeMultiplier);
  };

  const qualityPreview = calculateQualityPreview();
  const totalCost = calculateTotalCost();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project - {artist?.name}</DialogTitle>
          <DialogDescription>
            Make strategic economic decisions that will impact your music quality and project costs
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Economic Decisions */}
          <div className="space-y-6">
            <ProjectTypeSelector 
              value={projectType} 
              onChange={setProjectType}
              onSongCountChange={setSongCount}
            />
            
            {/* ✅ NEW: Budget Per Song Slider */}
            <BudgetSlider
              budgetPerSong={budgetPerSong}
              onChange={setBudgetPerSong}
              projectType={projectType}
              showEfficiencyBreakpoints={true}
            />

            {/* ✅ NEW: Producer Tier Selection */}
            <ProducerTierSelector
              selectedTier={producerTier}
              onChange={setProducerTier}
              labelReputation={gameState?.reputation || 0}
              showCostMultipliers={true}
            />

            {/* ✅ NEW: Time Investment Options */}
            <TimeInvestmentSelector
              selectedOption={timeInvestment}
              onChange={setTimeInvestment}
              showQualityImpact={true}
            />
          </div>

          {/* Right Column: Quality Preview & Cost Breakdown */}
          <div className="space-y-4">
            {/* ✅ NEW: Real-time Quality Preview */}
            <QualityPreviewCard
              estimatedQuality={qualityPreview}
              breakdown={{
                base: 50,
                artistMood: artistMoodBonus,
                producer: producerBonus,
                timeInvestment: timeBonus,
                budget: budgetBonus,
                songCount: songCountImpact
              }}
            />

            {/* ✅ NEW: Cost Breakdown Display */}
            <CostBreakdownCard
              budgetPerSong={budgetPerSong}
              songCount={songCount}
              producerMultiplier={getProducerTierSystemSync()[producerTier]?.multiplier}
              timeMultiplier={getTimeInvestmentSystemSync()[timeInvestment]?.multiplier}
              totalCost={totalCost}
            />

            {/* ✅ NEW: Economic Efficiency Indicators */}
            <EfficiencyIndicators
              budgetEfficiency={calculateBudgetEfficiency(budgetPerSong, projectType)}
              producerEfficiency={calculateProducerEfficiency(producerTier)}
              timeEfficiency={calculateTimeEfficiency(timeInvestment)}
            />
          </div>
        </div>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateProject}
            disabled={totalCost > (gameState?.money || 0)}
          >
            Create Project (${totalCost.toLocaleString()})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Responsibilities**:
- **Economic Decision Interface**: Budget per song, producer tier, and time investment selection ✅ NEW
- **Real-time Quality Preview**: Live calculation showing expected song quality with breakdown ✅ NEW
- **Cost Calculation**: Dynamic total cost with economic decision multipliers ✅ NEW
- **Efficiency Indicators**: Visual feedback on budget efficiency and strategic choices ✅ NEW
- **Interactive Sliders**: Responsive controls with immediate feedback and validation ✅ NEW
- **Strategic Information**: Tooltips and guidance for optimal economic decisions ✅ NEW
- Project type selection and song count configuration
- Artist mood and relationship factor integration
- Comprehensive form validation and error handling

#### **AccessTierBadges.tsx** - Enhanced Progression System
```typescript
export function AccessTierBadges({ gameState }: AccessTierBadgesProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  const accessTiers = {
    playlist: { /* detailed tier definitions with requirements and benefits */ },
    press: { /* comprehensive progression paths */ },
    venue: { /* access requirements and unlocks */ }
  };

  const getCurrentTier = (tierType: keyof typeof accessTiers) => {
    // Calculate current tier based on game state
  };

  const getProgressToNextTier = (tierType: keyof typeof accessTiers) => {
    // Calculate progress percentage to next unlock
  };

  return (
    <Card>
      {/* Detailed progression visualization with:
          - Current tier badges with requirements
          - Progress bars to next tier
          - Expandable sections showing full progression paths
          - Industry standing summary
          - Benefits and requirements for each tier */}
    </Card>
  );
}
```

**Responsibilities**:
- Comprehensive access tier progression visualization
- Detailed requirements and benefits for each tier level
- Progress tracking with visual indicators
- Expandable progression paths showing full unlock sequences
- Industry standing metrics (reputation, access level, total unlocks)

#### **ArtistRoster.tsx** - Enhanced Artist Management with Analytics
```typescript
export function ArtistRoster() {
  const { gameState, artists, projects } = useGameStore();
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);

  const getArtistInsights = (artist: any) => {
    // Calculate comprehensive analytics: projects, revenue, ROI, mood, loyalty
    // Artist archetype analysis with strengths and preferences
    // Performance metrics and relationship status
  };

  const getArtistRecommendations = (artist: any, insights: any) => {
    // Generate intelligent management recommendations
    // Based on artist archetype, current mood/loyalty, and project history
  };

  return (
    <Card>
      {/* Enhanced artist cards with:
          - Comprehensive performance analytics
          - Archetype-specific management insights
          - Mood and loyalty tracking with progress bars
          - Management recommendations based on current state
          - Expandable details with relationship factors
          - Artist-specific management tips and strategies */}
    </Card>
  );
}
```

**Responsibilities**:
- Comprehensive artist analytics (projects, revenue, ROI calculations)
- Archetype-specific insights with strengths, preferences, and traits
- Mood and loyalty tracking with visual progress indicators
- Intelligent management recommendations based on artist state
- Relationship status indicators with actionable guidance
- Expandable artist details with management tips and factors affecting mood/loyalty

#### **SongCatalog.tsx** - Individual Song Tracking (NEW: Phase 1 Enhancement)
```typescript
interface Song {
  id: string;
  title: string;
  quality: number;
  genre?: string;
  mood?: string;
  isRecorded: boolean;
  isReleased: boolean;
  
  // Individual song revenue metrics
  initialStreams?: number;
  totalStreams?: number;
  totalRevenue?: number;
  monthlyStreams?: number;
  lastMonthRevenue?: number;
  releaseMonth?: number;
}

export function SongCatalog({ artistId, gameId }: SongCatalogProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  
  // Calculate aggregate metrics from individual songs
  const totalRevenue = songs.reduce((sum, song) => sum + (song.totalRevenue || 0), 0);
  const totalStreams = songs.reduce((sum, song) => sum + (song.totalStreams || 0), 0);
  const lastMonthRevenue = songs.reduce((sum, song) => sum + (song.lastMonthRevenue || 0), 0);

  return (
    <div>
      {/* Enhanced summary stats with revenue aggregation */}
      {/* Individual song cards with:
          - Quality indicators and status badges
          - Individual streams and revenue metrics
          - Monthly performance tracking
          - Release month and creation details
          - Visual quality scoring (color-coded)
          - Recent performance highlights */}
    </div>
  );
}
```

**Responsibilities**:
- **Individual song display** with quality, status, and performance metrics
- **Revenue tracking per song** showing streams, revenue, and monthly changes
- **Aggregated statistics** displaying total revenue, streams across all artist songs
- **Performance monitoring** with last month revenue and trend indicators
- **Quality visualization** with color-coded quality indicators
- **Status progression** showing recording → ready → released workflow
- **Strategic insights** enabling song-by-song performance analysis

#### **ActiveProjects.tsx** - Enhanced Project Tracking with Aggregated Song Analytics
```typescript
export function ActiveProjects() {
  const { projects, artists, createProject, gameState, songs } = useGameStore();

  // Get songs for a specific project and calculate aggregated metrics
  const getProjectSongs = (projectId: string) => {
    return songs.filter((song: any) => {
      const metadata = song.metadata as any;
      return metadata?.projectId === projectId;
    });
  };

  const calculateProjectMetrics = (project: any) => {
    const projectSongs = getProjectSongs(project.id);
    
    if (projectSongs.length > 0) {
      // Calculate aggregated metrics from individual songs
      const totalRevenue = projectSongs.reduce((sum, song) => sum + (song.totalRevenue || 0), 0);
      const totalStreams = projectSongs.reduce((sum, song) => sum + (song.totalStreams || 0), 0);
      const lastMonthRevenue = projectSongs.reduce((sum, song) => sum + (song.lastMonthRevenue || 0), 0);
      
      const investment = project.budget || 0;
      const roi = investment > 0 ? ((totalRevenue - investment) / investment) * 100 : 0;
      
      return { 
        roi, 
        revenue: totalRevenue, 
        investment, 
        streams: totalStreams, 
        songCount: projectSongs.length,
        lastMonthRevenue,
        individual: true // Using individual song tracking
      };
    }
    
    // Fallback to legacy project metadata if no individual songs
    const metadata = project.metadata || {};
    const revenue = metadata.revenue || 0;
    const investment = project.budget || 0;
    const roi = investment > 0 ? ((revenue - investment) / investment) * 100 : 0;
    return { roi, revenue, investment, streams: metadata.streams || 0, individual: false };
  };

  return (
    <Card>
      {/* Enhanced project cards with:
          - Aggregated revenue from individual songs
          - Individual song tracking indicators
          - Backward compatibility with legacy projects
          - "🎵 Individual song tracking active" status
          - Real-time aggregation of song performance
          - Last month revenue from individual songs */}
    </Card>
  );
}
```

**Responsibilities**:
- **Aggregated song metrics** calculated from individual song performance
- **Individual song tracking indicator** showing when new system is active
- **Backward compatibility** with legacy project-based revenue data
- **Real-time project totals** summing individual song streams and revenue
- **ROI calculations** using aggregated revenue vs project investment
- **Portfolio-wide analytics** across all projects with individual song foundation
- **Last month performance** showing recent individual song contributions

#### **MonthSummary.tsx** - Enhanced Monthly Results Display
```typescript
export function MonthSummary({ monthlyStats, onAdvanceMonth, isAdvancing, isMonthResults }: MonthSummaryProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'events'>('overview');

  const categorizeChanges = (changes: any[]) => {
    // Intelligent categorization of monthly events
    const categories = {
      revenue: [], // Project completions, streaming revenue
      expenses: [], // Operational costs, project investments
      achievements: [], // Unlocks, tier upgrades
      other: [] // Miscellaneous events
    };
    return categories;
  };

  return (
    <Card>
      {/* Enhanced month summary with:
          - Tabbed interface for different event categories
          - Rich categorization of revenue/expenses/achievements
          - Visual progress indicators and trend analysis
          - Detailed financial breakdown with context
          - Achievement highlighting and celebration */}
    </Card>
  );
}
```

**Responsibilities**:
- Rich categorization of monthly events and changes
- Tabbed interface for organizing complex monthly data
- Financial analysis with revenue/expense breakdown
- Achievement and milestone highlighting
- Visual progress indicators and trend analysis

#### **ToastNotification.tsx** - Enhanced Notification System
```typescript
export function ToastNotification() {
  const showEnhancedToast = (options: {
    title: string;
    description: string;
    type: 'success' | 'info' | 'warning' | 'achievement';
    duration?: number;
    action?: { label: string; onClick: () => void };
    progress?: number;
  }) => {
    // Enhanced toast with progress indicators and action buttons
  };

  useEffect(() => {
    // Intelligent notification system that:
    // - Tracks all game state changes
    // - Provides contextual information and actions
    // - Shows progress indicators for metrics
    // - Prevents notification spam with debouncing
    // - Categorizes notifications by importance and type
  }, [gameState, monthlyOutcome]);

  return <Toaster />;
}
```

**Responsibilities**:
- Intelligent real-time notifications for all game state changes
- Progress indicators for reputation, creative capital, and other metrics
- Action buttons for relevant follow-up actions
- Contextual information with financial and strategic context
- Achievement celebrations with detailed benefits
- Debounced notifications to prevent spam

---

## 🔄 State Management

### **Zustand Store Pattern**
The application uses Zustand for game state management with persistence:

```typescript
interface GameStore {
  // Game State
  gameState: GameState | null;
  artists: Artist[];
  projects: Project[];
  selectedActions: string[];
  isAdvancingMonth: boolean;
  currentDialogue: any | null;
  campaignResults: any | null;
  
  // Actions
  loadGame: (gameId: string) => Promise<void>;
  createNewGame: (campaignType: string) => Promise<GameState>;
  advanceMonth: () => Promise<void>;
  selectAction: (actionId: string) => void;
  removeAction: (actionId: string) => void;
  openDialogue: (roleType: string, sceneId?: string) => Promise<void>;
  selectDialogueChoice: (choiceId: string, effects: any) => Promise<void>;
  saveGame: (name: string) => Promise<void>;
  loadGameFromSave: (saveId: string) => Promise<void>;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // State and actions implementation
    }),
    {
      name: 'music-label-manager-game',
      partialize: (state) => ({
        gameState: state.gameState,
        artists: state.artists,
        projects: state.projects,
        selectedActions: state.selectedActions
      })
    }
  )
);
```

### **React Query Integration**
Server state management for API calls:

```typescript
// Game state fetching
export function useGameState() {
  const { gameId } = useGameContext();
  
  return useQuery({
    queryKey: ['gameState', gameId],
    queryFn: async () => {
      const response = await fetch(`/api/game/${gameId}`);
      const data = await response.json();
      return data.gameState as GameState;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Month advancement
export function useAdvanceMonth() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (selectedActions: string[]) => {
      const request = {
        gameId: gameState.id,
        selectedActions: selectedActions.map(actionId => ({
          actionType: 'role_meeting' as const,
          targetId: actionId,
          metadata: {}
        }))
      };
      return apiClient.advanceMonth(request);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['gameState', gameId], data.gameState);
    }
  });
}
```

### **Context Providers**
Application-level context for cross-cutting concerns:

```typescript
// Game Context - Session Management
export const GameContext = createContext<{
  gameId: string | null;
  setGameId: (id: string | null) => void;
}>({
  gameId: null,
  setGameId: () => {}
});

// Auth Context - User Authentication
export const AuthContext = createContext<{
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}>({
  user: null,
  login: async () => {},
  logout: async () => {},
  isLoading: false
});
```

---

## 🎨 UI Design System

### **Shadcn/UI Components**
The application uses Shadcn/UI for consistent, accessible components:

```typescript
// Base components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Usage example
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      {title}
    </CardTitle>
  </CardHeader>
  <CardContent>
    {content}
  </CardContent>
</Card>
```

### **Theming System**

The application features a comprehensive **dark plum/burgundy theme** implemented on August 31, 2025, providing an immersive and cohesive visual experience.

#### **Color Palette**
```typescript
// Primary Theme Colors
const themeColors = {
  // Main Background Colors
  baseBackground: '#2C222A',     // Base plum background
  cardBackground: '#23121c',     // Dark plum for cards/containers
  headerBackground: '#2C222A',   // Header background
  
  // Border Colors
  primaryBorder: '#4e324c',      // Plum borders for cards/inputs
  
  // Text Colors
  primaryText: '#ffffff',        // White text for readability
  secondaryText: 'rgba(255, 255, 255, 0.7)', // White/70 for secondary text
  
  // Accent Colors
  primary: '#A75A5B',           // Plum accent for buttons/highlights
  secondary: '#791014',         // Burgundy secondary color
  hoverState: '#D99696',        // Light plum for hover states
  
  // Status Colors
  success: 'hsl(142.1 76.2% 36.3%)', // Green for positive states
  warning: 'hsl(43.2 97.8% 48.8%)',  // Yellow for warnings
  danger: 'hsl(0 84.2% 60.2%)',      // Red for negative states
};
```

#### **Background Image System**
```css
/* Full-coverage background implementation */
body::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: -1;
  background-image: url('/plum_background.880Z.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  opacity: 1; /* Full opacity for immersive experience */
}
```

#### **CSS Variable System**
```css
/* Custom CSS variables for consistent theming */
:root {
  --secondary: #791014;           /* Burgundy accent */
  --secondary-foreground: #ffffff; /* White text on burgundy */
}

.dark {
  --secondary: #791014;           /* Maintained in dark mode */
  --secondary-foreground: #ffffff;
}
```

#### **Component Styling Patterns**
```css
/* Layout patterns */
.dashboard-grid { @apply grid grid-cols-1 lg:grid-cols-12 gap-6; }
.card-grid { @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4; }

/* Card components with dark plum theme */
.card-base {
  @apply rounded-[10px] bg-[#23121c] border border-[#4e324c] text-white shadow-sm;
}

/* Interactive elements */
.action-button {
  @apply p-4 border border-[#4e324c] rounded-[10px] bg-[#23121c] text-white;
  @apply hover:bg-[#D99696] transition-colors;
}

/* Button variants */
.button-primary {
  @apply bg-[#A75A5B] text-white hover:bg-[#A75A5B]/90;
}

.button-secondary {
  @apply bg-[#3c252d] text-white hover:bg-[#3c252d]/80;
}

.button-outline {
  @apply border border-[#4e324c] bg-transparent text-white;
  @apply hover:bg-[#A75A5B]/20 hover:text-white;
}

/* Status indicators with dark theme compatibility */
.status-positive { @apply text-green-400 bg-green-900/20; }
.status-negative { @apply text-red-400 bg-red-900/20; }
.status-neutral { @apply text-white/70 bg-[#3c252d]/10; }

/* Resource displays */
.resource-card {
  @apply bg-[#23121c] border border-[#4e324c] rounded-[10px] shadow-sm border p-4;
}
.kpi-value { @apply text-2xl font-bold font-mono text-white; }

/* Header styling */
.header-base {
  @apply bg-[#2C222A] border-b border-[#4e324c] shadow-sm;
}

/* Input styling */
.input-base {
  @apply bg-[#23121c] border border-[#4e324c] text-white rounded-[10px];
  @apply focus:border-[#A75A5B] focus:ring-[#A75A5B];
}
```

#### **Dark Theme Considerations**
- **Contrast Ratios**: All text combinations meet WCAG AA standards
- **Readability**: White/off-white text on dark plum backgrounds
- **Visual Hierarchy**: Burgundy accents create clear focus points
- **Consistency**: 10px rounded corners throughout for modern aesthetic
- **Accessibility**: High contrast maintained across all interactive elements

#### **Responsive Design Integration**
```typescript
// Theme-aware responsive patterns
<div className="bg-[#2C222A] text-white">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Cards automatically adapt with consistent theming */}
  </div>
</div>

// Mobile-optimized theme elements
<div className="bg-[#23121c] border border-[#4e324c] rounded-[10px]">
  <div className="flex flex-col md:flex-row gap-4">
    {/* Stack vertically on mobile, horizontally on larger screens */}
  </div>
</div>
```

### **Legacy Theme Migration**
The UI was completely transformed from a light slate/gray theme to the current dark plum system:
- **Before**: Light backgrounds with slate-600 text
- **After**: Dark plum backgrounds (#2C222A, #23121c) with white text
- **Accent Evolution**: Purple accents replaced with burgundy (#791014)
- **Border Updates**: All gray borders converted to plum (#4e324c)
- **Hover States**: New plum hover color (#D99696) for better interaction feedback

### **Responsive Design**
Mobile-first responsive design with breakpoints:

```typescript
// Component responsive patterns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards automatically adjust to screen size */}
</div>

<div className="flex flex-col md:flex-row gap-4">
  {/* Stack vertically on mobile, horizontally on larger screens */}
</div>

// Mobile-optimized modals
<DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
  {/* Modal adapts to screen size */}
</DialogContent>
```

---

## 🔧 Component Patterns

### **Custom Hooks**
Reusable logic extraction:

```typescript
// useToast - Notification system
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => removeToast(id), 5000);
  }, []);
  
  return { toasts, showToast, removeToast };
};

// useGameData - Game content fetching
export const useGameData = (dataType: string) => {
  return useQuery({
    queryKey: ['gameData', dataType],
    queryFn: async () => {
      const response = await fetch(`/api/data/${dataType}`);
      return response.json();
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
};
```

### **Error Boundary Pattern**
Comprehensive error handling:

```typescript
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Could send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 mb-4">
                An unexpected error occurred. Please refresh the page to continue.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### **Modal Management Pattern**
Centralized modal state management:

```typescript
// Modal state in main component
const [modals, setModals] = useState({
  save: false,
  artistDiscovery: false,
  projectCreation: false,
  dialogue: null,
  campaignResults: false
});

// Modal control functions
const openModal = (modalType: string, data?: any) => {
  setModals(prev => ({ ...prev, [modalType]: data || true }));
};

const closeModal = (modalType: string) => {
  setModals(prev => ({ ...prev, [modalType]: false }));
};

// Conditional rendering
{modals.save && <SaveGameModal onClose={() => closeModal('save')} />}
{modals.dialogue && <DialogueModal {...modals.dialogue} onClose={() => closeModal('dialogue')} />}
```

---

## 🚀 Performance Optimizations

### **React Optimizations**
```typescript
// Memoized components for expensive renders
const MemoizedProjectCard = memo(({ project }: { project: Project }) => {
  return <ProjectCard project={project} />;
}, (prevProps, nextProps) => {
  return prevProps.project.id === nextProps.project.id && 
         prevProps.project.stage === nextProps.project.stage;
});

// Lazy loading for modals
const DialogueModal = lazy(() => import('./DialogueModal'));
const SaveGameModal = lazy(() => import('./SaveGameModal'));

// Usage with Suspense
<Suspense fallback={<div>Loading...</div>}>
  {showDialogue && <DialogueModal />}
</Suspense>
```

### **Bundle Optimization**
```typescript
// Vite configuration for optimal bundling
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          utils: ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    }
  }
});
```

### **State Update Optimizations**
```typescript
// Zustand store optimizations
const useGameStore = create<GameStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Batch state updates
        updateGameState: (updates: Partial<GameState>) => {
          set(state => ({
            gameState: { ...state.gameState, ...updates }
          }));
        },
        
        // Selective subscriptions
        subscribeToMoney: (callback: (money: number) => void) => {
          return useGameStore.subscribe(
            state => state.gameState?.money,
            callback
          );
        }
      }),
      { name: 'game-store' }
    )
  )
);
```

---

## 🧪 Testing Strategy

### **Component Testing**
```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthPlanner } from './MonthPlanner';

describe('MonthPlanner', () => {
  it('should allow selecting up to 3 actions', () => {
    const mockOnAdvance = jest.fn();
    render(<MonthPlanner onAdvanceMonth={mockOnAdvance} isAdvancing={false} />);
    
    // Select 3 actions
    fireEvent.click(screen.getByText('Meet Manager'));
    fireEvent.click(screen.getByText('Meet A&R Rep'));
    fireEvent.click(screen.getByText('Meet Producer'));
    
    // Fourth action should be disabled
    expect(screen.getByText('Meet Operations')).toBeDisabled();
    
    // Advance button should be enabled
    expect(screen.getByText(/Advance to Month/)).not.toBeDisabled();
  });
});
```

### **Hook Testing**
```typescript
// Custom hook testing
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from './gameStore';

describe('useGameStore', () => {
  it('should select and remove actions correctly', () => {
    const { result } = renderHook(() => useGameStore());
    
    act(() => {
      result.current.selectAction('meet_manager');
    });
    
    expect(result.current.selectedActions).toContain('meet_manager');
    
    act(() => {
      result.current.removeAction('meet_manager');
    });
    
    expect(result.current.selectedActions).not.toContain('meet_manager');
  });
});
```

---

This frontend architecture provides a scalable, maintainable foundation for the Music Label Manager game, with clear separation of concerns, type safety, and excellent user experience patterns.