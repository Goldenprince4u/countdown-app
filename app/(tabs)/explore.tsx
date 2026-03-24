import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useCountdownContext } from '@/context/countdown-context';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/countdown';
import { AppColors, Spacing, Radius } from '@/constants/theme';

export default function ArchiveScreen() {
  const { archivedCountdowns, deleteCountdown } = useCountdownContext();

  const handleDelete = (id: string) => {
    Alert.alert('Remove from Archive', 'Permanently delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCountdown(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Archive</Text>
        <Text style={styles.headerSub}>
          {archivedCountdowns.length > 0
            ? `${archivedCountdowns.length} completed countdown${archivedCountdowns.length !== 1 ? 's' : ''}`
            : 'Nothing here yet'}
        </Text>
      </View>

      {archivedCountdowns.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <Text style={styles.emptyIcon}>🏁</Text>
          <Text style={styles.emptyTitle}>No completed countdowns</Text>
          <Text style={styles.emptySub}>
            Countdowns that reach zero will appear here automatically
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={archivedCountdowns}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const accentColor = CATEGORY_COLORS[item.category];
            const targetDate  = new Date(item.targetDate);
            const archivedDate = item.archivedAt ? new Date(item.archivedAt) : null;

            return (
              <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onLongPress={() => handleDelete(item.id)}
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

                  <Text style={styles.dateText}>
                    📅 {targetDate.toLocaleDateString(undefined, {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </Text>

                  {archivedDate && (
                    <Text style={styles.completedText}>
                      Completed {archivedDate.toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      )}
    </SafeAreaView>
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
    paddingBottom: Spacing.md,
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
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 32,
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
