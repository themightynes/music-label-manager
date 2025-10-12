import { describe, it, expect, expectTypeOf } from 'vitest'
import { gameStates } from '../../shared/schema'
import type { TierUnlockHistory, GameState } from '../../shared/types/gameTypes'

// Tests for Task 1.0 (PRD 0001): schema and types for tier unlock history

describe('Tier Unlock History - Schema and Types', () => {
  it('schema: gameStates includes tierUnlockHistory column', () => {
    // Ensure the Drizzle table has the column defined at runtime
    expect(Object.prototype.hasOwnProperty.call(gameStates, 'tierUnlockHistory')).toBe(true)
    // Basic sanity that the column object exists
    // Note: We avoid asserting internal Drizzle properties to keep test resilient across versions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const col: any = (gameStates as any).tierUnlockHistory
    expect(col).toBeDefined()
  })

  it('types: TierUnlockHistory shape matches expected structure', () => {
    const sample: TierUnlockHistory = {
      playlist: { niche: 1, mid: 2, flagship: 3 },
      press: { blogs: 4, mid_tier: 5, national: 6 },
      venue: { clubs: 7, theaters: 8, arenas: 9 },
    }
    expect(sample.playlist?.niche).toBe(1)
    expect(sample.press?.mid_tier).toBe(5)
    expect(sample.venue?.arenas).toBe(9)
  })

  it('types: GameState has tierUnlockHistory of type Record<string, any>', () => {
    expectTypeOf<GameState>().toHaveProperty('tierUnlockHistory').toEqualTypeOf<Record<string, any>>()
  })
})
