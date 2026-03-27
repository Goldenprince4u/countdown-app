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
 * Schedules:
 * 1. A DAILY repeating notification at 9:00 AM reminding the user about this countdown
 * 2. A one-time notification at the exact target date/time when the countdown completes
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
    // Schedule up to 20 precise daily reminders at 09:00 until target date
    const daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const maxDays = Math.min(daysUntilTarget, 20); // Cap at 20 docs limit
    
    for (let i = 1; i <= maxDays; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        d.setHours(9, 0, 0, 0);
        
        if (d >= targetDate) continue; // Don't schedule a daily reminder on or after the actual target
        
        const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏳ ${countdown.title}`,
              body: "Your countdown is still ticking — open the app to see how close you are!",
              data: { countdownId: countdown.id },
              sound: 'default',
              interruptionLevel: 'timeSensitive',
              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: d,
            },
        });
        dailyNotificationIds.push(id);
    }

    // One-time notification when countdown reaches zero
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
      },
    });

    // Milestone notifications — only schedule if the milestone is still in the future
    const milestones = [
      { days: 30, label: '30 days' },
      { days: 7,  label: '1 week' },
      { days: 1,  label: 'tomorrow' },
    ];

    for (const { days, label } of milestones) {
      const milestoneDate = new Date(targetDate);
      milestoneDate.setDate(milestoneDate.getDate() - days);
      milestoneDate.setHours(9, 0, 0, 0);
      if (milestoneDate > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `📅 ${countdown.title} is ${label} away!`,
            body: `Get ready — your countdown is almost here.`,
            data: { countdownId: countdown.id },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.DEFAULT,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: milestoneDate,
          },
        });
        dailyNotificationIds.push(id);
      }
    }
  } catch (e) {
    console.warn('Failed to schedule notifications:', e);
    // Continue without notifications rather than breaking the save
  }

  return { dailyNotificationIds, completionNotificationId };
}

export async function cancelCountdownNotifications(countdown: Countdown): Promise<void> {
  const ids = [...(countdown.dailyNotificationIds || []), countdown.completionNotificationId].filter(Boolean) as string[];
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}
