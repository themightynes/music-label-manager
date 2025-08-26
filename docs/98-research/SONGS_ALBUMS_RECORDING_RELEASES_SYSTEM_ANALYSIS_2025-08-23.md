# Songs, Albums/EPs, Recording Sessions, and Planned Releases System Analysis

**Research Date**: August 23, 2025  
**Scope**: Complete investigation of music creation, recording, and release systems in the Music Label Manager

---

## 🎵 Song Entity Architecture

### Database Schema (`shared/schema.ts`)

**Core Song Table:**
```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  game_id UUID REFERENCES game_states(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL, -- 20-100 scale
  
  -- Production metadata
  genre TEXT,
  mood TEXT, -- upbeat, melancholic, aggressive, chill
  created_month INTEGER,
  producer_tier TEXT DEFAULT 'local', -- local, regional, national, legendary
  time_investment TEXT DEFAULT 'standard', -- rushed, standard, extended, perfectionist
  
  -- Release tracking
  is_recorded BOOLEAN DEFAULT FALSE,
  is_released BOOLEAN DEFAULT FALSE,
  release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP,
  released_at TIMESTAMP,
  
  -- Individual song revenue and streaming metrics
  initial_streams INTEGER DEFAULT 0,
  total_streams INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  monthly_streams INTEGER DEFAULT 0,
  last_month_revenue INTEGER DEFAULT 0,
  release_month INTEGER,
  
  metadata JSONB DEFAULT '{}' -- Production details, decay data, economic insights
);
```

**Performance-Optimized Indexes:**
```sql
-- Portfolio analysis for ready songs
CREATE INDEX idx_songs_portfolio_analysis ON songs 
  (game_id, is_recorded, producer_tier, time_investment);

-- Monthly decay processing
CREATE INDEX idx_songs_monthly_processing ON songs 
  (game_id, created_month) WHERE created_month IS NOT NULL;

-- Revenue tracking for analytics
CREATE INDEX idx_songs_revenue_tracking ON songs 
  (game_id, is_released, total_revenue DESC, total_streams DESC) 
  WHERE is_released = true AND total_revenue > 0;
```

### Song Creation Process

**1. Project-Driven Generation:**
```typescript
// During project production stage advancement
private async processRecordingProjects(summary: MonthSummary, dbTransaction?: any): Promise<void> {
  const recordingProjects = await this.gameData.getActiveRecordingProjects(this.gameState.id);
  
  for (const project of recordingProjects) {
    const songsToGenerate = Math.min(
      project.songCount - project.songsCreated,
      this.getRandom(1, 3) // Generate 1-3 songs per month
    );
    
    for (let i = 0; i < songsToGenerate; i++) {
      const song = this.generateSong(project, artist);
      await this.gameData.createSong(song, dbTransaction);
      
      project.songsCreated++;
      summary.changes.push({
        type: 'project_complete',
        description: `Created song: "${song.title}" for ${project.title}`,
        amount: 0
      });
    }
  }
}
```

