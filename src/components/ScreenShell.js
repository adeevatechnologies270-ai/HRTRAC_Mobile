import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell } from 'lucide-react-native';
import NotificationSheet, { useNotifications } from './NotificationSheet';
import { useAuth } from '../context/AuthContext';

const PRIMARY = '#0B4EA2';
const PRIMARY_DARK = '#073B7A';
const BG = '#F4F7FB';

/**
 * Dashboard jaisa hi header (same padding, radius, height) har screen ke liye:
 *   [ <- back ]  HRTRAC / Title                [ bell + badge ]
 *   caption line
 *
 * Usage:
 *   <ScreenShell title="Leave" subtitle="Manage your leave requests" navigation={navigation}>
 *     ...screen body (ScrollView / FlatList)...
 *   </ScreenShell>
 */
export default function ScreenShell({
  title,
  subtitle = 'HRTRAC • Manage your work',
  navigation,
  children,
  onBack,
  hideBack = false,
}) {
  const { user } = useAuth();
  const notif = useNotifications(user?.id);
  const [notifVisible, setNotifVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const goBack = () => {
    if (onBack) return onBack();
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation?.navigate?.('Main', { screen: 'Home' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} translucent={false} />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.left}>
            {!hideBack && (
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={goBack}>
                <ArrowLeft size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1, marginLeft: hideBack ? 0 : 12 }}>
              <Text style={styles.tag}>HRTRAC</Text>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={() => setNotifVisible(true)}>
            <Bell size={19} color="#fff" />
            {notif.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notif.unreadCount > 9 ? '9+' : notif.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.caption} numberOfLines={1}>{subtitle}</Text>
      </Animated.View>

      <View style={styles.body}>{children}</View>

      <NotificationSheet visible={notifVisible} onClose={() => setNotifVisible(false)} notif={notif} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PRIMARY },
  body: { flex: 1, backgroundColor: BG },
  // Values dashboard ke heroHeader se bilkul same
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: PRIMARY_DARK,
    shadowOpacity: 0.22,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    zIndex: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 45 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  tag: { fontSize: 10, color: '#CFE1F8', fontWeight: '600' },
  title: { fontSize: 17, color: '#fff', fontWeight: '900', marginTop: 2 },
  caption: { fontSize: 9, color: '#CFE1F8', marginTop: 11, fontWeight: '600' },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: PRIMARY,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
});