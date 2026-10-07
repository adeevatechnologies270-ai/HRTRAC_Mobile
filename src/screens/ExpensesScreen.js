import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import client, { endpoints } from '../api/client';
import { useAuth } from '../context/AuthContext';
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

const CATEGORIES = ['Travel', 'Food', 'Hotel', 'Transport', 'Office', 'Other'].map((c) => ({ value: c, label: c }));
const CURRENCIES = [
  ['INR', 'India'], ['USD', 'USA'], ['CAD', 'Canada'], ['AUD', 'Australia'],
  ['NZD', 'New Zealand'], ['GBP', 'UK'], ['EUR', 'Europe'], ['AED', 'UAE'],
].map(([v, n]) => ({ value: v, label: `${v} - ${n}` }));

const INITIAL = {
  expanse_date_from: '',
  expanse_date_to: '',
  location: '',
  purpose: '',
  currency: '',
  amount: '',
  category: '',
  remarks: '',
};
const INITIAL_FILTERS = { status: '', category: '', department: '', location: '', employee: '' };

const userIdOf = (e) => (typeof e.user === 'object' ? e.user?.id : e.user);
const nameOf = (e) =>
  e.user_name ||
  (typeof e.user === 'object' ? `${e.user?.first_name || ''} ${e.user?.last_name || ''}`.trim() : '') ||
  '---';
const invoicesOf = (e) =>
  [e.upload_invoice1, e.upload_invoice2, e.upload_invoice3, e.upload_invoice4].filter(Boolean);
const amountOf = (e) => (e.amount === undefined || e.amount === null ? '---' : `${e.currency || ''} ${e.amount}`);

