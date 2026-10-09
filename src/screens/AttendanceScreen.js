import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import LocationMap from '../components/LocationMap';
import GeoStampCapture from '../components/GeoStampCapture';
import ScreenShell from '../components/ScreenShell';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Info,
  LayoutGrid,
  List,
  LogIn,
  LogOut,
  MapPin,
  MoreHorizontal,
  Paperclip,
  Pencil,
  CalendarDays,
  RotateCcw,
  Send,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import client, { endpoints } from '../api/client';
import { startAttendanceLocationTracking, stopAttendanceLocationTracking } from '../services/locationTracking';

const COLORS = {
  primary: '#0B4EA2', primaryDark: '#073B7A', primarySoft: '#EAF3FF', background: '#F4F7FB', white: '#FFFFFF',
  text: '#12233F', textSecondary: '#64748B', textLight: '#94A3B8', green: '#16A05D', greenSoft: '#E8F8F0',
  orange: '#E98A24', orangeSoft: '#FFF4E7', red: '#EF4444', redSoft: '#FDEDEE', purple: '#7551D8', purpleSoft: '#F1EDFF',
  grey: '#F1F5F9', border: '#E6ECF4',
};

// Punch In is blocked outside this radius when the job has a fixed office location.
const ALLOWED_RADIUS_METERS = 50;

const STATUS_META = {
  present: { label: 'Present', color: COLORS.green, bg: COLORS.greenSoft },
  working: { label: 'Working', color: COLORS.primary, bg: COLORS.primarySoft },
  incomplete: { label: 'Incomplete', color: COLORS.red, bg: COLORS.redSoft },
  leave: { label: 'On Leave', color: COLORS.orange, bg: COLORS.orangeSoft },
  weekend: { label: 'Weekend', color: COLORS.textSecondary, bg: COLORS.grey },
  nopunch: { label: 'No Punch', color: COLORS.textSecondary, bg: COLORS.grey },
  future: { label: '', color: COLORS.textLight, bg: 'transparent' },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---- Basic helpers ---------------------------------------------------------
const getCheckInValue = a => a?.punch_time || a?.check_in || a?.punch_in || a?.in_time;
const getCheckOutValue = a => a?.punch_out_time || a?.check_out || a?.punch_out || a?.out_time;
const formatTime = value => { if (!value) return '--:--'; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

const parseLatLng = value => {
  if (!value) return null;
  const [latitude, longitude] = String(value).split(',').map(Number);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude };
};

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const pad = n => String(n).padStart(2, '0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const getLocalDate = value => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const fmtDate = d => (d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// ---- Multi-session attendance helpers (a day can have several in/out pairs) -
const isToday = value => {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
};

const getTodayRecords = attendance =>
  attendance
    .filter(item => isToday(getCheckInValue(item) || item?.date || item?.attendance_date || item?.punch_date || item?.created_at))
    .sort((a, b) => new Date(getCheckInValue(a) || 0) - new Date(getCheckInValue(b) || 0));

const getActiveRecord = todayRecords => [...todayRecords].reverse().find(r => getCheckInValue(r) && !getCheckOutValue(r));

const getTotalWorkedMs = records =>
  records.reduce((sum, r) => {
    const inV = getCheckInValue(r);
    const outV = getCheckOutValue(r);
    if (!inV || !outV) return sum;
    const start = new Date(inV).getTime();
    const end = new Date(outV).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum;
    return sum + (end - start);
  }, 0);

const formatHoursMinutes = ms => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

const formatTimer = ms => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = pad(Math.floor(totalSeconds / 3600));
  const m = pad(Math.floor((totalSeconds % 3600) / 60));
  const s = pad(totalSeconds % 60);
  return `${h}:${m}:${s}`;
};

// ---- Small presentational pieces ------------------------------------------
const StatCard = ({ icon: Icon, label, value, caption, color, bg }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: bg }]}><Icon size={17} color={color} /></View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statCaption}>{caption}</Text>
  </View>
);

