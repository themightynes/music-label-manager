import { apiRequest } from '@/lib/queryClient';

const EMAIL_PAGE_SIZE = 100;

export type EmailSnapshot = {
  emails: any[];
  total: number;
  unreadCount: number;
};

export async function fetchEmailSnapshot(gameId: string): Promise<EmailSnapshot> {
  const collected: any[] = [];
  let total = 0;
  let unreadCount = 0;
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      limit: String(EMAIL_PAGE_SIZE),
      offset: String(offset)
    });

    const response = await apiRequest('GET', `/api/game/${gameId}/emails?${params.toString()}`);
    const payload = await response.json();

    const pageEmails = Array.isArray(payload.emails) ? payload.emails : [];

    if (offset === 0) {
      total = typeof payload.total === 'number' ? payload.total : pageEmails.length;
      unreadCount = typeof payload.unreadCount === 'number' ? payload.unreadCount : 0;
    }

    collected.push(...pageEmails);

    if (pageEmails.length < EMAIL_PAGE_SIZE || collected.length >= total) {
      break;
    }

    offset += EMAIL_PAGE_SIZE;
  }

  return {
    emails: collected,
    total,
    unreadCount
  };
}

export async function fetchReleaseSongsSnapshot(gameId: string): Promise<any[]> {
  const response = await apiRequest('GET', `/api/game/${gameId}/release-songs`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

export async function fetchExecutivesSnapshot(gameId: string): Promise<any[]> {
  const response = await apiRequest('GET', `/api/game/${gameId}/executives`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

export async function fetchMoodEventsSnapshot(gameId: string): Promise<any[]> {
  const response = await apiRequest('GET', `/api/game/${gameId}/mood-events`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

export async function fetchSnapshotCollections(gameId: string) {
  const fallbackEmailSnapshot: EmailSnapshot = { emails: [], total: 0, unreadCount: 0 };

  const [emailSnapshot, releaseSongsResult, executivesResult, moodEventsResult] = await Promise.all([ 
    fetchEmailSnapshot(gameId).catch(() => fallbackEmailSnapshot),
    fetchReleaseSongsSnapshot(gameId).catch(() => null),
    fetchExecutivesSnapshot(gameId).catch(() => null),
    fetchMoodEventsSnapshot(gameId).catch(() => null),
  ]);

  return {
    emailSnapshot,
    releaseSongs: releaseSongsResult,
    executives: executivesResult,
    moodEvents: moodEventsResult,
  };
}
