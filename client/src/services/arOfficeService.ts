import { apiRequest } from '../lib/queryClient';
import type { SourcingTypeString } from '@shared/types/gameTypes';

// Start an A&R sourcing operation
export async function startAROfficeOperation(
  gameId: string,
  sourcingType: SourcingTypeString,
  primaryGenre?: string,
  secondaryGenre?: string
) {
  const res = await apiRequest('POST', `/api/game/${gameId}/ar-office/start`, {
    sourcingType,
    primaryGenre,
    secondaryGenre
  });
  return res.json().catch(() => ({}));
}


// Cancel an A&R sourcing operation
export async function cancelAROfficeOperation(gameId: string) {
  const res = await apiRequest('POST', `/api/game/${gameId}/ar-office/cancel`);
  return res.json().catch(() => ({}));
}

// Get current A&R operation status
export async function getAROfficeStatus(gameId: string) {
  const res = await apiRequest('GET', `/api/game/${gameId}/ar-office/status`);
  return res.json();
}


// Sync A&R slot usage with server
export async function syncAROfficeSlots(gameId: string, slotData: {
  usedFocusSlots: number;
  arOfficeSlotUsed: boolean;
  arOfficeSourcingType: SourcingTypeString | null;
}) {
  const res = await apiRequest('PATCH', `/api/game/${gameId}`, slotData);
  return res.json().catch(() => ({}));
}

// Validate slot availability
export async function validateSlotAvailability(gameId: string): Promise<{ available: boolean; used: number; total: number; }>
{
  const res = await apiRequest('GET', `/api/game/${gameId}`);
  const data = await res.json();
  const used = (data?.gameState?.usedFocusSlots ?? 0) as number;
  const total = (data?.gameState?.focusSlots ?? 0) as number;
  return { available: used < total, used, total };
}
