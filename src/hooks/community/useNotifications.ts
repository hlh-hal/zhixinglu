import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, put } from '../../lib/apiClient';
import type { CommunityNotificationItem, FriendshipAction } from '../../types/community';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => get<CommunityNotificationItem[]>('/api/notifications'),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const notifications = await get<CommunityNotificationItem[]>('/api/notifications');
      return notifications.filter((item) => !item.is_read).length;
    },
    refetchInterval: 30 * 1000,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => put<{ success: true }>('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRespondFriendRequestFromNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      friendshipId,
      action,
      notificationId,
    }: {
      friendshipId: string;
      action: FriendshipAction;
      notificationId?: string;
    }) =>
      put<{ success: true }>(`/api/community/friends/requests/${friendshipId}`, { action }).then(async (response) => {
        if (notificationId) {
          await put(`/api/notifications/${notificationId}/read`);
        }
        return response;
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'friends'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'supervision'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'leaderboard'] });
    },
  });
}
