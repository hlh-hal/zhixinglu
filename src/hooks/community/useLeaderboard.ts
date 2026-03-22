import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/apiClient';
import type {
  LeaderboardMe,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardUserEntry,
} from '../../types/community';

export function useLeaderboard(
  period: LeaderboardPeriod,
  metric: LeaderboardMetric,
  date?: string,
  friendsOnly = false,
) {
  return useQuery({
    queryKey: ['community', 'leaderboard', period, metric, date ?? 'current', friendsOnly],
    queryFn: () => {
      const params = new URLSearchParams({
        period,
        metric,
        friends_only: String(friendsOnly),
      });

      if (date) {
        params.set('date', date);
      }

      return get<{
        leaderboard: LeaderboardUserEntry[];
        my_rank: LeaderboardMe | null;
      }>(`/api/community/leaderboard?${params.toString()}`);
    },
  });
}
