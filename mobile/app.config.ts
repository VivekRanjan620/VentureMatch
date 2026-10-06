import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDev = process.env.APP_ENV === 'development' || process.env.NODE_ENV === 'development';

  return {
    ...config,
    name: 'VentureMatch',
    slug: 'venturematch-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'venturematch',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0F766E',
      },
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#0F766E',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: isDev,
          },
        },
      ],
    ],
  };
};
