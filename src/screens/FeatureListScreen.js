import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, LogOut } from 'lucide-react-native';

import { themedCreate } from '../theme/themedStyles';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/theme';
import { FadeInUp, PressScale } from '../components/Animated';
import usePermissions from '../hooks/usePermissions';
import AvatarContent from '../components/AvatarContent';

// ============================================================
// HRTRAC · More / Feature List
// Cards permission API ke according visible honge.
// Permission nahi hai => card hide.
// Permission hai + screen ready hai => navigation.
// Permission hai but screen ready nahi => "Soon".
// ============================================================

const buildModules = () => [
  {
    title: 'My Profile',
    subtitle: 'Personal information',
    icon: '◉',
    color: theme.colors.primarySoft,
    iconColor: theme.colors.primaryLight,
    screen: 'Profile',
    available: true,
    permission: 'Edit Profile',
  },
  {
    title: 'Expenses',
    subtitle: 'Manage expenses',
    icon: '₹',
    color: theme.colors.accentGreenSoft,
    iconColor: theme.colors.success,
    screen: 'Expenses',
    available: true,
    permission: 'Expenses',
  },
  {
    title: 'Employee Directory',
    subtitle: 'View employees',
    icon: '♙',
    color: theme.colors.accentPurpleSoft,
    iconColor: theme.colors.accentPurple,
    screen: 'Employees',
    available: true,
    permission: 'Employee Directory',
  },
  {
    title: 'Attendance',
    subtitle: 'Attendance records',
    icon: '◎',
    color: theme.colors.primarySoft,
    iconColor: theme.colors.primaryLight,
    screen: 'Attendance',
    available: true,
    permission: 'Attendance',
  },
  {
    title: 'Leave',
    subtitle: 'Leave requests',
    icon: '▣',
    color: theme.colors.accentOrangeSoft,
    iconColor: theme.colors.accentOrange,
    screen: 'Leave',
    available: true,
    permission: 'Leave',
  },
  {
    title: 'Performance',
    subtitle: 'Performance tracking',
    icon: '↗',
    color: theme.colors.accentPurpleSoft,
    iconColor: theme.colors.accentPurple,
    screen: null,
    available: false,
    permission: 'Performance',
  },
  {
    title: 'Team Summary',
    subtitle: 'Team overview',
    icon: '♧',
    color: theme.colors.accentGreenSoft,
    iconColor: theme.colors.success,
    screen: null,
    available: false,
    permission: 'Team Summary',
  },
  {
    title: 'Organization Tree',
    subtitle: 'Organization structure',
    icon: '⌘',
    color: theme.colors.primarySoft,
    iconColor: theme.colors.primaryLight,
    screen: null,
    available: false,
    permission: 'Organization Tree',
  },
  {
    title: 'Permissions',
    subtitle: 'Manage permissions',
    icon: '✓',
    color: theme.colors.accentOrangeSoft,
    iconColor: theme.colors.accentOrange,
    screen: null,
    available: false,
    permission: 'Permissions',
  },
  {
    title: 'Finance Summary',
    subtitle: 'Financial overview',
    icon: '▤',
    color: theme.colors.accentGreenSoft,
    iconColor: theme.colors.success,
    screen: null,
    available: false,
    permission: 'Finance Summary',
  },
  {
    title: 'Payments',
    subtitle: 'Payment management',
    icon: '₹',
    color: theme.colors.accentPurpleSoft,
    iconColor: theme.colors.accentPurple,
    screen: null,
    available: false,
    permission: 'Payments',
  },
  {
    title: 'Holidays',
    subtitle: 'Holiday calendar',
    icon: '☼',
    color: theme.colors.accentOrangeSoft,
    iconColor: theme.colors.accentOrange,
    screen: null,
    available: false,
    permission: 'Holidays',
  },
  {
    title: 'Regularization',
    subtitle: 'Attendance correction',
    icon: '↻',
    color: theme.colors.primarySoft,
    iconColor: theme.colors.primaryLight,
    screen: null,
    available: false,
    permission: 'Regularization',
  },
  {
    title: 'Salary & Payslips',
    subtitle: 'Salary information',
    icon: '₹',
    color: theme.colors.accentGreenSoft,
    iconColor: theme.colors.success,
    screen: null,
    available: false,
    permission: 'Salary & Payslips',
  },
  {
    title: 'Messages',
    subtitle: 'Inbox & messages',
    icon: '✉',
    color: theme.colors.accentPurpleSoft,
    iconColor: theme.colors.accentPurple,
    screen: null,
    available: false,
    permission: 'Messages',
  },
  {
    title: 'Announcements',
    subtitle: 'Company announcements',
    icon: '!',
    color: theme.colors.accentOrangeSoft,
    iconColor: theme.colors.accentOrange,
    screen: null,
    available: false,
    permission: 'Announcements',
  },
  {
    title: 'Departments',
    subtitle: 'Manage departments',
    icon: '▦',
    color: theme.colors.primarySoft,
    iconColor: theme.colors.primaryLight,
    screen: null,
    available: false,
    permission: 'Department Management',
  },
  {
    title: 'Subscriptions',
    subtitle: 'Subscription details',
    icon: '◇',
    color: theme.colors.accentGreenSoft,
    iconColor: theme.colors.success,
    screen: null,
    available: false,
    permission: 'Subscriptions',
  },
  {
    title: 'Payment History',
    subtitle: 'Previous payments',
    icon: '◷',
    color: theme.colors.accentPurpleSoft,
    iconColor: theme.colors.accentPurple,
    screen: null,
    available: false,
    permission: 'Payment History',
  },
  {
    title: 'Admin Management',
    subtitle: 'Admin & manager controls',
    icon: '⚙',
    color: theme.colors.accentOrangeSoft,
    iconColor: theme.colors.accentOrange,
    screen: null,
    available: false,
    permission: 'Admin Management',
  },
];

