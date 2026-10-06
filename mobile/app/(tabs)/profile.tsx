import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/auth';
import { VERIFICATION_LABELS } from '../../src/lib/constants';
import { colors, spacing, radius } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  // Determine email verification label according to canonical wording
  const emailVerificationStatus =
    user?.verificationRecords && user.verificationRecords.length > 0
      ? VERIFICATION_LABELS.EMAIL_DECLARED
      : VERIFICATION_LABELS.EMAIL_UNVERIFIED;

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Account Info</Text>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Email:</Text>
          <Text style={styles.fieldValue}>{user?.email || 'N/A'}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Email Status:</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{emailVerificationStatus}</Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Role:</Text>
          <Text style={styles.fieldValue}>{user?.role || 'N/A'}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Profile Complete:</Text>
          <Text style={styles.fieldValue}>{user?.profileComplete ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Commitment Complete:</Text>
          <Text style={styles.fieldValue}>{user?.commitmentComplete ? 'Yes' : 'No'}</Text>
        </View>

        <Button
          title="Log Out"
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ground,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
  },
  badge: {
    backgroundColor: colors.tint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  logoutBtn: {
    marginTop: spacing.xl,
  },
});
