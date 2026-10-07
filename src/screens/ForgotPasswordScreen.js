// import React,{useState} from 'react';
// import {Alert,Text} from 'react-native';
// import Screen from '../components/Screen';
// import {Button,Field,Title} from '../components/UI';
// import client,{endpoints} from '../api/client';

// export default function ForgotPasswordScreen(){const [email,setEmail]=useState('');const [otp,setOtp]=useState('');const [password,setPassword]=useState('');const [step,setStep]=useState(1);
//  const send=async()=>{try{await client.post(endpoints.forgotSendOtp,{email});setStep(2)}catch(e){Alert.alert('Error',e?.response?.data?.error||'Unable to send OTP')}};
//  const reset=async()=>{try{await client.post(endpoints.forgotReset,{email,otp,new_password:password});Alert.alert('Success','Password reset successfully. You can sign in now.');setStep(1)}catch(e){Alert.alert('Error',e?.response?.data?.error||'Invalid OTP or password')}};
//  return <Screen><Title>Reset password</Title><Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address"/>{step===2&&<><Field label="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad"/><Field label="New password" value={password} onChangeText={setPassword} secureTextEntry/></>}<Button onPress={step===1?send:reset}>{step===1?'Send OTP':'Reset password'}</Button>{step===2&&<Text onPress={send} style={{textAlign:'center',marginTop:16,color:'#173B7A'}}>Resend OTP</Text>}</Screen>;}


import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Screen from '../components/Screen';
import { Button, Field } from '../components/UI';
import client, { endpoints } from '../api/client';

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

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

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

      await client.post(endpoints.forgotSendOtp, {
        email: cleanEmail,
      });

      setStep(2);
      setOtp('');
      setCountdown(30);

      Alert.alert(
        'OTP sent',
        `A password reset OTP has been sent to ${cleanEmail}.`
      );
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Unable to send OTP.';

      Alert.alert('Error', message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (countdown > 0 || resending) return;

    const cleanEmail = email.trim();

    try {
      setResending(true);

      await client.post(endpoints.forgotSendOtp, {
        email: cleanEmail,
      });

      setOtp('');
      setCountdown(30);

      Alert.alert(
        'OTP sent',
        'A new password reset OTP has been sent.'
      );
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        'Unable to resend OTP.';

      Alert.alert('Resend failed', message);
    } finally {
      setResending(false);
    }
  };

  const reset = async () => {
    const cleanEmail = email.trim();
    const cleanOtp = otp.trim();

    if (!cleanOtp || !/^\d{6}$/.test(cleanOtp)) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the 6-digit OTP.'
      );
      return;
    }

    if (!password) {
      Alert.alert(
        'HRTRAC',
        'Please enter a new password.'
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Weak password',
        'Password must contain at least 8 characters.'
      );
      return;
    }

    try {
      setBusy(true);

      await client.post(endpoints.forgotReset, {
        email: cleanEmail,
        otp: cleanOtp,
        new_password: password,
      });

      Alert.alert(
        'Password reset',
        'Your password has been reset successfully. You can now sign in.',
        [
          {
            text: 'Go to login',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );

      setEmail('');
      setOtp('');
      setPassword('');
      setStep(1);
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Invalid OTP or password.';

      Alert.alert('Reset failed', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>H</Text>
            </View>

            <Text style={styles.brandName}>
              HRTRAC
            </Text>

            <Text style={styles.brandSubtitle}>
              Human Resources & Team Administration
            </Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>
                🔐
              </Text>
            </View>

            <Text style={styles.heading}>
              {step === 1
                ? 'Forgot your password?'
                : 'Reset your password'}
            </Text>

            <Text style={styles.description}>
              {step === 1
                ? 'Enter your registered email address and we will send you a verification code.'
                : `Enter the OTP sent to ${email} and create a new password.`}
            </Text>

            {/* Email */}
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={step === 1 && !busy}
              placeholder="Enter your email"
            />

            {/* Step 2 */}
            {step === 2 && (
              <>
                <Field
                  label="6-digit OTP"
                  value={otp}
                  onChangeText={text =>
                    setOtp(
                      text
                        .replace(/\D/g, '')
                        .slice(0, 6)
                    )
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!busy}
                  placeholder="Enter OTP"
                />

                <Field
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!busy}
                  placeholder="Enter new password"
                />

                <Text style={styles.passwordHint}>
                  Password should contain at least 8 characters.
                </Text>
              </>
            )}

            {/* Main button */}
            <Button
              disabled={busy || resending}
              onPress={step === 1 ? send : reset}
            >
              {busy
                ? step === 1
                  ? 'Sending OTP...'
                  : 'Resetting password...'
                : step === 1
                ? 'Send OTP'
                : 'Reset password'}
            </Button>

            {/* Resend */}
            {step === 2 && (
              <View style={styles.resendContainer}>
                <Text style={styles.resendLabel}>
                  Didn't receive the OTP?
                </Text>

                <TouchableOpacity
                  disabled={
                    countdown > 0 ||
                    resending ||
                    busy
                  }
                  onPress={resend}
                >
                  <Text
                    style={[
                      styles.resendText,
                      (countdown > 0 ||
                        resending ||
                        busy) &&
                        styles.resendDisabled,
                    ]}
                  >
                    {resending
                      ? 'Sending...'
                      : countdown > 0
                      ? `Resend in ${countdown}s`
                      : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Back */}
            <TouchableOpacity
              disabled={busy || resending}
              onPress={() => {
                if (step === 2) {
                  setStep(1);
                  setOtp('');
                  setPassword('');
                } else {
                  navigation.goBack();
                }
              }}
              style={styles.backButton}
            >
              <Text style={styles.backText}>
                ← {step === 2
                  ? 'Change email'
                  : 'Back to login'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security */}
          <View style={styles.securityBox}>
            <Text style={styles.securityIcon}>
              🛡️
            </Text>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Account security
              </Text>

              <Text style={styles.securityText}>
                Never share your OTP or password with anyone.
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            HRTRAC Mobile
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 30,
  },

  brandContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },

  logo: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#173B7A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },

  brandName: {
    color: '#173B7A',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  brandSubtitle: {
    color: '#697386',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,

    elevation: 4,
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 15,
  },

  icon: {
    fontSize: 25,
  },

  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: '#172033',
    textAlign: 'center',
  },

  description: {
    color: '#697386',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },

  passwordHint: {
    color: '#8A94A6',
    fontSize: 11,
    marginTop: -8,
    marginBottom: 14,
  },

  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  resendLabel: {
    color: '#697386',
    fontSize: 13,
  },

  resendText: {
    color: '#173B7A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },

  resendDisabled: {
    color: '#9CA3AF',
  },

  backButton: {
    alignItems: 'center',
    marginTop: 22,
  },

  backText: {
    color: '#173B7A',
    fontSize: 14,
    fontWeight: '700',
  },

  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },

  securityIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#172033',
  },

  securityText: {
    fontSize: 12,
    color: '#697386',
    marginTop: 2,
  },

  footer: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 22,
  },
});