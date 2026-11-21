import {
  ActivityLogItem,
  DesignStyleId,
  FurnitureInstance,
  RoomProject,
  RoomShellConfig,
  RoomType,
  UserSettings,
} from '../types/room';
import { getCatalogItem } from './catalog';

export interface DesignStylePreset {
  id: DesignStyleId;
  name: string;
  tagline: string;
  description: string;
  image: string;
  palette: string[];
  shellPatch: Partial<RoomShellConfig>;
  accentFurnitureColors: {
    upholstery: string;
    wood: string;
    metal: string;
    rug: string;
  };
}

export const DESIGN_STYLES: DesignStylePreset[] = [
  {
    id: 'modern-luxury',
    name: 'Modern Luxury',
    tagline: 'Travertine, walnut millwork & tailored bouclé',
    description:
      'Sunlit architectural proportions anchored by honed travertine, curved cream bouclé upholstery, brushed brass luminaires, and warm walnut accents.',
    image: '/src/assets/images/style_modern_luxury_1795206562595.jpg',
    palette: ['#E4DDD1', '#6B4D38', '#D6CCB9', '#B89552', '#30332F'],
    shellPatch: {
      wallColor: '#E2DBD0',
      accentWallColor: '#CCC2B2',
      hasAccentWall: true,
      ceilingColor: '#EAE4D8',
      baseboardColor: '#D6CEC0',
      floorMaterial: 'white-oak',
      ceilingType: 'recessed-cove',
      windowFrameColor: '#252625',
      hasCurtains: true,
      curtainColor: '#DFD7C8',
      curtainsOpen: 0.72,
      lightingPreset: 'golden-hour',
      sunIntensity: 1.0,
      ambientWarmth: 0.6,
      lampGlow: 1.0,
      overallBrightness: 1.0,
      ambientIntensity: 1.0,
      shadowIntensity: 1.0,
      hasChandelier: true,
      hasSlattedScreens: true,
    },
    accentFurnitureColors: {
      upholstery: '#DFD7C8',
      wood: '#6B4D38',
      metal: '#B89552',
      rug: '#9E9689',
    },
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    tagline: 'Herringbone pale oak & soft linen daylight',
    description:
      'Airy Nordic clarity combining warm off-white plaster, pale herringbone oak floors, natural linen textiles, and sculptural greenery.',
    image: '/src/assets/images/style_scandinavian_1795206562365.jpg',
    palette: ['#E5DFD3', '#D6CCB9', '#C4A47D', '#5D6B53', '#363836'],
    shellPatch: {
      wallColor: '#E5DFD3',
      accentWallColor: '#D8D0C2',
      hasAccentWall: false,
      ceilingColor: '#EBE5D9',
      baseboardColor: '#DCD4C6',
      floorMaterial: 'herringbone-oak',
      ceilingType: 'exposed-beams',
      windowFrameColor: '#2F3330',
      hasCurtains: true,
      curtainColor: '#DFD8CA',
      curtainsOpen: 0.75,
      lightingPreset: 'soft-morning',
      sunIntensity: 1.0,
      ambientWarmth: 0.44,
      lampGlow: 0.6,
      hasChandelier: false,
      hasSlattedScreens: false,
    },
    accentFurnitureColors: {
      upholstery: '#DFD8CA',
      wood: '#C4A47D',
      metal: '#2F3330',
      rug: '#D5CDBE',
    },
  },
  {
    id: 'japandi',
    name: 'Japandi',
    tagline: 'Low-profile timber, calm cove light & muted olive',
    description:
      'Japanese organic restraint meets Scandinavian warmth with low platform silhouettes, limewash plaster, smoked oak, and serene indirect illumination.',
    image: '/src/assets/images/style_japandi_1795206561625.jpg',
    palette: ['#DFD6C7', '#9E7956', '#5D6B53', '#C4AF8E', '#2A2B29'],
    shellPatch: {
      wallColor: '#DFD6C7',
      accentWallColor: '#CBBFA9',
      hasAccentWall: true,
      ceilingColor: '#E5DDD0',
      baseboardColor: '#9E7956',
      floorMaterial: 'white-oak',
      ceilingType: 'recessed-cove',
      windowFrameColor: '#7A5B40',
      hasCurtains: false,
      curtainColor: '#DBD2C3',
      lightingPreset: 'warm-evening',
      sunIntensity: 0.9,
      ambientWarmth: 0.7,
      lampGlow: 1.15,
      hasChandelier: false,
      hasSlattedScreens: true,
    },
    accentFurnitureColors: {
      upholstery: '#CFC2AE',
      wood: '#9C7651',
      metal: '#5D6B53',
      rug: '#BFA988',
    },
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'Gallery plaster, smoked oak & quiet precision',
    description:
      'Disciplined architectural planes with micro-textured plaster walls, smoked oak furniture, crisp charcoal lines, and uncluttered negative space.',
    image: '/src/assets/images/style_minimalist_1795206562012.jpg',
    palette: ['#E2DDD2', '#523E2D', '#252625', '#CCC5B8', '#8A8984'],
    shellPatch: {
      wallColor: '#E1DCD1',
      accentWallColor: '#D4CEC2',
      hasAccentWall: false,
      ceilingColor: '#E7E2D7',
      baseboardColor: '#D8D2C6',
      floorMaterial: 'polished-concrete',
      ceilingType: 'flat-plaster',
      windowFrameColor: '#1F2120',
      hasCurtains: true,
      curtainColor: '#DFDAD0',
      curtainsOpen: 0.78,
      lightingPreset: 'natural-daylight',
      sunIntensity: 1.0,
      ambientWarmth: 0.46,
      lampGlow: 0.5,
      hasChandelier: false,
      hasSlattedScreens: false,
    },
    accentFurnitureColors: {
      upholstery: '#D5CFC2',
      wood: '#5C432F',
      metal: '#232423',
      rug: '#CFC9BD',
    },
  },
  {
    id: 'bohemian',
    name: 'Bohemian',
    tagline: 'Clay plaster, woven rattan, olive foliage & terracotta',
    description:
      'Tactile sunlit sanctuary layering warm beige limewash, woven jute, cane armchairs, terracotta vessels, and lush indoor olive trees.',
    image: '/src/assets/images/style_bohemian_1795206562040.jpg',
    palette: ['#DDD0BE', '#B57B5E', '#5D6B53', '#C4AF8E', '#8B6849'],
    shellPatch: {
      wallColor: '#DDD0BE',
      accentWallColor: '#CBB49B',
      hasAccentWall: true,
      ceilingColor: '#E5DCCD',
      baseboardColor: '#BFA98E',
      floorMaterial: 'white-oak',
      ceilingType: 'exposed-beams',
      windowFrameColor: '#7A5B40',
      hasCurtains: true,
      curtainColor: '#DDD4C3',
      curtainsOpen: 0.7,
      lightingPreset: 'warm-evening',
      sunIntensity: 0.95,
      ambientWarmth: 0.74,
      lampGlow: 1.1,
      hasChandelier: false,
      hasSlattedScreens: false,
    },
    accentFurnitureColors: {
      upholstery: '#B97F60',
      wood: '#9D734C',
      metal: '#5D6B53',
      rug: '#BFA988',
    },
  },
  {
    id: 'contemporary',
    name: 'Contemporary',
    tagline: 'Charcoal timber slat wall, travertine & crisp contrast',
    description:
      'Urban architectural contrast pairing a deep charcoal accent wall with warm bouclé seating, smoked glass accents, and bold indoor greenery.',
    image: '/src/assets/images/style_contemporary_1795206562524.jpg',
    palette: ['#2C2E2D', '#E2DDD2', '#C4AF8E', '#5D6B53', '#8B6849'],
    shellPatch: {
      wallColor: '#E1DCD2',
      accentWallColor: '#2F3130',
      hasAccentWall: true,
      ceilingColor: '#E7E2D8',
      baseboardColor: '#2C2E2D',
      floorMaterial: 'polished-marble',
      ceilingType: 'recessed-cove',
      windowFrameColor: '#1E1F1E',
      hasCurtains: false,
      curtainColor: '#DCD6CA',
      lightingPreset: 'natural-daylight',
      sunIntensity: 1.0,
      ambientWarmth: 0.48,
      lampGlow: 0.85,
      hasChandelier: true,
      hasSlattedScreens: false,
    },
    accentFurnitureColors: {
      upholstery: '#E2DDD2',
      wood: '#684C35',
      metal: '#252625',
      rug: '#C2B093',
    },
  },
  {
    id: 'traditional',
    name: 'Traditional',
    tagline: 'Heritage walnut, warm cream molding & antique brass',
    description:
      'Timeless residential proportions combining warm cream plaster, classic herringbone oak, tailored linen upholstery, and heirloom brass lighting.',
    image: '/src/assets/images/style_traditional_1795244550258.jpg',
    palette: ['#E4DDD1', '#D4C5B0', '#8C7967', '#78816C', '#30332F'],
    shellPatch: {
      wallColor: '#E4DDD1',
      accentWallColor: '#D5CBB9',
      hasAccentWall: true,
      ceilingColor: '#EAE4D8',
      baseboardColor: '#D8CFC0',
      floorMaterial: 'herringbone-oak',
      ceilingType: 'recessed-cove',
      windowFrameColor: '#3A3530',
      hasCurtains: true,
      curtainColor: '#DDD5C7',
      curtainsOpen: 0.68,
      lightingPreset: 'soft-morning',
      sunIntensity: 1.0,
      ambientWarmth: 0.56,
      lampGlow: 0.9,
      hasChandelier: true,
      hasSlattedScreens: false,
    },
    accentFurnitureColors: {
      upholstery: '#DDD5C7',
      wood: '#7A593E',
      metal: '#B89552',
      rug: '#BFA98E',
    },
  },
];

