import React, { useEffect, useRef, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  Home,
  LogOut,
  Receipt,
  Sun,
  User as UserIcon,
  Users,
  WalletCards,
  X,
} from 'lucide-react-native';

const ICONS = {
  home: Home,
  attendance: CalendarCheck2,
  leave: CalendarDays,
  expense: Receipt,
  employees: Users,
  payslip: WalletCards,
  holiday: Sun,
  profile: UserIcon,
};

const PRIMARY = '#0B4EA2';
const DRAWER_WIDTH = Math.min(
  Dimensions.get('window').width * 0.82,
  320
);

// items: [{ title, icon, route }]
const SideDrawer = ({
  visible,
  onClose,
  displayName,
  email,
  profileImg,
  items = [],
  activeRoute,
  onNavigate,
  onSignOut,
}) => {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  const [imgFailed, setImgFailed] = useState(false);

  // Reset image error whenever profile image changes
  useEffect(() => {
    setImgFailed(false);
  }, [profileImg]);

  useEffect(() => {
    if (visible) {
      setMounted(true);

      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleItem = item => {
    onClose?.();

    setTimeout(() => {
      onNavigate?.(item.route);
    }, 230);
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: anim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              paddingBottom: Math.max(insets.bottom, 14),
              transform: [
                {
                  translateX: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-DRAWER_WIDTH, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + 18,
              },
            ]}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <X size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <View style={styles.avatar}>
              {profileImg && !imgFailed ? (
                <Image
                  source={{ uri: profileImg }}
                  style={styles.avatarImage}
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {String(displayName || 'E')
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              )}
            </View>

            {/* Name */}
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>

            {/* Email */}
            {!!email && (
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
            )}
          </View>

          {/* Menu */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>MENU</Text>

            {items.map(item => {
              const Icon = ICONS[item.icon] || Home;
              const active = activeRoute === item.route;

              return (
                <TouchableOpacity
                  key={item.title}
                  activeOpacity={0.8}
                  style={[
                    styles.item,
                    active && styles.itemActive,
                  ]}
                  onPress={() => handleItem(item)}
                >
                  <View
                    style={[
                      styles.itemIcon,
                      active && {
                        backgroundColor: PRIMARY,
                      },
                    ]}
                  >
                    <Icon
                      size={18}
                      color={active ? '#FFFFFF' : PRIMARY}
                    />
                  </View>

                  <Text
                    style={[
                      styles.itemText,
                      active && {
                        color: PRIMARY,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>

                  <ChevronRight
                    size={16}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.signOut}
              onPress={onSignOut}
            >
              <LogOut
                size={18}
                color="#EF4444"
              />

              <Text style={styles.signOutText}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = themedCreate({
  root: {
    flex: 1,
    flexDirection: 'row',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,27,55,.55)',
  },

  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    elevation: 16,
  },

  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },

  closeBtn: {
    position: 'absolute',
    right: 14,
    top: 40,
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: 60,
    height: 60,
  },

  avatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  name: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  email: {
    marginTop: 3,
    fontSize: 11,
    color: '#CFE1F8',
    fontWeight: '600',
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 6,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 4,
  },

  itemActive: {
    backgroundColor: '#EAF3FF',
  },

  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#12233F',
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E6ECF4',
  },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FDEDEE',
  },

  signOutText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
});

export default SideDrawer;