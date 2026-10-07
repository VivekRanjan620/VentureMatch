import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/auth';
import { useMe } from '../../src/features/profile/hooks';
import {
  SKILL_OPTIONS,
  AVAILABILITY_OPTIONS,
  COMPENSATION_OPTIONS,
  VERIFICATION_LABELS,
} from '../../src/constants/options';
import { colors, spacing, radius } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { data: meData, isLoading, isError, refetch } = useMe();

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !meData?.user) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorText}>Failed to load profile details</Text>
        <Button title="Retry" onPress={() => refetch()} style={styles.retryBtn} />
      </Screen>
    );
  }

  const user = meData.user;
  const profile = user.profile || {};
  const commitment = user.commitmentProfile || {};

  // Resolve skill labels
  const skillLabels = (profile.skills as string[]) || [];
  const getSkillLabel = (code: string) => {
    const found = SKILL_OPTIONS.find((s) => s.value === code);
    return found ? found.label : code;
  };

  // Resolve availability label
  const availOption = AVAILABILITY_OPTIONS.find((a) => a.value === commitment.availability);
  const availabilityLabel = availOption ? availOption.label : commitment.availability || 'N/A';

  // Resolve compensation label
  const compOption = COMPENSATION_OPTIONS.find((c) => c.value === commitment.compensationPref);
  const compensationLabel = compOption ? compOption.label : commitment.compensationPref || 'N/A';

  // Verification badges wording check
  const verificationRecords = user.verificationRecords || [];
  const hasLinkedin = verificationRecords.some((r: any) => r.type === 'LINKEDIN');
  const emailBadge = VERIFICATION_LABELS.EMAIL_DECLARED;

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      {/* Header Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{profile.name || 'Anonymous User'}</Text>
            <Text style={styles.userRole}>
              {user.role === 'FOUNDER'
                ? 'Founder'
                : user.role === 'SEEKER'
                ? 'Talent / Seeker'
                : 'Founder & Talent'}
            </Text>
            {profile.city ? (
              <Text style={styles.userCity}>📍 {profile.city}</Text>
            ) : null}
          </View>
        </View>

        {/* Verification Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles.badgeUnverified]}>
            <Text style={styles.badgeTextUnverified}>{emailBadge}</Text>
          </View>
          {hasLinkedin && (
            <View style={[styles.badge, styles.badgeLinked]}>
              <Text style={styles.badgeTextLinked}>
                {VERIFICATION_LABELS.LINKEDIN_LINKED}
              </Text>
            </View>
          )}
        </View>

        {/* Bio */}
        {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}

        <Button
          title="Edit Profile"
          variant="secondary"
          onPress={() => router.push('/profile/edit')}
          style={styles.editBtn}
        />
      </View>

      {/* Professional Background Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Professional Details</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Industry:</Text>
          <Text style={styles.infoValue}>{profile.industry || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Experience:</Text>
          <Text style={styles.infoValue}>
            {profile.experienceYears !== undefined && profile.experienceYears !== null
              ? `${profile.experienceYears} Years`
              : 'N/A'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Previous Startup Founder:</Text>
          <Text style={styles.infoValue}>{profile.previousStartup ? 'Yes' : 'No'}</Text>
        </View>

        {profile.currentWork ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Work:</Text>
            <Text style={styles.infoValue}>{profile.currentWork}</Text>
          </View>
        ) : null}

        {/* Skills Chips */}
        <Text style={[styles.infoLabel, { marginTop: spacing.sm }]}>Skills Offered:</Text>
        <View style={styles.skillsContainer}>
          {skillLabels.length > 0 ? (
            skillLabels.map((skillCode) => (
              <View key={skillCode} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{getSkillLabel(skillCode)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.infoValue}>No skills selected</Text>
          )}
        </View>
      </View>

      {/* Commitment Snapshot Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Commitment Snapshot</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Availability:</Text>
          <Text style={styles.infoValue}>{availabilityLabel}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Weekly Hours:</Text>
          <Text style={styles.infoValue}>
            {commitment.hoursPerWeek ? `${commitment.hoursPerWeek} hrs/week` : 'N/A'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Min Commitment:</Text>
          <Text style={styles.infoValue}>
            {commitment.minMonths ? `${commitment.minMonths} Months` : 'N/A'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Compensation Pref:</Text>
          <Text style={styles.infoValue}>{compensationLabel}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Equity Expectation:</Text>
          <Text style={styles.infoValue}>
            {commitment.equityExpectation !== undefined && commitment.equityExpectation !== null
              ? `${commitment.equityExpectation}%`
              : 'N/A'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Remote Work:</Text>
          <Text style={styles.infoValue}>{commitment.remote ? 'Yes' : 'No'}</Text>
        </View>
      </View>

      {/* Private Contact Fields Card (Visible only to owner) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Private Contact Details</Text>
        <Text style={styles.privateNotice}>
          Only shared with connected users when mutually unlocked.
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Email:</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Shareable Phone:</Text>
          <Text style={styles.infoValue}>{profile.shareablePhone || 'Not set'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Shareable Email:</Text>
          <Text style={styles.infoValue}>{profile.shareableEmail || 'Not set'}</Text>
        </View>
      </View>

      {/* Logout Button */}
      <Button
        title="Log Out"
        variant="outline"
        onPress={handleLogout}
        style={styles.logoutBtn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryBtn: {
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  userRole: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
    marginTop: 2,
  },
  userCity: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeUnverified: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextUnverified: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.warn,
  },
  badgeLinked: {
    backgroundColor: colors.tint,
  },
  badgeTextLinked: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  editBtn: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  privateNotice: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
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
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  skillChip: {
    backgroundColor: colors.tint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  skillChipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  logoutBtn: {
    marginTop: spacing.sm,
  },
});
