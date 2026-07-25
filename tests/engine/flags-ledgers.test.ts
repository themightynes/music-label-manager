import { describe, it, expect } from 'vitest';
import {
  readInventoryLedger,
  readRevenueTransfers,
  processInventoryWeek,
  processRevenueTransfersWeek,
  normalizeTransferFraction,
  PHYSICAL_INVENTORY_DEFAULTS,
  type InventoryLedgerEntry,
  type RevenueTransferEntry,
} from '@shared/engine/flagsLedgers';

/**
 * Engine-verbs arc slice 10 — flags-ledger lifecycle (M9 physical_inventory +
 * M11 revenue_stream_transfer). Pure-function tests, zero DB, zero RNG:
 * determinism is a design requirement (same inputs → same units/money every
 * run), and the absent-ledger no-op guard is the golden-master safety property.
 */

const invEntry = (over: Partial<InventoryLedgerEntry> = {}): InventoryLedgerEntry => ({
  id: 'rel-1-w10',
  releaseId: 'rel-1',
  releaseTitle: 'Test Record',
  artistId: 'artist-1',
  unitsInitial: 1000,
  unitsRemaining: 1000,
  unitCost: 4,
  unitPrice: 12,
  createdWeek: 10,
  ...over,
});

const xferEntry = (over: Partial<RevenueTransferEntry> = {}): RevenueTransferEntry => ({
  releaseId: 'rel-1',
  releaseTitle: 'Test Record',
  fraction: 0.25,
  startWeek: 10,
  endWeek: 35,
  ...over,
});

describe('ledger readers — absent/malformed flags no-op (GM safety guard)', () => {
  it('returns [] for absent, null, non-array, and non-object flags', () => {
    expect(readInventoryLedger(undefined)).toEqual([]);
    expect(readInventoryLedger(null)).toEqual([]);
    expect(readInventoryLedger({})).toEqual([]);
    expect(readInventoryLedger({ inventory: 'nope' })).toEqual([]);
    expect(readInventoryLedger({ inventory: { not: 'an array' } })).toEqual([]);
    expect(readRevenueTransfers({})).toEqual([]);
    expect(readRevenueTransfers({ revenue_transfers: 42 })).toEqual([]);
  });

  it('filters malformed entries and keeps well-formed ones', () => {
    const flags = {
      inventory: [invEntry(), { junk: true }, null, invEntry({ id: 'x2' })],
      revenue_transfers: [xferEntry(), 'garbage', { releaseId: 'r', fraction: 'NaN' }],
    };
    expect(readInventoryLedger(flags)).toHaveLength(2);
    expect(readRevenueTransfers(flags)).toHaveLength(1);
  });
});

describe('processInventoryWeek — deterministic sell-through', () => {
  it('sells round(unitsInitial * base_rate * (1 + awareness/100 * bonus)) at unit_price', () => {
    // 1000 * 0.12 * (1 + 0.5 * 1.0) = 180 units, 180 * $12 = $2160
    const result = processInventoryWeek([invEntry()], 11, { 'rel-1': 50 });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ kind: 'sale', unitsSold: 180, revenue: 2160, soldOut: false });
    expect(result.totalRevenue).toBe(2160);
    expect(result.nextLedger[0].unitsRemaining).toBe(820);
    // unitsInitial is the stable sell-through base — never mutated.
    expect(result.nextLedger[0].unitsInitial).toBe(1000);
  });

  it('is deterministic: identical inputs produce identical outputs', () => {
    const a = processInventoryWeek([invEntry()], 12, { 'rel-1': 33 });
    const b = processInventoryWeek([invEntry()], 12, { 'rel-1': 33 });
    expect(a).toEqual(b);
  });

  it('zero awareness still trickles at the base rate; missing release awareness → 0', () => {
    // 1000 * 0.12 * 1 = 120
    const result = processInventoryWeek([invEntry()], 11, {});
    expect(result.events[0].unitsSold).toBe(120);
  });

  it('floors weekly sales at min_weekly_units so a small run never stalls forever', () => {
    const tiny = invEntry({ unitsInitial: 3, unitsRemaining: 3 });
    // 3 * 0.12 = 0.36 → rounds to 0 → floored to 1
    const result = processInventoryWeek([tiny], 11, {});
    expect(result.events[0].unitsSold).toBe(PHYSICAL_INVENTORY_DEFAULTS.min_weekly_units);
  });

  it('caps at unitsRemaining and drops the entry on sell-out (soldOut: true)', () => {
    const nearlyGone = invEntry({ unitsRemaining: 5 });
    const result = processInventoryWeek([nearlyGone], 11, { 'rel-1': 100 });
    expect(result.events[0]).toMatchObject({ kind: 'sale', unitsSold: 5, soldOut: true });
    expect(result.nextLedger).toHaveLength(0);
  });

  it('writes off remaining units once shelf life is reached (no sale, no money, entry retired)', () => {
    const stale = invEntry({ unitsRemaining: 700 });
    const week = stale.createdWeek + PHYSICAL_INVENTORY_DEFAULTS.shelf_life_weeks;
    const result = processInventoryWeek([stale], week, { 'rel-1': 100 });
    expect(result.events[0]).toMatchObject({ kind: 'write_off', unitsWrittenOff: 700, revenue: 0 });
    expect(result.totalRevenue).toBe(0);
    expect(result.nextLedger).toHaveLength(0);
  });

  it('the week BEFORE shelf life still sells normally', () => {
    const aging = invEntry();
    const week = aging.createdWeek + PHYSICAL_INVENTORY_DEFAULTS.shelf_life_weeks - 1;
    const result = processInventoryWeek([aging], week, {});
    expect(result.events[0].kind).toBe('sale');
  });

  it('no-ops completely on an empty ledger', () => {
    const result = processInventoryWeek([], 11, { 'rel-1': 90 });
    expect(result.events).toEqual([]);
    expect(result.nextLedger).toEqual([]);
    expect(result.totalRevenue).toBe(0);
  });

  it('honors config knob overrides', () => {
    const result = processInventoryWeek([invEntry()], 11, {}, {
      base_weekly_sell_rate: 0.5,
      awareness_sell_rate_bonus_max: 0,
    });
    expect(result.events[0].unitsSold).toBe(500);
  });
});

