import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { ReceivedInterestCard } from '../../src/features/requests/components/ReceivedInterestCard';
import { SentInterestCard } from '../../src/features/requests/components/SentInterestCard';
import { ConnectionCard } from '../../src/features/requests/components/ConnectionCard';
import {
  useInfiniteReceivedInterests,
  useInfiniteSentInterests,
  useInfiniteConnections,
  useUpdateInterestStatus,
} from '../../src/features/requests/hooks';
import {
  ReceivedInterestItem,
  SentInterestItem,
  ConnectionItem,
  InterestStatusType,
  InterestActionType,
} from '../../src/api/types';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { ApiError } from '../../src/lib/errors';

type SegmentType = 'received' | 'sent' | 'connections';

export default function RequestsScreen() {
  const [activeSegment, setActiveSegment] = useState<SegmentType>('received');
  const [receivedStatusFilter, setReceivedStatusFilter] = useState<InterestStatusType | undefined>('PENDING');
  const [sentStatusFilter, setSentStatusFilter] = useState<InterestStatusType | undefined>(undefined);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // 1. Received Interests
  const {
    data: receivedData,
    isLoading: isReceivedLoading,
    isError: isReceivedError,
    error: receivedError,
    refetch: refetchReceived,
    isRefetching: isReceivedRefetching,
    fetchNextPage: fetchNextReceived,
    hasNextPage: hasNextReceived,
    isFetchingNextPage: isFetchingNextReceived,
  } = useInfiniteReceivedInterests(receivedStatusFilter);

  // 2. Sent Interests
  const {
    data: sentData,
    isLoading: isSentLoading,
    isError: isSentError,
    error: sentError,
    refetch: refetchSent,
    isRefetching: isSentRefetching,
    fetchNextPage: fetchNextSent,
    hasNextPage: hasNextSent,
    isFetchingNextPage: isFetchingNextSent,
  } = useInfiniteSentInterests(sentStatusFilter);

  // 3. Connections
  const {
    data: connectionsData,
    isLoading: isConnLoading,
    isError: isConnError,
    error: connError,
    refetch: refetchConnections,
    isRefetching: isConnRefetching,
    fetchNextPage: fetchNextConnections,
    hasNextPage: hasNextConnections,
    isFetchingNextPage: isFetchingNextConn,
  } = useInfiniteConnections();

  const updateStatusMutation = useUpdateInterestStatus();

  // Refetch active segment data on screen focus
  useFocusEffect(
    useCallback(() => {
      if (activeSegment === 'received') refetchReceived();
      else if (activeSegment === 'sent') refetchSent();
      else if (activeSegment === 'connections') refetchConnections();
    }, [activeSegment, refetchReceived, refetchSent, refetchConnections])
  );

  // Refetch active segment data on AppState active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (activeSegment === 'received') refetchReceived();
        else if (activeSegment === 'sent') refetchSent();
        else if (activeSegment === 'connections') refetchConnections();
      }
    });
    return () => subscription.remove();
  }, [activeSegment, refetchReceived, refetchSent, refetchConnections]);

  // Flatten and deduplicate lists by ID
  const receivedList = useMemo(() => {
    if (!receivedData?.pages) return [];
    const map = new Map<string, ReceivedInterestItem>();
    for (const page of receivedData.pages) {
      if (page?.items) {
        for (const item of page.items) {
          if (item?.id && !map.has(item.id)) map.set(item.id, item);
        }
      }
    }
    return Array.from(map.values());
  }, [receivedData]);

  const sentList = useMemo(() => {
    if (!sentData?.pages) return [];
    const map = new Map<string, SentInterestItem>();
    for (const page of sentData.pages) {
      if (page?.items) {
        for (const item of page.items) {
          if (item?.id && !map.has(item.id)) map.set(item.id, item);
        }
      }
    }
    return Array.from(map.values());
  }, [sentData]);

  const connectionsList = useMemo(() => {
    if (!connectionsData?.pages) return [];
    const map = new Map<string, ConnectionItem>();
    for (const page of connectionsData.pages) {
      if (page?.items) {
        for (const item of page.items) {
          if (item?.id && !map.has(item.id)) map.set(item.id, item);
        }
      }
    }
    return Array.from(map.values());
  }, [connectionsData]);

  const handleAction = useCallback(
    async (id: string, action: InterestActionType) => {
      setActionPendingId(id);
      setServerError(null);
      try {
        await updateStatusMutation.mutateAsync({ id, action });
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 409 || err.code === 'INVALID_TRANSITION') {
            // Already handled on server, refetch automatically handled by hook mutation
            setServerError(err.message || 'Already updated');
          } else {
            setServerError(err.message);
          }
        } else {
          setServerError('Failed to update status. Please try again.');
        }
      } finally {
        setActionPendingId(null);
      }
    },
    [updateStatusMutation]
  );

  const renderReceivedItem = useCallback(
    ({ item }: { item: ReceivedInterestItem }) => (
      <ReceivedInterestCard
        item={item}
        onAction={handleAction}
        isActionPending={actionPendingId === item.id}
      />
    ),
    [handleAction, actionPendingId]
  );

  const renderSentItem = useCallback(
    ({ item }: { item: SentInterestItem }) => (
      <SentInterestCard
        item={item}
        onAction={handleAction}
        isActionPending={actionPendingId === item.id}
      />
    ),
    [handleAction, actionPendingId]
  );

  const renderConnectionItem = useCallback(
    ({ item }: { item: ConnectionItem }) => <ConnectionCard item={item} />,
    []
  );

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Interests & Requests</Text>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.segmentPill, activeSegment === 'received' && styles.segmentPillActive]}
          onPress={() => {
            setServerError(null);
            setActiveSegment('received');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeSegment === 'received' }}
        >
          <Text style={[styles.segmentText, activeSegment === 'received' && styles.segmentTextActive]}>
            Received
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.segmentPill, activeSegment === 'sent' && styles.segmentPillActive]}
          onPress={() => {
            setServerError(null);
            setActiveSegment('sent');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeSegment === 'sent' }}
        >
          <Text style={[styles.segmentText, activeSegment === 'sent' && styles.segmentTextActive]}>
            Sent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.segmentPill, activeSegment === 'connections' && styles.segmentPillActive]}
          onPress={() => {
            setServerError(null);
            setActiveSegment('connections');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeSegment === 'connections' }}
        >
          <Text style={[styles.segmentText, activeSegment === 'connections' && styles.segmentTextActive]}>
            Connections
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Pills for Received Segment */}
      {activeSegment === 'received' && (
        <View style={styles.filterPillRow}>
          {[
            { label: 'Pending', value: 'PENDING' },
            { label: 'Maybe later', value: 'LATER' },
            { label: 'Accepted', value: 'ACCEPTED' },
            { label: 'Declined', value: 'DECLINED' },
            { label: 'All', value: undefined },
          ].map((pill) => {
            const isActive = receivedStatusFilter === pill.value;
            return (
              <TouchableOpacity
                key={pill.label}
                activeOpacity={0.8}
                onPress={() => setReceivedStatusFilter(pill.value as InterestStatusType | undefined)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Filter Pills for Sent Segment */}
      {activeSegment === 'sent' && (
        <View style={styles.filterPillRow}>
          {[
            { label: 'All', value: undefined },
            { label: 'Pending', value: 'PENDING' },
            { label: 'Maybe later', value: 'LATER' },
            { label: 'Accepted', value: 'ACCEPTED' },
            { label: 'Declined', value: 'DECLINED' },
            { label: 'Withdrawn', value: 'WITHDRAWN' },
          ].map((pill) => {
            const isActive = sentStatusFilter === pill.value;
            return (
              <TouchableOpacity
                key={pill.label}
                activeOpacity={0.8}
                onPress={() => setSentStatusFilter(pill.value as InterestStatusType | undefined)}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ErrorText message={serverError} />

      {/* Segment Content */}
      {activeSegment === 'received' && (
        <View style={styles.listContainer}>
          {isReceivedLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : isReceivedError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>
                {receivedError instanceof ApiError ? receivedError.message : 'Failed to load received requests'}
              </Text>
              <Button title="Retry" onPress={() => refetchReceived()} style={styles.retryBtn} />
            </View>
          ) : (
            <FlashList
              data={receivedList}
              renderItem={renderReceivedItem}
              keyExtractor={(item: ReceivedInterestItem) => item.id}
              {...({ estimatedItemSize: 220 } as any)}
              onRefresh={refetchReceived}
              refreshing={isReceivedRefetching}
              onEndReached={() => {
                if (hasNextReceived && !isFetchingNextReceived) {
                  fetchNextReceived();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextReceived ? (
                  <View style={styles.footerSpinner}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No interests found</Text>
                  <Text style={styles.emptySubtitle}>
                    {receivedStatusFilter
                      ? `No ${receivedStatusFilter.toLowerCase()} interests right now.`
                      : 'No interests yet. Candidates who tap Interested on your requirements appear here.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeSegment === 'sent' && (
        <View style={styles.listContainer}>
          {isSentLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : isSentError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>
                {sentError instanceof ApiError ? sentError.message : 'Failed to load sent interests'}
              </Text>
              <Button title="Retry" onPress={() => refetchSent()} style={styles.retryBtn} />
            </View>
          ) : (
            <FlashList
              data={sentList}
              renderItem={renderSentItem}
              keyExtractor={(item: SentInterestItem) => item.id}
              {...({ estimatedItemSize: 180 } as any)}
              onRefresh={refetchSent}
              refreshing={isSentRefetching}
              onEndReached={() => {
                if (hasNextSent && !isFetchingNextSent) {
                  fetchNextSent();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextSent ? (
                  <View style={styles.footerSpinner}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No sent interests</Text>
                  <Text style={styles.emptySubtitle}>
                    You haven't expressed interest in any requirements yet.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeSegment === 'connections' && (
        <View style={styles.listContainer}>
          {isConnLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : isConnError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>
                {connError instanceof ApiError ? connError.message : 'Failed to load connections'}
              </Text>
              <Button title="Retry" onPress={() => refetchConnections()} style={styles.retryBtn} />
            </View>
          ) : (
            <FlashList
              data={connectionsList}
              renderItem={renderConnectionItem}
              keyExtractor={(item: ConnectionItem) => item.id}
              {...({ estimatedItemSize: 150 } as any)}
              onRefresh={refetchConnections}
              refreshing={isConnRefetching}
              onEndReached={() => {
                if (hasNextConnections && !isFetchingNextConn) {
                  fetchNextConnections();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextConn ? (
                  <View style={styles.footerSpinner}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No connections yet</Text>
                  <Text style={styles.emptySubtitle}>
                    When you accept candidate interests, active connections will appear here.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.ground,
    borderRadius: radius.input,
    padding: 3,
    marginBottom: spacing.xs,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radius.input - 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: colors.surface,
    elevation: 1,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
  filterPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  filterPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 32,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  filterPillTextActive: {
    color: colors.surface,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
  listContainer: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    minWidth: 120,
  },
  footerSpinner: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
