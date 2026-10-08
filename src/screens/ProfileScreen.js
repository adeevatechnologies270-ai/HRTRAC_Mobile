import React, { useEffect, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, LogOut, Trash2 } from 'lucide-react-native';

import ScreenShell from '../components/ScreenShell';
import StatusDialog from '../components/StatusDialog';
import { SelectField, DateField, ui, colors } from '../components/FormParts';
import { useAuth } from '../context/AuthContext';
import client, { endpoints } from '../api/client';

const TABS = ['Primary', 'Contact', 'Address', 'Organization', 'Job'];
const opt = (arr) => arr.map((v) => (Array.isArray(v) ? { value: v[0], label: v[1] } : { value: v, label: v }));
const GENDERS = opt(['Male', 'Female', 'Other']);
const MARITAL = opt(['Single', 'Married', 'Divorced']);
const BLOOD = opt([['A+', 'A+ (A positive)'], ['A-', 'A- (A negative)'], ['B+', 'B+ (B positive)'], ['B-', 'B- (B negative)'],
  ['AB+', 'AB+ (AB positive)'], ['AB-', 'AB- (AB negative)'], ['O+', 'O+ (O positive)'], ['O-', 'O- (O negative)']]);
const YESNO = opt([['yes', 'Yes'], ['no', 'No']]);

const PRIMARY_KEYS = ['first_name', 'last_name', 'gender', 'marital_status', 'date_of_birth', 'blood_group', 'physically_handicapped', 'nationality'];
const CONTACT_KEYS = ['email', 'mobile_no', 'emergency_contact_no'];
const ADDRESS_KEYS = ['current_address', 'current_city', 'current_state', 'current_pincode',
  'permanent_address', 'permanent_city', 'permanent_state', 'permanent_pincode'];

const fill = (src, keys) => keys.reduce((a, k) => ({ ...a, [k]: src?.[k] === null || src?.[k] === undefined ? '' : String(src[k]) }), {});
const errMsg = (e, fallback) => e?.response?.data?.detail || e?.response?.data?.error || e?.response?.data?.message || fallback;

