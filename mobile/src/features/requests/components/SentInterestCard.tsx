import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SentInterestItem, InterestActionType } from '../../../api/types';
import { Button } from '../../../components/Button';
import { ExpandableWhyMatch } from './ExpandableWhyMatch';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface SentInterestCardProps {
  item: SentInterestItem;
  onAction: (id: string, action: InterestActionType) => Promise<void>;
  isActionPending?: boolean;
}

export const SentInterestCard: React.FC<SentInterestCardProps> = React.memo(
  ({ item, onAction, isActionPending = false }) => {
    const router = useRouter();

    const reqTitle =
      typeof item.requirement === 'object' && item.requirement?.title
        ? item.requirement.title
        : 'Requirement';

    const getStatusInfo = () => {
      switch (item.status) {
        case 'PENDING':
          return { label: 'Pending', color: colors.primary, bg: colors.tint, border: '#99F6E4' };
        case 'LATER':
          return { label: 'Maybe later', color: colors.warn, bg: '#FEF3C7', border: '#FDE68A' };
        case 'ACCEPTED':
          return { label: 'Accepted', color: colors.primary, bg: colors.tint, border: '#99F6E4' };
        case 'DECLINED':
          return { label: 'Declined', color: colors.error, bg: '#FEF2F2', border: '#FCA5A5' };
        case 'WITHDRAWN':
          return { label: 'Withdrawn', color: colors.mutedText, bg: colors.ground, border: colors.border };
        default:
          return { label: String(item.status), color: colors.ink, bg: colors.ground, border: colors.border };
      }
    };

    const statusInfo = getStatusInfo();
    const isConnected = item.status === 'ACCEPTED' || Boolean(item.connectionId);
    const canWithdraw = item.status === 'PENDING' || item.status === 'LATER';

    const handleWithdraw = () => {
      if (isActionPending) return;
      Alert.alert(
        'Withdraw Interest',
        `Are you sure you want to withdraw your interest in "${reqTitle}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw',
            style: 'destructive',
            onPress: async () => {
              await onAction(item.id, 'withdraw');
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

    return (
      <View style={styles.card}>
        {/* Requirement Title & Status Chip */}
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {reqTitle}
          </Text>

          <View
            style={[
              styles.statusChip,
              { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
            ]}
          >
            <Text style={[styles.statusChipText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Expandable Why Match */}
        <ExpandableWhyMatch
          score={item.score}
          breakdown={item.breakdown}
          reasons={item.reasons}
        />

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
        ) : canWithdraw ? (
          <View style={styles.actionRow}>
            <Button
              title="Withdraw"
              variant="outline"
              onPress={handleWithdraw}
              disabled={isActionPending}
              loading={isActionPending}
              style={styles.withdrawBtn}
            />
          </View>
        ) : null}
      </View>
    );
  }
);

SentInterestCard.displayName = 'SentInterestCard';

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
  actionRow: {
    marginTop: spacing.xs,
  },
  withdrawBtn: {
    height: 44,
    width: '100%',
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
});
