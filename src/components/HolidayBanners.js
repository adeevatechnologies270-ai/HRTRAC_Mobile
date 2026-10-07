import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, CalendarDays, X } from 'lucide-react-native';
import { API_BASE_URL } from '../api/client';

const COLORS = {
  primary: '#0B4EA2', primarySoft: '#EAF3FF', white: '#FFFFFF', text: '#12233F',
  textSecondary: '#64748B', textLight: '#94A3B8', green: '#16A05D', greenSoft: '#E8F8F0',
  orange: '#E98A24', orangeSoft: '#FFF4E7', border: '#E6ECF4', background: '#F4F7FB',
};
const PALETTE = ['#0B4EA2', '#7551D8', '#16A05D', '#E98A24', '#1687B7'];

// Dashboard ScrollView has 16px horizontal padding on both sides.
const CARD_W = Dimensions.get('window').width - 32;
const GAP = 12;
const SNAP = CARD_W + GAP;

const getLocalDate = value => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

// Backend field names are not confirmed, so we try the likely ones.
const resolveImage = h => {
  const raw = h.image || h.banner || h.banner_image || h.photo || h.image_url;
  if (!raw) return null;
  return /^https?:/i.test(raw) ? raw : `${API_BASE_URL}${String(raw).startsWith('/') ? '' : '/'}${raw}`;
};

const STATUS = {
  past: { label: 'PAST', bg: 'rgba(255,255,255,.22)', color: '#FFFFFF' },
  today: { label: 'TODAY', bg: COLORS.green, color: '#FFFFFF' },
  upcoming: { label: 'UPCOMING', bg: COLORS.orange, color: '#FFFFFF' },
};

const HolidayBanners = ({ holidays = [] }) => {
  const [index, setIndex] = useState(null);
  const [allVisible, setAllVisible] = useState(false);

  const items = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (holidays || [])
      .map((h, i) => {
        const start = getLocalDate(h.date || h.holiday_date || h.start_date);
        if (!start) return null;
        const end = getLocalDate(h.end_date) || start;
        const status = end < today ? 'past' : start <= today ? 'today' : 'upcoming';
        const sameDay = start.getTime() === end.getTime();
        return {
          id: String(h.id ?? i),
          name: h.name || h.title || h.holiday_name || h.occasion || 'Holiday',
          description: h.description || h.note || '',
          image: resolveImage(h),
          start, end, status,
          dateText: sameDay ? fmt(start) : `${fmt(start)} - ${fmt(end)}`,
          color: PALETTE[i % PALETTE.length],
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);
  }, [holidays]);

  // Open on the next upcoming holiday instead of January.
  const startIndex = useMemo(() => {
    const i = items.findIndex(x => x.status !== 'past');
    return i === -1 ? Math.max(items.length - 1, 0) : i;
  }, [items]);
  const current = index ?? startIndex;

  const renderBanner = ({ item }) => {
    const s = STATUS[item.status];
    const content = (
      <>
        <View style={styles.overlay} />
        <View style={[styles.badge, { backgroundColor: s.bg }]}><Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text></View>
        <View style={styles.bannerBottom}>
          <Text style={styles.bannerTitle} numberOfLines={2}>{item.name}</Text>
          <View style={styles.dateRow}><CalendarDays size={13} color="#fff" /><Text style={styles.dateText}>{item.dateText}</Text></View>
        </View>
      </>
    );
    return item.image ? (
      <ImageBackground source={{ uri: item.image }} style={[styles.banner, { backgroundColor: item.color }]} imageStyle={styles.bannerImg}>{content}</ImageBackground>
    ) : (
      <View style={[styles.banner, { backgroundColor: item.color }]}>
        <View style={styles.circleOne} /><View style={styles.circleTwo} />
        {content}
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Holidays</Text>
          <Text style={styles.subtitle}>Company holidays and announcements</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity style={styles.viewAll} onPress={() => setAllVisible(true)}>
            <Text style={styles.viewAllText}>View all</Text><ArrowUpRight size={13} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}><CalendarDays size={22} color={COLORS.textLight} /><Text style={styles.emptyText}>No holidays announced yet</Text></View>
      ) : (
        <>
          <FlatList
            key={`${items.length}-${startIndex}`}
            data={items}
            keyExtractor={i => i.id}
            renderItem={renderBanner}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP}
            decelerationRate="fast"
            ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: SNAP, offset: SNAP * i, index: i })}
            onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / SNAP))}
          />
          <Text style={styles.counter}>{current + 1} / {items.length}</Text>
        </>
      )}

      <Modal visible={allVisible} animationType="slide" onRequestClose={() => setAllVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Holidays</Text>
            <TouchableOpacity style={styles.close} onPress={() => setAllVisible(false)}><X size={19} color={COLORS.text} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {items.map(item => {
              const s = STATUS[item.status];
              return (
                <View key={item.id} style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: item.color }]}><CalendarDays size={18} color="#fff" /></View>
                  <View style={{ flex: 1, marginLeft: 11 }}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowDate}>{item.dateText}</Text>
                  </View>
                  <View style={[styles.rowBadge, { backgroundColor: item.status === 'past' ? '#F1F5F9' : s.bg }]}>
                    <Text style={[styles.rowBadgeText, { color: item.status === 'past' ? COLORS.textSecondary : '#fff' }]}>{s.label}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  title: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 8.5, color: COLORS.textSecondary, marginTop: 3 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  viewAllText: { fontSize: 9, fontWeight: '900', color: COLORS.primary },
  banner: { width: CARD_W, height: 170, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  bannerImg: { borderRadius: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,27,55,.38)' },
  circleOne: { position: 'absolute', width: 160, height: 160, borderRadius: 80, right: -50, top: -60, backgroundColor: 'rgba(255,255,255,.12)' },
  circleTwo: { position: 'absolute', width: 100, height: 100, borderRadius: 50, left: -30, bottom: -40, backgroundColor: 'rgba(255,255,255,.08)' },
  badge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  badgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  bannerBottom: { padding: 14 },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dateText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  counter: { alignSelf: 'center', marginTop: 9, fontSize: 9, fontWeight: '800', color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 24, backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { fontSize: 9, color: COLORS.textLight, marginTop: 7 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  modalTitle: { fontSize: 19, fontWeight: '900', color: COLORS.text },
  close: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E8EEF6', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 9 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 11, fontWeight: '900', color: COLORS.text },
  rowDate: { fontSize: 8.5, color: COLORS.textSecondary, marginTop: 3 },
  rowBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  rowBadgeText: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
});

export default HolidayBanners;