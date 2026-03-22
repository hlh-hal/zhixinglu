import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post, put } from '../../lib/apiClient';
import type {
  FriendListItem,
  FriendRequestItem,
  FriendSearchUser,
  FriendshipAction,
} from '../../types/community';

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [value, delay]);

  return debounced;
}

export function useFriendSearch(keyword: string) {
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 300);

  return useQuery({
    queryKey: ['community', 'friends', 'search', debouncedKeyword],
    queryFn: () =>
      get<{ users: FriendSearchUser[] }>(
        `/api/community/friends/search?keyword=${encodeURIComponent(debouncedKeyword)}`,
      ),
    enabled: debouncedKeyword.length > 0,
    placeholderData: { users: [] },
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ['community', 'friends', 'requests'],
    queryFn: () => get<{ requests: FriendRequestItem[] }>('/api/community/friends/requests'),
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ['community', 'friends', 'list'],
    queryFn: () => get<{ friends: FriendListItem[] }>('/api/community/friends'),
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { addressee_id: string; message?: string }) =>
      post<{ success: true }>('/api/community/friends/request', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'friends'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: FriendshipAction }) =>
      put<{ success: true }>(`/api/community/friends/requests/${id}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'friends'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'supervision'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'leaderboard'] });
    },
  });
}

export function useDeleteFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => del<{ success: true }>(`/api/community/friends/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'friends'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'supervision'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'leaderboard'] });
    },
  });
}
