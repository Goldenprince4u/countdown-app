import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addCountdown, updateCountdown, countdowns } = useCountdownContext();
  const insets = useSafeAreaInsets();

  const isEditing = !!id;
  const existing = isEditing ? countdowns.find(c => c.id === id) : undefined;

  const [title, setTitle]             = useState(existing?.title ?? '');
  const [targetDate, setTargetDate]   = useState<Date>(() => {
    if (existing) return new Date(existing.targetDate);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [category, setCategory]       = useState<CountdownCategory>(existing?.category ?? 'personal');
  const [notifications, setNotifications] = useState(existing?.notificationsEnabled ?? true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | undefined>(existing?.backgroundImageUri);
  const [repeatInterval, setRepeatInterval] = useState<'yearly' | 'monthly' | 'weekly' | undefined>(existing?.repeatInterval);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setBackgroundImageUri(result.assets[0].uri);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Only dismiss if not iOS (iOS inline picker shouldn't be hidden)
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selected) {
      const merged = new Date(selected);
      merged.setHours(targetDate.getHours(), targetDate.getMinutes(), 0, 0);
      setTargetDate(merged);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && selected) {
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
      if (isEditing && id) {
        await updateCountdown(id, {
          title: title.trim(),
          targetDate: targetDate.toISOString(),
          category,
          notificationsEnabled: notifications,
          backgroundImageUri,
          repeatInterval,
        });
      } else {
        await addCountdown({
          title: title.trim(),
          targetDate: targetDate.toISOString(),
          category,
          notificationsEnabled: notifications,
          backgroundImageUri,
          repeatInterval,
        });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'An unexpected error occurred while saving.');
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
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
      {/* ── Drag handle / top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} id="modal-cancel">
          <Text style={styles.topBarCancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{isEditing ? 'Edit Countdown' : 'New Countdown'}</Text>
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

        {/* ── Background Photo ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.label}>Background Photo</Text>
          {backgroundImageUri && (
            <TouchableOpacity onPress={() => setBackgroundImageUri(undefined)}>
              <Text style={{ color: AppColors.textMuted, fontSize: 13, marginTop: Spacing.md }}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.pickerBtn} onPress={pickImage}>
          <Text style={styles.pickerIcon}>🖼️</Text>
          <Text style={[styles.pickerText, backgroundImageUri && { color: AppColors.accent }]}>
            {backgroundImageUri ? 'Photo Selected (Tap to change)' : 'Select Photo from Gallery'}
          </Text>
        </TouchableOpacity>
        
        {backgroundImageUri && (
          <Image 
            source={{ uri: backgroundImageUri }} 
            style={{ width: '100%', height: 120, borderRadius: Radius.md, marginTop: Spacing.sm }} 
            resizeMode="cover"
          />
        )}

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

        {/* ── Repeat Options ── */}
        <Text style={styles.label}>Repeat Countdown</Text>
        <View style={styles.categoryGrid}>
          {[undefined, 'weekly', 'monthly', 'yearly'].map(interval => {
            const isSelected = repeatInterval === interval;
            const label = interval ? interval.charAt(0).toUpperCase() + interval.slice(1) : 'None';
            return (
              <TouchableOpacity
                key={interval ?? 'none'}
                onPress={() => setRepeatInterval(interval as any)}
                style={[
                  styles.categoryChip,
                  { borderColor: isSelected ? AppColors.accent : AppColors.border },
                  isSelected && { backgroundColor: AppColors.accent + '33' },
                ]}>
                <Text style={[styles.categoryChipText, { color: isSelected ? AppColors.accent : AppColors.textMuted }]}>
                  {label}
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
    </View>
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
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
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
