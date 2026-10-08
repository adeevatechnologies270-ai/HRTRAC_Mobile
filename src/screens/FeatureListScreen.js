// import React from 'react';
import { themedCreate } from '../theme/themedStyles';
// import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { ChevronRight, LogOut } from 'lucide-react-native';

// import ScreenShell from '../components/ScreenShell';
// import { useAuth } from '../context/AuthContext';

// const C = {
//   primary: '#0B4EA2', text: '#12233F', sub: '#64748B', border: '#E6ECF4',
// };

// const B = { bg: '#EAF2FF', fg: '#2457D6' };
// const G = { bg: '#EAF7EF', fg: '#159447' };
// const P = { bg: '#F2EAFF', fg: '#7048C4' };
// const O = { bg: '#FFF1E5', fg: '#D87927' };

// // screen: null  => "Soon". Route names AppNavigator se match hote hain.
// const modules = [
//   { title: 'My Profile', subtitle: 'Personal information', icon: '◉', c: B, screen: 'Profile' },
//   { title: 'Expenses', subtitle: 'Manage expenses', icon: '₹', c: G, screen: 'Expenses' },
//   { title: 'Employee Directory', subtitle: 'View employees', icon: '♙', c: P, screen: 'Employees' },
//   { title: 'Attendance', subtitle: 'Attendance records', icon: '◎', c: B, screen: 'Attendance' },
//   { title: 'Leave', subtitle: 'Leave requests', icon: '▣', c: O, screen: 'Leave' },
//   { title: 'Performance', subtitle: 'Performance tracking', icon: '↗', c: P },
//   { title: 'Team Summary', subtitle: 'Team overview', icon: '♧', c: G },
//   { title: 'Organization Tree', subtitle: 'Organization structure', icon: '⌘', c: B },
//   { title: 'Permissions', subtitle: 'Manage permissions', icon: '✓', c: O },
//   { title: 'Finance Summary', subtitle: 'Financial overview', icon: '▤', c: G },
//   { title: 'Payments', subtitle: 'Payment management', icon: '₹', c: P },
//   { title: 'Holidays', subtitle: 'Holiday calendar', icon: '☼', c: O },
//   { title: 'Regularization', subtitle: 'Attendance correction', icon: '↻', c: B },
//   { title: 'Salary & Payslips', subtitle: 'Salary information', icon: '₹', c: G },
//   { title: 'Messages', subtitle: 'Inbox & messages', icon: '✉', c: P },
//   { title: 'Announcements', subtitle: 'Company announcements', icon: '!', c: O },
//   { title: 'Departments', subtitle: 'Manage departments', icon: '▦', c: B },
//   { title: 'Subscriptions', subtitle: 'Subscription details', icon: '◇', c: G },
//   { title: 'Payment History', subtitle: 'Previous payments', icon: '◷', c: P },
//   { title: 'Admin Management', subtitle: 'Admin & manager controls', icon: '⚙', c: O },
// ];

// export default function FeatureListScreen({ navigation }) {
//   const { user, logout, signOut } = useAuth();
//   const role = user?.role || user?.user_type || 'Employee';
//   const name = `${user?.first_name || 'Employee'} ${user?.last_name || ''}`.trim();

//   const openModule = (m) => {
//     if (m.screen) return navigation.navigate(m.screen);
//     Alert.alert(m.title, `${m.title} mobile screen is being prepared.`);
//   };

//   const confirmSignOut = () =>
//     Alert.alert('Sign out', 'Are you sure you want to sign out?', [
//       { text: 'Cancel', style: 'cancel' },
//       { text: 'Sign out', style: 'destructive', onPress: () => (signOut || logout)?.() },
//     ]);

//   return (
//     <ScreenShell title="More" subtitle="All your HRTRAC modules in one place" navigation={navigation}>
//       <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
//         <TouchableOpacity style={s.userCard} activeOpacity={0.85} onPress={() => navigation.navigate('Profile')}>
//           {user?.profile_img ? (
//             <Image source={{ uri: user.profile_img }} style={s.avatarImg} />
//           ) : (
//             <View style={s.avatar}>
//               <Text style={s.avatarText}>{(user?.first_name || 'A').charAt(0).toUpperCase()}</Text>
//             </View>
//           )}
//           <View style={{ flex: 1, marginLeft: 12 }}>
//             <Text style={s.userName}>{name}</Text>
//             <Text style={s.userRole}>{role}</Text>
//           </View>
//           <ChevronRight size={20} color={C.sub} />
//         </TouchableOpacity>

