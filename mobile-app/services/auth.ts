import { api } from './api';
import { ConsultantProfile } from '../types';

interface VerifyOtpResponse {
  valid: boolean;
  consultantId?: string;
  consultantEmail?: string;
  consultantName?: string;
  tempToken?: string;
}

interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  consultant: ConsultantProfile;
  needsAnamnese?: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  consultant: ConsultantProfile;
  needsAnamnese?: boolean;
}

export async function verifyOtp(otp: string): Promise<VerifyOtpResponse> {
  return api.post<VerifyOtpResponse>(
    '/api/mobile/auth/verify-otp',
    { otp },
    false,
  );
}

export async function register(params: {
  consultantId: string;
  email: string;
  password: string;
  tempToken: string;
}): Promise<RegisterResponse> {
  return api.post<RegisterResponse>(
    '/api/mobile/auth/register',
    params as unknown as Record<string, unknown>,
    false,
  );
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>(
    '/api/mobile/auth/login',
    { email, password },
    false,
  );
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/mobile/auth/logout');
  } catch {
    // Ignore logout errors
  }
}
