import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  AppState,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useThemeContext } from '@/context/theme-context';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.80, 320);
const STORAGE_KEY = 'WAYPOINTS_V2';

// ─── Math helpers ────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(startLat: number, startLng: number, destLat: number, destLng: number) {
  const sLat = (startLat * Math.PI) / 180, sLng = (startLng * Math.PI) / 180;
  const dLat = (destLat * Math.PI) / 180, dLng = (destLng * Math.PI) / 180;
  const y = Math.sin(dLng - sLng) * Math.cos(dLat);
  const x = Math.cos(sLat) * Math.sin(dLat) - Math.sin(sLat) * Math.cos(dLat) * Math.cos(dLng - sLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function formatDist(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Waypoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  savedAt: number;
  icon?: string; // WP_ICONS key (e.g. 'car', 'flag')
};

// ─── Preset icons ────────────────────────────────────────────────────────────

const WP_ICONS = [
  { key: 'car', icon: 'car', color: '#00E5FF' },
  { key: 'hotel', icon: 'bed', color: '#A89BFF' },
  { key: 'tent', icon: 'tent', color: '#32cd32' },
  { key: 'star', icon: 'star', color: '#FFD700' },
  { key: 'flag', icon: 'flag', color: '#FF6B6B' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function WaypointScreen() {
  const router = useRouter();
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const isDark = effectiveTheme === 'dark';

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wpName, setWpName] = useState('');
  const [wpIconKey, setWpIconKey] = useState('car');
  const [savingLoc, setSavingLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);

  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const unboundedRef = useRef(0);
  const headingWatchRef = useRef<Location.LocationSubscription | null>(null);
  const posWatchRef = useRef<Location.LocationSubscription | null>(null);
  const targetBearingRef = useRef(0);

  const activeWaypoint = waypoints.find((w) => w.id === activeId) ?? null;
  const near = distance !== null && distance <= 20;

  // ─── Storage ──────────────────────────────────────────────────────────────

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setWaypoints(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = async (updated: Waypoint[]) => {
    setWaypoints(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // ─── Pulse animation when near ────────────────────────────────────────────

  useEffect(() => {
    if (near) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [near]);

  // ─── Location tracking ───────────────────────────────────────────────────

  useEffect(() => {
    let isActive = true;

    const stop = () => {
      headingWatchRef.current?.remove(); headingWatchRef.current = null;
      posWatchRef.current?.remove(); posWatchRef.current = null;
    };

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Location permission required.'); return; }
      setErrorMsg(null);

      // Position → distance + bearing to active target
      if (activeWaypoint) {
        posWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 1500 },
          (loc) => {
            if (!isActive) return;
            const d = haversineDistance(loc.coords.latitude, loc.coords.longitude, activeWaypoint.lat, activeWaypoint.lng);
            setDistance(d);
            targetBearingRef.current = calcBearing(loc.coords.latitude, loc.coords.longitude, activeWaypoint.lat, activeWaypoint.lng);
          }
        );
      }

      // Heading → rotate arrow
      headingWatchRef.current = await Location.watchHeadingAsync((data) => {
        if (!isActive) return;
        const rawH = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
        if (rawH < 0) return;
        setHeading(Math.round(rawH));

        const targetAngle = -rawH + (activeWaypoint ? targetBearingRef.current : 0);
        const cur = ((unboundedRef.current % 360) + 360) % 360;
        let diff = targetAngle - cur;
        if (diff < -180) diff += 360;
        else if (diff > 180) diff -= 360;
        unboundedRef.current += diff;
        rotation.value = withTiming(unboundedRef.current, { duration: 150 });
      });
    };

    start();

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { if (!headingWatchRef.current) start(); }
      else stop();
    });

    return () => {
      isActive = false;
      stop();
      sub.remove();
    };
  }, [activeWaypoint]);

  // ─── Saving flows ─────────────────────────────────────────────────────────

  const openSaveModal = async (wpToEdit?: Waypoint) => {
    if (wpToEdit) {
      setEditingId(wpToEdit.id);
      setWpName(wpToEdit.name);
      setWpIconKey(wpToEdit.icon || 'car');
      setSavingLoc({ lat: wpToEdit.lat, lng: wpToEdit.lng });
      setModalVisible(true);
      return;
    }

    if (waypoints.length >= 20) {
      Alert.alert('Limit reached', 'You can save up to 20 waypoints. Delete one to continue.');
      return;
    }

    setIsFetchingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow location access to save waypoints.');
        return;
      }

      // 1. Fast path: use last-known position if it's fresh (< 60 s)
      let coords: { lat: number; lng: number } | null = null;
      try {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: 60_000,       // accept readings up to 60 s old
          requiredAccuracy: 200, // within 200 m is fine for saving a spot
        });
        if (last) {
          coords = { lat: last.coords.latitude, lng: last.coords.longitude };
        }
      } catch { /* ignore — will fall through to fresh fetch */ }

      // 2. Fresh fetch if no recent fix available
      if (!coords) {
        // Race a Balanced-accuracy fix against a 15-second timeout
        const fixPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('GPS timeout')), 15_000)
        );
        const loc = await Promise.race([fixPromise, timeoutPromise]);
        coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }

      setSavingLoc(coords);
      setWpName('');
      setWpIconKey('car');
      setModalVisible(true);
    } catch (e: any) {
      const msg = e?.message === 'GPS timeout'
        ? 'Could not get a GPS fix in time. Try moving outdoors and try again.'
        : 'Could not get GPS position. Check location permissions.';
      Alert.alert('GPS Error', msg);
    } finally {
      setIsFetchingGPS(false);
    }
  };

  const confirmSave = async () => {
    if (!savingLoc) return;
    const name = wpName.trim() || 'My Spot';

    if (editingId) {
      const updated = waypoints.map(w =>
        w.id === editingId ? { ...w, name, icon: wpIconKey } : w
      );
      await persist(updated);
      setEditingId(null);
      setModalVisible(false);
      return;
    }

    const newWp: Waypoint = {
      id: Date.now().toString(),
      name,
      lat: savingLoc.lat,
      lng: savingLoc.lng,
      savedAt: Date.now(),
      icon: wpIconKey,
    };
    const updated = [...waypoints, newWp];
    await persist(updated);
    setActiveId(newWp.id);
    setDistance(null);
    setModalVisible(false);
  };

  const deleteWaypoint = async (id: string) => {
    Alert.alert('Delete waypoint?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = waypoints.filter((w) => w.id !== id);
          await persist(updated);
          if (activeId === id) { setActiveId(null); setDistance(null); }
        },
      },
    ]);
  };

  // ─── Animated styles ──────────────────────────────────────────────────────

  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  // Compass ring ticks
  const ringTicks = useMemo(() => {
    const ticks = [];
    const r = COMPASS_SIZE / 2 - 10;
    for (let i = 0; i < 72; i++) {
      const major = i % 9 === 0;
      const angleRad = (i / 72) * 2 * Math.PI;
      const x = COMPASS_SIZE / 2 + Math.cos(angleRad) * r - 1;
      const y = COMPASS_SIZE / 2 + Math.sin(angleRad) * r - 1;
      ticks.push(
        <View
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: major ? 3 : 1,
            height: major ? 10 : 6,
            backgroundColor: major
              ? (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)')
              : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
            borderRadius: 2,
            transform: [{ rotate: `${(i / 72) * 360 + 90}deg` }],
          }}
        />
      );
    }
    return ticks;
  }, [isDark]);

  const activeIconMeta = WP_ICONS.find((i) => i.key === wpIconKey) ?? WP_ICONS[0];
  // currentWpIcon removed — icon is displayed per-row inside the .map() below

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Compass Disc */}
        <View style={[styles.compassBg, { backgroundColor: colors.surface, width: COMPASS_SIZE + 16, height: COMPASS_SIZE + 16, borderRadius: (COMPASS_SIZE + 16) / 2, borderColor: colors.border }]}>
          <View style={{ width: COMPASS_SIZE, height: COMPASS_SIZE, position: 'relative' }}>
            {/* Ring ticks */}
            {ringTicks}
            {/* Arrow */}
            <Animated.View style={[styles.arrowWrapper, { width: COMPASS_SIZE, height: COMPASS_SIZE }, arrowStyle]}>
              <Animated.View style={[styles.arrowInner, pulseStyle]}>
                {/* Arrow shaft */}
                <View style={[styles.arrowShaft, { backgroundColor: activeWaypoint ? '#32cd32' : colors.textMuted }]} />
                {/* Arrowhead */}
                <View style={[styles.arrowHead, { borderBottomColor: activeWaypoint ? '#32cd32' : colors.textMuted }]} />
                {/* Tail */}
                <View style={[styles.arrowTail, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]} />
              </Animated.View>
            </Animated.View>
            {/* Center dot */}
            <View style={[styles.centerDot, { backgroundColor: activeWaypoint ? '#32cd32' : colors.border, borderColor: colors.surface }]} />
          </View>
        </View>

        {/* Distance / status */}
        <View style={styles.statusBlock}>
          {activeWaypoint ? (
            near ? (
              <>
                <Text style={[styles.nearText, { color: '#32cd32' }]}>✓ You've Arrived!</Text>
                <Text style={[styles.nearSub, { color: colors.textMuted }]}>{`< 20 m from "${activeWaypoint.name}"`}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.distText, { color: colors.text }]}>
                  {distance !== null ? formatDist(distance) : '...'}
                </Text>
                <Text style={[styles.distLabel, { color: colors.accent }]}>TO {activeWaypoint.name.toUpperCase()}</Text>
              </>
            )
          ) : (
            <Text style={[styles.noTargetText, { color: colors.textMuted }]}>
              Save a waypoint and tap it to start navigating.
            </Text>
          )}
          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: '#32cd321A', borderColor: '#32cd32' },
            isFetchingGPS && { opacity: 0.5 }
          ]}
          onPress={() => openSaveModal()}
          activeOpacity={0.8}
          disabled={isFetchingGPS}
        >
          {isFetchingGPS ? (
            <ActivityIndicator color="#32cd32" size="small" />
          ) : (
            <MaterialCommunityIcons name="map-marker-plus" size={22} color="#32cd32" />
          )}
          <Text style={[styles.saveBtnText, { color: '#32cd32' }]}>
            {isFetchingGPS ? 'Acquiring GPS...' : 'Save Current Location'}
          </Text>
        </TouchableOpacity>

        {/* Empty state */}
        {waypoints.length === 0 && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
            <MaterialCommunityIcons name="map-marker-off" size={48} color={colors.border} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No waypoints saved yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Tap “Save Current Location” to mark your first spot, then tap a waypoint to navigate to it.
            </Text>
          </Animated.View>
        )}

        {/* Waypoint List */}
        {waypoints.length > 0 && (
          <View style={styles.listContainer}>
            <Text style={[styles.listTitle, { color: colors.textMuted }]}>SAVED WAYPOINTS ({waypoints.length}/20)</Text>
            {waypoints.map((wp, idx) => {
              const isActive = wp.id === activeId;
              const wpIcon = WP_ICONS.find((i) => i.key === wp.icon) ?? WP_ICONS[0];
              return (
                <Animated.View key={wp.id} entering={FadeInDown.delay(idx * 60).springify()}>
                  <Swipeable
                    renderRightActions={() => (
                      <TouchableOpacity
                        accessibilityLabel={`Delete waypoint ${wp.name}`}
                        accessibilityRole="button"
                        style={styles.swipeDelete}
                        onPress={() => deleteWaypoint(wp.id)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF6B6B" />
                        <Text style={styles.swipeDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    rightThreshold={40}
                    overshootRight={false}
                    friction={2}
                  >
                    <TouchableOpacity
                      style={[
                        styles.wpCard,
                        {
                          backgroundColor: isActive ? (isDark ? '#32cd321A' : '#32cd3215') : colors.surface,
                          borderColor: isActive ? '#32cd32' : colors.border,
                        },
                      ]}
                      onPress={() => { setActiveId(wp.id); setDistance(null); }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.wpIconCircle, { backgroundColor: `${wpIcon.color}22` }]}>
                        <MaterialCommunityIcons name={wpIcon.icon as any} size={22} color={wpIcon.color} />
                      </View>
                      <View style={styles.wpInfo}>
                        <Text style={[styles.wpName, { color: colors.text }]} numberOfLines={1}>{wp.name}</Text>
                        <Text style={[styles.wpCoords, { color: colors.textMuted }]}>
                          {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                        </Text>
                      </View>
                      {isActive && (
                        <View style={styles.activeChip}>
                          <MaterialCommunityIcons name="navigation" size={12} color="#32cd32" />
                          <Text style={styles.activeChipText}>Navigating</Text>
                        </View>
                      )}
                      <View style={styles.wpActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(drawer)/map?lat=${wp.lat}&lng=${wp.lng}&name=${encodeURIComponent(wp.name)}`)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MaterialCommunityIcons name="map-outline" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => openSaveModal(wp)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Swipeable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Save Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { setModalVisible(false); setEditingId(null); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingId ? 'Edit Waypoint' : 'Name This Waypoint'}</Text>
            <TextInput
              style={[styles.nameInput, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              placeholder="E.g. My Car, Hotel, Campsite..."
              placeholderTextColor={colors.textMuted}
              value={wpName}
              onChangeText={setWpName}
              maxLength={28}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmSave}
            />
            {/* Icon picker */}
            <Text style={[styles.modalSubLabel, { color: colors.textMuted }]}>Choose an icon</Text>
            <View style={styles.iconPicker}>
              {WP_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic.key}
                  style={[styles.iconPickerBtn, { backgroundColor: `${ic.color}22`, borderColor: wpIconKey === ic.key ? ic.color : 'transparent', borderWidth: 2 }]}
                  onPress={() => setWpIconKey(ic.key)}
                >
                  <MaterialCommunityIcons name={ic.icon as any} size={26} color={ic.color} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => { setModalVisible(false); setEditingId(null); }}>
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#32cd32' }]} onPress={confirmSave}>
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  compassBg: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 18,
  },
  arrowWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 60,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: -2,
  },
  arrowShaft: {
    width: 6,
    height: COMPASS_SIZE * 0.15,
    borderRadius: 3,
  },
  arrowTail: {
    width: 6,
    height: COMPASS_SIZE * 0.12,
    borderRadius: 3,
    marginTop: 2,
  },
  centerDot: {
    position: 'absolute',
    alignSelf: 'center',
    top: COMPASS_SIZE / 2 - 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    zIndex: 20,
  },
  statusBlock: {
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  distText: {
    fontSize: 56,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    lineHeight: 62,
  },
  distLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  nearText: {
    fontSize: 30,
    fontWeight: '800',
  },
  nearSub: {
    fontSize: 14,
    marginTop: 4,
  },
  noTargetText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    color: '#FF6B6B',
    marginTop: 8,
    fontSize: 13,
  },
  saveBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  listTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  wpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  wpIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wpInfo: {
    flex: 1,
  },
  wpName: {
    fontSize: 16,
    fontWeight: '700',
  },
  wpCoords: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#32cd321A',
    gap: 4,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#32cd32',
  },
  swipeDelete: {
    width: 72,
    backgroundColor: '#FF6B6B18',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  swipeDeleteText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.75,
  },
  wpActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    gap: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  nameInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  modalSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
  },
  iconPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  iconPickerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: Radius.full,
  },
});
