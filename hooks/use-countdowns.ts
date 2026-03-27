import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Countdown } from '@/types/countdown';
import {
  scheduleCountdownNotifications,
  cancelCountdownNotifications,
} from '@/hooks/use-notifications';

export const STORAGE_KEY = '@countdowns_v1';

export function useCountdowns() {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [loading, setLoading] = useState(true);

  const countdownsRef = useRef<Countdown[]>([]);

  const syncState = useCallback((updated: Countdown[]) => {
    countdownsRef.current = updated;
    setCountdowns(updated);
  }, []);

  const loadCountdowns = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const parsed: Countdown[] = JSON.parse(json);
        syncState(parsed);
      }
    } catch (e) {
      console.error('Failed to load countdowns', e);
    } finally {
      setLoading(false);
    }
  }, [syncState]);

  useEffect(() => {
    loadCountdowns();
  }, [loadCountdowns]);

  const persist = useCallback(async (updated: Countdown[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncState(updated);
  }, [syncState]);

  const addCountdown = useCallback(
    async (draft: Omit<Countdown, 'id' | 'createdAt'>): Promise<Countdown> => {
      const placeholder: Countdown = {
        ...draft,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const { dailyNotificationIds, completionNotificationId } =
        await scheduleCountdownNotifications(placeholder);

      const newCountdown: Countdown = {
        ...placeholder,
        dailyNotificationIds,
        completionNotificationId,
      };

      const updated = [...countdownsRef.current, newCountdown];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      syncState(updated);
      return newCountdown;
    },
    [syncState]
  );

  const updateCountdown = useCallback(
    async (id: string, changes: Partial<Countdown>): Promise<void> => {
      const existing = countdownsRef.current.find(c => c.id === id);
      if (!existing) return;

      const optimistic = countdownsRef.current.map(c =>
        c.id === id ? { ...c, ...changes } : c
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(optimistic));
      syncState(optimistic);

      const needsReschedule =
        changes.notificationsEnabled !== undefined || changes.targetDate !== undefined;

      if (needsReschedule) {
        await cancelCountdownNotifications(existing);
        const merged = { ...existing, ...changes };
        const { dailyNotificationIds, completionNotificationId } =
          await scheduleCountdownNotifications(merged);

        const final = countdownsRef.current.map(c =>
          c.id === id ? { ...c, dailyNotificationIds, completionNotificationId } : c
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(final));
        syncState(final);
      }
    },
    [syncState]
  );

  const deleteCountdown = useCallback(
    async (id: string): Promise<void> => {
      const countdown = countdownsRef.current.find(c => c.id === id);
      if (countdown) {
        await cancelCountdownNotifications(countdown);
      }
      const updated = countdownsRef.current.filter(c => c.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      syncState(updated);
    },
    [syncState]
  );

  const archiveCountdown = useCallback(
    async (id: string): Promise<void> => {
      const countdown = countdownsRef.current.find(c => c.id === id);
      if (!countdown) return;

      await cancelCountdownNotifications(countdown);

      const updated = countdownsRef.current.map(c =>
        c.id === id
          ? {
              ...c,
              archivedAt: new Date().toISOString(),
              notificationsEnabled: false,
              dailyNotificationIds: undefined,
              completionNotificationId: undefined,
            }
          : c
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      syncState(updated);
    },
    [syncState]
  );

  const renewCountdown = useCallback(
    async (id: string): Promise<void> => {
      const countdown = countdownsRef.current.find(c => c.id === id);
      if (!countdown || !countdown.repeatInterval || countdown.archivedAt) return;

      const now = new Date();
      let nextDate = new Date(countdown.targetDate);

      let iterations = 0;
      while (nextDate <= now && iterations++ < 1000) {
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
      const updated = countdownsRef.current.map(c =>
        c.id === id ? { ...c, ...changes } : c
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      syncState(updated);

      await cancelCountdownNotifications(countdown);
      const merged = { ...countdown, ...changes };
      const { dailyNotificationIds, completionNotificationId } =
        await scheduleCountdownNotifications(merged);

      const final = countdownsRef.current.map(c =>
        c.id === id ? { ...c, dailyNotificationIds, completionNotificationId } : c
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(final));
      syncState(final);
    },
    [syncState]
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
