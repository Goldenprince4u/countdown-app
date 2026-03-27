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

  const persist = useCallback(async (updated: Countdown[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setCountdowns(updated);
  }, []);

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

      // Use functional updater to avoid stale closure
      let saved: Countdown[] = [];
      setCountdowns(prev => {
        saved = [...prev, newCountdown];
        return saved;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...saved]));
      return newCountdown;
    },
    []
  );

  const updateCountdown = useCallback(
    async (id: string, changes: Partial<Countdown>): Promise<void> => {
      setCountdowns(prev => {
        const existing = prev.find(c => c.id === id);
        if (!existing) return prev;
        // Sync update so UI reflects immediately; async notif reschedule below
        const updated = prev.map(c => (c.id === id ? { ...c, ...changes } : c));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      // Handle notification rescheduling asynchronously
      const existing = (await AsyncStorage.getItem(STORAGE_KEY));
      if (!existing) return;
      const all: Countdown[] = JSON.parse(existing);
      const target = all.find(c => c.id === id);
      if (!target) return;

      const needsReschedule =
        changes.notificationsEnabled !== undefined || changes.targetDate !== undefined;
      if (needsReschedule) {
        await cancelCountdownNotifications(target);
        const merged = { ...target, ...changes };
        const { dailyNotificationId, completionNotificationId } =
          await scheduleCountdownNotifications(merged);
        const final = all.map(c =>
          c.id === id ? { ...c, ...changes, dailyNotificationId, completionNotificationId } : c
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(final));
        setCountdowns(final);
      }
    },
    []
  );

  const deleteCountdown = useCallback(
    async (id: string): Promise<void> => {
      setCountdowns(prev => {
        const countdown = prev.find(c => c.id === id);
        if (countdown) cancelCountdownNotifications(countdown);
        const updated = prev.filter(c => c.id !== id);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const archiveCountdown = useCallback(
    async (id: string): Promise<void> => {
      setCountdowns(prev => {
        const countdown = prev.find(c => c.id === id);
        if (!countdown) return prev;
        cancelCountdownNotifications(countdown);
        const updated = prev.map(c =>
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
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const renewCountdown = useCallback(
    async (id: string): Promise<void> => {
      setCountdowns(prev => {
        const countdown = prev.find(c => c.id === id);
        if (!countdown || !countdown.repeatInterval || countdown.archivedAt) return prev;

        const now = new Date();
        let nextDate = new Date(countdown.targetDate);
        while (nextDate <= now) {
          if (countdown.repeatInterval === 'yearly') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          } else if (countdown.repeatInterval === 'monthly') {
            nextDate.setMonth(nextDate.getMonth() + 1);
          } else if (countdown.repeatInterval === 'weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
          } else {
            break;
          }
        }

        const changes = { targetDate: nextDate.toISOString() };
        const updated = prev.map(c => (c.id === id ? { ...c, ...changes } : c));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        
        // Asynchronously reschedule notifications for the new date
        (async () => {
          await cancelCountdownNotifications(countdown);
          const merged = { ...countdown, ...changes };
          const { dailyNotificationId, completionNotificationId } = await scheduleCountdownNotifications(merged);
          setCountdowns(latest => {
            const final = latest.map(c => c.id === id ? { ...c, dailyNotificationId, completionNotificationId } : c);
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(final));
            return final;
          });
        })();

        return updated;
      });
    },
    []
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
    renewCountdown,
  };
}
