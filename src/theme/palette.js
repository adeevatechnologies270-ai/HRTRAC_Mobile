// ============================================================
// HRTRAC · Palettes (Light / Dark x 4 accents)
// Original (light + blue) rang ISI file ke keys hain; baaki modes
// unhe map karte hain.
// ============================================================

export const ACCENTS = {
  blue:   { label: 'Blue',   primary: '#0C438B', mid: '#173B7A', dark: '#082C5C', darker: '#061F42', light: '#2760C8', link: '#315DB5', soft: '#EAF2FF', border: '#D5E4FF', softDark: '#1B2B4A', onDark: '#7DA8F5' },
  green:  { label: 'Green',  primary: '#0F7A4A', mid: '#0E6A41', dark: '#0A5934', darker: '#073D24', light: '#1FA866', link: '#13794A', soft: '#E3F6EC', border: '#C5EBD6', softDark: '#173326', onDark: '#5FD39B' },
  purple: { label: 'Purple', primary: '#5B3AA8', mid: '#4A2F8F', dark: '#42287F', darker: '#2D1B5A', light: '#7D5AD6', link: '#6A47BF', soft: '#EFE9FC', border: '#D9CCF6', softDark: '#2A2145', onDark: '#B79CFF' },
  orange: { label: 'Orange', primary: '#C2610F', mid: '#A85509', dark: '#8F4609', darker: '#663105', light: '#E8832B', link: '#C2610F', soft: '#FFF0E1', border: '#FFD9B5', softDark: '#3A2814', onDark: '#FFB26B' },
};

const DARK_N = {
  background: '#0E1320', card: '#171E2E', input: '#1D2536', disabled: '#1D2536',
  surface: '#1D2536', chip: '#252E42', skeleton: '#2A3347', border: '#273045',
  text: '#E8EDF7', text2: '#C9D2E3', muted: '#8E9AB3',
};

// Dark mode me in text colors ko light karna hai
const TEXT_STRONG = ['#172B4D', '#0F1F3D', '#172033', '#12233F'];
const TEXT_MID = ['#263B5D', '#243B5D', '#273A5A', '#243B61', '#344660', '#394A63', '#4A5A70', '#43516A', '#53627A', '#283247', '#475569'];
const TEXT_MUTED = ['#8A95A8', '#8994A5', '#8290A5', '#6F7D91', '#A0A9B7', '#697386', '#9CA3AF', '#7E899A', '#7A879A', '#A3ADBC', '#8A94A6', '#64748B', '#94A3B8', '#7A8494', '#A0A8B5'];
const BORDERS = ['#E4E8F0', '#E0E5EC', '#E6EAF0', '#DCE3ED', '#E8ECF2', '#EEF1F5', '#E5E7EB', '#E6ECF4', '#EEF2F7', '#F0F3F7', '#E8EBF0', '#DDE3EC', '#EEF1F6', '#E4ECFA', '#F0F2F6'];

// Dark mode ke semantic soft backgrounds
const SOFT_GREEN = ['#E8F8F0', '#ECFDF5', '#EAF7EF'];
const SOFT_ORANGE = ['#FFF4E7', '#FFF1DD', '#FFF7DD', '#FFF6E0'];
const SOFT_PURPLE = ['#F1EDFF', '#F2EAFF', '#F8F0FC'];
const SOFT_RED = ['#FDEDEE', '#FFF1F1', '#FFF5F5', '#FFE5E5'];

let counter = 0;

