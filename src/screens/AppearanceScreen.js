// ============================================================
// HRTRAC · Appearance (Light / Dark / System + accent color)
// ============================================================

import React from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme/theme';
import { themedCreate } from '../theme/themedStyles';
import { ACCENTS } from '../theme/palette';
import { FadeInUp, PressScale } from '../components/Animated';
import { useTheme } from '../context/ThemeContext';

const MODES = [
  { key: 'light', title: 'Light', sub: 'Always use light theme', icon: '☼' },
  { key: 'dark', title: 'Dark', sub: 'Always use dark theme', icon: '☾' },
  { key: 'system', title: 'System', sub: 'Follow phone settings', icon: '◐' },
];

export default function AppearanceScreen({ navigation }) {
  const { mode, setMode, accent, setAccent } = useTheme();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation?.canGoBack() && navigation.goBack()}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Appearance</Text>
            <View style={{ width: 38 }} />
          </View>
          <Text style={styles.headerSubtitle}>Choose how HRTRAC looks</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Theme mode</Text>
          <FadeInUp style={styles.card}>
            {MODES.map((m, i) => {
              const active = mode === m.key;
              return (
                <PressScale key={m.key} style={[styles.row, i > 0 && styles.rowBorder]} onPress={() => setMode(m.key)}>
                  <View style={styles.rowIcon}><Text style={styles.rowIconText}>{m.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{m.title}</Text>
                    <Text style={styles.rowSub}>{m.sub}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </PressScale>
              );
            })}
          </FadeInUp>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Accent color</Text>
          <FadeInUp delay={60} style={styles.card}>
            <View style={styles.swatchRow}>
              {Object.keys(ACCENTS).map((key) => {
                const a = ACCENTS[key];
                const active = accent === key;
                return (
                  <PressScale key={key} style={styles.swatchItem} onPress={() => setAccent(key)}>
                    <View style={[styles.swatch, { backgroundColor: a.primary }, active && styles.swatchActive]}>
                      {active ? <Text style={styles.check}>✓</Text> : null}
                    </View>
                    <Text style={[styles.swatchLabel, active && styles.swatchLabelActive]}>{a.label}</Text>
                  </PressScale>
                );
              })}
            </View>
          </FadeInUp>

          <Text style={styles.note}>Your choice is saved on this device.</Text>
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = themedCreate({
  safeArea: {
  flex: 1,
  backgroundColor: theme.colors.primary,
},
  container: { flex: 1, backgroundColor: '#F7F9FC' },

  header: { backgroundColor: '#0C438B', paddingHorizontal: 17, paddingTop: 10, paddingBottom: 19, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#FFFFFF', fontSize: 31, lineHeight: 32, marginTop: -3 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: '#D8E8FF', fontSize: 11, marginTop: 8, marginLeft: 47 },

  content: { paddingHorizontal: 15, paddingTop: 16 },
  sectionTitle: { color: '#172B4D', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 15, paddingHorizontal: 13, paddingVertical: 4 },

  row: { flexDirection: 'row', alignItems: 'center', minHeight: 62 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#EEF1F5' },
  rowIcon: { width: 37, height: 37, borderRadius: 10, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rowIconText: { color: '#2760C8', fontSize: 18, fontWeight: '800' },
  rowTitle: { color: '#344660', fontSize: 12, fontWeight: '800' },
  rowSub: { color: '#8A95A8', fontSize: 9, marginTop: 3 },

  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#DCE3ED', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#0C438B' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0C438B' },

  swatchRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  swatchItem: { alignItems: 'center' },
  swatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  swatchActive: { borderColor: '#9AA6BD' },
  check: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  swatchLabel: { color: '#8A95A8', fontSize: 10, marginTop: 6, fontWeight: '600' },
  swatchLabelActive: { color: '#344660', fontWeight: '800' },

  note: { textAlign: 'center', color: '#8A95A8', fontSize: 9, marginTop: 16 },
});