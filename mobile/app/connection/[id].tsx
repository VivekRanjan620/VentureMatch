import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { ErrorText } from '../../src/components/ErrorText';
import { useConnectionDetail, useShareContact } from '../../src/features/requests/hooks';
import { SKILL_OPTIONS, VERIFICATION_LABELS } from '../../src/constants/options';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { ApiError } from '../../src/lib/errors';

export default function ConnectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const connectionId = id || '';
  const { data: connection, isLoading, isError, error, refetch } = useConnectionDetail(connectionId);
  const shareContactMutation = useShareContact();

  const [serverError, setServerError] = useState<string | null>(null);
  const [profileMissingError, setProfileMissingError] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !connection) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <Screen style={styles.center}>
        <Text style={styles.errorText}>
          {is404
            ? 'This connection is no longer available'
            : 'Failed to load connection details'}
        </Text>
        <Button title="Back" variant="outline" onPress={() => router.back()} style={styles.backBtn} />
      </Screen>
    );
  }

  const otherUser = connection.otherUser || {};
  const name = otherUser.name || 'Anonymous User';
  const city = otherUser.city ? ` · ${otherUser.city}` : '';
  const industry = otherUser.industry ? ` · ${otherUser.industry}` : '';
  const reqTitle = connection.requirement?.title || 'Requirement';

  const skillsList = otherUser.skills || [];
  const badges = otherUser.badges || [];

  const hasEmailBadge = badges.includes('EMAIL') || badges.includes('EMAIL_DECLARED');
  const hasLinkedinBadge = badges.includes('LINKEDIN') || badges.includes('LINKEDIN_LINKED');
  const hasPhoneBadge = badges.includes('PHONE') || badges.includes('PHONE_LINKED');

  const phoneVal = otherUser.shareablePhone;
  const emailVal = otherUser.shareableEmail;
  const hasContactDetails = Boolean(phoneVal || emailVal);

  const handleShareContactPress = () => {
    if (shareContactMutation.isPending) return;
    setServerError(null);
    setProfileMissingError(false);

    Alert.alert(
      'Share Contact Info',
      `Your phone/email will be visible to ${name}. This cannot be undone in this version.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            try {
              await shareContactMutation.mutateAsync(connectionId);
            } catch (err: unknown) {
              if (err instanceof ApiError) {
                if (err.status === 400) {
                  setProfileMissingError(true);
                  setServerError(
                    'You must set at least one shareable contact field (phone or email) in your profile before sharing contact information.'
                  );
                } else {
                  setServerError(err.message);
                }
              } else {
                setServerError('Failed to share contact info. Please try again.');
              }
            }
          },
        },
      ]
    );
  };

  const handleCopy = async (textToCopy: string, label: string) => {
    try {
      await Clipboard.setStringAsync(textToCopy);
      setCopyFeedback(`${label} copied to clipboard!`);
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch (_e) {
      setCopyFeedback('Failed to copy');
    }
  };

  const handleCall = (phone: string) => {
    const sanitized = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${sanitized}`).catch(() => {
      Alert.alert('Unable to Call', 'Your device could not open the dialer.');
    });
  };

  const handleMail = (email: string) => {
    Linking.openURL(`mailto:${encodeURIComponent(email)}`).catch(() => {
      Alert.alert('Unable to Mail', 'Your device could not open the mail client.');
    });
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      {/* Top Header Card */}
      <View style={styles.card}>
        <Text style={styles.name}>{name}</Text>
        {(city || industry) ? <Text style={styles.metaLine}>{city.replace(/^ · /, '')}{industry}</Text> : null}

        {/* Badges */}
        <View style={styles.badgeRow}>
          {hasEmailBadge && (
            <View style={[styles.badge, styles.badgeWarn]}>
              <Text style={styles.badgeWarnText}>{VERIFICATION_LABELS.EMAIL_DECLARED}</Text>
            </View>
          )}
          {hasLinkedinBadge && (
            <View style={[styles.badge, styles.badgeTint]}>
              <Text style={styles.badgeTintText}>{VERIFICATION_LABELS.LINKEDIN_LINKED}</Text>
            </View>
          )}
          {hasPhoneBadge && (
            <View style={[styles.badge, styles.badgeTint]}>
              <Text style={styles.badgeTintText}>{VERIFICATION_LABELS.PHONE_LINKED}</Text>
            </View>
          )}
        </View>

        {/* Skills */}
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

        {/* Requirement */}
        <View style={styles.reqBox}>
          <Text style={styles.reqLabel}>Requirement:</Text>
          <Text style={styles.reqTitle}>{reqTitle}</Text>
        </View>
      </View>

      {/* Contact Unlock Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <Text style={styles.disclaimerText}>
          Sharing is one-way and cannot be undone in this version.
        </Text>

        <ErrorText message={serverError} />

        {profileMissingError && (
          <Button
            title="Edit Profile"
            variant="secondary"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.editProfileBtn}
          />
        )}

        {copyFeedback && (
          <View style={styles.feedbackBanner}>
            <Text style={styles.feedbackText}>{copyFeedback}</Text>
          </View>
        )}

        {/* Contact Status Info */}
        {hasContactDetails ? (
          <View style={styles.contactDetailsBox}>
            <View style={styles.unlockedBadge}>
              <Text style={styles.unlockedBadgeText}>✨ Contact Unlocked</Text>
            </View>

            {phoneVal && (
              <View style={styles.contactItemRow}>
                <View style={styles.contactItemInfo}>
                  <Text style={styles.contactItemLabel}>Phone:</Text>
                  <Text style={styles.contactItemValue}>{phoneVal}</Text>
                </View>

                <View style={styles.contactItemActions}>
                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleCall(phoneVal)}
                    accessibilityLabel="Call phone"
                  >
                    <Ionicons name="call" size={18} color={colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleCopy(phoneVal, 'Phone number')}
                    accessibilityLabel="Copy phone number"
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {emailVal && (
              <View style={styles.contactItemRow}>
                <View style={styles.contactItemInfo}>
                  <Text style={styles.contactItemLabel}>Email:</Text>
                  <Text style={styles.contactItemValue}>{emailVal}</Text>
                </View>

                <View style={styles.contactItemActions}>
                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleMail(emailVal)}
                    accessibilityLabel="Send email"
                  >
                    <Ionicons name="mail" size={18} color={colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconButton}
                    onPress={() => handleCopy(emailVal, 'Email address')}
                    accessibilityLabel="Copy email address"
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.lockedBox}>
            <Ionicons name="lock-closed" size={24} color={colors.mutedText} />
            <Text style={styles.lockedText}>
              Contact unlocks when both of you share
            </Text>
          </View>
        )}

        {/* Share Button / Shared Status */}
        <View style={styles.shareSection}>
          {connection.iHaveShared ? (
            <View style={styles.sharedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.sharedBadgeText}>You have shared your contact</Text>
            </View>
          ) : (
            <Button
              title="Share my contact"
              onPress={handleShareContactPress}
              disabled={shareContactMutation.isPending}
              loading={shareContactMutation.isPending}
              style={styles.shareBtn}
            />
          )}
        </View>

        {/* Disabled Chat Button */}
        <View style={styles.chatSection}>
          <Button
            title="Chat coming soon"
            disabled
            variant="outline"
            style={styles.disabledChatBtn}
          />
        </View>
      </View>
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
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  backBtn: {
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
  name: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  metaLine: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeWarn: {
    backgroundColor: '#FEF3C7',
  },
  badgeWarnText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.warn,
  },
  badgeTint: {
    backgroundColor: colors.tint,
  },
  badgeTintText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.ground,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  reqBox: {
    backgroundColor: '#F8FAFC',
    padding: spacing.sm,
    borderRadius: radius.input,
  },
  reqLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    textTransform: 'uppercase',
  },
  reqTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginBottom: spacing.md,
  },
  editProfileBtn: {
    marginBottom: spacing.md,
  },
  feedbackBanner: {
    backgroundColor: colors.tint,
    padding: spacing.xs,
    borderRadius: radius.input,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  contactDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  unlockedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  unlockedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.primary,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactItemInfo: {
    flex: 1,
  },
  contactItemLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
  },
  contactItemValue: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    marginTop: 2,
  },
  contactItemActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBox: {
    backgroundColor: colors.ground,
    borderRadius: radius.input,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  lockedText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  shareSection: {
    marginBottom: spacing.md,
  },
  shareBtn: {
    height: 48,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.tint,
    padding: spacing.sm,
    borderRadius: radius.input,
  },
  sharedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  chatSection: {
    borderTopWidth: 1,
    borderTopColor: colors.ground,
    paddingTop: spacing.md,
  },
  disabledChatBtn: {
    opacity: 0.6,
  },
});
