import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useCountdownContext } from '@/context/countdown-context';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type CountdownCategory,
} from '@/types/countdown';
import { AppColors, Spacing, Radius } from '@/constants/theme';

export default function AddCountdownModal() {
  const router = useRouter();
  const { addCountdown } = useCountdownContext();

  const [title, setTitle]             = useState('');
  const [targetDate, setTargetDate]   = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [category, setCategory]       = useState<CountdownCategory>('personal');
  const [notifications, setNotifications] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving]           = useState(false);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      const merged = new Date(selected);
      merged.setHours(targetDate.getHours(), targetDate.getMinutes(), 0, 0);
      setTargetDate(merged);
    }
  };

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      const merged = new Date(targetDate);
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setTargetDate(merged);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a name for your countdown.');
      return;
    }
    if (targetDate <= new Date()) {
      Alert.alert('Invalid date', 'Please pick a date in the future.');
      return;
    }
    setSaving(true);
    try {
      await addCountdown({
        title: title.trim(),
        targetDate: targetDate.toISOString(),
        category,
        notificationsEnabled: notifications,
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not save countdown. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = targetDate.toLocaleDateString(undefined, {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeLabel = targetDate.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Drag handle / top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} id="modal-cancel">
          <Text style={styles.topBarCancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>New Countdown</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          id="modal-save"
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Title ── */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          id="countdown-title-input"
          style={styles.input}
          placeholder="e.g. Summer Holiday"
          placeholderTextColor={AppColors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          returnKeyType="done"
        />

        {/* ── Date ── */}
        <Text style={styles.label}>Target Date</Text>
        <TouchableOpacity
          id="date-picker-btn"
          style={styles.pickerBtn}
          onPress={() => setShowDatePicker(true)}>
          <Text style={styles.pickerIcon}>📅</Text>
          <Text style={styles.pickerText}>{dateLabel}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={onDateChange}
            themeVariant="dark"
          />
        )}

        {/* ── Time ── */}
        <Text style={styles.label}>Target Time</Text>
        <TouchableOpacity
          id="time-picker-btn"
          style={styles.pickerBtn}
          onPress={() => setShowTimePicker(true)}>
          <Text style={styles.pickerIcon}>🕐</Text>
          <Text style={styles.pickerText}>{timeLabel}</Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={targetDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            themeVariant="dark"
          />
        )}

        {/* ── Category ── */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(cat => {
            const color    = CATEGORY_COLORS[cat];
            const selected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                id={`category-${cat}`}
                onPress={() => setCategory(cat)}
                style={[
                  styles.categoryChip,
                  { borderColor: color },
                  selected && { backgroundColor: color + '33' },
                ]}>
                <Text style={[styles.categoryChipText, { color: selected ? color : AppColors.textMuted }]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Notifications ── */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Daily Notifications</Text>
            <Text style={styles.switchSub}>Remind me every day at 9:00 AM</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: AppColors.surfaceAlt, true: AppColors.accent }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  topBarCancel: {
    color: AppColors.textMuted,
    fontSize: 16,
  },
  topBarTitle: {
    color: AppColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: AppColors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    color: AppColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: AppColors.surface,
    color: AppColors.text,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 17,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  pickerBtn: {
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  pickerIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  pickerText: {
    color: AppColors.text,
    fontSize: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  switchLabel: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  switchSub: {
    color: AppColors.textMuted,
    fontSize: 12,
  },
});
