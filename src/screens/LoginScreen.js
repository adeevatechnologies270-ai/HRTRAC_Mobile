import React, { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Screen from '../components/Screen';
import { Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, requestOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --------------------------------------------------
  // ANIMATION VALUES
  // --------------------------------------------------

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(35)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),

      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),

      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const doLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert('HRTRAC', 'Please enter your email address.');
      return;
    }

    if (!password) {
      Alert.alert('HRTRAC', 'Please enter your password.');
      return;
    }

    try {
      setBusy(true);

      await login(cleanEmail, password);
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Please check your email and password.';

      Alert.alert('Login failed', message);
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // OTP LOGIN
  // --------------------------------------------------

  const handleOtpLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'HRTRAC',
        'Please enter your email address first.'
      );
      return;
    }

    try {
      setBusy(true);

      await requestOtp(cleanEmail);

      navigation.navigate('OTP', {
        email: cleanEmail,
      });
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Could not send OTP. Please try again.';

      Alert.alert('OTP failed', message);
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

          {/* ==========================================
              BACKGROUND DECORATION
          ========================================== */}

          <View
            pointerEvents="none"
            style={styles.backgroundCircleLarge}
          />

          <View
            pointerEvents="none"
            style={styles.backgroundCircleSmall}
          />

          {/* ==========================================
              BRAND
          ========================================== */}

          <Animated.View
            style={[
              styles.brandContainer,
              {
                opacity: logoOpacity,
                transform: [
                  {
                    scale: logoScale,
                  },
                ],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/hrtrac-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.brandTitle}>
              HRTRAC
            </Text>

            <Text style={styles.brandSubtitle}>
              Human Resources & Team Administration
            </Text>
          </Animated.View>

          {/* ==========================================
              LOGIN CARD
          ========================================== */}

          <Animated.View
            style={[
              styles.loginCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim,
                  },
                ],
              },
            ]}
          >

            {/* Header */}

            <View style={styles.cardHeader}>
              <Text style={styles.welcomeTitle}>
                Welcome back
              </Text>

              <Text style={styles.welcomeSubtitle}>
                Sign in to manage your work, team and
                HR activities.
              </Text>
            </View>

            {/* ======================================
                EMAIL
            ====================================== */}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Email address
              </Text>

              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Text style={styles.iconText}>
                    @
                  </Text>
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@company.com"
                  placeholderTextColor="#A5ADBA"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  returnKeyType="next"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* ======================================
                PASSWORD
            ====================================== */}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Password
              </Text>

              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Text style={styles.lockIcon}>
                    •••
                  </Text>
                </View>

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#A5ADBA"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  returnKeyType="done"
                  onSubmitEditing={doLogin}
                  style={styles.textInput}
                />

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    setShowPassword((value) => !value)
                  }
                  hitSlop={10}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ======================================
                FORGOT PASSWORD
            ====================================== */}

            <Pressable
              disabled={busy}
              onPress={() =>
                navigation.navigate('ForgotPassword')
              }
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>
                Forgot password?
              </Text>
            </Pressable>

            {/* ======================================
                SIGN IN
            ====================================== */}

            <View style={styles.signInWrapper}>
              {busy ? (
                <View style={styles.loadingButton}>
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text style={styles.loadingButtonText}>
                    Signing in...
                  </Text>
                </View>
              ) : (
                <Button onPress={doLogin}>
                  Sign in
                </Button>
              )}
            </View>

            {/* ======================================
                DIVIDER
            ====================================== */}

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />

              <View style={styles.orContainer}>
                <Text style={styles.orText}>
                  OR
                </Text>
              </View>

              <View style={styles.dividerLine} />
            </View>

            {/* ======================================
                OTP LOGIN
            ====================================== */}

            <Button
              secondary
              disabled={busy}
              onPress={handleOtpLogin}
            >
              Login with OTP
            </Button>

            {/* ======================================
                SECURITY NOTE
            ====================================== */}

            <View style={styles.securityBox}>
              <View style={styles.securityIcon}>
                <Text style={styles.securityIconText}>
                  ✓
                </Text>
              </View>

              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>
                  Secure login
                </Text>

                <Text style={styles.securityText}>
                  Your account information is protected
                  with secure authentication.
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ==========================================
              FOOTER
          ========================================== */}

          <Animated.View
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.footerMain}>
              HRTRAC Mobile
            </Text>

            <Text style={styles.footerSub}>
              Smart • Secure • Simple
            </Text>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ====================================================