export function makeFurniture(
  catalogId: string,
  x: number,
  z: number,
  rotationY = 0,
  overrides?: Partial<FurnitureInstance>,
): FurnitureInstance {
  const item = getCatalogItem(catalogId);
  const y = item?.mountType === 'wall' ? (item.defaultMountHeight ?? 1.55) : 0;
  return {
    instanceId: `${catalogId}-${Math.random().toString(36).slice(2, 8)}`,
    catalogId,
    name: item?.name ?? 'Furniture Piece',
    position: [x, y, z],
    rotationY,
    scale: 1,
    primaryColor: item?.defaultPrimaryColor ?? '#DFD7C8',
    secondaryColor: item?.defaultSecondaryColor ?? '#7A5B40',
    finish: item?.defaultFinish ?? 'linen',
    ...overrides,
  };
}

export function createStarterFurniture(
  roomType: RoomType,
  styleId: DesignStyleId,
  length: number,
  width: number,
): FurnitureInstance[] {
  const style = DESIGN_STYLES.find((s) => s.id === styleId) ?? DESIGN_STYLES[0];
  const { upholstery, wood, metal, rug } = style.accentFurnitureColors;
  const halfL = length / 2;
  const halfW = width / 2;

  switch (roomType) {
    case 'Bedroom':
      return [
        makeFurniture('rug-woven-wool', 0, 0.2, 0, { primaryColor: rug }),
        makeFurniture('bed-platform-oak', 0, -halfW + 1.22, 0, {
          primaryColor: upholstery,
          secondaryColor: wood,
        }),
        makeFurniture('bench-tufted-ottoman', 0, 0.48, 0, {
          primaryColor: upholstery,
          secondaryColor: metal,
        }),
        makeFurniture('nightstand-curved-lamp', -1.35, -halfW + 0.38, 0),
        makeFurniture('nightstand-curved-lamp', 1.35, -halfW + 0.38, 0),
        makeFurniture('wardrobe-glass-display', halfL - 0.88, -halfW + 0.42, 0, {
          primaryColor: '#3E362E',
          secondaryColor: metal,
        }),
        makeFurniture('chair-curved-boucle', halfL - 0.72, halfW - 0.85, -Math.PI * 0.72),
        makeFurniture('plant-areca-palm', halfL - 0.55, 0.2, 0),
        makeFurniture('art-landscape-painting', 0, -halfW + 0.04, 0, { secondaryColor: wood }),
      ];

    case 'Living Room':
      return [
        makeFurniture('rug-woven-wool', 0, 0.15, 0, { primaryColor: rug }),
        makeFurniture('sofa-l-sectional', 0, 0.75, Math.PI, {
          primaryColor: upholstery,
          secondaryColor: wood,
        }),
        makeFurniture('table-marble-coffee', 0, -0.22, 0, { secondaryColor: wood }),
        makeFurniture('tech-tv-media-wall', 0, -halfW + 0.34, 0, { isActiveState: true }),
        makeFurniture('chair-rattan-lounge', -1.7, -0.1, Math.PI / 3, {
          primaryColor: upholstery,
          secondaryColor: wood,
        }),
        makeFurniture('lamp-brass-arc', 1.65, 0.75, -Math.PI * 0.75, { primaryColor: metal }),
        makeFurniture('shelf-architectural-bookcase', -halfL + 0.85, -halfW + 0.34, 0, {
          primaryColor: wood,
        }),
        makeFurniture('plant-fiddle-fig', halfL - 0.6, -halfW + 0.6, 0),
      ];

    case 'Dining Room':
      return [
        makeFurniture('rug-woven-wool', 0, 0, 0, { primaryColor: rug }),
        makeFurniture('table-dining-oak', 0, 0, 0, { primaryColor: wood }),
        makeFurniture('chair-dining-bentwood', -0.68, -0.82, 0),
        makeFurniture('chair-dining-bentwood', 0, -0.82, 0),
        makeFurniture('chair-dining-bentwood', 0.68, -0.82, 0),
        makeFurniture('chair-dining-bentwood', -0.68, 0.82, Math.PI),
        makeFurniture('chair-dining-bentwood', 0, 0.82, Math.PI),
        makeFurniture('chair-dining-bentwood', 0.68, 0.82, Math.PI),
        makeFurniture('cabinet-walnut-credenza', 0, -halfW + 0.36, 0, {
          primaryColor: wood,
          secondaryColor: metal,
        }),
        makeFurniture('plant-olive-tree', halfL - 0.62, -halfW + 0.62, 0),
        makeFurniture('art-brass-mirror', 0, -halfW + 0.04, 0, { primaryColor: metal }),
      ];

    case 'Kitchen':
      return [
        makeFurniture('kitchen-modular-wall', 0, -halfW + 0.42, 0, { isActiveState: false }),
        makeFurniture('kitchen-island-prep', 0, 0.42, 0, { isActiveState: true }),
        makeFurniture('chair-bar-stool', -0.62, 1.12, Math.PI),
        makeFurniture('chair-bar-stool', 0.0, 1.12, Math.PI),
        makeFurniture('chair-bar-stool', 0.62, 1.12, Math.PI),
        makeFurniture('plant-olive-tree', halfL - 0.58, halfW - 0.58, 0),
      ];

    case 'Study Room':
      return [
        makeFurniture('rug-jute-runner', 0, 0.15, 0, { primaryColor: rug }),
        makeFurniture('table-studio-desk', 0, -0.45, 0, { primaryColor: wood }),
        makeFurniture('chair-studio-task', 0, 0.34, Math.PI),
        makeFurniture('shelf-architectural-bookcase', -halfL + 0.88, -halfW + 0.35, 0, {
          primaryColor: wood,
        }),
        makeFurniture('lamp-brass-arc', halfL - 0.62, -0.55, -Math.PI / 4, {
          primaryColor: metal,
        }),
        makeFurniture('plant-fiddle-fig', halfL - 0.58, halfW - 0.58, 0),
        makeFurniture('art-plaster-triptych', 0, -halfW + 0.04, 0),
      ];

    case 'Gaming Room':
      return [
        makeFurniture('rug-jute-runner', 0, 0.15, 0, { primaryColor: '#373A37' }),
        makeFurniture('table-gaming-desk', 0, -halfW + 0.72, 0, { isActiveState: true }),
        makeFurniture('chair-studio-task', 0, 0.08, Math.PI, { primaryColor: '#252625' }),
        makeFurniture('shelf-architectural-bookcase', -halfL + 0.88, -halfW + 0.35, 0, {
          primaryColor: '#4B3A2C',
        }),
        makeFurniture('sofa-kids-beanbag', halfL - 0.75, halfW - 0.75, -Math.PI / 4, {
          primaryColor: '#4A5D4E',
        }),
        makeFurniture('lamp-brass-arc', halfL - 0.65, -halfW + 0.65, -Math.PI / 3, {
          primaryColor: '#5D6B53',
        }),
        makeFurniture('plant-fiddle-fig', -halfL + 0.58, halfW - 0.58, 0),
      ];

    case 'Home Office':
      return [
        makeFurniture('rug-woven-wool', 0, 0.15, 0, { primaryColor: rug }),
        makeFurniture('table-sitstand-desk', -0.25, -0.45, 0, { isActiveState: false }),
        makeFurniture('chair-studio-task', -0.25, 0.32, Math.PI),
        makeFurniture('office-whiteboard-easel', halfL - 0.85, -halfW + 0.52, -Math.PI / 6),
        makeFurniture('shelf-architectural-bookcase', -halfL + 0.85, -halfW + 0.35, 0),
        makeFurniture('sofa-curved-boucle', halfL - 1.15, halfW - 0.78, Math.PI, { scale: 0.78 }),
        makeFurniture('plant-fiddle-fig', -halfL + 0.55, halfW - 0.55, 0),
      ];

    case 'Kids Room':
      return [
        makeFurniture('rug-woven-wool', 0, 0.15, 0, { primaryColor: '#D6C9B8', secondaryColor: '#7C8E76' }),
        makeFurniture('bed-kids-bunk', -halfL + 0.85, -halfW + 1.15, 0),
        makeFurniture('kids-play-tent', halfL - 0.82, halfW - 0.82, -Math.PI / 4),
        makeFurniture('table-studio-desk', halfL - 0.98, -halfW + 0.55, 0, { scale: 0.78 }),
        makeFurniture('shelf-architectural-bookcase', -halfL + 0.82, halfW - 0.4, Math.PI, {
          scale: 0.82,
        }),
        makeFurniture('sofa-kids-beanbag', 0.25, 0.55, 0, { primaryColor: '#C99680' }),
        makeFurniture('lamp-ceramic-table', 0.15, -halfW + 0.45, 0, { isActiveState: true }),
      ];

    case 'Bathroom':
      return [
        makeFurniture('bath-vanity-mirror', -0.85, -halfW + 0.36, 0),
        makeFurniture('bath-shower-tub', 0.95, -halfW + 0.72, 0, { isActiveState: true }),
        makeFurniture('bath-towel-rack', -halfL + 0.35, 0.4, Math.PI / 2),
        makeFurniture('rug-jute-runner', 0, 0.45, 0, {
          primaryColor: '#DFDAD0',
          secondaryColor: '#CCC5B8',
          scale: 0.72,
        }),
        makeFurniture('plant-areca-palm', halfL - 0.55, halfW - 0.55, 0),
      ];

    case 'Home Theater':
      return [
        makeFurniture('rug-woven-wool', 0, 0.25, 0, { primaryColor: '#3A3835', secondaryColor: '#252422' }),
        makeFurniture('cinema-screen-rig', 0, -halfW + 0.38, 0, { isActiveState: true }),
        makeFurniture('chair-cinema-recliner', -0.98, 0.45, Math.PI, { isActiveState: false }),
        makeFurniture('chair-cinema-recliner', 0, 0.45, Math.PI, { isActiveState: false }),
        makeFurniture('chair-cinema-recliner', 0.98, 0.45, Math.PI, { isActiveState: false }),
        makeFurniture('decor-travertine-pedestal', -1.85, 0.45, 0, {
          primaryColor: '#2A2927',
          secondaryColor: '#B89552',
          scale: 0.75,
        }),
      ];

    case 'Pooja Room':
      return [
        makeFurniture('rug-woven-wool', 0, 0.35, 0, {
          primaryColor: '#CDB086',
          secondaryColor: '#A96E52',
          scale: 0.85,
        }),
        makeFurniture('pooja-carved-mandir', 0, -halfW + 0.48, 0, { isActiveState: true }),
        makeFurniture('decor-travertine-pedestal', -1.15, -halfW + 0.45, 0, { scale: 0.82 }),
        makeFurniture('decor-travertine-pedestal', 1.15, -halfW + 0.45, 0, { scale: 0.82 }),
        makeFurniture('plant-olive-tree', halfL - 0.55, halfW - 0.55, 0),
      ];

    case 'Balcony':
      return [
        makeFurniture('balcony-bistro-set', -0.75, 0.1, Math.PI / 8),
        makeFurniture('balcony-hanging-swing', 1.05, -0.25, -Math.PI / 5),
        makeFurniture('plant-areca-palm', -halfL + 0.55, -halfW + 0.55, 0),
        makeFurniture('plant-olive-tree', halfL - 0.55, -halfW + 0.55, 0),
        makeFurniture('plant-fiddle-fig', -halfL + 0.55, halfW - 0.55, 0),
        makeFurniture('rug-jute-runner', 0, 0.1, 0, { scale: 0.9 }),
      ];

    case 'Custom Room':
    default:
      return [];
  }
}

