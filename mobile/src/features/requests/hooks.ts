import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReceivedInterestsApi,
  getSentInterestsListApi,
  updateInterestStatusApi,
  getConnectionsApi,
  getConnectionDetailApi,
  shareContactApi,
  getMeCountsApi,
} from '../../api/requests';
import { InterestActionType, InterestStatusType } from '../../api/types';
import { useAuthStore } from '../../store/auth';
import { ApiError } from '../../lib/errors';

export const RECEIVED_INTERESTS_QUERY_KEY = 'received-interests';
export const SENT_INTERESTS_LIST_QUERY_KEY = 'sent-interests';
export const CONNECTIONS_QUERY_KEY = 'connections';
export const CONNECTION_DETAIL_QUERY_KEY = 'connection-detail';
export const COUNTS_QUERY_KEY = 'counts';

export const useInfiniteReceivedInterests = (
  status?: InterestStatusType,
  requirementId?: string
) => {
  const { status: authStatus } = useAuthStore();

  return useInfiniteQuery({
    queryKey: [RECEIVED_INTERESTS_QUERY_KEY, { status, requirementId }],
    queryFn: ({ pageParam }) =>
      getReceivedInterestsApi({
        status,
        requirementId,
        cursor: pageParam as string | undefined,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: authStatus === 'signedIn',
    staleTime: 30000,
    refetchOnMount: 'always',
  });
};

export const useInfiniteSentInterests = (status?: InterestStatusType) => {
  const { status: authStatus } = useAuthStore();

  return useInfiniteQuery({
    queryKey: [SENT_INTERESTS_LIST_QUERY_KEY, { status }],
    queryFn: ({ pageParam }) =>
      getSentInterestsListApi({
        status,
        cursor: pageParam as string | undefined,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: authStatus === 'signedIn',
    staleTime: 30000,
    refetchOnMount: 'always',
  });
};

export const useInfiniteConnections = () => {
  const { status: authStatus } = useAuthStore();

  return useInfiniteQuery({
    queryKey: [CONNECTIONS_QUERY_KEY],
    queryFn: ({ pageParam }) =>
      getConnectionsApi({
        cursor: pageParam as string | undefined,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: authStatus === 'signedIn',
    staleTime: 30000,
    refetchOnMount: 'always',
  });
};

export const useConnectionDetail = (id: string) => {
  const { status: authStatus } = useAuthStore();

  return useQuery({
    queryKey: [CONNECTION_DETAIL_QUERY_KEY, id],
    queryFn: () => getConnectionDetailApi(id),
    enabled: authStatus === 'signedIn' && Boolean(id),
    staleTime: 30000,
    refetchOnMount: 'always',
  });
};

export const useMeCounts = () => {
  const { status: authStatus } = useAuthStore();

  return useQuery({
    queryKey: [COUNTS_QUERY_KEY],
    queryFn: getMeCountsApi,
    enabled: authStatus === 'signedIn',
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchInterval: 60000,
  });
};

export const useUpdateInterestStatus = () => {
  const queryClient = useQueryClient();

  const invalidateAllInterestQueries = () => {
    queryClient.invalidateQueries({ queryKey: [RECEIVED_INTERESTS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [SENT_INTERESTS_LIST_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ['my-interests'] });
    queryClient.invalidateQueries({ queryKey: [CONNECTIONS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [CONNECTION_DETAIL_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [COUNTS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ['requirements'] });
  };

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: InterestActionType }) => {
      try {
        return await updateInterestStatusApi(id, action);
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 409 || err.code === 'INVALID_TRANSITION')) {
          // Treat 409 INVALID_TRANSITION as already handled, refetch all lists
          invalidateAllInterestQueries();
        }
        throw err;
      }
    },
    onSuccess: () => {
      invalidateAllInterestQueries();
    },
  });
};

export const useShareContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => shareContactApi(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [CONNECTIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONNECTION_DETAIL_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: [COUNTS_QUERY_KEY] });
    },
  });
};
