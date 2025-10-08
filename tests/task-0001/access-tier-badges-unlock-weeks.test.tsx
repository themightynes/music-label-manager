import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { AccessTierBadges } from '@/components/AccessTierBadges'
import type { GameState, TierUnlockHistory } from '@shared/types/gameTypes'

function buildGameState(overrides: Partial<GameState> = {}, history?: TierUnlockHistory): GameState {
  const base: GameState = {
    id: 'test-game',
    currentWeek: 10,
    money: 100000,
    reputation: 35,
    creativeCapital: 0,
    focusSlots: 3,
    usedFocusSlots: 0,
    arOfficeSlotUsed: false,
    arOfficeSourcingType: null,
    arOfficePrimaryGenre: null,
    arOfficeSecondaryGenre: null,
    arOfficeOperationStart: null,
    playlistAccess: 'mid',
    pressAccess: 'mid_tier',
    venueAccess: 'theaters',
    campaignType: 'Balanced',
    rngSeed: 'seed',
    flags: {},
    weeklyStats: {},
    tierUnlockHistory: history,
  }
  return { ...base, ...overrides }
}

function clickExpandByIndex(index: number) {
  const buttons = screen.getAllByRole('button')
  // Assumes first three buttons are info toggles for playlist, press, venue (in that order)
  fireEvent.click(buttons[index])
}

describe('AccessTierBadges - Unlock Week Display (Task 3.1)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('shows "Unlocked Week X" for playlist tiers with history when expanded', () => {
    const history: TierUnlockHistory = {
      playlist: { niche: 5, mid: 9 },
    }
    const gs = buildGameState({}, history)

    render(<AccessTierBadges gameState={gs} />)

    // Expand Playlist section (index 0)
    clickExpandByIndex(0)

    // Expect progression path visible
    expect(screen.getByText(/Progression Path/i)).toBeInTheDocument()

    // Should show unlock week for Niche and Mid tiers
    expect(screen.getByText(/Unlocked Week 5/i)).toBeInTheDocument()
    expect(screen.getByText(/Unlocked Week 9/i)).toBeInTheDocument()
  })

  it('shows "Unlocked Week X" for press tiers with history when expanded', () => {
    const history: TierUnlockHistory = {
      press: { blogs: 7, mid_tier: 12 },
    }
    const gs = buildGameState({}, history)

    render(<AccessTierBadges gameState={gs} />)

    // Expand Press section (index 1)
    clickExpandByIndex(1)

    expect(screen.getByText(/Progression Path/i)).toBeInTheDocument()
    expect(screen.getByText(/Unlocked Week 7/i)).toBeInTheDocument()
    expect(screen.getByText(/Unlocked Week 12/i)).toBeInTheDocument()
  })

  it('shows "Unlocked Week X" for venue tiers with history when expanded', () => {
    const history: TierUnlockHistory = {
      venue: { clubs: 3, theaters: 8 },
    }
    const gs = buildGameState({}, history)

    render(<AccessTierBadges gameState={gs} />)

    // Expand Venue section (index 2)
    clickExpandByIndex(2)

    expect(screen.getByText(/Progression Path/i)).toBeInTheDocument()
    expect(screen.getByText(/Unlocked Week 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Unlocked Week 8/i)).toBeInTheDocument()
  })

  it('does not show unlock text for tiers without history', () => {
    const history: TierUnlockHistory = {
      playlist: { niche: 5 },
      press: {},
      venue: {},
    }
    const gs = buildGameState({}, history)

    render(<AccessTierBadges gameState={gs} />)

    // Expand Playlist and assert only the provided week appears
    clickExpandByIndex(0)
    expect(screen.getByText(/Unlocked Week 5/i)).toBeInTheDocument()
    // Some other week numbers should not appear
    expect(screen.queryByText(/Unlocked Week 2/i)).toBeNull()
    expect(screen.queryByText(/Unlocked Week 10/i)).toBeNull()
  })
})
