import { getTokens, setTokens, clearTokens } from '../utils/storage';
import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  const url =
    Constants.expoConfig?.extra?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    '';
  return url.replace(/\/$/, '');
};

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  private async getHeaders(authenticated = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authenticated) {
      const tokens = await getTokens();
      if (tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        await clearTokens();
        throw new Error('SESSION_EXPIRED');
      }
      throw new Error('TOKEN_REFRESHED');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || `Erreur ${response.status}`);
    }

    return data as T;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const tokens = await getTokens();
      if (!tokens?.refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/api/mobile/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      await setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      return true;
    } catch {
      return false;
    }
  }

  async get<T>(path: string, authenticated = true): Promise<T> {
    const headers = await this.getHeaders(authenticated);
    const response = await fetch(`${this.baseUrl}${path}`, { headers });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: Record<string, unknown>, authenticated = true): Promise<T> {
    const headers = await this.getHeaders(authenticated);
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body: Record<string, unknown>, authenticated = true): Promise<T> {
    const headers = await this.getHeaders(authenticated);
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, body: Record<string, unknown>, authenticated = true): Promise<T> {
    const headers = await this.getHeaders(authenticated);
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }
}

export const api = new ApiClient();
