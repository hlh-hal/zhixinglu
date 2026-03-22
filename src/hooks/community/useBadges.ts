import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../lib/apiClient';
import type { BadgeListItem, BadgeSummary } from '../../types/community';

export function useBadges() {
  return useQuery({
    queryKey: ['community', 'badges'],
    queryFn: () => get<{ badges: BadgeListItem[]; summary: BadgeSummary }>('/api/community/badges'),
  });
}

export function useCheckBadges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      post<{
        newly_unlocked: Array<{
          badge_id: string;
          name: string;
          points: number;
        }>;
      }>('/api/community/badges/check'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'badges'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'leaderboard'] });
    },
  });
}
