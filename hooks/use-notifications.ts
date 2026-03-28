import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Countdown } from '@/types/countdown';

// Configure how notifications are shown when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Channel ID for the 70-day "X days to go" daily beep notifications */
const DAILY_BEEP_CHANNEL = 'countdown-daily-beep';

/** Channel ID for milestone / general countdown reminders */
const REMINDERS_CHANNEL = 'countdown-reminders';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // General reminders channel (alarm-level, existing behaviour)
    await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, {
      name: 'Countdown Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      bypassDnd: true,
      sound: 'default',
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      lightColor: '#6C63FF',
    });

    // Daily "X days to go" beep channel — notification-level so it
    // only beeps (does NOT ring like an alarm). Still shows on lock
    // screen and as a heads-up banner because importance is HIGH.
    await Notifications.setNotificationChannelAsync(DAILY_BEEP_CHANNEL, {
      name: 'Daily Countdown Beep',
      importance: Notifications.AndroidImportance.HIGH, // lock screen + heads-up banner
      vibrationPattern: [0, 100], // short single pulse
      bypassDnd: false, // respect Do Not Disturb
      sound: 'default', // system beep / ding — NOT a custom ringing alarm
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION, // beep, not alarm
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      lightColor: '#6C63FF',
      showBadge: true,
      // enableLights: true is default for HIGH importance
    });
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === 'granted';
}

/**
 * Schedules one "X days to go" beep notification at 9:00 AM for each
 * remaining day before the target. Works for ANY countdown length.
 *
 * Android hard cap is 500 scheduled notifications per app; we cap at 490
 * to leave 10 slots for completion notifications and other countdowns.
 *
 * Body counts down: "299 days to go", "298 days to go", …, "1 day to go"
 */
async function scheduleDailyCountdownNotifications(
  countdown: Countdown,
  daysUntilTarget: number
): Promise<string[]> {
  const ids: string[] = [];
  const targetDate = new Date(countdown.targetDate);

  // Cap at 30 on iOS (OS limit is 64 total per app), 490 on Android (OS limit is 500).
  // The last day (day-0) is always handled by the separate completion notification.
  const maxNotifications = Math.min(daysUntilTarget - 1, Platform.OS === 'ios' ? 30 : 490);

  for (let i = 1; i <= maxNotifications; i++) {
    const fireDate = new Date();
    fireDate.setDate(fireDate.getDate() + i);
    fireDate.setHours(9, 0, 0, 0);

    // Safety: never schedule on or after the target date
    if (fireDate >= targetDate) break;

    const daysRemaining = daysUntilTarget - i; // e.g. 299, 298, … 1
    const dayWord = daysRemaining === 1 ? 'day' : 'days';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ ${countdown.title}`,
        body: `${daysRemaining} ${dayWord} to go`,
        data: { countdownId: countdown.id },
        sound: 'default',
        interruptionLevel: 'timeSensitive',   // iOS: lock screen + banner over apps
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: DAILY_BEEP_CHANNEL,        // Android: beep channel
      } as Notifications.DateTriggerInput & { channelId?: string },
    });

    ids.push(id);
  }

  return ids;
}

/**
 * Schedules:
 * 1. A daily "X days to go" beep at 9:00 AM for every remaining day
 *    (any countdown length — 5 days, 100 days, 365 days, etc.)
 * 2. A one-time completion notification at the exact target date/time.
 *
 * Returns the notification IDs so they can be stored and cancelled later.
 */
export async function scheduleCountdownNotifications(
  countdown: Countdown
): Promise<{ dailyNotificationIds?: string[]; completionNotificationId?: string }> {
  const targetDate = new Date(countdown.targetDate);
  const now = new Date();

  if (targetDate <= now || !countdown.notificationsEnabled) {
    return {};
  }

  let dailyNotificationIds: string[] = [];
  let completionNotificationId: string | undefined;

  try {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / msPerDay);

    // Schedule daily "X days to go" beeps for every remaining day
    dailyNotificationIds = await scheduleDailyCountdownNotifications(countdown, daysUntilTarget);

    // Completion notification at the exact moment the countdown hits zero
    completionNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 ${countdown.title} is today!`,
        body: "The moment you've been counting down to has arrived!",
        data: { countdownId: countdown.id },
        sound: 'default',
        interruptionLevel: 'timeSensitive',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        channelId: REMINDERS_CHANNEL,
      } as Notifications.DateTriggerInput & { channelId?: string },
    });

  } catch (e) {
    console.warn('Failed to schedule notifications:', e);
    // Continue without notifications rather than breaking the save
  }

  return { dailyNotificationIds, completionNotificationId };
}

export async function cancelCountdownNotifications(countdown: Countdown): Promise<void> {
  const ids = [
    ...(countdown.dailyNotificationIds || []),
    countdown.completionNotificationId,
  ].filter(Boolean) as string[];
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}
