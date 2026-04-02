import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useCountdownContext } from '@/context/countdown-context';
import { useThemeContext } from '@/context/theme-context';
import { CountdownCard } from '@/components/countdown-card';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';
import { CATEGORIES, CATEGORY_COLORS, type CountdownCategory, type Countdown } from '@/types/countdown';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@has_onboarded_v1';

// ─── Onboarding slides ────────────────────────────────────────────────────────
const SLIDES = [
  {
    icon: '⏳',
    title: 'Track Every Moment',
    body: 'Count down to birthdays, trips, deadlines — anything that matters. Your events, always visible.',
  },
  {
    icon: '🧭',
    title: 'Qiblah Compass',
    body: 'A high-precision Qiblah compass using native sensor fusion. Always know your direction.',
  },
  {
    icon: '🔗',
    title: 'Share With Friends',
    body: 'Long-press any countdown to generate a deep link. Friends can import it into their own app instantly.',
  },
];

function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;

  const goNext = () => {
    if (page < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: page + 1, animated: true });
      setPage(p => p + 1);
    } else {
      onDone();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 90, marginBottom: 24 }}>{item.icon}</Text>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 }}>
              {item.title}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 17, textAlign: 'center', lineHeight: 26 }}>
              {item.body}
            </Text>
          </View>
        )}
      />
      {/* Dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {SLIDES.map((_, i) => (
          <View key={i} style={{
            width: i === page ? 20 : 8, height: 8, borderRadius: 4,
            backgroundColor: i === page ? colors.accent : colors.border,
          }} />
        ))}
      </View>
      <TouchableOpacity
        accessibilityLabel={page < SLIDES.length - 1 ? 'Next' : 'Get Started'}
        accessibilityRole="button"
        onPress={goNext}
        style={{
          marginHorizontal: 32, marginBottom: 48, backgroundColor: colors.accent,
          paddingVertical: 16, borderRadius: Radius.full, alignItems: 'center',
        }}>
        <Text style={{ color: '#000', fontWeight: '800', fontSize: 17 }}>
          {page < SLIDES.length - 1 ? 'Next →' : 'Get Started'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Undo-delete snackbar ─────────────────────────────────────────────────────
function UndoSnackbar({
  label,
  onUndo,
  onDismiss,
}: {
  label: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const translateY = useSharedValue(100);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20 });
    const t = setTimeout(() => {
      translateY.value = withTiming(100, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[{
      position: 'absolute', bottom: 110, left: 16, right: 16,
      backgroundColor: colors.surfaceAlt, borderRadius: Radius.md,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderWidth: 1, borderColor: colors.border,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    }, style]}>
      <Text style={{ color: colors.text, fontSize: 14, flex: 1 }} numberOfLines={1}>
        "{label}" deleted
      </Text>
      <TouchableOpacity
        accessibilityLabel="Undo delete"
        accessibilityRole="button"
        onPress={() => {
          translateY.value = withTiming(100, { duration: 200 });
          onUndo();
        }}
        style={{ marginLeft: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.accent, borderRadius: Radius.full }}>
        <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Undo</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TimersScreen() {
  const {
    activeCountdowns,
    deleteCountdown,
    archiveCountdown,
    loading,
    renewCountdown,
    addCountdown,
    togglePin,
  } = useCountdownContext();

  const { effectiveTheme, themeMode, setThemeMode } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<CountdownCategory | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // FAB pulse ring (only when list is empty)
  const fabRingScale   = useSharedValue(1);
  const fabRingOpacity = useSharedValue(0);

  useEffect(() => {
    if (activeCountdowns.length === 0) {
      fabRingScale.value   = withRepeat(withSequence(withTiming(1.8, { duration: 900 }), withTiming(1, { duration: 0 })), -1, false);
      fabRingOpacity.value = withRepeat(withSequence(withTiming(0.45, { duration: 200 }), withTiming(0, { duration: 700 })), -1, false);
    } else {
      fabRingScale.value   = withTiming(1, { duration: 200 });
      fabRingOpacity.value = withTiming(0, { duration: 200 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCountdowns.length]);

  const fabRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabRingScale.value }],
    opacity: fabRingOpacity.value,
  }));

  // Undo-delete state
  const [pendingDelete, setPendingDelete] = useState<Countdown | null>(null);
  const pendingDeleteRef = useRef<Countdown | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check onboarding status on first mount
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      if (!val) setShowOnboarding(true);
      setOnboardingChecked(true);
    }).catch(() => setOnboardingChecked(true));
  }, []);

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  // Deep link import
  React.useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.path === 'import' && parsed.queryParams) {
        const { title, date, category } = parsed.queryParams;
        if (typeof title === 'string' && typeof date === 'string') {
          // Validate the date string is actually a parseable, finite date
          const parsedMs = new Date(date).getTime();
          if (!Number.isFinite(parsedMs)) return;

          const safeCategory: CountdownCategory =
            CATEGORIES.includes(category as CountdownCategory)
              ? (category as CountdownCategory)
              : 'personal';

          Alert.alert('Import Countdown', `Would you like to track "${title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Import',
              onPress: () =>
                addCountdown({
                  title,
                  targetDate: date,
                  category: safeCategory,
                  notificationsEnabled: true,
                }),
            },
          ]);
        }
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', e => handleUrl(e.url));
    return () => sub.remove();
  }, [addCountdown]);

  // ── Undo delete helpers ───────────────────────────────────────────────────
  const commitDelete = useCallback((id: string) => {
    deleteCountdown(id);
    setPendingDelete(null);
    pendingDeleteRef.current = null;
  }, [deleteCountdown]);

  const handleDelete = useCallback((id: string) => {
    // If there's already a pending delete, commit it first
    if (pendingDeleteRef.current) {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      commitDelete(pendingDeleteRef.current.id);
    }
    const item = activeCountdowns.find(c => c.id === id);
    if (!item) return;
    setPendingDelete(item);
    pendingDeleteRef.current = item;
    deleteTimerRef.current = setTimeout(() => commitDelete(id), 4200);
  }, [activeCountdowns, commitDelete]);

  const handleUndoDelete = useCallback(() => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDelete(null);
    pendingDeleteRef.current = null;
  }, []);

  const handleArchive = useCallback((id: string) => archiveCountdown(id), [archiveCountdown]);
  const handleRenew = useCallback((id: string) => renewCountdown(id), [renewCountdown]);
  const handleEdit = useCallback(
    (id: string) => router.push(`/modal?id=${id}` as any),
    [router]
  );
  const handlePin = useCallback((id: string) => togglePin(id), [togglePin]);

  const toggleTheme = () => {
    if (themeMode === 'system') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('light');
    else setThemeMode('system');
  };

  // Sorted: pinned first, then by target date
  const sortedActive = useMemo(() => {
    return [...activeCountdowns].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
  }, [activeCountdowns]);

  // Smart header subtitle: show next upcoming event
  const headerSubtitle = useMemo(() => {
    if (activeCountdowns.length === 0) return 'No active timers yet';
    const now = Date.now();
    const next = sortedActive.find(c => new Date(c.targetDate).getTime() > now);
    if (next) {
      const days = Math.ceil((new Date(next.targetDate).getTime() - now) / 86400000);
      const short = next.title.length > 18 ? next.title.slice(0, 18) + '…' : next.title;
      return `Next: ${short} · ${days}d`;
    }
    return `${activeCountdowns.length} active timer${activeCountdowns.length !== 1 ? 's' : ''}`;
  }, [activeCountdowns.length, sortedActive]);

  const filteredCountdowns = useMemo(() => sortedActive.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory ? c.category === filterCategory : true;
    // Hide the pending-delete item from the visible list
    const notPending = !pendingDelete || c.id !== pendingDelete.id;
    return matchesSearch && matchesCategory && notPending;
  }), [sortedActive, searchQuery, filterCategory, pendingDelete]);

  if (!onboardingChecked) return null;
  if (showOnboarding) return <OnboardingScreen onDone={handleOnboardingDone} />;

  return (
    <View
      style={[
        styles.safe,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 100) },
      ]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            accessibilityLabel="Open navigation menu"
            accessibilityRole="button"
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.themeToggle, { marginRight: 12 }]}
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Countdowns</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{headerSubtitle}</Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Toggle theme"
          accessibilityRole="button"
          onPress={toggleTheme}
          style={styles.themeToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons
            name={themeMode === 'system' ? 'settings-outline' : themeMode === 'light' ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      {activeCountdowns.length > 0 && (
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countdowns…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search countdowns"
            />
          </View>
        </View>
      )}

      {/* ── Category filter pills ── */}
      {activeCountdowns.length > 0 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            accessibilityLabel="Show all categories"
            accessibilityRole="button"
            onPress={() => setFilterCategory(null)}
            style={[
              styles.filterChip,
              !filterCategory && { backgroundColor: colors.accent + '33', borderColor: colors.accent },
            ]}>
            <Text style={[styles.filterChipText, !filterCategory && { color: colors.accent }]}>
              All
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map(cat => {
            const catColor = CATEGORY_COLORS[cat];
            const isActive = filterCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                accessibilityLabel={`Filter by ${cat}`}
                accessibilityRole="button"
                onPress={() => setFilterCategory(prev => (prev === cat ? null : cat))}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: catColor + '22', borderColor: catColor },
                ]}
              >
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: catColor, marginRight: 5 }} />
                <Text style={[styles.filterChipText, isActive && { color: catColor }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── List ── */}
      {loading ? null : activeCountdowns.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <MaterialCommunityIcons name="timer-sand-empty" size={80} color={colors.accent + '88'} style={{ marginBottom: Spacing.md }} />
          <Text style={styles.emptyTitle}>Nothing counting down</Text>
          <Text style={styles.emptySub}>Tap the + button to add your first countdown</Text>
        </Animated.View>
      ) : filteredCountdowns.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <MaterialCommunityIcons name="text-search" size={80} color={colors.accent + '88'} style={{ marginBottom: Spacing.md }} />
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptySub}>Try a different search or category</Text>
        </Animated.View>
      ) : (
        <FlatList
          data={filteredCountdowns}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <CountdownCard
              countdown={item}
              index={index}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onRenew={handleRenew}
              onEdit={handleEdit}
              onPin={handlePin}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── FAB + pulse ring ── */}
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <Animated.View style={[styles.fabRing, fabRingStyle]} />
        <TouchableOpacity
          id="add-countdown-fab"
          accessibilityLabel="Add new countdown"
          accessibilityRole="button"
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => router.push('/modal')}
        >
          <Ionicons name="add" size={32} color="#000" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {/* ── Undo snackbar ── */}
      {pendingDelete && (
        <UndoSnackbar
          label={pendingDelete.title}
          onUndo={handleUndoDelete}
          onDismiss={() => {
            if (pendingDeleteRef.current) commitDelete(pendingDeleteRef.current.id);
          }}
        />
      )}
    </View>
  );
}

const createStyles = (colors: typeof DarkAppColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  themeToggle: {
    padding: Spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 140,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabRing: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: Radius.full,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: Radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
});
