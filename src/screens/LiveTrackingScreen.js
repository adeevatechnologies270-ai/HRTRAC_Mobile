import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MapPin, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getLiveLocations } from '../services/dutyTrackingApi';
import LocationMap from '../components/LocationMap';

const ADMIN_ROLES = new Set(['admin', 'super admin', 'master', 'manager']);
const getRole = user => String(user?.user_type || user?.type || user?.role || user?.userprofile?.type || 'Employee').trim().toLowerCase();

export default function LiveTrackingScreen() {
  const { user } = useAuth();
  const role = getRole(user);
  const allowed = ADMIN_ROLES.has(role);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (showLoader = false) => {
    if (!allowed) { setLoading(false); return; }
    if (showLoader) setLoading(true);
    try {
      const data = await getLiveLocations();
      setLocations(Array.isArray(data?.results) ? data.results : []);
      setError('');
    } catch (e) {
      setError(e?.message || 'Unable to load live locations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [allowed]);

  useEffect(() => {
    load(true);
    if (!allowed) return undefined;
    const timer = setInterval(() => load(false), 10000);
    return () => clearInterval(timer);
  }, [load, allowed]);

  if (!allowed) {
    return <View style={styles.center}><Text style={styles.title}>Access restricted</Text><Text style={styles.muted}>Only authorized Admin or Manager accounts can view employee locations.</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View><Text style={styles.title}>Live Employee Tracking</Text><Text style={styles.muted}>Refreshes automatically every 10 seconds</Text></View>
        <RefreshCw color="#173B7A" size={20} />
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#173B7A" /><Text style={styles.muted}>Loading locations…</Text></View> : null}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && locations.length === 0 ? <View style={styles.center}><MapPin color="#64748B" size={28} /><Text style={styles.title}>No active locations</Text><Text style={styles.muted}>Employees must be punched in and have location permission enabled.</Text></View> : null}
      <FlatList
        data={locations}
        keyExtractor={item => String(item.session_id || item.employee_id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.employee}>{item.employee_name || `Employee ${item.employee_id}`}</Text>
            <Text style={styles.coordinate}>{Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}</Text>
            {item.accuracy != null ? <Text style={styles.muted}>GPS accuracy: ±{Math.round(Number(item.accuracy))} m</Text> : null}
            <Text style={styles.muted}>Last recorded: {item.recorded_at ? new Date(item.recorded_at).toLocaleString() : 'Not available'}</Text>
            <View style={styles.map}><LocationMap latitude={Number(item.latitude)} longitude={Number(item.longitude)} height={180} /></View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', color: '#12233F', marginBottom: 5 },
  muted: { fontSize: 12, color: '#64748B', marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { backgroundColor: '#FDEDEE', color: '#B42318', padding: 12, borderRadius: 10, marginBottom: 10 },
  list: { paddingBottom: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E6ECF4' },
  employee: { fontSize: 15, fontWeight: '800', color: '#12233F' },
  coordinate: { fontSize: 12, color: '#173B7A', marginTop: 6, fontWeight: '700' },
  map: { overflow: 'hidden', borderRadius: 12, marginTop: 12 },
});