// === Auth ===
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ConsultantProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  isPremium: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  consultant: ConsultantProfile | null;
  tokens: AuthTokens | null;
}

// === Naturopathe ===
export interface Naturopathe {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  specializations?: string[];
}

// === Messages ===
export interface Message {
  id: string;
  senderId: string;
  senderType: 'consultant' | 'praticien';
  content: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

// === Plans ===
export interface Plan {
  id: string;
  version: number;
  status: 'draft' | 'shared';
  content: Record<string, unknown>;
  sharedAt?: string;
  createdAt: string;
  updatedAt?: string;
  practitioner?: {
    id: string;
    name: string;
    email: string;
  };
}

// === Compléments ===
export interface Complement {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  instructions?: string;
  active: boolean;
  takenToday: boolean;
}

// === Journal ===
export interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  alimentationQuality: string;
  sleepQuality: string;
  energyLevel: string;
  complementsTaken?: Record<string, unknown>[];
  problemesParticuliers?: string;
  noteNaturopathe?: string;
}

// === Anamnèse ===
export interface AnamneseData {
  id?: string;
  data: Record<string, unknown>;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// === Articles / Conseils ===
export interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  excerpt?: string;
  publishedAt?: string;
}

// === Appointments ===
export interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  notes?: string;
}

// === API Response wrapper ===
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
