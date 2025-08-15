import { ServerGameData } from '../data/gameData';
import { GameState, GameProject } from '@shared/types/gameTypes';
import { Artist, MonthlyAction } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

export class GameEngine {
  constructor(private gameData: ServerGameData) {}

  async advanceMonth(
    gameState: GameState,
    selectedActions: MonthlyAction[]
  ): Promise<{
    updatedState: GameState;
    revenue: number;
    expenses: number;
    events: any[];
  }> {
    // Move ALL logic from /api/advance-month here
    // Include balance.json calculations
    const balance = await this.gameData.getBalanceConfig();
    
    // Calculate revenue using balance formulas
    let revenue = 0;
    for (const action of selectedActions) {
      if (action.actionType === 'project') {
        // Use actual balance.json values
        const projectConfig = balance.economy.project_costs.single || { min: 3000, max: 12000 };
        revenue += projectConfig.min + (Math.random() * (projectConfig.max - projectConfig.min));
      } else if (action.actionType === 'marketing') {
        const marketingConfig = balance.economy.marketing_costs.basic || { min: 1000, max: 5000 };
        revenue += marketingConfig.min + (Math.random() * (marketingConfig.max - marketingConfig.min)) * 0.5;
      }
    }
    
    // Calculate expenses
    const expenses = await this.calculateMonthlyExpenses(gameState, balance);
    
    // Update game state
    const newMonth = gameState.currentMonth + 1;
    const newMoney = gameState.money + revenue - expenses;
    
    return {
      updatedState: {
        ...gameState,
        currentMonth: newMonth,
        money: newMoney,
        monthlyStats: {
          ...gameState.monthlyStats,
          [`month${newMonth}`]: {
            revenue,
            expenses,
            netIncome: revenue - expenses,
            endingCash: newMoney
          }
        }
      },
      revenue,
      expenses,
      events: []
    };
  }

  private async calculateMonthlyExpenses(gameState: GameState, balance: any): Promise<number> {
    // Implement expense calculations from balance.json
    const burnRange = balance.economy.monthly_burn_base;
    const baseBurn = burnRange[0] + Math.random() * (burnRange[1] - burnRange[0]);
    
    // Apply RNG variance
    const variance = balance.economy.rng_variance;
    const rngFactor = variance[0] + Math.random() * (variance[1] - variance[0]);
    
    return Math.floor(baseBurn * rngFactor);
  }

  async signArtist(gameState: GameState, artistData: any): Promise<any> {
    // Move artist signing logic here
    const balance = await this.gameData.getBalanceConfig();
    const signingCost = balance.economy.talent_costs?.developing?.[0] || 5000;
    
    const newArtist = {
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

  async startProject(gameState: GameState, projectData: any): Promise<GameProject> {
    // Move project creation logic here
    const balance = await this.gameData.getBalanceConfig();
    const projectCosts = balance.economy.project_costs[projectData.type.toLowerCase()] || 
                        balance.economy.project_costs.single;
    
    const newProject: GameProject = {
      id: crypto.randomUUID(),
      title: projectData.title,
      type: projectData.type,
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
}