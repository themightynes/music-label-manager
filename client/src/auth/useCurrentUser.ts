import { useQuery } from '@tanstack/react-query';

export type MeResponse = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: {
    id: string;
    email: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export function useCurrentUser() {
  return useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch /api/me');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useIsAdmin() {
  const { data, isLoading } = useCurrentUser();
  return { isAdmin: !!data?.isAdmin, loading: isLoading };
}
