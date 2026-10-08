import React, { useRef, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';

import {
  AuthLayout, AuthTitle, AuthInput, AuthButton, OrDivider, SecurityNote,
} from '../components/AuthKit';
import { FadeInUp } from '../components/Animated';
import { useAuth } from '../context/AuthContext';

const errorMessage = (e, fallback) =>
  e?.response?.data?.detail ||
  e?.response?.data?.error ||
  e?.response?.data?.message ||
  e?.message ||
  fallback;

export default function LoginScreen({ navigation }) {
  const { login, requestOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(null); // 'login' | 'otp' | null

  const passwordRef = useRef(null);

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
      setBusy('login');
      await login(cleanEmail, password);
    } catch (e) {
      Alert.alert('Login failed', errorMessage(e, 'Please check your email and password.'));
    } finally {
      setBusy(null);
    }
  };

  const handleOtpLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert('HRTRAC', 'Please enter your email address first.');
      return;
    }

    try {
      setBusy('otp');
      await requestOtp(cleanEmail);
      navigation.navigate('OTP', { email: cleanEmail });
    } catch (e) {
      Alert.alert('OTP failed', errorMessage(e, 'Could not send OTP. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  const disabled = !!busy;

  return (
    <AuthLayout subtitle="Human Resources & Team Administration">
      <FadeInUp distance={12}>
        <AuthTitle title="Welcome back" sub="Sign in to continue to your workspace." />

        <AuthInput
          label="Email address"
          icon="mail"
          value={email}
          onChangeText={setEmail}
          placeholder="name@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <AuthInput
          ref={passwordRef}
          label="Password"
          icon="lock"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          returnKeyType="done"
          onSubmitEditing={doLogin}
        />

        <Pressable
          disabled={disabled}
          onPress={() => navigation.navigate('ForgotPassword')}
          hitSlop={8}
          style={styles.forgot}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        <AuthButton
          title="Sign in"
          icon="arrow-right"
          loading={busy === 'login'}
          loadingText="Signing in..."
          disabled={disabled}
          onPress={doLogin}
        />

        <OrDivider />

        <AuthButton
          variant="secondary"
          title="Sign in with OTP"
          icon="key"
          loading={busy === 'otp'}
          loadingText="Sending code..."
          disabled={disabled}
          onPress={handleOtpLogin}
        />

        <SecurityNote text="Your account information is protected with secure authentication." />
      </FadeInUp>
    </AuthLayout>
  );
}

const styles = themedCreate({
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 18, paddingVertical: 4 },
  forgotText: { color: '#0C438B', fontSize: 13, fontWeight: '700' },
});