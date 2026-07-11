/**
 * Mandatory Side Events ("Crisis on the Desk") — client derivation.
 *
 * Reads the pending crisis off the gameState spine (`flags.pending_side_event`),
 * the kill-switch (`useSideEventsConfig`), and the player's picked resolution
 * (store `pendingSideEventChoice`) and returns the derived slot/gate state every
 * consumer needs. A pending crisis ALWAYS occupies one focus slot while
 * unresolved-on-the-server (picking a choice does not free the slot — it only
 * satisfies the advance gate).
 */
import { useGameState } from '@/hooks/useGameState';
import { useGameStore } from '@/store/gameStore';
import { useSideEventsConfig } from '@/hooks/useSideEventsConfig';
import type { EventChoice, SideEventCategory } from '@shared/types/gameTypes';

export interface PendingCrisis {
  eventId: string;
  week: number;
  prompt?: string;
  category?: SideEventCategory;
  choices?: EventChoice[];
}

export interface CrisisSideEventState {
  /** Kill-switch is on AND a crisis is pending on the spine. */
  crisisActive: boolean;
  /** The pending crisis payload (richer shape carries prompt/category/choices). */
  crisis: PendingCrisis | null;
  /** Player has picked a resolution for THIS crisis this session. */
  choicePicked: boolean;
  /** The picked choiceId (matching this crisis), or null. */
  chosenChoiceId: string | null;
  /** Extra focus slot consumed by the crisis (0 or 1). */
  crisisSlotUsed: number;
  /** Advance must be blocked: crisis active but no resolution picked yet. */
  blocksAdvance: boolean;
}

export function useCrisisSideEvent(): CrisisSideEventState {
  const { mandatory } = useSideEventsConfig();
  const pending = useGameState((gs) => (gs?.flags as any)?.pending_side_event) as PendingCrisis | undefined;
  const pick = useGameStore((s) => s.pendingSideEventChoice);

  const crisisActive = mandatory && !!pending?.eventId;
  const crisis = crisisActive ? (pending as PendingCrisis) : null;
  const choicePicked = crisisActive && pick?.eventId === crisis!.eventId;

  return {
    crisisActive,
    crisis,
    choicePicked,
    chosenChoiceId: choicePicked ? pick!.choiceId : null,
    crisisSlotUsed: crisisActive ? 1 : 0,
    blocksAdvance: crisisActive && !choicePicked,
  };
}
