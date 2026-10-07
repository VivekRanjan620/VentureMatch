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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/auth';
import { useMe } from '../src/features/profile/hooks';
import { OfflineScreen } from '../src/components/OfflineScreen';
import { colors } from '../src/theme/tokens';

const queryClient = new QueryClient();

function InitialLayout() {
  const { status, hydrate, retryHydration } = useAuthStore();
  const { data: meData, isLoading: meLoading } = useMe();
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
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (status === 'signedOut' && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (status === 'signedIn') {
      if (meLoading) return;

      const user = meData?.user;
      if (user) {
        const isComplete = Boolean(user.profileComplete) && Boolean(user.commitmentComplete);

        if (!isComplete && !inOnboardingGroup) {
          // Gate user into onboarding flow until profile & commitment are complete
          router.replace('/(onboarding)');
        } else if (isComplete && (inAuthGroup || inOnboardingGroup)) {
          // Both complete -> allow into tabs
          router.replace('/(tabs)/discover');
        }
      }
    }
  }, [status, meData, meLoading, segments, fontsLoaded]);

  if (!fontsLoaded || status === 'loading' || (status === 'signedIn' && meLoading)) {
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
    <GestureHandlerRootView style={styles.rootView}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <InitialLayout />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ground,
  },
});
