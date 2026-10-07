import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BellOff, CheckCheck, Megaphone, MessageSquare, X } from 'lucide-react-native';
import client, { endpoints } from '../api/client';

const PRIMARY = '#0B4EA2';

const toArray = data => (Array.isArray(data) ? data : data?.results || []);

const timeAgo = value => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

// Data hook: call once in the Dashboard so the bell badge works before the sheet opens.
export const useNotifications = userId => {
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [seenIds, setSeenIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const storageKey = `seenAnnouncements:${userId}`;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [aRes, mRes, stored] = await Promise.all([
        client.get(endpoints.announcements).catch(() => ({ data: [] })),
        client.get(endpoints.messages).catch(() => ({ data: [] })),
        AsyncStorage.getItem(storageKey),
      ]);
      setAnnouncements(toArray(aRes.data));
      // Only messages addressed to me (backend should filter too).
      setMessages(toArray(mRes.data).filter(m => Number(m.to_user) === Number(userId)));
      setSeenIds(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.log('Notifications error:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, [userId, storageKey]);

  useEffect(() => { refresh(); }, [refresh]);

  const isAnnouncementUnread = a => !seenIds.includes(a.id) && Number(a.from_user?.id) !== Number(userId);

  const unreadAnnouncements = announcements.filter(isAnnouncementUnread).length;
  const unreadMessages = messages.filter(m => !m.seen).length;

  const markMessageSeen = async id => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, seen: true } : m)));
    try { await client.put(`${endpoints.messages}${id}/`, { seen: true }); } catch (e) { console.log('Seen update failed', e?.message); }
  };

  const markAllSeen = async () => {
    const ids = announcements.map(a => a.id);
    setSeenIds(ids);
    AsyncStorage.setItem(storageKey, JSON.stringify(ids)).catch(() => {});
    const unseen = messages.filter(m => !m.seen);
    setMessages(prev => prev.map(m => ({ ...m, seen: true })));
    await Promise.allSettled(unseen.map(m => client.put(`${endpoints.messages}${m.id}/`, { seen: true })));
  };

  return {
    announcements, messages, loading, refresh,
    unreadAnnouncements, unreadMessages,
    unreadCount: unreadAnnouncements + unreadMessages,
    isAnnouncementUnread, markMessageSeen, markAllSeen,
  };
};

const NotificationSheet = ({ visible, onClose, notif }) => {
  const [tab, setTab] = useState('announcements');

  useEffect(() => { if (visible) notif.refresh(); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const src = tab === 'announcements' ? notif.announcements : notif.messages;
    return [...src].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [tab, notif.announcements, notif.messages]);

  const Tab = ({ id, label, count }) => (
    <TouchableOpacity style={[styles.tab, tab === id && styles.tabActive]} onPress={() => setTab(id)} activeOpacity={0.85}>
      <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
      {count > 0 && (
        <View style={[styles.tabBadge, tab === id && { backgroundColor: '#FFFFFF' }]}>
          <Text style={[styles.tabBadgeText, tab === id && { color: PRIMARY }]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>{notif.unreadCount > 0 ? `${notif.unreadCount} unread` : 'You are all caught up'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {notif.unreadCount > 0 && (
                <TouchableOpacity style={styles.markAll} onPress={notif.markAllSeen}>
                  <CheckCheck size={14} color={PRIMARY} />
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}><X size={18} color="#12233F" /></TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabs}>
            <Tab id="announcements" label="Announcements" count={notif.unreadAnnouncements} />
            <Tab id="messages" label="Messages" count={notif.unreadMessages} />
          </View>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={notif.loading} onRefresh={notif.refresh} tintColor={PRIMARY} />}
          >
            {notif.loading && list.length === 0 ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
            ) : list.length === 0 ? (
              <View style={styles.empty}>
                <BellOff size={28} color="#94A3B8" />
                <Text style={styles.emptyText}>No {tab === 'announcements' ? 'announcements' : 'messages'} yet</Text>
              </View>
            ) : (
              list.map(item => {
                const isAnn = tab === 'announcements';
                const unread = isAnn ? notif.isAnnouncementUnread(item) : !item.seen;
                const sender = item.from_user?.name?.trim() || 'Admin';
                const Icon = isAnn ? Megaphone : MessageSquare;
                return (
                  <TouchableOpacity
                    key={`${tab}-${item.id}`}
                    activeOpacity={0.85}
                    style={[styles.card, unread && styles.cardUnread]}
                    onPress={() => { if (!isAnn && unread) notif.markMessageSeen(item.id); }}
                  >
                    <View style={[styles.cardIcon, { backgroundColor: isAnn ? '#FFF4E7' : '#EAF3FF' }]}>
                      <Icon size={18} color={isAnn ? '#E98A24' : PRIMARY} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 11 }}>
                      <View style={styles.cardTop}>
                        <Text style={styles.sender} numberOfLines={1}>{sender}</Text>
                        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                      </View>
                      <Text style={styles.body}>{item.message}</Text>
                    </View>
                    {unread && <View style={styles.dot} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(7,27,55,.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '82%', minHeight: '45%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '900', color: '#12233F' },
  subtitle: { fontSize: 11, color: '#64748B', marginTop: 3, fontWeight: '600' },
  markAll: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 36, borderRadius: 12, backgroundColor: '#EAF3FF' },
  markAllText: { marginLeft: 5, fontSize: 11, fontWeight: '800', color: PRIMARY },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginBottom: 14 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 11 },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 12.5, fontWeight: '800', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: { marginLeft: 6, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  card: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 16, backgroundColor: '#F8FAFD', marginBottom: 9, borderWidth: 1, borderColor: '#EEF2F7' },
  cardUnread: { backgroundColor: '#F3F8FF', borderColor: '#D6E6FB' },
  cardIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sender: { flex: 1, fontSize: 13, fontWeight: '900', color: '#12233F', marginRight: 8 },
  time: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  body: { marginTop: 4, fontSize: 12.5, lineHeight: 18, color: '#475569' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 8, marginTop: 5 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { marginTop: 10, fontSize: 12, color: '#94A3B8', fontWeight: '600' },
});

export default NotificationSheet;