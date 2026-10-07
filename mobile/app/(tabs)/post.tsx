import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { ErrorText } from '../../src/components/ErrorText';
import { colors, spacing, radius } from '../../src/theme/tokens';
import {
  useMyRequirements,
  useCreateRequirement,
  useUpdateRequirementStatus,
} from '../../src/features/requirements/hooks';
import {
  createRequirementSchema,
  CreateRequirementFormValues,
  buildCreateRequirementPayload,
} from '../../src/features/requirements/schemas';
import {
  RequirementSummaryItem,
  RequirementStatusType,
} from '../../src/features/requirements/types';
import {
  SKILL_OPTIONS,
  STAGE_OPTIONS,
  AVAILABILITY_OPTIONS,
  VISIBILITY_OPTIONS,
  INDUSTRY_SUGGESTIONS,
} from '../../src/constants/options';
import { formatApiError } from '../../src/lib/errors';

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [formApiError, setFormApiError] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useMyRequirements();
  const createMutation = useCreateRequirement();
  const updateStatusMutation = useUpdateRequirementStatus();

  const requirementsList = data?.requirements || [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRequirementFormValues>({
    resolver: zodResolver(createRequirementSchema),
    defaultValues: {
      title: '',
      needSkill: 'TECH',
      startupName: '',
      startupNamePublic: false,
      industry: '',
      stage: 'IDEA',
      currentUsers: '',
      ownerContributes: '',
      offer: '',
      equityOfferMax: '',
      commitment: 'FULL',
      location: '',
      remote: true,
      visibility: 'PUBLIC',
    },
  });

  const handleOpenModal = () => {
    reset();
    setFormApiError(null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setFormApiError(null);
  };

  const onSubmit = async (values: CreateRequirementFormValues) => {
    try {
      setFormApiError(null);
      const payload = buildCreateRequirementPayload(values);
      await createMutation.mutateAsync(payload);
      setModalVisible(false);
      reset();
    } catch (err: any) {
      setFormApiError(formatApiError(err));
    }
  };

  const handleStatusChange = (id: string, newStatus: RequirementStatusType) => {
    if (newStatus === 'CLOSED') {
      Alert.alert(
        'Close Requirement',
        'Are you sure you want to close this requirement? Potential candidates will no longer be able to submit interest.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Close Requirement',
            style: 'destructive',
            onPress: () => updateStatusMutation.mutate({ id, status: 'CLOSED' }),
          },
        ]
      );
    } else {
      updateStatusMutation.mutate({ id, status: newStatus });
    }
  };

  const renderStatusBadge = (status: RequirementStatusType) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <View style={[styles.badgeContainer, styles.badgeActive]}>
            <Text style={[styles.badgeText, styles.badgeTextActive]}>ACTIVE</Text>
          </View>
        );
      case 'PAUSED':
        return (
          <View style={[styles.badgeContainer, styles.badgePaused]}>
            <Text style={[styles.badgeText, styles.badgeTextPaused]}>PAUSED</Text>
          </View>
        );
      case 'CLOSED':
        return (
          <View style={[styles.badgeContainer, styles.badgeClosed]}>
            <Text style={[styles.badgeText, styles.badgeTextClosed]}>CLOSED</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderRequirementCard = ({ item }: { item: RequirementSummaryItem }) => {
    const isUpdating =
      updateStatusMutation.isPending && updateStatusMutation.variables?.id === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {renderStatusBadge(item.status)}
          </View>
          {item.startupName ? <Text style={styles.cardStartup}>{item.startupName}</Text> : null}
        </View>

        <View style={styles.cardPillsRow}>
          <View style={styles.skillBadge}>
            <Text style={styles.skillBadgeText}>{item.needSkill}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>{item.stage}</Text>
          </View>
          {item.commitment ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{item.commitment}</Text>
            </View>
          ) : null}
          {item.remote ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>Remote</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.cardIndustry}>Industry: {item.industry}</Text>

        {item.equityOfferMax !== null && item.equityOfferMax !== undefined ? (
          <Text style={styles.equityOfferText}>
            Founder offers up to {item.equityOfferMax}% equity
          </Text>
        ) : null}

        <View style={styles.cardActionsRow}>
          {item.status === 'ACTIVE' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              disabled={isUpdating}
              onPress={() => handleStatusChange(item.id, 'PAUSED')}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.actionBtnSecondaryText}>Pause</Text>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'PAUSED' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              disabled={isUpdating}
              onPress={() => handleStatusChange(item.id, 'ACTIVE')}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.actionBtnPrimaryText}>Resume</Text>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'CLOSED' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              disabled={isUpdating}
              onPress={() => handleStatusChange(item.id, 'ACTIVE')}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.actionBtnOutlineText}>Reopen</Text>
              )}
            </TouchableOpacity>
          )}

          {item.status !== 'CLOSED' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              disabled={isUpdating}
              onPress={() => handleStatusChange(item.id, 'CLOSED')}
            >
              <Text style={styles.actionBtnDangerText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Screen style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>My Requirements</Text>
          <Text style={styles.headerSubtitle}>Manage your active co-founder listings</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleOpenModal}>
          <Ionicons name="add-outline" size={20} color={colors.surface} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <ErrorText message={formatApiError(error)} />
          <Button title="Retry" onPress={() => refetch()} style={{ marginTop: spacing.md }} />
        </View>
      ) : (
        <FlatList
          data={requirementsList}
          keyExtractor={(item) => item.id}
          renderItem={renderRequirementCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.mutedText} />
              <Text style={styles.emptyTitle}>No Requirements Posted</Text>
              <Text style={styles.emptySubtitle}>
                Create a co-founder requirement to start matching with potential partners.
              </Text>
              <Button
                title="Post Requirement"
                onPress={handleOpenModal}
                style={styles.emptyButton}
              />
            </View>
          }
        />
      )}

      {/* New Requirement Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <Screen style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Post Requirement</Text>
            <TouchableOpacity
              onPress={handleCloseModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            {formApiError ? (
              <View style={styles.errorBanner}>
                <ErrorText message={formApiError} />
              </View>
            ) : null}

            {/* Requirement Title */}
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Title *"
                  placeholder="e.g. Lead Technical Co-Founder"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.title?.message}
                />
              )}
            />

            {/* Needed Skill */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Needed Skill *</Text>
              <Controller
                control={control}
                name="needSkill"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.optionsGrid}>
                    {SKILL_OPTIONS.map((opt) => {
                      const isSelected = value === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.pill, isSelected && styles.pillSelected]}
                          onPress={() => onChange(opt.value)}
                        >
                          <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.needSkill?.message ? (
                <Text style={styles.fieldError}>{errors.needSkill.message}</Text>
              ) : null}
            </View>

            {/* Startup Name */}
            <Controller
              control={control}
              name="startupName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Startup Name (Optional)"
                  placeholder="e.g. VentureMatch"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.startupName?.message}
                />
              )}
            />

            {/* Public Startup Name */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show startup name publicly</Text>
              <Controller
                control={control}
                name="startupNamePublic"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                )}
              />
            </View>

            {/* Industry with Suggestions */}
            <View style={styles.formSection}>
              <Controller
                control={control}
                name="industry"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.fieldGroup}>
                    <TextField
                      label="Industry *"
                      placeholder="e.g. Fintech, Healthcare, AI"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.industry?.message}
                    />
                    <Text style={styles.subLabel}>Suggestions:</Text>
                    <View style={styles.optionsGrid}>
                      {INDUSTRY_SUGGESTIONS.map((ind) => {
                        const isSelected = value === ind;
                        return (
                          <TouchableOpacity
                            key={ind}
                            style={[styles.pill, isSelected && styles.pillSelected]}
                            onPress={() => onChange(ind)}
                          >
                            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                              {ind}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              />
            </View>

            {/* Stage */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Startup Stage *</Text>
              <Controller
                control={control}
                name="stage"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.optionsGrid}>
                    {STAGE_OPTIONS.map((opt) => {
                      const isSelected = value === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.pill, isSelected && styles.pillSelected]}
                          onPress={() => onChange(opt.value)}
                        >
                          <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.stage?.message ? (
                <Text style={styles.fieldError}>{errors.stage.message}</Text>
              ) : null}
            </View>

            {/* Current Users */}
            <Controller
              control={control}
              name="currentUsers"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Current Users (Optional)"
                  placeholder="e.g. 500"
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.currentUsers?.message}
                />
              )}
            />

            {/* What Owner Contributes */}
            <Controller
              control={control}
              name="ownerContributes"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="What You Contribute (Optional)"
                  placeholder="e.g. Product design, domain expertise..."
                  multiline
                  numberOfLines={3}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.ownerContributes?.message}
                  style={styles.multilineInput}
                />
              )}
            />

            {/* Offer */}
            <Controller
              control={control}
              name="offer"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="What You Offer (Optional)"
                  placeholder="e.g. Co-founder equity stake, flexible hours..."
                  multiline
                  numberOfLines={3}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.offer?.message}
                  style={styles.multilineInput}
                />
              )}
            />

            {/* Max Equity Offer (%) */}
            <Controller
              control={control}
              name="equityOfferMax"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Max Equity Offer % (Optional)"
                  placeholder="e.g. 25"
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  helperText="Candidates will see this number: the maximum equity you are willing to offer."
                  error={errors.equityOfferMax?.message}
                />
              )}
            />

            {/* Commitment */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Commitment Level *</Text>
              <Controller
                control={control}
                name="commitment"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.optionsGrid}>
                    {AVAILABILITY_OPTIONS.map((opt) => {
                      const isSelected = value === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.pill, isSelected && styles.pillSelected]}
                          onPress={() => onChange(opt.value)}
                        >
                          <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.commitment?.message ? (
                <Text style={styles.fieldError}>{errors.commitment.message}</Text>
              ) : null}
            </View>

            {/* Location */}
            <Controller
              control={control}
              name="location"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Location (Optional)"
                  placeholder="e.g. San Francisco, CA"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.location?.message}
                />
              )}
            />

            {/* Remote Allowed */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Remote co-founders allowed</Text>
              <Controller
                control={control}
                name="remote"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                )}
              />
            </View>

            {/* TODO: Restore "Verified Members Only" visibility option when a verification flow exists */}

            <Button
              title="Post Requirement"
              onPress={handleSubmit(onSubmit)}
              loading={createMutation.isPending}
              style={styles.submitButton}
            />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginTop: 2,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
  },
  newBtnText: {
    color: colors.surface,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    marginBottom: spacing.xs,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    flex: 1,
    marginRight: spacing.xs,
  },
  cardStartup: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    marginTop: 2,
  },
  badgeContainer: {
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeActive: {
    backgroundColor: '#CCFBF1',
  },
  badgeTextActive: {
    color: '#0F766E',
  },
  badgePaused: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextPaused: {
    color: '#B45309',
  },
  badgeClosed: {
    backgroundColor: '#F1F5F9',
  },
  badgeTextClosed: {
    color: '#475569',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
  },
  cardPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  skillBadge: {
    backgroundColor: colors.tint,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.button,
  },
  skillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
  },
  metaBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.button,
  },
  metaBadgeText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
  },
  cardIndustry: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: colors.ink,
    marginTop: 2,
  },
  equityOfferText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.primary,
    marginTop: 4,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    minWidth: 70,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionBtnPrimaryText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
  },
  actionBtnSecondary: {
    backgroundColor: colors.tint,
  },
  actionBtnSecondaryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnOutlineText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
  },
  actionBtnDanger: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: '#FEF2F2',
  },
  actionBtnDangerText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    minWidth: 180,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: spacing.md,
  },
  errorBanner: {
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: 0,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    color: colors.mutedText,
    marginBottom: spacing.xs,
    marginTop: -spacing.xs,
  },
  formSection: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: colors.tint,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  pillTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  fieldError: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: colors.error,
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