//         <View style={s.sectionHeader}>
//           <Text style={s.sectionTitle}>HR Modules</Text>
//           <Text style={s.count}>{modules.length}</Text>
//         </View>

//         <View style={s.grid}>
//           {modules.map((m, i) => (
//             <TouchableOpacity
//               key={`${m.title}-${i}`}
//               style={[s.card, !m.screen && { opacity: 0.72 }]}
//               activeOpacity={0.8}
//               onPress={() => openModule(m)}
//             >
//               <View style={[s.icon, { backgroundColor: m.c.bg }]}>
//                 <Text style={[s.iconText, { color: m.c.fg }]}>{m.icon}</Text>
//               </View>
//               <Text style={s.title} numberOfLines={1}>{m.title}</Text>
//               <Text style={s.sub} numberOfLines={1}>{m.subtitle}</Text>
//               {!m.screen && (
//                 <View style={s.soon}><Text style={s.soonText}>Soon</Text></View>
//               )}
//             </TouchableOpacity>
//           ))}
//         </View>

//         <TouchableOpacity style={s.logout} onPress={confirmSignOut}>
//           <LogOut size={17} color="#D64545" />
//           <Text style={s.logoutText}>Sign Out</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </ScreenShell>
//   );
// }

// const s = themedCreate({
//   content: { padding: 16, paddingBottom: 40 },
//   userCard: {
//     backgroundColor: '#fff', borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center',
//     borderWidth: 1, borderColor: C.border,
//   },
//   avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EAF3FF', alignItems: 'center', justifyContent: 'center' },
//   avatarImg: { width: 48, height: 48, borderRadius: 16 },
//   avatarText: { color: C.primary, fontSize: 19, fontWeight: '900' },
//   userName: { color: C.text, fontSize: 13, fontWeight: '900' },
//   userRole: { color: C.sub, fontSize: 10, marginTop: 3 },
//   sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 },
//   sectionTitle: { color: C.text, fontSize: 14, fontWeight: '900' },
//   count: {
//     marginLeft: 8, backgroundColor: '#E8EEF8', color: C.primary, fontSize: 9, fontWeight: '900',
//     paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden',
//   },
//   grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
//   card: {
//     width: '48.2%', backgroundColor: '#fff', borderRadius: 17, padding: 13, marginBottom: 10, minHeight: 118,
//     borderWidth: 1, borderColor: C.border,
//   },
//   icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
//   iconText: { fontSize: 20, fontWeight: '800' },
//   title: { color: C.text, fontSize: 11, fontWeight: '900', marginTop: 10 },
//   sub: { color: C.sub, fontSize: 9, marginTop: 3 },
//   soon: { position: 'absolute', top: 10, right: 10, backgroundColor: '#F0F2F5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
//   soonText: { color: '#8A95A8', fontSize: 8, fontWeight: '800' },
//   logout: {
//     height: 48, borderRadius: 14, backgroundColor: '#FFF1F1', borderWidth: 1, borderColor: '#FFD9D9',
//     marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
//   },
//   logoutText: { color: '#D64545', fontSize: 13, fontWeight: '800' },
// });

import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, LogOut } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/theme';
import { FadeInUp, PressScale } from '../components/Animated';
import usePermissions from '../hooks/usePermissions';

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
              {user?.profile_img ? (
                <Image
                  source={{ uri: user.profile_img }}
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.profileLetter}>
                  {user?.first_name?.charAt(0)?.toUpperCase() || 'A'}
                </Text>
              )}
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
            {user?.profile_img ? (
              <Image
                source={{ uri: user.profile_img }}
                style={styles.userAvatarImage}
              />
            ) : (
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user?.first_name?.charAt(0)?.toUpperCase() || 'A'}
                </Text>
              </View>
            )}

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