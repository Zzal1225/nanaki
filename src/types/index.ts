// nanaki 프로젝트 타입 정의

import { Timestamp } from 'firebase/firestore';

// 사용자 정보
export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
}

// 스티커 타입
export interface Sticker {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD 형식
  type: 'positive' | 'negative';
  label: string;
  category?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 몸무게 기록
export interface WeightRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD 형식
  weight: number;
  unit: 'kg' | 'lb';
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 가계부 기록
export interface FinanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD 형식
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  paymentMethod?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 목표 설정
export interface Goal {
  id: string;
  userId: string;
  type: 'habit' | 'weight' | 'finance';
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 앱 설정
export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: 'ko' | 'en';
  notifications: {
    dailyReminder: boolean;
    goalAchievement: boolean;
    weeklyReport: boolean;
  };
  privacy: {
    shareData: boolean;
    analytics: boolean;
  };
  updatedAt: Timestamp;
}
