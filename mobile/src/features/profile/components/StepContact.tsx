import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextField } from '../../../components/TextField';
import { OnboardingFormState } from '../types';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface StepContactProps {
  formState: OnboardingFormState;
  updateForm: (updates: Partial<OnboardingFormState>) => void;
  errors: Record<string, string>;
}

export const StepContact: React.FC<StepContactProps> = ({
  formState,
  updateForm,
  errors,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Private Contact Info</Text>
      <Text style={styles.sectionSubtitle}>
        Provide contact details for mutual contact unlocking
      </Text>

      <View style={styles.noticeBanner}>
        <Text style={styles.noticeText}>
          🔒 Only shared with a connection after both of you agree. Never shown publicly.
        </Text>
      </View>

      <TextField
        label="Shareable Phone Number (Optional)"
        placeholder="e.g. +15550192"
        keyboardType="phone-pad"
        value={formState.shareablePhone}
        onChangeText={(val) => updateForm({ shareablePhone: val })}
        error={errors.shareablePhone}
      />

      <TextField
        label="Shareable Email Address (Optional)"
        placeholder="e.g. alex.rivera@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={formState.shareableEmail}
        onChangeText={(val) => updateForm({ shareableEmail: val })}
        error={errors.shareableEmail}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginBottom: spacing.lg,
  },
  noticeBanner: {
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
    lineHeight: 18,
  },
});
