// import React from 'react';
// import {StatusBar} from 'expo-status-bar';
// import {AuthProvider} from './src/context/AuthContext';
// import AppNavigator from './src/navigation/AppNavigator';

// export default function App() {
//   return <AuthProvider>
//     <StatusBar style="dark" />
//     <AppNavigator />
//   </AuthProvider>;
// }


// ============================================================
// HRTRAC · App entry
// ThemeProvider (Light/Dark/System + accent) > AuthProvider
// ============================================================

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}