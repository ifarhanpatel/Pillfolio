import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { useAppColorScheme } from '@/src/theme/theme-preference';

type ThemeMode = 'light' | 'dark';

type ThemedStyles<T> = {
  dark: T;
  light: T;
};

type RNNamedStyles<T> = { [K in keyof T]: ViewStyle | TextStyle | ImageStyle };

const EXACT_LIGHT_COLOR_MAP: Record<string, string> = {
  '#137fec': '#0f6ccd',
  '#4ab0ff': '#0f6ccd',
  '#7fbeff': '#2f7fcf',
  '#76aeea': '#2f7fcf',
  '#e25d66': '#cc3c47',
  '#f1a0a8': '#b83b44',
  '#f3a8ae': '#b83b44',
  '#ffb4b8': '#b83b44',
  '#ffc781': '#b56b07',
  'rgba(19,127,236,0.12)': 'rgba(15, 108, 205, 0.12)',
  'rgba(19,127,236,0.18)': 'rgba(15, 108, 205, 0.18)',
  'rgba(19,127,236,0.2)': 'rgba(15, 108, 205, 0.16)',
  'rgba(19,127,236,0.4)': 'rgba(15, 108, 205, 0.28)',
  'rgba(226,93,102,0.12)': 'rgba(204, 60, 71, 0.12)',
  'rgba(2,5,10,0.72)': 'rgba(2, 5, 10, 0.72)',
  'rgba(0,0,0,0.92)': 'rgba(0, 0, 0, 0.92)',
  'rgba(42,49,62,0.7)': 'rgba(255, 255, 255, 0.86)',
};

const colorCache = new Map<string, string>();

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const normalizeColorKey = (value: string): string => value.replace(/\s+/g, '').toLowerCase();

const parseHexColor = (value: string): { r: number; g: number; b: number; a?: number } | null => {
  const hex = value.trim().replace('#', '');
  if (![3, 4, 6, 8].includes(hex.length)) {
    return null;
  }

  const expanded =
    hex.length === 3 || hex.length === 4
      ? hex
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : hex;

  const hasAlpha = expanded.length === 8;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  const a = hasAlpha ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : undefined;

  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return hasAlpha ? { r, g, b, a } : { r, g, b };
};

const parseRgbaColor = (value: string): { r: number; g: number; b: number; a?: number } | null => {
  const match = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] === undefined ? undefined : Number(match[4]);

  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
    a: a === undefined ? undefined : clamp(a, 0, 1),
  };
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
};

const hueToRgb = (p: number, q: number, t: number): number => {
  let tn = t;
  if (tn < 0) {
    tn += 1;
  }
  if (tn > 1) {
    tn -= 1;
  }
  if (tn < 1 / 6) {
    return p + (q - p) * 6 * tn;
  }
  if (tn < 1 / 2) {
    return q;
  }
  if (tn < 2 / 3) {
    return p + (q - p) * (2 / 3 - tn) * 6;
  }
  return p;
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  const hn = ((h % 360) + 360) % 360 / 360;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hueToRgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hn) * 255),
    b: Math.round(hueToRgb(p, q, hn - 1 / 3) * 255),
  };
};

const formatHex = (r: number, g: number, b: number): string => {
  const toHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const formatRgba = (r: number, g: number, b: number, a: number): string => {
  const alpha = Number.isInteger(a) ? String(a) : a.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const transformToLightRgb = (r: number, g: number, b: number): { r: number; g: number; b: number } => {
  const { h, s, l } = rgbToHsl(r, g, b);

  let nextL: number;
  let nextS: number;

  if (l <= 0.25) {
    nextL = 0.98 - l * 0.28;
    nextS = clamp(s * 0.25 + 0.03, 0.03, 0.22);
  } else if (l <= 0.5) {
    nextL = 0.9 - (l - 0.25) * 0.55;
    nextS = clamp(s * 0.35 + 0.03, 0.04, 0.28);
  } else if (l <= 0.8) {
    nextL = 0.44 - (l - 0.5) * 0.45;
    nextS = clamp(s * 0.75, 0.04, 0.45);
  } else {
    nextL = 0.19 + (1 - l) * 0.35;
    nextS = clamp(s * 0.85, 0.04, 0.5);
  }

  // Keep blue-gray character but slightly reduce saturation in light mode.
  const nextH = h;
  return hslToRgb(nextH, clamp(nextS, 0, 1), clamp(nextL, 0, 1));
};

const transformColorStringToLight = (value: string): string => {
  const normalized = normalizeColorKey(value);
  const exact = EXACT_LIGHT_COLOR_MAP[normalized];
  if (exact) {
    return exact;
  }

  const parsed = value.trim().startsWith('#') ? parseHexColor(value) : parseRgbaColor(value);
  if (!parsed) {
    return value;
  }

  const { r, g, b } = transformToLightRgb(parsed.r, parsed.g, parsed.b);
  const alpha = parsed.a;

  if (alpha === undefined) {
    return formatHex(r, g, b);
  }

  return formatRgba(r, g, b, alpha);
};

export const resolveThemeMode = (scheme?: string | null): ThemeMode => {
  return scheme === 'dark' ? 'dark' : 'light';
};

export const autoThemeColor = (value: string, scheme?: string | null): string => {
  if (resolveThemeMode(scheme) === 'dark') {
    return value;
  }

  const key = `light:${value}`;
  const cached = colorCache.get(key);
  if (cached) {
    return cached;
  }

  const transformed = transformColorStringToLight(value);
  colorCache.set(key, transformed);
  return transformed;
};

const transformNode = <T,>(node: T, mode: ThemeMode): T => {
  if (mode === 'dark') {
    return node;
  }

  if (typeof node === 'string') {
    return autoThemeColor(node, mode) as T;
  }

  if (Array.isArray(node)) {
    return node.map((item) => transformNode(item, mode)) as T;
  }

  if (node && typeof node === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      output[key] = transformNode(value, mode);
    }
    return output as T;
  }

  return node;
};

export const createAutoThemedStyles = <T extends RNNamedStyles<T>>(
  darkStyles: T
): ThemedStyles<T> => {
  const lightStyles = transformNode(darkStyles, 'light') as T;
  return {
    dark: StyleSheet.create(darkStyles),
    light: StyleSheet.create(lightStyles),
  };
};

export const useResolvedThemeMode = (): ThemeMode => {
  const colorScheme = useAppColorScheme();
  return resolveThemeMode(colorScheme);
};

export const useAutoThemedStyles = <T,>(styles: ThemedStyles<T>): T => {
  const mode = useResolvedThemeMode();
  return styles[mode];
};

export const useAutoThemeColor = () => {
  const mode = useResolvedThemeMode();
  return useMemo(() => {
    return (value: string) => autoThemeColor(value, mode);
  }, [mode]);
};
