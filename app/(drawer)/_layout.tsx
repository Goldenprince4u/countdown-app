import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { useThemeContext } from '@/context/theme-context';
import { DarkAppColors, LightAppColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
          drawerStyle: {
            backgroundColor: colors.surface,
          },
          drawerActiveTintColor: colors.accent,
          drawerInactiveTintColor: colors.textMuted,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          drawerLabelStyle: {
            fontWeight: '600',
            fontSize: 15,
            marginLeft: -8,
          },
        }}>
        <Drawer.Screen
          name="(tabs)"
          options={{
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
