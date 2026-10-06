import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { register } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/auth';
import { UserRole } from '../../src/api/types';
import { ApiError } from '../../src/lib/errors';
import { colors, spacing, radius } from '../../src/theme/tokens';

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['FOUNDER', 'SEEKER', 'BOTH'], {
    required_error: 'Please select a role',
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'FOUNDER',
    label: 'I have a startup idea',
    description: 'Looking to build a team and recruit talent',
  },
  {
    value: 'SEEKER',
    label: 'I want to join a startup',
    description: 'Looking to offer skills and join a project',
  },
  {
    value: 'BOTH',
    label: 'Both',
    description: 'Open to founding or joining a startup',
  },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { loginSuccess } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'BOTH',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      const response = await register(data);
      await loginSuccess(response.user, response.tokens);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join VentureMatch to connect with co-founders</Text>

        <ErrorText message={serverError} />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Text style={styles.roleLabel}>What are you looking for?</Text>
        <Controller
          control={control}
          name="role"
          render={({ field: { onChange, value } }) => (
            <View style={styles.roleContainer}>
              {ROLE_OPTIONS.map((option) => {
                const isSelected = value === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.8}
                    style={[styles.roleOption, isSelected && styles.roleOptionSelected]}
                    onPress={() => onChange(option.value)}
                  >
                    <View style={styles.roleHeader}>
                      <View style={[styles.radioCircle, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.roleTitle, isSelected && styles.roleTitleSelected]}>
                        {option.label}
                      </Text>
                    </View>
                    <Text style={styles.roleDesc}>{option.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
        {errors.role ? <Text style={styles.roleErrorText}>{errors.role.message}</Text> : null}

        <Button
          title="Create Account"
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          style={styles.submitBtn}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingVertical: spacing.lg,
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
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginBottom: spacing.lg,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  roleContainer: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  roleOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  roleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.tint,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  radioCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  roleTitleSelected: {
    color: colors.primary,
  },
  roleDesc: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    paddingLeft: 26,
  },
  roleErrorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
});
