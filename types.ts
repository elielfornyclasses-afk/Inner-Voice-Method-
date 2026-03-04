
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

// Tipos de assinatura
export type SubscriptionPlan = 'free' | 'premium' | 'pro';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: number | null;
  startedAt: number;
}

// Sistema de convites
export interface InviteCode {
  code: string;
  plan: SubscriptionPlan;
  validityDays: number;
  maxUses: number;
  usedCount: number;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  usedBy: string[]; // Array de emails que usaram
  createdBy: string; // Email do admin
}
