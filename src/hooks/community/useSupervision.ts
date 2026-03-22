import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../lib/apiClient';
import type { SupervisionPartnerItem } from '../../types/community';

export function useSupervisionPartners() {
  return useQuery({
    queryKey: ['community', 'supervision', 'partners'],
    queryFn: () =>
      get<{
        partners: SupervisionPartnerItem[];
        max_partners: number;
        current_count: number;
      }>('/api/community/supervision'),
  });
}

export function useAddSupervisionPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { friend_id: string }) =>
      post<{ success: true }>('/api/community/supervision', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'supervision'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'friends'] });
    },
  });
}

export function useConfirmPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => post<{ success: true }>(`/api/community/supervision/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'supervision'] });
    },
  });
}

export function useRemindPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => post<{ success: true }>(`/api/community/supervision/${id}/remind`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'supervision'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