export function getDefaultShellForRoom(
  roomType: RoomType,
  styleId: DesignStyleId,
): RoomShellConfig {
  const base = buildDefaultShell(styleId);
  if (roomType === 'Home Theater') {
    return {
      ...base,
      wallColor: '#252626',
      accentWallColor: '#1B1C1C',
      ceilingColor: '#1C1D1D',
      baseboardColor: '#1A1B1A',
      floorMaterial: 'plush-carpet',
      ceilingType: 'starry-cinema',
      lightingPreset: 'night-ambient',
      sunIntensity: 0.35,
      lampGlow: 1.2,
      hasChandelier: false,
      hasAcousticPanels: true,
      hasSlattedScreens: false,
    };
  }
  if (roomType === 'Gaming Room') {
    return {
      ...base,
      wallColor: '#2D302F',
      accentWallColor: '#1F2220',
      ceilingColor: '#2A2C2B',
      baseboardColor: '#222423',
      floorMaterial: 'smoked-walnut',
      ceilingType: 'recessed-cove',
      lightingPreset: 'night-ambient',
      sunIntensity: 0.5,
      lampGlow: 1.25,
      hasChandelier: false,
      hasAcousticPanels: true,
      hasSlattedScreens: false,
    };
  }
  if (roomType === 'Bathroom') {
    return {
      ...base,
      wallColor: '#E1DCD2',
      accentWallColor: '#CFC8BA',
      floorMaterial: 'polished-marble',
      ceilingType: 'recessed-cove',
      lightingPreset: 'soft-morning',
      sunIntensity: 1.0,
      hasChandelier: false,
      hasSlattedScreens: false,
    };
  }
  if (roomType === 'Kitchen') {
    return {
      ...base,
      wallColor: '#E4DFD4',
      floorMaterial: 'ceramic-tile',
      ceilingType: 'flat-plaster',
      lightingPreset: 'natural-daylight',
      sunIntensity: 1.0,
      hasChandelier: false,
      hasSlattedScreens: false,
    };
  }
  if (roomType === 'Pooja Room') {
    return {
      ...base,
      wallColor: '#E5DAC5',
      accentWallColor: '#D2BA94',
      floorMaterial: 'warm-travertine',
      ceilingType: 'recessed-cove',
      lightingPreset: 'warm-evening',
      ambientWarmth: 0.8,
      lampGlow: 1.2,
      hasChandelier: false,
      hasSlattedScreens: true,
    };
  }
  if (roomType === 'Balcony') {
    return {
      ...base,
      wallColor: '#DDD6C8',
      floorMaterial: 'ceramic-tile',
      ceilingType: 'exposed-beams',
      lightingPreset: 'golden-hour',
      sunIntensity: 1.05,
      hasChandelier: false,
      hasSlattedScreens: false,
    };
  }
  if (roomType === 'Kids Room') {
    return {
      ...base,
      wallColor: '#E6DFD2',
      accentWallColor: '#D4DDD3',
      floorMaterial: 'white-oak',
      ceilingType: 'starry-cinema',
      lightingPreset: 'soft-morning',
      hasChandelier: false,
      hasSlattedScreens: false,
    };
  }
  return base;
}

