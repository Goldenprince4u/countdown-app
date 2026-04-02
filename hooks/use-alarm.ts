import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

/** Maximum alarm duration in seconds — prevents runaway alarms */
const MAX_ALARM_DURATION_SECONDS = 60;

// Preload phase: resolve the asset once at module level so every card
// shares a single loaded Sound instance when triggered.
let _sound: Audio.Sound | null = null;
let _loadPromise: Promise<void> | null = null;

async function ensureSound(): Promise<Audio.Sound> {
  if (_sound) return _sound;
  if (!_loadPromise) {
    _loadPromise = (async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/assets/sounds/alarm.wav'),
        { shouldPlay: false, isLooping: true }
      );
      _sound = sound;
    })();
  }
  await _loadPromise;
  return _sound!;
}

/**
 * useAlarm
 * Plays the bundled alarm file for `durationSeconds` seconds then stops
 * automatically. Calling `playAlarm` while already playing is a no-op.
 * Duration is capped at MAX_ALARM_DURATION_SECONDS (60 s).
 */
export function useAlarm() {
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);

  const stopAlarm = useCallback(async () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    isPlayingRef.current = false;
    try {
      const sound = await ensureSound();
      await sound.stopAsync();
      await sound.setPositionAsync(0);
    } catch {
      // ignore unload errors
    }
  }, []);

  const playAlarm = useCallback(
    async (durationSeconds: number = 15) => {
      if (isPlayingRef.current) return; // already ringing
      isPlayingRef.current = true;

      // Hard cap — never ring for more than 60 seconds
      const clampedDuration = Math.min(Math.max(1, durationSeconds), MAX_ALARM_DURATION_SECONDS);

      try {
        const sound = await ensureSound();
        await sound.setPositionAsync(0);
        await sound.playAsync();

        // Auto-stop after the requested duration
        stopTimerRef.current = setTimeout(() => {
          stopAlarm();
        }, clampedDuration * 1000);
      } catch (e) {
        console.warn('Alarm playback error:', e);
        isPlayingRef.current = false;
      }
    },
    [stopAlarm]
  );

  return { playAlarm, stopAlarm };
}