describe('processRevenueTransfersWeek — weekly sold-share deduction', () => {
  it('deducts round(fraction * this week\'s release revenue) while active', () => {
    const result = processRevenueTransfersWeek([xferEntry()], 12, { 'rel-1': 4001 });
    expect(result.deductions).toHaveLength(1);
    expect(result.deductions[0].amount).toBe(1000); // round(0.25 * 4001)
    expect(result.totalDeducted).toBe(1000);
    expect(result.nextLedger).toHaveLength(1);
  });

  it('a release that earned nothing this week deducts nothing (share of actuals, no floor)', () => {
    const result = processRevenueTransfersWeek([xferEntry()], 12, {});
    expect(result.deductions).toEqual([]);
    expect(result.nextLedger).toHaveLength(1); // still active for future weeks
  });

  it('is inactive before startWeek and after endWeek', () => {
    const early = processRevenueTransfersWeek([xferEntry({ startWeek: 20 })], 12, { 'rel-1': 1000 });
    expect(early.deductions).toEqual([]);
    const late = processRevenueTransfersWeek([xferEntry({ endWeek: 11 })], 12, { 'rel-1': 1000 });
    expect(late.deductions).toEqual([]);
  });

  it('collects its final cut ON endWeek, then retires the entry (concluded)', () => {
    const entry = xferEntry({ endWeek: 12 });
    const result = processRevenueTransfersWeek([entry], 12, { 'rel-1': 1000 });
    expect(result.deductions[0].amount).toBe(250);
    expect(result.concluded).toHaveLength(1);
    expect(result.nextLedger).toHaveLength(0);
  });

  it('no-ops completely on an empty ledger', () => {
    const result = processRevenueTransfersWeek([], 12, { 'rel-1': 99999 });
    expect(result).toMatchObject({ nextLedger: [], deductions: [], concluded: [], totalDeducted: 0 });
  });
});

describe('normalizeTransferFraction — authored-value normalization + clamp', () => {
  it('reads values in (0,1) as a fraction', () => {
    expect(normalizeTransferFraction(0.25)).toBe(0.25);
  });

  it('reads values >= 1 as percent (authoring convenience)', () => {
    expect(normalizeTransferFraction(25)).toBe(0.25);
  });

  it('clamps to max_fraction from either form', () => {
    expect(normalizeTransferFraction(0.9)).toBe(0.5);
    expect(normalizeTransferFraction(90)).toBe(0.5);
    expect(normalizeTransferFraction(0.9, { max_fraction: 0.3 })).toBe(0.3);
  });

  it('returns 0 (caller no-ops) for non-positive or invalid input', () => {
    expect(normalizeTransferFraction(0)).toBe(0);
    expect(normalizeTransferFraction(-5)).toBe(0);
    expect(normalizeTransferFraction(NaN)).toBe(0);
    expect(normalizeTransferFraction(Infinity)).toBe(0);
  });
});