export function buildPalette(isDark, accentKey) {
  const A = ACCENTS[accentKey] || ACCENTS.blue;
  const N = DARK_N;
  const blue = accentKey === 'blue';
  const accentText = isDark ? A.onDark : A.primary;

  const colors = {
    primary: accentText,
    primaryDark: isDark ? A.darker : A.dark,
    primaryDarker: A.darker,
    primaryLight: isDark ? A.onDark : A.light,
    primarySoft: isDark ? A.softDark : A.soft,

    accentPurple: isDark ? '#A58BEA' : '#7048C4',
    accentPurpleSoft: isDark ? '#2A2145' : '#F0EAFF',
    accentOrange: isDark ? '#F0A25B' : '#D87927',
    accentOrangeSoft: isDark ? '#3A2814' : '#FFF1E5',
    accentGreen: isDark ? '#4FCB84' : '#159447',
    accentGreenSoft: isDark ? '#16342A' : '#DDF7E8',
    accentRed: '#D64545',
    accentRedSoft: isDark ? '#3A2022' : '#FFE9E9',

    background: isDark ? N.background : '#F7F9FC',
    card: isDark ? N.card : '#FFFFFF',
    white: '#FFFFFF',
    text: isDark ? N.text : '#172B4D',
    textStrong: isDark ? N.text : '#0F1F3D',
    muted: isDark ? N.muted : '#8A95A8',
    mutedSoft: isDark ? N.muted : '#A3ADBC',
    border: isDark ? N.border : '#E4E8F0',
    borderSoft: isDark ? N.border : '#EEF1F5',

    success: isDark ? '#4FCB84' : '#159447',
    warning: isDark ? '#F0A25B' : '#D7831F',
    danger: isDark ? '#F06A6A' : '#D64545',
  };

  // Mobile screens ka primary family (#0B4EA2 etc.)
  const mPrimary = isDark ? A.mid : blue ? '#0B4EA2' : A.primary;       // bg
  const mDeep = isDark ? A.darker : blue ? '#073B7A' : A.dark;           // bg
  const mLink = isDark ? A.onDark : blue ? '#0B4EA2' : A.primary;        // text/border
  const mDeepText = isDark ? A.onDark : blue ? '#073B7A' : A.dark;       // text
  const mBright = isDark ? A.mid : blue ? '#2F6FE4' : A.light;           // bg
  const mBrightText = isDark ? A.onDark : blue ? '#2F6FE4' : A.link;     // text

  // backgroundColor
  const bg = {
    '#0C438B': isDark ? A.dark : A.primary,
    '#173B7A': isDark ? A.dark : A.mid,
    '#082C5C': isDark ? A.darker : A.dark,
    '#EAF2FF': colors.primarySoft,
    '#EEF4FF': colors.primarySoft,
    '#0B4EA2': mPrimary,
    '#073B7A': mDeep,
    '#2F6FE4': mBright,
  };
  // color (text / icon)
  const text = {
    '#0C438B': accentText,
    '#2760C8': colors.primaryLight,
    '#315DB5': isDark ? A.onDark : A.link,
    '#173B7A': isDark ? A.onDark : A.mid,
    '#0B4EA2': mLink,
    '#073B7A': mDeepText,
    '#2F6FE4': mBrightText,
    '#2152C4': mBrightText,
  };
  // *Color (borders)
  const border = {
    '#0C438B': accentText,
    '#0B4EA2': mLink,
    '#D5E4FF': isDark ? A.softDark : A.border,
  };

  // Light mode me bhi accent badle to soft blues accent ke saath badlein
  if (isDark || !blue) {
    ['#EAF3FF', '#F3F8FF', '#EEF5FF', '#E8EFFF', '#EEF2FF', '#E5EDFF'].forEach((h) => { bg[h] = colors.primarySoft; });
  }

  if (isDark) {
    Object.assign(bg, {
      '#FFFFFF': N.card, '#F7F9FC': N.background, '#FBFCFE': N.input, '#F2F4F7': N.disabled,
      '#F8FAFC': N.surface, '#F0F2F5': N.chip, '#E8EEF8': N.chip, '#E4E8F0': N.skeleton,
      '#F0EAFF': '#2A2145', '#FFF1E5': '#3A2814', '#DDF7E8': '#16342A', '#FFE9E9': '#3A2022',
      // mobile screens
      '#F4F7FB': N.background, '#F5F7FB': N.background,
      '#F8FAFD': N.surface, '#F3F7FC': N.surface, '#F6F9FF': N.surface, '#F5F8FF': N.surface,
      '#FAFBFD': N.input,
      '#F1F5F9': N.chip, '#EAEFF6': N.chip,
      '#EEF1F6': N.skeleton,
      '#E8F7FC': '#12303A',
    });
    SOFT_GREEN.forEach((h) => { bg[h] = '#16342A'; });
    SOFT_ORANGE.forEach((h) => { bg[h] = '#3A2814'; });
    SOFT_PURPLE.forEach((h) => { bg[h] = '#2A2145'; });
    SOFT_RED.forEach((h) => { bg[h] = '#3A2022'; });

    TEXT_STRONG.forEach((h) => { text[h] = N.text; });
    TEXT_MID.forEach((h) => { text[h] = N.text2; });
    TEXT_MUTED.forEach((h) => { text[h] = N.muted; });
    text['#000000'] = N.text;
    text['#8A6100'] = '#F0C36B';
    text['#8A5A00'] = '#F0C36B';

    BORDERS.forEach((h) => { border[h] = N.border; });
    border['#FFD9D9'] = '#4A2A2D';
  }

  counter += 1;
  return { id: counter, isDark, accentKey, colors, bg, text, border };
}