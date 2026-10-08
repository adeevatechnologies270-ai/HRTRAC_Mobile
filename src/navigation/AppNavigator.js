// import React, { useEffect, useRef } from 'react';
// import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { Home, Clock3, CalendarDays, LayoutGrid } from 'lucide-react-native';

// import { useAuth } from '../context/AuthContext';

// import LoginScreen from '../screens/LoginScreen';
// import OtpScreen from '../screens/OtpScreen';
// import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// import DashboardScreen from '../screens/DashboardScreen';
// import AttendanceScreen from '../screens/AttendanceScreen';
// import LeaveScreen from '../screens/LeaveScreen';
// import ExpensesScreen from '../screens/ExpensesScreen';
// import EmployeesScreen from '../screens/EmployeesScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import FeatureListScreen from '../screens/FeatureListScreen';

// const Stack = createNativeStackNavigator();
// const Tab = createBottomTabNavigator();

// const ACTIVE = '#0B4EA2';
// const ACTIVE_SOFT = '#EAF3FF';
// const INACTIVE = '#8C98AC';

// const navTheme = {
//   ...DefaultTheme,
//   colors: { ...DefaultTheme.colors, background: '#F4F7FB', primary: ACTIVE },
// };

// /* =====================================================
//    TAB ICON: spring pill + icon pop + active dot
// ===================================================== */

// const ICONS = { Home, Attendance: Clock3, Leave: CalendarDays, More: LayoutGrid };

// function TabIcon({ name, focused }) {
//   const Icon = ICONS[name] || Home;
//   const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

//   useEffect(() => {
//     Animated.spring(anim, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 10 }).start();
//   }, [focused, anim]);

//   const pillScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
//   const iconScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
//   const lift = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

//   return (
//     <View style={styles.iconWrap}>
//       <Animated.View style={[styles.pill, { opacity: anim, transform: [{ scale: pillScale }] }]} />
//       <Animated.View style={{ transform: [{ scale: iconScale }, { translateY: lift }] }}>
//         <Icon size={21} color={focused ? ACTIVE : INACTIVE} strokeWidth={focused ? 2.4 : 2} />
//       </Animated.View>
//       <Animated.View style={[styles.dot, { opacity: anim, transform: [{ scale: anim }] }]} />
//     </View>
//   );
// }

// /* =====================================================
//    MAIN TABS (safe-area aware: gesture bar ke upar)
// ===================================================== */

// function MainTabs() {
//   const insets = useSafeAreaInsets();
//   const bottom = Math.max(insets.bottom, 8);

//   return (
//     <Tab.Navigator
//       initialRouteName="Home"
//       screenOptions={({ route }) => ({
//         headerShown: false,
//         lazy: true,
//         tabBarHideOnKeyboard: true,
//         tabBarActiveTintColor: ACTIVE,
//         tabBarInactiveTintColor: INACTIVE,
//         tabBarLabelStyle: { fontSize: 9.5, fontWeight: '800', marginTop: 4 },
//         tabBarItemStyle: { paddingTop: 4 },
//         tabBarStyle: {
//           height: 62 + bottom,
//           paddingTop: 8,
//           paddingBottom: bottom,
//           backgroundColor: '#FFFFFF',
//           borderTopLeftRadius: 24,
//           borderTopRightRadius: 24,
//           borderTopWidth: 0,
//           position: 'relative',
//           elevation: 16,
//           shadowColor: '#0B2447',
//           shadowOpacity: 0.09,
//           shadowRadius: 14,
//           shadowOffset: { width: 0, height: -5 },
//         },
//         tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
//       })}
//     >
//       <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
//       <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarLabel: 'Attendance' }} />
//       <Tab.Screen name="Leave" component={LeaveScreen} options={{ tabBarLabel: 'Leave' }} />
//       <Tab.Screen name="More" component={FeatureListScreen} options={{ tabBarLabel: 'More' }} />
//     </Tab.Navigator>
//   );
// }

// /* =====================================================
//    APP NAVIGATOR
// ===================================================== */

// const pushScreen = { animation: 'slide_from_right', gestureEnabled: true };

// export default function AppNavigator() {
//   const { user, loading } = useAuth();

//   // Auth state load hone tak splash (pehle blank screen aati thi)
//   if (loading) {
//     return (
//       <View style={styles.splash}>
//         <ActivityIndicator size="large" color={ACTIVE} />
//       </View>
//     );
//   }

//   return (
//     <NavigationContainer theme={navTheme}>
//       <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
//         {!user ? (
//           <>
//             <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
//             <Stack.Screen name="OTP" component={OtpScreen} options={pushScreen} />
//             <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={pushScreen} />
//           </>
//         ) : (
//           <>
//             <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />

