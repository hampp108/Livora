import { LightingPreset } from '../types/room';

export type PrimaryLightingPreset =
  | 'natural-daylight'
  | 'soft-morning'
  | 'golden-hour'
  | 'warm-evening'
  | 'night-ambient';

export interface LightingRigConfig {
  id: PrimaryLightingPreset;
  label: string;
  description: string;
  sunPosition: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  skyColor: string;
  groundColor: string;
  hemiIntensity: number;
  envIntensity: number;
  fillIntensity: number;
  fillColor: string;
  bgColor: string;
  windowGlowColor: string;
  windowGlowIntensity: number;
  practicalLampMultiplier: number;
  exposure: number;
  shadowOpacity: number;
  bloomStrength: number;
  isNight: boolean;
}

/**
 * Calibrated architectural lighting presets engineered to avoid blown-out whites
 * and preserve tonal depth across plaster walls, oak flooring, bedding, and walnut accents.
 */
export const PRIMARY_LIGHTING_PRESETS: Record<PrimaryLightingPreset, LightingRigConfig> = {
  'natural-daylight': {
    id: 'natural-daylight',
    label: 'Natural Daylight',
    description: 'Balanced midday architectural daylight with clean soft shadows and crisp detail',
    sunPosition: [8.0, 9.2, 6.2],
    sunColor: '#FFF7EC',
    sunIntensity: 0.94,
    skyColor: '#D4E0EC',
    groundColor: '#A99C87',
    hemiIntensity: 0.24,
    envIntensity: 0.19,
    fillIntensity: 0.09,
    fillColor: '#CEDAE6',
    bgColor: '#DDD6C9',
    windowGlowColor: '#EAF0F6',
    windowGlowIntensity: 0.26,
    practicalLampMultiplier: 0.18,
    exposure: 0.74,
    shadowOpacity: 0.52,
    bloomStrength: 0.05,
    isNight: false,
  },
  'soft-morning': {
    id: 'soft-morning',
    label: 'Soft Morning',
    description: 'Gentle low-angle morning sun casting calm tonal separation across woven textiles',
    sunPosition: [10.2, 5.4, 5.4],
    sunColor: '#FFE8CE',
    sunIntensity: 0.85,
    skyColor: '#D9E1EA',
    groundColor: '#A4957F',
    hemiIntensity: 0.25,
    envIntensity: 0.18,
    fillIntensity: 0.09,
    fillColor: '#D5DEE8',
    bgColor: '#DFD8CB',
    windowGlowColor: '#EDE5D9',
    windowGlowIntensity: 0.24,
    practicalLampMultiplier: 0.28,
    exposure: 0.73,
    shadowOpacity: 0.5,
    bloomStrength: 0.055,
    isNight: false,
  },
  'golden-hour': {
    id: 'golden-hour',
    label: 'Golden Hour',
    description: 'Rich late-afternoon amber sunlight sculpting long architectural shadows and depth',
    sunPosition: [11.2, 3.6, 4.9],
    sunColor: '#FFBA70',
    sunIntensity: 1.02,
    skyColor: '#D4BEA8',
    groundColor: '#8B745B',
    hemiIntensity: 0.2,
    envIntensity: 0.17,
    fillIntensity: 0.08,
    fillColor: '#C9D2DF',
    bgColor: '#D4C8B6',
    windowGlowColor: '#ECC79A',
    windowGlowIntensity: 0.3,
    practicalLampMultiplier: 0.68,
    exposure: 0.75,
    shadowOpacity: 0.58,
    bloomStrength: 0.07,
    isNight: false,
  },
  'warm-evening': {
    id: 'warm-evening',
    label: 'Warm Evening',
    description: 'Intimate dusk atmosphere anchored by warm interior lamps and muted twilight window fill',
    sunPosition: [8.8, 3.0, 3.8],
    sunColor: '#D99462',
    sunIntensity: 0.42,
    skyColor: '#988C88',
    groundColor: '#5B4D42',
    hemiIntensity: 0.17,
    envIntensity: 0.14,
    fillIntensity: 0.06,
    fillColor: '#9AA7B8',
    bgColor: '#C2B8AA',
    windowGlowColor: '#B59179',
    windowGlowIntensity: 0.18,
    practicalLampMultiplier: 1.16,
    exposure: 0.73,
    shadowOpacity: 0.56,
    bloomStrength: 0.08,
    isNight: false,
  },
  'night-ambient': {
    id: 'night-ambient',
    label: 'Night Ambient',
    description: 'Deep nocturnal moonlight balanced with localized warm bedside and chandelier light',
    sunPosition: [-7.0, 8.0, -6.0],
    sunColor: '#6E88AC',
    sunIntensity: 0.22,
    skyColor: '#232E3D',
    groundColor: '#161513',
    hemiIntensity: 0.13,
    envIntensity: 0.11,
    fillIntensity: 0.04,
    fillColor: '#506480',
    bgColor: '#171A1D',
    windowGlowColor: '#192433',
    windowGlowIntensity: 0.1,
    practicalLampMultiplier: 1.48,
    exposure: 0.71,
    shadowOpacity: 0.62,
    bloomStrength: 0.09,
    isNight: true,
  },
};

export function normalizeLightingPreset(preset?: LightingPreset | string): PrimaryLightingPreset {
  switch (preset) {
    case 'natural-daylight':
    case 'afternoon':
      return 'natural-daylight';
    case 'soft-morning':
    case 'morning':
      return 'soft-morning';
    case 'golden-hour':
      return 'golden-hour';
    case 'warm-evening':
    case 'sunset':
    case 'cozy-ambient':
      return 'warm-evening';
    case 'night-ambient':
    case 'night':
      return 'night-ambient';
    default:
      return 'golden-hour';
  }
}

export function resolveLightingPreset(preset?: LightingPreset | string): LightingRigConfig {
  return PRIMARY_LIGHTING_PRESETS[normalizeLightingPreset(preset)];
}

export function isNightLightingPreset(preset?: LightingPreset | string): boolean {
  return normalizeLightingPreset(preset) === 'night-ambient';
}

export const LIGHTING_PRESET_LIST = Object.values(PRIMARY_LIGHTING_PRESETS);
