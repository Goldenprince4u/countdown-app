import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { CountdownProvider } from '@/context/countdown-context';
import { TickerProvider } from '@/context/ticker-context';
import { requestNotificationPermissions } from '@/hooks/use-notifications';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Request notification permissions on first launch
    requestNotificationPermissions().catch(console.error);
  }, []);

  return (
    <TickerProvider>
      <CountdownProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'New Countdown', headerShown: false }}
          />
        </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </CountdownProvider>
    </TickerProvider>
  );
}
