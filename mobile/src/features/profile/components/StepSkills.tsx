import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OnboardingFormState, SkillType } from '../types';
import { SKILL_OPTIONS } from '../../../constants/options';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface StepSkillsProps {
  formState: OnboardingFormState;
  updateForm: (updates: Partial<OnboardingFormState>) => void;
  errors: Record<string, string>;
}

export const StepSkills: React.FC<StepSkillsProps> = ({
  formState,
  updateForm,
  errors,
}) => {
  const toggleSkill = (skill: SkillType) => {
    const currentSkills = formState.skills || [];
    if (currentSkills.includes(skill)) {
      updateForm({
        skills: currentSkills.filter((s) => s !== skill),
      });
    } else {
      updateForm({
        skills: [...currentSkills, skill],
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Skills</Text>
      <Text style={styles.sectionSubtitle}>
        Select all skills you bring to a co-founding team (select at least 1)
      </Text>

      {errors.skills ? <Text style={styles.errorBanner}>{errors.skills}</Text> : null}

      <View style={styles.skillsGrid}>
        {SKILL_OPTIONS.map((item) => {
          const isSelected = formState.skills.includes(item.value as SkillType);
          return (
            <TouchableOpacity
              key={item.value}
              activeOpacity={0.8}
              style={[styles.skillCard, isSelected && styles.skillCardSelected]}
              onPress={() => toggleSkill(item.value as SkillType)}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.skillLabel, isSelected && styles.skillLabelSelected]}>
                {item.label}
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
  errorBanner: {
    fontSize: 14,
    color: colors.error,
    backgroundColor: '#FEE2E2',
    padding: spacing.sm,
    borderRadius: radius.input,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  skillCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  skillCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tint,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  skillLabel: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    flex: 1,
  },
  skillLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
