/**
 * flagsLedgers — the two flags-JSONB ledgers of the engine-verbs arc (Tier 2
 * slice 10: M9 physical_inventory + M11 revenue_stream_transfer, MVPs).
 *
 * SUBSTRATE RULE (engine-verbs plan, design principles): flags JSONB is the
 * substrate — NO new tables, NO SNAPSHOT_VERSION bump. Both ledgers are
 * additive array keys on gameState.flags:
 *   - flags.inventory:          InventoryLedgerEntry[]   (physical pressings)
 *   - flags.revenue_transfers:  RevenueTransferEntry[]   (sold catalog shares)
 *
 * The weekly pass functions here are PURE (arrays + config in, results out —
 * no ctx, no storage, no RNG): the caller (ReleaseProcessor.processReleasedProjects,
 * the streaming/financial site) supplies this week's release awareness / revenue
 * maps and applies the returned money to the WeekSummary. Determinism is a
 * design choice (plan: "prefer deterministic"): sell-through is a fixed
 * awareness-scaled rate, zero RNG draws, so the engine's seeded stream is
 * untouched and golden-master scenarios without ledgers stay byte-identical.
 *
 * GUARD RULE: every reader tolerates absent/malformed flags — a game that never
 * ran these verbs pays zero cost and produces zero output.
 */

export interface InventoryLedgerEntry {
  /** Deterministic id: `${releaseId}-w${createdWeek}` (suffixed on collision). */
  id: string;
  releaseId: string;
  releaseTitle: string;
  artistId?: string;
  /** Units originally pressed (the sell-through base — rate is % of this). */
  unitsInitial: number;
  unitsRemaining: number;
  unitCost: number;
  unitPrice: number;
  createdWeek: number;
}

export interface RevenueTransferEntry {
  releaseId: string;
  releaseTitle: string;
  /** Sold share of the release's weekly streaming revenue, 0 < fraction <= max. */
  fraction: number;
  startWeek: number;
  /** Inclusive last week the deduction applies. */
  endWeek: number;
}

export interface PhysicalInventoryConfig {
  unit_cost?: number;
  unit_price?: number;
  base_weekly_sell_rate?: number;
  awareness_sell_rate_bonus_max?: number;
  min_weekly_units?: number;
  shelf_life_weeks?: number;
  max_units_per_grant?: number;
}

export interface RevenueTransferConfig {
  max_fraction?: number;
  default_weeks?: number;
}

// HARDCODED fallbacks mirror data/balance/markets.json market_formulas.* — the
// JSON knobs are authoritative; these only cover stub contexts (unit tests).
export const PHYSICAL_INVENTORY_DEFAULTS: Required<PhysicalInventoryConfig> = {
  unit_cost: 4,
  unit_price: 12,
  base_weekly_sell_rate: 0.12,
  awareness_sell_rate_bonus_max: 1.0,
  min_weekly_units: 1,
  shelf_life_weeks: 12,
  max_units_per_grant: 20000,
};

export const REVENUE_TRANSFER_DEFAULTS: Required<RevenueTransferConfig> = {
  max_fraction: 0.5,
  default_weeks: 26,
};

/** Tolerant reader: returns [] unless flags.inventory is a well-formed array. */
export function readInventoryLedger(flags: unknown): InventoryLedgerEntry[] {
  const raw = (flags as any)?.inventory;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e: any) =>
      e &&
      typeof e === 'object' &&
      typeof e.releaseId === 'string' &&
      typeof e.unitsRemaining === 'number' &&
      typeof e.unitsInitial === 'number' &&
      typeof e.createdWeek === 'number'
  );
}

/** Tolerant reader: returns [] unless flags.revenue_transfers is well-formed. */
export function readRevenueTransfers(flags: unknown): RevenueTransferEntry[] {
  const raw = (flags as any)?.revenue_transfers;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e: any) =>
      e &&
      typeof e === 'object' &&
      typeof e.releaseId === 'string' &&
      typeof e.fraction === 'number' &&
      typeof e.startWeek === 'number' &&
      typeof e.endWeek === 'number'
  );
}

export interface InventoryWeekEvent {
  kind: 'sale' | 'write_off';
  entry: InventoryLedgerEntry;
  unitsSold: number;
  revenue: number;
  /** sale only: true when this sale emptied the pressing. */
  soldOut?: boolean;
  /** write_off only: units scrapped (cost was sunk at grant time — no new money). */
  unitsWrittenOff?: number;
}

export interface InventoryWeekResult {
  /** Entries that survive into next week (unitsRemaining > 0, not expired). */
  nextLedger: InventoryLedgerEntry[];
  events: InventoryWeekEvent[];
  totalRevenue: number;
}

