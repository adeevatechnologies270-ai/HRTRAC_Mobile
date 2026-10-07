// import React,{useState} from 'react';
// import {Alert} from 'react-native';
// import Screen from '../components/Screen';
// import {Button,Field,Title} from '../components/UI';
// import {useAuth} from '../context/AuthContext';

// export default function OtpScreen({route}){const {email}=route.params||{};const [otp,setOtp]=useState('');const [busy,setBusy]=useState(false);const {verifyOtp}=useAuth();
//  const submit=async()=>{try{setBusy(true);await verifyOtp(email,otp)}catch(e){Alert.alert('OTP failed',e?.response?.data?.error||e.message)}finally{setBusy(false)}};
//  return <Screen><Title sub={`OTP sent to ${email}`}>Verify OTP</Title><Field label="6 digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}/><Button disabled={busy} onPress={submit}>{busy?'Verifying...':'Verify & continue'}</Button></Screen>;}



import React, { useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';

export default function OtpScreen({ route, navigation }) {
  const { email = '' } = route.params || {};

  const { verifyOtp, requestOtp } = useAuth();

  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const [countdown, setCountdown] = useState(30);

  const otpInputRef = useRef(null);

  // Countdown for resend OTP
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const submit = async () => {
    const cleanOtp = otp.trim();

    if (!email) {
      Alert.alert(
        'HRTRAC',
        'Email information is missing. Please go back and try again.'
      );
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert(
        'Invalid OTP',
        'Please enter the 6-digit OTP.'
      );
      return;
    }

    try {
      setBusy(true);

      await verifyOtp(email, cleanOtp);

      // AuthContext should update the user/session.
      // AppNavigator will automatically open the main app.
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'The OTP is incorrect or has expired.';

      Alert.alert('OTP verification failed', message);
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

      Alert.alert(
        'OTP sent',
        `A new OTP has been sent to ${email}.`
      );
    } catch (e) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        'Unable to resend OTP.';

      Alert.alert('Resend failed', message);
    } finally {
      setResending(false);
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

            <Text style={styles.brandName}>HRTRAC</Text>

            <Text style={styles.brandSubtitle}>
              Human Resources & Team Administration
            </Text>
          </View>

          {/* OTP Card */}
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>✉</Text>
            </View>

            <Text style={styles.heading}>
              Verify your email
            </Text>

            <Text style={styles.description}>
              We've sent a 6-digit verification code to
            </Text>

            <Text style={styles.email}>
              {email}
            </Text>

            <Field
              label="6-digit OTP"
              value={otp}
              onChangeText={text =>
                setOtp(text.replace(/\D/g, '').slice(0, 6))
              }
              keyboardType="number-pad"
              maxLength={6}
              editable={!busy}
              placeholder="Enter OTP"
              autoFocus
            />

            <Button
              disabled={busy || otp.length !== 6}
              onPress={submit}
            >
              {busy ? 'Verifying...' : 'Verify & continue'}
            </Button>

            {/* Resend */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendLabel}>
                Didn't receive the code?
              </Text>

              <TouchableOpacity
                disabled={countdown > 0 || resending}
                onPress={resendOtp}
              >
                <Text
                  style={[
                    styles.resendText,
                    (countdown > 0 || resending) &&
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

            {/* Change email */}
            <TouchableOpacity
              disabled={busy || resending}
              onPress={() => navigation.goBack()}
              style={styles.changeEmail}
            >
              <Text style={styles.changeEmailText}>
                ← Use a different email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security note */}
          <View style={styles.securityBox}>
            <Text style={styles.securityIcon}>🔒</Text>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Secure verification
              </Text>

              <Text style={styles.securityText}>
                Never share your OTP with anyone.
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
  },

  email: {
    color: '#173B7A',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
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

  changeEmail: {
    alignItems: 'center',
    marginTop: 22,
  },

  changeEmailText: {
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