export function buildDefaultShell(styleId: DesignStyleId): RoomShellConfig {
  const style = DESIGN_STYLES.find((s) => s.id === styleId) ?? DESIGN_STYLES[0];
  return {
    wallColor: '#E2DBD0',
    accentWallColor: '#CCC2B2',
    hasAccentWall: true,
    ceilingColor: '#EAE4D8',
    baseboardColor: '#D6CEC0',
    floorMaterial: 'white-oak',
    ceilingType: 'recessed-cove',
    windowWall: 'right',
    windowCount: 2,
    windowFrameColor: '#252625',
    hasCurtains: true,
    curtainColor: '#DFD7C8',
    curtainsOpen: 0.72,
    doorWall: 'left',
    lightingPreset: 'golden-hour',
    sunIntensity: 1.0,
    ambientWarmth: 0.6,
    lampGlow: 1.0,
    overallBrightness: 1.0,
    ambientIntensity: 1.0,
    shadowIntensity: 1.0,
    hasChandelier: true,
    hasSlattedScreens: true,
    hasAcousticPanels: false,
    ...style.shellPatch,
  };
}

export interface RoomTemplate {
  id: string;
  name: string;
  roomType: RoomType;
  styleId: DesignStyleId;
  dimensions: { length: number; width: number; height: number };
  description: string;
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'tpl-luxury-bedroom',
    name: 'Architectural Suite Bedroom',
    roomType: 'Bedroom',
    styleId: 'modern-luxury',
    dimensions: { length: 5.4, width: 4.5, height: 3.0 },
    description: 'Curved platform bed, channel-tufted bench, fluted glass chandelier, and display wardrobe.',
  },
  {
    id: 'tpl-sunlit-living',
    name: 'Atelier Living Lounge',
    roomType: 'Living Room',
    styleId: 'modern-luxury',
    dimensions: { length: 5.8, width: 4.6, height: 3.0 },
    description: 'Modular L-sectional, honed travertine coffee table, OLED media wall, and arc lamp.',
  },
  {
    id: 'tpl-contemporary-dining',
    name: 'Gallery Dining Hall',
    roomType: 'Dining Room',
    styleId: 'minimalist',
    dimensions: { length: 5.6, width: 4.2, height: 3.0 },
    description: 'Six-seater oak table with centerpiece, upholstered chairs, credenza, and brass mirror.',
  },
  {
    id: 'tpl-marble-kitchen',
    name: 'Calacatta Island Kitchen',
    roomType: 'Kitchen',
    styleId: 'scandinavian',
    dimensions: { length: 5.2, width: 4.4, height: 2.95 },
    description: 'Waterfall marble prep island, modular cabinetry, bar stools, and live steaming hob.',
  },
  {
    id: 'tpl-japandi-study',
    name: 'Kyoto Architectural Study',
    roomType: 'Study Room',
    styleId: 'japandi',
    dimensions: { length: 4.4, width: 3.6, height: 2.85 },
    description: 'Executive oak desk, open architectural shelving, and indirect cove warmth.',
  },
  {
    id: 'tpl-home-theater',
    name: 'Private Cinema Screening Room',
    roomType: 'Home Theater',
    styleId: 'contemporary',
    dimensions: { length: 5.8, width: 4.6, height: 3.0 },
    description: '120" projection screen, reclining leather seating, acoustic panels, and starry ceiling.',
  },
];

