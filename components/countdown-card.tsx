import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Share,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Countdown } from '@/types/countdown';
import { CATEGORY_COLORS, CATEGORY_LABELS, getTimeRemaining } from '@/types/countdown';
import { useThemeContext } from '@/context/theme-context';
import { DarkAppColors, LightAppColors, Radius, Spacing } from '@/constants/theme';
import { useTickerContext } from '@/context/ticker-context';
import { useAlarm } from '@/hooks/use-alarm';

interface Props {
  countdown: Countdown;
  index: number;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRenew: (id: string) => void;
  onEdit: (id: string) => void;
  onPin: (id: string) => void;
}

function TimeUnit({ value, label, styles }: { value: number; label: string; styles: any }) {
  return (
    <View style={styles.timeUnit}>
      <Text style={styles.timeValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.timeLabel}>{label}</Text>
    </View>
  );
}

export function CountdownCard({ countdown, index, onDelete, onArchive, onRenew, onEdit, onPin }: Props) {
  const now = useTickerContext();
  const remaining = getTimeRemaining(countdown.targetDate, now);
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const { playAlarm } = useAlarm();
  const swipeableRef = useRef<Swipeable>(null);

  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ── Derived values (before effects) ─────────────────────────────────────────
  const created     = new Date(countdown.createdAt).getTime();
  const target      = new Date(countdown.targetDate).getTime();
  const isMilestone = countdown.isMilestone ?? target <= created;
  const isUrgent    = remaining.days === 0 && !remaining.isPast;
  const progress    = remaining.isPast
    ? 1
    : Math.max(0, Math.min(1, (now - created) / (target - created)));
  const accentColor = countdown.accentColor ?? CATEGORY_COLORS[countdown.category];

  // ── Alarm + auto-archive ─────────────────────────────────────────────────────
  useEffect(() => {
    if (remaining.isExpired && !countdown.archivedAt && !isMilestone && !countdown.isRestored) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      playAlarm(countdown.alarmDuration ?? 15);
      if (countdown.repeatInterval) {
        onRenew(countdown.id);
      } else {
        onArchive(countdown.id);
      }
    }
  }, [remaining.isExpired, countdown.id, countdown.archivedAt, countdown.repeatInterval,
      countdown.alarmDuration, countdown.isRestored, isMilestone, onRenew, onArchive, playAlarm]);

  // ── Urgent pulse ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isUrgent) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.016, { duration: 800 }),
          withTiming(1,     { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUrgent]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    try {
      const url = Linking.createURL('import', {
        queryParams: { title: countdown.title, date: countdown.targetDate, category: countdown.category },
      });
      await Share.share({
        message: `I'm counting down to ${countdown.title}!\n\nTap to add it to your own Countdown App:\n${url}`,
      });
    } catch (e) { console.error(e); }
  }, [countdown.title, countdown.targetDate, countdown.category]);

  const handleLongPress = useCallback(() => {
    scale.value = withSpring(0.97, {}, () => { scale.value = withSpring(1); });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(countdown.title, 'What would you like to do?', [
      { text: countdown.isPinned ? '⭐ Unpin' : '📌 Pin to Top', onPress: () => onPin(countdown.id) },
      { text: '↗️ Share',   onPress: handleShare },
      { text: '✏️ Edit',    onPress: () => onEdit(countdown.id) },
      { text: '📦 Archive', onPress: () => onArchive(countdown.id) },
      {
        text: '🗑️ Delete', style: 'destructive',
        onPress: () => Alert.alert('Delete Countdown', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(countdown.id) },
        ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [countdown.id, countdown.title, countdown.isPinned, handleShare, onArchive, onDelete, onEdit, onPin, scale]);

  // ── Swipe actions ─────────────────────────────────────────────────────────────
  const renderRightActions = useCallback(() => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        accessibilityLabel="Archive countdown"
        accessibilityRole="button"
        style={[styles.swipeAction, { backgroundColor: colors.surfaceAlt }]}
        onPress={() => { swipeableRef.current?.close(); onArchive(countdown.id); }}
      >
        <MaterialCommunityIcons name="archive-outline" size={22} color={colors.textMuted} />
        <Text style={[styles.swipeActionText, { color: colors.textMuted }]}>Archive</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityLabel="Delete countdown"
        accessibilityRole="button"
        style={[styles.swipeAction, { backgroundColor: '#FF6B6B18' }]}
        onPress={() => {
          swipeableRef.current?.close();
          Alert.alert('Delete Countdown', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(countdown.id) },
          ]);
        }}
      >
        <MaterialCommunityIcons name="delete-outline" size={22} color="#FF6B6B" />
        <Text style={[styles.swipeActionText, { color: '#FF6B6B' }]}>Delete</Text>
      </TouchableOpacity>
    </View>
  ), [countdown.id, colors, onArchive, onDelete, styles]);

  // ── Display values ────────────────────────────────────────────────────────────
  const dateLabel = new Date(countdown.targetDate).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // ── Inner content ─────────────────────────────────────────────────────────────
  const innerContent = (
    <View style={[styles.innerContainer, countdown.backgroundImageUri ? styles.overlayPadding : null]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {countdown.isPinned && (
            <MaterialCommunityIcons name="pin" size={14} color={accentColor} style={{ marginRight: 4 }} />
          )}
          {isMilestone ? (
            <View style={[styles.categoryBadge, { backgroundColor: '#FFD70022' }]}>
              <Text style={[styles.categoryText, { color: '#FFD700' }]}>⭐ Milestone</Text>
            </View>
          ) : (
            <View style={[styles.categoryBadge, { backgroundColor: accentColor + '22' }]}>
              <Text style={[styles.categoryText, { color: accentColor }]}>
                {CATEGORY_LABELS[countdown.category]}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {isUrgent && (
            <View style={styles.badgeContainer}>
              <MaterialCommunityIcons name="fire" size={14} color="#FF6B6B" />
              <Text style={styles.urgentBadge}>Today</Text>
            </View>
          )}
          {countdown.repeatInterval && (
            <View style={styles.badgeContainer}>
              <MaterialCommunityIcons name="repeat" size={14} color={colors.textMuted} />
              <Text style={styles.repeatBadge}>{countdown.repeatInterval}</Text>
            </View>
          )}
          {countdown.notificationsEnabled && (
            <MaterialCommunityIcons name="bell-ring-outline" size={16} color={accentColor} style={{ marginLeft: 4 }} />
          )}
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{countdown.title}</Text>

      {/* Days */}
      {remaining.days > 0 && (
        <View style={styles.daysRow}>
          <Text style={[styles.daysNumber, { color: accentColor }]}>{remaining.days}</Text>
          <Text style={styles.daysLabel}>{remaining.isPast ? 'days since' : 'days left'}</Text>
        </View>
      )}

      {/* HMS */}
      <View style={styles.timerRow}>
        <TimeUnit value={remaining.hours}   label="HRS" styles={styles} />
        <Text style={styles.separator}>:</Text>
        <TimeUnit value={remaining.minutes} label="MIN" styles={styles} />
        <Text style={styles.separator}>:</Text>
        <TimeUnit value={remaining.seconds} label="SEC" styles={styles} />
      </View>

      {/* Progress bar with glow */}
      <View style={styles.progressTrack}>
        <View style={[
          styles.progressFill,
          {
            width: `${progress * 100}%` as any,
            backgroundColor: isUrgent ? '#FF6B6B' : accentColor,
            shadowColor:     isUrgent ? '#FF6B6B' : accentColor,
          },
        ]} />
      </View>

      {/* Date */}
      <Text style={styles.dateText}>{dateLabel}</Text>

      {/* Notes snippet */}
      {!!countdown.notes && (
        <Text style={styles.notesSnippet} numberOfLines={1}>📝 {countdown.notes}</Text>
      )}
    </View>
  );

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <Animated.View style={animatedStyle}>
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          rightThreshold={40}
          overshootRight={false}
          friction={2}
        >
          <TouchableOpacity
            accessibilityLabel={`${countdown.title}, ${remaining.days} ${remaining.isPast ? 'days since' : 'days left'}`}
            accessibilityRole="button"
            activeOpacity={0.85}
            delayLongPress={300}
            hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
            onPress={() => onEdit(countdown.id)}
            onLongPress={handleLongPress}
            style={[
              styles.card,
              { borderLeftColor: isUrgent ? '#FF6B6B' : accentColor },
              countdown.backgroundImageUri ? { padding: 0, overflow: 'hidden' } : null,
              countdown.isPinned ? styles.pinnedCard : null,
            ]}
          >
            {countdown.backgroundImageUri ? (
              <ImageBackground source={{ uri: countdown.backgroundImageUri }} style={styles.imageBg}>
                <View style={styles.imageOverlay}>{innerContent}</View>
              </ImageBackground>
            ) : innerContent}
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (colors: typeof DarkAppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  pinnedCard: { shadowOpacity: 0.6, elevation: 12 },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: Spacing.md,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    overflow: 'hidden',
  },
  swipeAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  swipeActionText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  innerContainer: { padding: 0 },
  overlayPadding: { padding: Spacing.md },
  imageBg: { width: '100%' },
  imageOverlay: { backgroundColor: 'rgba(0,0,0,0.6)' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  urgentBadge: { fontSize: 11, fontWeight: '700', color: '#FF6B6B' },
  repeatBadge: { fontSize: 11, color: colors.textMuted },
  categoryBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  categoryText: { fontSize: 12, fontWeight: '600' },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: Spacing.sm, lineHeight: 26 },
  daysRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.xs },
  daysNumber: { fontSize: 52, fontWeight: '800', lineHeight: 58, letterSpacing: -1 },
  daysLabel: { color: colors.textMuted, fontSize: 16, marginLeft: Spacing.sm, fontWeight: '500' },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  timeUnit: { alignItems: 'center', minWidth: 52 },
  timeValue: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  timeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  separator: { color: colors.textMuted, fontSize: 24, fontWeight: '300', marginHorizontal: 4, marginBottom: 12 },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 2,
  },
  dateText: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  notesSnippet: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 5, opacity: 0.8 },
});
