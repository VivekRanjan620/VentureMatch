import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMe, updateProfileApi, updateCommitmentApi } from './api';
import { useAuthStore } from '../../store/auth';

export const ME_QUERY_KEY = ['me'] as const;

export const useMe = () => {
  const { status } = useAuthStore();

  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled: status === 'signedIn',
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfileApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
};

export const useUpdateCommitment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCommitmentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
};
