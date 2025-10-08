import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WeekSummary } from '@shared/types/gameTypes'
import { Music, Megaphone, Building } from 'lucide-react'

// These will be implemented in Task 4.2–4.8
import { getTierIcon, triggerUnlockToasts } from '@/utils/unlockToasts'

describe('Tier Unlock Toasts (Task 4.1)', () => {
  let toast: ReturnType<typeof vi.fn>

  beforeEach(() => {
    toast = vi.fn()
  })

  it('getTierIcon returns correct icon components', () => {
    expect(getTierIcon('New playlist access unlocked')).toBe(Music)
    expect(getTierIcon('You unlocked press coverage')).toBe(Megaphone)
    expect(getTierIcon('Venue access upgraded')).toBe(Building)
  })

  it('triggers toast for playlist unlock changes', () => {
    const summary: WeekSummary = {
      week: 10,
      changes: [
        { type: 'unlock', description: 'Playlist Access Upgraded: Niche playlists unlocked!', amount: 0 },
      ],
      revenue: 0,
      expenses: 0,
      reputationChanges: {},
      events: [],
    }

    triggerUnlockToasts(summary, toast)

    expect(toast).toHaveBeenCalledTimes(1)
    const arg = toast.mock.calls[0][0]
    expect(arg.title).toMatch(/New Access Unlocked/i)
    expect(arg.description).toMatch(/Playlist/i)
  })

  it('triggers toast for press unlock changes', () => {
    const summary: WeekSummary = {
      week: 10,
      changes: [
        { type: 'unlock', description: 'Press Access Upgraded: Mid-Tier Press coverage unlocked!', amount: 0 },
      ],
      revenue: 0,
      expenses: 0,
      reputationChanges: {},
      events: [],
    }

    triggerUnlockToasts(summary, toast)

    expect(toast).toHaveBeenCalledTimes(1)
    const arg = toast.mock.calls[0][0]
    expect(arg.title).toMatch(/New Access Unlocked/i)
    expect(arg.description).toMatch(/Press/i)
  })

  it('triggers toast for venue unlock changes', () => {
    const summary: WeekSummary = {
      week: 10,
      changes: [
        { type: 'unlock', description: 'Venue Access Upgraded: Theater Venues unlocked!', amount: 0 },
      ],
      revenue: 0,
      expenses: 0,
      reputationChanges: {},
      events: [],
    }

    triggerUnlockToasts(summary, toast)

    expect(toast).toHaveBeenCalledTimes(1)
    const arg = toast.mock.calls[0][0]
    expect(arg.title).toMatch(/New Access Unlocked/i)
    expect(arg.description).toMatch(/Venue/i)
  })

  it('ignores non-unlock changes', () => {
    const summary: WeekSummary = {
      week: 10,
      changes: [
        { type: 'expense', description: 'Weekly operational costs', amount: -2000 },
      ],
      revenue: 0,
      expenses: 2000,
      reputationChanges: {},
      events: [],
    }

    triggerUnlockToasts(summary, toast)

    expect(toast).not.toHaveBeenCalled()
  })
})
