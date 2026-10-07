import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';

import client, { endpoints } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  isPaidLeaveEligible,
  isHonourLeaveEligible,
  daysUntilEligible,
  getPaidLeaveUnlockDate,
} from '../utils/leaveUtils';
import ScreenShell from '../components/ScreenShell';
import {
  SelectField,
  DateField,
  FilePickerRow,
  StatusBadge,
  formatDate,
  colors,
  ui,
} from '../components/FormParts';

const REQUEST_TYPES = [
  { value: 'Leave', label: 'Leave' },
  { value: 'WFH', label: 'Work From Home' },
  { value: 'Att-Adjustment', label: 'Attendance Adjustment' },
];

const EMPTY_FORM = {
  requestType: '',
  fromDate: '',
  toDate: '',
  leaveType: '',
  note: '',
  attachment: null,
};

const DEFAULT_BALANCE = {
  comp_off: 0,
  earn_leave: 0,
  used_paid_leave: 0,
  used_unpaid_leave: 0,
  paid_leave_annual_quota: 12,
  unpaid_leave_annual_quota: 24,
};

export default function LeaveScreen({ navigation }) {
  const { user } = useAuth();
  const userId = user?.id;
  const userType = user?.user_type || user?.role;

  const [activeView, setActiveView] = useState('pending');
  const [allLeaves, setAllLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  /* ---------- LOADERS (same endpoints as web) ---------- */

  const fetchAllLeaves = useCallback(async () => {
    try {
      let allowedIds = [Number(userId)];

      if (userType === 'Admin' || userType === 'Manager') {
        const { data } = await client.get(endpoints.users);
        const users = Array.isArray(data) ? data : data?.results || [];

        if (userType === 'Admin') {
          const managerIds = users
            .filter((u) => u.user_type === 'Manager' && Number(u.created_by) === Number(userId))
            .map((u) => u.id);
          allowedIds = users
            .filter(
              (u) =>
                u.user_type === 'Employee' &&
                (Number(u.created_by) === Number(userId) || managerIds.includes(Number(u.created_by)))
            )
            .map((u) => u.id);
        } else {
          allowedIds = users
            .filter((u) => u.user_type === 'Employee' && Number(u.created_by) === Number(userId))
            .map((u) => u.id);
        }
      }

      const { data } = await client.get(endpoints.regularization);
      const rows = Array.isArray(data) ? data : data?.results || [];
      setAllLeaves(
        rows
          .filter((l) => allowedIds.includes(Number(l.user)))
          .sort((a, b) => new Date(b.requested_on) - new Date(a.requested_on))
      );
    } catch (e) {
      console.log('Leave fetch error:', e?.response?.data || e.message);
    }
  }, [userId, userType]);

  const fetchLeaveBalance = useCallback(async () => {
    try {
      const { data } = await client.get(`${endpoints.leaveBalance}${userId}/`);
      setLeaveBalance(data);
    } catch (e) {
      if (e?.response?.status === 404) setLeaveBalance(DEFAULT_BALANCE);
      else console.log('Leave balance error:', e?.response?.data || e.message);
    }
  }, [userId]);

  const fetchJobDetails = useCallback(async () => {
    try {
      const { data } = await client.get(`${endpoints.jobDetails}${userId}/`);
      setJobDetails(data);
    } catch (e) {
      console.log('Job details error:', e?.response?.data || e.message);
    }
  }, [userId]);

  const fetchOrg = useCallback(async () => {
    try {
      const { data } = await client.get(endpoints.orgByUser(userId));
      setOrgDetails(Array.isArray(data) ? data[0] : data);
    } catch (e) {
      console.log('Org details error:', e?.response?.data || e.message);
    }
  }, [userId]);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    await Promise.all([fetchAllLeaves(), fetchLeaveBalance(), fetchJobDetails(), fetchOrg()]);
    setLoading(false);
  }, [userId, fetchAllLeaves, fetchLeaveBalance, fetchJobDetails, fetchOrg]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  /* ---------- SUBMIT (same payload as web) ---------- */

  const submit = async () => {
    if (!orgDetails) return Alert.alert('Leave', 'Organization details not loaded yet.');
    if (!form.fromDate || !form.toDate) return Alert.alert('Leave', 'Please select both from and to dates.');
    if (new Date(form.toDate) < new Date(form.fromDate))
      return Alert.alert('Leave', "'To' date cannot be before 'From' date.");
    if (!form.requestType) return Alert.alert('Leave', 'Please select a request type.');
    if (!form.leaveType) return Alert.alert('Leave', 'Please select a leave type.');

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append('request_type', form.requestType);
      payload.append('date_from', form.fromDate);
      payload.append('date_to', form.toDate);
      payload.append('leave_type', form.leaveType);
      payload.append('note', form.note);
      payload.append('user', String(userId));
      payload.append('next_approver', String(orgDetails.manager_to_manager ?? ''));
      payload.append('last_action_by', String(orgDetails.reports_to ?? ''));
      if (form.attachment) payload.append('attachment', form.attachment);

      await client.post(endpoints.regularization, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (d) => d, // keep RN FormData intact
      });

      setForm(EMPTY_FORM);
      setShowForm(false);
      Alert.alert('Success', 'Leave request submitted successfully.');
      fetchAllLeaves();
    } catch (e) {
      Alert.alert(
        'Unable to submit',
        e?.response?.data?.detail || e?.response?.data?.error || 'Unable to submit leave request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- BALANCE CARDS ---------- */

  const joining = jobDetails?.date_of_joining;
  const paidEligible = isPaidLeaveEligible(joining);
  const earnEligible = isHonourLeaveEligible(joining);

  const renderBalance = () => {
    const paidQuota = leaveBalance?.paid_leave_annual_quota ?? 12;
    const unpaidQuota = leaveBalance?.unpaid_leave_annual_quota ?? 24;
    const paidUsed = leaveBalance?.used_paid_leave ?? 0;
    const unpaidUsed = leaveBalance?.used_unpaid_leave ?? 0;

    const cards = [
      { key: 'paid', label: 'Paid Leave', left: Math.max(paidQuota - paidUsed, 0), used: paidUsed, quota: paidQuota, color: '#3B5BDB', bg: '#EEF2FF', icon: '▣', locked: !paidEligible },
      { key: 'comp', label: 'Comp Off', left: leaveBalance?.comp_off ?? 0, color: '#0CA678', bg: '#ECFDF5', icon: '↻' },
      { key: 'unpaid', label: 'Unpaid Leave', left: Math.max(unpaidQuota - unpaidUsed, 0), used: unpaidUsed, quota: unpaidQuota, color: '#F03E3E', bg: '#FFF5F5', icon: '✕' },
      { key: 'earn', label: 'Earn Leave', left: leaveBalance?.earn_leave ?? 0, used: 0, quota: 6, color: '#9C36B5', bg: '#F8F0FC', icon: '★', locked: !earnEligible },
    ];

    const days = daysUntilEligible(joining);

    return (
      <View style={{ marginBottom: 8 }}>
        {!paidEligible && joining ? (
          <View style={s.banner}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔒</Text>
            <Text style={{ flex: 1, fontSize: 12, color: '#8A5A00' }}>
              <Text style={{ fontWeight: '800' }}>Paid leaves locked</Text> — unlocks in {days} day
              {days !== 1 ? 's' : ''} on {getPaidLeaveUnlockDate(joining)}
            </Text>
          </View>
        ) : null}

        <View style={s.grid}>
          {cards.map((c) => {
            const pct = c.quota ? Math.min(((c.used || 0) / c.quota) * 100, 100) : 0;
            return (
              <View key={c.key} style={[s.balCard, { borderTopColor: c.color }, c.locked && { opacity: 0.6 }]}>
                {c.locked ? <Text style={s.lockBadge}>🔒 Locked</Text> : null}
                <View style={[s.balIcon, { backgroundColor: c.bg }]}>
                  <Text style={{ color: c.color, fontSize: 16, fontWeight: '800' }}>{c.icon}</Text>
                </View>
                <Text style={s.balValue}>
                  {c.left} <Text style={s.balLeft}>left</Text>
                </Text>
                <Text style={s.balLabel}>{c.label}</Text>
                {c.quota ? (
                  <>
                    <View style={s.track}>
                      <View style={[s.fill, { width: `${pct}%`, backgroundColor: c.color }]} />
                    </View>
                    <View style={s.metaRow}>
                      <Text style={s.meta}>{c.used} used</Text>
                      <Text style={s.meta}>{c.quota} total</Text>
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  /* ---------- LIST ---------- */

  const pendingLeaves = allLeaves.filter((l) => l.status === 'Pending');
  const rows = activeView === 'pending' ? pendingLeaves : allLeaves;

  const renderLeave = (d, i) => (
    <View key={d.id || i} style={ui.card}>
      <View style={s.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={s.pill}>
            <Text style={s.pillText}>{d.leave_type || d.request_type || 'No leave type'}</Text>
          </View>
          <Text style={s.applied}>Applied: {formatDate(d.requested_on)}</Text>
        </View>
        <StatusBadge status={d.status} />
      </View>

      <View style={s.dates}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>From</Text>
          <Text style={s.fieldVal}>{formatDate(d.date_from, false)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>To</Text>
          <Text style={s.fieldVal}>{formatDate(d.date_to, false)}</Text>
        </View>
      </View>

      {d.note ? (
        <View style={{ marginTop: 10 }}>
          <Text style={s.fieldLabel}>Note</Text>
          <Text style={s.fieldVal}>{d.note}</Text>
        </View>
      ) : null}

      {d.remarks || d.attachment ? (
        <View style={[s.rowBetween, { marginTop: 10 }]}>
          {d.remarks ? <Text style={{ flex: 1, fontSize: 12, color: colors.muted }}>HR Remarks: {d.remarks}</Text> : <View />}
          {d.attachment ? (
            <TouchableOpacity style={s.pill} onPress={() => Linking.openURL(d.attachment)}>
              <Text style={s.pillText}>View attachment</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  /* ---------- UI ---------- */

  return (
    <ScreenShell title="Leave" subtitle="Manage your leave requests" navigation={navigation}>

      <ScrollView
        contentContainerStyle={ui.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {leaveBalance && jobDetails ? renderBalance() : null}

        <TouchableOpacity style={s.applyBtn} onPress={() => setShowForm(true)}>
          <Text style={s.applyPlus}>+</Text>
          <Text style={s.applyText}>Apply leave</Text>
        </TouchableOpacity>

        <View style={s.toggle}>
          {[
            ['pending', 'Pending leaves'],
            ['all', 'All leaves'],
          ].map(([k, label]) => (
            <TouchableOpacity key={k} style={[s.toggleBtn, activeView === k && s.toggleActive]} onPress={() => setActiveView(k)}>
              <Text style={[s.toggleText, activeView === k && { color: '#fff' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{activeView === 'pending' ? 'Pending leaves' : 'All leaves'}</Text>
          {rows.length > 0 ? (
            <View style={s.count}>
              <Text style={s.countText}>{rows.length}</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 30 }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : rows.length === 0 ? (
          <View style={ui.empty}>
            <Text style={{ fontSize: 28 }}>🗓</Text>
            <Text style={{ color: colors.muted, marginTop: 8 }}>
              {activeView === 'pending' ? 'No pending leave requests' : 'No leave records found'}
            </Text>
          </View>
        ) : (
          rows.map(renderLeave)
        )}
      </ScrollView>

      {/* ---------- APPLY LEAVE MODAL ---------- */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={ui.safe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Apply Leave</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={{ fontSize: 28, color: colors.muted }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <SelectField label="Request Type" value={form.requestType} options={REQUEST_TYPES} onChange={(v) => setField('requestType', v)} />

            <DateField label="From" value={form.fromDate} onChange={(v) => setField('fromDate', v)} />
            <DateField label="To" value={form.toDate} minimumDate={form.fromDate} onChange={(v) => setField('toDate', v)} />

            <SelectField
              label="Leave Type"
              value={form.leaveType}
              onChange={(v) => setField('leaveType', v)}
              options={[
                { value: 'Paid-Leave', label: `Paid Leave${!paidEligible ? ' (locked — 3 months required)' : ''}`, disabled: !paidEligible },
                { value: 'Unpaid-Leave', label: 'Unpaid Leave' },
                { value: 'Comp-Offs', label: 'Comp Offs' },
                { value: 'Earn-Leave', label: `Earn Leave${!earnEligible ? ' (locked — 1 year required)' : ''}`, disabled: !earnEligible },
              ]}
            />

            <FilePickerRow
              label="Attachment"
              file={form.attachment}
              onPick={(f) => setField('attachment', f)}
              onClear={() => setField('attachment', null)}
            />

            <Text style={ui.label}>Note</Text>
            <TextInput
              style={[ui.input, ui.textArea]}
              multiline
              value={form.note}
              onChangeText={(v) => setField('note', v)}
              placeholder="Add a note..."
              placeholderTextColor="#A3ADBC"
            />

            <TouchableOpacity style={[ui.primaryBtn, submitting && { opacity: 0.6 }]} disabled={submitting} onPress={submit}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryBtnText}>Submit</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={ui.secondaryBtn} onPress={() => setShowForm(false)}>
              <Text style={ui.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF6E0', borderRadius: 12, padding: 12, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  balCard: { width: '48%', backgroundColor: '#fff', borderRadius: 14, padding: 12, borderTopWidth: 3 },
  lockBadge: { position: 'absolute', top: 8, right: 8, fontSize: 9, color: '#8A95A8', fontWeight: '700' },
  balIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  balValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8 },
  balLeft: { fontSize: 11, fontWeight: '500', color: colors.muted },
  balLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  track: { height: 4, backgroundColor: '#EEF1F6', borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  meta: { fontSize: 10, color: colors.muted },
  applyBtn: { backgroundColor: colors.primary, borderRadius: 14, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  applyPlus: { color: '#fff', fontSize: 22, marginRight: 8, marginTop: -2 },
  applyText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  toggle: { flexDirection: 'row', backgroundColor: '#EAEFF6', borderRadius: 12, padding: 4, marginTop: 14 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleActive: { backgroundColor: '#2F6FE4' },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#53627A' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#172B4D' },
  count: { backgroundColor: '#E5EDFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  countText: { fontSize: 11, fontWeight: '800', color: '#2F6FE4' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pill: { alignSelf: 'flex-start', backgroundColor: '#E8EFFF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 11, fontWeight: '700', color: '#2152C4' },
  applied: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  dates: { flexDirection: 'row', marginTop: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  fieldVal: { fontSize: 13, color: colors.text, marginTop: 2 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#E8EFFF' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
});