import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Award, Cake } from 'lucide-react-native';

const COLORS = {
  primary: '#0B4EA2', primarySoft: '#EAF3FF', white: '#FFFFFF', text: '#12233F',
  textSecondary: '#64748B', textLight: '#94A3B8', purple: '#7551D8', purpleSoft: '#F1EDFF',
  orange: '#E98A24', orangeSoft: '#FFF4E7', border: '#E6ECF4',
};

// Same window as the web dashboard.
const UPCOMING_WINDOW_DAYS = 7;

const getLocalDate = value => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Next birthday / anniversary date. Feb 29 falls back to the last day of Feb.
const getNextOccurrence = (value, today) => {
  const original = getLocalDate(value);
  if (!original) return null;
  const make = year => {
    const lastDay = new Date(year, original.getMonth() + 1, 0).getDate();
    return new Date(year, original.getMonth(), Math.min(original.getDate(), lastDay));
  };
  let event = make(today.getFullYear());
  if (event < today) event = make(today.getFullYear() + 1);
  return event;
};

const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const dayLabel = (date, today) => {
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return fmt(date);
};

const Avatar = ({ person, tint }) => {
  const initial = (person.first_name?.[0] || person.last_name?.[0] || 'U').toUpperCase();
  return person.profile_img ? (
    <Image source={{ uri: person.profile_img }} style={styles.avatarImg} />
  ) : (
    <View style={[styles.avatar, { backgroundColor: tint.bg }]}><Text style={[styles.avatarText, { color: tint.color }]}>{initial}</Text></View>
  );
};

const UpcomingEvents = ({ users = [], jobs = [] }) => {
  const [tab, setTab] = useState('birthday');

  const { birthdays, anniversaries, today } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + UPCOMING_WINDOW_DAYS);

    const jobMap = new Map();
    (Array.isArray(jobs) ? jobs : []).forEach(j => jobMap.set(String(j.user), j));

    const birthdays = [];
    const anniversaries = [];

    (Array.isArray(users) ? users : []).forEach(user => {
      if (user.block) return;

      if (user.date_of_birth) {
        const ev = getNextOccurrence(user.date_of_birth, today);
        if (ev && ev >= today && ev <= windowEnd) birthdays.push({ ...user, _eventDate: ev });
      }

      const job = jobMap.get(String(user.id));
      if (job?.date_of_joining) {
        const joined = getLocalDate(job.date_of_joining);
        const ev = getNextOccurrence(job.date_of_joining, today);
        if (joined && ev) {
          const years = ev.getFullYear() - joined.getFullYear();
          if (years >= 1 && ev >= today && ev <= windowEnd) anniversaries.push({ ...user, _eventDate: ev, years });
        }
      }
    });

    birthdays.sort((a, b) => a._eventDate - b._eventDate);
    anniversaries.sort((a, b) => a._eventDate - b._eventDate);
    return { birthdays, anniversaries, today };
  }, [users, jobs]);

  const list = tab === 'birthday' ? birthdays : anniversaries;
  const tint = tab === 'birthday' ? { bg: COLORS.orangeSoft, color: COLORS.orange } : { bg: COLORS.purpleSoft, color: COLORS.purple };

  const Tab = ({ id, label, Icon, count }) => {
    const active = tab === id;
    return (
      <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(id)} activeOpacity={0.8}>
        <Icon size={14} color={active ? COLORS.primary : COLORS.textSecondary} />
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
        {count > 0 && <View style={styles.count}><Text style={styles.countText}>{count}</Text></View>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Upcoming Events</Text>
          <Text style={styles.subtitle}>Next {UPCOMING_WINDOW_DAYS} days</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Tab id="birthday" label="Birthdays" Icon={Cake} count={birthdays.length} />
        <Tab id="anniversary" label="Anniversaries" Icon={Award} count={anniversaries.length} />
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          {tab === 'birthday' ? <Cake size={22} color={COLORS.textLight} /> : <Award size={22} color={COLORS.textLight} />}
          <Text style={styles.emptyText}>{tab === 'birthday' ? 'No upcoming birthdays' : 'No upcoming anniversaries'}</Text>
        </View>
      ) : (
        list.map(person => (
          <View key={`${tab}-${person.id}`} style={styles.item}>
            <Avatar person={person} tint={tint} />
            <View style={{ flex: 1, marginLeft: 11 }}>
              <Text style={styles.name} numberOfLines={1}>{[person.first_name, person.last_name].filter(Boolean).join(' ') || 'Employee'}</Text>
              <Text style={styles.sub}>
                {tab === 'birthday' ? 'Birthday' : `${person.years} Year${person.years !== 1 ? 's' : ''} Completed`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.date}>{dayLabel(person._eventDate, today)}</Text>
              {tab === 'anniversary' && <View style={styles.yearBadge}><Text style={styles.yearBadgeText}>{person.years}</Text></View>}
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 15, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  header: { marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 8.5, color: COLORS.textSecondary, marginTop: 3 },
  tabRow: { flexDirection: 'row', gap: 8, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 13, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.white },
  tabText: { fontSize: 9.5, fontWeight: '800', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  count: { minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 8.5, fontWeight: '900', color: '#fff' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: '#F8FAFD', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E8EEF6' },
  avatarText: { fontSize: 15, fontWeight: '900' },
  name: { fontSize: 10.5, fontWeight: '900', color: COLORS.text },
  sub: { fontSize: 8.5, color: COLORS.textSecondary, marginTop: 3 },
  date: { fontSize: 9, fontWeight: '800', color: COLORS.text },
  yearBadge: { marginTop: 4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  yearBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 9, color: COLORS.textLight, marginTop: 7 },
});

export default UpcomingEvents;