**2. Quality Calculation Formula:**
```typescript
private generateSong(project: any, artist: any): any {
  // Base quality with randomization
  const baseQuality = 40 + Math.floor(this.getRandom(0, 20));
  
  // Artist mood bonus (-10 to +10)
  const artistMoodBonus = Math.floor(((artist.mood || 50) - 50) * 0.2);
  
  // Producer tier system bonuses
  const producerBonuses = {
    'local': 0,     // Basic equipment
    'regional': 5,  // Professional equipment  
    'national': 12, // Industry connections
    'legendary': 20 // Grammy-level expertise
  };
  const producerBonus = producerBonuses[project.producerTier] || 0;
  
  // Time investment bonuses
  const timeBonuses = {
    'rushed': -10,      // Tight deadlines
    'standard': 0,      // Normal timeline
    'extended': 8,      // Extra polish time
    'perfectionist': 15 // Unlimited refinement
  };
  const timeBonus = timeBonuses[project.timeInvestment] || 0;
  
  // Budget quality bonus with diminishing returns
  const perSongBudget = project.totalCost / project.songCount;
  let budgetQualityBonus = 0;
  
  if (perSongBudget >= 10000) budgetQualityBonus = 25;        // $10k+ luxury
  else if (perSongBudget >= 7500) budgetQualityBonus = 20;    // $7.5k+ high-end
  else if (perSongBudget >= 5000) budgetQualityBonus = 15;    // $5k+ premium
  else if (perSongBudget >= 3500) budgetQualityBonus = 10;    // $3.5k+ optimal
  else if (perSongBudget >= 2500) budgetQualityBonus = 0;     // $2.5k+ viable
  else budgetQualityBonus = -5; // Below $2.5k penalty
  
  // Song count quality impact (diminishing returns for EPs)
  const songCountImpact = Math.pow(0.95, project.songCount - 1); // 5% per additional song
  
  const finalQuality = Math.min(100, Math.max(20, 
    (baseQuality + artistMoodBonus + producerBonus + timeBonus + budgetQualityBonus) * songCountImpact
  ));
  
  return {
    title: this.generateSongName(),
    artistId: project.artistId,
    gameId: project.gameId,
    quality: Math.round(finalQuality),
    genre: artist.genre || 'pop',
    mood: this.generateSongMood(), // upbeat, melancholic, aggressive, chill
    createdMonth: this.gameState.currentMonth,
    producerTier: project.producerTier,
    timeInvestment: project.timeInvestment,
    isRecorded: true,
    isReleased: false,
    metadata: {
      projectId: project.id,
      qualityCalculation: {
        base: baseQuality,
        artistMoodBonus,
        producerBonus, 
        timeBonus,
        budgetQualityBonus,
        songCountImpact,
        final: finalQuality
      },
      economicEfficiency: perSongBudget > 0 ? (finalQuality / (perSongBudget / 1000)).toFixed(2) : 0
    }
  };
}
```

---

## 💿 Albums/EPs (Releases) System

### Release Entity Structure

**Releases Table:**
```sql
CREATE TABLE releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'single', 'ep', 'album', 'compilation'
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  game_id UUID REFERENCES game_states(id) ON DELETE CASCADE,
  
  -- Release timing and economics
  release_month INTEGER,
  total_quality INTEGER DEFAULT 0, -- Aggregate song qualities
  marketing_budget INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned', -- 'planned', 'released', 'catalog'
  
  -- Performance tracking
  revenue_generated INTEGER DEFAULT 0,
  streams_generated INTEGER DEFAULT 0,
  peak_chart_position INTEGER,
  
  metadata JSONB DEFAULT '{}' -- Lead single strategy, marketing channels, etc.
);
```

**Song-Release Junction Table:**
```sql
CREATE TABLE release_songs (
  release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  track_number INTEGER NOT NULL,
  is_single BOOLEAN DEFAULT FALSE, -- Pushed as individual single
  PRIMARY KEY (release_id, song_id)
);
```

### Release Types & Configuration

**Single Releases:**
```json
{
  "songCount": 1,
  "marketingChannels": ["radio", "digital", "influencer"],
  "targetAudience": "mainstream",
  "economicModel": {
    "productionCost": 3000-12000,
    "marketingBudget": 5000-25000,
    "breakEvenStreams": 40000
  }
}
```

**EP Releases (3-5 songs):**
```json
{
  "songCount": 3-5,
  "marketingChannels": ["digital", "pr", "playlist"],
  "targetAudience": "core_fans",
  "economicModel": {
    "productionCost": 15000-35000,
    "marketingBudget": 10000-50000,
    "breakEvenStreams": 120000
  },
  "songCountQualityImpact": 0.95 // 5% quality reduction per additional song
}
```

### Lead Single Strategy System

