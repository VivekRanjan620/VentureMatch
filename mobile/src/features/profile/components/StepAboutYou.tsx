import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { TextField } from '../../../components/TextField';
import { OnboardingFormState } from '../types';
import { AGE_RANGE_OPTIONS } from '../../../constants/options';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface StepAboutYouProps {
  formState: OnboardingFormState;
  updateForm: (updates: Partial<OnboardingFormState>) => void;
  errors: Record<string, string>;
}

export const StepAboutYou: React.FC<StepAboutYouProps> = ({
  formState,
  updateForm,
  errors,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>About You</Text>
      <Text style={styles.sectionSubtitle}>Tell us about your background and experience</Text>

      <TextField
        label="Full Name *"
        placeholder="e.g. Alex Rivera"
        value={formState.name}
        onChangeText={(val) => updateForm({ name: val })}
        error={errors.name}
      />

      <TextField
        label="City / Location *"
        placeholder="e.g. San Francisco, CA"
        value={formState.city}
        onChangeText={(val) => updateForm({ city: val })}
        error={errors.city}
      />

      <TextField
        label="Industry *"
        placeholder="e.g. Artificial Intelligence, Fintech"
        value={formState.industry}
        onChangeText={(val) => updateForm({ industry: val })}
        error={errors.industry}
      />

      <TextField
        label="Years of Experience *"
        placeholder="e.g. 5"
        keyboardType="number-pad"
        value={formState.experienceYears}
        onChangeText={(val) => updateForm({ experienceYears: val })}
        error={errors.experienceYears}
      />

      <TextField
        label="Short Bio (Optional)"
        placeholder="Brief description of your background and goals..."
        multiline
        numberOfLines={3}
        style={styles.multilineInput}
        value={formState.bio}
        onChangeText={(val) => updateForm({ bio: val })}
        error={errors.bio}
      />

      <TextField
        label="Current Role / Work (Optional)"
        placeholder="e.g. Staff Engineer at TechCorp"
        value={formState.currentWork}
        onChangeText={(val) => updateForm({ currentWork: val })}
        error={errors.currentWork}
      />

      <View style={styles.switchRow}>
        <View style={styles.switchTextContainer}>
          <Text style={styles.switchLabel}>Have you founded a startup before?</Text>
          <Text style={styles.switchSublabel}>Previous founder experience</Text>
        </View>
        <Switch
          value={formState.previousStartup}
          onValueChange={(val) => updateForm({ previousStartup: val })}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
      </View>

      <Text style={styles.label}>Age Range (Optional)</Text>
      <View style={styles.chipRow}>
        {AGE_RANGE_OPTIONS.map((range) => {
          const isSelected = formState.ageRange === range;
          return (
            <TouchableOpacity
              key={range}
              activeOpacity={0.8}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() =>
                updateForm({ ageRange: isSelected ? '' : range })
              }
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {range}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  switchSublabel: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tint,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.primary,
  },
});
