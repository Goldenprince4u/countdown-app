import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';

import { useThemeContext } from '@/context/theme-context';
import { DarkAppColors, LightAppColors, Radius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

/** Shared theme toggle shown in every drawer screen header */
function ThemeToggleButton() {
  const { themeMode, setThemeMode, effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;

  const cycleTheme = () => {
    if (themeMode === 'system') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('light');
    else setThemeMode('system');
  };

  const iconName =
    themeMode === 'system'
      ? 'settings-outline'
      : themeMode === 'dark'
      ? 'moon-outline'
      : 'sunny-outline';

  return (
    <TouchableOpacity
      onPress={cycleTheme}
      accessibilityLabel="Toggle theme"
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[
        styles.themeBtn,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name={iconName} size={20} color={colors.text} />
    </TouchableOpacity>
  );
}

export default function DrawerLayout() {
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          drawerStyle: {
            backgroundColor: colors.surface,
          },
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.textMuted,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
            color: colors.text,
          },
          drawerLabelStyle: {
            fontWeight: '600',
            fontSize: 15,
            marginLeft: -8,
          },
          // Theme toggle appears in every header that is shown
          headerRight: () => (
            <View style={{ marginRight: 12 }}>
              <ThemeToggleButton />
            </View>
          ),
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            // Tabs screen manages its own header (with theme toggle built in)
            headerShown: false,
            drawerLabel: 'Home',
            title: 'Countdown',
            drawerIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
          }}
        />
        <Drawer.Screen
          name="map"
          options={{
            drawerLabel: 'Live Map',
            title: 'Live Map',
            drawerIcon: ({ color }) => <IconSymbol size={24} name="map.fill" color={color} />,
          }}
        />
        <Drawer.Screen
          name="waypoint"
          options={{
            drawerLabel: 'Waypoint Tracker',
            title: 'Waypoint Tracker',
            drawerIcon: ({ color }) => <IconSymbol size={24} name="pin.fill" color={color} />,
          }}
        />
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerLabel: 'Trip Dashboard',
            title: 'Trip Dashboard',
            drawerIcon: ({ color }) => <IconSymbol size={24} name="car.fill" color={color} />,
          }}
        />
        <Drawer.Screen
          name="compass"
          options={{
            drawerLabel: 'Compass & Qiblah',
            title: 'Compass & Qiblah',
            drawerIcon: ({ color }) => <IconSymbol size={24} name="location.fill" color={color} />,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
