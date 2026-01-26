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

  async submitAnamnese(data: Record<string, any>) {
    // Pour l'instant, simule une réponse
    // TODO: Wire to actual endpoint POST /anamnese
    const response = await axios.post(`${API_URL}/anamnese`, { data });
    return response.data;
  },
};
