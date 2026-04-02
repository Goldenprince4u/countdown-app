import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Countdown } from '@/types/countdown';

// Configure how notifications are shown when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Channel ID for the "X days to go" daily beep notifications */
const DAILY_BEEP_CHANNEL = 'countdown-daily-beep-v2';

/** Channel ID for milestone / general countdown reminders */
const REMINDERS_CHANNEL = 'countdown-reminders-v2';

/** Android notification group key so multiple notifications collapse together */
const GROUP_KEY = 'countdown-reminders';

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
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100],
      bypassDnd: false,
      sound: 'default',
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
      lightColor: '#6C63FF',
      showBadge: true,
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
 * Schedules "X days to go" beep notifications at 9:00 AM for each
 * remaining day before the target.
 *
 * iOS cap: 30 notifications (leaves 34 slots for other apps within the 64 hard limit).
 * Android cap: 490 notifications (out of 500 per-app limit).
 */
async function scheduleDailyCountdownNotifications(
  countdown: Countdown,
  daysUntilTarget: number
): Promise<string[]> {
  const ids: string[] = [];
  const targetDate = new Date(countdown.targetDate);

  // Cap at 30 on iOS (OS limit is 64 total per app), 490 on Android (OS limit is 500).
  const maxNotifications = Math.min(daysUntilTarget - 1, Platform.OS === 'ios' ? 30 : 490);

  for (let i = 1; i <= maxNotifications; i++) {
    const fireDate = new Date();
    fireDate.setDate(fireDate.getDate() + i);
    fireDate.setHours(9, 0, 0, 0);

    // Safety: never schedule on or after the target date
    if (fireDate >= targetDate) break;

    const daysRemaining = daysUntilTarget - i;
    const dayWord = daysRemaining === 1 ? 'day' : 'days';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ ${countdown.title}`,
        body: `${daysRemaining} ${dayWord} to go`,
        data: { countdownId: countdown.id },
        sound: 'default',
        interruptionLevel: 'timeSensitive',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        // Android: group notifications together
        ...(Platform.OS === 'android' ? { groupKey: GROUP_KEY } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: DAILY_BEEP_CHANNEL,
      } as Notifications.DateTriggerInput & { channelId?: string },
    });

    ids.push(id);
  }

  return ids;
}

/**
 * Schedules:
 * 1. A daily "X days to go" beep at 9:00 AM for every remaining day (capped for platform limits)
 * 2. A one-time completion notification at the exact target date/time
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
        ...(Platform.OS === 'android' ? { groupKey: GROUP_KEY } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        channelId: REMINDERS_CHANNEL,
      } as Notifications.DateTriggerInput & { channelId?: string },
    });

  } catch (e) {
    console.warn('Failed to schedule notifications:', e);
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
