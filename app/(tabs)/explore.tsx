import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCountdownContext } from '@/context/countdown-context';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/countdown';
import { AppColors, Spacing, Radius } from '@/constants/theme';

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

  const handleLongPress = (id: string, title: string) => {
    Alert.alert(title, 'What would you like to do?', [
      {
        text: 'Restore',
        onPress: () => updateCountdown(id, { archivedAt: undefined }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Record', 'Permanently delete this record? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCountdown(id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
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
                sortBy === opt && { backgroundColor: AppColors.accent + '33', borderColor: AppColors.accent },
              ]}>
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === opt && { color: AppColors.accent },
                ]}>
                {SORT_LABELS[opt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {archivedCountdowns.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏁</Text>
          <Text style={styles.emptyTitle}>No completed countdowns</Text>
          <Text style={styles.emptySub}>
            Countdowns that reach zero will appear here automatically
          </Text>
        </View>
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
                onLongPress={() => handleLongPress(item.id, item.title)}
                style={[styles.card, { borderLeftColor: accentColor }]}>
                <View style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: accentColor + '22' }]}>
                    <Text style={[styles.badgeText, { color: accentColor }]}>
                      {CATEGORY_LABELS[item.category]}
                    </Text>
                  </View>
                  <Text style={styles.checkmark}>✅</Text>
                </View>

                <Text style={styles.title}>{item.title}</Text>

                {/* Show notes if present */}
                {item.notes ? (
                  <Text style={styles.notesText} numberOfLines={2}>
                    📝 {item.notes}
                  </Text>
                ) : null}

                <Text style={styles.dateText}>
                  📅{' '}
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

                <Text style={styles.longPressHint}>Hold to restore or delete</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    color: AppColors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    color: AppColors.textMuted,
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
    borderColor: AppColors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  sortChipText: {
    color: AppColors.textMuted,
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: AppColors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySub: {
    color: AppColors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: AppColors.surface,
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
  longPressHint: {
    color: AppColors.textMuted,
    fontSize: 10,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
    opacity: 0.6,
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
  checkmark: {
    fontSize: 16,
  },
  title: {
    color: AppColors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  notesText: {
    color: AppColors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  dateText: {
    color: AppColors.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  completedText: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
