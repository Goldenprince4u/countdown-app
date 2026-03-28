import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useCountdownContext } from '@/context/countdown-context';
import { useThemeContext } from '@/context/theme-context';
import { CountdownCard } from '@/components/countdown-card';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';
import { CATEGORIES, type CountdownCategory } from '@/types/countdown';

export default function TimersScreen() {
  const {
    activeCountdowns,
    deleteCountdown,
    archiveCountdown,
    loading,
    renewCountdown,
    addCountdown,
  } = useCountdownContext();
  
  const { effectiveTheme, themeMode, setThemeMode } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<CountdownCategory | null>(null);

  React.useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.path === 'import' && parsed.queryParams) {
        const { title, date, category } = parsed.queryParams;
        if (typeof title === 'string' && typeof date === 'string') {
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

  const handleDelete = useCallback((id: string) => deleteCountdown(id), [deleteCountdown]);
  const handleArchive = useCallback((id: string) => archiveCountdown(id), [archiveCountdown]);
  const handleRenew = useCallback((id: string) => renewCountdown(id), [renewCountdown]);
  const handleEdit = useCallback(
    (id: string) => router.push(`/modal?id=${id}` as any),
    [router]
  );

  const toggleTheme = () => {
    if (themeMode === 'system') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('light');
    else setThemeMode('system');
  };

  const filteredCountdowns = activeCountdowns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory ? c.category === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <View
      style={[
        styles.safe,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 100) },
      ]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Countdowns</Text>
          <Text style={styles.headerSub}>
            {activeCountdowns.length > 0
              ? `${activeCountdowns.length} active timer${activeCountdowns.length !== 1 ? 's' : ''}`
              : 'No active timers'}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <Text style={styles.themeToggleIcon}>
            {themeMode === 'system' ? '⚙️' : themeMode === 'light' ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      {activeCountdowns.length > 0 && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search countdowns…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {/* ── Category filter pills ── */}
      {activeCountdowns.length > 0 && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilterCategory(null)}
            style={[
              styles.filterChip,
              !filterCategory && { backgroundColor: colors.accent + '33', borderColor: colors.accent },
            ]}>
            <Text style={[styles.filterChipText, !filterCategory && { color: colors.accent }]}>
              All
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setFilterCategory(prev => (prev === cat ? null : cat))}
              style={[
                styles.filterChip,
                filterCategory === cat && {
                  backgroundColor: colors.accent + '33',
                  borderColor: colors.accent,
                },
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  filterCategory === cat && { color: colors.accent },
                ]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── List ── */}
      {loading ? null : activeCountdowns.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <Text style={styles.emptyIcon}>⏳</Text>
          <Text style={styles.emptyTitle}>Nothing counting down yet</Text>
          <Text style={styles.emptySub}>Tap the + button to add your first countdown</Text>
        </Animated.View>
      ) : filteredCountdowns.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptySub}>Try a different search or category filter</Text>
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
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        id="add-countdown-fab"
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/modal')}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: {
    fontSize: 18,
  },
  searchRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  filterChip: {
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
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
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
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
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
});