**Strategy Configuration:**
```typescript
interface LeadSingleStrategy {
  leadSingleId: string;           // Which song to release early
  leadSingleReleaseMonth: number; // 1-3 months before main release
  leadSingleBudget: {             // Marketing spend for lead single
    radio: number;
    digital: number;
    pr: number;
    influencer: number;
  };
  timingBonus: {
    optimal: 1.50,  // 2 months before (50% boost)
    good: 1.30,     // 3 months before (30% boost)
    default: 1.15   // 1 month before (15% boost)
  };
}
```

**Lead Single Processing:**
```typescript
private async processLeadSingles(summary: MonthSummary, dbTransaction?: any): Promise<void> {
  const plannedReleases = await this.gameData.getReleasesByStatus('planned', dbTransaction);
  
  for (const release of plannedReleases) {
    const leadStrategy = release.metadata?.leadSingleStrategy;
    
    if (leadStrategy && leadStrategy.leadSingleReleaseMonth === this.gameState.currentMonth) {
      const leadSong = await this.gameData.getSongById(leadStrategy.leadSingleId);
      const leadBudget = Object.values(leadStrategy.leadSingleBudget).reduce((sum, val) => sum + val, 0);
      
      // Calculate lead single performance
      const initialStreams = this.calculateStreamingOutcome(
        leadSong.quality,
        this.gameState.playlistAccess,
        this.gameState.reputation,
        leadBudget
      );
      
      // Update lead song as released
      await this.gameData.updateSongs([{
        songId: leadSong.id,
        isReleased: true,
        releaseMonth: this.gameState.currentMonth,
        initialStreams: initialStreams,
        totalRevenue: initialStreams * revenuePerStream
      }]);
      
      // Store lead single performance for main release boost
      release.metadata.leadSinglePerformance = {
        streams: initialStreams,
        boostMultiplier: 1.0 + Math.min(0.3, initialStreams / 100000) // 10-30% boost
      };
    }
  }
}
```

---

## 🎬 Recording Sessions (Project Workflow)

### Project Stage Advancement System

**Project Stages:**
```typescript
const projectStages = ['planning', 'production', 'marketing', 'recorded'];

interface Project {
  id: string;
  title: string;
  type: 'Single' | 'EP' | 'Mini-Tour';
  artistId: string;
  stage: string;
  
  // Multi-song support
  songCount: number;      // Target number of songs
  songsCreated: number;   // Songs generated so far
  
  // Economic decisions
  producerTier: 'local' | 'regional' | 'national' | 'legendary';
  timeInvestment: 'rushed' | 'standard' | 'extended' | 'perfectionist';
  budgetPerSong: number;
  totalCost: number;
  
  // Timeline management
  startMonth: number;
  dueMonth: number;
  
  metadata: {
    economicDecisions: {
      originalCost: number;
      finalBudget: number;
      budgetQualityBonus: number;
      songCountQualityImpact: number;
    };
  };
}
```

**Monthly Stage Advancement:**
```typescript
private async advanceProjectStages(summary: MonthSummary, dbTransaction?: any): Promise<void> {
  const projectList = await dbTransaction.select().from(projects).where(eq(projects.gameId, this.gameState.id));
  
  for (const project of projectList) {
    const stages = ['planning', 'production', 'marketing', 'recorded'];
    const currentStageIndex = stages.indexOf(project.stage);
    const monthsElapsed = this.gameState.currentMonth - project.startMonth;
    const isRecordingProject = ['Single', 'EP'].includes(project.type);
    const allSongsCreated = project.songsCreated >= project.songCount;
    
    let shouldAdvance = false;
    let newStage = project.stage;
    
    // Stage advancement logic
    if (project.stage === 'planning' && monthsElapsed >= 1) {
      newStage = 'production';
      shouldAdvance = true;
    } else if (project.stage === 'production' && isRecordingProject && allSongsCreated) {
      newStage = 'marketing';
      shouldAdvance = true;
    } else if (project.stage === 'marketing' && monthsElapsed >= project.dueMonth - project.startMonth) {
      newStage = 'recorded';
      shouldAdvance = true;
    }
    
    if (shouldAdvance) {
      await dbTransaction.update(projects)
        .set({ stage: newStage })
        .where(eq(projects.id, project.id));
      
      summary.changes.push({
        type: 'project_complete',
        description: `${project.title} advanced to ${newStage} stage`,
        amount: 0
      });
    }
  }
}
```

