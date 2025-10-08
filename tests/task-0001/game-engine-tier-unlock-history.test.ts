import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../../shared/engine/game-engine'

// Task 2.1: Unit tests for tier unlock tracking to verify tierUnlockHistory updates
// These tests call the private updateAccessTiers() via runtime access to focus only on tier logic.

function createMockGameData() {
  const playlist_access = {
    none: { threshold: 0 },
    niche: { threshold: 10 },
    mid: { threshold: 30 },
    flagship: { threshold: 60 },
  }
  const press_access = {
    none: { threshold: 0 },
    blogs: { threshold: 5 },
    mid_tier: { threshold: 20 },
    national: { threshold: 45 },
  }
  const venue_access = {
    none: { threshold: 0, capacity_range: [0, 50], guarantee_multiplier: 0.3 },
    clubs: { threshold: 5, capacity_range: [50, 500], guarantee_multiplier: 0.7 },
    theaters: { threshold: 20, capacity_range: [500, 2000], guarantee_multiplier: 1.0 },
    arenas: { threshold: 45, capacity_range: [2000, 20000], guarantee_multiplier: 1.5 },
  }
  const tourConfig = {
    sell_through_base: 0.15,
    reputation_modifier: 0.05,
    local_popularity_weight: 0.6,
    merch_percentage: 0.15,
    ticket_price_base: 25,
    ticket_price_per_capacity: 0.03,
  }
  return {
    getAccessTiersSync: () => ({ playlist_access, press_access, venue_access }),
    getTourConfigSync: () => tourConfig,
  } as any
}

describe('GameEngine - Tier Unlock History (Task 2.1)', () => {
  let gameData: any
  let baseState: any

  beforeEach(() => {
    gameData = createMockGameData()
    baseState = {
      id: 'game-1',
      currentWeek: 5,
      reputation: 0,
      playlistAccess: 'none',
      pressAccess: 'none',
      venueAccess: 'none',
      flags: {},
    }
  })

  it('initializes tierUnlockHistory when undefined', () => {
    const engine = new GameEngine(baseState, gameData)
    ;(engine as any).updateAccessTiers()

    expect(baseState.tierUnlockHistory).toBeDefined()
  })

  it('records playlist tier unlock week (niche) when upgraded', () => {
    const engine = new GameEngine(baseState, gameData)
    baseState.reputation = 12 // crosses niche threshold (10)

    ;(engine as any).updateAccessTiers()

    expect(baseState.playlistAccess).toBe('niche')
    expect(baseState.tierUnlockHistory?.playlist?.niche).toBe(baseState.currentWeek)
  })

  it('records press tier unlock week (mid_tier) when upgraded', () => {
    const engine = new GameEngine(baseState, gameData)
    baseState.reputation = 25 // crosses mid_tier threshold (20)

    ;(engine as any).updateAccessTiers()

    expect(baseState.pressAccess).toBe('mid_tier')
    expect(baseState.tierUnlockHistory?.press?.mid_tier).toBe(baseState.currentWeek)
  })

  it('records venue tier unlock week (theaters) when upgraded', () => {
    const engine = new GameEngine(baseState, gameData)
    baseState.reputation = 22 // crosses theaters threshold (20)

    ;(engine as any).updateAccessTiers()

    expect(baseState.venueAccess).toBe('theaters')
    expect(baseState.tierUnlockHistory?.venue?.theaters).toBe(baseState.currentWeek)
  })
})