function Field({ label, value, onChangeText, editable = true, ...rest }) {
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        style={[ui.input, !editable && s.disabled]}
        value={String(value ?? '')}
        onChangeText={onChangeText}
        editable={editable}
        placeholderTextColor="#A3ADBC"
        {...rest}
      />
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, refreshUser, logout, signOut } = useAuth();
  const userId = user?.id;

  const [tab, setTab] = useState('Primary');
  const [primary, setPrimary] = useState(fill(user, PRIMARY_KEYS));
  const [contact, setContact] = useState(fill(user, CONTACT_KEYS));
  const [address, setAddress] = useState(fill(user, ADDRESS_KEYS));
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [org, setOrg] = useState({});
  const [job, setJob] = useState({});

  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dialog, setDialog] = useState({ visible: false });

  const showDialog = (cfg) => setDialog({ visible: true, ...cfg });
  const closeDialog = () => setDialog((d) => ({ ...d, visible: false }));

  /* ---------- LOAD (same endpoints as web EditProfile) ---------- */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await client.get(endpoints.user(userId));
        setPrimary(fill(data, PRIMARY_KEYS));
        setContact(fill(data, CONTACT_KEYS));
        setAddress(fill(data, ADDRESS_KEYS));
      } catch (e) {
        console.log('Profile load error:', e?.response?.data || e.message);
      }

      try {
        const [orgRes, usersRes] = await Promise.all([
          client.get(`/get-organization-details/?user=${userId}`),
          client.get(endpoints.users).catch(() => ({ data: [] })),
        ]);
        const o = Array.isArray(orgRes.data) ? orgRes.data[0] : orgRes.data;
        const list = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.results || [];
        const nm = (id) => {
          const u = list.find((x) => x.id === id);
          return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '';
        };
        setOrg({
          business_unit: o?.business_unit || '',
          department: o?.department || '',
          location: o?.location || '',
          reports_to: nm(o?.reports_to),
          manager_to_manager: nm(o?.manager_to_manager),
        });
      } catch (e) {
        console.log('Org load error:', e?.response?.data || e.message);
      }

      try {
        const { data } = await client.get(`/get-job-details/?user=${userId}`);
        setJob((Array.isArray(data) ? data[0] : data) || {});
      } catch (e) {
        console.log('Job load error:', e?.response?.data || e.message);
      }
    })();
  }, [userId]);

  /* ---------- SAVE SECTION (PUT /update-user/:id/) ---------- */
  const saveSection = async (body, label) => {
    try {
      setSaving(true);
      await client.put(endpoints.updateUser(userId), body);
      await refreshUser?.();
      showDialog({ type: 'success', title: 'Saved', message: `${label} updated successfully.` });
    } catch (e) {
      showDialog({ type: 'error', title: 'Update failed', message: errMsg(e, `Unable to update ${label.toLowerCase()}.`) });
    } finally {
      setSaving(false);
    }
  };

  /* ---------- ADDRESS: same as current ---------- */
  const setAddr = (k, v) =>
    setAddress((p) => {
      const next = { ...p, [k]: v };
      if (sameAsCurrent && k.startsWith('current_')) next[k.replace('current_', 'permanent_')] = v;
      return next;
    });

  const toggleSame = (checked) => {
    setSameAsCurrent(checked);
    if (checked) {
      setAddress((p) => ({
        ...p,
        permanent_address: p.current_address,
        permanent_city: p.current_city,
        permanent_state: p.current_state,
        permanent_pincode: p.current_pincode,
      }));
    }
  };

  /* ---------- PHOTO (PATCH profile_img, same as web) ---------- */
  const pickImage = async (source) => {
    setSheet(false);
    try {
      let res;
      if (source === 'camera') {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (p.status !== 'granted')
          return showDialog({ type: 'warning', title: 'Camera Permission', message: 'Camera permission is required to take a photo.' });
        res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      } else {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (p.status !== 'granted')
          return showDialog({ type: 'warning', title: 'Gallery Permission', message: 'Gallery permission is required to choose a photo.' });
        res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      }
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      setNewPhoto({ uri: a.uri, name: a.fileName || `profile-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
    } catch (e) {
      showDialog({ type: 'error', title: 'Image Error', message: e?.message || 'Unable to select image.' });
    }
  };

  const uploadPhoto = async () => {
    if (!newPhoto) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('profile_img', newPhoto);
      await client.patch(endpoints.updateUser(userId), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (d) => d,
      });
      await refreshUser?.();
      setNewPhoto(null);
      showDialog({ type: 'success', title: 'Photo Updated', message: 'Your profile photo was uploaded successfully.' });
    } catch (e) {
      showDialog({ type: 'error', title: 'Upload failed', message: errMsg(e, 'Image uploading failed.') });
    } finally {
      setUploading(false);
    }
  };

  const confirmSignOut = () =>
    showDialog({
      type: 'warning',
      title: 'Sign out?',
      message: 'You will need to log in again to use the app.',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await (signOut || logout)?.();
      },
    });

  /* ---------- UI ---------- */
  const fullName = `${primary.first_name} ${primary.last_name}`.trim() || user?.email || 'Employee';
  const role = user?.role || user?.user_type || 'Employee';
  const avatarSource = newPhoto?.uri || user?.profile_img;

  const SaveBtn = ({ onPress, label }) => (
    <TouchableOpacity style={[ui.primaryBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={onPress}>
      {saving ? <ActivityIndicator color="#fff" /> : <Text style={ui.primaryBtnText}>{label}</Text>}
    </TouchableOpacity>
  );

  return (
    <ScreenShell title="My Profile" subtitle="Manage your personal information" navigation={navigation}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ---------- PROFILE CARD ---------- */}
        <View style={s.profileCard}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setSheet(true)} style={s.avatarWrap}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={s.avatarImg} />
            ) : (
              <View style={[s.avatarImg, s.avatarFallback]}>
                <Text style={s.avatarLetter}>{fullName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={s.camBadge}>
              <Camera size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={s.name}>{fullName}</Text>
          <View style={s.rolePill}><Text style={s.roleText}>{role}</Text></View>
          <Text style={s.email}>{user?.email}</Text>

          {newPhoto ? (
            <View style={s.uploadRow}>
              <TouchableOpacity style={s.uploadBtn} disabled={uploading} onPress={uploadPhoto}>
                {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.uploadText}>Upload Photo</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} disabled={uploading} onPress={() => setNewPhoto(null)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={s.hint}>Tap the photo to change it</Text>
          )}
        </View>

        {/* ---------- SECTION TABS ---------- */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          {TABS.map((t) => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[ui.card, { marginTop: 12 }]}>
          {tab === 'Primary' && (
            <>
              <Field label="First Name" value={primary.first_name} onChangeText={(v) => setPrimary((p) => ({ ...p, first_name: v }))} placeholder="Enter first name" />
              <Field label="Last Name" value={primary.last_name} onChangeText={(v) => setPrimary((p) => ({ ...p, last_name: v }))} placeholder="Enter last name" />
              <SelectField label="Gender" placeholder="Select gender" value={primary.gender} options={GENDERS} onChange={(v) => setPrimary((p) => ({ ...p, gender: v }))} />
              <SelectField label="Marital Status" placeholder="Select marital status" value={primary.marital_status} options={MARITAL} onChange={(v) => setPrimary((p) => ({ ...p, marital_status: v }))} />
              <DateField label="Date of Birth" value={primary.date_of_birth} onChange={(v) => setPrimary((p) => ({ ...p, date_of_birth: v }))} />
              <SelectField label="Blood Group" placeholder="Select blood group" value={primary.blood_group} options={BLOOD} onChange={(v) => setPrimary((p) => ({ ...p, blood_group: v }))} />
              <SelectField label="Physically Handicapped" placeholder="Are you handicapped" value={primary.physically_handicapped} options={YESNO} onChange={(v) => setPrimary((p) => ({ ...p, physically_handicapped: v }))} />
              <Field label="Nationality" value={primary.nationality} onChangeText={(v) => setPrimary((p) => ({ ...p, nationality: v }))} placeholder="Enter nationality" />
              <SaveBtn label="Save Primary Details" onPress={() => saveSection(primary, 'Primary details')} />
            </>
          )}

          {tab === 'Contact' && (
            <>
              <Field label="Email" value={contact.email} onChangeText={(v) => setContact((p) => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" placeholder="Enter email" />
              <Field label="Mobile Number" value={contact.mobile_no} onChangeText={(v) => setContact((p) => ({ ...p, mobile_no: v }))} keyboardType="phone-pad" placeholder="Enter mobile number" />
              <Field label="Emergency Contact Number" value={contact.emergency_contact_no} onChangeText={(v) => setContact((p) => ({ ...p, emergency_contact_no: v }))} keyboardType="phone-pad" placeholder="Enter emergency number" />
              <SaveBtn label="Save Contact Details" onPress={() => saveSection(contact, 'Contact details')} />
            </>
          )}

          {tab === 'Address' && (
            <>
              <Text style={s.groupTitle}>Current Address</Text>
              <Field label="Address" value={address.current_address} onChangeText={(v) => setAddr('current_address', v)} placeholder="Enter current address" />
              <Field label="City" value={address.current_city} onChangeText={(v) => setAddr('current_city', v)} />
              <Field label="State" value={address.current_state} onChangeText={(v) => setAddr('current_state', v)} />
              <Field label="Pincode" value={address.current_pincode} onChangeText={(v) => setAddr('current_pincode', v)} keyboardType="number-pad" />

              <View style={s.switchRow}>
                <Text style={s.groupTitle}>Permanent Address</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={s.switchLabel}>Same as current</Text>
                  <Switch value={sameAsCurrent} onValueChange={toggleSame} trackColor={{ true: colors.primary }} />
                </View>
              </View>
              <Field label="Address" editable={!sameAsCurrent} value={address.permanent_address} onChangeText={(v) => setAddr('permanent_address', v)} placeholder="Enter permanent address" />
              <Field label="City" editable={!sameAsCurrent} value={address.permanent_city} onChangeText={(v) => setAddr('permanent_city', v)} />
              <Field label="State" editable={!sameAsCurrent} value={address.permanent_state} onChangeText={(v) => setAddr('permanent_state', v)} />
              <Field label="Pincode" editable={!sameAsCurrent} value={address.permanent_pincode} onChangeText={(v) => setAddr('permanent_pincode', v)} keyboardType="number-pad" />
              <SaveBtn label="Save Address" onPress={() => saveSection(address, 'Address')} />
            </>
          )}

          {tab === 'Organization' && (
            <>
              <Text style={s.groupTitle}>Organization Details</Text>
              <Field label="Business Unit" value={org.business_unit} editable={false} />
              <Field label="Department" value={org.department} editable={false} />
              <Field label="Location" value={org.location} editable={false} />
              <Field label="Reports To" value={org.reports_to} editable={false} />
              <Field label="Manager To Manager" value={org.manager_to_manager} editable={false} />
              <Text style={s.note}>These details are managed by HR and cannot be edited here.</Text>
            </>
          )}

          {tab === 'Job' && (
            <>
              <Text style={s.groupTitle}>Job Details</Text>
              <Field label="Employee Number" value={job.emp_no} editable={false} />
              <Field label="Date of Joining" value={job.date_of_joining} editable={false} />
              <Field label="Primary Job Title" value={job.job_title_primary} editable={false} />
              <Field label="Secondary Job Title" value={job.job_title_secondary} editable={false} />
              <Field label="Notice Period (Days)" value={job.notice_period} editable={false} />
              <Field label="Worker Type" value={job.worker_type} editable={false} />
              <Field label="Time Type" value={job.time_type} editable={false} />
              <Field label="Shift" value={job.shift} editable={false} />
              <Field label="In Probation" value={job.in_probation ? 'Yes' : 'No'} editable={false} />
              <Field label="Tracking Enabled" value={job.tracking ? 'Yes' : 'No'} editable={false} />
              <Text style={s.note}>These details are managed by HR and cannot be edited here.</Text>
            </>
          )}
        </View>

        <TouchableOpacity style={s.logout} onPress={confirmSignOut}>
          <LogOut size={17} color="#D64545" />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ---------- PHOTO SOURCE SHEET ---------- */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <TouchableOpacity style={ui.overlay} activeOpacity={1} onPress={() => setSheet(false)}>
          <View style={ui.sheet}>
            <Text style={ui.sheetTitle}>Profile Photo</Text>
            <TouchableOpacity style={s.sheetRow} onPress={() => pickImage('camera')}>
              <View style={s.sheetIcon}><Camera size={19} color={colors.primary} /></View>
              <Text style={s.sheetText}>Take a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetRow} onPress={() => pickImage('gallery')}>
              <View style={s.sheetIcon}><ImageIcon size={19} color={colors.primary} /></View>
              <Text style={s.sheetText}>Choose from gallery</Text>
            </TouchableOpacity>
            {newPhoto ? (
              <TouchableOpacity style={s.sheetRow} onPress={() => { setNewPhoto(null); setSheet(false); }}>
                <View style={[s.sheetIcon, { backgroundColor: '#FFE5E5' }]}><Trash2 size={19} color="#D64545" /></View>
                <Text style={[s.sheetText, { color: '#D64545' }]}>Discard selected photo</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={ui.secondaryBtn} onPress={() => setSheet(false)}>
              <Text style={ui.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <StatusDialog {...dialog} onClose={closeDialog} />
    </ScreenShell>
  );
}

const s = themedCreate({
  profileCard: { backgroundColor: '#fff', borderRadius: 22, alignItems: 'center', paddingVertical: 22, borderWidth: 1, borderColor: '#E6ECF4' },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D5E4FF' },
  avatarLetter: { fontSize: 36, fontWeight: '900', color: '#0B4EA2' },
  camBadge: {
    position: 'absolute', right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#0B4EA2', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff',
  },
  name: { fontSize: 18, fontWeight: '900', color: '#12233F', marginTop: 12 },
  rolePill: { backgroundColor: '#EAF3FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 6 },
  roleText: { fontSize: 10, fontWeight: '900', color: '#0B4EA2' },
  email: { fontSize: 11, color: '#64748B', marginTop: 8 },
  hint: { fontSize: 10, color: '#94A3B8', marginTop: 12 },
  uploadRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  uploadBtn: { backgroundColor: '#0B4EA2', paddingHorizontal: 20, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 130 },
  uploadText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  cancelBtn: { paddingHorizontal: 18, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  cancelText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6ECF4', marginRight: 8 },
  tabActive: { backgroundColor: '#0B4EA2', borderColor: '#0B4EA2' },
  tabText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  groupTitle: { fontSize: 14, fontWeight: '900', color: '#12233F', marginTop: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  switchLabel: { fontSize: 10, color: '#64748B', marginRight: 6, fontWeight: '700' },
  disabled: { backgroundColor: '#F2F4F7', color: '#8994A5' },
  note: { fontSize: 10, color: '#94A3B8', marginTop: 14 },
  logout: {
    height: 48, borderRadius: 14, backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFD9D9',
    marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  logoutText: { color: '#D64545', fontSize: 13, fontWeight: '800' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sheetIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sheetText: { fontSize: 14, fontWeight: '700', color: '#12233F' },
});