### Recording Session Economics

**Producer Tier System:**
```json
{
  "producer_tier_system": {
    "local": {
      "multiplier": 1.0,
      "unlock_rep": 0,
      "quality_bonus": 0,
      "description": "Local producers with basic equipment"
    },
    "regional": {
      "multiplier": 1.8,
      "unlock_rep": 15,
      "quality_bonus": 5,
      "description": "Professional equipment and experience"
    },
    "national": {
      "multiplier": 3.2,
      "unlock_rep": 35,
      "quality_bonus": 12,
      "description": "Industry connections and top-tier equipment"
    },
    "legendary": {
      "multiplier": 5.5,
      "unlock_rep": 60,
      "quality_bonus": 20,
      "description": "Grammy awards and platinum records"
    }
  }
}
```

**Time Investment Economics:**
```json
{
  "time_investment_system": {
    "rushed": {
      "multiplier": 0.7,
      "duration_modifier": 0.8,
      "quality_bonus": -10,
      "description": "Rushed production to meet tight deadlines"
    },
    "standard": {
      "multiplier": 1.0,
      "duration_modifier": 1.0,
      "quality_bonus": 0,
      "description": "Standard production timeline"
    },
    "extended": {
      "multiplier": 1.4,
      "duration_modifier": 1.3,
      "quality_bonus": 8,
      "description": "Extended production for higher quality"
    },
    "perfectionist": {
      "multiplier": 2.1,
      "duration_modifier": 1.6,
      "quality_bonus": 15,
      "description": "Unlimited time for highest quality"
    }
  }
}
```

**Budget Quality System:**
```json
{
  "budget_quality_system": {
    "calculation_method": "diminishing_returns",
    "max_budget_bonus": 25,
    "per_song_examples": {
      "$1,000_per_song": "Below minimum - quality penalty (-5)",
      "$2,500_per_song": "Minimum viable - no bonus (0)", 
      "$3,500_per_song": "Optimal efficiency - good quality bonus (+10)",
      "$5,000_per_song": "Luxury investment - excellent quality bonus (+15)",
      "$7,500_per_song": "High-end investment - premium quality bonus (+20)",
      "$10,000_per_song": "Diminishing returns begin - maximum quality bonus (+25)"
    }
  }
}
```

---

## 📅 Planned Release System

### Release Planning Interface

**API Endpoints:**
```typescript
// Get artists ready for release
GET /api/game/{gameId}/artists/ready-for-release
Response: {
  artists: Array<{
    id: string;
    name: string;
    readySongsCount: number;
    mood: number;
    loyalty: number;
  }>;
}

// Get artist's ready songs
GET /api/game/{gameId}/artists/{artistId}/songs/ready
Response: {
  songs: Array<{
    id: string;
    title: string;
    quality: number;
    estimatedMetrics: {
      streams: number;
      revenue: number;
      chartPotential: number;
    };
  }>;
}

// Create planned release
POST /api/game/{gameId}/releases
Request: {
  artistId: string;
  selectedSongs: string[];
  releaseType: 'single' | 'ep' | 'album';
  scheduledReleaseMonth: number;
  marketingChannels: {
    radio: number;
    digital: number;
    pr: number;
    influencer: number;
  };
  leadSingleStrategy?: LeadSingleStrategy;
}
```

### Performance Preview System