/**
 * One deterministic weekly sell-through step over the inventory ledger.
 *
 * sold = round(unitsInitial * base_weekly_sell_rate
 *              * (1 + awareness/100 * awareness_sell_rate_bonus_max)),
 * floored at min_weekly_units while stock remains, capped at unitsRemaining.
 * awareness = releaseAwareness[releaseId] (the release's best song awareness
 * this week; missing → 0, the pressing still trickles at the floor rate).
 *
 * Expiry check runs FIRST: an entry older than shelf_life_weeks writes off its
 * remaining units as a one-time event and leaves the ledger (no sale that week).
 */
export function processInventoryWeek(
  ledger: InventoryLedgerEntry[],
  currentWeek: number,
  releaseAwareness: Record<string, number>,
  config?: PhysicalInventoryConfig
): InventoryWeekResult {
  const cfg = { ...PHYSICAL_INVENTORY_DEFAULTS, ...(config || {}) };
  const nextLedger: InventoryLedgerEntry[] = [];
  const events: InventoryWeekEvent[] = [];
  let totalRevenue = 0;

  for (const entry of ledger) {
    if (entry.unitsRemaining <= 0) continue; // defensive: dead entry, drop silently

    // Shelf-life expiry: write off everything left, one-time, no money movement
    // (manufacturing cost was charged at grant time).
    if (currentWeek - entry.createdWeek >= cfg.shelf_life_weeks) {
      events.push({
        kind: 'write_off',
        entry,
        unitsSold: 0,
        revenue: 0,
        unitsWrittenOff: entry.unitsRemaining,
      });
      continue;
    }

    const awareness = Math.max(0, Math.min(100, releaseAwareness[entry.releaseId] ?? 0));
    const rateMultiplier = 1 + (awareness / 100) * cfg.awareness_sell_rate_bonus_max;
    let sold = Math.round(entry.unitsInitial * cfg.base_weekly_sell_rate * rateMultiplier);
    sold = Math.max(cfg.min_weekly_units, sold); // guaranteed progress toward sell-out
    sold = Math.min(sold, entry.unitsRemaining);

    const revenue = sold * entry.unitPrice;
    totalRevenue += revenue;
    const remaining = entry.unitsRemaining - sold;

    events.push({
      kind: 'sale',
      entry,
      unitsSold: sold,
      revenue,
      soldOut: remaining <= 0,
    });

    if (remaining > 0) {
      nextLedger.push({ ...entry, unitsRemaining: remaining });
    }
  }

  return { nextLedger, events, totalRevenue };
}

export interface TransferWeekDeduction {
  entry: RevenueTransferEntry;
  amount: number;
}

export interface TransferWeekResult {
  /** Entries still active after this week (currentWeek < endWeek). */
  nextLedger: RevenueTransferEntry[];
  deductions: TransferWeekDeduction[];
  /** Entries whose term ended this week (surfaced as a quiet notice). */
  concluded: RevenueTransferEntry[];
  totalDeducted: number;
}

/**
 * One weekly revenue-stream-transfer step: for each active entry
 * (startWeek <= currentWeek <= endWeek), deduct round(fraction * this week's
 * streaming revenue for that release). Releases that earned nothing this week
 * deduct nothing (the buyer collects a share of actuals, never a floor).
 */
export function processRevenueTransfersWeek(
  ledger: RevenueTransferEntry[],
  currentWeek: number,
  perReleaseRevenue: Record<string, number>,
  _config?: RevenueTransferConfig
): TransferWeekResult {
  const nextLedger: RevenueTransferEntry[] = [];
  const deductions: TransferWeekDeduction[] = [];
  const concluded: RevenueTransferEntry[] = [];
  let totalDeducted = 0;

  for (const entry of ledger) {
    const active = currentWeek >= entry.startWeek && currentWeek <= entry.endWeek;
    if (active) {
      const releaseRevenue = perReleaseRevenue[entry.releaseId] ?? 0;
      const amount = Math.max(0, Math.round(entry.fraction * releaseRevenue));
      if (amount > 0) {
        deductions.push({ entry, amount });
        totalDeducted += amount;
      }
    }

    if (currentWeek >= entry.endWeek) {
      concluded.push(entry); // term over — retire the entry after this week's cut
    } else {
      nextLedger.push(entry);
    }
  }

  return { nextLedger, deductions, concluded, totalDeducted };
}

/**
 * Normalize an authored transfer fraction: values >= 1 are read as PERCENT
 * (authoring convenience — most content values are integers), then clamped to
 * (0, max_fraction]. Returns 0 for non-positive/invalid input (caller no-ops).
 */
export function normalizeTransferFraction(
  value: number,
  config?: RevenueTransferConfig
): number {
  const cfg = { ...REVENUE_TRANSFER_DEFAULTS, ...(config || {}) };
  if (!Number.isFinite(value) || value <= 0) return 0;
  const fraction = value >= 1 ? value / 100 : value;
  return Math.min(cfg.max_fraction, fraction);
}
