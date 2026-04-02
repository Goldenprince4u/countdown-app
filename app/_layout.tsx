import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, Component, type ReactNode } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';

import { AppThemeProvider, useThemeContext } from '@/context/theme-context';
import { CountdownProvider } from '@/context/countdown-context';
import { TickerProvider } from '@/context/ticker-context';
import { requestNotificationPermissions } from '@/hooks/use-notifications';
import { DarkAppColors, LightAppColors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: '(drawer)',
};

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; error?: Error }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('@countdowns_v1');
    } catch { /* ignore */ }
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>⚠️</Text>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            App data may be corrupted. Tap below to reset and start fresh.
          </Text>
          <TouchableOpacity style={errorStyles.btn} onPress={this.handleReset}>
            <Text style={errorStyles.btnText}>Reset App Data</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  message: { color: '#8E8E9E', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btn: {
    backgroundColor: '#00E5FF', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999,
  },
  btnText: { color: '#000', fontWeight: '800', fontSize: 16 },
});

// ─── Notification deep-link handler ──────────────────────────────────────────
function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    // When user taps a notification → jump to that countdown's modal
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const { countdownId } = (response.notification.request.content.data ?? {}) as Record<string, string>;
      if (countdownId) {
        router.push(`/modal?id=${countdownId}` as any);
      }
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

// ─── Inner layout (needs theme context) ──────────────────────────────────────
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
      <NotificationHandler />
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

// ─── Root export ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermissions().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <TickerProvider>
          <CountdownProvider>
            <RootLayoutInner />
          </CountdownProvider>
        </TickerProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
