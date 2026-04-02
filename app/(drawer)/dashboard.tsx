import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  AppState,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useThemeContext } from '@/context/theme-context';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const GAUGE_SIZE = width * 0.78;
const GAUGE_STROKE = 18;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE * 2) / 2;
const MAX_KMH = 220;

// Haversine distance between two GPS points (in meters)
function gpsDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDirection(deg: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h > 0 ? String(h).padStart(2, '0') : null, String(m).padStart(2, '0'), String(s).padStart(2, '0')]
    .filter(Boolean)
    .join(':');
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export default function DashboardScreen() {
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const isDark = effectiveTheme === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [unit, setUnit] = useState<'kmh' | 'mph'>('kmh');
  const [speedKmh, setSpeedKmh] = useState(0);
  const [speedTrend, setSpeedTrend] = useState<'up' | 'down' | 'flat'>('flat');
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [altTrend, setAltTrend] = useState<'up' | 'down' | 'flat'>('flat');
  const [heading, setHeading] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const lastAlt = useRef<number | null>(null);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const prevSpeedRef = useRef(0);
  const startTime = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const headingRef = useRef<Location.LocationSubscription | null>(null);
  const maxSpeedRef = useRef(0);

  // Shared values for the gauge arc
  const gaugeProgress = useSharedValue(0);

  const displaySpeed = unit === 'kmh' ? speedKmh : speedKmh * 0.621371;
  const displayMax = unit === 'kmh' ? maxSpeedKmh : maxSpeedKmh * 0.621371;
  const displayUnit = unit === 'kmh' ? 'km/h' : 'mph';
  const displayMax2 = unit === 'kmh' ? MAX_KMH : Math.round(MAX_KMH * 0.621371);

  // Update gauge
  useEffect(() => {
    const ratio = Math.min(speedKmh / MAX_KMH, 1);
    gaugeProgress.value = withTiming(ratio, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [speedKmh]);

  const stopTracking = useCallback(() => {
    if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    if (headingRef.current) { headingRef.current.remove(); headingRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const resetTrip = useCallback(() => {
    stopTracking();
    setSpeedKmh(0);
    setSpeedTrend('flat');
    setMaxSpeedKmh(0);
    maxSpeedRef.current = 0;
    prevSpeedRef.current = 0;
    setAltitude(0);
    setHeading(0);
    setAccuracy(null);
    setElapsed(0);
    setTotalDistance(0);
    setAltTrend('flat');
    lastAlt.current = null;
    lastPos.current = null;
    setIsTracking(false);
  }, [stopTracking]);

  useEffect(() => {
    let isActive = true;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied.');
        setIsTracking(false);
        return;
      }

      timerRef.current = setInterval(() => {
        if (isActive) setElapsed((prev) => prev + 1);
      }, 1000);

      try {
        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
          (loc) => {
            if (!isActive) return;
            const { speed, altitude: alt, latitude, longitude, accuracy: acc } = loc.coords;

            // Speed
            const kph = speed != null && speed >= 0 ? speed * 3.6 : 0;
            setSpeedKmh(kph);
            // Track acceleration trend
            const kphDiff = kph - prevSpeedRef.current;
            setSpeedTrend(kphDiff > 3 ? 'up' : kphDiff < -3 ? 'down' : 'flat');
            prevSpeedRef.current = kph;
            // Use ref for comparison to avoid effect re-running (bug fix)
            if (kph > maxSpeedRef.current) {
              maxSpeedRef.current = kph;
              setMaxSpeedKmh(kph);
            }

            // Altitude + trend
            if (alt != null) {
              setAltitude(Math.round(alt));
              if (lastAlt.current !== null) {
                const diff = alt - lastAlt.current;
                setAltTrend(diff > 2 ? 'up' : diff < -2 ? 'down' : 'flat');
              }
              lastAlt.current = alt;
            }

            // Accuracy
            if (acc != null) setAccuracy(Math.round(acc));

            // Accumulated distance
            if (lastPos.current) {
              const d = gpsDistance(lastPos.current.lat, lastPos.current.lng, latitude, longitude);
              if (d < 200) { // Filter GPS jumps
                setTotalDistance((prev) => prev + d);
              }
            }
            lastPos.current = { lat: latitude, lng: longitude };
          }
        );

        headingRef.current = await Location.watchHeadingAsync((data) => {
          if (isActive) {
            const h = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
            setHeading(Math.round(h));
          }
        });
      } catch {
        setErrorMsg('Failed to start GPS tracking.');
        setIsTracking(false);
      }
    };

    if (isTracking) {
      startTracking();
    } else {
      stopTracking();
      setSpeedKmh(0);
      setSpeedTrend('flat');
    }

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (isTracking && !watchRef.current) startTracking();
      } else {
        stopTracking();
      }
    });

    return () => {
      isActive = false;
      stopTracking();
      appState.remove();
    };
  }, [isTracking]); // Re-run when toggle changes

  // Arc gauge — draws a semi-circular progress arc using Views + transforms
  // Ticks and arc segments are rendered as positioned Views below (no Animated.View needed).

  // Build tick marks
  const renderTicks = () => {
    const ticks = [];
    const totalTicks = 44;
    const startAngle = 150; // degrees
    const sweepAngle = 240;
    for (let i = 0; i <= totalTicks; i++) {
      const isLong = i % 4 === 0;
      const angleDeg = startAngle + (i / totalTicks) * sweepAngle;
      const angleRad = (angleDeg * Math.PI) / 180;
      const innerR = GAUGE_RADIUS - (isLong ? 22 : 14);
      const x = GAUGE_SIZE / 2 + Math.cos(angleRad) * innerR - 1;
      const y = GAUGE_SIZE / 2 + Math.sin(angleRad) * innerR - 1;
      const speed = (i / totalTicks) * MAX_KMH;
      const isActive = speed <= speedKmh;
      ticks.push(
        <View
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: isLong ? 4 : 2,
            height: isLong ? 12 : 8,
            backgroundColor: isActive ? colors.accent : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
            borderRadius: 2,
            transform: [{ rotate: `${angleDeg + 90}deg` }],
          }}
        />
      );
    }
    return ticks;
  };

  // Speed arc fill indicators
  const renderSpeedArc = () => {
    const segments = 80;
    const marks = [];
    const startAngle = 150;
    const sweepAngle = 240;
    const ratio = Math.min(speedKmh / MAX_KMH, 1);

    for (let i = 0; i < segments; i++) {
      const segRatio = i / segments;
      const isLit = segRatio <= ratio;
      const angleDeg = startAngle + segRatio * sweepAngle;
      const angleRad = (angleDeg * Math.PI) / 180;
      const r = GAUGE_RADIUS;
      const x = GAUGE_SIZE / 2 + Math.cos(angleRad) * r - 3;
      const y = GAUGE_SIZE / 2 + Math.sin(angleRad) * r - 3;

      // Color gradient: cyan → yellow → red
      let color = colors.accent;
      if (segRatio > 0.85) color = '#FF4444';
      else if (segRatio > 0.6) color = '#FFD700';

      if (isLit) {
        marks.push(
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
              opacity: 0.9,
            }}
          />
        );
      }
    }
    return marks;
  };

  const altTrendIcon = altTrend === 'up' ? 'arrow-up-bold' : altTrend === 'down' ? 'arrow-down-bold' : 'minus';
  const altTrendColor = altTrend === 'up' ? '#00E5FF' : altTrend === 'down' ? '#FF6B6B' : colors.textMuted;

  const accuracyColor = accuracy == null ? colors.textMuted : accuracy < 10 ? '#32cd32' : accuracy < 30 ? '#FFD700' : '#FF6B6B';
  const accuracyLabel = accuracy == null ? '—' : accuracy < 10 ? 'High' : accuracy < 30 ? 'Med' : 'Low';

  if (errorMsg) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg }]}>
        <MaterialCommunityIcons name="crosshairs-off" size={64} color={colors.textMuted} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>GPS Unavailable</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollContainer, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textMuted }]}>TRIP DASHBOARD</Text>
          <Text style={[styles.headerSub, { color: colors.text }]}>{formatDuration(elapsed)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.unitToggle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() => setUnit((u) => (u === 'kmh' ? 'mph' : 'kmh'))}
          activeOpacity={0.8}
        >
          <Text style={[styles.unitToggleText, { color: colors.accent }]}>{displayUnit}</Text>
          <MaterialCommunityIcons name="swap-horizontal" size={16} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Speedometer Gauge */}
      <View style={styles.gaugeWrapper}>
        <View style={[styles.gaugeCircle, { backgroundColor: colors.surface, width: GAUGE_SIZE, height: GAUGE_SIZE }]}>
          {renderSpeedArc()}
          {renderTicks()}
          {/* Center readout */}
          <View style={styles.gaugeCenter}>
            <MaterialCommunityIcons name="speedometer" size={28} color={colors.accent} style={{ marginBottom: 4 }} />
            {speedTrend !== 'flat' && isTracking && (
              <MaterialCommunityIcons
                name={speedTrend === 'up' ? 'arrow-up-bold' : 'arrow-down-bold'}
                size={14}
                color={speedTrend === 'up' ? '#FF6B6B' : '#32cd32'}
                style={{ marginBottom: 2 }}
              />
            )}
            <Text style={[styles.speedValue, { color: colors.text }]}>{Math.round(displaySpeed)}</Text>
            <Text style={[styles.speedUnit, { color: colors.textMuted }]}>{displayUnit}</Text>
          </View>
          {/* Scale labels */}
          <Text style={[styles.gaugeMin, { color: colors.textMuted }]}>0</Text>
          <Text style={[styles.gaugeMax, { color: colors.textMuted }]}>{displayMax2}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Altitude */}
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: '#00E5FF', borderLeftWidth: 3 }]}>
          <MaterialCommunityIcons name={altTrendIcon} size={20} color={altTrendColor} />
          <Text style={[styles.statValue, { color: colors.text }]}>{altitude}<Text style={styles.statUnit}> m</Text></Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Altitude</Text>
        </View>

        {/* Heading */}
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: '#FFD700', borderLeftWidth: 3 }]}>
          <MaterialCommunityIcons name="compass-outline" size={20} color="#FFD700" />
          <Text style={[styles.statValue, { color: colors.text }]}>{getDirection(heading)}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{heading}°</Text>
        </View>

        {/* GPS Accuracy */}
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: accuracyColor, borderLeftWidth: 3 }]}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={accuracyColor} />
          <Text style={[styles.statValue, { color: colors.text }]}>{accuracyLabel}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{accuracy != null ? `±${accuracy}m` : '—'}</Text>
        </View>

        {/* Total Distance */}
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: '#A89BFF', borderLeftWidth: 3 }]}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color="#A89BFF" />
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{formatDistance(totalDistance)}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
        </View>

        {/* Avg Speed */}
        <View style={[styles.statCard, styles.statCardFull, { backgroundColor: colors.surface, borderLeftColor: '#32cd32', borderLeftWidth: 3 }]}>
          <MaterialCommunityIcons name="speedometer-medium" size={20} color="#32cd32" />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {elapsed > 0 ? Math.round((totalDistance / elapsed) * 3.6 * (unit === 'mph' ? 0.621371 : 1)) : 0}
            <Text style={styles.statUnit}> {unit === 'kmh' ? 'km/h' : 'mph'}</Text>
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg Speed</Text>
        </View>
      </View>

      {/* Max Speed Banner */}
      <View style={[styles.maxBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={styles.maxBannerLeft}>
          <MaterialCommunityIcons name="flag-checkered" size={24} color={colors.accent} />
          <View>
            <Text style={[styles.bottomLabel, { color: colors.textMuted }]}>SESSION MAX SPEED</Text>
            <Text style={[styles.maxValue, { color: colors.text }]}>
              {Math.round(displayMax)} <Text style={[styles.maxUnit, { color: colors.textMuted }]}>{displayUnit}</Text>
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="trophy-outline" size={36} color={isDark ? 'rgba(0,229,255,0.2)' : 'rgba(0,179,204,0.2)'} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.resetBtn, { borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={resetTrip}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={colors.textMuted} />
          <Text style={[styles.resetBtnText, { color: colors.textMuted }]}>RESET</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: isTracking ? '#FF4444' : '#32cd32', flex: 1 }]}
          activeOpacity={0.8}
          onPress={() => setIsTracking(!isTracking)}
        >
          <MaterialCommunityIcons name={isTracking ? 'stop' : 'play'} size={24} color="#fff" />
          <Text style={styles.actionBtnText}>{isTracking ? 'PAUSE TRACKING' : 'START TRACKING'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: typeof DarkAppColors) => StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  container: {
    flex: 1,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  unitToggleText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCircle: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 16,
    position: 'relative',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  speedValue: {
    fontSize: 84,
    fontWeight: '900',
    letterSpacing: -4,
    fontVariant: ['tabular-nums'],
    lineHeight: 88,
  },
  speedUnit: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  gaugeMin: {
    position: 'absolute',
    bottom: 32,
    left: 28,
    fontSize: 11,
    fontWeight: '600',
  },
  gaugeMax: {
    position: 'absolute',
    bottom: 32,
    right: 28,
    fontSize: 11,
    fontWeight: '600',
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: (width - Spacing.lg * 2 - Spacing.sm) / 2 - Spacing.sm,
    aspectRatio: 1.2,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 16,
    fontWeight: '400',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  maxBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  maxBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  maxLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  maxValue: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  maxUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  statCardFull: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    aspectRatio: undefined,
    minHeight: 64,
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'stretch',
  },
  resetBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 4,
  },
  resetBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: Radius.lg,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
