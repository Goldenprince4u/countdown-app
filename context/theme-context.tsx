import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useReactNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  themeMode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = '@theme_preference_v1';

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useReactNativeColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved as ThemeMode);
        }
      })
      .catch(console.error)
      .finally(() => setIsReady(true));
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const effectiveTheme = themeMode === 'system' ? (systemTheme || 'light') : themeMode;

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ themeMode, effectiveTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within <AppThemeProvider>');
  return ctx;
}
