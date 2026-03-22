import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../lib/apiClient';
import type {
  ChallengeCheckinItem,
  ChallengeDetail,
  ChallengeListItem,
  ChallengeStatus,
  MyChallengeItem,
} from '../../types/community';

export function useChallenges(status: ChallengeStatus | 'all' = 'active') {
  return useQuery({
    queryKey: ['community', 'challenges', 'list', status],
    queryFn: () =>
      get<{ challenges: ChallengeListItem[] }>(`/api/community/challenges?status=${encodeURIComponent(status)}`),
  });
}

export function useMyChallenges() {
  return useQuery({
    queryKey: ['community', 'challenges', 'my'],
    queryFn: () => get<{ challenges: MyChallengeItem[] }>('/api/community/challenges/my'),
  });
}

export function useChallengeDetail(id?: string) {
  return useQuery({
    queryKey: ['community', 'challenges', 'detail', id],
    queryFn: () => get<ChallengeDetail>(`/api/community/challenges/${id}`),
    enabled: Boolean(id),
  });
}

export function useCheckinCalendar(challengeId?: string, userId?: string) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : '';

  return useQuery({
    queryKey: ['community', 'challenges', 'checkins', challengeId, userId ?? 'me'],
    queryFn: () => get<{ checkins: ChallengeCheckinItem[] }>(`/api/community/challenges/${challengeId}/checkins${query}`),
    enabled: Boolean(challengeId),
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) =>
      post<{ success: true }>(`/api/community/challenges/${challengeId}/join`),
    onSuccess: (_data, challengeId) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'challenges', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'challenges', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'challenges', 'detail', challengeId] });
    },
  });
}

export function useCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, note }: { challengeId: string; note?: string }) =>
      post<{ success: true; current_streak: number; total_checkins: number }>(
        `/api/community/challenges/${challengeId}/checkin`,
        { note },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'challenges', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'challenges', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'challenges', 'detail', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'challenges', 'checkins', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'badges'] });
    },
  });
}
