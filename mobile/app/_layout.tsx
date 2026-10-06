import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { useAuthStore } from '../src/store/auth';
import { OfflineScreen } from '../src/components/OfflineScreen';
import { colors } from '../src/theme/tokens';

const queryClient = new QueryClient();

function InitialLayout() {
  const { status, hydrate, retryHydration } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || status === 'loading' || status === 'networkError') {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'signedOut' && !inAuthGroup) {
      // Redirect to login screen and prevent back navigation
      router.replace('/(auth)/login');
    } else if (status === 'signedIn' && inAuthGroup) {
      // Redirect to main tabs and prevent back navigation
      router.replace('/(tabs)/discover');
    }
  }, [status, segments, fontsLoaded]);

  if (!fontsLoaded || status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'networkError') {
    return <OfflineScreen onRetry={retryHydration} />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <InitialLayout />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ground,
  },
});
