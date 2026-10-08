import React, { forwardRef, useRef, useState } from 'react';
import { themedCreate } from '../theme/themedStyles';
import { StyleSheet } from 'react-native';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme/theme';
import { FadeInUp, PressScale } from './Animated';

// ============================================================
// HRTRAC · Auth UI kit (Login / OTP / Forgot password)
// Navy hero + overlapping sheet, line icons, OTP boxes.
// ============================================================

/* ---------------- Layout ---------------- */

export function AuthLayout({ children, onBack, compact = false, subtitle }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[s.hero, { paddingTop: insets.top + 18 }, compact && s.heroCompact]}>
            <View pointerEvents="none" style={s.circleA} />
            <View pointerEvents="none" style={s.circleB} />

            {onBack ? (
              <Pressable onPress={onBack} hitSlop={10} style={[s.backBtn, { top: insets.top + 12 }]}>
                <Feather name="arrow-left" size={20} color="#FFFFFF" />
              </Pressable>
            ) : null}

            <FadeInUp distance={10} style={s.brand}>
              <View style={[s.logoCard, compact && s.logoCardCompact]}>
                <Image
                  source={require('../../assets/hrtrac-logo.png')}
                  style={compact ? s.logoSmall : s.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.brandName}>HRTRAC</Text>
              {subtitle ? <Text style={s.brandSub}>{subtitle}</Text> : null}
            </FadeInUp>
          </View>

          <View style={[s.sheet, { paddingBottom: insets.bottom + 22 }]}>
            {children}
            <View style={{ flex: 1 }} />
            <Text style={s.footer}>HRTRAC Mobile</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function AuthTitle({ title, sub }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={s.title}>{title}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

/* ---------------- Input ---------------- */

export const AuthInput = forwardRef(function AuthInput(
  { label, icon, secureTextEntry, right, onFocus, onBlur, editable = true, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const iconColor = focused ? theme.colors.primary : theme.colors.mutedSoft;

  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}

      <View style={[s.inputWrap, focused && s.inputFocus, !editable && s.inputDisabled]}>
        {icon ? <Feather name={icon} size={18} color={iconColor} style={{ marginRight: 11 }} /> : null}

        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={theme.colors.mutedSoft}
          secureTextEntry={hidden}
          style={s.input}
          onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
          onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
          {...props}
        />

        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={theme.colors.mutedSoft} />
          </Pressable>
        ) : null}

        {right}
      </View>
    </View>
  );
});

/* ---------------- Buttons ---------------- */

export function AuthButton({ title, onPress, icon, loading, loadingText, disabled, variant = 'primary' }) {
  const primary = variant === 'primary';
  const off = disabled || loading;
  const fg = primary ? '#FFFFFF' : theme.colors.primary;

  return (
    <PressScale
      onPress={onPress}
      disabled={off}
      style={[s.btn, primary ? s.btnPrimary : s.btnSecondary, off && { opacity: 0.6 }]}
    >
      {loading ? (
        <>
          <ActivityIndicator color={fg} size="small" />
          {loadingText ? <Text style={[s.btnText, !primary && s.btnTextSecondary, { marginLeft: 10 }]}>{loadingText}</Text> : null}
        </>
      ) : (
        <>
          <Text style={[s.btnText, !primary && s.btnTextSecondary]}>{title}</Text>
          {icon ? <Feather name={icon} size={18} color={fg} style={{ marginLeft: 9 }} /> : null}
        </>
      )}
    </PressScale>
  );
}

export function TextLink({ children, onPress, disabled, icon, style }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={[s.linkRow, style]}>
      {icon ? <Feather name={icon} size={15} color={disabled ? theme.colors.mutedSoft : theme.colors.primary} style={{ marginRight: 6 }} /> : null}
      <Text style={[s.link, disabled && s.linkDisabled]}>{children}</Text>
    </Pressable>
  );
}

/* ---------------- Small pieces ---------------- */

export function OrDivider({ label = 'or' }) {
  return (
    <View style={s.orRow}>
      <View style={s.orLine} />
      <Text style={s.orText}>{label}</Text>
      <View style={s.orLine} />
    </View>
  );
}

export function SecurityNote({ title = 'Secure sign-in', text = 'Your account information is protected.' }) {
  return (
    <View style={s.note}>
      <View style={s.noteIcon}>
        <Feather name="shield" size={16} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.noteTitle}>{title}</Text>
        <Text style={s.noteText}>{text}</Text>
      </View>
    </View>
  );
}

export function IconBadge({ name }) {
  return (
    <View style={s.badge}>
      <Feather name={name} size={28} color={theme.colors.primary} />
    </View>
  );
}

