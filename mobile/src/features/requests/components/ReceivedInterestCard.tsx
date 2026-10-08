import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ReceivedInterestItem, InterestActionType } from '../../../api/types';
import { Button } from '../../../components/Button';
import { ExpandableWhyMatch } from './ExpandableWhyMatch';
import { SKILL_OPTIONS, AVAILABILITY_OPTIONS, COMPENSATION_OPTIONS, VERIFICATION_LABELS } from '../../../constants/options';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface ReceivedInterestCardProps {
  item: ReceivedInterestItem;
  onAction: (id: string, action: InterestActionType) => Promise<void>;
  isActionPending?: boolean;
}

export const ReceivedInterestCard: React.FC<ReceivedInterestCardProps> = React.memo(
  ({ item, onAction, isActionPending = false }) => {
    const router = useRouter();

    const candidate = item.candidate || {};
    const candName = candidate.name || 'Anonymous Candidate';
    const candCity = candidate.city ? ` · ${candidate.city}` : '';
    const candIndustry = candidate.industry ? ` · ${candidate.industry}` : '';

    // Requirement status
    const reqTitle = item.requirement?.title || 'Requirement';
    const isClosedReq = item.requirement?.status === 'CLOSED';

    // Skills
    const skillsList = candidate.skills || [];

    // Commitment
    const commitment = candidate.commitment;
    const availabilityLabel = commitment?.availability
      ? AVAILABILITY_OPTIONS.find((a) => a.value === commitment.availability)?.label || commitment.availability
      : null;
    const compLabel = commitment?.compensationPref
      ? COMPENSATION_OPTIONS.find((c) => c.value === commitment.compensationPref)?.label || commitment.compensationPref
      : null;

    // Badges
    const badges = candidate.badges || [];
    const hasEmailBadge = badges.includes('EMAIL') || badges.includes('EMAIL_DECLARED');
    const hasLinkedinBadge = badges.includes('LINKEDIN') || badges.includes('LINKEDIN_LINKED');
    const hasPhoneBadge = badges.includes('PHONE') || badges.includes('PHONE_LINKED');

    const handleAccept = async () => {
      if (isActionPending || isClosedReq) return;
      await onAction(item.id, 'accept');
    };

    const handleLater = async () => {
      if (isActionPending) return;
      await onAction(item.id, 'later');
    };

    const handleDecline = () => {
      if (isActionPending) return;
      Alert.alert(
        'Decline Interest',
        `Are you sure you want to decline interest from ${candName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: async () => {
              await onAction(item.id, 'decline');
            },
          },
        ]
      );
    };

    const handleOpenConnection = () => {
      if (item.connectionId) {
        router.push(`/connection/${item.connectionId}`);
      }
    };

    const isConnected = item.status === 'ACCEPTED' || Boolean(item.connectionId);

    return (
      <View style={styles.card}>
        {/* Header: Requirement Title */}
        <View style={styles.reqHeader}>
          <Text style={styles.reqTitleLabel}>Interested in:</Text>
          <Text style={styles.reqTitle} numberOfLines={2}>
            {reqTitle}
          </Text>
        </View>

        {/* Candidate Info */}
        <View style={styles.candidateHeader}>
          <Text style={styles.candidateName}>
            {candName}
            <Text style={styles.candidateMeta}>{candCity}{candIndustry}</Text>
          </Text>
          {candidate.experienceYears !== null && candidate.experienceYears !== undefined && (
            <Text style={styles.expText}>{candidate.experienceYears} yrs exp</Text>
          )}
        </View>

        {/* Verification Badges */}
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
          {hasPhoneBadge && (
            <View style={[styles.badge, styles.badgeTint]}>
              <Text style={styles.badgeTintText}>{VERIFICATION_LABELS.PHONE_LINKED}</Text>
            </View>
          )}
        </View>

        {/* Skills Chips */}
        {skillsList.length > 0 && (
          <View style={styles.chipRow}>
            {skillsList.map((skillKey, idx) => {
              const label = SKILL_OPTIONS.find((s) => s.value === skillKey)?.label || skillKey;
              return (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Commitment Snapshot */}
        {commitment && (
          <View style={styles.commitmentContainer}>
            <Text style={styles.commitmentTitle}>Candidate Commitment:</Text>
            <View style={styles.commitmentGrid}>
              {availabilityLabel && (
                <Text style={styles.commitmentItem}>⏱ {availabilityLabel}</Text>
              )}
              {commitment.hoursPerWeek !== null && commitment.hoursPerWeek !== undefined && (
                <Text style={styles.commitmentItem}>⌛ {commitment.hoursPerWeek} hrs/wk</Text>
              )}
              {commitment.minMonths !== null && commitment.minMonths !== undefined && (
                <Text style={styles.commitmentItem}>📅 Min {commitment.minMonths} mos</Text>
              )}
              {compLabel && (
                <Text style={styles.commitmentItem}>💵 {compLabel}</Text>
              )}
              {commitment.equityExpectation !== null && commitment.equityExpectation !== undefined && (
                <Text style={styles.commitmentItem}>📊 {commitment.equityExpectation}% equity</Text>
              )}
              {commitment.remote !== null && commitment.remote !== undefined && (
                <Text style={styles.commitmentItem}>
                  {commitment.remote ? '🌐 Remote' : '🏢 On-site'}
                </Text>
              )}
              {commitment.canInvestAmount !== null && commitment.canInvestAmount !== undefined && (
                <Text style={styles.commitmentItemHighlight}>
                  💰 Can invest: ${commitment.canInvestAmount.toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Expandable Why Match */}
        <ExpandableWhyMatch
          score={item.score}
          breakdown={item.breakdown}
          reasons={item.reasons}
        />

        {/* Closed Requirement Banner */}
        {isClosedReq && !isConnected && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedBannerText}>⚠️ This requirement is closed</Text>
          </View>
        )}

        {/* Actions Row */}
        {isConnected ? (
          <View style={styles.connectedRow}>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>Connected</Text>
            </View>
            <Button
              title="Open connection"
              onPress={handleOpenConnection}
              style={styles.openConnBtn}
            />
          </View>
        ) : item.status === 'DECLINED' ? (
          <View style={styles.statusBadgeRow}>
            <Text style={styles.statusLabelDeclined}>Declined</Text>
          </View>
        ) : item.status === 'WITHDRAWN' ? (
          <View style={styles.statusBadgeRow}>
            <Text style={styles.statusLabelWithdrawn}>Withdrawn by candidate</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            {/* Accept Button */}
            {!isClosedReq && (
              <Button
                title="Accept"
                onPress={handleAccept}
                disabled={isActionPending}
                loading={isActionPending}
                style={[styles.actionBtn, styles.acceptBtn]}
              />
            )}

            {/* Maybe Later (Only for PENDING) */}
            {item.status === 'PENDING' && (
              <Button
                title="Maybe later"
                variant="secondary"
                onPress={handleLater}
                disabled={isActionPending}
                style={[styles.actionBtn, styles.laterBtn]}
              />
            )}

            {/* Decline Button (Allowed for PENDING and LATER even if CLOSED) */}
            <Button
              title="Decline"
              variant="outline"
              onPress={handleDecline}
              disabled={isActionPending}
              style={[styles.actionBtn, styles.declineBtn]}
            />
          </View>
        )}
      </View>
    );
  }
);

ReceivedInterestCard.displayName = 'ReceivedInterestCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  reqHeader: {
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.ground,
  },
  reqTitleLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    textTransform: 'uppercase',
  },
  reqTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  candidateName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    flex: 1,
  },
  candidateMeta: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    fontWeight: '400',
  },
  expText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
    backgroundColor: colors.tint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeWarn: {
    backgroundColor: '#FEF3C7',
  },
  badgeWarnText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: colors.warn,
  },
  badgeTint: {
    backgroundColor: colors.tint,
  },
  badgeTintText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.xs,
  },
  chip: {
    backgroundColor: colors.ground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  commitmentContainer: {
    backgroundColor: '#F8FAFC',
    padding: spacing.xs,
    borderRadius: radius.input,
    marginBottom: spacing.xs,
  },
  commitmentTitle: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    marginBottom: 4,
  },
  commitmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  commitmentItem: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
  },
  commitmentItemHighlight: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  closedBanner: {
    backgroundColor: '#FEF2F2',
    padding: spacing.xs,
    borderRadius: radius.input,
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  closedBannerText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.error,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    height: 44,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
  laterBtn: {
    backgroundColor: colors.ground,
  },
  declineBtn: {
    borderColor: colors.border,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  connectedBadge: {
    backgroundColor: colors.tint,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  connectedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.primary,
  },
  openConnBtn: {
    flex: 1,
    height: 44,
  },
  statusBadgeRow: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  statusLabelDeclined: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: colors.error,
  },
  statusLabelWithdrawn: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
  },
});
