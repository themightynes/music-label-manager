import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
      // Use apiRequest for consistent auth with Clerk bearer token
      const res = await apiRequest('GET', '/api/me', undefined, { silent401: true });
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useIsAdmin() {
  const { data, isLoading } = useCurrentUser();
  return { isAdmin: !!data?.isAdmin, loading: isLoading };
}