**Release Performance Calculation:**
```typescript
calculateReleasePreview(releaseConfig: ReleaseConfig): ReleasePreview {
  const songs = releaseConfig.selectedSongs;
  const averageQuality = songs.reduce((sum, song) => sum + song.quality, 0) / songs.length;
  
  // Marketing effectiveness with channel diversity bonus
  const marketingChannels = releaseConfig.marketingChannels;
  const channelCount = Object.values(marketingChannels).filter(budget => budget > 0).length;
  const diversityBonus = Math.min(1.0 + (channelCount - 1) * 0.15, 1.45); // Up to 45% bonus
  
  // Base streaming calculation
  const baseStreams = this.calculateStreamingOutcome(
    averageQuality,
    gameState.playlistAccess,
    gameState.reputation,
    Object.values(marketingChannels).reduce((sum, val) => sum + val, 0)
  );
  
  // Seasonal cost multiplier
  const seasonalMultipliers = { q1: 0.85, q2: 0.95, q3: 0.90, q4: 1.25 };
  const quarter = Math.ceil(releaseConfig.scheduledReleaseMonth / 3);
  const seasonalCostMultiplier = seasonalMultipliers[`q${quarter}`];
  
  // Lead single boost calculation
  let leadSingleBoost = 1.0;
  if (releaseConfig.leadSingleStrategy && releaseConfig.releaseType !== 'single') {
    const timingGap = releaseConfig.scheduledReleaseMonth - releaseConfig.leadSingleStrategy.leadSingleReleaseMonth;
    const timingBonus = timingGap === 2 ? 1.50 : timingGap === 3 ? 1.30 : 1.15;
    const leadBudget = Object.values(releaseConfig.leadSingleStrategy.leadSingleBudget).reduce((sum, val) => sum + val, 0);
    const leadMarketingBonus = 1 + Math.sqrt(leadBudget / 2500) * 0.15;
    leadSingleBoost = timingBonus * leadMarketingBonus;
  }
  
  // Final calculations
  const finalStreams = Math.round(baseStreams * diversityBonus * leadSingleBoost);
  const totalMarketingCost = Object.values(marketingChannels).reduce((sum, val) => sum + val, 0) * seasonalCostMultiplier;
  const finalRevenue = finalStreams * 0.05; // $0.05 per stream
  
  return {
    estimatedStreams: finalStreams,
    estimatedRevenue: finalRevenue,
    totalCost: totalMarketingCost,
    projectedROI: ((finalRevenue - totalMarketingCost) / totalMarketingCost) * 100,
    
    breakdown: {
      baseStreams,
      channelDiversityBonus: diversityBonus,
      leadSingleBoost: leadSingleBoost,
      seasonalCostMultiplier: seasonalCostMultiplier
    },
    
    risks: this.calculateReleaseRisks(releaseConfig, totalMarketingCost, finalRevenue),
    chartPotential: Math.min(100, averageQuality + ((gameState.reputation - 50) / 2)),
    breakEvenPoint: Math.ceil(totalMarketingCost / (finalRevenue / 12))
  };
}
```

### Scheduled Release Execution

