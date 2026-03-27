export type CountdownCategory = 'personal' | 'work' | 'birthday' | 'travel' | 'other';

export const CATEGORY_COLORS: Record<CountdownCategory, string> = {
  personal: '#FF6B6B',
  work:     '#4ECDC4',
  birthday: '#FFE66D',
  travel:   '#6C63FF',
  other:    '#A8E6CF',
};

export const CATEGORY_LABELS: Record<CountdownCategory, string> = {
  personal: '😊 Personal',
  work:     '💼 Work',
  birthday: '🎂 Birthday',
  travel:   '✈️ Travel',
  other:    '📌 Other',
};

export const CATEGORIES: CountdownCategory[] = [
  'personal',
  'work',
  'birthday',
  'travel',
  'other',
];

export interface Countdown {
  id: string;
  title: string;
  targetDate: string; // ISO string
  category: CountdownCategory;
  notificationsEnabled: boolean;
  dailyNotificationId?: string;
  completionNotificationId?: string;
  createdAt: string; // ISO string
  archivedAt?: string; // ISO string – set when the timer completes
  backgroundImageUri?: string; // Local URI for custom photo background
  repeatInterval?: 'yearly' | 'monthly' | 'weekly';
}

export interface TimeRemaining {
  total: number; // milliseconds
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function getTimeRemaining(targetDate: string): TimeRemaining {
  const total = new Date(targetDate).getTime() - Date.now();
  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  return {
    total,
    isExpired: false,
    days:    Math.floor(total / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((total % (1000 * 60)) / 1000),
  };
}