export function Steps({ current, labels }) {
  return (
    <View style={s.steps}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={label}>
            {i > 0 ? <View style={[s.stepLine, current > i && s.stepLineOn]} /> : null}
            <View style={s.stepItem}>
              <View style={[s.stepDot, (active || done) && s.stepDotOn]}>
                {done ? (
                  <Feather name="check" size={13} color="#FFFFFF" />
                ) : (
                  <Text style={[s.stepNum, active && s.stepNumOn]}>{n}</Text>
                )}
              </View>
              <Text style={[s.stepLabel, (active || done) && s.stepLabelOn]}>{label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export function OtpBoxes({ value, onChange, disabled, length = 6, autoFocus }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split('');

  return (
    <View style={s.otpWrap}>
      <View style={s.otpRow}>
        {Array.from({ length }).map((_, i) => {
          const filled = !!digits[i];
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View key={i} style={[s.otpBox, filled && s.otpFilled, active && s.otpActive]}>
              <Text style={s.otpChar}>{digits[i] || ''}</Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        editable={!disabled}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={s.otpHidden}
      />
    </View>
  );
}

/* ---------------- Styles ---------------- */

const s = themedCreate({
  root: { flex: 1, backgroundColor: '#F7F9FC' },
  scroll: { flexGrow: 1 },

  hero: {
    backgroundColor: '#0C438B',
    paddingBottom: 54,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroCompact: { paddingBottom: 46 },
  circleA: { position: 'absolute', width: 240, height: 240, borderRadius: 120, top: -90, right: -70, backgroundColor: 'rgba(255,255,255,0.07)' },
  circleB: { position: 'absolute', width: 150, height: 150, borderRadius: 75, bottom: -50, left: -40, backgroundColor: 'rgba(255,255,255,0.05)' },

  backBtn: {
    position: 'absolute', left: 16, width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },

  brand: { alignItems: 'center', marginTop: 10 },
  logoCard: {
    width: 78, height: 78, borderRadius: 22, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    ...theme.shadow.floating,
  },
  logoCardCompact: { width: 60, height: 60, borderRadius: 18, marginBottom: 10 },
  logo: { width: 58, height: 58 },
  logoSmall: { width: 44, height: 44 },
  brandName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 3.5 },
  brandSub: { color: '#D8E8FF', fontSize: 11, marginTop: 5, letterSpacing: 0.3 },

  sheet: {
    flexGrow: 1,
    marginTop: -28,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 28,
  },

  title: { color: '#172033', fontSize: 25, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: '#697386', fontSize: 13, lineHeight: 19, marginTop: 6 },

  field: { marginBottom: 16 },
  label: { color: '#53627A', fontSize: 12, fontWeight: '700', marginBottom: 7 },
  inputWrap: {
    minHeight: 54, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E5EC', borderRadius: 14,
    backgroundColor: '#FBFCFE', paddingHorizontal: 14,
  },
  inputFocus: { borderColor: '#0C438B', backgroundColor: '#FFFFFF' },
  inputDisabled: { backgroundColor: '#F2F4F7' },
  input: { flex: 1, minHeight: 50, paddingVertical: 0, fontSize: 15, color: '#172033' },

  btn: {
    height: 54, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#0C438B', ...theme.shadow.floating },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#DCE3ED' },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  btnTextSecondary: { color: '#0C438B' },

  linkRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  link: { color: '#0C438B', fontSize: 13, fontWeight: '700' },
  linkDisabled: { color: '#A3ADBC' },

  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: '#EEF1F5' },
  orText: { color: '#A3ADBC', fontSize: 11, fontWeight: '700', marginHorizontal: 12, textTransform: 'uppercase', letterSpacing: 1 },

  note: {
    marginTop: 22, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#EEF1F5',
  },
  noteIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#EAF2FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  noteTitle: { color: '#344660', fontSize: 12, fontWeight: '800' },
  noteText: { color: '#8A95A8', fontSize: 11, marginTop: 2, lineHeight: 15 },

  badge: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#EAF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },

  steps: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#F0F2F5',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotOn: { backgroundColor: '#0C438B' },
  stepNum: { color: '#8A95A8', fontSize: 11, fontWeight: '800' },
  stepNumOn: { color: '#FFFFFF' },
  stepLabel: { color: '#A3ADBC', fontSize: 11, fontWeight: '700', marginLeft: 7 },
  stepLabelOn: { color: '#344660' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#EEF1F5', marginHorizontal: 10, borderRadius: 1 },
  stepLineOn: { backgroundColor: '#0C438B' },

  otpWrap: { marginBottom: 18 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: {
    width: '14.4%', height: 58, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E5EC',
    backgroundColor: '#FBFCFE', alignItems: 'center', justifyContent: 'center',
  },
  otpFilled: { backgroundColor: '#EAF2FF', borderColor: '#D5E4FF' },
  otpActive: { borderColor: '#0C438B', backgroundColor: '#FFFFFF' },
  otpChar: { color: '#172033', fontSize: 22, fontWeight: '800' },
  otpHidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent' },

  footer: { textAlign: 'center', color: '#A3ADBC', fontSize: 11, marginTop: 24, letterSpacing: 0.5 },
});