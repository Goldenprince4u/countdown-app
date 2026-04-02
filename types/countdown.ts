export type CountdownCategory = 'personal' | 'work' | 'birthday' | 'travel' | 'other';
export type DisplayMode = 'countdown' | 'countup' | 'expired';

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

/** Preset accent colors a user can assign per-countdown */
export const ACCENT_COLORS = [
  '#FF6B6B', // coral red
  '#4ECDC4', // teal
  '#FFE66D', // yellow
  '#6C63FF', // purple
  '#A8E6CF', // mint
  '#FF9A3C', // orange
  '#00E5FF', // cyan
  '#FF6FD8', // pink
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
  /** How long (in seconds) to ring the alarm when the countdown hits zero. Default 15, max 60. */
  alarmDuration?: number;
  /** ISO string tracking when notifications were last scheduled, for background top-ups (iOS limits) */
  lastRescheduledAt?: string;
  /** Flags if the countdown was manually restored from the archive */
  isRestored?: boolean;
  /** Flags if the countdown was created as a milestone (target date in the past) */
  isMilestone?: boolean;
  /** Pin to top of list regardless of sort order */
  isPinned?: boolean;
  /** Custom accent color overriding the category default */
  accentColor?: string;
  /** Manual sort order for drag-to-reorder (lower = higher in list) */
  sortOrder?: number;
}

export interface TimeRemaining {
  total: number; // milliseconds
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isPast: boolean;
  /** Derived display mode: 'countdown' = future, 'countup' = milestone/past, 'expired' = just hit zero */
  displayMode: DisplayMode;
}

export function getTimeRemaining(targetDate: string, now: number = Date.now()): TimeRemaining {
  const target = new Date(targetDate).getTime();
  const isPast = now >= target;
  const difference = isPast ? now - target : target - now;
  const isExpired = isPast;

  let displayMode: DisplayMode;
  if (!isPast) {
    displayMode = 'countdown';
  } else if (difference < 5000) {
    // Just hit zero within 5 seconds
    displayMode = 'expired';
  } else {
    displayMode = 'countup';
  }

  return {
    total: difference,
    isExpired,
    isPast,
    displayMode,
    days:    Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
  };
}

/**
 * migrateSchema — fills in default values for fields added after initial release.
 * Called at load time to prevent undefined-field crashes on old persisted data.
 */
export function migrateSchema(raw: any[]): Countdown[] {
  return raw.map((item): Countdown => ({
    notificationsEnabled: true,
    category: 'personal',
    ...item,
    // Ensure numeric fields have sane defaults
    alarmDuration: typeof item.alarmDuration === 'number'
      ? Math.min(item.alarmDuration, 60)
      : 15,
    // Boolean defaults
    isPinned: item.isPinned ?? false,
    isMilestone: item.isMilestone ?? false,
    isRestored: item.isRestored ?? false,
  }));
}