// STYLES
// ====================================================

const styles = StyleSheet.create({

  keyboard: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 25,
    position: 'relative',
    overflow: 'hidden',
  },

  // --------------------------------------------------
  // BACKGROUND
  // --------------------------------------------------

  backgroundCircleLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#EEF4FF',
    top: -130,
    right: -100,
  },

  backgroundCircleSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F5F8FF',
    bottom: -80,
    left: -80,
  },

  // --------------------------------------------------
  // BRAND
  // --------------------------------------------------

  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logoWrapper: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#173B7A',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,

    elevation: 5,

    marginBottom: 12,
  },

  logo: {
    width: 76,
    height: 76,
  },

  brandTitle: {
    color: '#173B7A',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 2,
  },

  brandSubtitle: {
    color: '#697386',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },

  // --------------------------------------------------
  // CARD
  // --------------------------------------------------

  loginCard: {
    backgroundColor: '#FFFFFF',

    borderRadius: 22,

    paddingHorizontal: 20,
    paddingVertical: 22,

    borderWidth: 1,
    borderColor: '#EEF1F6',

    shadowColor: '#172033',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,

    elevation: 5,
  },

  cardHeader: {
    marginBottom: 22,
  },

  welcomeTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#172033',
    letterSpacing: -0.4,
  },

  welcomeSubtitle: {
    color: '#697386',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  // --------------------------------------------------
  // INPUTS
  // --------------------------------------------------

  inputGroup: {
    marginBottom: 17,
  },

  inputLabel: {
    color: '#283247',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },

  inputWrapper: {
    minHeight: 53,

    borderWidth: 1,
    borderColor: '#DDE3EC',

    borderRadius: 13,

    backgroundColor: '#FAFBFD',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 12,
  },

  inputIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,

    backgroundColor: '#EEF4FF',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  iconText: {
    color: '#173B7A',
    fontSize: 17,
    fontWeight: '900',
  },

  lockIcon: {
    color: '#173B7A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: -2,
  },

  textInput: {
    flex: 1,

    minHeight: 50,

    color: '#172033',
    fontSize: 15,

    paddingVertical: 0,
  },

  eyeButton: {
    paddingHorizontal: 5,
    paddingVertical: 8,
  },

  eyeText: {
    color: '#173B7A',
    fontSize: 12,
    fontWeight: '800',
  },

  // --------------------------------------------------
  // FORGOT
  // --------------------------------------------------

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -3,
    marginBottom: 5,
    paddingVertical: 6,
  },

  forgotText: {
    color: '#173B7A',
    fontSize: 13,
    fontWeight: '800',
  },

  // --------------------------------------------------
  // SIGN IN
  // --------------------------------------------------

  signInWrapper: {
    marginTop: 2,
  },

  loadingButton: {
    minHeight: 50,

    borderRadius: 12,

    backgroundColor: '#173B7A',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 10,
  },

  loadingButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 9,
  },

  // --------------------------------------------------
  // DIVIDER
  // --------------------------------------------------

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8EBF0',
  },

  orContainer: {
    paddingHorizontal: 13,
  },

  orText: {
    color: '#A0A8B5',
    fontSize: 11,
    fontWeight: '800',
  },

  // --------------------------------------------------
  // SECURITY
  // --------------------------------------------------

  securityBox: {
    marginTop: 18,

    backgroundColor: '#F6F9FF',

    borderRadius: 13,

    padding: 12,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#E4ECFA',
  },

  securityIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,

    backgroundColor: '#173B7A',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  securityIconText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: '#283247',
    fontSize: 12,
    fontWeight: '800',
  },

  securityText: {
    color: '#7A8494',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  // --------------------------------------------------
  // FOOTER
  // --------------------------------------------------

  footer: {
    alignItems: 'center',
    marginTop: 22,
  },

  footerMain: {
    color: '#697386',
    fontSize: 11,
    fontWeight: '700',
  },

  footerSub: {
    color: '#A0A8B5',
    fontSize: 10,
    marginTop: 3,
  },
});