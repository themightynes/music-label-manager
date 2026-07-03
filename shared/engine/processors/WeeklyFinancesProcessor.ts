/**
 * WeeklyFinancesProcessor — weekly burn / financial-breakdown computation.
 *
 * Phase 2 engine-seams §2 row 3. VERBATIM move of five `GameEngine` methods:
 * `calculateWeeklyBurn`, `calculateWeeklyBurnWithBreakdown`,
 * `calculateWeeklyFinancials`, `generateFinancialBreakdown`, and
 * `generateEconomicInsights`. Each body is preserved character-for-character,
 * with only `this.` rebound to the injected `WeekContext`
 * (`this.financialSystem` → `ctx.financialSystem`, `this.gameState` → `ctx.gameState`,
 * `this.storage` → `ctx.storage`).
 *
 * CRITICAL INVARIANT (plan §2): the SINGLE money-update point stays in
 * `GameEngine.advanceWeek` (the `[FINAL MONEY]` block). These methods only
 * COMPUTE breakdowns; they never mutate `gameState.money`. Nothing here writes money.
 *
 * The processor is stateless — all state flows through the `WeekContext`.
 * Note: `calculateExecutiveSalaries` was already owned by `FinancialSystem`
 * (the engine only ever delegated to it), so it is not part of this move.
 */
import type { WeekContext } from './types';
import type { WeeklyFinancials } from '../game-engine';

export class WeeklyFinancesProcessor {
  /**
   * Calculates weekly operational costs including artist payments
   */
  async calculateWeeklyBurn(ctx: WeekContext): Promise<number> {
    const result = await this.calculateWeeklyBurnWithBreakdown(ctx);
    return result.total;
  }

  /**
   * Calculates weekly operational costs with detailed breakdown for transparency
   */
  // DELEGATED TO FinancialSystem (originally lines 572-617)
  async calculateWeeklyBurnWithBreakdown(ctx: WeekContext): Promise<{
    total: number;
    baseBurn: number;
    artistCosts: number;
    artistDetails: Array<{name: string, weeklyCost: number}>;
  }> {
    return ctx.financialSystem.calculateWeeklyBurnWithBreakdown(
      ctx.gameState.id || '',
      ctx.storage
    );
  }

  /**
   * Generates human-readable financial breakdown string
   */
  generateFinancialBreakdown(ctx: WeekContext, f: WeeklyFinancials): string {
    const parts: string[] = [`$${f.startingBalance.toLocaleString()}`];

    if (f.operations.base > 0) {
      parts.push(`- $${f.operations.base.toLocaleString()} (operations)`);
    }
    if (f.operations.artists > 0) {
      parts.push(`- $${f.operations.artists.toLocaleString()} (artists)`);
    }
    if (f.operations.executives > 0) {
      parts.push(`- $${f.operations.executives.toLocaleString()} (executives)`);
    }
    if (f.operations.signingBonuses > 0) {
      parts.push(`- $${f.operations.signingBonuses.toLocaleString()} (signing bonuses)`);
    }
    if (f.projects.costs > 0) {
      parts.push(`- $${f.projects.costs.toLocaleString()} (projects)`);
    }
    if (f.projects.revenue > 0) {
      parts.push(`+ $${f.projects.revenue.toLocaleString()} (project revenue)`);
    }
    if (f.marketing.costs > 0) {
      parts.push(`- $${f.marketing.costs.toLocaleString()} (marketing)`);
    }
    if (f.roleEffects.costs > 0) {
      parts.push(`- $${f.roleEffects.costs.toLocaleString()} (role costs)`);
    }
    if (f.roleEffects.revenue > 0) {
      parts.push(`+ $${f.roleEffects.revenue.toLocaleString()} (role benefits)`);
    }
    if (f.streamingRevenue > 0) {
      parts.push(`+ $${f.streamingRevenue.toLocaleString()} (streaming)`);
    }

    parts.push(`= $${f.endingBalance.toLocaleString()}`);

    return parts.join(' ');
  }

  /**
   * Generates financial breakdown for display purposes only
   * Does NOT modify game state - that happens at the end of advanceWeek()
   */
  // DELEGATED TO FinancialSystem (originally lines 3126-3172)
  async calculateWeeklyFinancials(ctx: WeekContext, summary: any): Promise<WeeklyFinancials> {
    return ctx.financialSystem.calculateWeeklyFinancials(
      summary,
      ctx.gameState.money || 0
    );
  }

  /**
   * Enhanced weekly summary generation with economic insights
   */
  generateEconomicInsights(ctx: WeekContext): void {
    const { summary } = ctx;
    // Track budget efficiency and strategic decisions for the week
    const projectStartChanges = summary.changes.filter(change =>
      change.type === 'project_complete' && change.description.includes('Started')
    );

    if (projectStartChanges.length > 0) {
      const totalProjectSpend = projectStartChanges.reduce((total, change) =>
        total + Math.abs(change.amount || 0), 0
      );

      summary.changes.push({
        type: 'unlock',
        description: `💰 Weekly project investment: $${totalProjectSpend.toLocaleString()} across ${projectStartChanges.length} project${projectStartChanges.length > 1 ? 's' : ''}`,
        amount: 0
      });
    }

    // Add economic efficiency reporting for ongoing projects
    const ongoingRevenue = summary.changes.filter(change =>
      change.type === 'ongoing_revenue'
    ).reduce((total, change) => total + (change.amount || 0), 0);

    if (ongoingRevenue > 0) {
      summary.changes.push({
        type: 'unlock',
        description: `📈 Catalog revenue efficiency: $${ongoingRevenue.toLocaleString()} from released content`,
        amount: 0
      });
    }

    // Note: Removed efficiency achievement as it serves no gameplay purpose
    // Instead, track reputation gains per release/activity in their respective sections
  }
}
