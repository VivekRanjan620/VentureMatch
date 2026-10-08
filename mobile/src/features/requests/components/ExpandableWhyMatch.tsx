import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RECOMMENDATION_SCORE_LABEL } from '../../../constants/options';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface ExpandableWhyMatchProps {
  score?: number | null;
  breakdown?: Record<string, unknown> | null;
  reasons?: string[] | null;
}

export const ExpandableWhyMatch: React.FC<ExpandableWhyMatchProps> = React.memo(
  ({ score, breakdown, reasons }) => {
    const [expanded, setExpanded] = useState(false);

    const hasBreakdown = breakdown && Object.keys(breakdown).length > 0;
    const hasReasons = reasons && reasons.length > 0;
    const hasDetails = hasBreakdown || hasReasons;

    const formatBreakdownLevel = (val?: number) => {
      if (val === undefined || val === null) return { text: 'Needs discussion', isWarn: true };
      if (val >= 0.8) return { text: 'High', isWarn: false };
      if (val > 0) return { text: 'Needs discussion', isWarn: true };
      return { text: 'Low', isWarn: false };
    };

    return (
      <View style={styles.container}>
        <View style={styles.scoreHeader}>
          <View style={styles.scoreBadgeGroup}>
            <Text style={styles.scoreLabel}>{RECOMMENDATION_SCORE_LABEL}</Text>
            {score !== null && score !== undefined ? (
              <View style={styles.scorePill}>
                <Text style={styles.scoreValue}>{Math.round(score)}</Text>
              </View>
            ) : (
              <Text style={styles.unscoredText}>N/A</Text>
            )}
          </View>

          {hasDetails && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpanded((prev) => !prev)}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleBtnText}>Why this match?</Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {expanded && hasDetails && (
          <View style={styles.expandedContent}>
            {hasBreakdown && (
              <View style={styles.breakdownBox}>
                {Object.entries(breakdown).map(([key, value]) => {
                  const numVal = typeof value === 'number' ? value : undefined;
                  const level = formatBreakdownLevel(numVal);
                  const keyName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
                  return (
                    <View key={key} style={styles.breakdownRow}>
                      <Text style={styles.breakdownKey}>{keyName}:</Text>
                      <Text style={[styles.breakdownLevel, level.isWarn && styles.levelWarn]}>
                        {level.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {hasReasons && (
              <View style={styles.reasonsBox}>
                <Text style={styles.reasonsTitle}>Match Analysis:</Text>
                {reasons.map((reason, idx) => (
                  <View key={idx} style={styles.reasonBullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  }
);

ExpandableWhyMatch.displayName = 'ExpandableWhyMatch';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.input,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    textTransform: 'lowercase',
  },
  scorePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  scoreValue: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
  unscoredText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  toggleBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  expandedContent: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  breakdownBox: {
    marginBottom: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownKey: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    textTransform: 'capitalize',
  },
  breakdownLevel: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  levelWarn: {
    color: colors.warn,
  },
  reasonsBox: {
    marginTop: 4,
  },
  reasonsTitle: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    marginBottom: 4,
  },
  reasonBullet: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bulletDot: {
    fontSize: 12,
    color: colors.primary,
    marginRight: 4,
  },
  reasonText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    flex: 1,
    lineHeight: 16,
  },
});
