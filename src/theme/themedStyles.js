// ============================================================
// HRTRAC · themedCreate
// StyleSheet.create ka drop-in replacement.
// Styles ko current palette ke hisaab se lazily recolor karta hai.
// ============================================================

import { theme } from './theme';

let current = null;

export function applyPalette(palette) {
  current = palette;

  if (palette?.colors) {
    Object.assign(theme.colors, palette.colors);
  }
}

function norm(hex) {
  if (typeof hex !== 'string') return hex;

  const u = hex.toUpperCase();

  if (u.length === 4 && u[0] === '#') {
    return `#${u[1]}${u[1]}${u[2]}${u[2]}${u[3]}${u[3]}`;
  }

  return u;
}

function recolor(style, P) {
  if (!P || !style || typeof style !== 'object') {
    return style;
  }

  const out = {};

  Object.keys(style).forEach((key) => {
    const value = style[key];

    if (typeof value === 'string' && value[0] === '#') {
      const normalized = norm(value);

      let mapped;

      if (key === 'backgroundColor') {
        mapped = P.bg?.[normalized];
      } else if (key === 'color') {
        mapped = P.text?.[normalized];
      } else if (
        key.endsWith('Color') &&
        key !== 'shadowColor'
      ) {
        mapped = P.border?.[normalized];
      }

      out[key] = mapped || value;
    } else {
      out[key] = value;
    }
  });

  return out;
}

export function themedCreate(base) {
  const cache = {};

  return new Proxy(base, {
    get(target, prop) {
      if (
        typeof prop !== 'string' ||
        !(prop in target)
      ) {
        return Reflect.get(target, prop);
      }

      const id = current?.id ?? 0;
      const hit = cache[prop];

      if (hit && hit.id === id) {
        return hit.val;
      }

      const val = recolor(target[prop], current);

      cache[prop] = {
        id,
        val,
      };

      return val;
    },
  });
}

// ============================================================
// Inline theme color helper
//
// tc('#0B4EA2')       -> text/icon color
// tc('#EAF3FF', 'bg') -> background color
// tc('#E4E8F0', 'border') -> border color
// ============================================================

export function tc(hex, kind = 'text') {
  if (
    !current ||
    typeof hex !== 'string' ||
    hex[0] !== '#'
  ) {
    return hex;
  }

  const map =
    kind === 'bg'
      ? current.bg
      : kind === 'border'
        ? current.border
        : current.text;

  return map?.[norm(hex)] || hex;
}