import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme/tokens';

export default function RequestsScreen() {
  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Interests & Requests</Text>
        <Text style={styles.subtitle}>Manage incoming and sent co-founder interests</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
  },
});
