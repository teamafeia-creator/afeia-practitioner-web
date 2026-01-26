/**
 * AFEIA Mobile App - Types
 */

// ============================================
// Auth Types
// ============================================

export interface OTPVerifyResponse {
  valid: boolean;
  patientId: string;
  tempToken: string;
  patientEmail: string;
  patientName: string;
}

export interface RegisterRequest {
  patientId: string;
  email: string;
  password: string;
  tempToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  patient: Patient;
  needsAnamnese: boolean;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// ============================================
// Patient Types
// ============================================

export interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  avatarUrl?: string;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile extends Patient {
  subscription?: Subscription;
  naturopathe?: Naturopathe;
  caseFileId?: string;
}

export interface Naturopathe {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  specializations?: string[];
}

export interface NaturopatheInfo {
  naturopathe: Naturopathe;
  lastConsultation?: string;
  nextConsultation?: string;
}

// ============================================
// Anamnese Types
// ============================================

export interface AnamneseSection1 {
  nom: string;
  age: string;
  profession: string;
  situationFamiliale: string;
  poids: string;
  taille: string;
  medecinTraitant?: string;
  traitementsActuels?: string;
  allergies?: string;
}

export interface AnamneseSection2 {
  profil: 'introverti' | 'extraverti' | 'entre_les_deux';
  temperament: string[];
  anxiete: string;
}

export interface AnamneseSection3 {
  motifConsultation: string;
  objectifsAmelioration: string;
  dureeDesequilibres: string;
  periodesAmelioration: string;
}

export interface AnamneseSection4 {
  habitudesAlimentaires: string;
  nombreRepas: string;
  petitDejeuner: string;
  petitDejeunerComposition?: string;
  typesRepas: 'maison' | 'exterieur' | 'mixte';
  alimentsFrequents: string[];
  boissonsFrequentes: string;
  enviesAlimentaires: string;
}

export interface AnamneseSection5 {
  digestion: string;
  frequenceTransit: string;
  variationTransit: string;
  remarquesTransit?: string;
}

export interface AnamneseSection6 {
  heureCoucher: string;
  heureReveil: string;
  typeSommeil: 'leger' | 'profond' | 'entre_les_deux';
  reposReveil: string;
  reveilsNocturnes: string;
  coupsFatigue: string;
  remarquesSommeil?: string;
}

export interface AnamneseSection7 {
  activitePhysique: string;
  frequenceActivite?: string;
  activiteSouhaitee?: string;
  douleursTensions: string;
}

export interface AnamneseSection8 {
  stressFrequent: string;
  sourcesTension: string;
  sourcesDetente: string;
  expressionEmotions: string;
  humeurGenerale: string;
}

export interface AnamneseSection9 {
  transpiration: string;
  typePeau: 'seche' | 'grasse' | 'mixte' | 'sensible';
  problemesPeau: string;
  urines: string;
  remarquesElimination?: string;
}

export interface AnamneseSection10Femme {
  gender: 'female';
  reglesRegulieres: 'oui' | 'non' | 'parfois';
  dureeRegles: string;
  douleursRegles: string;
  intensiteDouleurs: 'legere' | 'moyenne' | 'forte';
  changementsAvantRegles: string;
  variationsEnergie: string;
  menopausee: 'oui' | 'non';
  symptomesMenopause?: string;
  contraception: string;
  remarquesCycle?: string;
}

export interface AnamneseSection10Homme {
  gender: 'male';
  niveauEnergie: string;
  tensionsBasVentre: string;
  sommeilRecuperation: string;
  remarquesVitalite?: string;
}

export type AnamneseSection10 = AnamneseSection10Femme | AnamneseSection10Homme;

export interface AnamneseSection11 {
  eauParJour: string;
  fumeur: string;
  alcool: string;
  tempsNature: string;
  activitesPlaisir: string;
}

export interface AnamneseSection12 {
  questionOuverte: string;
}

export interface AnamneseData {
  section1: AnamneseSection1;
  section2: AnamneseSection2;
  section3: AnamneseSection3;
  section4: AnamneseSection4;
  section5: AnamneseSection5;
  section6: AnamneseSection6;
  section7: AnamneseSection7;
  section8: AnamneseSection8;
  section9: AnamneseSection9;
  section10: AnamneseSection10;
  section11: AnamneseSection11;
  section12: AnamneseSection12;
}

export interface Anamnese {
  id: string;
  patientId: string;
  data: AnamneseData;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Complements Types
// ============================================

export interface Complement {
  id: string;
  name: string;
  dosage: string;
  frequency: 'matin' | 'midi' | 'soir' | 'matin_soir' | 'matin_midi_soir';
  durationDays: number;
  startDate: string;
  endDate?: string;
  instructions?: string;
  active: boolean;
  takenToday: boolean;
}

export interface ComplementTracking {
  id: string;
  complementId: string;
  date: string;
  taken: boolean;
  timeTaken?: string;
}

export interface TrackComplementRequest {
  complementId: string;
  date: string;
  taken: boolean;
}

// ============================================
// Conseils Types
// ============================================

export type ConseilCategory =
  | 'alimentation'
  | 'hygiene_vie'
  | 'exercices'
  | 'bien_etre'
  | 'plantes'
  | 'autre';

export interface Conseil {
  id: string;
  category: ConseilCategory;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

// ============================================
// Messages Types
// ============================================

export interface Message {
  id: string;
  senderId: string;
  senderType: 'patient' | 'praticien';
  content: string;
  imageUrl?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
  image?: string; // Base64
}

// ============================================
// Journal Types
// ============================================

export interface JournalEntry {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  alimentationQuality: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  complementsTaken: string[];
  problemesParticuliers?: string;
  noteNaturopathe?: string;
  createdAt: string;
}

export interface CreateJournalEntryRequest {
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  alimentationQuality: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  complementsTaken: string[];
  problemesParticuliers?: string;
  noteNaturopathe?: string;
}

// ============================================
// Wearable Types
// ============================================

export interface WearableSleepData {
  duration: number; // minutes
  score: number; // 0-100
  phases: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
}

export interface WearableHRVData {
  average: number;
  trend: 'up' | 'down' | 'stable';
}

export interface WearableHeartRateData {
  average: number;
  min: number;
  max: number;
}

export interface WearableActivityData {
  steps: number;
  calories: number;
  distance: number; // meters
}

export interface WearableData {
  date: string;
  sleep: WearableSleepData;
  hrv: WearableHRVData;
  heartRate: WearableHeartRateData;
  activity: WearableActivityData;
}

// ============================================
// Articles Types
// ============================================

export type ArticleCategory =
  | 'nutrition'
  | 'sommeil'
  | 'stress'
  | 'digestion'
  | 'activite'
  | 'plantes';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: ArticleCategory;
  tags: string[];
  imageUrl?: string;
  readTimeMinutes: number;
  publishedAt: string;
  isFavorite: boolean;
}

// ============================================
// Subscription Types
// ============================================

export type SubscriptionPlan = 'free' | 'premium_monthly' | 'premium_yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due';

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAt?: string;
}

// ============================================
// API Types
// ============================================

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DateRangeQuery {
  startDate: string;
  endDate: string;
}
