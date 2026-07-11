/**
 * Side Events config hook — Mandatory Side Events ("Crisis on the Desk").
 *
 * Surfaces the server-side kill-switch `mandatory_side_events.enabled` so the
 * client can branch between the mandatory crisis-card flow (deferred event
 * occupies a focus slot, gates the advance) and the legacy in-results interactive
 * beat. Read-only, process-wide config — cached with `staleTime: Infinity` (it
 * only changes when a balance JSON is edited + the server restarts).
 *
 * Defaults to `mandatory: true` (the shipped default) while loading / on error so
 * the primary path renders without a flash of the legacy behavior.
 */
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export const SIDE_EVENTS_CONFIG_KEY = ['config:side-events'] as const;

interface SideEventsConfig {
  mandatory: boolean;
}

export function useSideEventsConfig(): SideEventsConfig {
  const { data } = useQuery<SideEventsConfig>({
    queryKey: SIDE_EVENTS_CONFIG_KEY,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/config/side-events');
      return (await response.json()) as SideEventsConfig;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return { mandatory: data?.mandatory ?? true };
}
