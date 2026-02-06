export default {
  expo: {
    name: 'AFEIA',
    slug: 'afeia-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'afeia',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      backgroundColor: '#FAF8F5',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'fr.afeia.mobile',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FAF8F5',
      },
      package: 'fr.afeia.mobile',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || '',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
    ],
  },
};
