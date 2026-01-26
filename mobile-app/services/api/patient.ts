/**
 * Patient API Service
 */

import apiClient from './client';
import type { PatientProfile, NaturopatheInfo, Patient } from '@/types';

export const patientApi = {
  /**
   * Get patient profile with naturopathe info
   */
  async getProfile(): Promise<PatientProfile> {
    const response = await apiClient.get<PatientProfile>('/patient/profile');
    return response.data;
  },

  /**
   * Update patient profile
   */
  async updateProfile(data: Partial<Patient>): Promise<Patient> {
    const response = await apiClient.put<Patient>('/patient/profile', data);
    return response.data;
  },

  /**
   * Get naturopathe info with consultation dates
   */
  async getNaturopatheInfo(): Promise<NaturopatheInfo> {
    const response = await apiClient.get<NaturopatheInfo>('/patient/naturopathe-info');
    return response.data;
  },

  /**
   * Upload avatar image
   */
  async uploadAvatar(imageBase64: string): Promise<{ avatarUrl: string }> {
    const response = await apiClient.post<{ avatarUrl: string }>('/patient/avatar', {
      image: imageBase64,
    });
    return response.data;
  },
};