export default function ExpensesScreen({ navigation }) {
  const { user } = useAuth();
  const userId = user?.id;
  const role = String(user?.role || user?.user_type || '').toLowerCase();
  const canReview = ['admin', 'manager', 'team lead', 'team_lead'].includes(role);

  const [expenses, setExpenses] = useState([]);
  const [orgDetails, setOrgDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(INITIAL);
  const [files, setFiles] = useState([null]);

  const [selected, setSelected] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  /* ---------- LOAD ---------- */

  const fetchExpenses = useCallback(async () => {
    try {
      const { data } = await client.get(endpoints.expenses(userId));
      setExpenses(Array.isArray(data) ? data : data?.results || []);
    } catch (e) {
      console.log('Expenses fetch error:', e?.response?.data || e.message);
      setExpenses([]);
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
    await Promise.all([fetchExpenses(), fetchOrg()]);
    setLoading(false);
  }, [userId, fetchExpenses, fetchOrg]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  /* ---------- FILTER / SUMMARY ---------- */

  const options = useMemo(() => {
    const uniq = (arr) => [...new Set(arr.filter(Boolean))];
    const empMap = new Map();
    expenses.forEach((e) => {
      const id = userIdOf(e);
      if (id !== undefined && id !== null) empMap.set(String(id), nameOf(e) === '---' ? `User ${id}` : nameOf(e));
    });
    return {
      employees: [...empMap].map(([value, label]) => ({ value, label })),
      departments: uniq(expenses.map((e) => e.department || e.department_name)).map((v) => ({ value: v, label: v })),
      locations: uniq(expenses.map((e) => e.location)).map((v) => ({ value: v, label: v })),
      categories: uniq(expenses.map((e) => e.category)).map((v) => ({ value: v, label: v })),
    };
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return expenses.filter((e) => {
      const matchesSearch =
        !q ||
        [nameOf(e), e.purpose, e.location, e.category].some((v) => String(v || '').toLowerCase().includes(q));
      return (
        matchesSearch &&
        (!filters.status || String(e.status || '').toLowerCase() === filters.status.toLowerCase()) &&
        (!filters.category || e.category === filters.category) &&
        (!filters.department || (e.department || e.department_name) === filters.department) &&
        (!filters.location || e.location === filters.location) &&
        (!filters.employee || String(userIdOf(e)) === String(filters.employee))
      );
    });
  }, [expenses, search, filters]);

  const summary = useMemo(() => {
    const count = (s) => expenses.filter((e) => String(e.status || '').toLowerCase() === s).length;
    return { total: expenses.length, pending: count('pending'), approved: count('approved'), rejected: count('rejected') };
  }, [expenses]);

  const hasFilters = !!search || Object.values(filters).some(Boolean);
  const clearFilters = () => {
    setSearch('');
    setFilters(INITIAL_FILTERS);
  };

  /* ---------- FORM ---------- */

  const openAdd = () => {
    setForm(INITIAL);
    setFiles([null]);
    setIsEdit(false);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (e) => {
    setSelected(null);
    setIsEdit(true);
    setEditId(e.id);
    setForm({
      expanse_date_from: e.expanse_date_from || '',
      expanse_date_to: e.expanse_date_to || '',
      location: e.location || '',
      purpose: e.purpose || '',
      currency: e.currency || '',
      amount: e.amount !== undefined && e.amount !== null ? String(e.amount) : '',
      category: e.category || '',
      remarks: e.remarks || '',
    });
    setFiles([null]);
    setShowForm(true);
  };

  const setFileAt = (i, f) => setFiles((p) => p.map((x, idx) => (idx === i ? f : x)));
  const addFileRow = () => files.length < 4 && setFiles((p) => [...p, null]);
  const removeFileRow = (i) => files.length > 1 && setFiles((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!form.expanse_date_from) return Alert.alert('Expense', 'Please select From date.');
    if (!form.expanse_date_to) return Alert.alert('Expense', 'Please select To date.');
    if (!form.purpose.trim()) return Alert.alert('Expense', 'Please enter purpose.');
    if (!form.amount) return Alert.alert('Expense', 'Please enter amount.');

    try {
      setSaving(true);
      const payload = new FormData();
      Object.keys(form).forEach((k) => payload.append(k, form[k] || ''));
      files.forEach((f, i) => f && payload.append(`upload_invoice${i + 1}`, f));
      payload.append('user', String(userId));
      if (orgDetails?.manager_to_manager) payload.append('next_approver', String(orgDetails.manager_to_manager));
      if (orgDetails?.reports_to) payload.append('last_action_by', String(orgDetails.reports_to));

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (d) => d,
      };
      if (isEdit) await client.put(endpoints.updateExpense(editId), payload, config);
      else await client.post(endpoints.createExpense, payload, config);

      setShowForm(false);
      await fetchExpenses();
    } catch (e) {
      Alert.alert('Unable to save', e?.response?.data?.detail || e?.response?.data?.message || 'Unable to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (id) =>
    Alert.alert('Delete expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSelected(null);
            await client.delete(endpoints.deleteExpense(id));
            await fetchExpenses();
          } catch (e) {
            Alert.alert('Error', e?.response?.data?.detail || 'Unable to delete expense.');
          }
        },
      },
    ]);

  const isOwn = (e) => String(userIdOf(e)) === String(userId);

  /* ---------- UI ---------- */

  const stat = (label, value, bg, color, icon) => (
    <View style={s.statCard} key={label}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Text style={{ color, fontSize: 16, fontWeight: '800' }}>{icon}</Text>
      </View>
      <View>
        <Text style={s.statLabel}>{label}</Text>
        <Text style={s.statValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <ScreenShell title="Expenses" subtitle="Manage and track your expense requests" navigation={navigation}>

      <ScrollView
        contentContainerStyle={ui.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.statGrid}>
          {stat('Total Expenses', summary.total, '#EAF2FF', '#2860C8', '▤')}
          {stat('Pending', summary.pending, '#FFF1DD', '#D7831F', '⧗')}
          {stat('Approved', summary.approved, '#DDF7E8', '#159447', '✓')}
          {stat('Rejected', summary.rejected, '#FFE5E5', '#D64545', '✕')}
        </View>

        <TouchableOpacity style={ui.primaryBtn} onPress={openAdd}>
          <Text style={[ui.primaryBtnText, { fontSize: 18, marginRight: 8 }]}>+</Text>
          <Text style={ui.primaryBtnText}>Add Expense</Text>
        </TouchableOpacity>

        <View style={s.listHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.listTitle}>{canReview ? 'Expense Requests' : 'My Expenses'}</Text>
            <Text style={s.listSub}>
              {canReview ? 'Review expenses available to your account' : 'View and manage your submitted expenses'}
            </Text>
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilters(true)}>
            <Text style={s.filterText}>⏷ Filters{Object.values(filters).some(Boolean) ? ' •' : ''}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search expenses..."
            placeholderTextColor="#A3ADBC"
          />
          <Text style={s.records}>{filtered.length} records</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <View style={ui.empty}>
            <Text style={{ fontSize: 28 }}>🧾</Text>
            <Text style={s.emptyTitle}>No expenses found</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              {hasFilters ? 'Try changing your filters.' : 'No expense records are available.'}
            </Text>
            {hasFilters ? (
              <TouchableOpacity style={[ui.secondaryBtn, { paddingHorizontal: 20 }]} onPress={clearFilters}>
                <Text style={ui.secondaryBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          filtered.map((e) => (
            <TouchableOpacity key={e.id} style={ui.card} activeOpacity={0.8} onPress={() => setSelected(e)}>
              <View style={s.rowBetween}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={s.purpose}>{e.purpose || '---'}</Text>
                  {e.category ? <Text style={s.small}>{e.category}</Text> : null}
                </View>
                <StatusBadge status={e.status || 'Pending'} />
              </View>

              {canReview ? <Text style={s.employee}>👤 {nameOf(e)}</Text> : null}

              <View style={[s.rowBetween, { marginTop: 10, alignItems: 'center' }]}>
                <Text style={s.amount}>{amountOf(e)}</Text>
                <Text style={s.small}>
                  {formatDate(e.expanse_date_from, false)} → {formatDate(e.expanse_date_to)}
                </Text>
              </View>

              <View style={[s.rowBetween, { marginTop: 8, alignItems: 'center' }]}>
                <Text style={s.small}>{e.location || '---'}</Text>
                <Text style={s.small}>📎 {invoicesOf(e).length}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ---------- ADD / EDIT MODAL ---------- */}
      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={ui.safe}>
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalTitle}>{isEdit ? 'Update Expense' : 'Add Expense'}</Text>
              <Text style={s.small}>{isEdit ? 'Update your expense details' : 'Submit a new expense request'}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={{ fontSize: 28, color: colors.muted }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
            <Text style={s.formSection}>Expense Details</Text>

            <DateField label="From Date" value={form.expanse_date_from} onChange={(v) => setField('expanse_date_from', v)} />
            <DateField label="To Date" value={form.expanse_date_to} minimumDate={form.expanse_date_from} onChange={(v) => setField('expanse_date_to', v)} />

            <Text style={ui.label}>Location</Text>
            <TextInput style={ui.input} value={form.location} onChangeText={(v) => setField('location', v)} placeholder="Enter location" placeholderTextColor="#A3ADBC" />

            <Text style={ui.label}>Purpose</Text>
            <TextInput style={ui.input} value={form.purpose} onChangeText={(v) => setField('purpose', v)} placeholder="e.g. Client meeting" placeholderTextColor="#A3ADBC" />

            <SelectField label="Category" placeholder="Select category" value={form.category} options={CATEGORIES} onChange={(v) => setField('category', v)} />
            <SelectField label="Currency" placeholder="Select currency" value={form.currency} options={CURRENCIES} onChange={(v) => setField('currency', v)} />

            <Text style={ui.label}>Amount</Text>
            <TextInput
              style={ui.input}
              value={form.amount}
              onChangeText={(v) => setField('amount', v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
              placeholderTextColor="#A3ADBC"
            />

            <View style={[s.rowBetween, { marginTop: 14 }]}>
              <Text style={[ui.label, { marginTop: 0 }]}>Invoices</Text>
              <Text style={s.small}>Maximum 4 files</Text>
            </View>
            {files.map((f, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <FilePickerRow file={f} onPick={(x) => setFileAt(i, x)} onClear={() => setFileAt(i, null)} />
                <View style={s.fileActions}>
                  {files.length > 1 ? (
                    <TouchableOpacity onPress={() => removeFileRow(i)}>
                      <Text style={{ color: '#D64545', fontSize: 12, fontWeight: '700' }}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                  {i === files.length - 1 && files.length < 4 ? (
                    <TouchableOpacity onPress={addFileRow}>
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Add another</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
            {isEdit ? <Text style={s.small}>Leave invoices empty to keep the existing ones (depends on your backend).</Text> : null}

            <Text style={ui.label}>Remarks</Text>
            <TextInput
              style={[ui.input, ui.textArea]}
              multiline
              value={form.remarks}
              onChangeText={(v) => setField('remarks', v)}
              placeholder="Add additional remarks..."
              placeholderTextColor="#A3ADBC"
            />

            <TouchableOpacity style={[ui.primaryBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={submit}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryBtnText}>{isEdit ? 'Update Expense' : 'Submit Expense'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={ui.secondaryBtn} onPress={() => setShowForm(false)}>
              <Text style={ui.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ---------- FILTER MODAL ---------- */}
      <Modal visible={showFilters} animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <SafeAreaView style={ui.safe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Filter Expenses</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={{ fontSize: 28, color: colors.muted }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {canReview ? (
              <SelectField label="Employee" placeholder="All Employees" value={filters.employee} options={options.employees} onChange={(v) => setFilters((p) => ({ ...p, employee: v }))} />
            ) : null}
            {canReview ? (
              <SelectField label="Department" placeholder="All Departments" value={filters.department} options={options.departments} onChange={(v) => setFilters((p) => ({ ...p, department: v }))} />
            ) : null}
            <SelectField label="Location" placeholder="All Locations" value={filters.location} options={options.locations} onChange={(v) => setFilters((p) => ({ ...p, location: v }))} />
            <SelectField label="Category" placeholder="All Categories" value={filters.category} options={options.categories} onChange={(v) => setFilters((p) => ({ ...p, category: v }))} />
            <SelectField
              label="Status"
              placeholder="All Status"
              value={filters.status}
              options={['Pending', 'Approved', 'Rejected'].map((v) => ({ value: v, label: v }))}
              onChange={(v) => setFilters((p) => ({ ...p, status: v }))}
            />
            <TouchableOpacity style={ui.primaryBtn} onPress={() => setShowFilters(false)}>
              <Text style={ui.primaryBtnText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ui.secondaryBtn} onPress={clearFilters}>
              <Text style={ui.secondaryBtnText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ---------- DETAILS MODAL ---------- */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={ui.safe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Expense Details</Text>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={{ fontSize: 28, color: colors.muted }}>×</Text>
            </TouchableOpacity>
          </View>
          {selected ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              <View style={ui.card}>
                {canReview ? <Detail label="Employee" value={nameOf(selected)} /> : null}
                <Detail label="Purpose" value={selected.purpose || '---'} />
                <Detail label="Amount" value={amountOf(selected)} />
                <Detail label="Category" value={selected.category || '---'} />
                <Detail label="Location" value={selected.location || '---'} />
                <Detail label="From" value={formatDate(selected.expanse_date_from)} />
                <Detail label="To" value={formatDate(selected.expanse_date_to)} />
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Status</Text>
                  <StatusBadge status={selected.status || 'Pending'} />
                </View>
                {canReview ? <Detail label="HR Review" value={selected.remark_hr || '---'} /> : null}
              </View>

              <View style={ui.card}>
                <Text style={s.detailLabel}>Remarks</Text>
                <Text style={{ color: colors.text, marginTop: 4 }}>{selected.remarks || 'No remarks added.'}</Text>
              </View>

              <View style={ui.card}>
                <Text style={s.detailLabel}>Invoices</Text>
                {invoicesOf(selected).length === 0 ? (
                  <Text style={{ color: colors.muted, marginTop: 4 }}>No invoices uploaded.</Text>
                ) : (
                  invoicesOf(selected).map((url, i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.invoiceBtn}
                      onPress={() => (/\.pdf($|\?)/i.test(url) ? Linking.openURL(url) : setPreviewImg(url))}
                    >
                      <Text style={{ color: '#2152C4', fontWeight: '700', fontSize: 13 }}>🖼 Invoice {i + 1}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {isOwn(selected) ? (
                <>
                  <TouchableOpacity style={ui.primaryBtn} onPress={() => openEdit(selected)}>
                    <Text style={ui.primaryBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[ui.secondaryBtn, { borderColor: '#F3B5B5' }]} onPress={() => remove(selected.id)}>
                    <Text style={[ui.secondaryBtnText, { color: '#D64545' }]}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* ---------- INVOICE PREVIEW ---------- */}
      <Modal visible={!!previewImg} transparent animationType="fade" onRequestClose={() => setPreviewImg(null)}>
        <TouchableOpacity style={s.previewOverlay} activeOpacity={1} onPress={() => setPreviewImg(null)}>
          {previewImg ? <Image source={{ uri: previewImg }} style={{ width: '92%', height: '75%' }} resizeMode="contain" /> : null}
          <Text style={{ color: '#fff', marginTop: 12 }}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </ScreenShell>
  );
}

function Detail({ label, value }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, color: colors.muted },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#172B4D' },
  listSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  filterBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, gap: 10 },
  searchInput: { flex: 1, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff', fontSize: 13, color: colors.text },
  records: { fontSize: 11, color: colors.muted },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  purpose: { fontSize: 14, fontWeight: '800', color: colors.text },
  small: { fontSize: 11, color: colors.muted, marginTop: 2 },
  employee: { fontSize: 12, color: '#53627A', marginTop: 8 },
  amount: { fontSize: 16, fontWeight: '800', color: colors.primary },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#4A5A70', marginTop: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#E8EFFF' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  formSection: { fontSize: 14, fontWeight: '800', color: colors.text },
  fileActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F2F6' },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  invoiceBtn: { backgroundColor: '#E8EFFF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginTop: 8 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
});