import React, { useEffect, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import { Alert, Text, View, StyleSheet } from 'react-native';

import {
  AuthLayout, AuthTitle, AuthButton, OtpBoxes, IconBadge, TextLink, SecurityNote,
} from '../components/AuthKit';
import { FadeInUp } from '../components/Animated';
import { useAuth } from '../context/AuthContext';

const errorMessage = (e, fallback) =>
  e?.response?.data?.detail ||
  e?.response?.data?.error ||
  e?.response?.data?.message ||
  e?.message ||
  fallback;

export default function OtpScreen({ route, navigation }) {
  const { email = '' } = route.params || {};
  const { verifyOtp, requestOtp } = useAuth();

  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const submit = async () => {
    const cleanOtp = otp.trim();

    if (!email) {
      Alert.alert('HRTRAC', 'Email information is missing. Please go back and try again.');
      return;
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }

    try {
      setBusy(true);
      await verifyOtp(email, cleanOtp);
      // AuthContext user set karta hai, AppNavigator main app khol deta hai.
    } catch (e) {
      Alert.alert('OTP verification failed', errorMessage(e, 'The OTP is incorrect or has expired.'));
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!email || countdown > 0 || resending) return;

    try {
      setResending(true);
      await requestOtp(email);
      setOtp('');
      setCountdown(30);
      Alert.alert('OTP sent', `A new OTP has been sent to ${email}.`);
    } catch (e) {
      Alert.alert('Resend failed', errorMessage(e, 'Unable to resend OTP.'));
    } finally {
      setResending(false);
    }
  };

  const canResend = countdown <= 0 && !resending && !busy;

  return (
    <AuthLayout compact onBack={() => navigation.goBack()}>
      <FadeInUp distance={12}>
        <IconBadge name="mail" />

        <AuthTitle title="Verify your email" sub="We've sent a 6-digit verification code to" />
        <View style={styles.emailPill}>
          <Text style={styles.emailText} numberOfLines={1}>{email}</Text>
        </View>

        <OtpBoxes value={otp} onChange={setOtp} disabled={busy} autoFocus />

        <AuthButton
          title="Verify & continue"
          icon="check"
          loading={busy}
          loadingText="Verifying..."
          disabled={otp.length !== 6}
          onPress={submit}
        />

        <View style={styles.resend}>
          <Text style={styles.resendLabel}>Didn't receive the code?</Text>
          <TextLink icon="refresh-cw" disabled={!canResend} onPress={resendOtp} style={{ marginTop: 8 }}>
            {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
          </TextLink>
        </View>

        <TextLink icon="arrow-left" disabled={busy || resending} onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          Use a different email
        </TextLink>

        <SecurityNote title="Secure verification" text="Never share your OTP with anyone." />
      </FadeInUp>
    </AuthLayout>
  );
}

const styles = themedCreate({
  emailPill: {
    alignSelf: 'flex-start', backgroundColor: '#EAF2FF', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7, marginTop: -8, marginBottom: 22, maxWidth: '100%',
  },
  emailText: { color: '#0C438B', fontSize: 13, fontWeight: '800' },
  resend: { alignItems: 'center', marginTop: 20 },
  resendLabel: { color: '#8A95A8', fontSize: 12 },
});