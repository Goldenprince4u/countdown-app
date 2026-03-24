import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Countdown } from '@/types/countdown';
import {
  scheduleCountdownNotifications,
  cancelCountdownNotifications,
} from '@/hooks/use-notifications';

const STORAGE_KEY = '@countdowns_v1';

export function useCountdowns() {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCountdowns = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setCountdowns(JSON.parse(json));
    } catch (e) {
      console.error('Failed to load countdowns', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCountdowns();
  }, [loadCountdowns]);

  const persist = async (updated: Countdown[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setCountdowns(updated);
  };

  const addCountdown = useCallback(
    async (draft: Omit<Countdown, 'id' | 'createdAt'>): Promise<Countdown> => {
      const placeholder: Countdown = {
        ...draft,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const { dailyNotificationId, completionNotificationId } =
        await scheduleCountdownNotifications(placeholder);

      const newCountdown: Countdown = {
        ...placeholder,
        dailyNotificationId,
        completionNotificationId,
      };

      const updated = [...countdowns, newCountdown];
      await persist(updated);
      return newCountdown;
    },
    [countdowns]
  );

  const updateCountdown = useCallback(
    async (id: string, changes: Partial<Countdown>): Promise<void> => {
      const existing = countdowns.find(c => c.id === id);
      if (!existing) return;

      // If notification setting or target date changed, reschedule
      const needsReschedule =
        changes.notificationsEnabled !== undefined || changes.targetDate !== undefined;

      let notifChanges: Partial<Countdown> = {};
      if (needsReschedule) {
        await cancelCountdownNotifications(existing);
        const merged = { ...existing, ...changes };
        const { dailyNotificationId, completionNotificationId } =
          await scheduleCountdownNotifications(merged);
        notifChanges = { dailyNotificationId, completionNotificationId };
      }

      const updated = countdowns.map(c =>
        c.id === id ? { ...c, ...changes, ...notifChanges } : c
      );
      await persist(updated);
    },
    [countdowns]
  );

  const deleteCountdown = useCallback(
    async (id: string): Promise<void> => {
      const countdown = countdowns.find(c => c.id === id);
      if (countdown) await cancelCountdownNotifications(countdown);
      await persist(countdowns.filter(c => c.id !== id));
    },
    [countdowns]
  );

  const archiveCountdown = useCallback(
    async (id: string): Promise<void> => {
      const countdown = countdowns.find(c => c.id === id);
      if (!countdown) return;
      await cancelCountdownNotifications(countdown);
      const updated = countdowns.map(c =>
        c.id === id
          ? {
              ...c,
              archivedAt: new Date().toISOString(),
              notificationsEnabled: false,
              dailyNotificationId: undefined,
              completionNotificationId: undefined,
            }
          : c
      );
      await persist(updated);
    },
    [countdowns]
  );

  return {
    countdowns,
    activeCountdowns: countdowns.filter(c => !c.archivedAt),
    archivedCountdowns: countdowns.filter(c => !!c.archivedAt),
    loading,
    reload: loadCountdowns,
    addCountdown,
    updateCountdown,
    deleteCountdown,
    archiveCountdown,
  };
}
