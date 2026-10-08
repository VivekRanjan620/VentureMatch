import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import {
  useRequirementDetail,
  useSentInterests,
  useExpressInterest,
} from '../../src/features/requirements/hooks';
import { useAuthStore } from '../../src/store/auth';
import {
  SKILL_OPTIONS,
  AVAILABILITY_OPTIONS,
  STAGE_OPTIONS,
  VERIFICATION_LABELS,
  RECOMMENDATION_SCORE_LABEL,
} from '../../src/constants/options';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { ApiError } from '../../src/lib/errors';

export default function RequirementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const { data, isLoading, isError, error, refetch } = useRequirementDetail(id || '');
  const { data: sentInterestsData } = useSentInterests();
  const expressInterestMutation = useExpressInterest();

  const [serverError, setServerError] = useState<string | null>(null);

  const requirement = data?.requirement;
  const isOwner = Boolean(currentUser?.id && requirement?.owner?.id && currentUser.id === requirement.owner.id);

  // Set of requirement IDs caller has sent interest to
  const sentInterestIds = useMemo(() => {
    if (!sentInterestsData?.interests) return new Set<string>();
    return new Set(sentInterestsData.interests.map((item) => item.requirementId));
  }, [sentInterestsData]);

  const hasSentInterest = Boolean(id && sentInterestIds.has(id));

  const handleExpressInterest = useCallback(async () => {
    if (!id || hasSentInterest || isOwner) return;
    setServerError(null);

    try {
      await expressInterestMutation.mutateAsync(id);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Treat 409 conflict as already sent
          sentInterestIds.add(id);
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
    }
  }, [id, hasSentInterest, isOwner, expressInterestMutation, sentInterestIds, router]);

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !requirement) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorText}>
          {is404
            ? 'This requirement is no longer available'
            : 'Failed to load requirement details'}
        </Text>
        <Button title="Back" variant="outline" onPress={() => router.back()} style={styles.backBtn} />
      </Screen>
    );
  }

  // Resolve options safely
  const skillLabel = requirement.needSkill
    ? SKILL_OPTIONS.find((s) => s.value === requirement.needSkill)?.label || requirement.needSkill
    : 'General';
  const stageLabel = requirement.stage
    ? STAGE_OPTIONS.find((s) => s.value === requirement.stage)?.label || requirement.stage
    : null;
  const commitmentLabel = requirement.commitment
    ? AVAILABILITY_OPTIONS.find((a) => a.value === requirement.commitment)?.label || requirement.commitment
    : 'N/A';

  const metaParts = [
    stageLabel,
    requirement.industry,
    requirement.currentUsers !== null && requirement.currentUsers !== undefined
      ? `${requirement.currentUsers} users`
      : null,
  ].filter(Boolean);

  // Verification badges
  const verificationBadges = requirement.owner?.badges || [];
  const hasEmailBadge = verificationBadges.includes('EMAIL') || verificationBadges.includes('EMAIL_DECLARED');
  const hasLinkedinBadge = verificationBadges.includes('LINKEDIN') || verificationBadges.includes('LINKEDIN_LINKED');

  const ownerName = requirement.owner?.name || 'Anonymous Founder';

  // Recommendation score breakdown rows helper
  const breakdown = requirement.breakdown || {};
  const formatBreakdownLevel = (val?: number) => {
    if (val === undefined || val === null) return { text: 'Needs discussion', isWarn: true };
    if (val >= 0.8) return { text: 'High', isWarn: false };
    if (val > 0) return { text: 'Needs discussion', isWarn: true };
    return { text: 'Low', isWarn: false };
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <ErrorText message={serverError} />

      {/* Header Info Card */}
      <View style={styles.card}>
        {requirement.startupName ? (
          <View style={styles.startupBadge}>
            <Text style={styles.startupBadgeText}>🚀 {requirement.startupName}</Text>
          </View>
        ) : null}

        <Text style={styles.title}>{requirement.title}</Text>
        {metaParts.length > 0 && (
          <Text style={styles.metaLine}>
            {metaParts.join(' · ')}
          </Text>
        )}

        {/* Owner Card Info */}
        <View style={styles.ownerHeader}>
          <Text style={styles.ownerTitle}>Posted by {ownerName}</Text>
          {requirement.owner?.city ? (
            <Text style={styles.ownerSub}>📍 {requirement.owner.city}</Text>
          ) : null}

          <View style={styles.badgeRow}>
            {hasEmailBadge && (
              <View style={[styles.badge, styles.badgeWarn]}>
                <Text style={styles.badgeWarnText}>{VERIFICATION_LABELS.EMAIL_DECLARED}</Text>
              </View>
            )}
            {hasLinkedinBadge && (
              <View style={[styles.badge, styles.badgeTint]}>
                <Text style={styles.badgeTintText}>{VERIFICATION_LABELS.LINKEDIN_LINKED}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* "Why this match?" Card */}
      <View style={styles.card}>
        <View style={styles.scoreCardHeader}>
          <Text style={styles.sectionTitle}>Why this match?</Text>
          {requirement.score !== null && requirement.score !== undefined ? (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>
                {Math.round(requirement.score)} {RECOMMENDATION_SCORE_LABEL}
              </Text>
            </View>
          ) : (
            <Text style={styles.unscoredText}>Complete your profile to see your score</Text>
          )}
        </View>

        {/* Breakdown Component Rows */}
        {Object.keys(breakdown).length > 0 && (
          <View style={styles.breakdownContainer}>
            {Object.entries(breakdown).map(([key, value]) => {
              const level = formatBreakdownLevel(value as number);
              const formatKeyName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
              return (
                <View key={key} style={styles.breakdownRow}>
                  <Text style={styles.breakdownKey}>{formatKeyName}:</Text>
                  <Text style={[styles.breakdownLevel, level.isWarn && styles.levelWarn]}>
                    {level.text}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Reasons List */}
        {requirement.reasons && requirement.reasons.length > 0 && (
          <View style={styles.reasonsContainer}>
            <Text style={styles.reasonsTitle}>Match Analysis:</Text>
            {requirement.reasons.map((reason, idx) => (
              <View key={idx} style={styles.reasonBullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Commitment Snapshot Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Commitment Snapshot</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Needed Skill:</Text>
          <Text style={styles.infoValueHighlight}>{skillLabel}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Commitment:</Text>
          <Text style={styles.infoValue}>{commitmentLabel}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Location / Remote:</Text>
          <Text style={styles.infoValue}>
            {requirement.location ? `${requirement.location} · ` : ''}
            {requirement.remote ? 'Remote' : 'On-site'}
          </Text>
        </View>

        {requirement.equityOfferMax !== null && requirement.equityOfferMax !== undefined ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Equity Offer:</Text>
            <Text style={styles.infoValueHighlight}>
              Founder offers up to {requirement.equityOfferMax}% equity
            </Text>
          </View>
        ) : null}

        {requirement.offer ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Offer Details:</Text>
            <Text style={styles.infoValue}>{requirement.offer}</Text>
          </View>
        ) : null}

        {requirement.ownerContributes ? (
          <View style={styles.infoRowBlock}>
            <Text style={styles.infoLabel}>Owner Contributes:</Text>
            <Text style={styles.infoValueBlock}>{requirement.ownerContributes}</Text>
          </View>
        ) : null}
      </View>

      {/* Sticky Bottom Action Button */}
      {!isOwner && (
        <View style={styles.stickyFooter}>
          <Button
            title={hasSentInterest ? 'Interest sent' : 'Interested'}
            disabled={hasSentInterest || expressInterestMutation.isPending}
            loading={expressInterestMutation.isPending}
            onPress={handleExpressInterest}
            style={[styles.interestedBtn, hasSentInterest && styles.btnSent]}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    gap: spacing.md,
    paddingBottom: 80,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  backBtn: {
    minWidth: 120,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  startupBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  startupBadgeText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    lineHeight: 28,
    marginBottom: 4,
  },
  metaLine: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginBottom: spacing.md,
  },
  ownerHeader: {
    borderTopWidth: 1,
    borderTopColor: colors.ground,
    paddingTop: spacing.sm,
  },
  ownerTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  ownerSub: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeWarn: {
    backgroundColor: '#FEF3C7',
  },
  badgeWarnText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.warn,
  },
  badgeTint: {
    backgroundColor: colors.tint,
  },
  badgeTintText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  scoreCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  scoreBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  scoreBadgeText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
  unscoredText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    fontStyle: 'italic',
  },
  breakdownContainer: {
    backgroundColor: colors.ground,
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownKey: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    textTransform: 'capitalize',
  },
  breakdownLevel: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  levelWarn: {
    color: colors.warn,
  },
  reasonsContainer: {
    marginTop: spacing.xs,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  reasonBullet: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingRight: spacing.sm,
  },
  bulletDot: {
    fontSize: 14,
    color: colors.primary,
    marginRight: spacing.xs,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    lineHeight: 18,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.ground,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
  },
  infoValueHighlight: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  infoRowBlock: {
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  infoValueBlock: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    marginTop: 2,
    lineHeight: 20,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 8,
  },
  interestedBtn: {
    width: '100%',
  },
  btnSent: {
    backgroundColor: colors.border,
    opacity: 0.7,
  },
});
