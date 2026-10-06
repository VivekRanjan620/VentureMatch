import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function Index() {
  const { status } = useAuthStore();

  if (status === 'signedIn') {
    return <Redirect href="/(tabs)/discover" />;
  }

  return <Redirect href="/(auth)/login" />;
}
