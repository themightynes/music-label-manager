import React from 'react'
import type { WeekSummary } from '@shared/types/gameTypes'
import { Music, Megaphone, Building } from 'lucide-react'

// Returns the appropriate icon component based on description text
export function getTierIcon(desc: string) {
  const d = desc.toLowerCase()
  if (d.includes('playlist')) return Music
  if (d.includes('press')) return Megaphone
  return Building
}

// Triggers toasts for unlock changes in the provided WeekSummary
// Ensures multiple unlocks are shown sequentially so none are dropped.
// `toast` should be the function imported from '@/hooks/use-toast'
export function triggerUnlockToasts(
  summary: WeekSummary,
  toast: typeof import('@/hooks/use-toast').toast
) {
  if (!summary?.changes || !Array.isArray(summary.changes)) return

  // Filter to tier unlock-related changes
  const unlocks = summary.changes.filter((change) => {
    if (change?.type !== 'unlock' || !change?.description) return false
    const low = change.description.toLowerCase()
    return low.includes('playlist') || low.includes('press') || low.includes('venue')
  })

  if (unlocks.length === 0) return

  // Show sequentially. Use a duration that matches the auto-dismiss, and
  // schedule the next toast slightly after the previous would close.
  const DURATION_MS = 3500
  const GAP_MS = 250

  if (unlocks.length === 1) {
    // Immediate for single unlock (keeps unit tests synchronous)
    const desc = unlocks[0].description as string
    toast({
      title: 'New Access Unlocked',
      description: desc,
      duration: DURATION_MS,
    })
    return
  }

  unlocks.forEach((change, idx) => {
    const desc = (change.description || '') as string
    const delay = idx * (DURATION_MS + GAP_MS)
    setTimeout(() => {
      toast({
        title: 'New Access Unlocked',
        description: desc,
        duration: DURATION_MS,
      })
    }, delay)
  })
}
