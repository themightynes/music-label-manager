import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';
import { apiPaths, type EmailListQueryParams } from '@/lib/apiPaths';
import logger from '@/lib/logger';
import type { EmailCategory, EmailRecord } from '@shared/types/emailTypes';

const VALID_EMAIL_CATEGORIES: EmailCategory[] = ['chart', 'financial', 'artist', 'ar', 'other'];

const LEGACY_CATEGORY_MAP: Record<string, EmailCategory> = {
  financial_report: 'financial',
  tier_unlock: 'financial',
  tour_completion: 'artist',
  release: 'artist',
  top_10_debut: 'chart',
  number_one_debut: 'chart',
  artist_discovery: 'ar',
};

const EMAIL_LIST_SCOPE = 'emails:list';
const EMAIL_UNREAD_SCOPE = 'emails:unread-count';

export type EmailListQuery = EmailListQueryParams;

export interface EmailListResponse {
  emails: EmailRecord<Record<string, unknown>>[];
  total: number;
  unreadCount: number;
}

function normalizeEmail(email: any): EmailRecord<Record<string, unknown>> {
  const createdAt = email?.createdAt instanceof Date
    ? email.createdAt.toISOString()
    : typeof email?.createdAt === 'string'
      ? email.createdAt
      : new Date().toISOString();

  const updatedAt = email?.updatedAt instanceof Date
    ? email.updatedAt.toISOString()
    : typeof email?.updatedAt === 'string'
      ? email.updatedAt
      : createdAt;

  const rawCategory = typeof email?.category === 'string' ? email.category : null;
  const mappedCategory = rawCategory ? LEGACY_CATEGORY_MAP[rawCategory] ?? rawCategory : null;
  const category: EmailCategory = mappedCategory && VALID_EMAIL_CATEGORIES.includes(mappedCategory as EmailCategory)
    ? (mappedCategory as EmailCategory)
    : 'other';

  return {
    id: email?.id ?? '',
    gameId: email?.gameId ?? '',
    week: Number(email?.week ?? 0),
    category,
    sender: email?.sender ?? 'System',
    senderRoleId: email?.senderRoleId ?? null,
    subject: email?.subject ?? 'Message',
    preview: email?.preview ?? null,
    body: (email?.body ?? {}) as Record<string, unknown>,
    metadata: (email?.metadata ?? {}) as Record<string, unknown>,
    isRead: Boolean(email?.isRead),
    createdAt,
    updatedAt,
  };
}

export function useEmails(params: EmailListQuery = {}) {
  const gameId = useGameStore((state) => state.gameState?.id);

  const limitFilter = typeof params.limit === 'number' ? params.limit : null;
  const offsetFilter = typeof params.offset === 'number' ? params.offset : null;
  const weekFilter = typeof params.week === 'number' ? params.week : null;
  const isReadFilter = typeof params.isRead === 'boolean' ? params.isRead : null;
  const categoryFilter =
    params.category && VALID_EMAIL_CATEGORIES.includes(params.category)
      ? params.category
      : null;

  const normalizedParams = useMemo<EmailListQueryParams>(() => {
    const next: EmailListQueryParams = {};
    if (limitFilter !== null) next.limit = limitFilter;
    if (offsetFilter !== null) next.offset = offsetFilter;
    if (weekFilter !== null) next.week = weekFilter;
    if (isReadFilter !== null) next.isRead = isReadFilter;
    if (categoryFilter !== null) next.category = categoryFilter;
    return next;
  }, [limitFilter, offsetFilter, weekFilter, isReadFilter, categoryFilter]);

  const queryKey = useMemo(
    () =>
      [
        EMAIL_LIST_SCOPE,
        gameId ?? null,
        limitFilter,
        offsetFilter,
        weekFilter,
        isReadFilter,
        categoryFilter,
      ] as const,
    [gameId, limitFilter, offsetFilter, weekFilter, isReadFilter, categoryFilter],
  );

  return useQuery<EmailListResponse>({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: 0, // Always refetch to ensure filters work correctly
    retry: false,
    queryFn: async () => {
      if (!gameId) {
        return { emails: [], total: 0, unreadCount: 0 };
      }

      const requestUrl = apiPaths.emails.list(gameId, normalizedParams);
      logger.debug('[useEmails] Fetching emails', { requestUrl, params: normalizedParams });

      const response = await apiRequest('GET', requestUrl, undefined, { retry: true });
      const data = await response.json();

      logger.debug('[useEmails] Received response', {
        total: data?.total,
        emailCount: data?.emails?.length,
      });

      return {
        emails: Array.isArray(data?.emails) ? data.emails.map(normalizeEmail) : [],
        total: Number(data?.total ?? 0),
        unreadCount: Number(data?.unreadCount ?? 0),
      };
    },
  });
}

export function useUnreadEmailCount() {
  const gameId = useGameStore((state) => state.gameState?.id);

  const queryKey = useMemo(
    () => [EMAIL_UNREAD_SCOPE, gameId ?? null] as const,
    [gameId],
  );

  return useQuery<{ count: number }>({
    queryKey,
    enabled: Boolean(gameId),
    staleTime: 15_000,
    queryFn: async () => {
      if (!gameId) {
        return { count: 0 };
      }

      const response = await apiRequest('GET', apiPaths.emails.unreadCount(gameId), undefined, {
        retry: true,
      });
      return response.json();
    },
  });
}

export function useMarkEmailRead() {
  const gameId = useGameStore((state) => state.gameState?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailId, isRead }: { emailId: string; isRead: boolean }) => {
      if (!gameId) {
        throw new Error('No game selected');
      }

      const response = await apiRequest(
        'PATCH',
        apiPaths.emails.markRead(gameId, emailId),
        {
        isRead,
        },
      );

      const data = await response.json();
      return normalizeEmail(data?.email);
    },
    onSuccess: () => {
      if (!gameId) return;
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === EMAIL_LIST_SCOPE && query.queryKey[1] === gameId,
      });
      queryClient.invalidateQueries({
        queryKey: [EMAIL_UNREAD_SCOPE, gameId],
      });
    },
  });
}

export function useDeleteEmail() {
  const gameId = useGameStore((state) => state.gameState?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      if (!gameId) {
        throw new Error('No game selected');
      }

      const response = await apiRequest('DELETE', apiPaths.emails.remove(gameId, emailId));
      return response.json();
    },
    onSuccess: () => {
      if (!gameId) return;
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === EMAIL_LIST_SCOPE && query.queryKey[1] === gameId,
      });
      queryClient.invalidateQueries({
        queryKey: [EMAIL_UNREAD_SCOPE, gameId],
      });
    },
  });
}
