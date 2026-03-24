import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useCountdownContext } from '@/context/countdown-context';
import { CountdownCard } from '@/components/countdown-card';
import { AppColors, Spacing, Radius } from '@/constants/theme';

export default function TimersScreen() {
  const { activeCountdowns, deleteCountdown, archiveCountdown, loading } = useCountdownContext();
  const router = useRouter();

  const handleDelete  = useCallback((id: string) => deleteCountdown(id),  [deleteCountdown]);
  const handleArchive = useCallback((id: string) => archiveCountdown(id), [archiveCountdown]);

  return (
    <SafeAreaView style={styles.safe}>
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
      </View>

      {/* ── List ── */}
      {loading ? null : activeCountdowns.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.empty}>
          <Text style={styles.emptyIcon}>⏳</Text>
          <Text style={styles.emptyTitle}>Nothing counting down yet</Text>
          <Text style={styles.emptySub}>
            Tap the + button to add your first countdown
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={activeCountdowns}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <CountdownCard
              countdown={item}
              index={index}
              onDelete={handleDelete}
              onArchive={handleArchive}
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
    paddingBottom: 100,
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
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 62,
    height: 62,
    borderRadius: Radius.full,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.accent,
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
