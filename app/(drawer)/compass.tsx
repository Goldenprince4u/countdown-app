import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, AppState, AppStateStatus, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useThemeContext } from '@/context/theme-context';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.85;

export default function CompassScreen() {
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [headingText, setHeadingText] = useState(0);
  const [mode, setMode] = useState<'compass' | 'qiblah'>('compass');
  const [qiblahBearing, setQiblahBearing] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const rotation = useSharedValue(0);
  const unboundedHeadingRef = useRef(0);
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const calculateQiblah = (lat: number, lng: number) => {
    const latk = 21.422487 * (Math.PI / 180);
    const longk = 39.826206 * (Math.PI / 180);
    const phi = lat * (Math.PI / 180);
    const lambda = lng * (Math.PI / 180);

    const y = Math.sin(longk - lambda);
    const x = Math.cos(phi) * Math.tan(latk) - Math.sin(phi) * Math.cos(longk - lambda);
    let qibla = Math.atan2(y, x) * (180 / Math.PI);
    return (qibla + 360) % 360;
  };

  useEffect(() => {
    let isActive = true;

    const stopLocationWatcher = () => {
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };

    const setupCompass = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied. Compass requires Location access to find Qiblah.');
        return;
      }
      
      setErrorMsg(null);

      if (mode === 'qiblah' && qiblahBearing === null) {
        try {
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          if (isActive) {
            const bearing = calculateQiblah(loc.coords.latitude, loc.coords.longitude);
            setQiblahBearing(Math.round(bearing));
          }
        } catch (e) {
          setErrorMsg("Could not lock GPS for Qiblah.");
        }
      }

      try {
        const sub = await Location.watchHeadingAsync((data) => {
          let rawH = -1;
          
          if (mode === 'compass') {
            rawH = data.magHeading;
          } else {
            rawH = (data.trueHeading !== -1 && data.trueHeading >= 0) ? data.trueHeading : data.magHeading;
          }
          
          if (rawH < 0) return; 
          
          setHeadingText(Math.round(rawH));

          // Safe Positive Modulo for JS
          let currentNormalized = ((unboundedHeadingRef.current % 360) + 360) % 360;
          let diff = rawH - currentNormalized;
          
          // Force shortest rotation path
          if (diff < -180) diff += 360;
          else if (diff > 180) diff -= 360;
          
          unboundedHeadingRef.current += diff;

          // By streaming directly or using very fast timing without Physics, we prevent
          // Reanimated from endlessly compounding velocity resulting in wild spinning.
          rotation.value = withTiming(-unboundedHeadingRef.current, { duration: 150 });
        });
        watchSubscriptionRef.current = sub;
      } catch (e) {
         setErrorMsg('Your device does not support Heading Tracking.');
      }
    };

    setupCompass();

    const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (!watchSubscriptionRef.current) setupCompass();
      } else {
        stopLocationWatcher();
      }
    });

    return () => {
      isActive = false;
      stopLocationWatcher();
      appStateSub.remove();
    };
  }, [mode, qiblahBearing, rotation]);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }]
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

  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i < 360; i += 2) {
      const isCardinal = i % 90 === 0;
      const isIntermediate = i % 30 === 0 && !isCardinal;
      
      let tickStyle = styles.tickMinor;
      if (isCardinal) tickStyle = styles.tickCardinal;
      else if (isIntermediate) tickStyle = styles.tickIntermediate;

      ticks.push(
        <View
          key={i}
          style={[
            styles.tickContainer,
            { transform: [{ rotate: `${i}deg` }] }
          ]}
        >
          <View style={[styles.tickBase, tickStyle]} />
        </View>
      );
    }
    return ticks;
  };

  const renderLabels = () => {
    return [
      { label: 'N', deg: 0, isMajor: true },
      { label: '30', deg: 30, isMajor: false },
      { label: '60', deg: 60, isMajor: false },
      { label: 'E', deg: 90, isMajor: true },
      { label: '120', deg: 120, isMajor: false },
      { label: '150', deg: 150, isMajor: false },
      { label: 'S', deg: 180, isMajor: true },
      { label: '210', deg: 210, isMajor: false },
      { label: '240', deg: 240, isMajor: false },
      { label: 'W', deg: 270, isMajor: true },
      { label: '300', deg: 300, isMajor: false },
      { label: '330', deg: 330, isMajor: false },
    ].map((item) => (
      <View key={item.label} style={[styles.labelContainer, { transform: [{ rotate: `${item.deg}deg` }] }]}>
        <Text style={[styles.labelBase, item.isMajor ? styles.labelMajor : styles.labelMinor, item.label === 'N' ? { color: colors.accent } : null]}>
          {item.label}
        </Text>
      </View>
    ));
  };
  
  let isQiblahAligned = false;
  let qiblahDiff = 0;
  if (mode === 'qiblah' && qiblahBearing !== null) {
      qiblahDiff = Math.abs(headingText - qiblahBearing);
      if (qiblahDiff > 180) qiblahDiff = 360 - qiblahDiff;
      if (qiblahDiff < 3) isQiblahAligned = true;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={[styles.headingDegreeText, isQiblahAligned ? { color: '#00E5FF' } : null]}>
          {headingText}°
        </Text>
        <Text style={[styles.headingDirectionText, isQiblahAligned ? { color: '#00E5FF' } : null]}>
          {mode === 'qiblah' ? (isQiblahAligned ? 'QIBLAH' : `Qiblah at ${qiblahBearing}°`) : getDirection(headingText)}
        </Text>
      </View>
      
      <View style={styles.compassWrapper}>
        <View style={styles.fixedPointerContainer}>
          <View style={[styles.fixedPointer, isQiblahAligned ? { borderTopColor: '#00E5FF' } : null]} />
        </View>
        
        <View style={[styles.compassBezel, isQiblahAligned ? { borderColor: '#00E5FF', shadowColor: '#00E5FF', shadowOpacity: 0.6 } : null]}>
          <Animated.View style={[styles.compassDial, animatedStyles]}>
            {renderTicks()}
            {renderLabels()}
            
            {mode === 'qiblah' && qiblahBearing !== null && (
              <View style={[[styles.labelContainer, { transform: [{ rotate: `${qiblahBearing}deg` }] }]]}>
                 <View style={styles.qiblahIndicator}>
                   <MaterialCommunityIcons name="star-crescent" size={28} color="#00E5FF" style={{ textShadowColor: '#00E5FF', textShadowRadius: 8 }}/>
                   <View style={styles.qiblahBeam} />
                 </View>
              </View>
            )}
            
            <View style={styles.centerCrosshairVertical} />
            <View style={styles.centerCrosshairHorizontal} />
            <View style={[styles.centerGlassDot, isQiblahAligned ? { borderColor: '#00E5FF', backgroundColor: '#00E5FF22' } : null]} />
          </Animated.View>
        </View>
      </View>
      
      {errorMsg ? (
        <View style={styles.instructionBox}>
           <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF6B6B" />
           <Text style={[styles.instructionText, { color: '#FF6B6B' }]}>{errorMsg}</Text>
        </View>
      ) : (
        <View style={styles.instructionBox}>
           <MaterialCommunityIcons name={mode === 'qiblah' ? 'mosque' : 'navigation-variant'} size={20} color={colors.textMuted} />
           <Text style={styles.instructionText}>
             {mode === 'qiblah' 
               ? (qiblahBearing === null ? 'Locating Qiblah...' : 'Align the cyan star crescent with the top pointer.')
               : 'Rest device flat. If inaccurate, calibrate by moving in a Figure-8.'}
           </Text>
        </View>
      )}
      
      <View style={styles.toggleContainer}>
         <TouchableOpacity 
           activeOpacity={0.8}
           hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
           style={[styles.toggleButton, mode === 'compass' ? styles.toggleActive : null, mode === 'compass' ? { backgroundColor: colors.surfaceAlt } : null]}
           onPress={() => setMode('compass')}
         >
           <MaterialCommunityIcons name="compass-outline" size={24} color={mode === 'compass' ? colors.text : colors.textMuted} />
           <Text style={[styles.toggleText, mode === 'compass' ? { color: colors.text } : { color: colors.textMuted }]}>Compass</Text>
         </TouchableOpacity>
         
         <TouchableOpacity 
           activeOpacity={0.8}
           hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
           style={[styles.toggleButton, mode === 'qiblah' ? styles.toggleActive : null, mode === 'qiblah' ? { backgroundColor: '#00E5FF1A' } : null]}
           onPress={() => setMode('qiblah')}
         >
           <MaterialCommunityIcons name="mosque" size={24} color={mode === 'qiblah' ? '#00E5FF' : colors.textMuted} />
           <Text style={[styles.toggleText, mode === 'qiblah' ? { color: '#00E5FF' } : { color: colors.textMuted }]}>Qiblah</Text>
         </TouchableOpacity>
      </View>
      
    </View>
  );
}

