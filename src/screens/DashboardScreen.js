import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import LocationMap from '../components/LocationMap';
import GeoStampCapture from '../components/GeoStampCapture';
import StatusDialog from '../components/StatusDialog';
import SideDrawer from '../components/SideDrawer';
import NotificationSheet, { useNotifications } from '../components/NotificationSheet';
import HolidayBanners from '../components/HolidayBanners';
import UpcomingEvents from '../components/UpcomingEvents';
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarCheck2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coffee,
  LogIn,
  LogOut,
  Maximize2,
  MapPin,
  Receipt,
  RotateCcw,
  Send,
  Timer,
  UserCheck,
  Users,
  WalletCards,
  X,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import client, { endpoints } from '../api/client';
import * as LocationTracking from '../services/locationTracking';

const COLORS = {
  primary: '#0B4EA2', primaryDark: '#073B7A', primarySoft: '#EAF3FF', primarySoft2: '#F3F8FF',
  background: '#F4F7FB', white: '#FFFFFF', text: '#12233F', textSecondary: '#64748B', textLight: '#94A3B8',
  green: '#16A05D', greenSoft: '#E8F8F0', orange: '#E98A24', orangeSoft: '#FFF4E7', purple: '#7551D8',
  purpleSoft: '#F1EDFF', cyan: '#1687B7', cyanSoft: '#E8F7FC', red: '#EF4444', border: '#E6ECF4', shadow: '#0B2447',
};

// Same rules as the web dashboard, so mobile and web behave identically.
const ALLOWED_RADIUS_METERS = 20;
const LATE_AFTER_HOUR = 10;
const LATE_AFTER_MINUTE = 0;

// Side drawer menu. Route names AppNavigator ke routes se match karte hain.
// (Payslip / Holidays screens abhi exist nahi karte, isliye hata diye.)
const DRAWER_ITEMS = [
  { title: 'Home', icon: 'home', route: 'Home' },
  { title: 'Attendance', icon: 'attendance', route: 'Attendance' },
  { title: 'Leaves', icon: 'leave', route: 'Leave' },
  { title: 'Expenses', icon: 'expense', route: 'Expenses' },
  { title: 'Employees', icon: 'employees', route: 'Employees' },
  { title: 'Profile', icon: 'profile', route: 'Profile' },
];

const getCheckInValue = attendance => attendance?.punch_time || attendance?.check_in || attendance?.punch_in || attendance?.in_time;
const getCheckOutValue = attendance => attendance?.punch_out_time || attendance?.check_out || attendance?.punch_out || attendance?.out_time;

const formatTime = value => {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getDisplayName = u => {
  if (!u) return 'Employee';
  const combined = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return u.name || u.full_name || combined || u.username || u.user_email || u.email || 'Employee';
};

const parseLatLng = value => {
  if (!value) return null;
  const [latitude, longitude] = String(value).split(',').map(Number);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude };
};

// Backend list responses can be a plain array or a paginated { results: [] }.
const toList = response => (Array.isArray(response?.data) ? response.data : response?.data?.results || []);

// ---- Geofencing + monthly overview helpers (ported from the web dashboard) -
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Safe local date parser: avoids the UTC-shift bug of `new Date('YYYY-MM-DD')`.
const getLocalDate = dateString => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getDateKey = date => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isLatePunch = checkInValue => {
  if (!checkInValue) return false;
  const d = new Date(checkInValue);
  const hour = d.getHours();
  const minute = d.getMinutes();
  return hour > LATE_AFTER_HOUR || (hour === LATE_AFTER_HOUR && minute >= LATE_AFTER_MINUTE);
};

const computeMonthlyOverview = (attendance, leaves, holidays, jobDetail) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDate = today.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const attendanceByDate = {};
  attendance.forEach(punch => {
    const inV = getCheckInValue(punch);
    if (!inV) return;
    const d = new Date(inV);
    if (d.getFullYear() === year && d.getMonth() === month) attendanceByDate[getDateKey(d)] = punch;
  });

  const holidayDates = new Set();
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow === 0 || dow === 6) holidayDates.add(getDateKey(new Date(year, month, day)));
  }
  holidays.forEach(item => {
    const startRaw = item.date || item.holiday_date || item.start_date;
    const endRaw = item.end_date || item.date || item.holiday_date || item.start_date;
    const start = getLocalDate(startRaw);
    const end = getLocalDate(endRaw);
    if (!start || !end) return;
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getFullYear() === year && cur.getMonth() === month) holidayDates.add(getDateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
  });

  const leaveDates = new Set();
  leaves
    .filter(item => String(item.status || '').toLowerCase() === 'approved')
    .forEach(item => {
      const startRaw = item.date_from || item.start_date || item.date;
      const endRaw = item.date_to || item.end_date || item.date_from || item.start_date || item.date;
      const start = getLocalDate(startRaw);
      const end = getLocalDate(endRaw);
      if (!start || !end) return;
      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getFullYear() === year && cur.getMonth() === month) leaveDates.add(getDateKey(cur));
        cur.setDate(cur.getDate() + 1);
      }
    });

  let startDay = 1;
  if (jobDetail?.date_of_joining) {
    const joiningDate = getLocalDate(jobDetail.date_of_joining);
    if (joiningDate && joiningDate.getFullYear() === year && joiningDate.getMonth() === month) startDay = joiningDate.getDate();
  }

  let present = 0, late = 0, absent = 0, leave = 0, holiday = 0;
  for (let day = startDay; day <= todayDate; day++) {
    const key = getDateKey(new Date(year, month, day));
    const punch = attendanceByDate[key];
    if (punch?.punch_time || getCheckInValue(punch)) {
      if (isLatePunch(getCheckInValue(punch))) late++; else present++;
      continue;
    }
    if (leaveDates.has(key)) { leave++; continue; }
    if (holidayDates.has(key)) { holiday++; continue; }
    absent++;
  }

  return { present, late, absent, leave, holiday, workingDays: present + late };
};

// ---- Multi-session attendance helpers -------------------------------------
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

