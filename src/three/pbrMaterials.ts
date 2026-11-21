import * as THREE from 'three';
import { FurnitureFinish } from '../types/room';
import {
  getFabricPBRTextures,
  getOtherPBRTextures,
  getWoodPBRTextures,
  PBRSurfaceMaps,
} from './proceduralTextures';

export type CanonicalMaterialId =
  | 'oak'
  | 'walnut'
  | 'teak'
  | 'dark-wood'
  | 'linen'
  | 'velvet'
  | 'cotton'
  | 'boucle'
  | 'marble'
  | 'glass'
  | 'metal'
  | 'leather'
  | 'ceramic';

export interface MaterialGroupItem {
  id: CanonicalMaterialId;
  label: string;
  swatch: string;
  defaultColor: string;
  group: 'Wood' | 'Fabric' | 'Other';
}

export const MATERIAL_GROUPS: Array<{
  group: 'Wood' | 'Fabric' | 'Other';
  items: MaterialGroupItem[];
}> = [
  {
    group: 'Wood',
    items: [
      { id: 'oak', label: 'Oak', swatch: '#C9AE8B', defaultColor: '#C4A47D', group: 'Wood' },
      { id: 'walnut', label: 'Walnut', swatch: '#6B4D38', defaultColor: '#6B4D38', group: 'Wood' },
      { id: 'teak', label: 'Teak', swatch: '#9E6E44', defaultColor: '#9E6E44', group: 'Wood' },
      { id: 'dark-wood', label: 'Dark Wood', swatch: '#3B2D24', defaultColor: '#3B2D24', group: 'Wood' },
    ],
  },
  {
    group: 'Fabric',
    items: [
      { id: 'linen', label: 'Linen', swatch: '#DDD5C7', defaultColor: '#DDD5C7', group: 'Fabric' },
      { id: 'velvet', label: 'Velvet', swatch: '#5D6B53', defaultColor: '#5D6B53', group: 'Fabric' },
      { id: 'cotton', label: 'Cotton', swatch: '#E6E0D5', defaultColor: '#E4DDD1', group: 'Fabric' },
      { id: 'boucle', label: 'Bouclé', swatch: '#E2DBD0', defaultColor: '#E2DBD0', group: 'Fabric' },
    ],
  },
  {
    group: 'Other',
    items: [
      { id: 'marble', label: 'Marble', swatch: '#E5E0D6', defaultColor: '#E5E0D6', group: 'Other' },
      { id: 'glass', label: 'Glass', swatch: '#CFE2EE', defaultColor: '#D6E7F2', group: 'Other' },
      { id: 'metal', label: 'Metal', swatch: '#B89552', defaultColor: '#B89552', group: 'Other' },
      { id: 'leather', label: 'Leather', swatch: '#6E4F3D', defaultColor: '#6E4F3D', group: 'Other' },
      { id: 'ceramic', label: 'Ceramic', swatch: '#DED8CE', defaultColor: '#DED8CE', group: 'Other' },
    ],
  },
];

export function normalizeFurnitureFinish(finish?: FurnitureFinish | string): CanonicalMaterialId {
  switch (finish) {
    case 'oak':
    case 'natural-oak':
      return 'oak';
    case 'walnut':
    case 'smoked-walnut':
      return 'walnut';
    case 'teak':
      return 'teak';
    case 'dark-wood':
      return 'dark-wood';
    case 'linen':
    case 'matte-fabric':
      return 'linen';
    case 'velvet':
      return 'velvet';
    case 'cotton':
      return 'cotton';
    case 'boucle':
      return 'boucle';
    case 'marble':
    case 'polished-marble':
    case 'travertine':
      return 'marble';
    case 'glass':
      return 'glass';
    case 'metal':
    case 'brushed-brass':
    case 'matte-charcoal':
      return 'metal';
    case 'leather':
      return 'leather';
    case 'ceramic':
      return 'ceramic';
    default:
      return 'linen';
  }
}

export interface ResolvedPBRParams {
  canonical: CanonicalMaterialId;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenRoughness: number;
  envMapIntensity: number;
  transparent: boolean;
  opacity: number;
  normalScale: THREE.Vector2;
  maps?: PBRSurfaceMaps;
}

const normalScaleLow = new THREE.Vector2(0.35, 0.35);
const normalScaleMed = new THREE.Vector2(0.55, 0.55);
const normalScaleHigh = new THREE.Vector2(0.75, 0.75);

