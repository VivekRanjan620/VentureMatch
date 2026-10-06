import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from './Screen';
import { Button } from './Button';
import { colors, spacing } from '../theme/tokens';

export interface OfflineScreenProps {
  onRetry: () => Promise<void>;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Can&apos;t reach the server</Text>
        <Text style={styles.subtitle}>
          Please check your internet connection and make sure the server is running.
        </Text>
        <Button
          title="Retry"
          loading={retrying}
          onPress={handleRetry}
          style={styles.button}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'DMSans_700Bold',
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: colors.mutedText,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    maxWidth: 280,
  },
});
