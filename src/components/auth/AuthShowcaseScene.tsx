import React, { useMemo } from 'react';
import { RoomCanvas } from '../../three/RoomCanvas';
import { LazyRoomViewport } from '../../three/LazyRoomViewport';
import { getDefaultShellForRoom } from '../../data/stylesAndTemplates';
import { FurnitureInstance, RoomDimensions, RoomShellConfig } from '../../types/room';

interface AuthShowcaseSceneProps {
  headline: string;
  subcopy: string;
}

const SHOWCASE_DIMS: RoomDimensions = {
  length: 5.4,
  width: 4.5,
  height: 2.95,
  unit: 'm',
};

const SHOWCASE_SHELL: RoomShellConfig = {
  ...getDefaultShellForRoom('Bedroom', 'scandinavian'),
  wallColor: '#E2DBD0',
  hasAccentWall: true,
  accentWallColor: '#5D6B53',
  floorMaterial: 'herringbone-oak',
  ceilingType: 'recessed-cove',
  windowWall: 'right',
  hasCurtains: true,
  curtainColor: '#DBD3C5',
  lightingPreset: 'golden-hour',
  exposure: 0.75,
  sunIntensity: 1.0,
  ambientIntensity: 0.9,
  lampGlow: 1.05,
};

export const AuthShowcaseScene: React.FC<AuthShowcaseSceneProps> = ({ headline, subcopy }) => {
  const showcaseFurniture = useMemo<FurnitureInstance[]>(
    () => [
      {
        instanceId: 'auth-rug',
        catalogId: 'rug-woven-wool',
        name: 'Handwoven Wool Rug',
        position: [0, 0, 0.2],
        rotationY: 0,
        scale: 1.08,
        primaryColor: '#D6CEC0',
        secondaryColor: '#B5AC9D',
        finish: 'linen',
      },
      {
        instanceId: 'auth-bed',
        catalogId: 'bed-luxury-king',
        name: 'Luxury King Upholstered Bed',
        position: [0, 0, -1.05],
        rotationY: 0,
        scale: 1,
        primaryColor: '#DDD5C7',
        secondaryColor: '#6B4D38',
        finish: 'linen',
        duvetFolded: true,
      },
      {
        instanceId: 'auth-ns-l',
        catalogId: 'nightstand-wooden-bedside',
        name: 'Wooden Bedside Table',
        position: [-1.42, 0, -1.72],
        rotationY: 0,
        scale: 1,
        primaryColor: '#6B4D38',
        secondaryColor: '#B89552',
        finish: 'walnut',
      },
      {
        instanceId: 'auth-ns-r',
        catalogId: 'nightstand-wooden-bedside',
        name: 'Wooden Bedside Table',
        position: [1.42, 0, -1.72],
        rotationY: 0,
        scale: 1,
        primaryColor: '#6B4D38',
        secondaryColor: '#B89552',
        finish: 'walnut',
      },
      {
        instanceId: 'auth-lamp-l',
        catalogId: 'lamp-ceramic-table',
        name: 'Ceramic Table Lamp',
        position: [-1.42, 0.56, -1.72],
        rotationY: 0,
        scale: 1,
        primaryColor: '#DED8CE',
        secondaryColor: '#E5DDD0',
        finish: 'ceramic',
      },
      {
        instanceId: 'auth-lamp-r',
        catalogId: 'lamp-ceramic-table',
        name: 'Ceramic Table Lamp',
        position: [1.42, 0.56, -1.72],
        rotationY: 0,
        scale: 1,
        primaryColor: '#DED8CE',
        secondaryColor: '#E5DDD0',
        finish: 'ceramic',
      },
      {
        instanceId: 'auth-art',
        catalogId: 'art-landscape-painting',
        name: 'Framed Landscape Painting',
        position: [0, 1.48, -2.18],
        rotationY: 0,
        scale: 1.05,
        primaryColor: '#C4A47D',
        secondaryColor: '#6B4D38',
        finish: 'oak',
      },
      {
        instanceId: 'auth-plant',
        catalogId: 'plant-areca-palm',
        name: 'Indoor Areca Palm',
        position: [1.95, 0, -1.55],
        rotationY: -0.4,
        scale: 1,
        primaryColor: '#DED8CE',
        secondaryColor: '#5D6B53',
        finish: 'ceramic',
      },
      {
        instanceId: 'auth-bench',
        catalogId: 'bench-tufted-ottoman',
        name: 'Channel-Tufted Bed Bench',
        position: [0, 0, 0.88],
        rotationY: 0,
        scale: 1,
        primaryColor: '#E2DBD0',
        secondaryColor: '#6B4D38',
        finish: 'boucle',
      },
    ],
    [],
  );

  return (
    <div className="relative h-full w-full min-h-[340px] bg-[#212420] overflow-hidden">
      <LazyRoomViewport className="w-full h-full">
        <RoomCanvas
          dimensions={SHOWCASE_DIMS}
          shell={SHOWCASE_SHELL}
          furniture={showcaseFurniture}
          selectedId={null}
          walkthroughMode={false}
          cameraPreset="wide"
          cameraPresetTick={0}
          constructionKey={0}
          qualityLevel="medium"
          allowOrbit={false}
          authShowcaseMode
          interactive={false}
        />
      </LazyRoomViewport>

      {/* Subtle architectural vignette overlay for crisp typography readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#191B18]/92 via-[#191B18]/28 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-8 sm:p-10 lg:p-12 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
          Livora Architectural Atelier
        </p>
        <h2 className="font-display text-3xl sm:text-4xl leading-[1.12] text-[#F4F0E8] max-w-lg text-balance">
          {headline}
        </h2>
        <p className="text-sm text-[#D6D0C4] max-w-md leading-relaxed">
          {subcopy}
        </p>
      </div>
    </div>
  );
};