export function resolvePBRMaterialProps(finish?: FurnitureFinish | string): ResolvedPBRParams {
  const id = normalizeFurnitureFinish(finish);
  switch (id) {
    case 'oak':
      return {
        canonical: id,
        roughness: 0.58,
        metalness: 0.02,
        clearcoat: 0.08,
        clearcoatRoughness: 0.45,
        sheen: 0,
        sheenRoughness: 0.8,
        envMapIntensity: 0.34,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleMed,
        maps: getWoodPBRTextures('oak'),
      };
    case 'walnut':
      return {
        canonical: id,
        roughness: 0.48,
        metalness: 0.03,
        clearcoat: 0.16,
        clearcoatRoughness: 0.32,
        sheen: 0,
        sheenRoughness: 0.8,
        envMapIntensity: 0.38,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleMed,
        maps: getWoodPBRTextures('walnut'),
      };
    case 'teak':
      return {
        canonical: id,
        roughness: 0.52,
        metalness: 0.02,
        clearcoat: 0.12,
        clearcoatRoughness: 0.38,
        sheen: 0,
        sheenRoughness: 0.8,
        envMapIntensity: 0.36,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleMed,
        maps: getWoodPBRTextures('teak'),
      };
    case 'dark-wood':
      return {
        canonical: id,
        roughness: 0.45,
        metalness: 0.04,
        clearcoat: 0.18,
        clearcoatRoughness: 0.3,
        sheen: 0,
        sheenRoughness: 0.8,
        envMapIntensity: 0.38,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleMed,
        maps: getWoodPBRTextures('dark-wood'),
      };
    case 'linen':
      return {
        canonical: id,
        roughness: 0.94,
        metalness: 0.0,
        clearcoat: 0,
        clearcoatRoughness: 1,
        sheen: 0.35,
        sheenRoughness: 0.85,
        envMapIntensity: 0.16,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleMed,
        maps: getFabricPBRTextures('linen'),
      };
    case 'velvet':
      return {
        canonical: id,
        roughness: 0.86,
        metalness: 0.02,
        clearcoat: 0,
        clearcoatRoughness: 1,
        sheen: 0.92,
        sheenRoughness: 0.48,
        envMapIntensity: 0.22,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleLow,
        maps: getFabricPBRTextures('velvet'),
      };
    case 'cotton':
      return {
        canonical: id,
        roughness: 0.92,
        metalness: 0.0,
        clearcoat: 0,
        clearcoatRoughness: 1,
        sheen: 0.28,
        sheenRoughness: 0.88,
        envMapIntensity: 0.16,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleLow,
        maps: getFabricPBRTextures('cotton'),
      };
    case 'boucle':
      return {
        canonical: id,
        roughness: 0.96,
        metalness: 0.0,
        clearcoat: 0,
        clearcoatRoughness: 1,
        sheen: 0.45,
        sheenRoughness: 0.9,
        envMapIntensity: 0.16,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleHigh,
        maps: getFabricPBRTextures('boucle'),
      };
    case 'marble':
      return {
        canonical: id,
        roughness: 0.24,
        metalness: 0.04,
        clearcoat: 0.55,
        clearcoatRoughness: 0.14,
        sheen: 0,
        sheenRoughness: 0.8,
        envMapIntensity: 0.52,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleLow,
        maps: getOtherPBRTextures('marble'),
      };
    case 'glass':
      return {
        canonical: id,
        roughness: 0.06,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        sheen: 0,
        sheenRoughness: 0.5,
        envMapIntensity: 0.85,
        transparent: true,
        opacity: 0.34,
        normalScale: normalScaleLow,
      };
    case 'metal':
      return {
        canonical: id,
        roughness: 0.26,
        metalness: 0.88,
        clearcoat: 0.15,
        clearcoatRoughness: 0.22,
        sheen: 0,
        sheenRoughness: 0.5,
        envMapIntensity: 0.72,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleLow,
      };
    case 'leather':
      return {
        canonical: id,
        roughness: 0.48,
        metalness: 0.03,
        clearcoat: 0.16,
        clearcoatRoughness: 0.36,
        sheen: 0.18,
        sheenRoughness: 0.65,
        envMapIntensity: 0.36,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleMed,
        maps: getOtherPBRTextures('leather'),
      };
    case 'ceramic':
    default:
      return {
        canonical: id,
        roughness: 0.32,
        metalness: 0.04,
        clearcoat: 0.42,
        clearcoatRoughness: 0.18,
        sheen: 0,
        sheenRoughness: 0.6,
        envMapIntensity: 0.44,
        transparent: false,
        opacity: 1,
        normalScale: normalScaleLow,
        maps: getOtherPBRTextures('ceramic'),
      };
  }
}