**Monthly Release Processing:**
```typescript
private async processPlannedReleases(summary: MonthSummary, dbTransaction?: any): Promise<void> {
  const currentMonth = this.gameState.currentMonth;
  const plannedReleases = await this.gameData.getPlannedReleases(this.gameState.id, currentMonth, dbTransaction);
  
  for (const release of plannedReleases) {
    console.log(`[PLANNED RELEASE] Executing "${release.title}" release`);
    
    // Get all songs for this release
    const releaseSongs = await this.gameData.getSongsByRelease(release.id, dbTransaction);
    const marketingBudget = release.marketingBudget;
    
    let totalStreams = 0;
    let totalRevenue = 0;
    const songUpdates = [];
    
    // Process each song in the release
    for (const song of releaseSongs) {
      // Skip already released songs (lead singles)
      if (song.isReleased) {
        console.log(`[PLANNED RELEASE] Skipping "${song.title}" - already released as lead single`);
        continue;
      }
      
      // Calculate initial streams for this song
      const initialStreams = this.calculateStreamingOutcome(
        song.quality,
        this.gameState.playlistAccess,
        this.gameState.reputation,
        marketingBudget / releaseSongs.length
      );
      
      // Apply lead single boost if applicable
      let boost = 1.0;
      const leadStrategy = release.metadata?.leadSingleStrategy;
      if (leadStrategy) {
        const leadSong = releaseSongs.find(s => s.id === leadStrategy.leadSingleId);
        if (leadSong?.isReleased && leadSong.totalStreams > 0) {
          boost = 1.0 + Math.min(0.3, leadSong.totalStreams / 100000); // 10-30% boost
        }
      }
      
      const boostedStreams = Math.round(initialStreams * boost);
      const initialRevenue = Math.round(boostedStreams * 0.05);
      
      totalStreams += boostedStreams;
      totalRevenue += initialRevenue;
      
      // Prepare song update
      songUpdates.push({
        songId: song.id,
        isReleased: true,
        releaseMonth: currentMonth,
        initialStreams: boostedStreams,
        totalStreams: (song.totalStreams || 0) + boostedStreams,
        totalRevenue: Math.round((song.totalRevenue || 0) + initialRevenue),
        lastMonthRevenue: Math.round(initialRevenue)
      });
    }
    
    // Update all songs in batch
    if (songUpdates.length > 0) {
      await this.gameData.updateSongs(songUpdates, dbTransaction);
    }
    
    // Update release status and performance
    await this.gameData.updateRelease(release.id, {
      status: 'released',
      revenueGenerated: totalRevenue,
      streamsGenerated: totalStreams
    }, dbTransaction);
    
    // Add to summary
    summary.revenue += totalRevenue;
    summary.streams = (summary.streams || 0) + totalStreams;
    summary.changes.push({
      type: 'revenue',
      description: `🚀 "${release.title}" release generated ${totalStreams.toLocaleString()} streams`,
      amount: totalRevenue
    });
  }
}
```

---

## 🔄 System Interconnections & Lifecycle

### Complete Music Creation Flow

**1. Project Creation (Player Action):**
```
Player creates project → Database: Insert project with economic decisions
↓
Project: { stage: 'planning', songCount: 3, producerTier: 'regional', timeInvestment: 'extended' }
```

**2. Monthly Project Advancement (Automatic):**
```
Month 1: planning → production (GameEngine.advanceProjectStages)
Month 2: production → Songs generated (GameEngine.processRecordingProjects)
Month 3: production → marketing (when all songs created)
Month 4: marketing → recorded (project completed)
```

**3. Song Generation (During Production):**
```typescript
// When project reaches production stage
const project = { songCount: 3, producerTier: 'regional', totalCost: 15000 };
const artist = { mood: 75, genre: 'indie' };

// Generate 1-3 songs per month during production
for (let i = 0; i < songsToGenerate; i++) {
  const song = {
    quality: calculateQuality(project, artist), // 40 base + 2 mood + 5 producer + 8 extended + 10 budget = 65
    isRecorded: true,
    isReleased: false,
    metadata: { projectId, qualityCalculation: {...} }
  };
  
  await database.createSong(song);
  project.songsCreated++;
}
```

**4. Release Planning (Player Action):**
```
Player navigates to Plan Release → API: GET /artists/ready-for-release
↓
Select artist + songs → API: POST /releases with marketing budget
↓
Database: Insert planned release with leadSingleStrategy
```

**5. Lead Single Execution (Automatic):**
```
Month 6: Lead single scheduled → GameEngine.processLeadSingles
↓
Update lead song: isReleased = true, generate initial revenue
↓
Store lead performance for main release boost
```

**6. Main Release Execution (Automatic):**
```
Month 8: Main release scheduled → GameEngine.processPlannedReleases  
↓
Process remaining songs with lead single boost
↓
Update release: status = 'released', aggregate performance metrics
```

