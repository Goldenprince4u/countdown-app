import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, DarkAppColors, LightAppColors } from '@/constants/theme';
import { useThemeContext } from '@/context/theme-context';

export default function TabLayout() {
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[effectiveTheme].tint,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Timers',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="timer" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Archive',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="archivebox.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
