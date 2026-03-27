import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

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

      try {
        const sound = await ensureSound();
        await sound.setPositionAsync(0);
        await sound.playAsync();

        // Auto-stop after the requested duration
        stopTimerRef.current = setTimeout(() => {
          stopAlarm();
        }, durationSeconds * 1000);
      } catch (e) {
        console.warn('Alarm playback error:', e);
        isPlayingRef.current = false;
      }
    },
    [stopAlarm]
  );

  return { playAlarm, stopAlarm };
}
