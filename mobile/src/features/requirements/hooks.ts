import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  browseRequirementsApi,
  getRequirementByIdApi,
  getMyRequirementsApi,
  createRequirementApi,
  updateRequirementStatusApi,
  expressInterestApi,
  getSentInterestsApi,
  BrowseParams,
} from './api';
import { RequirementStatusType } from './types';
import { useAuthStore } from '../../store/auth';

export const REQUIREMENTS_QUERY_KEY = ['requirements'] as const;
export const MY_REQUIREMENTS_QUERY_KEY = ['my-requirements'] as const;
export const SENT_INTERESTS_QUERY_KEY = ['my-interests'] as const;

export const useInfiniteRequirements = (params: BrowseParams) => {
  const { status } = useAuthStore();

  return useInfiniteQuery({
    queryKey: [...REQUIREMENTS_QUERY_KEY, params],
    queryFn: ({ pageParam }) =>
      browseRequirementsApi({
        ...params,
        cursor: pageParam as string | undefined,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: status === 'signedIn',
    staleTime: 1000 * 60 * 2,
  });
};

export const useRequirementDetail = (id: string) => {
  const { status } = useAuthStore();

  return useQuery({
    queryKey: ['requirement', id],
    queryFn: () => getRequirementByIdApi(id),
    enabled: status === 'signedIn' && Boolean(id),
  });
};

export const useMyRequirements = () => {
  const { status } = useAuthStore();

  return useQuery({
    queryKey: MY_REQUIREMENTS_QUERY_KEY,
    queryFn: getMyRequirementsApi,
    enabled: status === 'signedIn',
  });
};

export const useCreateRequirement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRequirementApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_REQUIREMENTS_QUERY_KEY });
    },
  });
};

export const useUpdateRequirementStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequirementStatusType }) =>
      updateRequirementStatusApi(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_REQUIREMENTS_QUERY_KEY });
    },
  });
};

export const useSentInterests = () => {
  const { status } = useAuthStore();

  return useQuery({
    queryKey: SENT_INTERESTS_QUERY_KEY,
    queryFn: getSentInterestsApi,
    enabled: status === 'signedIn',
  });
};

export const useExpressInterest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: expressInterestApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SENT_INTERESTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: REQUIREMENTS_QUERY_KEY });
    },
  });
};
