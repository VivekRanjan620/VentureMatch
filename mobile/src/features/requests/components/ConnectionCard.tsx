import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ConnectionItem } from '../../../api/types';
import { SKILL_OPTIONS } from '../../../constants/options';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface ConnectionCardProps {
  item: ConnectionItem;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = React.memo(({ item }) => {
  const router = useRouter();

  const otherUser = item.otherUser || {};
  const name = otherUser.name || 'Anonymous User';
  const city = otherUser.city ? ` · ${otherUser.city}` : '';
  const industry = otherUser.industry ? ` · ${otherUser.industry}` : '';
  const reqTitle = item.requirement?.title || 'Requirement';

  const skillsList = otherUser.skills || [];

  // Contact status line helper
  const getContactStatus = () => {
    if (item.iHaveShared && item.theyHaveShared) {
      return { label: 'Both shared contact', isComplete: true, badgeBg: colors.tint, badgeBorder: '#99F6E4', textColor: colors.primary };
    }
    if (item.iHaveShared && !item.theyHaveShared) {
      return { label: 'You shared, waiting for them', isComplete: false, badgeBg: '#FEF3C7', badgeBorder: '#FDE68A', textColor: colors.warn };
    }
    if (!item.iHaveShared && item.theyHaveShared) {
      return { label: 'Waiting for you to share', isComplete: false, badgeBg: '#FEF3C7', badgeBorder: '#FDE68A', textColor: colors.warn };
    }
    return { label: 'Neither has shared contact', isComplete: false, badgeBg: colors.ground, badgeBorder: colors.border, textColor: colors.mutedText };
  };

  const statusInfo = getContactStatus();

  const handlePress = () => {
    router.push(`/connection/${item.id}`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Connection with ${name} for ${reqTitle}`}
    >
      {/* Header: Other Person Name & Location */}
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
          <Text style={styles.metaText}>{city}{industry}</Text>
        </Text>
      </View>

      {/* Requirement Info */}
      <View style={styles.reqInfoBox}>
        <Text style={styles.reqLabel}>Requirement:</Text>
        <Text style={styles.reqTitle} numberOfLines={1}>
          {reqTitle}
        </Text>
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

      {/* Contact Status Badge */}
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: statusInfo.badgeBg, borderColor: statusInfo.badgeBorder },
        ]}
      >
        <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
          {statusInfo.isComplete ? '✨ ' : '🔒 '}{statusInfo.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

ConnectionCard.displayName = 'ConnectionCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 110,
    elevation: 2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  headerRow: {
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    fontWeight: '400',
  },
  reqInfoBox: {
    marginBottom: spacing.xs,
  },
  reqLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    textTransform: 'uppercase',
  },
  reqTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.sm,
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
});
