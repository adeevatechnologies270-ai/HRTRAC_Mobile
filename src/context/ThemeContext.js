import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildPalette } from '../theme/palette';
import { applyPalette } from '../theme/themedStyles';

const KEY = 'hrtrac.themePrefs';
const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState('system'); // 'light' | 'dark' | 'system'
  const [accent, setAccentState] = useState('blue');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (p.mode) setModeState(p.mode);
          if (p.accent) setAccentState(p.accent);
        }
      } catch (_) {}
      setReady(true);
    })();
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');

  // render ke dauraan apply hota hai taaki bachhe naye colors hi padhein
  const palette = useMemo(() => {
    const p = buildPalette(isDark, accent);
    applyPalette(p);
    return p;
  }, [isDark, accent]);

  const save = (m, a) => AsyncStorage.setItem(KEY, JSON.stringify({ mode: m, accent: a })).catch(() => {});
  const setMode = useCallback((m) => { setModeState(m); save(m, accent); }, [accent]);
  const setAccent = useCallback((a) => { setAccentState(a); save(mode, a); }, [mode]);

  const value = useMemo(
    () => ({ mode, accent, isDark, version: palette.id, colors: palette.colors, setMode, setAccent }),
    [mode, accent, isDark, palette, setMode, setAccent]
  );

  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}