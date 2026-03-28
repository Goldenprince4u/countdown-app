import React, { useState, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { useCountdownContext } from '@/context/countdown-context';
import { useThemeContext } from '@/context/theme-context';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type CountdownCategory,
} from '@/types/countdown';
import { DarkAppColors, LightAppColors, Spacing, Radius } from '@/constants/theme';

// We no longer require a minimum date buffer because we now support Count-Up milestone tracking for past dates.

export default function AddCountdownModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addCountdown, updateCountdown, countdowns } = useCountdownContext();
  const insets = useSafeAreaInsets();
  
  const { effectiveTheme } = useThemeContext();
  const colors = effectiveTheme === 'dark' ? DarkAppColors : LightAppColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isEditing = !!id;
  const existing = isEditing ? countdowns.find(c => c.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [targetDate, setTargetDate] = useState<Date>(() => {
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
  const [tempImageUri, setTempImageUri] = useState<string | undefined>(undefined);
  const [repeatInterval, setRepeatInterval] = useState<'yearly' | 'monthly' | 'weekly' | undefined>(existing?.repeatInterval);
  const [alarmDuration, setAlarmDuration] = useState<number>(existing?.alarmDuration ?? 15);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setTempImageUri(uri);
      setBackgroundImageUri(uri);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
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

    setSaving(true);
    try {
      let finalImageUri = backgroundImageUri;

      // Copy to permanent storage only on save
      if (tempImageUri && backgroundImageUri === tempImageUri) {
        if (FileSystem.documentDirectory) {
           const filename = Date.now() + '-' + (tempImageUri.split('/').pop() || 'photo.jpg');
           finalImageUri = FileSystem.documentDirectory + filename;
           await FileSystem.copyAsync({ from: tempImageUri, to: finalImageUri });
        }
      }

      // Cleanup old permanent image if it was replaced or removed
      if (isEditing && existing?.backgroundImageUri && existing.backgroundImageUri !== finalImageUri) {
        FileSystem.deleteAsync(existing.backgroundImageUri, { idempotent: true }).catch(console.warn);
      }

      const payload = {
        title: title.trim(),
        targetDate: targetDate.toISOString(),
        category,
        notificationsEnabled: notifications,
        backgroundImageUri: finalImageUri,
        repeatInterval,
        notes: notes.trim() || undefined,
        alarmDuration,
      };

      if (isEditing && id) {
        await updateCountdown(id, payload);
      } else {
        await addCountdown(payload);
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
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          returnKeyType="next"
        />

        {/* ── Notes (new) ── */}
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="e.g. Flight number BA123, hotel address…"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          maxLength={200}
          multiline
          returnKeyType="done"
          blurOnSubmit
        />

        {/* ── Background Photo ── */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>Background Photo</Text>
          {backgroundImageUri && (
            <TouchableOpacity onPress={() => setBackgroundImageUri(undefined)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.pickerBtn} onPress={pickImage}>
          <Text style={styles.pickerIcon}>🖼️</Text>
          <Text style={[styles.pickerText, backgroundImageUri && { color: colors.accent }]}>
            {backgroundImageUri ? 'Photo Selected (Tap to change)' : 'Select Photo from Gallery'}
          </Text>
        </TouchableOpacity>

        {backgroundImageUri && (
          <Image
            source={{ uri: backgroundImageUri }}
            style={styles.imagePreview}
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

        {Platform.OS === 'ios' ? (
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.pickerDoneBtn}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={targetDate}
                  mode="date"
                  display="inline"
                  onChange={onDateChange}
                  themeVariant={effectiveTheme}
                />
              </View>
            </View>
          </Modal>
        ) : (
          showDatePicker && (
            <DateTimePicker
              value={targetDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              themeVariant={effectiveTheme}
            />
          )
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

        {Platform.OS === 'ios' ? (
          <Modal visible={showTimePicker} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.pickerDoneBtn}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={targetDate}
                  mode="time"
                  display="spinner"
                  onChange={onTimeChange}
                  themeVariant={effectiveTheme}
                />
              </View>
            </View>
          </Modal>
        ) : (
          showTimePicker && (
            <DateTimePicker
              value={targetDate}
              mode="time"
              display="default"
              onChange={onTimeChange}
              themeVariant={effectiveTheme}
            />
          )
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
                <Text style={[styles.categoryChipText, { color: selected ? color : colors.textMuted }]}>
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
                  { borderColor: isSelected ? colors.accent : colors.border },
                  isSelected && { backgroundColor: colors.accent + '33' },
                ]}>
                <Text style={[styles.categoryChipText, { color: isSelected ? colors.accent : colors.textMuted }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Alarm Duration ── */}
        <Text style={styles.label}>Alarm Duration</Text>
        <View style={styles.categoryGrid}>
          {([15, 30, 60, 180] as const).map(secs => {
            const isSelected = alarmDuration === secs;
            const label = secs < 60 ? `${secs}s` : `${secs / 60}m`;
            return (
              <TouchableOpacity
                key={secs}
                onPress={() => setAlarmDuration(secs)}
                style={[
                  styles.categoryChip,
                  { borderColor: isSelected ? colors.accent : colors.border },
                  isSelected && { backgroundColor: colors.accent + '33' },
                ]}>
                <Text style={[styles.categoryChipText, { color: isSelected ? colors.accent : colors.textMuted }]}>
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
            trackColor={{ false: colors.surfaceAlt, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof DarkAppColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarCancel: {
    color: colors.textMuted,
    fontSize: 16,
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.accent,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  removeText: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  pickerBtn: {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  pickerText: {
    color: colors.text,
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
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  switchSub: {
    color: colors.textMuted,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    paddingBottom: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerDoneBtn: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
