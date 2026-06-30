import { apiRequest } from '@/lib/queryClient';

const EMAIL_PAGE_SIZE = 100;

export type EmailSnapshot = {
  emails: any[];
  total: number;
  unreadCount: number;
  truncated: boolean;
};

export async function fetchEmailSnapshot(gameId: string): Promise<EmailSnapshot> {
  const collected: any[] = [];
  let total = 0;
  let unreadCount = 0;
  let offset = 0;
  const MAX_PAGES = 100; // Safety cap: maximum 100 pages (10,000 emails)
  let consecutiveEmptyPages = 0;
  let truncated = false;

  while (true) {
    // Safety check 1: Prevent endless loops with pathological totals
    if (offset >= EMAIL_PAGE_SIZE * MAX_PAGES) {
      console.warn(`[EmailSnapshot] Safety limit reached: exceeded ${MAX_PAGES} pages (${EMAIL_PAGE_SIZE * MAX_PAGES} emails). Stopping pagination.`);
      truncated = true;
      break;
    }

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
      
      // Safety check 2: Warn about potentially inconsistent totals
      if (total > EMAIL_PAGE_SIZE * MAX_PAGES) {
        console.warn(`[EmailSnapshot] Large total count detected: ${total}. This may cause performance issues.`);
      }
    }

    // Safety check 3: Break if server returns zero emails (inconsistent total)
    if (pageEmails.length === 0) {
      consecutiveEmptyPages++;
      if (consecutiveEmptyPages >= 3) {
        console.warn(`[EmailSnapshot] Server returned ${consecutiveEmptyPages} consecutive empty pages. Total may be inconsistent. Stopping pagination.`);
        truncated = true;
        break;
      }
    } else {
      consecutiveEmptyPages = 0;
    }

    collected.push(...pageEmails);

    // Safety check 4: Break if offset growth exceeds reasonable bounds
    if (collected.length >= total && total > 0) {
      break;
    }

    // Safety check 5: Stop if we've collected more emails than the reported total
    if (total > 0 && collected.length > total + EMAIL_PAGE_SIZE) {
      console.warn(`[EmailSnapshot] Collected more emails (${collected.length}) than reported total (${total}). Stopping pagination.`);
      truncated = true;
      break;
    }

    if (pageEmails.length < EMAIL_PAGE_SIZE) {
      break;
    }

    offset += EMAIL_PAGE_SIZE;
  }

  // Final safety: Update total if we collected more than expected
  if (collected.length > total) {
    console.warn(`[EmailSnapshot] Adjusting total from ${total} to ${collected.length} based on actual collection count.`);
    total = collected.length;
  }

  return {
    emails: collected,
    total,
    unreadCount,
    truncated
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
  const fallbackEmailSnapshot: EmailSnapshot = { emails: [], total: 0, unreadCount: 0, truncated: false };

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
