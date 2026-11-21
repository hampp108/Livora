export type RoomType =
  | 'Bedroom'
  | 'Living Room'
  | 'Dining Room'
  | 'Kitchen'
  | 'Study Room'
  | 'Gaming Room'
  | 'Home Office'
  | 'Kids Room'
  | 'Bathroom'
  | 'Home Theater'
  | 'Pooja Room'
  | 'Balcony'
  | 'Custom Room';

export type DimensionUnit = 'm' | 'ft';

export type FloorMaterial =
  | 'white-oak'
  | 'herringbone-oak'
  | 'smoked-walnut'
  | 'polished-concrete'
  | 'warm-travertine'
  | 'polished-marble'
  | 'ceramic-tile'
  | 'plush-carpet';

export type CeilingType = 'flat-plaster' | 'recessed-cove' | 'exposed-beams' | 'starry-cinema';

export type WallSide = 'back' | 'left' | 'right' | 'front';

export type LightingPreset =
  | 'natural-daylight'
  | 'soft-morning'
  | 'golden-hour'
  | 'warm-evening'
  | 'night-ambient'
  // Legacy aliases preserved for backward compatibility with existing saved projects
  | 'morning'
  | 'afternoon'
  | 'sunset'
  | 'night'
  | 'cozy-ambient';

export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

export type DesignStyleId =
  | 'modern-luxury'
  | 'scandinavian'
  | 'japandi'
  | 'minimalist'
  | 'bohemian'
  | 'contemporary'
  | 'traditional';

export type FurnitureCategory =
  | 'Beds'
  | 'Sofas'
  | 'Chairs'
  | 'Tables'
  | 'Wardrobes'
  | 'Cabinets'
  | 'Shelves'
  | 'Lamps'
  | 'Plants'
  | 'Rugs'
  | 'Curtains'
  | 'Wall Art'
  | 'Decorative'
  | 'Kitchen & Bath'
  | 'Tech & Cinema'
  | 'Sacred & Outdoor';

export type FurnitureFinish =
  // Wood
  | 'oak'
  | 'walnut'
  | 'teak'
  | 'dark-wood'
  // Fabric
  | 'linen'
  | 'velvet'
  | 'cotton'
  | 'boucle'
  // Other
  | 'marble'
  | 'glass'
  | 'metal'
  | 'leather'
  | 'ceramic'
  // Legacy aliases preserved for existing saved projects
  | 'matte-fabric'
  | 'natural-oak'
  | 'smoked-walnut'
  | 'travertine'
  | 'brushed-brass'
  | 'matte-charcoal'
  | 'polished-marble';

export interface RoomDimensions {
  length: number; // X axis in meters
  width: number;  // Z axis in meters
  height: number; // Y axis in meters
  unit: DimensionUnit;
}

export interface RoomShellConfig {
  wallColor: string;
  accentWallColor: string;
  hasAccentWall: boolean;
  ceilingColor: string;
  baseboardColor: string;
  floorMaterial: FloorMaterial;
  ceilingType: CeilingType;
  windowWall: WallSide;
  windowCount: number;
  windowFrameColor: string;
  hasCurtains: boolean;
  curtainColor: string;
  curtainsOpen?: number; // 0 (closed) to 1 (open)
  doorWall: WallSide;
  lightingPreset: LightingPreset;
  overallBrightness?: number; // 0.4..1.6
  exposure?: number;          // 0.55..1.15
  sunIntensity: number;       // 0.1..2.0
  ambientIntensity?: number;  // 0.2..1.6
  ambientWarmth: number;      // 0..1
  lampGlow: number;           // 0..2.0
  shadowIntensity?: number;   // 0.2..1.6
  hasChandelier?: boolean;
  hasSlattedScreens?: boolean;
  hasAcousticPanels?: boolean;
}

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  width: number;
  depth: number;
  height: number;
  price: number;
  defaultPrimaryColor: string;
  defaultSecondaryColor: string;
  defaultFinish: FurnitureFinish;
  mountType: 'floor' | 'wall';
  defaultMountHeight?: number;
  recommendedRooms?: RoomType[];
  interactiveLabel?: string;
  description: string;
}

export interface FurnitureInstance {
  instanceId: string;
  catalogId: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  primaryColor: string;
  secondaryColor: string;
  finish: FurnitureFinish;
  isActiveState?: boolean;
  duvetFolded?: boolean;
  pillowFluffTick?: number;
  bedAssemblyTick?: number;
}

export interface RoomProject {
  id: string;
  name: string;
  roomType: RoomType;
  styleId: DesignStyleId;
  dimensions: RoomDimensions;
  shell: RoomShellConfig;
  furniture: FurnitureInstance[];
  createdAt: string;
  updatedAt: string;
  savedToArchive: boolean;
  thumbnailBg?: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  projectName: string;
  timestamp: string;
  category: 'create' | 'edit' | 'style' | 'save';
}

export interface UserSettings {
  displayName: string;
  studioName: string;
  roleTitle: string;
  defaultUnit: DimensionUnit;
  gridSnap: boolean;
  showDimensionsOverlay: boolean;
  highQualityShadows: boolean;
  qualityLevel: QualityLevel;
  reducedMotion?: boolean;
  dashboardTheme?: 'light' | 'dark';
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export type AppRoute =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'dashboard'
  | 'create-room'
  | 'editor';

export type DashboardTab =
  | 'overview'
  | 'projects'
  | 'explore'
  | 'compare'
  | 'budget'
  | 'create'
  | 'ai-studio'
  | 'inspiration'
  | 'templates'
  | 'saved'
  | 'settings';
