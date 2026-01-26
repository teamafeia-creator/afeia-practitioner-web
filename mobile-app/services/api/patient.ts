import { apiClient } from './client';
import type { APIResponse, Patient, Naturopathe } from '../../types';

// Service Patient API

export const patientService = {
  // Récupérer les informations du patient
  async getPatientInfo(): Promise<APIResponse<Patient>> {
    try {
      console.log('✅ API Call: getPatientInfo');
      const { data } = await apiClient.get('/patient/info');
      return data;
    } catch (error: any) {
      console.error('❌ getPatientInfo Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Mettre à jour le profil patient
  async updateProfile(updates: Partial<Patient>): Promise<APIResponse<Patient>> {
    try {
      console.log('✅ API Call: updateProfile', updates);
      const { data } = await apiClient.put('/patient/profile', updates);
      return data;
    } catch (error: any) {
      console.error('❌ updateProfile Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les informations du naturopathe
  async getNaturopathe(): Promise<APIResponse<Naturopathe>> {
    try {
      console.log('✅ API Call: getNaturopathe');
      const { data } = await apiClient.get('/patient/naturopathe');
      return data;
    } catch (error: any) {
      console.error('❌ getNaturopathe Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les consultations
  async getConsultations(): Promise<APIResponse<{ last?: string; next?: string }>> {
    try {
      console.log('✅ API Call: getConsultations');
      const { data } = await apiClient.get('/patient/consultations');
      return data;
    } catch (error: any) {
      console.error('❌ getConsultations Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Récupérer les données dashboard
  async getDashboard(): Promise<APIResponse<{
    patient: Patient;
    naturopathe: Naturopathe;
    lastConsultation?: string;
    nextConsultation?: string;
    unreadMessages: number;
    todayJournalComplete: boolean;
  }>> {
    try {
      console.log('✅ API Call: getDashboard');
      const { data } = await apiClient.get('/patient/dashboard');
      return data;
    } catch (error: any) {
      console.error('❌ getDashboard Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default patientService;
