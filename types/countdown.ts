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
  dailyNotificationIds?: string[];
  completionNotificationId?: string;
  createdAt: string; // ISO string
  archivedAt?: string; // ISO string – set when the timer completes
  backgroundImageUri?: string; // Local URI for custom photo background
  repeatInterval?: 'yearly' | 'monthly' | 'weekly';
  notes?: string;
  /** How long (in seconds) to ring the alarm when the countdown hits zero. Default 15. */
  alarmDuration?: number;
  /** ISO string tracking when notifications were last scheduled, for background top-ups (iOS limits) */
  lastRescheduledAt?: string;
}


export interface TimeRemaining {
  total: number; // milliseconds
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isPast: boolean;
}

export function getTimeRemaining(targetDate: string, now: number = Date.now()): TimeRemaining {
  const target = new Date(targetDate).getTime();
  const isPast = now >= target;
  const difference = isPast ? now - target : target - now;

  return {
    total: difference,
    isExpired: isPast,
    isPast,
    days:    Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
  };
}
