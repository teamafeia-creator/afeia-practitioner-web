export default {
  expo: {
    name: "AFEIA",
    slug: "afeia-patient",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    backgroundColor: "#F5EFE7",
    primaryColor: "#2A8080",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F5EFE7"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.afeia.patient"
    },
    android: {
      package: "com.afeia.patient",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F5EFE7"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ldlojanehidmykveuqop.supabase.co",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbG9qYW5laGlkbXlrdmV1cW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNjkyODIsImV4cCI6MjA4NDY0NTI4Mn0.fdw5qvl6OTPKbOhc5ZGi0bnkGGRPyivT_ENTxQsLj9w",
      apiBaseUrl: process.env.EXPO_PUBLIC_API_URL
        || process.env.EXPO_PUBLIC_API_BASE_URL
        || process.env.EXPO_PUBLIC_SITE_URL
        || process.env.EXPO_PUBLIC_APP_URL
        || process.env.NEXT_PUBLIC_SITE_URL
        || process.env.NEXT_PUBLIC_APP_URL
        || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : ""),
    }
  }
};
