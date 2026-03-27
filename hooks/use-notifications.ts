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

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('countdown-reminders', {
      name: 'Countdown Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules:
 * 1. A DAILY repeating notification at 9:00 AM reminding the user about this countdown
 * 2. A one-time notification at the exact target date/time when the countdown completes
 *
 * Returns the notification IDs so they can be stored and cancelled later.
 */
export async function scheduleCountdownNotifications(
  countdown: Countdown
): Promise<{ dailyNotificationId?: string; completionNotificationId?: string }> {
  const targetDate = new Date(countdown.targetDate);
  const now = new Date();

  if (targetDate <= now || !countdown.notificationsEnabled) {
    return {};
  }

  let dailyNotificationId: string | undefined;
  let completionNotificationId: string | undefined;

  try {
    // Daily reminder at 09:00 every day until manually cancelled (on archive/delete)
    dailyNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ ${countdown.title}`,
        body: "Your countdown is still ticking — open the app to see how close you are!",
        data: { countdownId: countdown.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });

    // One-time notification when countdown reaches zero
    completionNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 ${countdown.title} is today!`,
        body: "The moment you've been counting down to has arrived!",
        data: { countdownId: countdown.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });
  } catch (e) {
    console.warn('Failed to schedule notifications:', e);
    // Continue without notifications rather than breaking the save
  }

  return { dailyNotificationId, completionNotificationId };
}

export async function cancelCountdownNotifications(countdown: Countdown): Promise<void> {
  const ids = [countdown.dailyNotificationId, countdown.completionNotificationId].filter(Boolean) as string[];
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}
