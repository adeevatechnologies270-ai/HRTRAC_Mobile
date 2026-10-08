import React, { useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';

export const colors = {
  primary: '#0C438B',
  bg: '#F7F9FC',
  text: '#243B5D',
  muted: '#8A95A8',
  border: '#E0E5EC',
};

const toISO = (d) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const formatDate = (value, withYear = true) => {
  if (!value) return '---';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
};

export const statusColors = (status) => {
  const v = String(status || 'Pending').toLowerCase();
  if (v === 'approved') return { bg: '#DDF7E8', text: '#159447' };
  if (v === 'rejected' || v === 'cancelled') return { bg: '#FFE5E5', text: '#D64545' };
  return { bg: '#FFF1DD', text: '#D7831F' };
};

export function StatusBadge({ status }) {
  const c = statusColors(status);
  return (
    <View style={[ui.badge, { backgroundColor: c.bg }]}>
      <Text style={[ui.badgeText, { color: c.text }]}>{status || 'Pending'}</Text>
    </View>
  );
}

export function ScreenHeader({ title, subtitle, onBack, right }) {
  return (
    <View style={ui.header}>
      <View style={ui.headerTop}>
        <TouchableOpacity style={ui.roundBtn} onPress={onBack}>
          <Text style={ui.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={ui.headerTitle}>{title}</Text>
        <View style={{ width: 38 }}>{right}</View>
      </View>
      {subtitle ? <Text style={ui.headerSub}>{subtitle}</Text> : null}
    </View>
  );
}

/* ---------- Select (like <Form.Select>) ---------- */
export function SelectField({ label, value, options, onChange, placeholder = 'Select' }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View>
      {label ? <Text style={ui.label}>{label}</Text> : null}
      <TouchableOpacity style={ui.input} onPress={() => setOpen(true)}>
        <Text style={{ color: current ? colors.text : '#A3ADBC', fontSize: 13 }}>
          {current ? current.label : placeholder}
        </Text>
        <Text style={{ color: colors.muted }}>⌄</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={ui.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={ui.sheet}>
            <Text style={ui.sheetTitle}>{label || placeholder}</Text>
            <FlatList
              data={[{ value: '', label: placeholder }, ...options]}
              keyExtractor={(o) => String(o.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  disabled={item.disabled}
                  style={ui.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: item.disabled ? '#B8C0CC' : item.value === value ? colors.primary : colors.text,
                      fontWeight: item.value === value ? '800' : '500',
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* ---------- Date (like <input type="date">) ---------- */
export function DateField({ label, value, onChange, minimumDate }) {
  const [show, setShow] = useState(false);
  return (
    <View>
      {label ? <Text style={ui.label}>{label}</Text> : null}
      <TouchableOpacity style={ui.input} onPress={() => setShow(true)}>
        <Text style={{ color: value ? colors.text : '#A3ADBC', fontSize: 13 }}>
          {value ? formatDate(value) : 'dd/mm/yyyy'}
        </Text>
        <Text style={{ color: colors.muted }}>▣</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          minimumDate={minimumDate ? new Date(minimumDate) : undefined}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(e, d) => {
            setShow(Platform.OS === 'ios');
            if (e.type !== 'dismissed' && d) onChange(toISO(d));
          }}
        />
      )}
    </View>
  );
}

/* ---------- File picker (like <input type="file">) ---------- */
export function FilePickerRow({ label, file, onPick, onClear }) {
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    onPick({
      uri: a.uri,
      name: a.name || `file-${Date.now()}`,
      type: a.mimeType || 'application/octet-stream',
    });
  };
  return (
    <View>
      {label ? <Text style={ui.label}>{label}</Text> : null}
      <View style={ui.input}>
        <TouchableOpacity onPress={pick} style={ui.chooseBtn}>
          <Text style={{ fontSize: 12, color: colors.text }}>Choose file</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={{ flex: 1, marginLeft: 10, fontSize: 12, color: file ? colors.text : '#A3ADBC' }}>
          {file ? file.name : 'No file chosen'}
        </Text>
        {file ? (
          <TouchableOpacity onPress={onClear}>
            <Text style={{ fontSize: 18, color: '#D64545' }}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/* ---------- Shared styles ---------- */
export const ui = themedCreate({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom: 19,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: '#fff', fontSize: 31, lineHeight: 32, marginTop: -3 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#D8E8FF', fontSize: 12, marginTop: 8, marginLeft: 47 },
  content: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  label: { color: '#53627A', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: {
    minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: '#FBFCFE',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    fontSize: 13, color: colors.text,
  },
  textArea: { height: 90, paddingTop: 10, textAlignVertical: 'top', alignItems: 'flex-start' },
  chooseBtn: { backgroundColor: '#EEF1F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 18, maxHeight: '75%',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F2F6' },
  primaryBtn: {
    height: 48, borderRadius: 12, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondaryBtn: {
    height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 10, backgroundColor: '#fff',
  },
  secondaryBtnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  empty: { backgroundColor: '#fff', borderRadius: 14, padding: 28, alignItems: 'center' },
});