//             {/* Tab bar ke bina, back-arrow wale screens */}
//             <Stack.Screen name="Employees" component={EmployeesScreen} options={pushScreen} />
//             <Stack.Screen name="Expenses" component={ExpensesScreen} options={pushScreen} />
//             <Stack.Screen name="Profile" component={ProfileScreen} options={pushScreen} />
//             <Stack.Screen name="FeatureList" component={FeatureListScreen} options={pushScreen} />
//           </>
//         )}
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

// const styles = StyleSheet.create({
//   splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7FB' },
//   iconWrap: { width: 48, height: 34, alignItems: 'center', justifyContent: 'center' },
//   pill: { position: 'absolute', width: 48, height: 32, borderRadius: 15, backgroundColor: ACTIVE_SOFT },
//   dot: { position: 'absolute', bottom: -7, width: 4, height: 4, borderRadius: 2, backgroundColor: ACTIVE },
// });



import React, {useEffect, useRef} from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Home,
  Clock3,
  CalendarDays,
  LayoutGrid,
} from 'lucide-react-native';

import {useAuth} from '../context/AuthContext';
import {theme} from '../theme/theme';
import usePermissions from '../hooks/usePermissions';
import {useTheme} from '../context/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import LeaveScreen from '../screens/LeaveScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FeatureListScreen from '../screens/FeatureListScreen';
import AppearanceScreen from '../screens/AppearanceScreen';

// Employees intentionally disabled for now.
import EmployeesScreen from '../screens/EmployeesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ============================================================
   TAB ICONS
============================================================ */

const ICONS = {
  Home,
  Attendance: Clock3,
  Leave: CalendarDays,
  More: LayoutGrid,
};

/* ============================================================
   TAB ICON
   Existing animated pill + icon pop + active dot preserved
============================================================ */

function TabIcon({name, focused}) {
  const Icon = ICONS[name] || Home;

  const anim = useRef(
    new Animated.Value(focused ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 10,
    }).start();
  }, [focused, anim]);

  const pillScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });

  const iconScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const lift = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  return (
    <View style={styles.iconWrap}>
      <Animated.View
        style={[
          styles.pill,
          {
            opacity: anim,
            transform: [{scale: pillScale}],
            backgroundColor: theme.colors.primarySoft || '#EAF3FF',
          },
        ]}
      />

      <Animated.View
        style={{
          transform: [
            {scale: iconScale},
            {translateY: lift},
          ],
        }}
      >
        <Icon
          size={21}
          color={
            focused
              ? theme.colors.primary
              : theme.colors.muted
          }
          strokeWidth={focused ? 2.4 : 2}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.dot,
          {
            opacity: anim,
            transform: [{scale: anim}],
            backgroundColor: theme.colors.primary,
          },
        ]}
      />
    </View>
  );
}

/* ============================================================
   NO ACCESS SCREEN
============================================================ */

