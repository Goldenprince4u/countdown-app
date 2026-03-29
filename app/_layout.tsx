import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import 'react-native-reanimated';

import { AppThemeProvider, useThemeContext } from '@/context/theme-context';
import { CountdownProvider } from '@/context/countdown-context';
import { TickerProvider } from '@/context/ticker-context';
import { requestNotificationPermissions } from '@/hooks/use-notifications';
import { DarkAppColors, LightAppColors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: '(drawer)',
};

function RootLayoutInner() {
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(colors.surface).catch(console.warn);
      NavigationBar.setButtonStyleAsync(effectiveTheme === 'dark' ? 'light' : 'dark').catch(console.warn);
    }
  }, [effectiveTheme, colors.surface]);

  return (
    <ThemeProvider value={effectiveTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'New Countdown', headerShown: false }}
        />
      </Stack>
      <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Request notification permissions on first launch
    requestNotificationPermissions().catch(console.error);
  }, []);

  return (
    <AppThemeProvider>
      <TickerProvider>
        <CountdownProvider>
          <RootLayoutInner />
        </CountdownProvider>
      </TickerProvider>
    </AppThemeProvider>
  );
}
