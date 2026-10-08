
import React, { useEffect, useRef, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import {
  Animated,
  Easing,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell } from 'lucide-react-native';
import NotificationSheet, { useNotifications } from './NotificationSheet';
import { useAuth } from '../context/AuthContext';

const PRIMARY = '#0B4EA2';
const PRIMARY_DARK = '#073B7A';
const BG = '#F4F7FB';

/**
 * Dashboard matching curved header for all screens.
 *
 * Header:
 *
 *   [ <- ]   HRTRAC
 *            Screen Title                    [ Bell ]
 *
 *            Subtitle
 *
 * Same curved blue header as Dashboard.
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
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const goBack = () => {
    if (onBack) {
      return onBack();
    }

    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation?.navigate?.('Main', {
        screen: 'Home',
      });
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={PRIMARY}
        translucent={false}
      />

      <View style={styles.container}>

        {/* =========================================================
            CURVED HEADER
            Same design as Dashboard heroHeader
        ========================================================== */}
        <Animated.View
          style={[
            styles.heroHeader,
            {
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroRow}>

            {/* LEFT SIDE */}
            <View style={styles.leftSection}>

              {!hideBack && (
                <TouchableOpacity
                  style={styles.iconButton}
                  activeOpacity={0.8}
                  onPress={goBack}
                >
                  <ArrowLeft
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}

              <View
                style={[
                  styles.titleArea,
                  {
                    marginLeft: hideBack ? 0 : 12,
                  },
                ]}
              >
                <Text style={styles.greeting}>
                  HRTRAC
                </Text>

                <Text
                  style={styles.screenTitle}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              </View>

            </View>

            {/* NOTIFICATION */}
            <Animated.View
              style={{
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.notificationButton}
                activeOpacity={0.8}
                onPress={() => setNotifVisible(true)}
              >
                <Bell
                  size={19}
                  color="#FFFFFF"
                />

                {notif.unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {notif.unreadCount > 9
                        ? '9+'
                        : notif.unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

          </View>

          {/* HEADER SUBTITLE */}
          <Text
            style={styles.heroCaption}
            numberOfLines={1}
          >
            {subtitle}
          </Text>

        </Animated.View>

        {/* =========================================================
            SCREEN BODY
        ========================================================== */}
        <View style={styles.body}>
          {children}
        </View>

      </View>

      {/* =========================================================
          NOTIFICATION SHEET
      ========================================================== */}
      <NotificationSheet
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        notif={notif}
      />

    </SafeAreaView>
  );
}

const styles = themedCreate({

  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY,
  },

  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // ============================================================
  // SAME AS DASHBOARD heroHeader
  // ============================================================
  heroHeader: {
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

    shadowOffset: {
      width: 0,
      height: 7,
    },

    zIndex: 10,
  },

  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  // ============================================================
  // BACK BUTTON
  // ============================================================
  iconButton: {
    width: 40,
    height: 40,

    borderRadius: 13,

    backgroundColor: 'rgba(255,255,255,.13)',

    alignItems: 'center',
    justifyContent: 'center',
  },

  // ============================================================
  // TITLE
  // ============================================================
  titleArea: {
    flex: 1,
  },

  greeting: {
    fontSize: 10,
    color: '#CFE1F8',
    fontWeight: '600',
  },

  screenTitle: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 2,
  },

  // ============================================================
  // NOTIFICATION
  // ============================================================
  notificationButton: {
    width: 40,
    height: 40,

    borderRadius: 13,

    backgroundColor: 'rgba(255,255,255,.13)',

    alignItems: 'center',
    justifyContent: 'center',
  },

  bellBadge: {
    position: 'absolute',

    top: -4,
    right: -4,

    minWidth: 18,
    height: 18,

    paddingHorizontal: 4,

    borderRadius: 9,

    backgroundColor: '#EF4444',

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1.5,
    borderColor: PRIMARY,
  },

  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // ============================================================
  // SUBTITLE
  // ============================================================
  heroCaption: {
    fontSize: 9,
    color: '#CFE1F8',

    marginTop: 11,

    fontWeight: '600',
  },

  // ============================================================
  // BODY
  // ============================================================
  body: {
    flex: 1,
    backgroundColor: BG,
  },
});
