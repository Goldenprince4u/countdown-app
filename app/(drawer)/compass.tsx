import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Magnetometer, MagnetometerMeasurement } from 'expo-sensors';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { useThemeContext } from '@/context/theme-context';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');

// LPF for smoothing out the magnetometer data
const LPF = 0.05;

export default function CompassScreen() {
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [heading, setHeading] = useState(0);

  useEffect(() => {
    Magnetometer.setUpdateInterval(50);
    
    let previousHeading = 0;
    
    // Using simple low-pass filter to smooth jittery compass readings
    const subscription = Magnetometer.addListener((data: MagnetometerMeasurement) => {
      let { x, y } = data;
      // Calculate heading
      let h = Math.atan2(y, x) * (180 / Math.PI);
      h = h - 90; // Adjust for typical device orientation
      if (h < 0) {
        h = 360 + h;
      }
      
      const smoothed = previousHeading + LPF * (h - previousHeading);
      previousHeading = smoothed;
      
      setHeading(Math.round(h));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `-${heading}deg` }]
    };
  });

  const getDirection = (degree: number) => {
    if (degree >= 337.5 || degree < 22.5) return 'N';
    if (degree >= 22.5 && degree < 67.5) return 'NE';
    if (degree >= 67.5 && degree < 112.5) return 'E';
    if (degree >= 112.5 && degree < 157.5) return 'SE';
    if (degree >= 157.5 && degree < 202.5) return 'S';
    if (degree >= 202.5 && degree < 247.5) return 'SW';
    if (degree >= 247.5 && degree < 292.5) return 'W';
    if (degree >= 292.5 && degree < 337.5) return 'NW';
    return '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headingText}>{heading}° {getDirection(heading)}</Text>
      
      <View style={styles.compassContainer}>
        <Animated.View style={[styles.compass, animatedStyles]}>
          <Text style={[styles.marker, styles.north]}>N</Text>
          <Text style={[styles.marker, styles.east]}>E</Text>
          <Text style={[styles.marker, styles.south]}>S</Text>
          <Text style={[styles.marker, styles.west]}>W</Text>
          
          <View style={styles.needleContainer}>
            <View style={styles.needleNorth} />
            <View style={styles.needleSouth} />
          </View>
        </Animated.View>
      </View>
      
      <Text style={styles.instructionText}>
        Hold your device flat to accurately find your heading.
      </Text>
    </View>
  );
}

const needleLength = width * 0.25;

const createStyles = (colors: typeof DarkAppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 40,
  },
  compassContainer: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width,
    borderWidth: 8,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  compass: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    position: 'absolute',
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  north: { top: 20, color: colors.accent },
  east: { right: 25 },
  south: { bottom: 20 },
  west: { left: 25 },
  needleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: needleLength,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.accent,
    marginBottom: -2, // slight overlap
  },
  needleSouth: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: needleLength,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.textMuted,
  },
  instructionText: {
    marginTop: 60,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  }
});