const StatusPill = ({ status }) => {
  const m = STATUS_META[status];
  if (!m.label) return null;
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: m.color }]} />
      <Text style={[styles.pillText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
};

const FilterChips = ({ options, value, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
    {options.map(o => (
      <TouchableOpacity key={o.id} style={[styles.filterChip, value === o.id && styles.filterChipActive]} onPress={() => onChange(o.id)}>
        <Text style={[styles.filterChipText, value === o.id && styles.filterChipTextActive]}>{o.label}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

const RangeRow = ({ start, end, onPickStart, onPickEnd }) => (
  <View style={styles.customRangeRow}>
    <TouchableOpacity style={styles.dateBtn} onPress={onPickStart}><Text style={styles.dateBtnText}>{start ? fmtDate(start) : 'Start date'}</Text></TouchableOpacity>
    <Text style={styles.dateRangeSep}>to</Text>
    <TouchableOpacity style={styles.dateBtn} onPress={onPickEnd}><Text style={styles.dateBtnText}>{end ? fmtDate(end) : 'End date'}</Text></TouchableOpacity>
  </View>
);

const AVG_OPTIONS = [{ id: 'week', label: 'Last 7 Days' }, { id: 'month', label: 'Last Month' }, { id: 'custom', label: 'Custom' }];
const LOG_OPTIONS = [{ id: 'current', label: 'This Month' }, { id: 'last', label: 'Last Month' }, { id: 'custom', label: 'Custom' }];
const VIEW_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'log', label: 'Log', icon: List },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const AttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [orgDetails, setOrgDetails] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Punch modal
  const [modalVisible, setModalVisible] = useState(false);
  const [punchType, setPunchType] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingRange, setCheckingRange] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const geoStampRef = useRef(null);

  // Views + filters
  const [activeView, setActiveView] = useState('overview');
  const [avgRange, setAvgRange] = useState({ type: 'week', start: null, end: null });
  const [logFilter, setLogFilter] = useState('current');
  const [logRange, setLogRange] = useState({ start: null, end: null });
  const [picker, setPicker] = useState(null); // 'avgStart' | 'avgEnd' | 'logStart' | 'logEnd'
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });

  // Detail / menu / map / adjustment
  const [selectedDay, setSelectedDay] = useState(null); // { date, info }
  const [fullScreenPhoto, setFullScreenPhoto] = useState(null);
  const [expandedTrackIndex, setExpandedTrackIndex] = useState(null);
  const [menuDay, setMenuDay] = useState(null); // { date, info }
  const [mapPoint, setMapPoint] = useState(null); // { title, latitude, longitude }
  const [adjustVisible, setAdjustVisible] = useState(false);
  const [adj, setAdj] = useState({ from: null, to: null, note: '', file: null });
  const [adjPicker, setAdjPicker] = useState(null); // 'from' | 'to'
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // ---- Data ----------------------------------------------------------------
  const loadAttendance = useCallback(async (silent = false) => {
    if (!user?.id) { setLoading(false); return; }
    try {
      if (!silent) setLoading(true);
      const { data } = await client.get(endpoints.punchesByUser(user.id));
      setAttendance(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      console.log('Attendance API error:', error);
      Alert.alert('Attendance', 'Unable to load attendance records.');
    } finally { setLoading(false); }
  }, [user?.id]);

  const loadLeaves = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await client.get(endpoints.regularizationByUser(user.id));
      const list = Array.isArray(data) ? data : data?.results || [];
      setLeaves(list.filter(i => i.request_type === 'Leave' && i.status === 'Approved'));
    } catch (error) { console.log('Leave fetch error:', error); }
  }, [user?.id]);

  // Needed for approver details when sending an adjustment request.
  const loadOrg = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await client.get(endpoints.orgByUser(user.id));
      setOrgDetails(Array.isArray(data) ? data[0] || null : data || null);
    } catch (error) { console.log('Organization details error:', error); }
  }, [user?.id]);

  // Needed for the office-radius check on Punch In.
  const loadJobDetail = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await client.get(`${endpoints.jobDetails}${user.id}/`);
      setJobDetail(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      console.log('Job detail API error:', error);
      setJobDetail(null);
    }
  }, [user?.id]);

  useEffect(() => { loadAttendance(); loadLeaves(); loadOrg(); loadJobDetail(); }, [loadAttendance, loadLeaves, loadOrg, loadJobDetail]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAttendance(true), loadLeaves(), loadOrg(), loadJobDetail()]);
    setRefreshing(false);
  };

  // ---- Today (punch card) ----------------------------------------------------
  const todayRecords = useMemo(() => getTodayRecords(attendance), [attendance]);
  const activeRecord = useMemo(() => getActiveRecord(todayRecords), [todayRecords]);
  const totalWorkedMs = useMemo(() => getTotalWorkedMs(todayRecords), [todayRecords]);
  const hasActivePunch = !!activeRecord;
  const displayRecord = activeRecord || todayRecords[todayRecords.length - 1];

  useEffect(() => {
    if (!hasActivePunch) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasActivePunch, activeRecord?.id]);

  const liveElapsedMs = hasActivePunch ? nowTick - new Date(getCheckInValue(activeRecord)).getTime() : 0;

  // ---- Per-day grouping ----------------------------------------------------
  const dayMap = useMemo(() => {
    const map = {};
    attendance.forEach(r => {
      const inV = getCheckInValue(r);
      if (!inV) return;
      const d = new Date(inV);
      if (Number.isNaN(d.getTime())) return;
      const key = dayKey(d);
      if (!map[key]) map[key] = { key, date: startOfDay(d), sessions: [] };
      map[key].sessions.push(r);
    });
    Object.values(map).forEach(info => {
      info.sessions.sort((a, b) => new Date(getCheckInValue(a)) - new Date(getCheckInValue(b)));
      const last = info.sessions[info.sessions.length - 1];
      info.firstIn = getCheckInValue(info.sessions[0]);
      info.lastOut = getCheckOutValue(last);
      info.workedMs = getTotalWorkedMs(info.sessions);
      info.hasActive = info.sessions.some(s => !getCheckOutValue(s));
    });
    return map;
  }, [attendance]);

  const isOnLeave = useCallback(date => {
    if (date.getDay() === 0) return false;
    return leaves.some(l => {
      const from = getLocalDate(l.date_from);
      const to = getLocalDate(l.date_to || l.date_from);
      return from && to && date >= from && endOfDay(to) >= date;
    });
  }, [leaves]);

  const getDayStatus = useCallback((date, info) => {
    if (info) return !info.hasActive ? 'present' : dayKey(date) === dayKey(new Date()) ? 'working' : 'incomplete';
    if (date > endOfDay(new Date())) return 'future';
    if (date.getDay() === 0) return 'weekend';
    if (isOnLeave(date)) return 'leave';
    return 'nopunch';
  }, [isOnLeave]);

  // ---- Overview statistics (current month, same rules as web) -----------------
  const stats = useMemo(() => {
    const now = new Date();
    let present = 0, incomplete = 0, leaveCount = 0, noPunch = 0, weekdays = 0;
    for (let d = 1; d <= now.getDate(); d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const isSunday = date.getDay() === 0;
      if (!isSunday) weekdays++;
      const info = dayMap[dayKey(date)];
      const status = getDayStatus(date, info);
      if (status === 'present' || status === 'working') present++;
      else if (status === 'incomplete') incomplete++;
      else if (status === 'leave') leaveCount++;
      else if (status === 'nopunch') noPunch++;
    }
    const percentage = weekdays > 0 ? Math.round((present / weekdays) * 100) : 0;
    return { present, incomplete, leaveCount, noPunch, weekdays, percentage };
  }, [dayMap, getDayStatus]);

  const avgMs = useMemo(() => {
    const now = new Date();
    let start, end;
    if (avgRange.type === 'week') { end = now; start = new Date(now); start.setDate(now.getDate() - 6); }
    else if (avgRange.type === 'month') { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); }
    else { start = avgRange.start; end = avgRange.end; }
    if (!start || !end) return 0;
    const s = startOfDay(start), e = endOfDay(end);
    let total = 0, days = 0;
    Object.values(dayMap).forEach(info => {
      if (info.date >= s && info.date <= e && info.workedMs > 0) { total += info.workedMs; days++; }
    });
    return days ? total / days : 0;
  }, [dayMap, avgRange]);

  const trend = useMemo(() => {
    const rows = Object.values(dayMap).filter(i => i.workedMs > 0).sort((a, b) => a.date - b.date).slice(-10);
    const max = Math.max(10, ...rows.map(r => r.workedMs / 3600000));
    return { rows, max };
  }, [dayMap]);

  const lastActivity = useMemo(() => {
    const all = Object.values(dayMap).sort((a, b) => b.date - a.date)[0];
    if (!all) return '—';
    const value = all.lastOut || all.firstIn;
    return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }, [dayMap]);

  // ---- Log rows -------------------------------------------------------------
  const logDates = useMemo(() => {
    const now = new Date();
    const today0 = startOfDay(now);
    let start, end;
    if (logFilter === 'current') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = today0; }
    else if (logFilter === 'last') { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); }
    else {
      if (!logRange.start || !logRange.end) return [];
      start = startOfDay(logRange.start); end = startOfDay(logRange.end);
    }
    const out = [];
    for (let c = new Date(end); c >= start && out.length < 400; c.setDate(c.getDate() - 1)) out.push(new Date(c));
    return out;
  }, [logFilter, logRange]);

  // ---- Punch flow ------------------------------------------------------------
  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is required.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const text = `${position.coords.latitude},${position.coords.longitude}`;
      setLocation({ text, latitude: position.coords.latitude, longitude: position.coords.longitude });
      return text;
    } catch (error) {
      Alert.alert('Location Error', error?.message || 'Unable to detect your location.');
      return null;
    } finally { setLocationLoading(false); }
  };

  // When the job is set to a fixed office location (tracking === false),
  // Punch In is blocked outside a 50m radius. Fails open if the check itself errors.
  const checkOfficeRange = async () => {
    if (!jobDetail || jobDetail.tracking !== false) return true;
    const office = parseLatLng(jobDetail.office_location);
    if (!office) return true;

    setCheckingRange(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Location Error', 'Location permission is required to mark attendance.');
        return false;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const dist = getDistanceInMeters(pos.coords.latitude, pos.coords.longitude, office.latitude, office.longitude);
      if (dist > ALLOWED_RADIUS_METERS) {
        Alert.alert('Out of Range', `You are ${Math.round(dist)}m away. Please move within ${ALLOWED_RADIUS_METERS}m of the office.`);
        return false;
      }
      return true;
    } catch (e) {
      console.log('Office range check error:', e);
      return true;
    } finally {
      setCheckingRange(false);
    }
  };

  const capturePhoto = async () => {
    try {
      setCameraLoading(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') { Alert.alert('Camera Permission', 'Camera permission is required.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
      if (result.canceled) return;
      const rawUri = result.assets?.[0]?.uri;
      if (!rawUri) return;

      const locationText = await getLocation();
      if (!locationText) { setPhoto(rawUri); return; }
      const [latitude, longitude] = locationText.split(',').map(Number);

      let addressLines = ['Location unavailable'];
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = results?.[0];
        if (place) {
          const line1 = [place.city || place.subregion, place.region, place.country].filter(Boolean).join(', ');
          const line2 = [place.name, place.street, place.district, place.postalCode].filter(Boolean).join(', ');
          addressLines = [line1 || 'Unknown location', line2].filter(Boolean);
        }
      } catch (e) { /* keep fallback address */ }

      const stampedUri = await geoStampRef.current?.stamp({ photoUri: rawUri, latitude, longitude, addressLines, label: 'Punch In' });
      setPhoto(stampedUri || rawUri);
    } catch (error) { Alert.alert('Camera Error', error?.message || 'Unable to capture photo.'); }
    finally { setCameraLoading(false); }
  };

  const openPunch = async type => {
    if (submitting || cameraLoading || checkingRange) return;
    if (type === 'in') {
      const inRange = await checkOfficeRange();
      if (!inRange) return;
    }
    setPunchType(type); setPhoto(null); setLocation(null); setModalVisible(true);
    if (type === 'in') setTimeout(() => capturePhoto(), 300);
    else setTimeout(() => getLocation(), 300);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalVisible(false); setPunchType(null); setPhoto(null); setLocation(null);
  };

  const submit = async () => {
    if (punchType === 'in' && !photo) return Alert.alert('Photo Required', 'Please capture your photo before submitting.');
    if (!location) return Alert.alert('Location Required', 'Please wait until your location is detected.');
    try {
      setSubmitting(true);
      if (punchType === 'in') {
        const body = new FormData();
        body.append('image', { uri: photo, name: `punch-${Date.now()}.jpg`, type: 'image/jpeg' });
        body.append('location', location.text);
        await client.post(endpoints.punchIn, body, { headers: { 'Content-Type': 'multipart/form-data' } });
        Alert.alert('Attendance Marked', 'Your punch-in has been recorded successfully.');
        startAttendanceLocationTracking().catch(err => console.log('Failed to start location tracking:', err));
      } else {
        await client.put(endpoints.punchOut, { punch_out_location: location.text });
        Alert.alert('Punch-out Recorded', 'Your punch-out has been recorded successfully.');
        stopAttendanceLocationTracking().catch(err => console.log('Failed to stop location tracking:', err));
      }
      setModalVisible(false); setPunchType(null); setPhoto(null); setLocation(null);
      await loadAttendance(true);
    } catch (error) {
      Alert.alert(punchType === 'in' ? 'Punch-in failed' : 'Punch-out failed', error?.response?.data?.error || error?.message || 'Something went wrong.');
    } finally { setSubmitting(false); }
  };

  const canSubmit = punchType === 'in' ? (!!photo && !!location) : !!location;

  // ---- Date picker (filters) ---------------------------------------------------
  const onPickDate = (event, date) => {
    const target = picker;
    setPicker(null);
    if (event.type === 'dismissed' || !date || !target) return;
    if (target === 'avgStart') setAvgRange(r => ({ ...r, type: 'custom', start: date }));
    if (target === 'avgEnd') setAvgRange(r => ({ ...r, type: 'custom', end: date }));
    if (target === 'logStart') { setLogRange(r => ({ ...r, start: date })); setLogFilter('custom'); }
    if (target === 'logEnd') { setLogRange(r => ({ ...r, end: date })); setLogFilter('custom'); }
  };

  const pickerValue = () => {
    const map = { avgStart: avgRange.start, avgEnd: avgRange.end, logStart: logRange.start, logEnd: logRange.end };
    return map[picker] || new Date();
  };

  const onAvgFilter = id => { setAvgRange(r => ({ ...r, type: id })); if (id === 'custom' && !avgRange.start) setPicker('avgStart'); };
  const onLogFilter = id => { setLogFilter(id); if (id === 'custom' && !logRange.start) setPicker('logStart'); };

  // ---- Detail / map / adjust ----------------------------------------------------
  const openDetail = (date, info) => { if (!info) return; setSelectedDay({ date, info }); setExpandedTrackIndex(null); };
  const closeDetail = () => { setSelectedDay(null); setExpandedTrackIndex(null); };

  const openMap = (title, value) => {
    const coords = parseLatLng(value);
    if (coords) setMapPoint({ title, ...coords });
  };

  const openAdjust = date => {
    setMenuDay(null);
    const d = startOfDay(date);
    setAdj({ from: d, to: d, note: '', file: null });
    setAdjPicker(null);
    setAdjustVisible(true);
  };

  const closeAdjust = () => { if (!adjSubmitting) { setAdjustVisible(false); setAdjPicker(null); } };

  const pickAttachment = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permission needed', 'Please allow gallery access to attach a file.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setAdj(a => ({ ...a, file: { uri: asset.uri, name: asset.fileName || `attachment-${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg' } }));
    } catch (error) { Alert.alert('Attachment', error?.message || 'Unable to pick file.'); }
  };

  const submitAdjust = async () => {
    if (!orgDetails) return Alert.alert('Please wait', 'Organization details are still loading. Try again in a moment.');
    if (!adj.from || !adj.to) return Alert.alert('Dates required', 'Please select from and to dates.');
    if (adj.to < adj.from) return Alert.alert('Invalid dates', 'To date cannot be before from date.');
    if (!adj.note.trim()) return Alert.alert('Reason required', 'Please explain why attendance needs to be adjusted.');
    try {
      setAdjSubmitting(true);
      const body = new FormData();
      body.append('request_type', 'Att-Adjustment');
      body.append('date_from', dayKey(adj.from));
      body.append('date_to', dayKey(adj.to));
      body.append('note', adj.note.trim());
      body.append('user', String(user.id));
      if (orgDetails.manager_to_manager != null) body.append('next_approver', String(orgDetails.manager_to_manager));
      if (orgDetails.reports_to != null) body.append('last_action_by', String(orgDetails.reports_to));
      if (adj.file) body.append('attachment', adj.file);
      await client.post(endpoints.regularization, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAdjustVisible(false);
      Alert.alert('Request submitted', 'Your attendance adjustment request has been sent for approval.');
    } catch (error) {
      console.log('Adjust submit error:', error?.response?.data || error);
      Alert.alert('Unable to submit', error?.response?.data?.error || error?.message || 'Something went wrong.');
    } finally { setAdjSubmitting(false); }
  };

  // Modals cannot stack reliably on iOS, so close one before opening the next.
  const adjustFromDetail = () => {
    const date = selectedDay?.date;
    closeDetail();
    if (date) setTimeout(() => openAdjust(date), 350);
  };
  const detailFromMenu = () => {
    const d = menuDay;
    setMenuDay(null);
    if (d?.info) setTimeout(() => openDetail(d.date, d.info), 350);
  };
  const adjustFromMenu = () => {
    const d = menuDay;
    setMenuDay(null);
    if (d) setTimeout(() => openAdjust(d.date), 350);
  };

  // ---- Calendar grid -----------------------------------------------------------
  const calendarCells = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calMonth]);

  const shiftMonth = delta => setCalMonth(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const isCurrentMonth = calMonth.getFullYear() === new Date().getFullYear() && calMonth.getMonth() === new Date().getMonth();

  // ---- Render ------------------------------------------------------------------
  if (loading) {
    return (
      <ScreenShell title="Attendance" subtitle="Your attendance records" navigation={navigation}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading attendance...</Text>
        </View>
      </ScreenShell>
    );
  }

  const todayStatusLabel = hasActivePunch ? 'Working' : todayRecords.length > 0 ? 'Completed' : 'Not Checked In';
  const todayStatusGood = hasActivePunch || todayRecords.length > 0;
  const punchInDisabled = hasActivePunch || checkingRange || submitting;

  return (
    <ScreenShell title="Attendance" subtitle="Your attendance records" navigation={navigation}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />} showsVerticalScrollIndicator={false}>
        {/* Today / punch card */}
        <View style={styles.todayCard}>
          <View style={styles.cardHeader}>
            <View><Text style={styles.cardTitle}>Today's Attendance</Text><Text style={styles.cardSubtitle}>Punch in with photo, punch out with location</Text></View>
            <View style={[styles.statusBadge, { backgroundColor: todayStatusGood ? COLORS.greenSoft : COLORS.orangeSoft }]}><Text style={[styles.statusText, { color: todayStatusGood ? COLORS.green : COLORS.orange }]}>{todayStatusLabel}</Text></View>
          </View>

          {hasActivePunch ? (
            <View style={styles.timeRow}>
              <View style={styles.timeBox}><LogIn size={18} color={COLORS.primary} /><Text style={styles.timeLabel}>Since</Text><Text style={styles.timeValue}>{formatTime(getCheckInValue(activeRecord))}</Text></View>
              <View style={styles.divider} />
              <View style={styles.timeBox}><Timer size={18} color={COLORS.green} /><Text style={styles.timeLabel}>Elapsed</Text><Text style={[styles.timeValue, { color: COLORS.green }]}>{formatTimer(liveElapsedMs)}</Text></View>
            </View>
          ) : todayRecords.length > 0 ? (
            <View style={styles.timeRow}>
              <View style={styles.timeBox}><LogOut size={18} color={COLORS.green} /><Text style={styles.timeLabel}>Last Out</Text><Text style={styles.timeValue}>{formatTime(getCheckOutValue(displayRecord))}</Text></View>
              <View style={styles.divider} />
              <View style={styles.timeBox}><Timer size={18} color={COLORS.primary} /><Text style={styles.timeLabel}>Worked</Text><Text style={styles.timeValue}>{formatHoursMinutes(totalWorkedMs)}</Text></View>
            </View>
          ) : (
            <View style={styles.timeRow}>
              <View style={styles.timeBox}><LogIn size={18} color={COLORS.primary} /><Text style={styles.timeLabel}>Punch In</Text><Text style={styles.timeValue}>--:--</Text></View>
              <View style={styles.divider} />
              <View style={styles.timeBox}><LogOut size={18} color={COLORS.green} /><Text style={styles.timeLabel}>Punch Out</Text><Text style={styles.timeValue}>--:--</Text></View>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity disabled={punchInDisabled} style={[styles.button, styles.inButton, punchInDisabled && styles.disabled]} onPress={() => openPunch('in')}>
              {checkingRange ? <ActivityIndicator size="small" color={COLORS.primary} /> : <LogIn size={18} color={hasActivePunch ? COLORS.textLight : COLORS.primary} />}
              <Text style={[styles.buttonText, { color: hasActivePunch ? COLORS.textLight : COLORS.primary }]}>{checkingRange ? 'Checking...' : 'Punch In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={!hasActivePunch || submitting} style={[styles.button, styles.outButton, !hasActivePunch && styles.disabled]} onPress={() => openPunch('out')}><LogOut size={18} color={!hasActivePunch ? COLORS.textLight : COLORS.white} /><Text style={[styles.buttonText, { color: !hasActivePunch ? COLORS.textLight : COLORS.white }]}>Punch Out</Text></TouchableOpacity>
          </View>
        </View>

        {/* View tabs */}
        <View style={styles.tabBar}>
          {VIEW_TABS.map(t => {
            const Icon = t.icon;
            const active = activeView === t.id;
            return (
              <TouchableOpacity key={t.id} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setActiveView(t.id)} activeOpacity={0.85}>
                <Icon size={15} color={active ? COLORS.white : COLORS.textSecondary} />
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================= OVERVIEW ================= */}
        {activeView === 'overview' && (
          <>
            <View style={styles.avgFilterWrap}>
              <Text style={styles.avgFilterLabel}>Average hours range</Text>
              <FilterChips options={AVG_OPTIONS} value={avgRange.type} onChange={onAvgFilter} />
              {avgRange.type === 'custom' && <RangeRow start={avgRange.start} end={avgRange.end} onPickStart={() => setPicker('avgStart')} onPickEnd={() => setPicker('avgEnd')} />}
            </View>

            <View style={styles.statGrid}>
              <StatCard icon={CheckCircle2} label="Present" value={String(stats.present)} caption="Days attended" color={COLORS.green} bg={COLORS.greenSoft} />
              <StatCard icon={CalendarDays} label="Leave" value={String(stats.leaveCount)} caption="Approved leave days" color={COLORS.orange} bg={COLORS.orangeSoft} />
              <StatCard icon={Info} label="Incomplete" value={String(stats.incomplete)} caption="Punch-out missing" color={COLORS.red} bg={COLORS.redSoft} />
              <StatCard icon={Clock3} label="Avg. Hours" value={formatHoursMinutes(avgMs)} caption="Based on selected range" color={COLORS.primary} bg={COLORS.primarySoft} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTop}>
                <View><Text style={styles.sectionTitle}>Attendance Performance</Text><Text style={styles.sectionSub}>Current month overview</Text></View>
                <View style={styles.percentBadge}><Text style={styles.percentText}>{stats.percentage}%</Text></View>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(stats.percentage, 100)}%` }]} /></View>
              <View style={styles.legendRow}>
                <Text style={[styles.legendItem, { color: COLORS.green }]}>{stats.present} Present</Text>
                <Text style={[styles.legendItem, { color: COLORS.orange }]}>{stats.leaveCount} Leave</Text>
                <Text style={[styles.legendItem, { color: COLORS.red }]}>{stats.incomplete} Incomplete</Text>
                <Text style={[styles.legendItem, { color: COLORS.textSecondary }]}>{stats.noPunch} No Punch</Text>
              </View>
              <View style={styles.messageBox}>
                <Info size={14} color={COLORS.primary} />
                <Text style={styles.messageText}>
                  {stats.percentage >= 90 ? 'Great attendance! Keep it up.' : stats.percentage >= 75 ? 'Good attendance. Try to maintain consistency.' : 'Your attendance can be improved.'}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTop}>
                <View><Text style={styles.sectionTitle}>Working Hours Trend</Text><Text style={styles.sectionSub}>Last {trend.rows.length || 10} working days</Text></View>
                <TrendingUp size={18} color={COLORS.primary} />
              </View>
              {trend.rows.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>No completed sessions yet.</Text></View>
              ) : (
                <View style={styles.chart}>
                  {trend.rows.map(r => {
                    const hrs = r.workedMs / 3600000;
                    return (
                      <View key={r.key} style={styles.barCol}>
                        <Text style={styles.barValue}>{hrs.toFixed(1)}</Text>
                        <View style={styles.barTrack}><View style={[styles.barFill, { height: `${Math.max((hrs / trend.max) * 100, 4)}%` }]} /></View>
                        <Text style={styles.barLabel}>{r.date.getDate()}/{r.date.getMonth() + 1}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTop}>
                <View><Text style={styles.sectionTitle}>Office Timing</Text><Text style={styles.sectionSub}>Today's schedule</Text></View>
                <Building2 size={18} color={COLORS.primary} />
              </View>
              <View style={styles.officeRow}>
                <View><Text style={styles.officeLabel}>Working Hours</Text><Text style={styles.officeValue}>09:30 AM</Text></View>
                <Text style={styles.officeArrow}>→</Text>
                <View style={{ alignItems: 'flex-end' }}><Text style={styles.officeLabel}>End Time</Text><Text style={styles.officeValue}>06:30 PM</Text></View>
              </View>
              <View style={styles.lunchBox}>
                <Coffee size={18} color="#8A6100" />
                <View style={{ marginLeft: 10 }}><Text style={styles.lunchTitle}>Lunch Break</Text><Text style={styles.lunchTime}>01:30 PM – 02:10 PM</Text></View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCard}><Text style={styles.infoLabel}>Last Activity</Text><Text style={styles.infoValue}>{lastActivity}</Text></View>
              <View style={styles.infoCard}><Text style={styles.infoLabel}>Working Days</Text><Text style={styles.infoValue}>{stats.weekdays} days</Text></View>
            </View>
          </>
        )}

        {/* ================= LOG ================= */}
        {activeView === 'log' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendance Log</Text>
            <Text style={[styles.sectionSub, { marginBottom: 12 }]}>Tap a day for photo and location trail. Use ⋯ to request an adjustment.</Text>
            <FilterChips options={LOG_OPTIONS} value={logFilter} onChange={onLogFilter} />
            {logFilter === 'custom' && <RangeRow start={logRange.start} end={logRange.end} onPickStart={() => setPicker('logStart')} onPickEnd={() => setPicker('logEnd')} />}

            {logDates.length === 0 ? (
              <View style={styles.empty}><Clock3 size={25} color={COLORS.textLight} /><Text style={styles.emptyText}>{logFilter === 'custom' ? 'Select a start and end date to see records.' : 'No attendance records found.'}</Text></View>
            ) : logDates.map(date => {
              const info = dayMap[dayKey(date)];
              const status = getDayStatus(date, info);
              const canAdjust = status !== 'weekend' && status !== 'leave' && status !== 'future';
              const firstSession = info?.sessions[0];
              const lastSession = info?.sessions[info.sessions.length - 1];
              return (
                <TouchableOpacity key={dayKey(date)} activeOpacity={info ? 0.7 : 1} style={styles.logRow} onPress={() => openDetail(date, info)}>
                  <View style={styles.logDate}>
                    <Text style={styles.logDay}>{pad(date.getDate())}</Text>
                    <Text style={styles.logMonth}>{date.toLocaleDateString('en-IN', { month: 'short' })} {String(date.getFullYear()).slice(2)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={styles.logTop}>
                      <StatusPill status={status} />
                      {info && info.sessions.length > 1 && <Text style={styles.sessionCount}>{info.sessions.length} sessions</Text>}
                    </View>
                    <Text style={styles.logTime}>In: {info ? formatTime(info.firstIn) : '--:--'}  •  Out: {info?.lastOut ? formatTime(info.lastOut) : '--:--'}{info?.workedMs ? `  •  ${formatHoursMinutes(info.workedMs)}` : ''}</Text>
                    {(firstSession?.location || lastSession?.punch_out_location) && (
                      <View style={styles.locRow}>
                        {firstSession?.location && parseLatLng(firstSession.location) && (
                          <TouchableOpacity style={[styles.locBtn, { backgroundColor: COLORS.primarySoft }]} onPress={() => openMap('Check-in location', firstSession.location)}><MapPin size={11} color={COLORS.primary} /><Text style={[styles.locBtnText, { color: COLORS.primary }]}>In</Text></TouchableOpacity>
                        )}
                        {lastSession?.punch_out_location && parseLatLng(lastSession.punch_out_location) && (
                          <TouchableOpacity style={[styles.locBtn, { backgroundColor: COLORS.orangeSoft }]} onPress={() => openMap('Check-out location', lastSession.punch_out_location)}><MapPin size={11} color={COLORS.orange} /><Text style={[styles.locBtnText, { color: COLORS.orange }]}>Out</Text></TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                  {canAdjust && (
                    <TouchableOpacity style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setMenuDay({ date, info })}>
                      <MoreHorizontal size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ================= CALENDAR ================= */}
        {activeView === 'calendar' && (
          <View style={styles.section}>
            <View style={styles.calHeader}>
              <TouchableOpacity style={styles.calNav} onPress={() => shiftMonth(-1)}><ChevronLeft size={18} color={COLORS.text} /></TouchableOpacity>
              <Text style={styles.calTitle}>{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</Text>
              <TouchableOpacity style={[styles.calNav, isCurrentMonth && { opacity: 0.35 }]} disabled={isCurrentMonth} onPress={() => shiftMonth(1)}><ChevronRight size={18} color={COLORS.text} /></TouchableOpacity>
            </View>
            <View style={styles.calWeek}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.calWeekText}>{d}</Text>)}</View>
            <View style={styles.calGrid}>
              {calendarCells.map((date, i) => {
                if (!date) return <View key={`e${i}`} style={styles.calCellWrap} />;
                const info = dayMap[dayKey(date)];
                const status = getDayStatus(date, info);
                const m = STATUS_META[status];
                const isTodayCell = dayKey(date) === dayKey(new Date());
                return (
                  <View key={dayKey(date)} style={styles.calCellWrap}>
                    <TouchableOpacity activeOpacity={info ? 0.7 : 1} onPress={() => openDetail(date, info)} style={[styles.calCell, { backgroundColor: status === 'future' ? 'transparent' : m.bg }, isTodayCell && styles.calToday]}>
                      <Text style={[styles.calDayText, { color: status === 'future' ? COLORS.textLight : COLORS.text }]}>{date.getDate()}</Text>
                      {info ? <Text style={[styles.calSmall, { color: m.color }]}>{formatTime(info.firstIn)}</Text>
                        : status === 'leave' ? <Text style={[styles.calSmall, { color: m.color }]}>Leave</Text>
                        : status === 'nopunch' ? <Text style={[styles.calSmall, { color: m.color }]}>—</Text> : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <View style={styles.calLegend}>
              {['present', 'incomplete', 'leave', 'nopunch'].map(k => (
                <View key={k} style={styles.calLegendItem}><View style={[styles.calLegendDot, { backgroundColor: STATUS_META[k].color }]} /><Text style={styles.calLegendText}>{STATUS_META[k].label}</Text></View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Filter date picker (Android dialog / iOS inline) */}
      {picker && (
        <DateTimePicker value={pickerValue()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} maximumDate={new Date()} onChange={onPickDate} />
      )}

      {/* ===== Punch In / Punch Out modal ===== */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>{punchType === 'in' ? 'Punch In' : 'Punch Out'}</Text><Text style={styles.modalSubtitle}>{punchType === 'in' ? 'Say cheese and verify your location' : 'Verify your current location'}</Text></View>
              <TouchableOpacity disabled={submitting} onPress={closeModal} style={styles.close}><X size={19} color={COLORS.text} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {punchType === 'in' && (
                <>
                  <View style={styles.photoBox}>{photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <View style={styles.placeholder}><View style={styles.cameraCircle}><Camera size={32} color={COLORS.primary} /></View><Text style={styles.cheese}>Say Cheese</Text><Text style={styles.photoHint}>Capture your photo to continue</Text>{cameraLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />}</View>}</View>
                  {photo && <TouchableOpacity style={styles.retake} disabled={cameraLoading || submitting} onPress={async () => { setPhoto(null); setLocation(null); await capturePhoto(); }}><RotateCcw size={15} color={COLORS.primary} /><Text style={styles.retakeText}>Retake Photo</Text></TouchableOpacity>}
                </>
              )}

              <View style={styles.locationCard}>
                <View style={styles.locationIcon}><MapPin size={20} color={COLORS.green} /></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.locationTitle}>Current Location</Text>
                  {locationLoading ? (
                    <View style={styles.locationLoading}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={styles.locationText}>Detecting location...</Text></View>
                  ) : location ? (
                    <><Text style={styles.locationText}>{location.text}</Text><View style={styles.verified}><CheckCircle2 size={12} color={COLORS.green} /><Text style={styles.verifiedText}>Location verified</Text></View></>
                  ) : (
                    <Text style={styles.locationText}>Location not available</Text>
                  )}
                </View>
              </View>

              {location && <View style={styles.mapPreviewWrap}><LocationMap latitude={location.latitude} longitude={location.longitude} height={150} /></View>}

              {punchType === 'out' && !location && !locationLoading && (
                <TouchableOpacity style={styles.retake} onPress={getLocation}><RotateCcw size={15} color={COLORS.primary} /><Text style={styles.retakeText}>Retry Location</Text></TouchableOpacity>
              )}

              <TouchableOpacity disabled={!canSubmit || cameraLoading || submitting} onPress={submit} style={[styles.submit, (!canSubmit || cameraLoading || submitting) && styles.disabledSubmit]}>{submitting ? <ActivityIndicator color={COLORS.white} /> : <><Send size={17} color={COLORS.white} /><Text style={styles.submitText}>Submit {punchType === 'in' ? 'Punch In' : 'Punch Out'}</Text></>}</TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== Row action menu (the ⋯ button) ===== */}
      <Modal visible={!!menuDay} transparent animationType="fade" onRequestClose={() => setMenuDay(null)}>
        <TouchableOpacity activeOpacity={1} style={styles.menuOverlay} onPress={() => setMenuDay(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{menuDay ? fmtDate(menuDay.date) : ''}</Text>
            <TouchableOpacity style={styles.menuItem} onPress={adjustFromMenu}>
              <View style={[styles.menuIcon, { backgroundColor: COLORS.primarySoft }]}><Pencil size={16} color={COLORS.primary} /></View>
              <Text style={styles.menuItemText}>Adjust Attendance</Text>
            </TouchableOpacity>
            {menuDay?.info && (
              <TouchableOpacity style={styles.menuItem} onPress={detailFromMenu}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.greenSoft }]}><MapPin size={16} color={COLORS.green} /></View>
                <Text style={styles.menuItemText}>View photo & location trail</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuDay(null)}><Text style={styles.menuCancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===== Attendance adjustment modal ===== */}
      <Modal visible={adjustVisible} transparent animationType="slide" onRequestClose={closeAdjust}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>Attendance Adjustment</Text><Text style={styles.modalSubtitle}>Request a correction for an incorrect or incomplete record</Text></View>
              <TouchableOpacity disabled={adjSubmitting} onPress={closeAdjust} style={styles.close}><X size={19} color={COLORS.text} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.adjInfo}><Info size={15} color={COLORS.primary} /><Text style={styles.adjInfoText}>Your manager will review this request. Add a clear reason so it gets approved faster.</Text></View>

              <Text style={styles.fieldLabel}>Request Type</Text>
              <View style={styles.fieldBox}><Text style={styles.fieldValue}>Attendance Adjustment</Text></View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>From Date</Text>
                  <TouchableOpacity style={styles.fieldBox} onPress={() => setAdjPicker('from')}><Text style={styles.fieldValue}>{adj.from ? fmtDate(adj.from) : 'Select'}</Text></TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>To Date</Text>
                  <TouchableOpacity style={styles.fieldBox} onPress={() => setAdjPicker('to')}><Text style={styles.fieldValue}>{adj.to ? fmtDate(adj.to) : 'Select'}</Text></TouchableOpacity>
                </View>
              </View>

              {adjPicker && (
                <DateTimePicker
                  value={(adjPicker === 'from' ? adj.from : adj.to) || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    const target = adjPicker;
                    setAdjPicker(null);
                    if (event.type === 'dismissed' || !date) return;
                    setAdj(a => target === 'from' ? { ...a, from: date, to: a.to && a.to < date ? date : a.to } : { ...a, to: date });
                  }}
                />
              )}

              <Text style={styles.fieldLabel}>Attachment (optional)</Text>
              <TouchableOpacity style={styles.fieldBox} onPress={pickAttachment}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Paperclip size={15} color={COLORS.primary} />
                  <Text style={[styles.fieldValue, { marginLeft: 8, flex: 1 }]} numberOfLines={1}>{adj.file ? adj.file.name : 'Choose from gallery'}</Text>
                  {adj.file && <TouchableOpacity onPress={() => setAdj(a => ({ ...a, file: null }))}><X size={15} color={COLORS.textSecondary} /></TouchableOpacity>}
                </View>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Reason / Note</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={adj.note}
                onChangeText={t => setAdj(a => ({ ...a, note: t }))}
                placeholder="Explain why attendance needs to be adjusted..."
                placeholderTextColor={COLORS.textLight}
                textAlignVertical="top"
              />

              <TouchableOpacity disabled={adjSubmitting} onPress={submitAdjust} style={[styles.submit, adjSubmitting && styles.disabledSubmit]}>
                {adjSubmitting ? <ActivityIndicator color={COLORS.white} /> : <><Send size={17} color={COLORS.white} /><Text style={styles.submitText}>Submit Request</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== Day detail modal ===== */}
      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={closeDetail}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>Attendance Detail</Text><Text style={styles.modalSubtitle}>{selectedDay ? fmtDate(selectedDay.date) : ''}</Text></View>
              <TouchableOpacity onPress={closeDetail} style={styles.close}><X size={19} color={COLORS.text} /></TouchableOpacity>
            </View>
            {selectedDay && (() => {
              const { info } = selectedDay;
              const photoSession = info.sessions.find(s => s.image);
              const tracking = info.sessions.flatMap(s => s.location_tracking || []);
              const dayStatus = getDayStatus(selectedDay.date, info);
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {photoSession ? (
                    <Image source={{ uri: photoSession.image }} style={styles.detailPhoto} />
                  ) : (
                    <View style={[styles.photoBox, { height: 170 }]}><View style={styles.placeholder}><Camera size={26} color={COLORS.textLight} /><Text style={styles.photoHint}>No photo captured</Text></View></View>
                  )}

                  <View style={styles.detailSummary}>
                    <StatusPill status={dayStatus} />
                    <Text style={styles.detailWorked}>{info.workedMs ? `Worked ${formatHoursMinutes(info.workedMs)}` : 'No completed session'}</Text>
                  </View>

                  {info.sessions.map((s, i) => (
                    <View key={s.id || i} style={styles.timeRow}>
                      <View style={styles.timeBox}><LogIn size={18} color={COLORS.primary} /><Text style={styles.timeLabel}>{info.sessions.length > 1 ? `In (${i + 1})` : 'Punch In'}</Text><Text style={styles.timeValue}>{formatTime(getCheckInValue(s))}</Text></View>
                      <View style={styles.divider} />
                      <View style={styles.timeBox}><LogOut size={18} color={COLORS.green} /><Text style={styles.timeLabel}>{info.sessions.length > 1 ? `Out (${i + 1})` : 'Punch Out'}</Text><Text style={styles.timeValue}>{formatTime(getCheckOutValue(s))}</Text></View>
                    </View>
                  ))}

                  <Text style={styles.trackHeading}>Location Tracking</Text>
                  <Text style={styles.trackSubheading}>Recorded roughly every 2 hours while punched in</Text>
                  {tracking.length === 0 ? (
                    <View style={styles.empty}><MapPin size={22} color={COLORS.textLight} /><Text style={styles.emptyText}>No location tracking data available for this day.</Text></View>
                  ) : tracking.map((point, idx) => {
                    const coords = parseLatLng(point.location);
                    const isExpanded = expandedTrackIndex === idx;
                    return (
                      <View key={idx}>
                        <TouchableOpacity style={styles.trackRow} activeOpacity={0.7} onPress={() => setExpandedTrackIndex(isExpanded ? null : idx)}>
                          <View style={styles.trackIcon}><MapPin size={15} color={COLORS.primary} /></View>
                          <View style={{ flex: 1, marginLeft: 9 }}>
                            <Text style={styles.trackTime}>{formatTime(point.time)}</Text>
                            <Text style={styles.trackLocation} numberOfLines={1}>{point.location}</Text>
                          </View>
                          {isExpanded ? <ChevronDown size={16} color={COLORS.textLight} /> : <ChevronRight size={16} color={COLORS.textLight} />}
                        </TouchableOpacity>
                        {isExpanded && coords && <View style={styles.mapPreviewWrap}><LocationMap latitude={coords.latitude} longitude={coords.longitude} height={150} /></View>}
                      </View>
                    );
                  })}

                  {selectedDay.date.getDay() !== 0 && (
                    <TouchableOpacity style={styles.adjustFromDetail} onPress={adjustFromDetail}>
                      <Pencil size={16} color={COLORS.primary} /><Text style={styles.adjustFromDetailText}>Request attendance adjustment</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ===== Single-location map modal (In / Out buttons) ===== */}
      <Modal visible={!!mapPoint} transparent animationType="slide" onRequestClose={() => setMapPoint(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalTitle}>{mapPoint?.title}</Text><Text style={styles.modalSubtitle}>{mapPoint ? `${mapPoint.latitude.toFixed(6)}, ${mapPoint.longitude.toFixed(6)}` : ''}</Text></View>
              <TouchableOpacity onPress={() => setMapPoint(null)} style={styles.close}><X size={19} color={COLORS.text} /></TouchableOpacity>
            </View>
            {mapPoint && <View style={[styles.mapPreviewWrap, { marginTop: 0 }]}><LocationMap latitude={mapPoint.latitude} longitude={mapPoint.longitude} height={280} /></View>}
          </View>
        </View>
      </Modal>

      <GeoStampCapture ref={geoStampRef} />
    </ScreenShell>
  );
};

const styles = themedCreate({
  content: { padding: 16, paddingBottom: 35 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loaderText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 9 },

  todayCard: { backgroundColor: COLORS.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  cardSubtitle: { fontSize: 8.5, color: COLORS.textSecondary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 8, fontWeight: '900' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: '#F8FAFD', borderRadius: 15, padding: 12 },
  timeBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 45, backgroundColor: COLORS.border },
  timeLabel: { fontSize: 8, color: COLORS.textSecondary, marginTop: 6 },
  timeValue: { fontSize: 13, fontWeight: '900', color: COLORS.text, marginTop: 3 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 13 },
  button: { flex: 1, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  inButton: { backgroundColor: COLORS.primarySoft },
  outButton: { backgroundColor: COLORS.primary },
  buttonText: { fontSize: 10, fontWeight: '900', marginLeft: 7 },
  disabled: { opacity: 0.5 },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 16, padding: 5, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, gap: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary },
  tabBtnTextActive: { color: COLORS.white },

  avgFilterWrap: { marginBottom: 14 },
  avgFilterLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 8 },
  filterRow: { gap: 8, paddingRight: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 9.5, fontWeight: '800', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },
  customRangeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  dateBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  dateBtnText: { fontSize: 9.5, fontWeight: '800', color: COLORS.text },
  dateRangeSep: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '700' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { width: '48%', flexGrow: 1, backgroundColor: COLORS.white, borderRadius: 18, padding: 13, borderWidth: 1, borderColor: COLORS.border },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  statLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary },
  statValue: { fontSize: 19, fontWeight: '900', color: COLORS.text, marginTop: 3 },
  statCaption: { fontSize: 8, color: COLORS.textLight, marginTop: 3 },

  section: { backgroundColor: COLORS.white, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  sectionSub: { fontSize: 8.5, color: COLORS.textSecondary, marginTop: 3 },
  percentBadge: { backgroundColor: COLORS.primarySoft, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10 },
  percentText: { fontSize: 11, fontWeight: '900', color: COLORS.primary },
  progressTrack: { height: 9, borderRadius: 5, backgroundColor: COLORS.grey, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 5 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { fontSize: 9, fontWeight: '800' },
  messageBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13, padding: 11, borderRadius: 12, backgroundColor: '#F8FAFD' },
  messageText: { fontSize: 9.5, color: COLORS.textSecondary, fontWeight: '600', flex: 1 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 7, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 3 },
  barTrack: { width: '70%', flex: 1, justifyContent: 'flex-end', backgroundColor: '#F3F7FC', borderRadius: 6, overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  barLabel: { fontSize: 7, color: COLORS.textSecondary, marginTop: 4 },

  officeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  officeLabel: { fontSize: 8, fontWeight: '700', color: COLORS.textSecondary },
  officeValue: { fontSize: 15, fontWeight: '900', color: COLORS.text, marginTop: 3 },
  officeArrow: { fontSize: 18, color: COLORS.primary, fontWeight: '900' },
  lunchBox: { flexDirection: 'row', alignItems: 'center', marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: '#FFF7DD' },
  lunchTitle: { fontSize: 10, fontWeight: '900', color: '#8A6100' },
  lunchTime: { fontSize: 9, color: '#8A6100', marginTop: 3 },

  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  infoCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: COLORS.border },
  infoLabel: { fontSize: 8.5, color: COLORS.textSecondary, fontWeight: '700' },
  infoValue: { fontSize: 10.5, color: COLORS.text, fontWeight: '900', marginTop: 5 },

  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  logDate: { width: 44, alignItems: 'center', paddingVertical: 6, borderRadius: 12, backgroundColor: '#F8FAFD' },
  logDay: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  logMonth: { fontSize: 7.5, fontWeight: '700', color: COLORS.textSecondary, marginTop: 1 },
  logTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionCount: { fontSize: 8, color: COLORS.textSecondary, fontWeight: '700' },
  logTime: { fontSize: 8.5, color: COLORS.textSecondary, marginTop: 6 },
  locRow: { flexDirection: 'row', gap: 7, marginTop: 7 },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  locBtnText: { fontSize: 8.5, fontWeight: '900' },
  moreBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  pillText: { fontSize: 8, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 9, color: COLORS.textLight, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },

  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNav: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  calWeek: { flexDirection: 'row', marginBottom: 6 },
  calWeekText: { flex: 1, textAlign: 'center', fontSize: 9, fontWeight: '800', color: COLORS.textSecondary },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCellWrap: { width: '14.2857%', padding: 2 },
  calCell: { height: 52, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  calToday: { borderWidth: 1.5, borderColor: COLORS.primary },
  calDayText: { fontSize: 11, fontWeight: '900' },
  calSmall: { fontSize: 7, fontWeight: '800', marginTop: 2 },
  calLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  calLegendDot: { width: 8, height: 8, borderRadius: 4 },
  calLegendText: { fontSize: 8.5, fontWeight: '700', color: COLORS.textSecondary },

  overlay: { flex: 1, backgroundColor: 'rgba(7,27,55,.65)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, paddingBottom: 28, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 19, fontWeight: '900', color: COLORS.text },
  modalSubtitle: { fontSize: 9, color: COLORS.textSecondary, marginTop: 4, maxWidth: 240 },
  close: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  photoBox: { height: 245, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F3F7FC', borderWidth: 1, borderColor: COLORS.border },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  detailPhoto: { width: '100%', height: 220, borderRadius: 20, resizeMode: 'cover', backgroundColor: '#F3F7FC' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraCircle: { width: 68, height: 68, borderRadius: 22, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cheese: { fontSize: 17, fontWeight: '900', color: COLORS.text, marginTop: 13 },
  photoHint: { fontSize: 9, color: COLORS.textSecondary, marginTop: 5 },
  retake: { alignSelf: 'center', marginTop: 10, marginBottom: 4, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.primarySoft, flexDirection: 'row', alignItems: 'center' },
  retakeText: { fontSize: 9, fontWeight: '900', color: COLORS.primary, marginLeft: 5 },
  locationCard: { marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: '#EEF2F7', flexDirection: 'row', alignItems: 'center' },
  locationIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.greenSoft, alignItems: 'center', justifyContent: 'center' },
  locationTitle: { fontSize: 10, fontWeight: '900', color: COLORS.text },
  locationText: { fontSize: 8, color: COLORS.textSecondary, marginTop: 4 },
  locationLoading: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verified: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  verifiedText: { fontSize: 7.5, color: COLORS.green, fontWeight: '800', marginLeft: 4 },
  mapPreviewWrap: { marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  submit: { height: 52, marginTop: 16, borderRadius: 15, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 11, fontWeight: '900', color: COLORS.white, marginLeft: 8 },
  disabledSubmit: { opacity: 0.45 },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(7,27,55,.55)', justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30 },
  menuTitle: { fontSize: 13, fontWeight: '900', color: COLORS.text, marginBottom: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuItemText: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  menuCancel: { marginTop: 8, height: 46, borderRadius: 13, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  menuCancelText: { fontSize: 10.5, fontWeight: '900', color: COLORS.textSecondary },

  adjInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 14, backgroundColor: COLORS.primarySoft, marginBottom: 6 },
  adjInfoText: { flex: 1, fontSize: 9.5, color: COLORS.primaryDark, lineHeight: 14 },
  fieldLabel: { fontSize: 9.5, fontWeight: '800', color: COLORS.text, marginTop: 14, marginBottom: 7 },
  fieldBox: { minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F8FAFD', paddingHorizontal: 12, justifyContent: 'center' },
  fieldValue: { fontSize: 10.5, color: COLORS.text, fontWeight: '600' },
  textArea: { minHeight: 100, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F8FAFD', padding: 12, fontSize: 10.5, color: COLORS.text },

  detailSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  detailWorked: { fontSize: 10, fontWeight: '800', color: COLORS.text },
  trackHeading: { fontSize: 12, fontWeight: '900', color: COLORS.text, marginTop: 18 },
  trackSubheading: { fontSize: 8, color: COLORS.textSecondary, marginTop: 3, marginBottom: 8 },
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  trackIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  trackTime: { fontSize: 10, fontWeight: '900', color: COLORS.text },
  trackLocation: { fontSize: 8, color: COLORS.textSecondary, marginTop: 3 },
  adjustFromDetail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, height: 48, borderRadius: 14, backgroundColor: COLORS.primarySoft },
  adjustFromDetailText: { fontSize: 10.5, fontWeight: '900', color: COLORS.primary },
});

export default AttendanceScreen;