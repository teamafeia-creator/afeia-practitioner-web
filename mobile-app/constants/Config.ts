// Configuration de l'application AFEIA Patient

export const Config = {
  // API
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://afeia-practitioner-web-ijov.vercel.app/api/mobile',
  API_TIMEOUT: 15000,

  // App
  APP_NAME: 'AFEIA Patient',
  APP_VERSION: '1.0.0',

  // Storage Keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',
    ONBOARDING_COMPLETE: 'onboarding_complete',
    ANAMNESE_PROGRESS: 'anamnese_progress',
  },

  // Validation
  PASSWORD_MIN_LENGTH: 8,
  OTP_LENGTH: 6,

  // Anamnese
  ANAMNESE_TOTAL_SECTIONS: 12,

  // Animations
  ANIMATION_DURATION: 300,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
};

export default Config;
