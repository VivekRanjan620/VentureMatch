import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { RequirementSummaryItem } from '../types';
import { Button } from '../../../components/Button';
import { SKILL_OPTIONS, AVAILABILITY_OPTIONS, STAGE_OPTIONS, RECOMMENDATION_SCORE_LABEL } from '../../../constants/options';
import { colors, spacing, radius } from '../../../theme/tokens';
import { useAuthStore } from '../../../store/auth';
import { ApiError } from '../../../lib/errors';

export interface RequirementCardProps {
  item: RequirementSummaryItem;
  hasSentInterest: boolean;
  onExpressInterest: (id: string) => Promise<void>;
  isExpressingInterest?: boolean;
}

export const RequirementCard: React.FC<RequirementCardProps> = React.memo(
  ({ item, hasSentInterest, onExpressInterest, isExpressingInterest = false }) => {
    const router = useRouter();
    const { user: currentUser } = useAuthStore();

    const isOwner = currentUser?.id === item.owner.id;

    // Resolve labels
    const skillLabel = SKILL_OPTIONS.find((s) => s.value === item.needSkill)?.label || item.needSkill;
    const stageLabel = STAGE_OPTIONS.find((s) => s.value === item.stage)?.label || item.stage;
    const commitmentLabel = item.commitment
      ? AVAILABILITY_OPTIONS.find((a) => a.value === item.commitment)?.label || item.commitment
      : null;

    const handleInterestPress = async () => {
      if (hasSentInterest || isOwner || isExpressingInterest) return;
      await onExpressInterest(item.id);
    };

    const handleDetailsPress = () => {
      router.push(`/requirements/${item.id}`);
    };

    return (
      <View style={styles.card}>
        {/* Startup Name Badge if public/present */}
        {item.startupName ? (
          <View style={styles.startupBadge}>
            <Text style={styles.startupBadgeText}>🚀 {item.startupName}</Text>
          </View>
        ) : null}

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Meta Line: stage · industry · currentUsers users */}
        <Text style={styles.metaLine}>
          {stageLabel} · {item.industry} · {item.currentUsers} users
        </Text>

        {/* Chips Row */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, styles.skillChip]}>
            <Text style={styles.skillChipText}>Target: {skillLabel}</Text>
          </View>

          {commitmentLabel ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{commitmentLabel}</Text>
            </View>
          ) : null}

          {item.remote ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Remote</Text>
            </View>
          ) : (
            <View style={styles.chip}>
              <Text style={styles.chipText}>On-site</Text>
            </View>
          )}
        </View>

        {/* Offers / Owner Contributes */}
        {item.ownerContributes ? (
          <View style={styles.offersContainer}>
            <Text style={styles.offersLabel}>Offers:</Text>
            <Text style={styles.offersText} numberOfLines={2}>
              {item.ownerContributes}
            </Text>
          </View>
        ) : null}

        {/* Recommendation Score Section */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreTitle}>{RECOMMENDATION_SCORE_LABEL}</Text>
          {item.score !== null && item.score !== undefined ? (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreValue}>{Math.round(item.score)}</Text>
            </View>
          ) : (
            <Text style={styles.scoreUnscoredText}>
              Complete your profile to see your score
            </Text>
          )}
        </View>

        {/* Owner Info */}
        <View style={styles.ownerRow}>
          <Text style={styles.ownerText}>
            Posted by <Text style={styles.ownerName}>{item.owner.name}</Text>
            {item.owner.city ? ` (${item.owner.city})` : ''}
          </Text>
        </View>

        {/* Actions Row */}
        <View style={styles.actionRow}>
          {!isOwner && (
            <Button
              title={hasSentInterest ? 'Interest sent' : 'Interested'}
              disabled={hasSentInterest || isExpressingInterest}
              loading={isExpressingInterest}
              onPress={handleInterestPress}
              style={[styles.btn, styles.btnInterested, hasSentInterest && styles.btnSent]}
            />
          )}

          <Button
            title="Details"
            variant="outline"
            onPress={handleDetailsPress}
            style={[styles.btn, isOwner && styles.btnFullWidth]}
          />
        </View>
      </View>
    );
  }
);

RequirementCard.displayName = 'RequirementCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
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
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    lineHeight: 22,
    marginBottom: 4,
  },
  metaLine: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.ground,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
  },
  skillChip: {
    backgroundColor: colors.tint,
    borderColor: '#99F6E4',
  },
  skillChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  offersContainer: {
    backgroundColor: '#F8FAFC',
    padding: spacing.sm,
    borderRadius: radius.input,
    marginBottom: spacing.sm,
  },
  offersLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
  },
  offersText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  scoreTitle: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    textTransform: 'lowercase',
  },
  scoreBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  scoreValue: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
  scoreUnscoredText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    fontStyle: 'italic',
  },
  ownerRow: {
    borderTopWidth: 1,
    borderTopColor: colors.ground,
    paddingTop: spacing.xs,
    marginBottom: spacing.md,
  },
  ownerText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
  },
  ownerName: {
    fontWeight: '600',
    color: colors.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    height: 42,
  },
  btnInterested: {
    backgroundColor: colors.primary,
  },
  btnSent: {
    backgroundColor: colors.border,
    opacity: 0.7,
  },
  btnFullWidth: {
    flex: 1,
  },
});