export default function FeatureListScreen({ navigation }) {
  const { user, logout, signOut } = useAuth();
  const { can, loading: permLoading } = usePermissions();

  const modules = buildModules();

  // Sirf wahi modules show honge jinki permission user ko mili hai.
  const visibleModules = modules.filter((module) =>
    can(module.permission)
  );

  const role =
    user?.user_type ||
    user?.type ||
    user?.role ||
    'Employee';

  const name =
    `${user?.first_name || 'Employee'} ${user?.last_name || ''}`.trim();

  const avatarLetter = user?.first_name?.charAt(0)?.toUpperCase() || 'A';

  const openModule = (module) => {
    if (module.available && module.screen) {
      navigation.navigate(module.screen);
      return;
    }

    Alert.alert(
      module.title,
      `${module.title} mobile screen is being prepared.`
    );
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            if (typeof signOut === 'function') {
              signOut();
            } else if (typeof logout === 'function') {
              logout();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <View style={styles.container}>

        {/* =====================================================
            HEADER
        ===================================================== */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerSmall}>HRTRAC</Text>
              <Text style={styles.headerTitle}>More</Text>
            </View>

            <PressScale
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <AvatarContent
                uri={user?.profile_img}
                letter={avatarLetter}
                imageStyle={styles.profileImage}
                textStyle={styles.profileLetter}
              />
            </PressScale>
          </View>

          <Text style={styles.headerSubtitle}>
            All your HRTRAC modules in one place
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >

          {/* ===================================================
              USER CARD
          =================================================== */}
          <PressScale
            style={styles.userCard}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.userAvatar}>
              <AvatarContent
                uri={user?.profile_img}
                letter={avatarLetter}
                imageStyle={styles.userAvatarImage}
                textStyle={styles.userAvatarText}
              />
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {name}
              </Text>

              <Text style={styles.userRole}>
                {role}
              </Text>
            </View>

            <ChevronRight
              size={20}
              color="#8994A5"
            />
          </PressScale>

          {/* ===================================================
              APPEARANCE
          =================================================== */}
          <PressScale
            style={[styles.userCard, { marginTop: 10 }]}
            onPress={() => navigation.navigate('Appearance')}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>◐</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                Appearance
              </Text>

              <Text style={styles.userRole}>
                Light, dark & accent color
              </Text>
            </View>

            <ChevronRight
              size={20}
              color="#8994A5"
            />
          </PressScale>

          {/* ===================================================
              MODULE HEADER
          =================================================== */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              HR Modules
            </Text>

            <Text style={styles.moduleCount}>
              {permLoading ? '…' : visibleModules.length}
            </Text>
          </View>

          {/* ===================================================
              MODULE GRID
          =================================================== */}
          <View style={styles.grid}>
            {permLoading
              ? null
              : visibleModules.map((module, index) => (
                  <FadeInUp
                    key={`${module.title}-${index}`}
                    delay={index * 25}
                    distance={8}
                    style={styles.cardWrapper}
                  >
                    <PressScale
                      style={[
                        styles.moduleCard,
                        !module.available &&
                          styles.unavailableCard,
                      ]}
                      onPress={() => openModule(module)}
                    >
                      <View
                        style={[
                          styles.moduleIcon,
                          {
                            backgroundColor:
                              module.color,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.moduleIconText,
                            {
                              color:
                                module.iconColor,
                            },
                          ]}
                        >
                          {module.icon}
                        </Text>
                      </View>

                      <Text
                        style={styles.moduleTitle}
                        numberOfLines={1}
                      >
                        {module.title}
                      </Text>

                      <Text
                        style={styles.moduleSubtitle}
                        numberOfLines={1}
                      >
                        {module.subtitle}
                      </Text>

                      {!module.available && (
                        <View style={styles.soonBadge}>
                          <Text style={styles.soonText}>
                            Soon
                          </Text>
                        </View>
                      )}
                    </PressScale>
                  </FadeInUp>
                ))}
          </View>

          {/* ===================================================
              EMPTY STATE
          =================================================== */}
          {!permLoading &&
            visibleModules.length === 0 && (
              <Text style={styles.emptyText}>
                No modules assigned to you yet.
              </Text>
            )}

          {/* ===================================================
              LOGOUT
          =================================================== */}
          <PressScale
            style={styles.logoutButton}
            onPress={confirmSignOut}
          >
            <LogOut
              size={17}
              color={theme.colors.danger}
            />

            <Text style={styles.logoutText}>
              Sign Out
            </Text>
          </PressScale>

          <View style={{ height: 30 }} />

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = themedCreate({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 17,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerSmall: {
    color: '#BFD8FF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 2,
  },

  headerSubtitle: {
    color: '#D8E8FF',
    fontSize: 10,
    marginTop: 7,
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  profileLetter: {
    color: theme.colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },

  // ==========================================================
  // CONTENT
  // ==========================================================

  content: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 30,
  },

  // ==========================================================
  // USER CARD
  // ==========================================================

  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadow.soft,
  },

  userAvatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  userAvatarImage: {
    width: 43,
    height: 43,
    borderRadius: 22,
  },

  userAvatarText: {
    color: theme.colors.primaryLight,
    fontSize: 17,
    fontWeight: '800',
  },

  userInfo: {
    flex: 1,
    marginLeft: 10,
  },

  userName: {
    color: '#263B5D',
    fontSize: 12,
    fontWeight: '800',
  },

  userRole: {
    color: '#8A95A8',
    fontSize: 9,
    marginTop: 3,
  },

  // ==========================================================
  // SECTION
  // ==========================================================

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 9,
  },

  sectionTitle: {
    color: '#172B4D',
    fontSize: 14,
    fontWeight: '800',
  },

  moduleCount: {
    marginLeft: 7,
    minWidth: 20,
    textAlign: 'center',
    backgroundColor: '#E8EEF8',
    color: '#315DB5',
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // ==========================================================
  // GRID
  // ==========================================================

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  cardWrapper: {
    width: '48.2%',
  },

  moduleCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    minHeight: 115,
    ...theme.shadow.soft,
  },

  unavailableCard: {
    opacity: 0.72,
  },

  moduleIcon: {
    width: 39,
    height: 39,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moduleIconText: {
    fontSize: 19,
    fontWeight: '800',
  },

  moduleTitle: {
    color: '#344660',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 9,
  },

  moduleSubtitle: {
    color: '#8A95A8',
    fontSize: 8,
    marginTop: 3,
  },

  soonBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
  },

  soonText: {
    color: '#8A95A8',
    fontSize: 7,
    fontWeight: '700',
  },

  emptyText: {
    textAlign: 'center',
    color: '#8A95A8',
    fontSize: 10,
    marginVertical: 20,
  },

  // ==========================================================
  // LOGOUT
  // ==========================================================

  logoutButton: {
    height: 46,
    borderRadius: 11,
    backgroundColor: theme.colors.accentRedSoft,
    borderWidth: 1,
    borderColor: '#FFD9D9',
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutText: {
    color: theme.colors.danger,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 7,
  },
});