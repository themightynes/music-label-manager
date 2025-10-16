import { apiRequest } from '../lib/queryClient';
import type { Executive, RoleMeeting, DialogueChoice, GameRole } from '../../../shared/types/gameTypes';

export async function fetchAllRoles(): Promise<GameRole[]> {
  try {
    // Use the existing roles API endpoints to get all role data
    const roleIds = ['ceo', 'head_ar', 'cco', 'cmo', 'head_distribution'];
    const rolePromises = roleIds.map(roleId =>
      apiRequest('GET', `/api/roles/${roleId}`).then(res => res.json()).catch(() => null)
    );

    const roleResults = await Promise.all(rolePromises);
    return roleResults.filter(role => role !== null);
  } catch (error) {
    console.error('Failed to fetch all roles:', error);
    throw error;
  }
}

export async function fetchExecutives(gameId: string): Promise<Executive[]> {
  try {
    const response = await apiRequest('GET', `/api/game/${gameId}/executives`);
    const dbExecutives = (await response.json()) as Array<Executive & Record<string, unknown>>;

    // Add CEO executive since player is the CEO but CEO has meetings/decisions
    // CEO is not stored in database but should be available for meetings
    const ceoExecutive: Executive = {
      id: 'ceo',
      role: 'ceo',
      level: 0, // CEO has no level - they are the player
      mood: 0, // CEO has no mood - they are the player
      loyalty: 0 // CEO has no loyalty - they are the player
    };

    const executives = dbExecutives.map(exec => ({
      ...exec,
      id: exec.id,
    })) as Executive[];

    // Define consistent executive display order
    const roleOrder = ['ceo', 'head_ar', 'cmo', 'cco', 'head_distribution'];

    // Sort all executives by the defined order
    const allExecutives = [ceoExecutive, ...executives];
    const sortedExecutives = allExecutives.sort((a, b) => {
      const orderA = roleOrder.indexOf(a.role);
      const orderB = roleOrder.indexOf(b.role);
      // If role not found in order, put it at the end
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });

    return sortedExecutives;
  } catch (error) {
    console.error('Failed to fetch executives:', error);
    throw error;
  }
}

export async function fetchRoleMeetings(roleId: string): Promise<RoleMeeting[]> {
  try {
    // Use the proper API endpoint that loads from roles.json and actions.json
    const response = await apiRequest('GET', `/api/roles/${roleId}`);
    const roleData = await response.json();

    // The API should return meetings from actions.json filtered by role_id
    // Transform the action data to our RoleMeeting format
    const meetings = (roleData.meetings || []).map((action: any) => ({
      id: action.id,
      name: action.name, // Display name from actions.json (e.g., "CEO: Artist Roundtable")
      prompt: action.prompt,
      prompt_before_selection: action.prompt_before_selection,
      target_scope: action.target_scope || 'global', // Default to 'global' if missing
      choices: action.choices || []
    }));

    return meetings;
  } catch (error) {
    console.error('Failed to fetch role meetings:', error);
    // Don't return mock data - let the error propagate so we can see what's wrong
    throw error;
  }
}

export async function fetchMeetingDialogue(roleId: string, meetingId: string): Promise<{
  prompt: string;
  choices: DialogueChoice[];
}> {
  try {
    // Use the proper API endpoint that loads specific meeting from actions.json
    const response = await apiRequest('GET', `/api/roles/${roleId}/meetings/${meetingId}`);
    const meetingData = await response.json();

    return {
      prompt: meetingData.prompt,
      choices: meetingData.choices || []
    };
  } catch (error) {
    console.error('Failed to fetch meeting dialogue from API:', error);
    // Don't return mock data - let the error propagate so we can see what's wrong
    throw error;
  }
}

export async function processExecutiveAction(
  gameId: string,
  execId: string,
  actionData: {
    roleId: string;
    actionId: string;
    choiceId: string;
  }
): Promise<any> {
  try {
    const response = await apiRequest('POST', `/api/game/${gameId}/executive/${execId}/action`, actionData);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to process executive action:', error);
    throw error;
  }
}