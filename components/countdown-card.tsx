import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { Countdown } from '@/types/countdown';
import { CATEGORY_COLORS, CATEGORY_LABELS, getTimeRemaining } from '@/types/countdown';
import { AppColors, Radius, Spacing } from '@/constants/theme';

interface Props {
  countdown: Countdown;
  index: number;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.timeUnit}>
      <Text style={styles.timeValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  );
}

export function CountdownCard({ countdown, index, onDelete, onArchive }: Props) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(countdown.targetDate));
  const scale = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = getTimeRemaining(countdown.targetDate);
      setRemaining(t);
      if (t.isExpired) {
        clearInterval(interval);
        onArchive(countdown.id);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown.targetDate, countdown.id, onArchive]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleLongPress = () => {
    scale.value = withSpring(0.97, {}, () => {
      scale.value = withSpring(1);
    });
    Alert.alert(
      countdown.title,
      'What would you like to do?',
      [
        { text: 'Archive', onPress: () => onArchive(countdown.id) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Delete Countdown', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(countdown.id) },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const accentColor = CATEGORY_COLORS[countdown.category];
  const targetDate  = new Date(countdown.targetDate);
  const dateLabel   = targetDate.toLocaleDateString(undefined, {
    month:  'long',
    day:    'numeric',
    year:   'numeric',
  });

  // Progress 0→1 from creation to targetDate
  const created  = new Date(countdown.createdAt).getTime();
  const target   = new Date(countdown.targetDate).getTime();
  const now      = Date.now();
  const progress = Math.max(0, Math.min(1, (now - created) / (target - created)));

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={handleLongPress}
          style={[styles.card, { borderLeftColor: accentColor }]}>
          {/* Header row */}
          <View style={styles.header}>
            <View style={[styles.categoryBadge, { backgroundColor: accentColor + '22' }]}>
              <Text style={[styles.categoryText, { color: accentColor }]}>
                {CATEGORY_LABELS[countdown.category]}
              </Text>
            </View>
            {countdown.notificationsEnabled && (
              <Text style={styles.bellIcon}>🔔</Text>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>{countdown.title}</Text>

          {/* Days prominent display */}
          {remaining.days > 0 && (
            <View style={styles.daysRow}>
              <Text style={[styles.daysNumber, { color: accentColor }]}>{remaining.days}</Text>
              <Text style={styles.daysLabel}>days left</Text>
            </View>
          )}

          {/* HMS row */}
          <View style={styles.timerRow}>
            <TimeUnit value={remaining.hours}   label="HRS" />
            <Text style={styles.separator}>:</Text>
            <TimeUnit value={remaining.minutes} label="MIN" />
            <Text style={styles.separator}>:</Text>
            <TimeUnit value={remaining.seconds} label="SEC" />
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` as any, backgroundColor: accentColor },
              ]}
            />
          </View>

          {/* Date label */}
          <Text style={styles.dateText}>{dateLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bellIcon: {
    fontSize: 14,
  },
  title: {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    lineHeight: 26,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  daysNumber: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 58,
    letterSpacing: -1,
  },
  daysLabel: {
    color: AppColors.textMuted,
    fontSize: 16,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeUnit: {
    alignItems: 'center',
    minWidth: 52,
  },
  timeValue: {
    color: AppColors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timeLabel: {
    color: AppColors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  separator: {
    color: AppColors.textMuted,
    fontSize: 24,
    fontWeight: '300',
    marginHorizontal: 4,
    marginBottom: 12,
  },
  progressTrack: {
    height: 3,
    backgroundColor: AppColors.surfaceAlt,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    opacity: 0.8,
  },
  dateText: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
