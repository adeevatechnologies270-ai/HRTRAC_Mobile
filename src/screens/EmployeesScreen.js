import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { themedCreate, tc } from '../theme/themedStyles';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Mail, Phone, Search, X } from 'lucide-react-native';

import ScreenShell from '../components/ScreenShell';
import client, { endpoints } from '../api/client';

const COLORS = {
  primary: '#0B4EA2', primarySoft: '#EAF3FF', text: '#12233F', sub: '#64748B',
  light: '#94A3B8', border: '#E6ECF4', green: '#16A05D', greenSoft: '#E8F8F0',
  purple: '#7551D8', purpleSoft: '#F1EDFF', orange: '#E98A24', orangeSoft: '#FFF4E7',
};

// Inline (non-StyleSheet) colors ko current theme ke hisaab se badalta hai.
const tb = (c) => tc(c, 'bg');

const roleOf = (u) => u.user_type || u.role || u.type || 'Employee';
const nameOf = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Employee';
const roleColors = (role) => {
  const r = String(role).toLowerCase();
  if (r === 'admin') return { bg: COLORS.orangeSoft, fg: COLORS.orange };
  if (r === 'manager') return { bg: COLORS.purpleSoft, fg: COLORS.purple };
  return { bg: COLORS.greenSoft, fg: COLORS.green };
};

export default function EmployeesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const load = useCallback(async () => {
    try {
      const { data } = await client.get(endpoints.users);
      setItems(Array.isArray(data) ? data : data?.results || []);
    } catch (e) {
      console.log('Employees error:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const roles = useMemo(() => ['All', ...new Set(items.map(roleOf))], [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((u) => {
      const okRole = roleFilter === 'All' || roleOf(u) === roleFilter;
      const okSearch =
        !q || [nameOf(u), u.email, u.mobile_no, roleOf(u)].some((v) => String(v || '').toLowerCase().includes(q));
      return okRole && okSearch;
    });
  }, [items, search, roleFilter]);

  const renderItem = ({ item: u }) => {
    const name = nameOf(u);
    const role = roleOf(u);
    const rc = roleColors(role);
    return (
      <View style={s.card}>
        {u.profile_img ? (
          <Image source={{ uri: u.profile_img }} style={s.avatarImg} />
        ) : (
          <View style={s.avatar}>
            <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <Text style={s.email} numberOfLines={1}>{u.email || '---'}</Text>
          <View style={[s.rolePill, { backgroundColor: tb(rc.bg) }]}>
            <Text style={[s.roleText, { color: rc.fg }]}>{role}</Text>
          </View>
        </View>

        <View style={s.actions}>
          {u.mobile_no ? (
            <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`tel:${u.mobile_no}`)}>
              <Phone size={16} color={tc(COLORS.primary)} />
            </TouchableOpacity>
          ) : null}
          {u.email ? (
            <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`mailto:${u.email}`)}>
              <Mail size={16} color={tc(COLORS.primary)} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScreenShell title="Employee Directory" subtitle={`${items.length} people in your organization`} navigation={navigation}>
      <View style={s.top}>
        <View style={s.searchBox}>
          <Search size={17} color={tc(COLORS.light)} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email or phone"
            placeholderTextColor="#A3ADBC"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={17} color={tc(COLORS.light)} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {roles.map((r) => (
            <TouchableOpacity key={r} style={[s.chip, roleFilter === r && s.chipActive]} onPress={() => setRoleFilter(r)}>
              <Text style={[s.chipText, roleFilter === r && { color: '#fff' }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={s.count}>{filtered.length} results</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={tc(COLORS.primary)} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc(COLORS.primary)} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 28 }}>👥</Text>
              <Text style={s.emptyText}>No employees found</Text>
            </View>
          }
        />
      )}
    </ScreenShell>
  );
}

const s = themedCreate({
  top: { paddingHorizontal: 16, paddingTop: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: COLORS.border, marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 11, fontWeight: '800', color: COLORS.sub },
  count: { fontSize: 10, color: COLORS.sub, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 50, height: 50, borderRadius: 16 },
  avatarText: { fontSize: 19, fontWeight: '900', color: COLORS.primary },
  name: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  email: { fontSize: 10, color: COLORS.sub, marginTop: 3 },
  rolePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 7 },
  roleText: { fontSize: 9, fontWeight: '900' },
  actions: { gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { color: COLORS.light, fontSize: 12, marginTop: 8 },
});