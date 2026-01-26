import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_DATA: 'user_data',
  ANAMNESE_DRAFT: 'anamnese_draft',
  JOURNAL_DRAFT: 'journal_draft',
  SETTINGS: 'settings',
};

export const storage = {
  async saveUserData(userData: any) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  async getUserData() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  async saveAnamneseDraft(draft: any) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ANAMNESE_DRAFT, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving anamnese draft:', error);
    }
  },

  async getAnamneseDraft() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ANAMNESE_DRAFT);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting anamnese draft:', error);
      return null;
    }
  },

  async clearAnamneseDraft() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ANAMNESE_DRAFT);
    } catch (error) {
      console.error('Error clearing anamnese draft:', error);
    }
  },

  async saveJournalDraft(draft: any) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL_DRAFT, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving journal draft:', error);
    }
  },

  async getJournalDraft() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.JOURNAL_DRAFT);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting journal draft:', error);
      return null;
    }
  },

  async saveSettings(settings: any) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  async getSettings() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  },

  async clearAll() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