const createStyles = (colors: typeof DarkAppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 50,
    height: 120,
    justifyContent: 'center',
  },
  headingDegreeText: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    lineHeight: 80,
  },
  headingDirectionText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  trueNorthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  trueNorthText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  compassWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    marginTop: 10,
  },
  fixedPointerContainer: {
    position: 'absolute',
    top: -24,
    zIndex: 10,
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  fixedPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  compassBezel: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  compassDial: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickContainer: {
    position: 'absolute',
    height: '100%',
    width: 2,
    alignItems: 'center',
  },
  tickBase: {
    width: 2,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    marginTop: 10,
  },
  tickMinor: {
    height: 8,
    opacity: 0.2,
  },
  tickIntermediate: {
    height: 16,
    opacity: 0.5,
  },
  tickCardinal: {
    height: 24,
    width: 4,
    backgroundColor: colors.text,
    opacity: 1,
  },
  labelContainer: {
    position: 'absolute',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 42, 
  },
  labelBase: {
    fontWeight: '800',
    color: colors.text,
  },
  labelMajor: {
    fontSize: 32,
    letterSpacing: 1,
  },
  labelMinor: {
    fontSize: 16,
    color: colors.textMuted,
    opacity: 0.6,
  },
  qiblahIndicator: {
    alignItems: 'center',
    marginTop: -10, 
  },
  qiblahBeam: {
    width: 4,
    height: 28,
    backgroundColor: '#00E5FF',
    marginTop: 4,
    borderRadius: 2,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  centerCrosshairVertical: {
    position: 'absolute',
    width: 2,
    height: COMPASS_SIZE - 160,
    backgroundColor: colors.border,
  },
  centerCrosshairHorizontal: {
    position: 'absolute',
    height: 2,
    width: COMPASS_SIZE - 160,
    backgroundColor: colors.border,
  },
  centerGlassDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: colors.textMuted,
    backgroundColor: colors.surface,
  },
  instructionBox: {
    marginTop: 35,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: Spacing.sm,
    height: 50,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textMuted,
    letterSpacing: 0.5,
    fontWeight: '500',
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: colors.surface,
    padding: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    gap: Spacing.sm,
  },
  toggleActive: {
  },
  toggleText: {
    fontWeight: '700',
    fontSize: 15,
  }
});