const getTotalWorkedMs = todayRecords =>
  todayRecords.reduce((sum, r) => {
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
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};
// -----------------------------------------------------------------------------

const DashboardScreen = ({ navigation }) => {
  const { user, signOut, logout } = useAuth();
  const displayName = getDisplayName(user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState({ attendance: [], leaves: [], expenses: [], holidays: [] });
  // All employees + their job details: used for birthdays and work anniversaries.
  const [people, setPeople] = useState({ users: [], jobs: [] });
  const [jobDetail, setJobDetail] = useState(null);
  const [punchModalVisible, setPunchModalVisible] = useState(false);
  const [punchType, setPunchType] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [submittingPunch, setSubmittingPunch] = useState(false);
  const [checkingRange, setCheckingRange] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  // New UI state
  const [dialog, setDialog] = useState({ visible: false });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(false);
  const notif = useNotifications(user?.id);

  const showDialog = cfg => setDialog({ visible: true, ...cfg });
  const closeDialog = () => setDialog(d => ({ ...d, visible: false }));

  const headerAnim = useRef(new Animated.Value(0)).current;
  const punchCardAnim = useRef(new Animated.Value(0)).current;
  const attendanceAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const summaryAnim = useRef(new Animated.Value(0)).current;
  const leaveAnim = useRef(new Animated.Value(0)).current;
  const notificationPulse = useRef(new Animated.Value(1)).current;
  const punchInScale = useRef(new Animated.Value(1)).current;
  const punchOutScale = useRef(new Animated.Value(1)).current;
  const actionScale = useRef(Array.from({ length: 4 }, () => new Animated.Value(1))).current;
  const geoStampRef = useRef(null);

  // silent = true: background refresh without replacing the screen with the loader.
const loadDashboard = useCallback(async (silent = false) => {
  if (!user?.id) { setLoading(false); return; }
  try {
    if (!silent) setLoading(true);
    const results = await Promise.allSettled([
      client.get(endpoints.punchesByUser(user.id)),
      client.get(endpoints.regularization),
      client.get(endpoints.expenses),          // string hai, function nahi
      client.get(endpoints.holidays),
      client.get(endpoints.users),
      client.get(endpoints.allJobDetails),
    ]);

    const names = ['Punches', 'Regularization', 'Expenses', 'Holidays', 'Users', 'JobDetails'];
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.log(`${names[i]} API error:`, r.reason?.response?.status, r.reason?.response?.data || r.reason?.message);
    });

    // Fail hui API ka purana data rakho, khali mat karo
    const pick = i => (results[i].status === 'fulfilled' ? toList(results[i].value) : null);
    const punches = pick(0), regs = pick(1), exps = pick(2), hols = pick(3), usrs = pick(4), jobs = pick(5);

    setDashboard(prev => ({
      attendance: punches ?? prev.attendance,
      leaves: regs
        ? regs.filter(l => Number(l.user) === Number(user.id) && (!l.request_type || l.request_type === 'Leave'))
        : prev.leaves,
      expenses: exps
        ? exps.filter(e => e.user == null || Number(e.user) === Number(user.id))
        : prev.expenses,
      holidays: hols ?? prev.holidays,
    }));
    setPeople(prev => ({ users: usrs ?? prev.users, jobs: jobs ?? prev.jobs }));
  } finally {
    setLoading(false);
  }
}, [user?.id]);
  // Needed for the office-radius check and the "start from joining date" rule.
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

  useEffect(() => {
    loadDashboard();
    loadJobDetail();
    Animated.stagger(90, [headerAnim, punchCardAnim, attendanceAnim, actionsAnim, summaryAnim, leaveAnim].map(anim =>
      Animated.timing(anim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    )).start();
    Animated.loop(Animated.sequence([
      Animated.timing(notificationPulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
      Animated.timing(notificationPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
    ])).start();
  }, [loadDashboard, loadJobDetail]);

  const todayRecords = useMemo(() => getTodayRecords(dashboard.attendance), [dashboard.attendance]);
  const activeRecord = useMemo(() => getActiveRecord(todayRecords), [todayRecords]);
  const totalWorkedMs = useMemo(() => getTotalWorkedMs(todayRecords), [todayRecords]);
  const hasActivePunch = !!activeRecord;
  const displayRecord = activeRecord || todayRecords[todayRecords.length - 1];

  // Live ticking clock while punched in.
  useEffect(() => {
    if (!hasActivePunch) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasActivePunch, activeRecord?.id]);

  const liveElapsedMs = hasActivePunch ? nowTick - new Date(getCheckInValue(activeRecord)).getTime() : 0;

  const monthlyOverview = useMemo(
    () => computeMonthlyOverview(dashboard.attendance, dashboard.leaves, dashboard.holidays, jobDetail),
    [dashboard.attendance, dashboard.leaves, dashboard.holidays, jobDetail]
  );
  const overviewTotal = Math.max(monthlyOverview.workingDays + monthlyOverview.absent + monthlyOverview.leave, 1);
  const overviewPct = n => (monthlyOverview.workingDays > 0 ? Math.round((n / monthlyOverview.workingDays) * 100) : 0);

  const isOnTimeToday = displayRecord && getCheckInValue(displayRecord) ? !isLatePunch(getCheckInValue(displayRecord)) : null;

  const attendanceStatus = hasActivePunch
    ? { label: 'Working', color: COLORS.green, background: COLORS.greenSoft }
    : todayRecords.length > 0
      ? { label: 'Completed', color: COLORS.green, background: COLORS.greenSoft }
      : { label: 'Not Checked In', color: COLORS.orange, background: COLORS.orangeSoft };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is required to mark attendance.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const locationString = `${latitude},${longitude}`;
      setCurrentLocation({ latitude, longitude, text: locationString });
      return locationString;
    } catch (error) {
      showDialog({ type: 'error', title: 'Location Error', message: error?.message || 'Unable to detect your location.' });
      return null;
    } finally { setLocationLoading(false); }
  };

  // When the job is set to a fixed office location (tracking === false),
  // Punch In is blocked outside a 20m radius. Fails open if the check itself errors.
  const checkOfficeRange = async () => {
    if (!jobDetail || jobDetail.tracking !== false) return true;
    const officeLoc = parseLatLng(jobDetail.office_location);
    if (!officeLoc) return true;

    setCheckingRange(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        showDialog({ type: 'error', title: 'Location Error', message: 'Location permission is required to mark attendance.' });
        return false;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const distance = getDistanceInMeters(position.coords.latitude, position.coords.longitude, officeLoc.latitude, officeLoc.longitude);
      if (distance > ALLOWED_RADIUS_METERS) {
        showDialog({ type: 'warning', title: 'Out of Range', message: `You are ${Math.round(distance)}m away. Please move within ${ALLOWED_RADIUS_METERS}m of the office.` });
        return false;
      }
      return true;
    } catch (error) {
      console.log('Office range check error:', error);
      return true;
    } finally {
      setCheckingRange(false);
    }
  };

  const capturePunchPhoto = async () => {
    try {
      setCapturingPhoto(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        showDialog({ type: 'warning', title: 'Camera Permission', message: 'Camera permission is required to capture your attendance photo.' });
        return;
      }
      const photo = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
      if (photo.canceled) return;
      const rawUri = photo.assets?.[0]?.uri;
      if (!rawUri) return;

      const locationString = await getCurrentLocation();
      if (!locationString) { setCapturedPhoto(rawUri); return; }
      const [latitude, longitude] = locationString.split(',').map(Number);

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
      setCapturedPhoto(stampedUri || rawUri);
    } catch (error) {
      console.log('Camera error:', error);
      showDialog({ type: 'error', title: 'Camera Error', message: error?.message || 'Unable to capture photo.' });
    } finally { setCapturingPhoto(false); }
  };

  // Punch In needs a photo + location. Punch Out only needs the current location.
  const openPunchModal = async (type) => {
    if (submittingPunch || capturingPhoto || checkingRange) return;
    if (type === 'in') {
      const inRange = await checkOfficeRange();
      if (!inRange) return;
    }
    setPunchType(type);
    setCapturedPhoto(null);
    setCurrentLocation(null);
    setPhotoPreview(false);
    setPunchModalVisible(true);
    if (type === 'in') {
      setTimeout(() => capturePunchPhoto(), 300);
    } else {
      setTimeout(() => getCurrentLocation(), 300);
    }
  };

  const resetPunchModal = () => {
    setPunchModalVisible(false);
    setCapturedPhoto(null);
    setCurrentLocation(null);
    setPunchType(null);
    setPhotoPreview(false);
  };

  const closePunchModal = () => {
    if (submittingPunch) return;
    resetPunchModal();
  };

  const retakePunchPhoto = async () => {
    setPhotoPreview(false);
    setCapturedPhoto(null);
    setCurrentLocation(null);
    await capturePunchPhoto();
  };

  const submitPunchIn = async () => {
    if (!capturedPhoto) return showDialog({ type: 'warning', title: 'Photo Required', message: 'Please capture your photo before submitting.' });
    if (!currentLocation) return showDialog({ type: 'warning', title: 'Location Required', message: 'Please wait until your location is detected.' });
    try {
      setSubmittingPunch(true);
      const body = new FormData();
      body.append('image', { uri: capturedPhoto, name: `punch-${Date.now()}.jpg`, type: 'image/jpeg' });
      body.append('location', currentLocation.text);
      await client.post(endpoints.punchIn, body, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (error) {
      setSubmittingPunch(false);
      return showDialog({ type: 'error', title: 'Punch-in failed', message: error?.response?.data?.error || error?.message || 'Something went wrong. Please try again.' });
    }
    // Punch is recorded. A tracking failure must never show as a punch failure.
    setSubmittingPunch(false);
    resetPunchModal();
    try { await LocationTracking.startAttendanceLocationTracking?.(); } catch (e) { console.log('Tracking start failed:', e); }
    showDialog({ type: 'success', title: 'Attendance Marked', message: `Punch-in recorded at ${formatTime(new Date())}. Have a productive day!` });
    loadDashboard(true);
  };

  // No photo required for Punch Out, only the verified current location.
  const submitPunchOut = async () => {
    if (!currentLocation) return showDialog({ type: 'warning', title: 'Location Required', message: 'Please wait until your location is detected.' });
    try {
      setSubmittingPunch(true);
      await client.put(endpoints.punchOut, { punch_out_location: currentLocation.text });
    } catch (error) {
      setSubmittingPunch(false);
      return showDialog({ type: 'error', title: 'Punch-out failed', message: error?.response?.data?.error || error?.message || 'Something went wrong.' });
    }
    setSubmittingPunch(false);
    resetPunchModal();
    try { await LocationTracking.stopAttendanceLocationTracking?.(); } catch (e) { console.log('Tracking stop failed:', e); }
    showDialog({ type: 'success', title: 'Punch-out Recorded', message: `Punch-out recorded at ${formatTime(new Date())}.` });
    loadDashboard(true);
  };

  const submitPunch = () => (punchType === 'in' ? submitPunchIn() : submitPunchOut());
  const onRefresh = async () => { setRefreshing(true); await loadDashboard(true); notif.refresh(); setRefreshing(false); };

  const handleSignOut = () => {
    setDrawerVisible(false);
    setTimeout(() => showDialog({
      type: 'warning',
      title: 'Sign out?',
      message: 'You will need to log in again to use the app.',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try { await LocationTracking.stopAttendanceLocationTracking?.(); } catch (e) { /* ignore */ }
        await (signOut || logout)?.();
      },
    }), 250);
  };

  // Aane wali (aaj ya aage ki) pending/approved leave, sabse nazdeeki pehle.
  const upcomingLeave = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dashboard.leaves
      .filter(i => !['rejected', 'cancelled'].includes(String(i.status || '').toLowerCase()))
      .filter(i => {
        const end = getLocalDate(i.date_to || i.date_from);
        return end && end >= today;
      })
      .sort((a, b) => getLocalDate(a.date_from) - getLocalDate(b.date_from))[0];
  }, [dashboard.leaves]);

  const canSubmitPunch = punchType === 'in'
    ? (!!capturedPhoto && !!currentLocation)
    : !!currentLocation;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />
      <View style={styles.container}>
        <Animated.View style={[styles.heroHeader, fadeSlide(headerAnim)]}>
          <View style={styles.heroRow}>
            <TouchableOpacity style={styles.profileWrap} activeOpacity={0.8} onPress={() => setDrawerVisible(true)}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{String(displayName).charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>Good day</Text>
                <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
              </View>
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: notificationPulse }] }}>
              <TouchableOpacity style={styles.notificationButton} onPress={() => setNotifVisible(true)}>
                <Bell size={19} color={COLORS.white} />
                {notif.unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{notif.unreadCount > 9 ? '9+' : notif.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
          <Text style={styles.heroCaption}>Manage your attendance and work activity</Text>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          <Animated.View style={fadeSlide(punchCardAnim)}>
            <View style={styles.punchCard}>
              <View style={styles.punchGlowOne} /><View style={styles.punchGlowTwo} />
              <View style={styles.punchCardHeader}>
                <View style={styles.punchTitleArea}>
                  <View style={styles.punchMainIcon}><Timer size={22} color={COLORS.white} /></View>
                  <View>
                    <Text style={styles.punchTitle}>Daily Attendance</Text>
                    <Text style={styles.punchSubtitle}>Punch directly from your dashboard</Text>
                  </View>
                </View>
                <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
              </View>

              {hasActivePunch ? (
                <View style={styles.punchInfoRow}>
                  <View style={styles.punchInfoItem}><LogIn size={14} color="#CFE1F8" /><Text style={styles.punchInfoText}>Since: {formatTime(getCheckInValue(activeRecord))}</Text></View>
                  <View style={styles.punchInfoDivider} />
                  <View style={styles.punchInfoItem}><Clock3 size={14} color="#55E89A" /><Text style={[styles.punchInfoText, styles.punchInfoTimer]}>{formatTimer(liveElapsedMs)}</Text></View>
                </View>
              ) : todayRecords.length > 0 ? (
                <View style={styles.punchInfoRow}>
                  <View style={styles.punchInfoItem}><LogOut size={14} color="#CFE1F8" /><Text style={styles.punchInfoText}>Last Out: {formatTime(getCheckOutValue(displayRecord))}</Text></View>
                  <View style={styles.punchInfoDivider} />
                  <View style={styles.punchInfoItem}><Timer size={14} color="#CFE1F8" /><Text style={styles.punchInfoText}>Worked: {formatHoursMinutes(totalWorkedMs)}</Text></View>
                </View>
              ) : (
                <View style={styles.punchInfoRow}>
                  <View style={styles.punchInfoItem}><LogIn size={14} color="#CFE1F8" /><Text style={styles.punchInfoText}>In: --:--</Text></View>
                  <View style={styles.punchInfoDivider} />
                  <View style={styles.punchInfoItem}><LogOut size={14} color="#CFE1F8" /><Text style={styles.punchInfoText}>Out: --:--</Text></View>
                </View>
              )}

              <View style={styles.punchButtonsRow}>
                <View style={styles.punchButtonWrapper}>
                  <Animated.View style={{ transform: [{ scale: punchInScale }] }}>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={[styles.punchButton, styles.punchInButton, (hasActivePunch || checkingRange) && styles.punchDisabledButton]}
                      disabled={hasActivePunch || submittingPunch || checkingRange}
                      onPress={() => openPunchModal('in')}
                    >
                      <View style={styles.punchButtonIcon}>
                        {checkingRange ? <ActivityIndicator size="small" color={COLORS.primary} /> : <LogIn size={18} color={hasActivePunch ? COLORS.textLight : COLORS.primary} />}
                      </View>
                      <View style={styles.punchButtonContent}>
                        <Text style={[styles.punchButtonTitle, hasActivePunch && styles.disabledPunchText]}>Punch In</Text>
                        <Text style={styles.punchButtonSmall}>{checkingRange ? 'Checking location...' : hasActivePunch ? 'Already punched' : todayRecords.length > 0 ? 'Start new session' : 'Capture & submit'}</Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
                <View style={styles.punchButtonWrapper}>
                  <Animated.View style={{ transform: [{ scale: punchOutScale }] }}>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={[styles.punchButton, styles.punchOutButton, !hasActivePunch && styles.punchDisabledButton]}
                      disabled={!hasActivePunch || submittingPunch}
                      onPress={() => openPunchModal('out')}
                    >
                      <View style={[styles.punchButtonIcon, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
                        <LogOut size={18} color={!hasActivePunch ? COLORS.textLight : COLORS.white} />
                      </View>
                      <View style={styles.punchButtonContent}>
                        <Text style={[styles.punchButtonTitle, { color: COLORS.white }, !hasActivePunch && styles.disabledPunchText]}>Punch Out</Text>
                        <Text style={[styles.punchButtonSmall, { color: '#CFE1F8' }]}>{hasActivePunch ? 'Verify location' : 'Not punched in'}</Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.sectionCard, fadeSlide(attendanceAnim)]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Today's Attendance</Text>
                <Text style={styles.sectionSubtitle}>Your current attendance status</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isOnTimeToday !== null && (
                  <View style={[styles.punctualityBadge, { backgroundColor: isOnTimeToday ? COLORS.greenSoft : COLORS.orangeSoft }]}>
                    <Text style={[styles.punctualityText, { color: isOnTimeToday ? COLORS.green : COLORS.orange }]}>{isOnTimeToday ? 'On Time' : 'Late'}</Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: attendanceStatus.background }]}>
                  <View style={[styles.statusDot, { backgroundColor: attendanceStatus.color }]} />
                  <Text style={[styles.statusText, { color: attendanceStatus.color }]}>{attendanceStatus.label}</Text>
                </View>
              </View>
            </View>
            <View style={styles.attendanceGrid}>
              <View style={styles.attendanceBox}>
                <View style={[styles.smallIcon, { backgroundColor: COLORS.primarySoft }]}><LogIn size={16} color={COLORS.primary} /></View>
                <Text style={styles.boxLabel}>Check In</Text>
                <Text style={styles.boxValue}>{formatTime(getCheckInValue(displayRecord))}</Text>
              </View>
              <View style={styles.attendanceBox}>
                <View style={[styles.smallIcon, { backgroundColor: COLORS.greenSoft }]}><LogOut size={16} color={COLORS.green} /></View>
                <Text style={styles.boxLabel}>Check Out</Text>
                <Text style={styles.boxValue}>{formatTime(getCheckOutValue(displayRecord))}</Text>
              </View>
              <View style={styles.attendanceBox}>
                <View style={[styles.smallIcon, { backgroundColor: COLORS.purpleSoft }]}><Clock3 size={16} color={COLORS.purple} /></View>
                <Text style={styles.boxLabel}>{hasActivePunch ? 'Elapsed' : 'Worked'}</Text>
                <Text style={[styles.boxValue, { color: attendanceStatus.color }]}>{hasActivePunch ? formatTimer(liveElapsedMs) : formatHoursMinutes(totalWorkedMs)}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.sectionCard, fadeSlide(attendanceAnim)]}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.smallIcon, { backgroundColor: COLORS.primarySoft, marginBottom: 0, marginRight: 9 }]}><BarChart3 size={16} color={COLORS.primary} /></View>
                <View>
                  <Text style={styles.sectionTitle}>This Month</Text>
                  <Text style={styles.sectionSubtitle}>Attendance overview</Text>
                </View>
              </View>
              <View style={styles.monthPill}><Text style={styles.monthPillText}>{monthlyOverview.workingDays} Working Days</Text></View>
            </View>
            <View style={styles.overviewGrid}>
              <View style={[styles.overviewChip, { backgroundColor: COLORS.greenSoft }]}><Text style={[styles.overviewChipValue, { color: COLORS.green }]}>{monthlyOverview.present}</Text><Text style={styles.overviewChipLabel}>On Time</Text></View>
              <View style={[styles.overviewChip, { backgroundColor: COLORS.purpleSoft }]}><Text style={[styles.overviewChipValue, { color: COLORS.purple }]}>{monthlyOverview.late}</Text><Text style={styles.overviewChipLabel}>Late</Text></View>
              <View style={[styles.overviewChip, { backgroundColor: COLORS.orangeSoft }]}><Text style={[styles.overviewChipValue, { color: COLORS.orange }]}>{monthlyOverview.leave}</Text><Text style={styles.overviewChipLabel}>Leave</Text></View>
              <View style={[styles.overviewChip, { backgroundColor: '#FDEDEE' }]}><Text style={[styles.overviewChipValue, { color: COLORS.red }]}>{monthlyOverview.absent}</Text><Text style={styles.overviewChipLabel}>Absent</Text></View>
              <View style={[styles.overviewChip, { backgroundColor: '#F1F5F9' }]}><Text style={[styles.overviewChipValue, { color: COLORS.textSecondary }]}>{monthlyOverview.holiday}</Text><Text style={styles.overviewChipLabel}>Holiday</Text></View>
            </View>
            <View style={styles.overviewBarTrack}>
              <View style={[styles.overviewBarSeg, { flex: Math.max(monthlyOverview.present, 0.0001), backgroundColor: COLORS.green }]} />
              <View style={[styles.overviewBarSeg, { flex: Math.max(monthlyOverview.late, 0.0001), backgroundColor: COLORS.purple }]} />
              <View style={[styles.overviewBarSeg, { flex: Math.max(monthlyOverview.leave, 0.0001), backgroundColor: COLORS.orange }]} />
              <View style={[styles.overviewBarSeg, { flex: Math.max(monthlyOverview.absent, 0.0001), backgroundColor: COLORS.red }]} />
            </View>
            <Text style={styles.overviewFootnote}>On Time {overviewPct(monthlyOverview.present)}%  •  Late {overviewPct(monthlyOverview.late)}%  •  {overviewTotal} days tracked</Text>
          </Animated.View>

          {/* Birthdays + work anniversaries (next 7 days) */}
          <UpcomingEvents users={people.users} jobs={people.jobs} />

          <Animated.View style={fadeSlide(actionsAnim)}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Text style={styles.sectionSubtitle}>Access frequently used features</Text>
              </View>
            </View>
            <View style={styles.actionsGrid}>
              {[
                { icon: CalendarCheck2, title: 'Attendance', color: COLORS.primary, bg: COLORS.primarySoft, route: 'Attendance' },
                { icon: CalendarDays, title: 'Leaves', color: COLORS.green, bg: COLORS.greenSoft, route: 'Leave' },
                { icon: Receipt, title: 'Expenses', color: COLORS.orange, bg: COLORS.orangeSoft, route: 'Expenses' },
                { icon: Users, title: 'Employees', color: COLORS.purple, bg: COLORS.purpleSoft, route: 'Employees' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <Animated.View key={item.title} style={[styles.actionItem, { transform: [{ scale: actionScale[index] }] }]}>
                    <TouchableOpacity activeOpacity={0.85} style={styles.actionCard} onPress={() => navigation?.navigate?.(item.route)}>
                      <View style={[styles.actionIcon, { backgroundColor: item.bg }]}><Icon size={19} color={item.color} /></View>
                      <Text style={styles.actionTitle}>{item.title}</Text>
                      <ChevronRight size={15} color={COLORS.textLight} />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          {/* Holiday banners */}
          <HolidayBanners holidays={dashboard.holidays} />

          <Animated.View style={fadeSlide(summaryAnim)}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Text style={styles.sectionSubtitle}>Your recent activity</Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <SummaryCard icon={CalendarCheck2} title="Attendance" value={String(dashboard.attendance.length)} color={COLORS.primary} bg={COLORS.primarySoft} />
              <SummaryCard icon={CalendarDays} title="Leaves" value={String(dashboard.leaves.length)} color={COLORS.green} bg={COLORS.greenSoft} />
              <SummaryCard icon={WalletCards} title="Expenses" value={String(dashboard.expenses.length)} color={COLORS.orange} bg={COLORS.orangeSoft} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.sectionCard, fadeSlide(leaveAnim)]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Upcoming Leave</Text>
                <Text style={styles.sectionSubtitle}>Latest leave information</Text>
              </View>
              <TouchableOpacity onPress={() => navigation?.navigate?.('Leave')}><ArrowUpRight size={18} color={COLORS.primary} /></TouchableOpacity>
            </View>
            {upcomingLeave ? (
              <View style={styles.leaveRow}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.greenSoft }]}><CalendarDays size={19} color={COLORS.green} /></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.leaveTitle}>{upcomingLeave.leave_type || upcomingLeave.type || 'Leave Request'}</Text>
                  <Text style={styles.leaveSub}>{upcomingLeave.date_from ? `${upcomingLeave.date_from} → ${upcomingLeave.date_to || upcomingLeave.date_from}` : 'Date not available'}</Text>
                </View>
                <Text style={styles.leaveStatus}>{upcomingLeave.status || 'Pending'}</Text>
              </View>
            ) : (
              <View style={styles.emptyState}><Coffee size={22} color={COLORS.textLight} /><Text style={styles.emptyText}>No upcoming leave found</Text></View>
            )}
          </Animated.View>

          <TouchableOpacity activeOpacity={0.85} style={styles.directoryCard} onPress={() => navigation?.navigate?.('Employees')}>
            <View style={styles.directoryIcon}><UserCheck size={21} color={COLORS.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.directoryTitle}>Employee Directory</Text>
              <Text style={styles.directorySub}>View employee information</Text>
            </View>
            <ChevronRight size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={punchModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => (photoPreview ? setPhotoPreview(false) : closePunchModal())}
        >
          <View style={styles.punchModalOverlay}>
            <View style={styles.punchModal}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{punchType === 'in' ? 'Punch In' : 'Punch Out'}</Text>
                  <Text style={styles.modalSubtitle}>{punchType === 'in' ? 'Capture your photo & verify location' : 'Verify your current location'}</Text>
                </View>
                <TouchableOpacity disabled={submittingPunch} style={styles.modalClose} onPress={closePunchModal}><X size={20} color={COLORS.text} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {punchType === 'in' && (
                  <>
                    <View style={styles.photoContainer}>
                      {capturedPhoto ? (
                        <TouchableOpacity activeOpacity={0.9} style={{ flex: 1 }} onPress={() => setPhotoPreview(true)}>
                          <Image source={{ uri: capturedPhoto }} style={styles.capturedPhoto} />
                          <View style={styles.photoHint}><Maximize2 size={12} color="#fff" /><Text style={styles.photoHintText}>Tap to view full</Text></View>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.cameraPlaceholder}>
                          <View style={styles.cameraIconCircle}><Camera size={34} color={COLORS.primary} /></View>
                          <Text style={styles.cameraTitle}>Say Cheese</Text>
                          <Text style={styles.cameraSubtitle}>Capture your photo to continue</Text>
                          {capturingPhoto && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 15 }} />}
                        </View>
                      )}
                    </View>
                    {capturedPhoto && (
                      <TouchableOpacity disabled={capturingPhoto || submittingPunch} style={styles.retakeButton} onPress={retakePunchPhoto}>
                        <RotateCcw size={16} color={COLORS.primary} /><Text style={styles.retakeText}>Retake Photo</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <View style={styles.modalLocationCard}>
                  <View style={styles.modalLocationIcon}><MapPin size={20} color={COLORS.green} /></View>
                  <View style={styles.modalLocationInfo}>
                    <Text style={styles.modalLocationTitle}>Current Location</Text>
                    {locationLoading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={[styles.modalLocationText, { marginLeft: 6 }]}>Detecting location...</Text>
                      </View>
                    ) : currentLocation ? (
                      <>
                        <Text style={styles.modalLocationText} numberOfLines={2}>{currentLocation.text}</Text>
                        <View style={styles.locationVerified}><CheckCircle2 size={12} color={COLORS.green} /><Text style={styles.locationVerifiedText}>Location verified</Text></View>
                      </>
                    ) : (
                      <Text style={styles.modalLocationText}>Location not available</Text>
                    )}
                  </View>
                </View>

                {currentLocation && (
                  <View style={styles.mapPreviewWrap}>
                    <LocationMap latitude={currentLocation.latitude} longitude={currentLocation.longitude} height={150} />
                  </View>
                )}

                {punchType === 'out' && !currentLocation && !locationLoading && (
                  <TouchableOpacity style={styles.retakeButton} onPress={getCurrentLocation}>
                    <RotateCcw size={16} color={COLORS.primary} /><Text style={styles.retakeText}>Retry Location</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={!canSubmitPunch || submittingPunch || capturingPhoto}
                  style={[styles.submitPunchButton, (!canSubmitPunch || submittingPunch || capturingPhoto) && styles.submitPunchDisabled]}
                  onPress={submitPunch}
                >
                  {submittingPunch ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Send size={18} color="#FFFFFF" />
                      <Text style={styles.submitPunchText}>Submit {punchType === 'in' ? 'Punch In' : 'Punch Out'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>

            {photoPreview && !!capturedPhoto && (
              <View style={styles.previewOverlay}>
                <Image source={{ uri: capturedPhoto }} style={styles.previewImage} resizeMode="contain" />
                <TouchableOpacity style={styles.previewClose} onPress={() => setPhotoPreview(false)}><X size={22} color="#fff" /></TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      </View>

      <StatusDialog {...dialog} onClose={closeDialog} />
      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        displayName={displayName}
        email={user?.email || user?.user_email}
        items={DRAWER_ITEMS}
        activeRoute="Home"
        onNavigate={route => navigation?.navigate?.(route)}
        onSignOut={handleSignOut}
      />
      <NotificationSheet visible={notifVisible} onClose={() => setNotifVisible(false)} notif={notif} />
      <GeoStampCapture ref={geoStampRef} />
    </SafeAreaView>
  );
};

const fadeSlide = anim => ({ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] });

const SummaryCard = ({ icon: Icon, title, value, color, bg }) => (
  <View style={styles.summaryCard}>
    <View style={[styles.summaryIcon, { backgroundColor: bg }]}><Icon size={18} color={color} /></View>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryTitle}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:COLORS.primary},container:{flex:1,backgroundColor:COLORS.background},heroHeader:{backgroundColor:COLORS.primary,paddingHorizontal:18,paddingTop:14,paddingBottom:22,borderBottomLeftRadius:32,borderBottomRightRadius:32,elevation:8,shadowColor:COLORS.primaryDark,shadowOpacity:.22,shadowRadius:15,shadowOffset:{width:0,height:7}},heroRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},profileWrap:{flexDirection:'row',alignItems:'center',flex:1},avatar:{width:45,height:45,borderRadius:15,backgroundColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,.22)',marginRight:10},avatarText:{fontSize:18,fontWeight:'900',color:COLORS.white},greeting:{fontSize:10,color:'#CFE1F8',fontWeight:'600'},userName:{fontSize:17,color:COLORS.white,fontWeight:'900',marginTop:2},notificationButton:{width:40,height:40,borderRadius:13,backgroundColor:'rgba(255,255,255,.13)',alignItems:'center',justifyContent:'center'},heroCaption:{fontSize:9,color:'#CFE1F8',marginTop:11,fontWeight:'600'},scrollContent:{padding:16,paddingBottom:35},punchCard:{position:'relative',overflow:'hidden',marginBottom:14,padding:16,borderRadius:23,backgroundColor:COLORS.primary,elevation:6,shadowColor:COLORS.primaryDark,shadowOpacity:.2,shadowRadius:15,shadowOffset:{width:0,height:7}},punchGlowOne:{position:'absolute',width:150,height:150,borderRadius:75,right:-65,top:-80,backgroundColor:'rgba(255,255,255,.07)'},punchGlowTwo:{position:'absolute',width:100,height:100,borderRadius:50,left:-55,bottom:-65,backgroundColor:'rgba(255,255,255,.045)'},punchCardHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},punchTitleArea:{flexDirection:'row',alignItems:'center',flex:1},punchMainIcon:{width:43,height:43,borderRadius:14,backgroundColor:'rgba(255,255,255,.14)',alignItems:'center',justifyContent:'center',marginRight:11,borderWidth:1,borderColor:'rgba(255,255,255,.12)'},punchTitle:{fontSize:14,fontWeight:'900',color:COLORS.white},punchSubtitle:{fontSize:9,color:'#CFE1F8',marginTop:4,fontWeight:'500'},liveBadge:{flexDirection:'row',alignItems:'center',paddingHorizontal:9,paddingVertical:5,borderRadius:10,backgroundColor:'rgba(255,255,255,.12)',borderWidth:1,borderColor:'rgba(255,255,255,.12)'},liveDot:{width:6,height:6,borderRadius:3,backgroundColor:'#55E89A',marginRight:5},liveText:{fontSize:8,fontWeight:'900',color:'#DDF9EA',letterSpacing:.7},punchInfoRow:{flexDirection:'row',alignItems:'center',marginTop:14,paddingVertical:9,paddingHorizontal:10,borderRadius:12,backgroundColor:'rgba(255,255,255,.075)'},punchInfoItem:{flexDirection:'row',alignItems:'center',flex:1},punchInfoText:{marginLeft:6,fontSize:8.5,color:'#CFE1F8',fontWeight:'600'},punchInfoTimer:{color:'#55E89A',fontSize:10,fontWeight:'900',letterSpacing:.4},punchInfoDivider:{width:1,height:18,backgroundColor:'rgba(255,255,255,.15)',marginHorizontal:8},punchButtonsRow:{flexDirection:'row',gap:9,marginTop:12},punchButtonWrapper:{flex:1},punchButton:{minHeight:60,borderRadius:15,paddingHorizontal:11,paddingVertical:9,flexDirection:'row',alignItems:'center'},punchInButton:{backgroundColor:COLORS.white},punchOutButton:{backgroundColor:'rgba(255,255,255,.10)',borderWidth:1,borderColor:'rgba(255,255,255,.20)'},punchDisabledButton:{opacity:.55},punchButtonIcon:{width:37,height:37,borderRadius:12,backgroundColor:'#EEF5FF',alignItems:'center',justifyContent:'center',marginRight:9},punchButtonContent:{flex:1},punchButtonTitle:{fontSize:11,fontWeight:'900',color:COLORS.text},punchButtonSmall:{fontSize:8,color:COLORS.textSecondary,marginTop:3,fontWeight:'600'},disabledPunchText:{color:COLORS.textLight},sectionCard:{backgroundColor:COLORS.white,borderRadius:20,padding:15,marginBottom:14,borderWidth:1,borderColor:COLORS.border},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:13},sectionTitle:{fontSize:14,fontWeight:'900',color:COLORS.text},sectionSubtitle:{fontSize:8.5,color:COLORS.textSecondary,marginTop:3},statusBadge:{flexDirection:'row',alignItems:'center',paddingHorizontal:9,paddingVertical:6,borderRadius:10},statusDot:{width:6,height:6,borderRadius:3,marginRight:5},statusText:{fontSize:8,fontWeight:'900'},attendanceGrid:{flexDirection:'row',gap:8},attendanceBox:{flex:1,padding:10,borderRadius:14,backgroundColor:'#F8FAFD'},smallIcon:{width:31,height:31,borderRadius:10,alignItems:'center',justifyContent:'center',marginBottom:8},boxLabel:{fontSize:8,color:COLORS.textSecondary,fontWeight:'600'},boxValue:{fontSize:10,color:COLORS.text,fontWeight:'900',marginTop:3},actionsGrid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:14},actionItem:{width:'48%'},actionCard:{backgroundColor:COLORS.white,borderWidth:1,borderColor:COLORS.border,borderRadius:16,padding:11,flexDirection:'row',alignItems:'center'},actionIcon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center'},actionTitle:{fontSize:9.5,fontWeight:'800',color:COLORS.text,flex:1,marginLeft:8},summaryRow:{flexDirection:'row',gap:9,marginBottom:14},summaryCard:{flex:1,backgroundColor:COLORS.white,borderRadius:17,padding:12,borderWidth:1,borderColor:COLORS.border},summaryIcon:{width:34,height:34,borderRadius:11,alignItems:'center',justifyContent:'center',marginBottom:8},summaryValue:{fontSize:19,fontWeight:'900',color:COLORS.text},summaryTitle:{fontSize:8,color:COLORS.textSecondary,marginTop:2,fontWeight:'700'},leaveRow:{flexDirection:'row',alignItems:'center',padding:11,borderRadius:14,backgroundColor:'#F8FAFD'},leaveTitle:{fontSize:10,fontWeight:'900',color:COLORS.text},leaveSub:{fontSize:8,color:COLORS.textSecondary,marginTop:4},leaveStatus:{fontSize:8,fontWeight:'900',color:COLORS.primary},emptyState:{alignItems:'center',justifyContent:'center',paddingVertical:18},emptyText:{fontSize:9,color:COLORS.textLight,marginTop:7},directoryCard:{backgroundColor:COLORS.white,borderRadius:18,padding:13,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:COLORS.border,marginBottom:15},directoryIcon:{width:42,height:42,borderRadius:13,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',marginRight:10},directoryTitle:{fontSize:11,fontWeight:'900',color:COLORS.text},directorySub:{fontSize:8,color:COLORS.textSecondary,marginTop:3},loader:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.background},loaderText:{marginTop:10,fontSize:10,color:COLORS.textSecondary,fontWeight:'700'},punchModalOverlay:{flex:1,backgroundColor:'rgba(7,27,55,.65)',justifyContent:'flex-end'},punchModal:{backgroundColor:'#FFF',borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:18,paddingTop:18,paddingBottom:28,maxHeight:'88%'},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:15},modalTitle:{fontSize:19,fontWeight:'900',color:COLORS.text},modalSubtitle:{fontSize:9,color:COLORS.textSecondary,marginTop:4},modalClose:{width:38,height:38,borderRadius:12,backgroundColor:'#F1F5F9',alignItems:'center',justifyContent:'center'},photoContainer:{width:'100%',height:245,borderRadius:20,overflow:'hidden',backgroundColor:'#F3F7FC',borderWidth:1,borderColor:COLORS.border},capturedPhoto:{width:'100%',height:'100%',resizeMode:'cover'},cameraPlaceholder:{flex:1,alignItems:'center',justifyContent:'center'},cameraIconCircle:{width:70,height:70,borderRadius:23,backgroundColor:COLORS.primarySoft,alignItems:'center',justifyContent:'center'},cameraTitle:{marginTop:13,fontSize:17,color:COLORS.text,fontWeight:'900'},cameraSubtitle:{marginTop:5,fontSize:9,color:COLORS.textSecondary},retakeButton:{alignSelf:'center',marginTop:10,marginBottom:4,flexDirection:'row',alignItems:'center',paddingHorizontal:13,paddingVertical:8,borderRadius:10,backgroundColor:COLORS.primarySoft},retakeText:{marginLeft:5,fontSize:9,color:COLORS.primary,fontWeight:'900'},modalLocationCard:{marginTop:14,padding:12,borderRadius:16,backgroundColor:'#F8FAFD',flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#EEF2F7'},modalLocationIcon:{width:42,height:42,borderRadius:13,backgroundColor:COLORS.greenSoft,alignItems:'center',justifyContent:'center'},modalLocationInfo:{flex:1,marginLeft:10},modalLocationTitle:{fontSize:10,color:COLORS.text,fontWeight:'900'},modalLocationText:{marginTop:4,fontSize:8,color:COLORS.textSecondary,lineHeight:13},locationVerified:{flexDirection:'row',alignItems:'center',marginTop:5},locationVerifiedText:{marginLeft:4,fontSize:7.5,color:COLORS.green,fontWeight:'800'},mapPreviewWrap:{marginTop:12,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:COLORS.border},mapPreview:{width:'100%',height:150},submitPunchButton:{height:52,marginTop:16,borderRadius:15,backgroundColor:COLORS.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',elevation:4,shadowColor:COLORS.primaryDark,shadowOpacity:.18,shadowRadius:8,shadowOffset:{width:0,height:4}},submitPunchText:{marginLeft:8,color:'#FFF',fontSize:11,fontWeight:'900'},submitPunchDisabled:{opacity:.45},

  punctualityBadge:{paddingHorizontal:9,paddingVertical:6,borderRadius:10},punctualityText:{fontSize:8,fontWeight:'900'},monthPill:{backgroundColor:COLORS.primarySoft,paddingHorizontal:10,paddingVertical:6,borderRadius:10},monthPillText:{fontSize:8,fontWeight:'900',color:COLORS.primary},overviewGrid:{flexDirection:'row',gap:7},overviewChip:{flex:1,borderRadius:13,paddingVertical:10,alignItems:'center'},overviewChipValue:{fontSize:15,fontWeight:'900'},overviewChipLabel:{fontSize:7.5,color:COLORS.textSecondary,fontWeight:'700',marginTop:3},overviewBarTrack:{flexDirection:'row',height:7,borderRadius:4,overflow:'hidden',marginTop:14,backgroundColor:'#F1F5F9'},overviewBarSeg:{height:'100%'},overviewFootnote:{fontSize:8,color:COLORS.textSecondary,marginTop:9,fontWeight:'600'},

  // New: bell badge + full photo preview
  bellBadge:{position:'absolute',top:-4,right:-4,minWidth:18,height:18,paddingHorizontal:4,borderRadius:9,backgroundColor:'#EF4444',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:COLORS.primary},bellBadgeText:{color:'#fff',fontSize:9,fontWeight:'900'},
  photoHint:{position:'absolute',bottom:10,right:10,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(0,0,0,.55)',paddingHorizontal:9,paddingVertical:5,borderRadius:10,gap:5},photoHintText:{color:'#fff',fontSize:9,fontWeight:'700'},
  previewOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:'#000',justifyContent:'center'},previewImage:{width:'100%',height:'100%'},previewClose:{position:'absolute',top:48,right:18,width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center'},
});

export default DashboardScreen;