// Types TypeScript pour l'application AFEIA Patient

// Utilisateurs
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient extends User {
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  naturopatheId: string;
  naturopathe?: Naturopathe;
  anamneseComplete: boolean;
  lastConsultation?: string;
  nextConsultation?: string;
}

export interface Naturopathe {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  specialties?: string[];
  bio?: string;
}

// Compléments
export interface Complement {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  durationDays: number;
  startDate: string;
  endDate?: string;
  instructions?: string;
  category: ComplementCategory;
  takenToday: boolean;
  daysRemaining: number;
  progressPercent: number;
}

export type ComplementCategory =
  | 'vitamines'
  | 'mineraux'
  | 'plantes'
  | 'probiotiques'
  | 'acides_gras'
  | 'autres';

export interface ComplementTracking {
  id: string;
  complementId: string;
  date: string;
  taken: boolean;
  notes?: string;
}

// Conseils
export interface Conseil {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: ConseilCategory;
  isRead: boolean;
  createdAt: string;
}

export type ConseilCategory =
  | 'alimentation'
  | 'hygiene_vie'
  | 'exercices'
  | 'bien_etre'
  | 'plantes';

// Messages
export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderType: 'patient' | 'naturopathe';
}

export interface Conversation {
  id: string;
  naturopathe: Naturopathe;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

// Journal
export interface JournalEntry {
  id: string;
  patientId: string;
  date: string;
  mood: number; // 1-5
  alimentation: number; // 1-5
  sommeil: number; // 1-5
  energie: number; // 1-5
  complementsTaken: string[]; // IDs des compléments pris
  problems?: string;
  noteNaturopathe?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalStats {
  averageMood: number;
  averageAlimentation: number;
  averageSommeil: number;
  averageEnergie: number;
  totalEntries: number;
  currentStreak: number;
}

// Anamnèse
export interface AnamneseData {
  // Section 1: Informations générales
  section1: {
    firstName: string;
    lastName: string;
    age: number;
    profession: string;
    familySituation: string;
    weight: number;
    height: number;
    doctor: string;
    currentTreatments: string;
    allergies: string;
  };
  // Section 2: Profil personnel et émotionnel
  section2: {
    personality: 'introvert' | 'extrovert' | 'ambivert';
    temperament: string;
    anxietyLevel: number;
  };
  // Section 3: Motif de consultation
  section3: {
    reasonForConsultation: string;
    wantToImprove: string;
    symptomsDuration: string;
    symptomsPeriods: string;
  };
  // Section 4: Alimentation et hydratation
  section4: {
    eatingHabits: string;
    mealsPerDay: number;
    hasBreakfast: boolean;
    foodTypes: string[];
    beverages: string[];
    cravings: string;
  };
  // Section 5: Digestion et transit
  section5: {
    digestionQuality: string;
    bowelFrequency: string;
    digestiveVariations: string;
  };
  // Section 6: Sommeil et énergie
  section6: {
    bedtime: string;
    wakeTime: string;
    sleepQuality: number;
    nightWakeups: boolean;
    energyDips: string;
  };
  // Section 7: Activité physique et posture
  section7: {
    regularActivity: boolean;
    activityType: string;
    activityFrequency: string;
    bodyPains: string;
  };
  // Section 8: Stress, émotions et équilibre intérieur
  section8: {
    stressLevel: number;
    bodyTensions: string;
    relaxationMethods: string;
    emotionInternalization: boolean;
    generalMood: string;
  };
  // Section 9: Élimination et peau
  section9: {
    perspiration: string;
    skinType: string;
    skinIssues: string;
    urineColor: string;
  };
  // Section 10: Pour les femmes
  section10Female?: {
    regularCycles: boolean;
    cycleDuration: number;
    menstrualPain: boolean;
    premenstrualChanges: string;
    energyVariations: string;
    menopauseStatus: string;
    contraception: string;
  };
  // Section 10bis: Pour les hommes
  section10Male?: {
    energyLevel: number;
    lowerBodyTensions: string;
    sleepRecovery: string;
  };
  // Section 11: Mode de vie global
  section11: {
    dailyWaterIntake: number;
    smokingStatus: string;
    alcoholConsumption: string;
    natureExposure: string;
    pleasureActivities: string;
  };
  // Section 12: Question ouverte
  section12: {
    additionalInfo: string;
  };
}

export interface AnamneseProgress {
  currentSection: number;
  completedSections: number[];
  data: Partial<AnamneseData>;
  lastUpdated: string;
}

// Wearable
export interface WearableData {
  connected: boolean;
  lastSync?: string;
  sleep?: {
    duration: number; // minutes
    score: number; // 0-100
    deepSleep: number;
    remSleep: number;
    lightSleep: number;
  };
  heartRate?: {
    average: number;
    min: number;
    max: number;
    restingHR: number;
  };
  hrv?: {
    value: number;
    trend: 'up' | 'down' | 'stable';
  };
  activity?: {
    steps: number;
    goal: number;
    calories: number;
    activeMinutes: number;
  };
}

// Articles
export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  imageUrl?: string;
  readingTime: number; // minutes
  isFavorite: boolean;
  createdAt: string;
}

// API Responses
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface APIError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  inviteCode: string;
  firstName?: string;
  lastName?: string;
}

export interface OTPVerification {
  code: string;
  email?: string;
}

// Notifications
export interface NotificationSettings {
  pushEnabled: boolean;
  complementReminders: boolean;
  journalReminder: boolean;
  messagesNotifications: boolean;
}
