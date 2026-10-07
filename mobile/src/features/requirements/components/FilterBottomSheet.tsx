import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FilterState } from '../types';
import { SkillType, AvailabilityType } from '../../profile/types';
import { StageType } from '../types';
import { SKILL_OPTIONS, STAGE_OPTIONS, AVAILABILITY_OPTIONS } from '../../../constants/options';
import { colors, spacing, radius } from '../../../theme/tokens';

export interface FilterBottomSheetProps {
  initialFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  onClose: () => void;
}

export const FilterBottomSheet = forwardRef<BottomSheet, FilterBottomSheetProps>(
  ({ initialFilters, onApply, onReset, onClose }, ref) => {
    const snapPoints = useMemo(() => ['75%'], []);

    const [tempFilters, setTempFilters] = useState<FilterState>(initialFilters);

    useEffect(() => {
      setTempFilters(initialFilters);
    }, [initialFilters]);

    const handleApply = () => {
      onApply(tempFilters);
      onClose();
    };

    const handleReset = () => {
      setTempFilters({});
      onReset();
      onClose();
    };

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={(index) => {
          if (index === -1) onClose();
        }}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter Requirements</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Skill Filter */}
            <Text style={styles.sectionLabel}>Skill Needed</Text>
            <View style={styles.chipRow}>
              {SKILL_OPTIONS.map((item) => {
                const isSelected = tempFilters.skill === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.8}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() =>
                      setTempFilters((prev) => ({
                        ...prev,
                        skill: isSelected ? undefined : (item.value as SkillType),
                      }))
                    }
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stage Filter */}
            <Text style={styles.sectionLabel}>Startup Stage</Text>
            <View style={styles.chipRow}>
              {STAGE_OPTIONS.map((item) => {
                const isSelected = tempFilters.stage === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.8}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() =>
                      setTempFilters((prev) => ({
                        ...prev,
                        stage: isSelected ? undefined : (item.value as StageType),
                      }))
                    }
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Commitment Filter */}
            <Text style={styles.sectionLabel}>Commitment Level</Text>
            <View style={styles.chipRow}>
              {AVAILABILITY_OPTIONS.map((item) => {
                const isSelected = tempFilters.commitment === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.8}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() =>
                      setTempFilters((prev) => ({
                        ...prev,
                        commitment: isSelected ? undefined : (item.value as AvailabilityType),
                      }))
                    }
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location Input */}
            <TextField
              label="Location / City"
              placeholder="e.g. San Francisco, Austin"
              value={tempFilters.location || ''}
              onChangeText={(val) =>
                setTempFilters((prev) => ({
                  ...prev,
                  location: val.trim().length > 0 ? val : undefined,
                }))
              }
            />

            {/* Remote Switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Remote Only</Text>
              <Switch
                value={Boolean(tempFilters.remote)}
                onValueChange={(val) =>
                  setTempFilters((prev) => ({
                    ...prev,
                    remote: val ? true : undefined,
                  }))
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Button
              title="Apply Filters"
              onPress={handleApply}
              style={styles.applyBtn}
            />
          </View>
        </View>
      </BottomSheet>
    );
  }
);

FilterBottomSheet.displayName = 'FilterBottomSheet';

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.surface,
  },
  sheetContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ground,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
  },
  resetText: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.error,
  },
  scrollContent: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.ground,
    marginTop: spacing.sm,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    color: colors.ink,
  },
  buttonRow: {
    paddingTop: spacing.md,
  },
  applyBtn: {
    width: '100%',
  },
});
