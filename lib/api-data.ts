import { mockPatients } from '@/lib/mock';

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: 'praticien' | 'admin';
  password: string;
};

const apiUsers: ApiUser[] = [
  {
    id: 'u_001',
    email: 'demo@afeia.app',
    name: 'Demo Practitioner',
    role: 'praticien',
    password: 'demo1234'
  }
];

export function findUserByEmailPassword(email: string, password: string): Omit<ApiUser, 'password'> | null {
  const user = apiUsers.find((entry) => entry.email === email && entry.password === password);
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function findUserById(id: string): Omit<ApiUser, 'password'> | null {
  const user = apiUsers.find((entry) => entry.id === id);
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function getSummary() {
  const totalPatients = mockPatients.length;
  const premiumPatients = mockPatients.filter((patient) => patient.isPremium).length;
  const newQuestionnaire = mockPatients.filter((patient) => patient.flags.newQuestionnaire).length;
  const newCircularData = mockPatients.filter((patient) => patient.flags.newCircularData).length;
  const unreadMessages = mockPatients.reduce((sum, patient) => sum + patient.flags.unreadMessages, 0);

  return {
    totalPatients,
    premiumPatients,
    newQuestionnaire,
    newCircularData,
    unreadMessages
  };
}

export function getItems() {
  return mockPatients.map((patient) => ({
    id: patient.id,
    name: patient.name,
    age: patient.age,
    city: patient.city,
    isPremium: patient.isPremium,
    lastConsultation: patient.lastConsultation,
    nextConsultation: patient.nextConsultation,
    flags: patient.flags
  }));
}

export function getItemById(id: string) {
  return mockPatients.find((patient) => patient.id === id) ?? null;
}
