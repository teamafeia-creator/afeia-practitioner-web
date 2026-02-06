import { api } from './api';
import { PatientProfile } from '../types';

interface VerifyOtpResponse {
  valid: boolean;
  patientId?: string;
  patientEmail?: string;
  patientName?: string;
  tempToken?: string;
}

interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  patient: PatientProfile;
  needsAnamnese?: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  patient: PatientProfile;
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
  patientId: string;
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
