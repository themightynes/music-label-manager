import { ServerGameData } from '../data/gameData';
import { GameState, GameProject, BalanceConfig } from '@shared/types/gameTypes';
import { Artist, MonthlyAction, GameState as DBGameState } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import seedrandom from 'seedrandom';

export class GameEngine {
  constructor(private gameData: ServerGameData) {}

  async advanceMonth(
    gameState: GameState,
    selectedActions: { actionType: string; targetId: string; metadata?: any }[]
  ): Promise<{
    updatedState: GameState;
    revenue: number;
    expenses: number;
    reputationChange: number;
    events: any[];
    monthlyOutcome: any;
  }> {
    // Initialize seeded RNG for consistent results
    const rng = seedrandom(gameState.rngSeed + gameState.currentMonth);
    
    // Get balance configuration
    const balance = await this.gameData.getBalanceConfig();
    
    // Calculate revenue and reputation from selected actions
    let actionRevenue = 0;
    let actionExpenses = 0;
    let reputationChange = 0;
    
    for (const action of selectedActions) {
      const actionResult = await this.processAction(action, gameState, balance, rng);
      actionRevenue += actionResult.revenue;
      actionExpenses += actionResult.expenses;
      reputationChange += actionResult.reputationChange;
    }
    
    // Calculate base monthly expenses
    const monthlyBurn = this.calculateMonthlyBurn(gameState, balance, rng);
    
    // Calculate totals
    const totalRevenue = Math.floor(actionRevenue);
    const totalExpenses = Math.floor(monthlyBurn + actionExpenses);
    const netChange = totalRevenue - totalExpenses;
    const newMoney = gameState.money + netChange;
    const newReputation = Math.max(0, Math.min(100, gameState.reputation + reputationChange));
    const newMonth = gameState.currentMonth + 1;
    
    // Build monthly outcome
    const monthlyOutcome = {
      month: gameState.currentMonth,
      revenue: totalRevenue,
      expenses: totalExpenses,
      netChange: netChange,
      reputationChange: Math.round(reputationChange * 10) / 10,
      actions: selectedActions,
      endingCash: newMoney
    };
    
    // Update game state
    const updatedState: GameState = {
      ...gameState,
      currentMonth: newMonth,
      money: newMoney,
      reputation: newReputation,
      usedFocusSlots: 0, // Reset for new month
      monthlyStats: {
        ...gameState.monthlyStats,
        [`month${gameState.currentMonth}`]: monthlyOutcome
      }
    };
    
    return {
      updatedState,
      revenue: totalRevenue,
      expenses: totalExpenses,
      reputationChange: Math.round(reputationChange * 10) / 10,
      events: [],
      monthlyOutcome
    };
  }

  private async processAction(
    action: { actionType: string; targetId: string; metadata?: any },
    gameState: GameState,
    balance: BalanceConfig,
    rng: () => number
  ): Promise<{ revenue: number; expenses: number; reputationChange: number }> {
    let revenue = 0;
    let expenses = 0;
    let reputationChange = 0;

    // Process different action types
    if (action.actionType === 'project' || ['record-single', 'plan-ep', 'plan-tour'].includes(action.targetId)) {
      // Project actions generate potential revenue but have immediate costs
      const baseRevenue = rng() * 5000 + 2000; // $2k-7k potential
      const baseCost = rng() * 2000 + 1000; // $1k-3k cost
      
      revenue = baseRevenue;
      expenses = baseCost;
      reputationChange = (rng() - 0.5) * 2; // -1 to +1 reputation
    } else {
      // Industry meetings - lower cost, relationship building
      const meetingRevenue = rng() * 3000 + 1000; // $1k-4k potential
      const meetingCost = rng() * 1000 + 500; // $500-1.5k cost
      
      revenue = meetingRevenue;
      expenses = meetingCost;
      reputationChange = (rng() - 0.3) * 1.5; // Slightly positive bias for meetings
    }

    return { revenue, expenses, reputationChange };
  }

  private calculateMonthlyBurn(
    gameState: GameState,
    balance: BalanceConfig,
    rng: () => number
  ): number {
    // Get base burn range from balance config
    const burnRange = balance.economy.monthly_burn_base;
    const baseBurn = burnRange[0] + rng() * (burnRange[1] - burnRange[0]);
    
    // Apply RNG variance
    const variance = balance.economy.rng_variance;
    const rngFactor = variance[0] + rng() * (variance[1] - variance[0]);
    
    return Math.floor(baseBurn * rngFactor);
  }

  async signArtist(
    gameState: GameState,
    artistData: { name: string; archetype: string; metadata?: any }
  ): Promise<Artist> {
    const balance = await this.gameData.getBalanceConfig();
    const signingCost = balance.economy.talent_costs?.developing?.[0] || 5000;
    
    // Check if player has enough money
    if (gameState.money < signingCost) {
      throw new Error('Insufficient funds to sign artist');
    }
    
    const newArtist: Artist = {
      id: crypto.randomUUID(),
      name: artistData.name,
      archetype: artistData.archetype,
      mood: 50,
      loyalty: 50,
      popularity: 0,
      signedMonth: gameState.currentMonth,
      isSigned: true,
      gameId: gameState.id
    };
    
    return newArtist;
  }

  async startProject(
    gameState: GameState,
    projectData: { title: string; type: string; artistId: string; metadata?: any }
  ): Promise<GameProject> {
    const balance = await this.gameData.getBalanceConfig();
    const projectCosts = balance.economy.project_costs[projectData.type.toLowerCase()] || 
                        balance.economy.project_costs.single || { min: 3000, max: 12000 };
    
    // Check if player has enough money for minimum project cost
    if (gameState.money < projectCosts.min) {
      throw new Error('Insufficient funds to start project');
    }
    
    const newProject: GameProject = {
      id: crypto.randomUUID(),
      title: projectData.title,
      type: projectData.type as 'Single' | 'EP' | 'Mini-Tour',
      artistId: projectData.artistId,
      stage: 'planning',
      quality: 0,
      budget: projectCosts.min,
      budgetUsed: 0,
      dueMonth: gameState.currentMonth + 2,
      startMonth: gameState.currentMonth,
      metadata: projectData.metadata || {}
    };
    
    return newProject;
  }

  async updateActionSelection(
    gameState: GameState,
    selectedActions: string[]
  ): Promise<GameState> {
    if (selectedActions.length > gameState.focusSlots) {
      throw new Error(`Too many actions selected. Maximum ${gameState.focusSlots} allowed.`);
    }
    
    return {
      ...gameState,
      usedFocusSlots: selectedActions.length,
      flags: {
        ...gameState.flags,
        selectedActions: selectedActions
      }
    };
  }

  async getGameStateWithRelatedData(gameId: string): Promise<{
    gameState: GameState;
    artists: Artist[];
    projects: GameProject[];
    roles: any[];
    monthlyActions: any[];
  }> {
    // This method will be used by API routes to get complete game data
    // Implementation would fetch from storage interface
    throw new Error('Not implemented - will be handled by storage layer');
  }
}