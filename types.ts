
export enum DayOfWeek {
  MONDAY = 'Segunda',
  TUESDAY = 'Terça',
  WEDNESDAY = 'Quarta',
  THURSDAY = 'Quinta',
  FRIDAY = 'Sexta'
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  focus: string;
}

export interface DailyMethod {
  day: DayOfWeek;
  title: string;
  steps: string[];
  instruction: string;
}

export interface TranscriptionItem {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface AccessCode {
  key: string;
  expiry: number; // Timestamp em ms
  createdAt: number;
  description: string;
  isActive: boolean;
}
