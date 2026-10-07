import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../../components/Screen';
import { Button } from '../../../components/Button';
import { ErrorText } from '../../../components/ErrorText';
import { StepAboutYou } from './StepAboutYou';
import { StepSkills } from './StepSkills';
import { StepCommitment } from './StepCommitment';
import { StepContact } from './StepContact';
import { OnboardingFormState, SkillType } from '../types';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  buildProfilePayload,
  buildCommitmentPayload,
} from '../schemas';
import { useMe, useUpdateProfile, useUpdateCommitment, ME_QUERY_KEY } from '../hooks';
import { ApiError } from '../../../lib/errors';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface MultiStepFormProps {
  mode: 'onboarding' | 'edit';
  onComplete?: () => void;
}

export const MultiStepForm: React.FC<MultiStepFormProps> = ({ mode, onComplete }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: meData } = useMe();
  const updateProfileMutation = useUpdateProfile();
  const updateCommitmentMutation = useUpdateCommitment();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [profileSaved, setProfileSaved] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formState, setFormState] = useState<OnboardingFormState>({
    name: '',
    city: '',
    industry: '',
    bio: '',
    experienceYears: '',
    previousStartup: false,
    currentWork: '',
    ageRange: '',
    skills: [],
    availability: 'FULL',
    hoursPerWeek: '40',
    minMonths: '12',
    compensationPref: 'EQUITY',
    equityExpectation: '50',
    canInvestAmount: '',
    remote: true,
    shareablePhone: '',
    shareableEmail: '',
  });

  // Pre-fill form values from GET /me
  useEffect(() => {
    if (meData?.user) {
      const u = meData.user;
      const p = u.profile;
      const c = u.commitmentProfile;

      setFormState((prev) => ({
        ...prev,
        name: p?.name || '',
        city: p?.city || '',
        industry: p?.industry || '',
        bio: p?.bio || '',
        experienceYears: p?.experienceYears !== undefined && p?.experienceYears !== null ? String(p.experienceYears) : '',
        previousStartup: Boolean(p?.previousStartup),
        currentWork: p?.currentWork || '',
        ageRange: p?.ageRange || '',
        skills: Array.isArray(p?.skills) ? (p.skills as SkillType[]) : [],
        shareablePhone: p?.shareablePhone || '',
        shareableEmail: p?.shareableEmail || '',
        availability: c?.availability || 'FULL',
        hoursPerWeek: c?.hoursPerWeek !== undefined && c?.hoursPerWeek !== null ? String(c.hoursPerWeek) : '40',
        minMonths: c?.minMonths !== undefined && c?.minMonths !== null ? String(c.minMonths) : '12',
        compensationPref: c?.compensationPref || 'EQUITY',
        equityExpectation: c?.equityExpectation !== undefined && c?.equityExpectation !== null ? String(c.equityExpectation) : '50',
        canInvestAmount: c?.canInvestAmount !== undefined && c?.canInvestAmount !== null ? String(c.canInvestAmount) : '',
        remote: c?.remote !== undefined ? Boolean(c.remote) : true,
      }));
    }
  }, [meData]);

  const updateForm = (updates: Partial<OnboardingFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
    setErrors({});
    setServerError(null);
  };

  const validateCurrentStep = (): boolean => {
    setErrors({});
    setServerError(null);

    let result;
    if (currentStep === 1) {
      result = step1Schema.safeParse(formState);
    } else if (currentStep === 2) {
      result = step2Schema.safeParse(formState);
    } else if (currentStep === 3) {
      result = step3Schema.safeParse(formState);
    } else if (currentStep === 4) {
      result = step4Schema.safeParse(formState);
    }

    if (result && !result.success) {
      const fieldErrors: Record<string, string> = {};
      const formatted = result.error.format();
      for (const [key, val] of Object.entries(formatted)) {
        if (key !== '_errors' && (val as any)?._errors?.[0]) {
          fieldErrors[key] = (val as any)._errors[0];
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setServerError(null);
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else if (mode === 'edit') {
      if (onComplete) onComplete();
      else router.back();
    }
  };

  const handleSave = async () => {
    if (!validateCurrentStep()) return;

    setServerError(null);

    try {
      // Step A: Save Profile (PUT /me) if not already saved
      if (!profileSaved) {
        const profilePayload = buildProfilePayload(formState);
        await updateProfileMutation.mutateAsync(profilePayload);
        setProfileSaved(true);
      }

      // Step B: Save Commitment (PUT /me/commitment)
      const commitmentPayload = buildCommitmentPayload(formState);
      await updateCommitmentMutation.mutateAsync(commitmentPayload);

      // Invalidate Query Cache & Refresh
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });

      if (onComplete) {
        onComplete();
      } else if (mode === 'onboarding') {
        router.replace('/(tabs)/discover');
      } else {
        router.back();
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Failed to save profile. Please try again.');
      }
    }
  };

  const isSaving = updateProfileMutation.isPending || updateCommitmentMutation.isPending;

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {/* Progress Header */}
        <View style={styles.header}>
          <Text style={styles.stepBadge}>Step {currentStep} of 4</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${(currentStep / 4) * 100}%` },
              ]}
            />
          </View>
        </View>

        <ErrorText message={serverError} />

        {/* Step Views */}
        {currentStep === 1 && (
          <StepAboutYou formState={formState} updateForm={updateForm} errors={errors} />
        )}
        {currentStep === 2 && (
          <StepSkills formState={formState} updateForm={updateForm} errors={errors} />
        )}
        {currentStep === 3 && (
          <StepCommitment formState={formState} updateForm={updateForm} errors={errors} />
        )}
        {currentStep === 4 && (
          <StepContact formState={formState} updateForm={updateForm} errors={errors} />
        )}

        {/* Footer Navigation Buttons */}
        <View style={styles.footerRow}>
          {(currentStep > 1 || mode === 'edit') && (
            <Button
              title="Back"
              variant="outline"
              onPress={handleBack}
              disabled={isSaving}
              style={styles.navButton}
            />
          )}

          {currentStep < 4 ? (
            <Button
              title="Next"
              onPress={handleNext}
              style={[styles.navButton, styles.nextButton]}
            />
          ) : (
            <Button
              title={mode === 'edit' ? 'Save Changes' : 'Complete Setup'}
              loading={isSaving}
              onPress={handleSave}
              style={[styles.navButton, styles.nextButton]}
            />
          )}
        </View>
      </View>
    </Screen>
  );
};

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
  header: {
    marginBottom: spacing.lg,
  },
  stepBadge: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.ground,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  navButton: {
    flex: 1,
  },
  nextButton: {
    marginLeft: 'auto',
  },
});
