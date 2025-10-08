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
// `toast` should be the function imported from '@/hooks/use-toast'
export function triggerUnlockToasts(summary: WeekSummary, toast: (args: { title: React.ReactNode; description?: React.ReactNode }) => unknown) {
  if (!summary?.changes || !Array.isArray(summary.changes)) return

  for (const change of summary.changes) {
    if (change?.type === 'unlock' && change?.description) {
      const desc = change.description
      const low = desc.toLowerCase()
      if (low.includes('playlist') || low.includes('press') || low.includes('venue')) {
        const Icon = getTierIcon(desc)
        toast({
          title: 'New Access Unlocked',
          description: desc,
        })
      }
    }
  }
}