export const INITIAL_PROJECTS: RoomProject[] = [
  {
    id: 'proj-luxury-bedroom',
    name: 'Atelier Master Bedroom',
    roomType: 'Bedroom',
    styleId: 'modern-luxury',
    dimensions: { length: 5.4, width: 4.5, height: 3.0, unit: 'm' },
    shell: getDefaultShellForRoom('Bedroom', 'modern-luxury'),
    furniture: createStarterFurniture('Bedroom', 'modern-luxury', 5.4, 4.5),
    createdAt: '2026-11-16T10:20:00.000Z',
    updatedAt: '2026-11-20T09:15:00.000Z',
    savedToArchive: true,
  },
  {
    id: 'proj-atelier-living',
    name: 'Soho Travertine Living Room',
    roomType: 'Living Room',
    styleId: 'modern-luxury',
    dimensions: { length: 5.8, width: 4.6, height: 3.0, unit: 'm' },
    shell: getDefaultShellForRoom('Living Room', 'modern-luxury'),
    furniture: createStarterFurniture('Living Room', 'modern-luxury', 5.8, 4.6),
    createdAt: '2026-11-14T14:00:00.000Z',
    updatedAt: '2026-11-19T16:40:00.000Z',
    savedToArchive: true,
  },
  {
    id: 'proj-japandi-study',
    name: 'Quiet Oak Home Studio',
    roomType: 'Study Room',
    styleId: 'japandi',
    dimensions: { length: 4.4, width: 3.6, height: 2.85, unit: 'm' },
    shell: getDefaultShellForRoom('Study Room', 'japandi'),
    furniture: createStarterFurniture('Study Room', 'japandi', 4.4, 3.6),
    createdAt: '2026-11-12T08:30:00.000Z',
    updatedAt: '2026-11-18T11:10:00.000Z',
    savedToArchive: false,
  },
];

