import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useCountdownContext } from '@/context/countdown-context';
import { useThemeContext } from '@/context/theme-context';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/countdown';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';

type SortOption = 'newest' | 'oldest' | 'alpha';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  alpha:  'A–Z',
};

export default function ArchiveScreen() {
  const { archivedCountdowns, deleteCountdown, updateCountdown } = useCountdownContext();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleRestore = (id: string) => {
    Alert.alert('Restore', 'Move this back to your active countdowns?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => updateCountdown(id, { archivedAt: undefined, isRestored: true }) },
    ]);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Record', `Permanently delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCountdown(id) },
    ]);
  };

  const sorted = [...archivedCountdowns].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.archivedAt ?? b.createdAt).getTime() -
             new Date(a.archivedAt ?? a.createdAt).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.archivedAt ?? a.createdAt).getTime() -
             new Date(b.archivedAt ?? b.createdAt).getTime();
    }
    return a.title.localeCompare(b.title);
  });

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

      {/* ── Sort Controls ── */}
      {archivedCountdowns.length > 1 && (
        <View style={styles.sortRow}>
          {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => setSortBy(opt)}
              style={[
                styles.sortChip,
                sortBy === opt && { backgroundColor: colors.accent + '33', borderColor: colors.accent },
              ]}>
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === opt && { color: colors.accent },
                ]}>
                {SORT_LABELS[opt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {archivedCountdowns.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <MaterialCommunityIcons name="archive-outline" size={80} color={colors.accent + '88'} style={{ marginBottom: Spacing.md }} />
          <Text style={styles.emptyTitle}>Archive is empty</Text>
          <Text style={styles.emptySub}>
            Completed countdowns will appear here automatically
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const accentColor = CATEGORY_COLORS[item.category];
            const targetDate = new Date(item.targetDate);
            const archivedDate = item.archivedAt ? new Date(item.archivedAt) : null;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.card, { borderLeftColor: accentColor }]}>
                <View style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: accentColor + '22' }]}>
                    <Text style={[styles.badgeText, { color: accentColor }]}>
                      {CATEGORY_LABELS[item.category]}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#32cd32" />
                </View>

                <Text style={styles.title}>{item.title}</Text>

                {/* Show notes if present */}
                {item.notes ? (
                  <Text style={styles.notesText} numberOfLines={2}>
                    {item.notes}
                  </Text>
                ) : null}

                <Text style={styles.dateText}>
                  {targetDate.toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>

                {archivedDate && (
                  <Text style={styles.completedText}>
                    Completed{' '}
                    {archivedDate.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                )}

                {/* Action buttons — visible instead of hidden long-press */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.cardActionBtn, { backgroundColor: colors.accent + '18' }]}
                    onPress={() => handleRestore(item.id)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="restore" size={16} color={colors.accent} />
                    <Text style={[styles.cardActionText, { color: colors.accent }]}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardActionBtn, { backgroundColor: '#FF6B6B18' }]}
                    onPress={() => handleDelete(item.id, item.title)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF6B6B" />
                    <Text style={[styles.cardActionText, { color: '#FF6B6B' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
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
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  sortChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 32,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    opacity: 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  notesText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  completedText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
