import { apiRequest } from '@/lib/queryClient';
import type { ArtistDialogueRequest, ArtistDialogueResponse } from '@shared/api/contracts';
import { ArtistDialogueResponseSchema } from '@shared/api/contracts';
import type { DialogueScene } from '@shared/types/gameTypes';

/**
 * Response type for dialogue scenes endpoint
 */
export interface DialogueScenesResponse {
  version: string;
  scenes: DialogueScene[];
}

/**
 * Loads all dialogue scenes from the backend
 * Frontend will randomly select one scene from this list
 */
export async function loadAllDialogues(): Promise<DialogueScene[]> {
  try {
    const response = await apiRequest('GET', '/api/dialogue-scenes');
    const data = await response.json() as DialogueScenesResponse;
    return data.scenes;
  } catch (error) {
    console.error('Failed to load dialogue scenes:', error);
    throw new Error('Failed to load dialogue data');
  }
}

/**
 * Randomly selects one dialogue scene from the provided array
 * Implements frontend-side random selection as per PRD Section 7.3
 */
export function selectRandomDialogue(scenes: DialogueScene[]): DialogueScene {
  if (scenes.length === 0) {
    throw new Error('No dialogue scenes available');
  }

  const randomIndex = Math.floor(Math.random() * scenes.length);
  return scenes[randomIndex];
}

/**
 * Submits the player's choice for an artist dialogue interaction
 * Applies immediate effects and queues delayed effects
 */
export async function submitArtistDialogueChoice(
  gameId: string,
  request: ArtistDialogueRequest
): Promise<ArtistDialogueResponse> {
  try {
    const response = await apiRequest(
      'POST',
      `/api/game/${gameId}/artist-dialogue`,
      request
    );
    return await response.json() as ArtistDialogueResponse;
  } catch (error) {
    console.error('Failed to submit artist dialogue choice:', error);
    throw new Error('Failed to submit dialogue choice');
  }
}
