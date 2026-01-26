export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface Naturopathe {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Complement {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: number;
  instructions?: string;
  takenToday: boolean;
}

export interface Conseil {
  id: string;
  category: string;
  title: string;
  content: string;
  date: string;
  read: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: number;
  alimentation: number;
  sleep: number;
  energy: number;
  complementsTaken: string[];
  problems?: string;
  noteForNaturo?: string;
}

export interface AnamneseData {
  section1: any;
  section2: any;
  section3: any;
  section4: any;
  section5: any;
  section6: any;
  section7: any;
  section8: any;
  section9: any;
  section10: any;
  section11: any;
  section12: any;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  imageUrl?: string;
  date: string;
}

export interface WearableData {
  steps: number;
  heartRate: number;
  sleep: number;
  calories: number;
  lastSync?: string;
}
