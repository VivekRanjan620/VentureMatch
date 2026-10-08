import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import BottomSheet from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { RequirementCard } from '../../src/features/requirements/components/RequirementCard';
import { FilterBottomSheet } from '../../src/features/requirements/components/FilterBottomSheet';
import {
  useInfiniteRequirements,
  useSentInterests,
  useExpressInterest,
} from '../../src/features/requirements/hooks';
import { useRequirementFilterStore } from '../../src/features/requirements/store';
import { useMe } from '../../src/features/profile/hooks';
import { RequirementSummaryItem, FilterState } from '../../src/features/requirements/types';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { ApiError } from '../../src/lib/errors';

export default function DiscoverScreen() {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const flashListRef = useRef<any>(null);

  const { data: meData } = useMe();
  const { data: sentInterestsData } = useSentInterests();
  const expressInterestMutation = useExpressInterest();

  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
  } = useRequirementFilterStore();

  const [sortTab, setSortTab] = useState<'match' | 'recent'>('match');
  const [searchInput, setSearchInput] = useState<string>(searchQuery);
  const [expressingId, setExpressingId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Debounce search input -> searchQuery
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchQuery]);

  // Combine search query + filters + sort mode for React Query
  const queryParams = useMemo(
    () => ({
      sort: sortTab,
      q: searchQuery,
      ...filters,
    }),
    [sortTab, searchQuery, filters]
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteRequirements(queryParams);

  // Refetch requirements on screen focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Refetch requirements on app foregrounding
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refetch();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [refetch]);

  // Flatten infinite query pages into single list
  const requirementsList = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages
      .flatMap((page) => page?.items || page?.requirements || [])
      .filter((item): item is RequirementSummaryItem => Boolean(item && item.id));
  }, [data]);

  // Set of requirement IDs user has already expressed interest in
  const sentInterestRequirementIds = useMemo(() => {
    if (!sentInterestsData?.interests) return new Set<string>();
    return new Set(
      sentInterestsData.interests
        .filter((item) => Boolean(item && item.requirementId))
        .map((item) => item.requirementId)
    );
  }, [sentInterestsData]);

  // Reset pagination & scroll to top when sort/filters change
  useEffect(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [sortTab, searchQuery, filters]);

  const handleOpenFilters = () => {
    bottomSheetRef.current?.expand();
  };

  const handleCloseFilters = () => {
    bottomSheetRef.current?.close();
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleExpressInterest = useCallback(
    async (requirementId: string) => {
      setExpressingId(requirementId);
      setServerError(null);
      try {
        await expressInterestMutation.mutateAsync(requirementId);
      } catch (err: any) {
        if (err instanceof ApiError) {
          if (err.status === 409) {
            // Treat 409 conflict as already sent
            sentInterestRequirementIds.add(requirementId);
          } else if (err.status === 403) {
            Alert.alert(
              'Profile Incomplete',
              'Please complete your profile and commitment details before expressing interest.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') },
              ]
            );
          } else if (err.code === 'DAILY_LIMIT_REACHED' || err.status === 429) {
            setServerError("You have reached today's limit, try again tomorrow");
          } else if (err.status === 404) {
            setServerError('This requirement is no longer available');
          } else {
            setServerError(err.message);
          }
        } else {
          setServerError('Failed to send interest. Please try again.');
        }
      } finally {
        setExpressingId(null);
      }
    },
    [expressInterestMutation, sentInterestRequirementIds, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: RequirementSummaryItem }) => {
      if (!item || !item.id) return null;
      const hasSent = sentInterestRequirementIds.has(item.id);
      return (
        <RequirementCard
          item={item}
          hasSentInterest={hasSent}
          onExpressInterest={handleExpressInterest}
          isExpressingInterest={expressingId === item.id}
        />
      );
    },
    [sentInterestRequirementIds, handleExpressInterest, expressingId]
  );

  const isProfileIncomplete =
    !meData?.user?.profileComplete || !meData?.user?.commitmentComplete;
  const isAllUnscored =
    sortTab === 'match' &&
    requirementsList.length > 0 &&
    requirementsList.every((item) => item?.score === null || item?.score === undefined);

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requirements</Text>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <TextField
            placeholder="Search requirements or skills..."
            value={searchInput}
            onChangeText={setSearchInput}
            containerStyle={styles.searchTextFieldContainer}
            style={styles.searchInput}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchInput('')}
              style={styles.clearSearchBtn}
            >
              <Ionicons name="close-circle" size={18} color={colors.mutedText} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleOpenFilters}
          style={[
            styles.filterBtn,
            activeFilterCount > 0 && styles.filterBtnActive,
          ]}
        >
          <Ionicons
            name="options"
            size={20}
            color={activeFilterCount > 0 ? colors.surface : colors.primary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Segmented Pill Tabs: For You vs Browse All */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.segmentPill, sortTab === 'match' && styles.segmentPillActive]}
          onPress={() => setSortTab('match')}
        >
          <Text
            style={[
              styles.segmentText,
              sortTab === 'match' && styles.segmentTextActive,
            ]}
          >
            For You
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.segmentPill, sortTab === 'recent' && styles.segmentPillActive]}
          onPress={() => setSortTab('recent')}
        >
          <Text
            style={[
              styles.segmentText,
              sortTab === 'recent' && styles.segmentTextActive,
            ]}
          >
            Browse All
          </Text>
        </TouchableOpacity>
      </View>

      <ErrorText message={serverError} />

      {/* Incomplete Profile Banner on For You Tab */}
      {sortTab === 'match' && (isProfileIncomplete || isAllUnscored) && (
        <View style={styles.unscoredBanner}>
          <Text style={styles.unscoredBannerTitle}>
            💡 Complete your profile to see recommendation scores
          </Text>
          <Text style={styles.unscoredBannerSubtitle}>
            Add your skills and commitment preferences to view personalized recommendation scores for each requirement.
          </Text>
          <Button
            title="Complete Profile"
            variant="secondary"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.unscoredBannerBtn}
          />
        </View>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading requirements...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error instanceof ApiError ? error.message : 'Failed to load requirements.'}
          </Text>
          <Button title="Retry" onPress={() => refetch()} style={styles.retryBtn} />
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlashList
            ref={flashListRef}
            data={requirementsList}
            renderItem={renderItem}
            keyExtractor={(item: RequirementSummaryItem) => item.id}
            {...({ estimatedItemSize: 200 } as any)}
            onRefresh={refetch}
            refreshing={isRefetching}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.footerSpinner}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No Requirements Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || activeFilterCount > 0
                    ? 'Try clearing your search query or adjusting your filters.'
                    : 'Check back later for new co-founder requirements.'}
                </Text>
                {(searchQuery || activeFilterCount > 0) && (
                  <Button
                    title="Clear filters"
                    variant="outline"
                    onPress={() => {
                      setSearchInput('');
                      setSearchQuery('');
                      resetFilters();
                    }}
                    style={styles.resetSearchBtn}
                  />
                )}
              </View>
            }
          />
        </View>
      )}

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        ref={bottomSheetRef}
        initialFilters={filters}
        onApply={handleApplyFilters}
        onReset={resetFilters}
        onClose={handleCloseFilters}
      />
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  searchTextFieldContainer: {
    marginBottom: 0,
  },
  searchInput: {
    paddingRight: 32,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtn: {
    height: 48,
    width: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: radius.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.ground,
    borderRadius: radius.input,
    padding: 3,
    marginBottom: spacing.md,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.input - 2,
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
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
  unscoredBanner: {
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  unscoredBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.primary,
    marginBottom: 4,
  },
  unscoredBannerSubtitle: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  unscoredBannerBtn: {
    alignSelf: 'flex-start',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
  },
  errorText: {
    fontSize: 15,
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
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  resetSearchBtn: {
    minWidth: 180,
  },
  listContainer: {
    flex: 1,
  },
});
