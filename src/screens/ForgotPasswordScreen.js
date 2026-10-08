import React, { useEffect, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import {
  AuthLayout, AuthTitle, AuthInput, AuthButton, OtpBoxes, Steps, TextLink, SecurityNote,
} from '../components/AuthKit';
import { FadeInUp } from '../components/Animated';
import { theme } from '../theme/theme';
import client, { endpoints } from '../api/client';

const errorMessage = (e, fallback) =>
  e?.response?.data?.detail ||
  e?.response?.data?.error ||
  e?.response?.data?.message ||
  e?.message ||
  fallback;

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  const send = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      Alert.alert('HRTRAC', 'Please enter your email address.');
      return;
    }

    try {
      setBusy(true);
      await client.post(endpoints.forgotSendOtp, { email: cleanEmail });
      setStep(2);
      setOtp('');
      setCountdown(30);
      Alert.alert('OTP sent', `A password reset OTP has been sent to ${cleanEmail}.`);
    } catch (e) {
      Alert.alert('Error', errorMessage(e, 'Unable to send OTP.'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (countdown > 0 || resending) return;

    try {
      setResending(true);
      await client.post(endpoints.forgotSendOtp, { email: email.trim() });
      setOtp('');
      setCountdown(30);
      Alert.alert('OTP sent', 'A new password reset OTP has been sent.');
    } catch (e) {
      Alert.alert('Resend failed', errorMessage(e, 'Unable to resend OTP.'));
    } finally {
      setResending(false);
    }
  };

  const reset = async () => {
    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }
    if (!password) {
      Alert.alert('HRTRAC', 'Please enter a new password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must contain at least 8 characters.');
      return;
    }

    try {
      setBusy(true);
      await client.post(endpoints.forgotReset, {
        email: cleanEmail,
        otp: cleanOtp,
        new_password: password,
      });

      Alert.alert('Password reset', 'Your password has been reset successfully. You can now sign in.', [
        { text: 'Go to login', onPress: () => navigation.navigate('Login') },
      ]);

      setEmail('');
      setOtp('');
      setPassword('');
      setStep(1);
    } catch (e) {
      Alert.alert('Reset failed', errorMessage(e, 'Invalid OTP or password.'));
    } finally {
      setBusy(false);
    }
  };

  const backToEmail = () => {
    setStep(1);
    setOtp('');
    setPassword('');
  };

  const lengthOk = password.length >= 8;
  const canResend = countdown <= 0 && !resending && !busy;

  return (
    <AuthLayout compact onBack={() => (step === 2 ? backToEmail() : navigation.goBack())}>
      <FadeInUp distance={12}>
        <Steps current={step} labels={['Verify email', 'New password']} />

        <AuthTitle
          title={step === 1 ? 'Forgot password?' : 'Create new password'}
          sub={
            step === 1
              ? 'Enter your registered email and we will send you a verification code.'
              : 'Enter the code we sent and choose a new password.'
          }
        />

        <AuthInput
          label="Email address"
          icon="mail"
          value={email}
          onChangeText={setEmail}
          placeholder="name@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={step === 1 && !busy}
          right={
            step === 2 ? (
              <Pressable onPress={backToEmail} hitSlop={10} disabled={busy}>
                <Text style={styles.change}>Change</Text>
              </Pressable>
            ) : null
          }
        />

        {step === 2 && (
          <>
            <Text style={styles.otpLabel}>Verification code</Text>
            <OtpBoxes value={otp} onChange={setOtp} disabled={busy} autoFocus />

            <AuthInput
              label="New password"
              icon="lock"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter new password"
              secureTextEntry
              autoCapitalize="none"
              editable={!busy}
            />

            <View style={styles.rule}>
              <Feather
                name={lengthOk ? 'check-circle' : 'circle'}
                size={15}
                color={lengthOk ? theme.colors.success : theme.colors.mutedSoft}
              />
              <Text style={[styles.ruleText, lengthOk && styles.ruleOk]}>At least 8 characters</Text>
            </View>
          </>
        )}

        <AuthButton
          title={step === 1 ? 'Send verification code' : 'Reset password'}
          icon={step === 1 ? 'send' : 'check'}
          loading={busy}
          loadingText={step === 1 ? 'Sending code...' : 'Resetting...'}
          disabled={resending}
          onPress={step === 1 ? send : reset}
        />

        {step === 2 && (
          <View style={styles.resend}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
            <TextLink icon="refresh-cw" disabled={!canResend} onPress={resend} style={{ marginTop: 8 }}>
              {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </TextLink>
          </View>
        )}

        <TextLink
          icon="arrow-left"
          disabled={busy || resending}
          onPress={() => navigation.goBack()}
          style={{ marginTop: 22 }}
        >
          Back to login
        </TextLink>

        <SecurityNote title="Account security" text="Never share your OTP or password with anyone." />
      </FadeInUp>
    </AuthLayout>
  );
}

const styles = themedCreate({
  change: { color: '#0C438B', fontSize: 12, fontWeight: '800' },
  otpLabel: { color: '#53627A', fontSize: 12, fontWeight: '700', marginBottom: 9, marginTop: 4 },
  rule: { flexDirection: 'row', alignItems: 'center', marginTop: -4, marginBottom: 20 },
  ruleText: { color: '#8A95A8', fontSize: 12, marginLeft: 7 },
  ruleOk: { color: '#159447' },
  resend: { alignItems: 'center', marginTop: 20 },
  resendLabel: { color: '#8A95A8', fontSize: 12 },
});