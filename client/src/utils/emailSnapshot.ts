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
  let serverReportedTotal = 0;
  let unreadCount = 0;
  let offset = 0;
  const MAX_PAGES = 100; // Safety cap: maximum 100 pages (10,000 emails)
  let truncated = false;

  // Page through the inbox until a SHORT page is returned. A page is "short"
  // when it has fewer than EMAIL_PAGE_SIZE rows, which means there is nothing
  // left to fetch. This single condition handles both the last partial page
  // and a fully empty page (offset past the end), so there are no wasted
  // round trips on inconsistent/over-reported totals. The MAX_PAGES cap is the
  // ONLY thing that flags a snapshot as truncated.
  for (let page = 0; ; page++) {
    // Hard cap: a genuine cap hit means the snapshot is genuinely incomplete.
    if (page >= MAX_PAGES) {
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
      serverReportedTotal = typeof payload.total === 'number' ? payload.total : pageEmails.length;
      unreadCount = typeof payload.unreadCount === 'number' ? payload.unreadCount : 0;
    }

    collected.push(...pageEmails);

    // A short page means we have reached the end of the inbox.
    if (pageEmails.length < EMAIL_PAGE_SIZE) {
      break;
    }

    offset += EMAIL_PAGE_SIZE;
  }

  // The actual collected count is authoritative; the server `total` is only an
  // estimate and is never used to terminate the loop. Log a sanity warning if
  // they disagree, but do NOT treat a disagreement as a truncated snapshot.
  if (serverReportedTotal !== collected.length) {
    console.warn(`[EmailSnapshot] Server-reported total (${serverReportedTotal}) disagreed with collected count (${collected.length}). Using collected count.`);
  }

  return {
    emails: collected,
    total: collected.length,
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
