import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGameStore } from '@/store/gameStore';
import { apiRequest } from '@/lib/queryClient';
import type { EmailRecord, EmailCategory } from '@shared/types/emailTypes';

const VALID_EMAIL_CATEGORIES: EmailCategory[] = ['chart', 'financial', 'artist', 'ar'];

const LEGACY_CATEGORY_MAP: Record<string, EmailCategory> = {
  financial_report: 'financial',
  tier_unlock: 'financial',
  tour_completion: 'artist',
  release: 'artist',
  top_10_debut: 'chart',
  number_one_debut: 'chart',
  artist_discovery: 'ar',
};

export interface EmailListQuery {
  isRead?: boolean;
  category?: EmailCategory;
  week?: number;
  limit?: number;
  offset?: number;
}

export interface EmailListResponse {
  emails: EmailRecord<Record<string, unknown>>[];
  total: number;
  unreadCount: number;
}

function buildQueryString(params: EmailListQuery): string {
  const searchParams = new URLSearchParams();

  if (typeof params.limit === 'number') {
    searchParams.set('limit', String(params.limit));
  }
  if (typeof params.offset === 'number') {
    searchParams.set('offset', String(params.offset));
  }
  if (typeof params.week === 'number') {
    searchParams.set('week', String(params.week));
  }
  if (typeof params.isRead === 'boolean') {
    searchParams.set('isRead', params.isRead ? 'true' : 'false');
  }
  if (params.category) {
    searchParams.set('category', params.category);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
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
    : 'financial';

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
  const memoizedParams = useMemo(() => ({ ...params }), [JSON.stringify(params)]);

  return useQuery<EmailListResponse>({
    queryKey: ['emails', gameId, memoizedParams],
    enabled: Boolean(gameId),
    staleTime: 0, // Always refetch to ensure filters work correctly
    queryFn: async () => {
      if (!gameId) {
        return { emails: [], total: 0, unreadCount: 0 };
      }

      const queryString = buildQueryString(memoizedParams);
      console.log('[useEmails] Fetching emails with params:', memoizedParams);
      console.log('[useEmails] Query string:', queryString);

      const response = await apiRequest('GET', `/api/game/${gameId}/emails${queryString}`);
      const data = await response.json();

      console.log('[useEmails] Received response:', { total: data?.total, emailCount: data?.emails?.length });

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

  return useQuery<{ count: number }>({
    queryKey: ['emails', gameId, 'unread-count'],
    enabled: Boolean(gameId),
    staleTime: 15_000,
    queryFn: async () => {
      if (!gameId) {
        return { count: 0 };
      }

      const response = await apiRequest('GET', `/api/game/${gameId}/emails/unread-count`);
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

      const response = await apiRequest('PATCH', `/api/game/${gameId}/emails/${emailId}/read`, {
        isRead,
      });

      const data = await response.json();
      return normalizeEmail(data?.email);
    },
    onSuccess: () => {
      if (!gameId) return;
      queryClient.invalidateQueries({ queryKey: ['emails', gameId] });
      queryClient.invalidateQueries({ queryKey: ['emails', gameId, 'unread-count'] });
    },
  });
}
