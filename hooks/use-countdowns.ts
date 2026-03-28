import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Countdown } from '@/types/countdown';
import {
  scheduleCountdownNotifications,
  cancelCountdownNotifications,
} from '@/hooks/use-notifications';

export const STORAGE_KEY = '@countdowns_v1';

// 14 days in ms. If notifications were last scheduled more than 14 days ago, top them up.
const TOP_UP_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;

export function useCountdowns() {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [loading, setLoading] = useState(true);

  const countdownsRef = useRef<Countdown[]>([]);

  const syncState = useCallback((updated: Countdown[]) => {
    countdownsRef.current = updated;
    setCountdowns(updated);
  }, []);

  const checkAndTopUpNotifications = useCallback(async (current: Countdown[]) => {
    let changed = false;
    const nowMs = Date.now();
    let updated = [...current];

    for (const c of current) {
      if (c.archivedAt || !c.notificationsEnabled) continue;

      const lastResched = c.lastRescheduledAt ? new Date(c.lastRescheduledAt).getTime() : 0;
      if (nowMs - lastResched > TOP_UP_THRESHOLD_MS) {
        await cancelCountdownNotifications(c);
        const { dailyNotificationIds, completionNotificationId } = await scheduleCountdownNotifications(c);

        updated = updated.map(item =>
          item.id === c.id
            ? {
                ...item,
                dailyNotificationIds,
                completionNotificationId,
                lastRescheduledAt: new Date().toISOString(),
              }
            : item
        );
        changed = true;
      }
    }

    if (changed) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      syncState(updated);
    }
  }, [syncState]);

  const loadCountdowns = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const parsed: Countdown[] = JSON.parse(json);
        syncState(parsed);
        // Non-blocking background top-up if it's been a while
        checkAndTopUpNotifications(parsed).catch(console.error);
      }
    } catch (e) {
      console.error('Failed to load countdowns', e);
    } finally {
      setLoading(false);
    }
  }, [syncState, checkAndTopUpNotifications]);

  useEffect(() => {
    loadCountdowns();

    // Re-check top-ups when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkAndTopUpNotifications(countdownsRef.current).catch(console.error);
      }
    });
    return () => subscription.remove();
  }, [loadCountdowns, checkAndTopUpNotifications]);

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
        lastRescheduledAt: new Date().toISOString(),
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
          c.id === id ? { 
            ...c, 
            dailyNotificationIds, 
            completionNotificationId,
            lastRescheduledAt: new Date().toISOString() 
          } : c
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
        
        // Delete the saved background image if it exists to prevent storage bloat
        if (countdown.backgroundImageUri) {
          import('expo-file-system/legacy').then(FileSystem => {
            FileSystem.deleteAsync(countdown.backgroundImageUri as string, { idempotent: true }).catch(console.warn);
          }).catch(console.warn);
        }
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
        c.id === id ? { 
          ...c, 
          dailyNotificationIds, 
          completionNotificationId,
          lastRescheduledAt: new Date().toISOString()
        } : c
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