**7. Ongoing Revenue (Monthly):**
```
Every month: GameEngine.processReleasedProjects
↓
For each released song: Calculate decay revenue (85% monthly decline)
↓
Update individual song metrics, aggregate to monthly summary
```

### Data Relationships & Dependencies

**Project → Songs → Releases Flow:**
```
Projects Table (songCount: 3, songsCreated: 0)
    ↓ (GameEngine song generation)
Songs Table (projectId reference, isRecorded: true)
    ↓ (Player creates release plan)
Releases Table (status: 'planned')
    ↓ (Junction table links)
ReleaseSongs Table (release_id, song_id, track_number)
    ↓ (Scheduled release execution)
Songs Table (isReleased: true, revenue metrics updated)
Releases Table (status: 'released', aggregate performance)
```

**Quality Inheritance Chain:**
```
Project Economic Decisions → Song Quality Calculation → Release Performance → Revenue Generation

Project: {
  producerTier: 'regional',      // +5 quality bonus
  timeInvestment: 'extended',    // +8 quality bonus  
  budgetPerSong: 5000           // +15 quality bonus
}
    ↓
Song: {
  quality: 68,                  // Base 40 + bonuses + artist mood
  metadata: { qualityCalculation: {...} }
}
    ↓
Release: {
  totalQuality: 204,           // Sum of 3 songs
  averageQuality: 68           // Used for streaming calculations
}
    ↓
Revenue: initialStreams = calculateStreamingOutcome(68, access, reputation, marketing)
```

### State Transitions & Validation

**Project State Machine:**
```
planning → production → marketing → recorded
    ↓           ↓           ↓          ↓
 Start      Generate    All Songs   Project
Project     Songs      Created     Complete
```

**Song State Tracking:**
```
Created (isRecorded: false, isReleased: false)
    ↓ (Project reaches production)
Recorded (isRecorded: true, isReleased: false) 
    ↓ (Release planning)
Planned for Release (release_id set)
    ↓ (Scheduled release execution)
Released (isReleased: true, revenue tracking begins)
    ↓ (24 months of decay)
Archived (no ongoing revenue)
```

**Release Status Progression:**
```
planned → released → catalog
   ↓         ↓         ↓
Schedule  Execute   Legacy
Release   Release   Revenue
```

### Economic Validation & Constraints

**Budget Validation:**
```typescript
// Project creation cost validation
const totalCost = songCount * baseCostPerSong * producerMultiplier * timeMultiplier;
if (playerMoney < totalCost) throw new Error('Insufficient funds');

// Release marketing budget validation  
const marketingBudget = Object.values(marketingChannels).reduce((sum, val) => sum + val, 0);
if (playerMoney < marketingBudget) throw new Error('Cannot afford marketing budget');
```

**Quality Constraints:**
```typescript
// Ensure quality stays within bounds
const finalQuality = Math.min(100, Math.max(20, calculatedQuality));

// EP quality diminishing returns
if (songCount > 1) {
  finalQuality *= Math.pow(0.95, songCount - 1); // 5% reduction per additional song
}
```

**Timeline Validation:**
```typescript
// Prevent scheduling conflicts
const existingReleases = await getReleasesForMonth(scheduledReleaseMonth);
if (existingReleases.some(r => r.artistId === artistId)) {
  throw new Error('Artist already has release scheduled for this month');
}

// Lead single timing validation
if (leadSingleStrategy) {
  const gap = scheduledReleaseMonth - leadSingleStrategy.leadSingleReleaseMonth;
  if (gap < 1 || gap > 3) {
    throw new Error('Lead single must be 1-3 months before main release');
  }
}
```

This comprehensive system creates a realistic music production pipeline where economic decisions during recording directly impact song quality, which then determines release performance and long-term revenue generation through sophisticated decay modeling and strategic release timing optimization.