import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, LogOut } from 'lucide-react-native';

import ScreenShell from '../components/ScreenShell';
import { useAuth } from '../context/AuthContext';

const C = {
  primary: '#0B4EA2', text: '#12233F', sub: '#64748B', border: '#E6ECF4',
};

const B = { bg: '#EAF2FF', fg: '#2457D6' };
const G = { bg: '#EAF7EF', fg: '#159447' };
const P = { bg: '#F2EAFF', fg: '#7048C4' };
const O = { bg: '#FFF1E5', fg: '#D87927' };

// screen: null  => "Soon". Route names AppNavigator se match hote hain.
const modules = [
  { title: 'My Profile', subtitle: 'Personal information', icon: '◉', c: B, screen: 'Profile' },
  { title: 'Expenses', subtitle: 'Manage expenses', icon: '₹', c: G, screen: 'Expenses' },
  { title: 'Employee Directory', subtitle: 'View employees', icon: '♙', c: P, screen: 'Employees' },
  { title: 'Attendance', subtitle: 'Attendance records', icon: '◎', c: B, screen: 'Attendance' },
  { title: 'Leave', subtitle: 'Leave requests', icon: '▣', c: O, screen: 'Leave' },
  { title: 'Performance', subtitle: 'Performance tracking', icon: '↗', c: P },
  { title: 'Team Summary', subtitle: 'Team overview', icon: '♧', c: G },
  { title: 'Organization Tree', subtitle: 'Organization structure', icon: '⌘', c: B },
  { title: 'Permissions', subtitle: 'Manage permissions', icon: '✓', c: O },
  { title: 'Finance Summary', subtitle: 'Financial overview', icon: '▤', c: G },
  { title: 'Payments', subtitle: 'Payment management', icon: '₹', c: P },
  { title: 'Holidays', subtitle: 'Holiday calendar', icon: '☼', c: O },
  { title: 'Regularization', subtitle: 'Attendance correction', icon: '↻', c: B },
  { title: 'Salary & Payslips', subtitle: 'Salary information', icon: '₹', c: G },
  { title: 'Messages', subtitle: 'Inbox & messages', icon: '✉', c: P },
  { title: 'Announcements', subtitle: 'Company announcements', icon: '!', c: O },
  { title: 'Departments', subtitle: 'Manage departments', icon: '▦', c: B },
  { title: 'Subscriptions', subtitle: 'Subscription details', icon: '◇', c: G },
  { title: 'Payment History', subtitle: 'Previous payments', icon: '◷', c: P },
  { title: 'Admin Management', subtitle: 'Admin & manager controls', icon: '⚙', c: O },
];

export default function FeatureListScreen({ navigation }) {
  const { user, logout, signOut } = useAuth();
  const role = user?.role || user?.user_type || 'Employee';
  const name = `${user?.first_name || 'Employee'} ${user?.last_name || ''}`.trim();

  const openModule = (m) => {
    if (m.screen) return navigation.navigate(m.screen);
    Alert.alert(m.title, `${m.title} mobile screen is being prepared.`);
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => (signOut || logout)?.() },
    ]);

  return (
    <ScreenShell title="More" subtitle="All your HRTRAC modules in one place" navigation={navigation}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.userCard} activeOpacity={0.85} onPress={() => navigation.navigate('Profile')}>
          {user?.profile_img ? (
            <Image source={{ uri: user.profile_img }} style={s.avatarImg} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(user?.first_name || 'A').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.userName}>{name}</Text>
            <Text style={s.userRole}>{role}</Text>
          </View>
          <ChevronRight size={20} color={C.sub} />
        </TouchableOpacity>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>HR Modules</Text>
          <Text style={s.count}>{modules.length}</Text>
        </View>

        <View style={s.grid}>
          {modules.map((m, i) => (
            <TouchableOpacity
              key={`${m.title}-${i}`}
              style={[s.card, !m.screen && { opacity: 0.72 }]}
              activeOpacity={0.8}
              onPress={() => openModule(m)}
            >
              <View style={[s.icon, { backgroundColor: m.c.bg }]}>
                <Text style={[s.iconText, { color: m.c.fg }]}>{m.icon}</Text>
              </View>
              <Text style={s.title} numberOfLines={1}>{m.title}</Text>
              <Text style={s.sub} numberOfLines={1}>{m.subtitle}</Text>
              {!m.screen && (
                <View style={s.soon}><Text style={s.soonText}>Soon</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.logout} onPress={confirmSignOut}>
          <LogOut size={17} color="#D64545" />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  userCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 48, height: 48, borderRadius: 16 },
  avatarText: { color: C.primary, fontSize: 19, fontWeight: '900' },
  userName: { color: C.text, fontSize: 13, fontWeight: '900' },
  userRole: { color: C.sub, fontSize: 10, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  sectionTitle: { color: C.text, fontSize: 14, fontWeight: '900' },
  count: {
    marginLeft: 8, backgroundColor: '#E8EEF8', color: C.primary, fontSize: 9, fontWeight: '900',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48.2%', backgroundColor: '#fff', borderRadius: 17, padding: 13, marginBottom: 10, minHeight: 118,
    borderWidth: 1, borderColor: C.border,
  },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20, fontWeight: '800' },
  title: { color: C.text, fontSize: 11, fontWeight: '900', marginTop: 10 },
  sub: { color: C.sub, fontSize: 9, marginTop: 3 },
  soon: { position: 'absolute', top: 10, right: 10, backgroundColor: '#F0F2F5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  soonText: { color: '#8A95A8', fontSize: 8, fontWeight: '800' },
  logout: {
    height: 48, borderRadius: 14, backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFD9D9',
    marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  logoutText: { color: '#D64545', fontSize: 13, fontWeight: '800' },
});