export const INITIAL_ACTIVITIES: ActivityLogItem[] = [
  {
    id: 'act-1',
    action: 'Saved a design',
    projectName: 'Atelier Master Bedroom',
    timestamp: '2 hours ago',
    category: 'save',
  },
  {
    id: 'act-2',
    action: 'Applied Golden Hour lighting & Modern Luxury theme',
    projectName: 'Atelier Master Bedroom',
    timestamp: '3 hours ago',
    category: 'style',
  },
  {
    id: 'act-3',
    action: 'Added Channel-Tufted Bed Bench',
    projectName: 'Atelier Master Bedroom',
    timestamp: 'Yesterday',
    category: 'edit',
  },
  {
    id: 'act-4',
    action: 'Changed floor to Natural White Oak',
    projectName: 'Soho Travertine Living Room',
    timestamp: '2 days ago',
    category: 'style',
  },
  {
    id: 'act-5',
    action: 'Created a new bedroom',
    projectName: 'Atelier Master Bedroom',
    timestamp: '4 days ago',
    category: 'create',
  },
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  displayName: 'Elena Vance',
  studioName: 'Vance Interior Atelier',
  roleTitle: 'Lead Spatial Designer',
  defaultUnit: 'm',
  gridSnap: true,
  showDimensionsOverlay: true,
  highQualityShadows: true,
  qualityLevel: 'high',
  reducedMotion: false,
  dashboardTheme: 'light',
};
