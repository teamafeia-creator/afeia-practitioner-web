import axios from 'axios';

const API_URL = 'https://afeia-practitioner-web-ijov.vercel.app/api/patients';

export const api = {
  async verifyOTP(code: string) {
    // Pour l'instant, simule une réponse
    return {
      success: true,
      email: 'test@test.com',
      patientId: '123',
      tempToken: 'temp123',
    };
  },

  async register(email: string, password: string) {
    // Simule
    return { success: true };
  },
};
