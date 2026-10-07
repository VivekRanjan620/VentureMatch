import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { TextField } from '../../../components/TextField';
import { AvailabilityType, CompensationType, OnboardingFormState } from '../types';
import { AVAILABILITY_OPTIONS, COMPENSATION_OPTIONS } from '../../../constants/options';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface StepCommitmentProps {
  formState: OnboardingFormState;
  updateForm: (updates: Partial<OnboardingFormState>) => void;
  errors: Record<string, string>;
}

export const StepCommitment: React.FC<StepCommitmentProps> = ({
  formState,
  updateForm,
  errors,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Commitment Profile</Text>
      <Text style={styles.sectionSubtitle}>
        Define your availability, duration, and financial expectations
      </Text>

      <Text style={styles.label}>Availability *</Text>
      <View style={styles.optionsContainer}>
        {AVAILABILITY_OPTIONS.map((item) => {
          const isSelected = formState.availability === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              activeOpacity={0.8}
              style={[styles.radioCard, isSelected && styles.radioCardSelected]}
              onPress={() => updateForm({ availability: item.value as AvailabilityType })}
            >
              <View style={[styles.radioDot, isSelected && styles.radioDotSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.availability ? (
        <Text style={styles.errorText}>{errors.availability}</Text>
      ) : null}

      <TextField
        label="Hours Per Week (1 - 80) *"
        placeholder="e.g. 40"
        keyboardType="number-pad"
        value={formState.hoursPerWeek}
        onChangeText={(val) => updateForm({ hoursPerWeek: val })}
        error={errors.hoursPerWeek}
      />

      <TextField
        label="Minimum Commitment (1 - 60 Months) *"
        placeholder="e.g. 12"
        keyboardType="number-pad"
        value={formState.minMonths}
        onChangeText={(val) => updateForm({ minMonths: val })}
        error={errors.minMonths}
      />

      <Text style={styles.label}>Compensation Preference *</Text>
      <View style={styles.optionsContainer}>
        {COMPENSATION_OPTIONS.map((item) => {
          const isSelected = formState.compensationPref === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              activeOpacity={0.8}
              style={[styles.radioCard, isSelected && styles.radioCardSelected]}
              onPress={() =>
                updateForm({ compensationPref: item.value as CompensationType })
              }
            >
              <View style={[styles.radioDot, isSelected && styles.radioDotSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.compensationPref ? (
        <Text style={styles.errorText}>{errors.compensationPref}</Text>
      ) : null}

      <TextField
        label="Equity Expectation (0 - 100 %) *"
        placeholder="e.g. 50"
        keyboardType="number-pad"
        value={formState.equityExpectation}
        onChangeText={(val) => updateForm({ equityExpectation: val })}
        error={errors.equityExpectation}
      />

      <TextField
        label="Can Invest Amount ($ USD) (Optional)"
        placeholder="e.g. 10000"
        keyboardType="number-pad"
        value={formState.canInvestAmount}
        onChangeText={(val) => updateForm({ canInvestAmount: val })}
        error={errors.canInvestAmount}
      />

      <View style={styles.switchRow}>
        <View style={styles.switchTextContainer}>
          <Text style={styles.switchLabel}>Open to Remote Work?</Text>
          <Text style={styles.switchSublabel}>Available to collaborate remotely</Text>
        </View>
        <Switch
          value={formState.remote}
          onValueChange={(val) => updateForm({ remote: val })}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  radioCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tint,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioDotSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  radioLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
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
});