function NoAccess() {
  return (
    <View
      style={[
        styles.noAccess,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text style={styles.noAccessIcon}>⊘</Text>

      <Text
        style={[
          styles.noAccessTitle,
          {
            color: theme.colors.text,
          },
        ]}
      >
        No access
      </Text>

      <Text
        style={[
          styles.noAccessText,
          {
            color: theme.colors.muted,
          },
        ]}
      >
        You do not have permission to view this section.
        Please contact your admin.
      </Text>
    </View>
  );
}

/* ============================================================
   PERMISSION GUARD
============================================================ */

function guard(Component, feature) {
  return function Guarded(props) {
    const {can, loading} = usePermissions();

    if (loading) {
      return (
        <View
          style={[
            styles.permissionLoading,
            {
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          <ActivityIndicator
            color={theme.colors.primary}
          />
        </View>
      );
    }

    if (!can(feature)) {
      return <NoAccess />;
    }

    return <Component {...props} />;
  };
}

/* ============================================================
   GUARDED SCREENS
============================================================ */

const GuardedAttendance = guard(
  AttendanceScreen,
  'Attendance',
);

const GuardedLeave = guard(
  LeaveScreen,
  'Leave',
);

const GuardedExpenses = guard(
  ExpensesScreen,
  'Expenses',
);

const GuardedProfile = guard(
  ProfileScreen,
  'Edit Profile',
);

const GuardedEmployees = guard(EmployeesScreen, 'Employee Directory');

/* ============================================================
   MAIN TABS
   Attendance / Leave tab permission ke according hide/show
============================================================ */

function MainTabs() {
  const {can} = usePermissions();

  const insets = useSafeAreaInsets();

  const bottom = Math.max(
    insets.bottom,
    8,
  );

  /*
   * Permission nahi hone par tab button completely hide.
   */
  const hide = {
    tabBarButton: () => null,
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({route}) => ({
        headerShown: false,

        lazy: true,

        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor:
          theme.colors.primary,

        tabBarInactiveTintColor:
          theme.colors.muted,

        tabBarLabelStyle: {
          fontSize: 9.5,
          fontWeight: '800',
          marginTop: 4,
        },

        tabBarItemStyle: {
          paddingTop: 4,
        },

        tabBarStyle: {
          height: 62 + bottom,

          paddingTop: 8,

          paddingBottom: bottom,

          backgroundColor:
            theme.colors.card,

          borderTopLeftRadius: 24,

          borderTopRightRadius: 24,

          borderTopWidth: 0,

          position: 'relative',

          elevation: 16,

          shadowColor: '#0B2447',

          shadowOpacity: 0.09,

          shadowRadius: 14,

          shadowOffset: {
            width: 0,
            height: -5,
          },
        },

        tabBarIcon: ({focused}) => (
          <TabIcon
            name={route.name}
            focused={focused}
          />
        ),
      })}
    >
      {/* HOME */}

      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />

      {/* ATTENDANCE */}

      <Tab.Screen
        name="Attendance"
        component={GuardedAttendance}
        options={
          can('Attendance')
            ? {
                tabBarLabel: 'Attendance',
              }
            : hide
        }
      />

      {/* LEAVE */}

      <Tab.Screen
        name="Leave"
        component={GuardedLeave}
        options={
          can('Leave')
            ? {
                tabBarLabel: 'Leave',
              }
            : hide
        }
      />

      {/* MORE */}

      <Tab.Screen
        name="More"
        component={FeatureListScreen}
        options={{
          tabBarLabel: 'More',
        }}
      />
    </Tab.Navigator>
  );
}

/* ============================================================
   APP NAVIGATOR
============================================================ */

const pushScreen = {
  animation: 'slide_from_right',
  gestureEnabled: true,
};

export default function AppNavigator() {
  const {user, loading} = useAuth();

  const {version} = useTheme();

  /*
   * Navigation state preserve karne ke liye.
   */
  const navState = useRef();

  /* ----------------------------------------------------------
     AUTH LOADING
  ---------------------------------------------------------- */

  if (loading) {
    return (
      <View
        style={[
          styles.splash,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
        />
      </View>
    );
  }

  /* ----------------------------------------------------------
     NAVIGATION THEME
  ---------------------------------------------------------- */

  const NavTheme = {
    ...DefaultTheme,

    colors: {
      ...DefaultTheme.colors,

      background:
        theme.colors.background,

      primary:
        theme.colors.primary,

      card:
        theme.colors.card,

      border:
        theme.colors.border,

      text:
        theme.colors.text,
    },
  };

  return (
    <NavigationContainer
      key={version}
      theme={NavTheme}
      initialState={navState.current}
      onStateChange={state => {
        navState.current = state;
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,

          animation: 'slide_from_right',

          contentStyle: {
            backgroundColor:
              theme.colors.background,
          },
        }}
      >
        {/* ==================================================
            LOGGED OUT
        ================================================== */}

        {!user ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                animation: 'fade',
              }}
            />

            <Stack.Screen
              name="OTP"
              component={OtpScreen}
              options={pushScreen}
            />

            <Stack.Screen
              name="ForgotPassword"
              component={
                ForgotPasswordScreen
              }
              options={pushScreen}
            />
          </>
        ) : (
          /* ==================================================
             LOGGED IN
          ================================================== */

          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{
                animation: 'fade',
              }}
            />

            <Stack.Screen
              name="Employees"
              component={GuardedEmployees}
              options={pushScreen}
            />

            <Stack.Screen
              name="Expenses"
              component={GuardedExpenses}
              options={pushScreen}
            />

            <Stack.Screen
              name="Profile"
              component={GuardedProfile}
              options={pushScreen}
            />

            <Stack.Screen
              name="Appearance"
              component={AppearanceScreen}
              options={pushScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrap: {
    width: 48,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pill: {
    position: 'absolute',

    width: 48,
    height: 32,

    borderRadius: 15,
  },

  // dot: {
  //   position: 'absolute',

  //   bottom: -7,

  //   width: 4,
  //   height: 4,

  //   borderRadius: 2,
  // },

  noAccess: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    padding: 30,
  },

  noAccessIcon: {
    fontSize: 34,

    color: '#A3ADBC',
  },

  noAccessTitle: {
    fontSize: 14,

    fontWeight: '800',

    marginTop: 10,
  },

  noAccessText: {
    fontSize: 11,

    marginTop: 5,

    textAlign: 'center',

    lineHeight: 17,
  },

  permissionLoading: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',
  },
});
