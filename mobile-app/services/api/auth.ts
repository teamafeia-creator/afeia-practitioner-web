/**
 * Auth API Service
 */

import apiClient from './client';
import { TokenStorage } from '../storage/secureStore';
import type {
  OTPVerifyResponse,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  RefreshTokenResponse,
} from '@/types';

export const authApi = {
  /**
   * Verify OTP code
   */
  async verifyOTP(code: string): Promise<OTPVerifyResponse> {
    const response = await apiClient.post<OTPVerifyResponse>('/auth/verify-otp', {
      otp: code,
    });
    return response.data;
  },

  /**
   * Register new patient account
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);

    // Store tokens
    await TokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
    await TokenStorage.setPatientId(response.data.patient.id);

    return response.data;
  },

  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);

    // Store tokens
    await TokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
    await TokenStorage.setPatientId(response.data.patient.id);

    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = await TokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh-token', {
      refreshToken,
    });

    // Update access token
    await TokenStorage.setAccessToken(response.data.accessToken);

    return response.data;
  },

  /**
   * Logout - clear tokens
   */
  async logout(): Promise<void> {
    try {
      // Optionally notify server
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      // Always clear local tokens
      await TokenStorage.clearAll();
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await TokenStorage.getAccessToken();
    return !!token;
  },
};
