import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { del, get, post } from '../../lib/apiClient';
import type { FeedActivityItem, FeedCommentItem, FeedSort } from '../../types/community';

interface FeedResponse {
  activities: FeedActivityItem[];
  next_cursor: string | null;
}

export function useFeed(sort: FeedSort = 'latest', limit = 20) {
  return useInfiniteQuery({
    queryKey: ['community', 'feed', sort, limit],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        sort,
        limit: String(limit),
      });

      if (pageParam) {
        params.set('cursor', String(pageParam));
      }

      return get<FeedResponse>(`/api/community/feed?${params.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });
}

export function useComments(activityId?: string) {
  return useQuery({
    queryKey: ['community', 'feed', 'comments', activityId],
    queryFn: () => get<{ comments: FeedCommentItem[] }>(`/api/community/feed/${activityId}/comments`),
    enabled: Boolean(activityId),
  });
}

export function useLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId }: { activityId: string }) => {
      const response = await post<{ liked: boolean; like_count: number }>(`/api/community/feed/${activityId}/like`);
      return { activityId, ...response };
    },
    onMutate: async ({ activityId }) => {
      await queryClient.cancelQueries({ queryKey: ['community', 'feed'] });
      const previous = queryClient.getQueriesData<InfiniteData<FeedResponse>>({
        queryKey: ['community', 'feed'],
      });

      queryClient.setQueriesData<InfiniteData<FeedResponse>>(
        { queryKey: ['community', 'feed'] },
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              activities: page.activities.map((activity) => {
                if (activity.id !== activityId) return activity;

                const nextLiked = !activity.is_liked;
                return {
                  ...activity,
                  is_liked: nextLiked,
                  like_count: Math.max(0, activity.like_count + (nextLiked ? 1 : -1)),
                };
              }),
            })),
          };
        },
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: ({ activityId, liked, like_count }) => {
      queryClient.setQueriesData<InfiniteData<FeedResponse>>(
        { queryKey: ['community', 'feed'] },
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              activities: page.activities.map((activity) =>
                activity.id === activityId
                  ? {
                      ...activity,
                      is_liked: liked,
                      like_count,
                    }
                  : activity,
              ),
            })),
          };
        },
      );
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      activityId,
      content,
      parent_comment_id,
    }: {
      activityId: string;
      content: string;
      parent_comment_id?: string;
    }) =>
      post<{ comment: FeedCommentItem }>(`/api/community/feed/${activityId}/comments`, {
        content,
        parent_comment_id,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'feed', 'comments', variables.activityId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'badges'] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: { commentId: string; activityId: string }) =>
      del<{ success: true }>(`/api/community/feed/comments/${commentId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'feed', 'comments', variables.activityId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] });
    },
  });
}
