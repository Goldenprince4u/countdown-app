import React, { useState, useMemo, useRef, useCallback } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useCountdownContext } from '@/context/countdown-context';
import { useThemeContext } from '@/context/theme-context';
import { useTickerContext } from '@/context/ticker-context';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/countdown';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';

type SortOption = 'newest' | 'oldest' | 'alpha';
const SORT_LABELS: Record<SortOption, string> = { newest: 'Newest', oldest: 'Oldest', alpha: 'A–Z' };

function timeSinceLabel(dateStr: string, now: number): string {
  const ms = now - new Date(dateStr).getTime();
  if (ms < 0) return 'just now';
  const minutes = Math.floor(ms / 60000);
  const hours   = Math.floor(ms / 3600000);
  const days    = Math.floor(ms / 86400000);
  const weeks   = Math.floor(days / 7);
  const months  = Math.floor(days / 30);
  const years   = Math.floor(days / 365);
  if (minutes < 1)  return 'just now';
  if (hours < 1)    return `${minutes} min ago`;
  if (days < 1)     return `${hours}h ago`;
  if (weeks < 1)    return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (months < 1)   return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  if (years < 1)    return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

export default function ArchiveScreen() {
  const { archivedCountdowns, deleteCountdown, updateCountdown } = useCountdownContext();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const now = useTickerContext();

  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleLongPress = (id: string, title: string) => {
    Alert.alert(title, 'What would you like to do?', [
      { text: 'Restore', onPress: () => updateCountdown(id, { archivedAt: undefined }) },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => Alert.alert('Delete Record', 'Permanently delete this? Cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteCountdown(id) },
        ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sorted = useMemo(() => {
    const base = archivedCountdowns.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...base].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.archivedAt ?? b.createdAt).getTime() - new Date(a.archivedAt ?? a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.archivedAt ?? a.createdAt).getTime() - new Date(b.archivedAt ?? b.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });
  }, [archivedCountdowns, sortBy, searchQuery]);

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Archive</Text>
        <Text style={styles.headerSub}>
          {archivedCountdowns.length > 0
            ? `${archivedCountdowns.length} completed countdown${archivedCountdowns.length !== 1 ? 's' : ''}`
            : 'Nothing here yet'}
        </Text>
      </View>

      {archivedCountdowns.length > 0 && (
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search archive…"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search archive"
            />
          </View>
        </View>
      )}

      {archivedCountdowns.length > 1 && (
        <View style={styles.sortRow}>
          {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
            <TouchableOpacity
              key={opt}
              accessibilityLabel={`Sort by ${SORT_LABELS[opt]}`}
              accessibilityRole="button"
              onPress={() => setSortBy(opt)}
              style={[styles.sortChip, sortBy === opt && { backgroundColor: colors.accent + '22', borderColor: colors.accent }]}
            >
              <Text style={[styles.sortChipText, sortBy === opt && { color: colors.accent }]}>
                {SORT_LABELS[opt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {archivedCountdowns.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <Animated.Text entering={FadeInDown.delay(80)} style={styles.emptyIcon}>🏁</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(160)} style={styles.emptyTitle}>No completed countdowns</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(240)} style={styles.emptySub}>
            Countdowns that reach zero will appear here automatically
          </Animated.Text>
        </Animated.View>
      ) : sorted.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptySub}>Try a different search term</Text>
        </Animated.View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const accentColor  = item.accentColor ?? CATEGORY_COLORS[item.category];
            const archivedDate = item.archivedAt ? new Date(item.archivedAt) : null;
            const sinceLabel   = archivedDate ? `Completed ${timeSinceLabel(item.archivedAt!, now)}` : undefined;

            return (
              <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <Swipeable
                  renderRightActions={() => (
                    <TouchableOpacity
                      accessibilityLabel="Delete archive item"
                      accessibilityRole="button"
                      style={styles.swipeDelete}
                      onPress={() =>
                        Alert.alert('Delete Record', 'Permanently delete this? Cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteCountdown(item.id) },
                        ])
                      }
                    >
                      <MaterialCommunityIcons name="delete-outline" size={22} color="#FF6B6B" />
                      <Text style={styles.swipeDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  rightThreshold={40}
                  overshootRight={false}
                  friction={2}
                >
                  <TouchableOpacity
                    accessibilityLabel={`${item.title}, archived countdown`}
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onLongPress={() => handleLongPress(item.id, item.title)}
                    style={[styles.card, { borderLeftColor: accentColor }]}
                  >
                    {/* Header row */}
                    <View style={styles.cardRow}>
                      <View style={[styles.badge, { backgroundColor: accentColor + '22' }]}>
                        <Text style={[styles.badgeText, { color: accentColor }]}>
                          {CATEGORY_LABELS[item.category]}
                        </Text>
                      </View>
                      {/* Circular checkmark badge */}
                      <View style={styles.checkBadge}>
                        <MaterialCommunityIcons name="check" size={13} color="#fff" />
                      </View>
                    </View>

                    <Text style={styles.title}>{item.title}</Text>

                    {item.notes ? (
                      <Text style={styles.notesText} numberOfLines={2}>📝 {item.notes}</Text>
                    ) : null}

                    <Text style={styles.dateText}>
                      📅 {new Date(item.targetDate).toLocaleDateString(undefined, {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </Text>

                    {sinceLabel && <Text style={styles.completedText}>{sinceLabel}</Text>}

                    <Text style={styles.longPressHint}>Hold to restore · Swipe to delete</Text>
                  </TouchableOpacity>
                </Swipeable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const createStyles = (colors: typeof DarkAppColors) => StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerTitle: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  headerSub:   { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  searchRow:   { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon:  { marginRight: Spacing.xs },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 15 },
  sortRow:     { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.sm },
  sortChip:    { borderWidth: 1, borderColor: colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  sortChipText:{ color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  list:        { paddingHorizontal: Spacing.md, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center' },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  emptyIcon:   { fontSize: 64, marginBottom: Spacing.md, textAlign: 'center' },
  emptyTitle:  { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },
  emptySub:    { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  swipeDelete: {
    width: 72,
    backgroundColor: '#FF6B6B18',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  swipeDeleteText: { fontSize: 10, fontWeight: '600', color: '#FF6B6B', letterSpacing: 0.3 },
  cardRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  badge:       { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  badgeText:   { fontSize: 12, fontWeight: '600' },
  checkBadge:  { width: 22, height: 22, borderRadius: 11, backgroundColor: '#27AE60', alignItems: 'center', justifyContent: 'center' },
  title:       { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: Spacing.sm },
  notesText:   { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginBottom: Spacing.xs, lineHeight: 18 },
  dateText:    { color: colors.textMuted, fontSize: 13, marginBottom: 4 },
  completedText:  { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  longPressHint:  { color: colors.textMuted, fontSize: 10, marginTop: Spacing.sm, fontStyle: 'italic', opacity: 0.5 },
});
