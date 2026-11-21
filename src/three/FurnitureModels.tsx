import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FurnitureInstance } from '../types/room';
import { getCatalogItem } from '../data/catalog';
import {
  getDuvetFoldBumpTexture,
  getFabricPBRTextures,
  getFabricWeaveTexture,
  getOtherPBRTextures,
  getPaintingCanvasTexture,
  getWoodGrainBumpTexture,
} from './proceduralTextures';
import { resolvePBRMaterialProps } from './pbrMaterials';

interface FurnitureModelProps {
  instance: FurnitureInstance;
  index?: number;
  constructionKey?: number;
  isSelected: boolean;
  isDeleting?: boolean;
  reducedMotion?: boolean;
  lampMultiplier: number;
  isNight?: boolean;
  onSelect: (id: string) => void;
  onStartDrag: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onHoverChange?: (id: string | null) => void;
}

const _targetPrimaryColor = new THREE.Color();
const _targetSecondaryColor = new THREE.Color();
const roundedGeoCache = new Map<string, RoundedBoxGeometry>();
const sculptedGeoCache = new Map<string, THREE.BufferGeometry>();

function getRoundedBox(w: number, h: number, d: number, r = 0.03, seg = 3): RoundedBoxGeometry {
  const key = `${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${r.toFixed(3)}_${seg}`;
  const existing = roundedGeoCache.get(key);
  if (existing) return existing;
  const maxR = Math.min(r, w * 0.45, h * 0.45, d * 0.45);
  const geo = new RoundedBoxGeometry(w, h, d, seg, Math.max(0.004, maxR));
  roundedGeoCache.set(key, geo);
  return geo;
}

function useRoundedBox(w: number, h: number, d: number, r = 0.03, seg = 3): RoundedBoxGeometry {
  return useMemo(() => getRoundedBox(w, h, d, r, seg), [w, h, d, r, seg]);
}

function getSculptedPillowGeo(w = 0.68, h = 0.16, d = 0.44): THREE.BufferGeometry {
  const key = `pillow_${w}_${h}_${d}`;
  const existing = sculptedGeoCache.get(key);
  if (existing) return existing;

  const geo = new THREE.BoxGeometry(w, h, d, 14, 4, 10);
  const pos = geo.attributes.position;
  const halfW = w / 2;
  const halfD = d / 2;
  const halfH = h / 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const nx = x / halfW;
    const nz = z / halfD;
    const edgeFalloff = Math.max(0, (1 - nx * nx * 0.85) * (1 - nz * nz * 0.85));
    const seamPinch = 0.3 + 0.7 * Math.pow(edgeFalloff, 0.55);

    const centerDimple = Math.exp(-(nx * nx * 3.5 + nz * nz * 3.5)) * 0.016 * (y > 0 ? 1 : 0.25);
    const cornerFluff = Math.pow(Math.abs(nx * nz), 1.4) * 0.015;
    const wrinkle = Math.sin(nx * 4.2 + nz * 2.8) * 0.0045 * edgeFalloff;

    const newY = y * seamPinch + (y >= 0 ? -centerDimple + wrinkle : 0) + Math.sign(y || 1) * cornerFluff;
    const taperX = x * (1 - Math.abs(y / halfH) * 0.05);
    const taperZ = z * (1 - Math.abs(y / halfH) * 0.05);

    pos.setXYZ(i, taperX, newY, taperZ);
  }
  geo.computeVertexNormals();
  sculptedGeoCache.set(key, geo);
  return geo;
}

function getSculptedDuvetGeo(w = 1.88, h = 0.14, d = 1.38): THREE.BufferGeometry {
  const key = `duvet_${w}_${h}_${d}`;
  const existing = sculptedGeoCache.get(key);
  if (existing) return existing;

  const geo = new THREE.BoxGeometry(w, h, d, 22, 4, 18);
  const pos = geo.attributes.position;
  const halfW = w / 2;
  const halfD = d / 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const nx = x / halfW;
    const nz = z / halfD;
    const absX = Math.abs(nx);

    const sideDrape = absX > 0.84 ? Math.pow((absX - 0.84) / 0.16, 1.5) * 0.12 : 0;
    const footDrape = nz > 0.86 ? Math.pow((nz - 0.86) / 0.14, 1.4) * 0.095 : 0;
    const loft = (1 - Math.pow(absX, 2.2) * 0.45) * 0.026;
    const ripple =
      (Math.sin(nx * 5.4 + nz * 3.1) * 0.0085 + Math.cos(nz * 6.4 - nx * 2.2) * 0.0065) *
      (y > 0 ? 1 : 0.35);
    const edgeRound = Math.max(0, 1 - Math.pow(absX, 6) * 0.4 - Math.pow(Math.abs(nz), 6) * 0.35);

    const nextY = y * edgeRound + (y > 0 ? loft + ripple : 0) - sideDrape - footDrape;
    pos.setY(i, nextY);
  }
  geo.computeVertexNormals();
  sculptedGeoCache.set(key, geo);
  return geo;
}

function getTurnedVaseGeo(): THREE.BufferGeometry {
  const key = 'turned-ceramic-vase-v1';
  const existing = sculptedGeoCache.get(key);
  if (existing) return existing;
  const pts = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(0.068, 0.0),
    new THREE.Vector2(0.095, 0.06),
    new THREE.Vector2(0.115, 0.14),
    new THREE.Vector2(0.092, 0.22),
    new THREE.Vector2(0.048, 0.27),
    new THREE.Vector2(0.056, 0.3),
    new THREE.Vector2(0.046, 0.305),
    new THREE.Vector2(0.036, 0.27),
  ];
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.computeVertexNormals();
  sculptedGeoCache.set(key, geo);
  return geo;
}

function getLampBaseLatheGeo(): THREE.BufferGeometry {
  const key = 'lamp-ceramic-lathe-v1';
  const existing = sculptedGeoCache.get(key);
  if (existing) return existing;
  const pts = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(0.092, 0),
    new THREE.Vector2(0.118, 0.05),
    new THREE.Vector2(0.128, 0.12),
    new THREE.Vector2(0.102, 0.2),
    new THREE.Vector2(0.056, 0.26),
    new THREE.Vector2(0.042, 0.285),
    new THREE.Vector2(0.001, 0.285),
  ];
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.computeVertexNormals();
  sculptedGeoCache.set(key, geo);
  return geo;
}

function getArcLampTubeGeo(): THREE.BufferGeometry {
  const key = 'arc-lamp-tube-v1';
  const existing = sculptedGeoCache.get(key);
  if (existing) return existing;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.06, -0.14),
    new THREE.Vector3(0, 0.95, -0.14),
    new THREE.Vector3(0, 1.62, -0.02),
    new THREE.Vector3(0, 1.94, 0.28),
    new THREE.Vector3(0, 1.86, 0.56),
    new THREE.Vector3(0, 1.72, 0.58),
  ]);
  const geo = new THREE.TubeGeometry(curve, 36, 0.014, 12, false);
  sculptedGeoCache.set(key, geo);
  return geo;
}

function getKidneyTableTopGeo(): THREE.BufferGeometry {
  const key = 'kidney-table-top-v1';
  const existing = sculptedGeoCache.get(key);
  if (existing) return existing;
  const shape = new THREE.Shape();
  shape.moveTo(-0.56, 0.05);
  shape.bezierCurveTo(-0.62, 0.34, -0.18, 0.38, 0.14, 0.26);
  shape.bezierCurveTo(0.42, 0.36, 0.64, 0.24, 0.6, -0.06);
  shape.bezierCurveTo(0.55, -0.34, 0.15, -0.34, -0.08, -0.22);
  shape.bezierCurveTo(-0.34, -0.32, -0.58, -0.22, -0.56, 0.05);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.rotateX(-Math.PI / 2);
  geo.center();
  geo.computeVertexNormals();
  sculptedGeoCache.set(key, geo);
  return geo;
}

function getOrganicLeafGeo(w = 0.09, len = 0.26): THREE.BufferGeometry {
  const key = `leaf-${w}-${len}`;
  const existing = sculptedGeoCache.get(key);
  if (existing) return existing;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(w, len * 0.42, 0, len);
  shape.quadraticCurveTo(-w, len * 0.42, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const t = y / len;
    pos.setZ(i, Math.sin(t * Math.PI) * 0.025 - Math.abs(x) * 0.18);
  }
  geo.computeVertexNormals();
  sculptedGeoCache.set(key, geo);
  return geo;
}

export const FurnitureModel: React.FC<FurnitureModelProps> = ({
  instance,
  index = 0,
  constructionKey = 0,
  isSelected,
  isDeleting = false,
  reducedMotion = false,
  lampMultiplier,
  isNight = false,
  onSelect,
  onStartDrag,
  onHoverChange,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const entryProgress = useRef(reducedMotion ? 1 : 0);
  const entryDelayTimer = useRef(0);
  const deleteProgress = useRef(0);
  const rippleProgress = useRef(0);
  const [hovered, setHovered] = useState(false);

  // Bed staged assembly & interactive bedding refs
  const bedAnimProgress = useRef(constructionKey > 0 && !reducedMotion ? 0 : 1);
  const bedFrameRef = useRef<THREE.Group>(null);
  const bedHeadboardRef = useRef<THREE.Group>(null);
  const bedMattressRef = useRef<THREE.Group>(null);
  const bedDuvetRef = useRef<THREE.Group>(null);
  const bedThrowRef = useRef<THREE.Group>(null);
  const pillowRefs = useRef<Array<THREE.Group | null>>([]);
  const pillowFluffImpulse = useRef(0);
  const duvetFoldFactor = useRef(instance.duvetFolded ? 1 : 0);
  const bedPrimaryMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const bedSecondaryMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  // Interactive furniture animation refs
  const cushionSquishRef = useRef<THREE.Group>(null);
  const cushionImpulse = useRef(0);
  const nightstandDrawerRef = useRef<THREE.Group>(null);
  const wardrobeDoorLRef = useRef<THREE.Group>(null);
  const wardrobeDoorRRef = useRef<THREE.Group>(null);
  const slidingDoorLRef = useRef<THREE.Group>(null);
  const slidingDoorRRef = useRef<THREE.Group>(null);
  const curtainLeftPanelRef = useRef<THREE.Group>(null);
  const curtainRightPanelRef = useRef<THREE.Group>(null);
  const lampLightRef = useRef<THREE.PointLight>(null);
  const lampBulbMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // Sub-refs for room-specific animations
  const foliageRef = useRef<THREE.Group>(null);
  const doorLeftRef = useRef<THREE.Group>(null);
  const doorRightRef = useRef<THREE.Group>(null);
  const deskLiftRef = useRef<THREE.Group>(null);
  const reclinerBackRef = useRef<THREE.Group>(null);
  const reclinerFootRef = useRef<THREE.Mesh>(null);
  const swingBasketRef = useRef<THREE.Group>(null);
  const towelRef = useRef<THREE.Mesh>(null);
  const bellGroupRef = useRef<THREE.Group>(null);
  const diyaFlameRef = useRef<THREE.Mesh>(null);
  const steamGroupRef = useRef<THREE.Group>(null);
  const fanRefs = useRef<Array<THREE.Mesh | null>>([]);
  const stoolSpinRef = useRef<THREE.Group>(null);
  const rugUnrollRef = useRef<THREE.Group>(null);
  const toyBounceRef = useRef<THREE.Mesh>(null);
  const chairSlideRef = useRef<THREE.Group>(null);

  const catalog = useMemo(() => getCatalogItem(instance.catalogId), [instance.catalogId]);
  const pbr = useMemo(() => resolvePBRMaterialProps(instance.finish), [instance.finish]);
  const linenMaps = useMemo(() => getFabricPBRTextures('linen'), []);
  const velvetMaps = useMemo(() => getFabricPBRTextures('velvet'), []);
  const ceramicMaps = useMemo(() => getOtherPBRTextures('ceramic'), []);
  const boucleTex = useMemo(() => getFabricWeaveTexture('boucle'), []);
  const linenTex = useMemo(() => getFabricWeaveTexture('linen'), []);
  const rugTex = useMemo(() => getFabricWeaveTexture('rug'), []);
  const woodBump = useMemo(() => getWoodGrainBumpTexture(), []);
  const duvetBump = useMemo(() => getDuvetFoldBumpTexture(), []);
  const paintingTex = useMemo(() => getPaintingCanvasTexture(0), []);

  const primaryPbrProps = useMemo(
    () => ({
      roughness: pbr.roughness,
      metalness: pbr.metalness,
      clearcoat: pbr.clearcoat,
      clearcoatRoughness: pbr.clearcoatRoughness,
      sheen: pbr.sheen,
      sheenRoughness: pbr.sheenRoughness,
      envMapIntensity: pbr.envMapIntensity,
      transparent: pbr.transparent,
      opacity: pbr.opacity,
      map: pbr.maps?.map ?? null,
      normalMap: pbr.maps?.normalMap ?? null,
      normalScale: pbr.normalScale,
      roughnessMap: pbr.maps?.roughnessMap ?? null,
    }),
    [pbr],
  );

  const isBed =
    catalog?.category === 'Beds' && instance.catalogId !== 'bed-kids-bunk';
  const isKingBed = instance.catalogId === 'bed-luxury-king';

  useEffect(() => {
    if (reducedMotion) {
      entryProgress.current = 1;
      bedAnimProgress.current = 1;
      return;
    }
    if (constructionKey > 0) {
      entryProgress.current = 0;
      entryDelayTimer.current = Math.min(index * 0.085, 0.85) + 0.55;
      if (isBed) bedAnimProgress.current = 0;
    }
  }, [constructionKey, index, isBed, reducedMotion]);

  useEffect(() => {
    if (instance.bedAssemblyTick && isBed && !reducedMotion) {
      bedAnimProgress.current = 0;
    }
  }, [instance.bedAssemblyTick, isBed, reducedMotion]);

  useEffect(() => {
    if (instance.pillowFluffTick && isBed && !reducedMotion) {
      pillowFluffImpulse.current = 1;
    }
  }, [instance.pillowFluffTick, isBed, reducedMotion]);

  useEffect(() => {
    if ((isSelected || instance.isActiveState) && !reducedMotion) {
      cushionImpulse.current = 1;
    }
  }, [isSelected, instance.isActiveState, reducedMotion]);

  useEffect(() => {
    rippleProgress.current = 0;
  }, [instance.position[0], instance.position[2]]);

  const c1 = instance.primaryColor;
  const c2 = instance.secondaryColor;
  const activeState = Boolean(instance.isActiveState);
  const ringRadius = Math.max(catalog?.width ?? 1, catalog?.depth ?? 1) * 0.62;

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();
    const g = groupRef.current;
    if (!g) return;

    if (isDeleting) {
      deleteProgress.current = Math.min(1, deleteProgress.current + dt * 3.8);
      const dp = deleteProgress.current;
      const shrink = Math.max(0.02, 1 - dp * 0.85);
      g.scale.setScalar(instance.scale * shrink);
      g.position.y = instance.position[1] + dp * 0.24;
      return;
    } else {
      deleteProgress.current = 0;
    }

    if (entryDelayTimer.current > 0) {
      entryDelayTimer.current = Math.max(0, entryDelayTimer.current - dt);
    } else if (entryProgress.current < 1) {
      entryProgress.current = Math.min(1, entryProgress.current + dt * (isBed ? 2.4 : 2.8));
    }

    const ease = reducedMotion ? 1 : 1 - Math.pow(1 - entryProgress.current, 3);
    const dropOffset = (1 - ease) * 0.28;
    const hoverLift = hovered && !isSelected ? 0.022 : 0;

    g.position.x = THREE.MathUtils.damp(g.position.x, instance.position[0], 14, dt);
    g.position.y = THREE.MathUtils.damp(
      g.position.y,
      instance.position[1] + dropOffset + hoverLift,
      14,
      dt,
    );
    g.position.z = THREE.MathUtils.damp(g.position.z, instance.position[2], 14, dt);

    let rotDiff = instance.rotationY - g.rotation.y;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    g.rotation.y += rotDiff * Math.min(1, dt * 14);

    const targetScale = instance.scale * (0.76 + 0.24 * ease);
    const nextS = THREE.MathUtils.damp(g.scale.x, targetScale, 14, dt);
    g.scale.setScalar(nextS);

    if (bedPrimaryMatRef.current) {
      _targetPrimaryColor.set(c1);
      bedPrimaryMatRef.current.color.lerp(_targetPrimaryColor, 1 - Math.exp(-8 * dt));
    }
    if (bedSecondaryMatRef.current) {
      _targetSecondaryColor.set(c2);
      bedSecondaryMatRef.current.color.lerp(_targetSecondaryColor, 1 - Math.exp(-8 * dt));
    }

    if (isBed) {
      if (entryDelayTimer.current <= 0 && bedAnimProgress.current < 1) {
        bedAnimProgress.current = Math.min(1, bedAnimProgress.current + dt * 0.42);
      }
      const bp = reducedMotion ? 1 : bedAnimProgress.current;

      const frameP = THREE.MathUtils.smoothstep(bp, 0.0, 0.28);
      if (bedFrameRef.current) {
        bedFrameRef.current.scale.set(0.88 + 0.12 * frameP, 0.3 + 0.7 * frameP, 0.88 + 0.12 * frameP);
        bedFrameRef.current.position.y = (1 - frameP) * 0.08;
      }
      if (bedHeadboardRef.current) {
        const hbP = THREE.MathUtils.smoothstep(bp, 0.08, 0.34);
        bedHeadboardRef.current.scale.y = Math.max(0.05, hbP);
        bedHeadboardRef.current.position.y = (1 - hbP) * -0.15;
      }

      const matP = THREE.MathUtils.smoothstep(bp, 0.24, 0.52);
      if (bedMattressRef.current) {
        const dropY = (1 - matP) * 0.38;
        const compress = bp > 0.48 && bp < 0.62 ? Math.sin(((bp - 0.48) / 0.14) * Math.PI) * 0.045 : 0;
        const baseMattressY = isKingBed ? 0.37 : 0.34;
        bedMattressRef.current.position.y = baseMattressY + dropY - compress * 0.25;
        bedMattressRef.current.scale.set(0.92 + 0.08 * matP, (0.7 + 0.3 * matP) * (1 - compress), 0.92 + 0.08 * matP);
      }

      if (pillowFluffImpulse.current > 0) {
        pillowFluffImpulse.current = Math.max(0, pillowFluffImpulse.current - dt * 1.45);
      }
      const fluffWave = pillowFluffImpulse.current;
      pillowRefs.current.forEach((pGroup, idx) => {
        if (!pGroup) return;
        const start = 0.46 + Math.min(idx, 4) * 0.045;
        const pProg = THREE.MathUtils.smoothstep(bp, start, start + 0.18);
        const dropH = (1 - pProg) * 0.32;
        const settleSquish =
          pProg > 0.75 && pProg < 1 ? Math.sin(((pProg - 0.75) / 0.25) * Math.PI) * 0.08 : 0;

        const fluffPhase = Math.max(0, Math.sin(fluffWave * Math.PI * 1.3 - idx * 0.35));
        const fluffLift = fluffWave > 0 ? fluffPhase * 0.075 : 0;
        const breathe = reducedMotion ? 0 : Math.sin(t * 0.95 + idx * 1.2) * 0.0025;

        const row = idx < 2 ? 0 : idx < 4 ? 1 : 2;
        const baseZ = row === 0 ? -0.74 : row === 1 ? -0.51 : -0.32;
        const baseY = row === 0 ? 0.56 : row === 1 ? 0.53 : 0.5;
        pGroup.position.y = baseY + dropH + fluffLift + breathe;
        pGroup.position.z = baseZ;
        pGroup.scale.set(
          Math.max(0.01, pProg) * (1 + settleSquish * 0.5),
          Math.max(0.01, pProg) * (1 - settleSquish + fluffLift * 1.4),
          Math.max(0.01, pProg),
        );
        pGroup.rotation.x = (row === 0 ? 0.28 : row === 1 ? 0.38 : 0.46) + (1 - pProg) * 0.28 - fluffLift * 1.2;
      });

      const duvetTargetFold = instance.duvetFolded ? 1 : 0;
      duvetFoldFactor.current = reducedMotion
        ? duvetTargetFold
        : THREE.MathUtils.damp(duvetFoldFactor.current, duvetTargetFold, 6.5, dt);

      const duvetP = THREE.MathUtils.smoothstep(bp, 0.68, 0.95);
      const fold = duvetFoldFactor.current;
      const breatheDuvet = reducedMotion ? 0 : Math.sin(t * 0.85) * 0.003;

      if (bedDuvetRef.current) {
        const unfoldLen = Math.max(0.08, duvetP) * (1 - fold * 0.32);
        bedDuvetRef.current.scale.set(1, 0.65 + 0.35 * duvetP + fold * 0.14, unfoldLen);
        bedDuvetRef.current.position.z = 0.36 + (1 - duvetP) * -0.48 + fold * 0.22;
        bedDuvetRef.current.position.y = (isKingBed ? 0.44 : 0.415) + (1 - duvetP) * 0.08 + fold * 0.018 + breatheDuvet;
        bedDuvetRef.current.visible = bp > 0.66;
      }

      if (bedThrowRef.current) {
        const throwP = THREE.MathUtils.smoothstep(bp, 0.8, 1.0);
        bedThrowRef.current.scale.set(Math.max(0.05, throwP), 1, Math.max(0.05, throwP));
        bedThrowRef.current.position.y = (isKingBed ? 0.515 : 0.49) + (1 - throwP) * 0.14 + breatheDuvet * 1.2;
        bedThrowRef.current.position.z = 0.66 + fold * 0.06;
        bedThrowRef.current.visible = bp > 0.78;
      }
    }

    if (cushionSquishRef.current) {
      if (cushionImpulse.current > 0) {
        cushionImpulse.current = Math.max(0, cushionImpulse.current - dt * 2.8);
      }
      const sq = Math.sin(cushionImpulse.current * Math.PI) * 0.075;
      cushionSquishRef.current.scale.set(1 + sq * 0.35, 1 - sq, 1 + sq * 0.35);
    }

    if (nightstandDrawerRef.current) {
      const targetDrawerZ = activeState ? 0.17 : 0;
      nightstandDrawerRef.current.position.z = reducedMotion
        ? targetDrawerZ
        : THREE.MathUtils.damp(nightstandDrawerRef.current.position.z, targetDrawerZ, 8, dt);
    }

    if (wardrobeDoorLRef.current && wardrobeDoorRRef.current) {
      const targetAngle = activeState ? Math.PI * 0.42 : 0;
      wardrobeDoorLRef.current.rotation.y = reducedMotion
        ? -targetAngle
        : THREE.MathUtils.damp(wardrobeDoorLRef.current.rotation.y, -targetAngle, 7, dt);
      wardrobeDoorRRef.current.rotation.y = reducedMotion
        ? targetAngle
        : THREE.MathUtils.damp(wardrobeDoorRRef.current.rotation.y, targetAngle, 7, dt);
    }

    if (slidingDoorLRef.current && slidingDoorRRef.current) {
      const targetSlide = activeState ? 0.42 : 0;
      slidingDoorLRef.current.position.x = reducedMotion
        ? -0.49 + targetSlide
        : THREE.MathUtils.damp(slidingDoorLRef.current.position.x, -0.49 + targetSlide, 7, dt);
      slidingDoorRRef.current.position.x = reducedMotion
        ? 0.49 - targetSlide * 0.35
        : THREE.MathUtils.damp(slidingDoorRRef.current.position.x, 0.49 - targetSlide * 0.35, 7, dt);
    }

    if (curtainLeftPanelRef.current && curtainRightPanelRef.current) {
      const targetX = activeState ? 0.92 : 0.42;
      curtainLeftPanelRef.current.position.x = reducedMotion
        ? -targetX
        : THREE.MathUtils.damp(curtainLeftPanelRef.current.position.x, -targetX, 6, dt);
      curtainRightPanelRef.current.position.x = reducedMotion
        ? targetX
        : THREE.MathUtils.damp(curtainRightPanelRef.current.position.x, targetX, 6, dt);
      if (!reducedMotion) {
        curtainLeftPanelRef.current.rotation.z = Math.sin(t * 0.9) * 0.014;
        curtainRightPanelRef.current.rotation.z = -Math.sin(t * 0.9 + 0.7) * 0.014;
      }
    }

    if (lampLightRef.current) {
      const targetIntensity =
        instance.catalogId === 'lamp-ceramic-table'
          ? (activeState || lampMultiplier > 0.25 ? 0.68 * Math.max(0.45, lampMultiplier) : 0)
          : instance.catalogId === 'lamp-brass-arc'
          ? (lampMultiplier > 0.22 ? 0.88 * lampMultiplier : 0)
          : (lampMultiplier > 0.22 ? 0.62 * lampMultiplier : 0);
      lampLightRef.current.intensity = reducedMotion
        ? targetIntensity
        : THREE.MathUtils.damp(lampLightRef.current.intensity, targetIntensity, 6, dt);
    }
    if (lampBulbMatRef.current) {
      const targetEmissive =
        instance.catalogId === 'lamp-ceramic-table'
          ? (activeState || lampMultiplier > 0.25 ? 1.05 * Math.max(0.55, lampMultiplier) : 0.08)
          : 0.9 * lampMultiplier;
      lampBulbMatRef.current.emissiveIntensity = reducedMotion
        ? targetEmissive
        : THREE.MathUtils.damp(lampBulbMatRef.current.emissiveIntensity, targetEmissive, 6, dt);
    }

    if (rippleRef.current) {
      if (rippleProgress.current < 1 && !reducedMotion) {
        rippleProgress.current = Math.min(1, rippleProgress.current + dt * 1.9);
        const rp = rippleProgress.current;
        rippleRef.current.visible = true;
        rippleRef.current.scale.setScalar(0.6 + rp * 0.75);
        (rippleRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - rp) * 0.42;
      } else {
        rippleRef.current.visible = false;
      }
    }

    if (rugUnrollRef.current) {
      const targetUnroll = Math.max(0.15, ease);
      rugUnrollRef.current.scale.z = THREE.MathUtils.damp(rugUnrollRef.current.scale.z, targetUnroll, 10, dt);
    }

    if (foliageRef.current && !reducedMotion) {
      foliageRef.current.rotation.z = Math.sin(t * 1.15 + instance.position[0]) * 0.022;
      foliageRef.current.rotation.x = Math.cos(t * 0.9 + instance.position[2]) * 0.016;
    }

    if (doorLeftRef.current && doorRightRef.current) {
      const targetAngle = activeState ? Math.PI * 0.48 : 0;
      doorLeftRef.current.rotation.y = THREE.MathUtils.damp(
        doorLeftRef.current.rotation.y,
        -targetAngle,
        8,
        dt,
      );
      doorRightRef.current.rotation.y = THREE.MathUtils.damp(
        doorRightRef.current.rotation.y,
        targetAngle,
        8,
        dt,
      );
    }

    if (deskLiftRef.current) {
      const targetDeskY = activeState ? 0.34 : 0;
      deskLiftRef.current.position.y = THREE.MathUtils.damp(
        deskLiftRef.current.position.y,
        targetDeskY,
        7,
        dt,
      );
    }

    if (reclinerBackRef.current && reclinerFootRef.current) {
      reclinerBackRef.current.rotation.x = THREE.MathUtils.damp(
        reclinerBackRef.current.rotation.x,
        activeState ? -0.45 : -0.1,
        8,
        dt,
      );
      reclinerFootRef.current.rotation.x = THREE.MathUtils.damp(
        reclinerFootRef.current.rotation.x,
        activeState ? 0.25 : 1.35,
        8,
        dt,
      );
    }

    if (swingBasketRef.current && !reducedMotion) {
      swingBasketRef.current.rotation.z = Math.sin(t * 1.35) * 0.04;
      swingBasketRef.current.rotation.x = Math.cos(t * 0.95) * 0.022;
    }

    if (towelRef.current && !reducedMotion) {
      towelRef.current.rotation.x = Math.sin(t * 1.6) * 0.036;
    }

    if (bellGroupRef.current && !reducedMotion) {
      bellGroupRef.current.rotation.z = Math.sin(t * 2.2) * 0.04;
    }
    if (diyaFlameRef.current && !reducedMotion) {
      diyaFlameRef.current.scale.y = 0.9 + Math.sin(t * 11.5) * 0.18;
      diyaFlameRef.current.scale.x = 0.95 + Math.cos(t * 9.0) * 0.1;
    }

    if (steamGroupRef.current && !reducedMotion) {
      steamGroupRef.current.children.forEach((child, idx) => {
        const phase = (t * 0.55 + idx * 0.28) % 1;
        child.position.y = phase * 0.48;
        child.position.x = Math.sin(t * 2.0 + idx) * 0.03 * phase;
        const sc = 0.5 + phase * 0.9;
        child.scale.setScalar(sc);
      });
    }

    if (!reducedMotion) {
      fanRefs.current.forEach((f) => {
        if (f) f.rotation.z += dt * (activeState ? 11 : 3.5);
      });
    }

    if (stoolSpinRef.current) {
      stoolSpinRef.current.rotation.y = THREE.MathUtils.damp(
        stoolSpinRef.current.rotation.y,
        hovered ? Math.PI * 0.45 : 0,
        6,
        dt,
      );
    }

    if (chairSlideRef.current) {
      chairSlideRef.current.position.z = THREE.MathUtils.damp(
        chairSlideRef.current.position.z,
        hovered ? -0.1 : 0,
        8,
        dt,
      );
    }

    if (toyBounceRef.current && !reducedMotion) {
      const targetBounce = hovered ? Math.abs(Math.sin(t * 5.5)) * 0.09 : 0;
      toyBounceRef.current.position.y = THREE.MathUtils.damp(
        toyBounceRef.current.position.y,
        0.16 + targetBounce,
        10,
        dt,
      );
    }
  });

  // Sculpted organic geometries
  const sculptedLargePillowGeo = useMemo(() => getSculptedPillowGeo(0.68, 0.15, 0.44), []);
  const sculptedLumbarPillowGeo = useMemo(() => getSculptedPillowGeo(0.54, 0.13, 0.33), []);
  const sculptedEuroPillowGeo = useMemo(() => getSculptedPillowGeo(0.72, 0.16, 0.54), []);
  const sculptedDuvetGeo = useMemo(() => getSculptedDuvetGeo(1.88, 0.15, 1.38), []);
  const sculptedKingDuvetGeo = useMemo(() => getSculptedDuvetGeo(2.14, 0.165, 1.46), []);
  const sculptedThrowGeo = useMemo(() => getSculptedDuvetGeo(1.92, 0.065, 0.62), []);
  const sculptedKingThrowGeo = useMemo(() => getSculptedDuvetGeo(2.18, 0.07, 0.66), []);
  const turnedVaseGeo = useMemo(() => getTurnedVaseGeo(), []);
  const lampBaseLatheGeo = useMemo(() => getLampBaseLatheGeo(), []);
  const arcLampTubeGeo = useMemo(() => getArcLampTubeGeo(), []);
  const kidneyTopGeo = useMemo(() => getKidneyTableTopGeo(), []);
  const broadLeafGeo = useMemo(() => getOrganicLeafGeo(0.085, 0.28), []);
  const palmBladeGeo = useMemo(() => getOrganicLeafGeo(0.048, 0.58), []);

  // Common rounded boxes
  const bedBaseGeo = useRoundedBox(1.98, 0.21, 2.2, 0.065);
  const bedMattressGeo = useRoundedBox(1.78, 0.24, 1.98, 0.065);
  const bedHeadGeo = useRoundedBox(2.04, 0.94, 0.11, 0.05);
  const kingBaseGeo = useRoundedBox(2.26, 0.23, 2.32, 0.06);
  const kingMattressGeo = useRoundedBox(2.06, 0.27, 2.08, 0.07);

  const sofaBaseGeo = useRoundedBox(2.26, 0.14, 0.92, 0.04);
  const sofaSeatGeo = useRoundedBox(0.7, 0.25, 0.84, 0.07);
  const sofaBackGeo = useRoundedBox(2.3, 0.5, 0.24, 0.08);
  const coffeeTopGeo = useRoundedBox(1.28, 0.06, 0.74, 0.025);
  const diningTopGeo = useRoundedBox(2.24, 0.06, 1.04, 0.022);
  const deskTopGeo = useRoundedBox(1.68, 0.048, 0.78, 0.02);

  const renderSharedBedding = (wide = false) => {
    const pillowXs = wide ? [-0.52, 0.52] : [-0.44, 0.44];
    const duvetGeo = wide ? sculptedKingDuvetGeo : sculptedDuvetGeo;
    const throwGeo = wide ? sculptedKingThrowGeo : sculptedThrowGeo;
    const matGeo = wide ? kingMattressGeo : bedMattressGeo;
    const cuffLen = wide ? 1.98 : 1.72;
    const pipingW = wide ? 2.04 : 1.76;
    const pipingD = wide ? 2.06 : 1.96;

    return (
      <>
        <group ref={bedMattressRef} position={[0, wide ? 0.37 : 0.34, 0.03]}>
          <mesh geometry={matGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#DDD6C9"
              map={linenMaps.map}
              normalMap={linenMaps.normalMap}
              roughnessMap={linenMaps.roughnessMap}
              roughness={0.94}
              sheen={0.35}
              sheenRoughness={0.85}
              envMapIntensity={0.18}
            />
          </mesh>
          <mesh position={[0, wide ? 0.13 : 0.115, 0]}>
            <boxGeometry args={[pipingW, 0.012, pipingD]} />
            <meshStandardMaterial color="#CFC6B7" roughness={0.92} envMapIntensity={0.16} />
          </mesh>
        </group>

        <group ref={bedDuvetRef} position={[0, wide ? 0.44 : 0.415, 0.36]}>
          <mesh geometry={duvetGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#D9D1C3"
              map={linenMaps.map}
              normalMap={linenMaps.normalMap}
              bumpMap={duvetBump}
              bumpScale={0.014}
              roughness={0.95}
              sheen={0.32}
              sheenRoughness={0.88}
              envMapIntensity={0.18}
            />
          </mesh>
          <mesh position={[0, 0.075, -0.62]} rotation={[0.08, 0, Math.PI / 2]} castShadow receiveShadow>
            <capsuleGeometry args={[0.065, cuffLen, 8, 16]} />
            <meshPhysicalMaterial
              color="#E2DACB"
              map={linenMaps.map}
              normalMap={linenMaps.normalMap}
              bumpMap={duvetBump}
              bumpScale={0.012}
              roughness={0.95}
              sheen={0.3}
              envMapIntensity={0.18}
            />
          </mesh>
        </group>

        <group ref={bedThrowRef} position={[0, wide ? 0.515 : 0.49, 0.66]}>
          <mesh geometry={throwGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              ref={bedSecondaryMatRef}
              color={c2}
              map={velvetMaps.map}
              normalMap={velvetMaps.normalMap}
              bumpMap={duvetBump}
              bumpScale={0.015}
              roughness={0.88}
              sheen={0.78}
              sheenRoughness={0.55}
              envMapIntensity={0.2}
            />
          </mesh>
        </group>

        {pillowXs.map((px, i) => (
          <group key={i}>
            <group
              ref={(el) => {
                pillowRefs.current[i] = el;
              }}
              position={[px, 0.56, -0.74]}
              rotation={[0.28, 0, i === 0 ? 0.03 : -0.03]}
            >
              <mesh geometry={wide ? sculptedEuroPillowGeo : sculptedLargePillowGeo} castShadow receiveShadow>
                <meshPhysicalMaterial
                  color="#E3DCD0"
                  map={linenMaps.map}
                  normalMap={linenMaps.normalMap}
                  bumpMap={duvetBump}
                  bumpScale={0.01}
                  roughness={0.93}
                  sheen={0.3}
                  envMapIntensity={0.18}
                />
              </mesh>
            </group>
            <group
              ref={(el) => {
                pillowRefs.current[i + 2] = el;
              }}
              position={[px * 0.9, 0.53, -0.51]}
              rotation={[0.38, 0, i === 0 ? -0.04 : 0.04]}
            >
              <mesh geometry={wide ? sculptedLargePillowGeo : sculptedLumbarPillowGeo} castShadow receiveShadow>
                <meshPhysicalMaterial
                  color={wide ? '#DCD4C6' : c2}
                  map={velvetMaps.map}
                  normalMap={velvetMaps.normalMap}
                  roughness={0.9}
                  sheen={0.68}
                  envMapIntensity={0.18}
                />
              </mesh>
            </group>
            {wide && (
              <group
                ref={(el) => {
                  pillowRefs.current[i + 4] = el;
                }}
                position={[px * 0.72, 0.5, -0.32]}
                rotation={[0.46, i === 0 ? 0.08 : -0.08, 0]}
              >
                <mesh geometry={sculptedLumbarPillowGeo} castShadow receiveShadow>
                  <meshPhysicalMaterial
                    color={c2}
                    map={velvetMaps.map}
                    normalMap={velvetMaps.normalMap}
                    roughness={0.86}
                    sheen={0.82}
                    envMapIntensity={0.2}
                  />
                </mesh>
              </group>
            )}
          </group>
        ))}
      </>
    );
  };

  const renderParts = () => {
    switch (instance.catalogId) {
      case 'bed-platform-oak':
      case 'bed-canopy-suite': {
        const isCanopy = instance.catalogId === 'bed-canopy-suite';
        return (
          <group>
            <group ref={bedFrameRef}>
              <mesh position={[0, 0.14, 0]} geometry={bedBaseGeo} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} ref={bedPrimaryMatRef} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.03, 0]} castShadow>
                <boxGeometry args={[1.64, 0.06, 1.88]} />
                <meshStandardMaterial color="#252320" roughness={0.72} envMapIntensity={0.2} />
              </mesh>
            </group>

            <group ref={bedHeadboardRef}>
              <mesh position={[0, 0.65, -1.03]} geometry={bedHeadGeo} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              {Array.from({ length: 7 }).map((_, rib) => (
                <mesh key={rib} position={[-0.78 + rib * 0.26, 0.68, -0.965]} castShadow receiveShadow>
                  <capsuleGeometry args={[0.105, 0.56, 8, 14]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              {[-1.0, 1.0].map((wx, i) => (
                <mesh key={i} position={[wx, 0.64, -0.94]} geometry={getRoundedBox(0.08, 0.92, 0.24, 0.03)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
            </group>

            {renderSharedBedding(false)}

            {isCanopy && (
              <group>
                {[
                  [-0.92, -1.02],
                  [0.92, -1.02],
                  [-0.92, 1.02],
                  [0.92, 1.02],
                ].map(([px, pz], i) => (
                  <mesh key={i} position={[px, 0.98, pz]} castShadow>
                    <cylinderGeometry args={[0.028, 0.028, 1.96, 12]} />
                    <meshStandardMaterial color={c2} roughness={0.48} envMapIntensity={0.35} />
                  </mesh>
                ))}
                <mesh position={[0, 1.95, -1.02]} castShadow>
                  <boxGeometry args={[1.9, 0.05, 0.05]} />
                  <meshStandardMaterial color={c2} roughness={0.48} envMapIntensity={0.35} />
                </mesh>
                <mesh position={[0, 1.95, 1.02]} castShadow>
                  <boxGeometry args={[1.9, 0.05, 0.05]} />
                  <meshStandardMaterial color={c2} roughness={0.48} envMapIntensity={0.35} />
                </mesh>
                <mesh position={[-0.92, 1.95, 0]} castShadow>
                  <boxGeometry args={[0.05, 0.05, 2.08]} />
                  <meshStandardMaterial color={c2} roughness={0.48} envMapIntensity={0.35} />
                </mesh>
                <mesh position={[0.92, 1.95, 0]} castShadow>
                  <boxGeometry args={[0.05, 0.05, 2.08]} />
                  <meshStandardMaterial color={c2} roughness={0.48} envMapIntensity={0.35} />
                </mesh>
              </group>
            )}
          </group>
        );
      }

      case 'bed-luxury-king': {
        return (
          <group>
            <group ref={bedFrameRef}>
              <mesh position={[0, 0.15, 0]} geometry={kingBaseGeo} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} ref={bedPrimaryMatRef} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.035, 0]} castShadow>
                <boxGeometry args={[1.98, 0.07, 2.06]} />
                <meshStandardMaterial color="#B89552" roughness={0.28} metalness={0.85} envMapIntensity={0.55} />
              </mesh>
            </group>

            <group ref={bedHeadboardRef}>
              <mesh position={[0, 0.72, -1.1]} geometry={getRoundedBox(2.38, 1.08, 0.12, 0.04)} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              {/* Brushed brass architectural frame inlay */}
              <mesh position={[0, 0.72, -1.035]}>
                <boxGeometry args={[2.32, 1.02, 0.015]} />
                <meshStandardMaterial color="#B89552" roughness={0.24} metalness={0.88} envMapIntensity={0.6} />
              </mesh>
              {/* Tufted velvet / upholstered panel blocks */}
              {[-0.72, 0, 0.72].map((hx, idx) => (
                <mesh key={idx} position={[hx, 0.72, -1.0]} geometry={getRoundedBox(0.68, 0.92, 0.07, 0.035)} castShadow receiveShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              {/* Angled architectural side wings */}
              {[-1.16, 1.16].map((wx, i) => (
                <mesh
                  key={i}
                  position={[wx, 0.71, -0.98]}
                  rotation={[0, i === 0 ? 0.16 : -0.16, 0]}
                  geometry={getRoundedBox(0.09, 1.06, 0.34, 0.03)}
                  castShadow
                >
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
            </group>

            {renderSharedBedding(true)}
          </group>
        );
      }

      case 'bed-wooden-platform': {
        return (
          <group>
            <group ref={bedFrameRef}>
              {/* Four solid turned timber legs */}
              {[
                [-0.9, -0.98],
                [0.9, -0.98],
                [-0.9, 0.98],
                [0.9, 0.98],
              ].map(([lx, lz], i) => (
                <mesh key={i} position={[lx, 0.09, lz]} castShadow>
                  <cylinderGeometry args={[0.042, 0.032, 0.18, 16]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              {/* Mitered perimeter timber surround */}
              <mesh position={[0, 0.21, 0]} geometry={getRoundedBox(1.98, 0.11, 2.18, 0.02)} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} ref={bedPrimaryMatRef} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.25, 0.02]}>
                <boxGeometry args={[1.82, 0.04, 2.02]} />
                <meshStandardMaterial color="#3A2D22" roughness={0.62} />
              </mesh>
            </group>

            <group ref={bedHeadboardRef}>
              {/* Angled timber side posts + horizontal top rail + slatted backrest */}
              {[-0.95, 0.95].map((px, i) => (
                <mesh key={i} position={[px, 0.62, -1.04]} rotation={[-0.08, 0, 0]} geometry={getRoundedBox(0.065, 0.78, 0.075, 0.015)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              <mesh position={[0, 0.97, -1.06]} rotation={[-0.08, 0, 0]} geometry={getRoundedBox(1.98, 0.08, 0.065, 0.015)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              {Array.from({ length: 13 }).map((_, i) => (
                <mesh key={i} position={[-0.84 + i * 0.14, 0.66, -1.03]} rotation={[-0.08, 0, 0]} geometry={getRoundedBox(0.055, 0.54, 0.028, 0.008)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
            </group>

            {renderSharedBedding(false)}
          </group>
        );
      }

      case 'bed-minimalist-floating': {
        return (
          <group>
            <group ref={bedFrameRef}>
              {/* Deeply recessed invisible plinth so outer edges appear cantilevered */}
              <mesh position={[0, 0.09, -0.05]} castShadow>
                <boxGeometry args={[1.28, 0.18, 1.56]} />
                <meshStandardMaterial color="#1F201F" roughness={0.75} />
              </mesh>
              {/* Soft warm under-bed ambient glow strip */}
              <mesh position={[0, 0.02, 0.02]}>
                <boxGeometry args={[1.48, 0.015, 1.78]} />
                <meshStandardMaterial color="#FFE1B2" emissive="#FFCA80" emissiveIntensity={0.75} />
              </mesh>
              <pointLight position={[0, 0.06, 0.2]} color="#FFD6A0" intensity={0.28 * Math.max(0.4, lampMultiplier)} distance={2.4} decay={2} />
              {/* Ultra-slim floating cantilevered platform deck */}
              <mesh position={[0, 0.21, 0]} geometry={getRoundedBox(1.94, 0.075, 2.16, 0.018)} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} ref={bedPrimaryMatRef} color={c1} {...primaryPbrProps} />
              </mesh>
            </group>

            <group ref={bedHeadboardRef}>
              <mesh position={[0, 0.58, -1.03]} geometry={getRoundedBox(2.26, 0.68, 0.09, 0.028)} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
            </group>

            {renderSharedBedding(false)}
          </group>
        );
      }

      case 'bed-scandinavian': {
        return (
          <group>
            <group ref={bedFrameRef}>
              {/* Tapered splayed solid oak legs */}
              {[
                [-0.84, -0.96, 0.1, -0.08],
                [0.84, -0.96, 0.1, 0.08],
                [-0.84, 0.96, -0.1, -0.08],
                [0.84, 0.96, -0.1, 0.08],
              ].map(([lx, lz, rx, rz], i) => (
                <mesh key={i} position={[lx, 0.11, lz]} rotation={[rx, 0, rz]} castShadow>
                  <cylinderGeometry args={[0.028, 0.016, 0.24, 14]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              <mesh position={[0, 0.22, 0]} geometry={getRoundedBox(1.86, 0.1, 2.1, 0.028)} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} ref={bedPrimaryMatRef} color={c1} {...primaryPbrProps} />
              </mesh>
            </group>

            <group ref={bedHeadboardRef}>
              {[-0.86, 0.86].map((px, i) => (
                <mesh key={i} position={[px, 0.64, -1.0]} castShadow>
                  <cylinderGeometry args={[0.026, 0.028, 0.8, 14]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              <mesh position={[0, 1.02, -1.0]} geometry={getRoundedBox(1.8, 0.055, 0.05, 0.022)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              {Array.from({ length: 11 }).map((_, i) => (
                <mesh key={i} position={[-0.7 + i * 0.14, 0.65, -1.0]} castShadow>
                  <cylinderGeometry args={[0.011, 0.011, 0.72, 10]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
            </group>

            {renderSharedBedding(false)}
          </group>
        );
      }

      case 'bench-tufted-ottoman': {
        return (
          <group>
            {[
              [-0.68, -0.2, 0.18],
              [0.68, -0.2, -0.18],
              [-0.68, 0.2, 0.18],
              [0.68, 0.2, -0.18],
            ].map(([lx, lz, tilt], idx) => (
              <mesh key={idx} position={[lx, 0.11, lz]} rotation={[0, 0, tilt]} castShadow>
                <cylinderGeometry args={[0.012, 0.008, 0.24, 10]} />
                <meshStandardMaterial color={c2} roughness={0.22} metalness={0.9} />
              </mesh>
            ))}
            <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.56, 0.03, 0.5]} />
              <meshStandardMaterial color="#3A332C" roughness={0.5} envMapIntensity={0.3} />
            </mesh>
            <group ref={cushionSquishRef}>
              {Array.from({ length: 7 }).map((_, i) => (
                <mesh
                  key={i}
                  position={[-0.66 + i * 0.22, 0.315, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                  castShadow
                  receiveShadow
                >
                  <capsuleGeometry args={[0.105, 0.34, 8, 16]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
            </group>
          </group>
        );
      }

      case 'nightstand-wooden-bedside': {
        return (
          <group>
            {[
              [-0.22, -0.16],
              [0.22, -0.16],
              [-0.22, 0.16],
              [0.22, 0.16],
            ].map(([lx, lz], i) => (
              <mesh key={i} position={[lx, 0.09, lz]} castShadow>
                <cylinderGeometry args={[0.02, 0.013, 0.18, 12]} />
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
            ))}
            <mesh position={[0, 0.35, 0]} geometry={getRoundedBox(0.56, 0.34, 0.44, 0.025)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <group ref={nightstandDrawerRef}>
              <mesh position={[0, 0.43, 0.215]} geometry={getRoundedBox(0.5, 0.13, 0.025, 0.01)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.46, 0.232]} castShadow>
                <boxGeometry args={[0.14, 0.012, 0.016]} />
                <meshStandardMaterial color={c2} roughness={0.22} metalness={0.88} />
              </mesh>
            </group>
            <mesh position={[0, 0.27, 0.215]} geometry={getRoundedBox(0.5, 0.13, 0.025, 0.01)} castShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.3, 0.232]} castShadow>
              <boxGeometry args={[0.14, 0.012, 0.016]} />
              <meshStandardMaterial color={c2} roughness={0.22} metalness={0.88} />
            </mesh>
            {/* Bedside ceramic cup & book */}
            <mesh position={[-0.1, 0.535, 0.02]} rotation={[0, 0.16, 0]} castShadow>
              <boxGeometry args={[0.22, 0.028, 0.16]} />
              <meshStandardMaterial color="#3A3C39" roughness={0.62} />
            </mesh>
            <mesh position={[0.12, 0.56, -0.05]} castShadow>
              <cylinderGeometry args={[0.036, 0.044, 0.08, 16]} />
              <meshPhysicalMaterial color="#DDD6C9" map={ceramicMaps.map} normalMap={ceramicMaps.normalMap} roughness={0.35} clearcoat={0.3} />
            </mesh>
          </group>
        );
      }

      case 'nightstand-curved-lamp': {
        return (
          <group>
            <mesh position={[0, 0.25, 0]} geometry={getRoundedBox(0.6, 0.44, 0.46, 0.06)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <group ref={nightstandDrawerRef}>
              <mesh position={[0, 0.35, 0.22]} geometry={getRoundedBox(0.52, 0.16, 0.04, 0.012)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.35, 0.246]} castShadow>
                <boxGeometry args={[0.16, 0.014, 0.018]} />
                <meshStandardMaterial color="#C5A059" roughness={0.22} metalness={0.9} />
              </mesh>
            </group>
            <mesh position={[0, 0.16, 0.22]} geometry={getRoundedBox(0.52, 0.16, 0.03, 0.012)} castShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.16, 0.242]} castShadow>
              <boxGeometry args={[0.16, 0.014, 0.016]} />
              <meshStandardMaterial color="#C5A059" roughness={0.22} metalness={0.9} />
            </mesh>
            <mesh position={[0, 0.025, 0]} castShadow>
              <boxGeometry args={[0.52, 0.05, 0.38]} />
              <meshStandardMaterial color="#252422" roughness={0.62} envMapIntensity={0.2} />
            </mesh>
            <mesh position={[-0.12, 0.49, 0.05]} rotation={[0, 0.14, 0]} castShadow>
              <boxGeometry args={[0.24, 0.032, 0.2]} />
              <meshStandardMaterial color="#282928" roughness={0.5} envMapIntensity={0.25} />
            </mesh>
            <group position={[0.1, 0.47, -0.02]}>
              <mesh position={[0, 0.08, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.06, 0.16, 16]} />
                <meshStandardMaterial color="#C5A059" roughness={0.22} metalness={0.9} />
              </mesh>
              <mesh position={[0, 0.26, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.135, 0.22, 24]} />
                <meshStandardMaterial
                  ref={lampBulbMatRef}
                  color={c2}
                  emissive="#FFD89D"
                  emissiveIntensity={0.45 * lampMultiplier}
                  roughness={0.42}
                  transparent
                  opacity={0.94}
                />
              </mesh>
              <pointLight
                ref={lampLightRef}
                position={[0, 0.26, 0]}
                color="#FFD9A0"
                intensity={0.6 * lampMultiplier}
                distance={3.6}
                decay={2}
              />
            </group>
          </group>
        );
      }

      case 'wardrobe-sliding-modern': {
        return (
          <group>
            <mesh position={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[1.96, 0.08, 0.58]} />
              <meshStandardMaterial color="#252624" roughness={0.6} />
            </mesh>
            <mesh position={[0, 1.18, -0.04]} geometry={getRoundedBox(1.98, 2.22, 0.54, 0.02)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {/* Interior brass hanging rail visible when slid open */}
            <mesh position={[0, 1.72, 0.02]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 1.84, 12]} />
              <meshStandardMaterial color="#B89552" roughness={0.24} metalness={0.88} />
            </mesh>
            {/* Left Sliding Oak Slatted Door */}
            <group ref={slidingDoorLRef} position={[-0.49, 1.18, 0.245]}>
              <mesh geometry={getRoundedBox(0.98, 2.16, 0.028, 0.008)} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              {Array.from({ length: 8 }).map((_, s) => (
                <mesh key={s} position={[-0.41 + s * 0.115, 0, 0.016]} castShadow>
                  <boxGeometry args={[0.045, 2.1, 0.012]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              <mesh position={[0.44, 0, 0.024]}>
                <boxGeometry args={[0.02, 1.4, 0.018]} />
                <meshStandardMaterial color={c2} roughness={0.26} metalness={0.86} />
              </mesh>
            </group>
            {/* Right Sliding Smoked Mirror Door */}
            <group ref={slidingDoorRRef} position={[0.49, 1.18, 0.275]}>
              <mesh geometry={getRoundedBox(0.98, 2.16, 0.024, 0.008)} castShadow>
                <meshStandardMaterial color={c2} roughness={0.28} metalness={0.78} />
              </mesh>
              <mesh position={[0, 0, 0.014]}>
                <planeGeometry args={[0.9, 2.08]} />
                <meshPhysicalMaterial
                  color="#646C70"
                  roughness={0.05}
                  metalness={0.75}
                  clearcoat={1.0}
                  envMapIntensity={0.8}
                />
              </mesh>
            </group>
          </group>
        );
      }

      case 'wardrobe-glass-display': {
        return (
          <group>
            <mesh position={[0, 1.17, -0.12]} castShadow receiveShadow>
              <boxGeometry args={[1.44, 2.34, 0.34]} />
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {[0.45, 0.96, 1.48, 1.98].map((sy, i) => (
              <group key={i} position={[0, sy, -0.02]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[1.36, 0.028, 0.48]} />
                  <meshStandardMaterial color="#4A3F35" roughness={0.44} envMapIntensity={0.3} />
                </mesh>
                <mesh position={[0, -0.02, 0.15]}>
                  <boxGeometry args={[1.3, 0.01, 0.02]} />
                  <meshStandardMaterial
                    color="#FFE7C2"
                    emissive="#FFD596"
                    emissiveIntensity={0.55 * Math.max(0.4, lampMultiplier)}
                  />
                </mesh>
                <mesh position={[(i % 2 === 0 ? -0.35 : 0.32), 0, 0]} geometry={turnedVaseGeo} scale={0.62} castShadow>
                  <meshPhysicalMaterial color="#DDD6C8" roughness={0.35} clearcoat={0.35} />
                </mesh>
              </group>
            ))}
            <group ref={wardrobeDoorLRef} position={[-0.7, 1.17, 0.26]}>
              <group position={[0.35, 0, 0]}>
                <mesh>
                  <planeGeometry args={[0.68, 2.28]} />
                  <meshPhysicalMaterial color="#4D4238" roughness={0.08} transparent opacity={0.26} clearcoat={0.85} />
                </mesh>
                <mesh position={[0.33, 0, 0.01]}>
                  <boxGeometry args={[0.02, 2.3, 0.02]} />
                  <meshStandardMaterial color={c2} roughness={0.25} metalness={0.85} />
                </mesh>
              </group>
            </group>
            <group ref={wardrobeDoorRRef} position={[0.7, 1.17, 0.26]}>
              <group position={[-0.35, 0, 0]}>
                <mesh>
                  <planeGeometry args={[0.68, 2.28]} />
                  <meshPhysicalMaterial color="#4D4238" roughness={0.08} transparent opacity={0.26} clearcoat={0.85} />
                </mesh>
                <mesh position={[-0.33, 0, 0.01]}>
                  <boxGeometry args={[0.02, 2.3, 0.02]} />
                  <meshStandardMaterial color={c2} roughness={0.25} metalness={0.85} />
                </mesh>
              </group>
            </group>
          </group>
        );
      }

      case 'wardrobe-fluted-oak': {
        return (
          <group>
            <mesh position={[0, 1.07, -0.04]} geometry={getRoundedBox(1.48, 2.08, 0.52, 0.025)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[1.44, 0.08, 0.54]} />
              <meshStandardMaterial color="#2B2C2A" roughness={0.6} envMapIntensity={0.22} />
            </mesh>
            <group ref={wardrobeDoorLRef} position={[-0.73, 1.08, 0.25]}>
              <group position={[0.365, 0, 0]}>
                <mesh geometry={getRoundedBox(0.72, 1.98, 0.036, 0.01)} castShadow receiveShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
                {Array.from({ length: 6 }).map((_, i) => (
                  <mesh key={i} position={[-0.29 + i * 0.115, 0, 0.022]} castShadow>
                    <boxGeometry args={[0.042, 1.92, 0.014]} />
                    <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                  </mesh>
                ))}
                <mesh position={[0.3, 0, 0.035]} castShadow>
                  <boxGeometry args={[0.016, 0.42, 0.022]} />
                  <meshStandardMaterial color={c2} roughness={0.22} metalness={0.9} />
                </mesh>
              </group>
            </group>
            <group ref={wardrobeDoorRRef} position={[0.73, 1.08, 0.25]}>
              <group position={[-0.365, 0, 0]}>
                <mesh geometry={getRoundedBox(0.72, 1.98, 0.036, 0.01)} castShadow receiveShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
                {Array.from({ length: 6 }).map((_, i) => (
                  <mesh key={i} position={[-0.29 + i * 0.115, 0, 0.022]} castShadow>
                    <boxGeometry args={[0.042, 1.92, 0.014]} />
                    <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                  </mesh>
                ))}
                <mesh position={[-0.3, 0, 0.035]} castShadow>
                  <boxGeometry args={[0.016, 0.42, 0.022]} />
                  <meshStandardMaterial color={c2} roughness={0.22} metalness={0.9} />
                </mesh>
              </group>
            </group>
          </group>
        );
      }

      case 'cabinet-minimalist-low': {
        return (
          <group>
            {[
              [-0.68, -0.16],
              [0.68, -0.16],
              [-0.68, 0.16],
              [0.68, 0.16],
            ].map(([lx, lz], i) => (
              <mesh key={i} position={[lx, 0.09, lz]} castShadow>
                <cylinderGeometry args={[0.022, 0.014, 0.18, 12]} />
                <meshStandardMaterial color={c2} roughness={0.44} />
              </mesh>
            ))}
            <mesh position={[0, 0.41, -0.01]} geometry={getRoundedBox(1.56, 0.46, 0.42, 0.022)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <group ref={wardrobeDoorLRef} position={[-0.76, 0.41, 0.2]}>
              <group position={[0.25, 0, 0]}>
                <mesh geometry={getRoundedBox(0.49, 0.41, 0.024, 0.008)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              </group>
            </group>
            <mesh position={[0, 0.41, 0.2]} geometry={getRoundedBox(0.49, 0.41, 0.024, 0.008)} castShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <group ref={wardrobeDoorRRef} position={[0.76, 0.41, 0.2]}>
              <group position={[-0.25, 0, 0]}>
                <mesh geometry={getRoundedBox(0.49, 0.41, 0.024, 0.008)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              </group>
            </group>
            {/* Ceramic vessel & book */}
            <mesh position={[-0.45, 0.64, 0]} geometry={turnedVaseGeo} scale={0.75} castShadow>
              <meshPhysicalMaterial color="#D8CFC2" map={ceramicMaps.map} normalMap={ceramicMaps.normalMap} roughness={0.34} clearcoat={0.35} />
            </mesh>
            <mesh position={[0.38, 0.655, 0.02]} rotation={[0, -0.15, 0]} castShadow>
              <boxGeometry args={[0.28, 0.032, 0.2]} />
              <meshStandardMaterial color="#323532" roughness={0.62} />
            </mesh>
          </group>
        );
      }

      case 'cabinet-walnut-credenza': {
        return (
          <group>
            <mesh position={[0, 0.44, -0.02]} geometry={getRoundedBox(1.86, 0.52, 0.42, 0.03)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {[
              [-0.82, -0.16],
              [0.82, -0.16],
              [-0.82, 0.16],
              [0.82, 0.16],
            ].map(([lx, lz], i) => (
              <mesh key={i} position={[lx, 0.09, lz]} castShadow>
                <cylinderGeometry args={[0.02, 0.014, 0.18, 10]} />
                <meshStandardMaterial color="#262726" roughness={0.32} metalness={0.7} />
              </mesh>
            ))}
            <group ref={wardrobeDoorLRef} position={[-0.9, 0.44, 0.21]}>
              <group position={[0.44, 0, 0]}>
                <mesh geometry={getRoundedBox(0.87, 0.46, 0.028, 0.01)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
                <mesh position={[0.37, 0.02, 0.02]} castShadow>
                  <boxGeometry args={[0.015, 0.16, 0.02]} />
                  <meshStandardMaterial color={c2} roughness={0.22} metalness={0.9} />
                </mesh>
              </group>
            </group>
            <group ref={wardrobeDoorRRef} position={[0.9, 0.44, 0.21]}>
              <group position={[-0.44, 0, 0]}>
                <mesh geometry={getRoundedBox(0.87, 0.46, 0.028, 0.01)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
                <mesh position={[-0.37, 0.02, 0.02]} castShadow>
                  <boxGeometry args={[0.015, 0.16, 0.02]} />
                  <meshStandardMaterial color={c2} roughness={0.22} metalness={0.9} />
                </mesh>
              </group>
            </group>
            <mesh position={[-0.55, 0.7, 0]} geometry={turnedVaseGeo} scale={0.7} castShadow>
              <meshPhysicalMaterial color="#D8CFC2" roughness={0.38} clearcoat={0.3} />
            </mesh>
          </group>
        );
      }

      case 'sofa-curved-boucle': {
        return (
          <group>
            <mesh position={[0, 0.075, 0]} geometry={sofaBaseGeo} castShadow receiveShadow>
              <meshStandardMaterial color={c2} roughness={0.42} metalness={0.25} envMapIntensity={0.35} />
            </mesh>
            {/* Brushed brass perimeter trim strip */}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[2.18, 0.028, 0.84]} />
              <meshStandardMaterial color="#B89552" roughness={0.24} metalness={0.88} />
            </mesh>
            <group ref={cushionSquishRef}>
              {[-0.7, 0, 0.7].map((cx, i) => (
                <mesh
                  key={i}
                  position={[cx, 0.27, i === 1 ? 0.11 : 0.04]}
                  rotation={[0, i === 0 ? 0.08 : i === 2 ? -0.08 : 0, 0]}
                  geometry={sofaSeatGeo}
                  castShadow
                  receiveShadow
                >
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              <mesh position={[0, 0.54, -0.34]} geometry={sofaBackGeo} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              {[-1.06, 1.06].map((ax, i) => (
                <mesh key={i} position={[ax, 0.39, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
                  <capsuleGeometry args={[0.14, 0.38, 8, 16]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              <mesh position={[-0.78, 0.5, -0.14]} rotation={[0.28, 0.3, 0.12]} geometry={sculptedLumbarPillowGeo} scale={[0.56, 1.05, 0.78]} castShadow>
                <meshPhysicalMaterial color="#C8B8A2" map={velvetMaps.map} normalMap={velvetMaps.normalMap} roughness={0.9} sheen={0.7} />
              </mesh>
              <mesh position={[0.78, 0.5, -0.14]} rotation={[0.25, -0.32, -0.1]} geometry={sculptedLumbarPillowGeo} scale={[0.56, 1.05, 0.78]} castShadow>
                <meshPhysicalMaterial color="#5D6B53" map={velvetMaps.map} normalMap={velvetMaps.normalMap} roughness={0.9} sheen={0.75} />
              </mesh>
            </group>
          </group>
        );
      }

      case 'sofa-l-sectional': {
        return (
          <group>
            {/* Slim steel corner legs */}
            {[
              [-1.24, -0.7],
              [1.24, -0.7],
              [-1.24, 0.74],
              [-0.44, 0.74],
              [1.24, 0.1],
            ].map(([lx, lz], i) => (
              <mesh key={i} position={[lx, 0.055, lz]} castShadow>
                <cylinderGeometry args={[0.018, 0.012, 0.11, 10]} />
                <meshStandardMaterial color={c2} roughness={0.3} metalness={0.75} />
              </mesh>
            ))}
            <mesh position={[0, 0.14, -0.3]} geometry={getRoundedBox(2.68, 0.11, 0.98, 0.03)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} roughness={0.48} envMapIntensity={0.35} />
            </mesh>
            <mesh position={[-0.86, 0.14, 0.45]} geometry={getRoundedBox(0.94, 0.11, 0.74, 0.03)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} roughness={0.48} envMapIntensity={0.35} />
            </mesh>
            <group ref={cushionSquishRef}>
              {[-0.86, 0, 0.86].map((cx, i) => (
                <mesh
                  key={i}
                  position={[cx, 0.3, i === 0 ? 0.06 : -0.26]}
                  geometry={getRoundedBox(0.84, 0.22, i === 0 ? 1.56 : 0.88, 0.06)}
                  castShadow
                  receiveShadow
                >
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              {[-0.84, 0, 0.84].map((bx, i) => (
                <mesh
                  key={i}
                  position={[bx, 0.56, -0.66]}
                  geometry={getRoundedBox(0.84, 0.48, 0.22, 0.065)}
                  castShadow
                  receiveShadow
                >
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              <mesh position={[-1.25, 0.44, -0.24]} geometry={getRoundedBox(0.18, 0.44, 0.98, 0.05)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[1.25, 0.44, -0.24]} geometry={getRoundedBox(0.18, 0.44, 0.98, 0.05)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              {/* Layered throw pillows */}
              <mesh position={[-1.02, 0.5, -0.42]} rotation={[0.25, 0.35, 0.1]} geometry={sculptedLumbarPillowGeo} scale={[0.72, 1.05, 0.8]} castShadow>
                <meshPhysicalMaterial color="#5D6B53" map={velvetMaps.map} normalMap={velvetMaps.normalMap} roughness={0.9} sheen={0.72} />
              </mesh>
              <mesh position={[1.02, 0.5, -0.42]} rotation={[0.25, -0.35, -0.1]} geometry={sculptedLumbarPillowGeo} scale={[0.72, 1.05, 0.8]} castShadow>
                <meshPhysicalMaterial color="#B57B5E" map={linenMaps.map} normalMap={linenMaps.normalMap} roughness={0.92} />
              </mesh>
            </group>
          </group>
        );
      }

      case 'sofa-scandinavian': {
        return (
          <group>
            {/* Splayed solid oak legs */}
            {[
              [-0.96, -0.36, -0.1, -0.08],
              [0.96, -0.36, -0.1, 0.08],
              [-0.96, 0.36, 0.1, -0.08],
              [0.96, 0.36, 0.1, 0.08],
            ].map(([lx, lz, rx, rz], i) => (
              <mesh key={i} position={[lx, 0.11, lz]} rotation={[rx, 0, rz]} castShadow>
                <cylinderGeometry args={[0.024, 0.014, 0.22, 12]} />
                <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.52} />
              </mesh>
            ))}
            {/* Timber apron */}
            <mesh position={[0, 0.22, 0]} geometry={getRoundedBox(2.12, 0.06, 0.86, 0.02)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.5} />
            </mesh>
            <group ref={cushionSquishRef}>
              {[-0.64, 0, 0.64].map((cx, i) => (
                <group key={i}>
                  <mesh position={[cx, 0.32, 0.04]} geometry={getRoundedBox(0.62, 0.15, 0.78, 0.045)} castShadow receiveShadow>
                    <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                  </mesh>
                  <mesh position={[cx, 0.56, -0.32]} rotation={[-0.12, 0, 0]} geometry={getRoundedBox(0.62, 0.38, 0.16, 0.05)} castShadow>
                    <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                  </mesh>
                </group>
              ))}
              {[-1.0, 1.0].map((ax, i) => (
                <mesh key={i} position={[ax, 0.44, 0]} geometry={getRoundedBox(0.14, 0.38, 0.84, 0.04)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              {[-0.84, 0.84].map((bx, i) => (
                <mesh key={i} position={[bx, 0.46, -0.05]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <capsuleGeometry args={[0.065, 0.22, 6, 12]} />
                  <meshPhysicalMaterial color="#5D6B53" map={linenMaps.map} normalMap={linenMaps.normalMap} roughness={0.92} />
                </mesh>
              ))}
            </group>
          </group>
        );
      }

      case 'sofa-minimalist-twoseater': {
        return (
          <group>
            {/* Architectural sled steel frame */}
            {[-0.78, 0.78].map((sx, i) => (
              <group key={i} position={[sx, 0.1, 0]}>
                <mesh position={[0, -0.08, 0]}>
                  <boxGeometry args={[0.03, 0.025, 0.8]} />
                  <meshStandardMaterial color={c2} roughness={0.28} metalness={0.8} />
                </mesh>
                <mesh position={[0, 0, -0.38]} castShadow>
                  <boxGeometry args={[0.03, 0.18, 0.03]} />
                  <meshStandardMaterial color={c2} roughness={0.28} metalness={0.8} />
                </mesh>
                <mesh position={[0, 0, 0.38]} castShadow>
                  <boxGeometry args={[0.03, 0.18, 0.03]} />
                  <meshStandardMaterial color={c2} roughness={0.28} metalness={0.8} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0.21, 0]} geometry={getRoundedBox(1.66, 0.06, 0.82, 0.02)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} roughness={0.35} metalness={0.6} />
            </mesh>
            <group ref={cushionSquishRef}>
              {[-0.38, 0.38].map((cx, i) => (
                <mesh key={i} position={[cx, 0.31, 0.04]} geometry={getRoundedBox(0.74, 0.15, 0.74, 0.045)} castShadow receiveShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
              <mesh position={[0, 0.52, -0.32]} geometry={getRoundedBox(1.56, 0.38, 0.16, 0.045)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              {[-0.78, 0.78].map((ax, i) => (
                <mesh key={i} position={[ax, 0.43, 0]} geometry={getRoundedBox(0.12, 0.36, 0.82, 0.035)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
            </group>
          </group>
        );
      }

      case 'chair-curved-boucle': {
        return (
          <group>
            <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.34, 0.36, 0.12, 28]} />
              <meshStandardMaterial color="#3A342E" roughness={0.5} envMapIntensity={0.3} />
            </mesh>
            <group ref={cushionSquishRef}>
              <mesh position={[0, 0.24, 0.04]} castShadow receiveShadow>
                <cylinderGeometry args={[0.36, 0.34, 0.26, 28]} />
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.44, -0.02]} castShadow receiveShadow>
                <cylinderGeometry args={[0.39, 0.37, 0.46, 28, 1, false, Math.PI * 0.65, Math.PI * 1.7]} />
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0.08, 0.42, -0.06]} rotation={[0.3, -0.25, 0.1]} geometry={sculptedLumbarPillowGeo} scale={[0.55, 0.8, 0.7]} castShadow>
                <meshPhysicalMaterial color="#D8CFC0" map={linenMaps.map} normalMap={linenMaps.normalMap} roughness={0.93} />
              </mesh>
            </group>
          </group>
        );
      }

      case 'bed-kids-bunk': {
        return (
          <group>
            {[
              [-0.56, -0.96],
              [0.56, -0.96],
              [-0.56, 0.96],
              [0.56, 0.96],
            ].map(([lx, lz], i) => (
              <mesh key={i} position={[lx, 0.85, lz]} castShadow>
                <cylinderGeometry args={[0.036, 0.036, 1.7, 12]} />
                <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.005} roughness={0.5} />
              </mesh>
            ))}
            {[0.28, 1.24].map((by, idx) => (
              <group key={idx} position={[0, by, 0]}>
                <mesh geometry={getRoundedBox(1.16, 0.12, 1.98, 0.03)} castShadow receiveShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c2} {...primaryPbrProps} />
                </mesh>
                <mesh position={[0, 0.12, 0]} geometry={getRoundedBox(1.06, 0.16, 1.88, 0.05)} castShadow receiveShadow>
                  <meshStandardMaterial color={idx === 0 ? c1 : '#9DB098'} roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.24, -0.68]} geometry={sculptedLargePillowGeo} scale={[0.78, 0.72, 0.72]} castShadow>
                  <meshStandardMaterial color="#E6E0D4" roughness={0.92} />
                </mesh>
              </group>
            ))}
            <mesh position={[0.56, 1.54, 0]} castShadow>
              <boxGeometry args={[0.03, 0.06, 1.5]} />
              <meshStandardMaterial color={c2} roughness={0.5} />
            </mesh>
            {[-0.18, 0.18].map((rx, i) => (
              <mesh key={i} position={[0.64, 0.72, rx + 0.52]} rotation={[0, 0, -0.14]} castShadow>
                <cylinderGeometry args={[0.018, 0.018, 1.42, 8]} />
                <meshStandardMaterial color={c2} roughness={0.5} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'sofa-kids-beanbag': {
        return (
          <group ref={cushionSquishRef}>
            <mesh position={[0, 0.3, 0]} scale={[1, 0.78, 1]} castShadow receiveShadow>
              <sphereGeometry args={[0.45, 24, 20]} />
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.56, -0.18]} rotation={[-0.25, 0, 0]} castShadow>
              <sphereGeometry args={[0.26, 18, 16]} />
              <meshStandardMaterial color={c2} roughness={0.94} envMapIntensity={0.22} />
            </mesh>
          </group>
        );
      }

      case 'chair-rattan-lounge': {
        return (
          <group>
            {[-0.33, 0.33].map((lx, i) => (
              <group key={i} position={[lx, 0, 0]}>
                <mesh position={[0, 0.26, 0.28]} castShadow>
                  <cylinderGeometry args={[0.024, 0.018, 0.52, 12]} />
                  <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.5} envMapIntensity={0.35} />
                </mesh>
                <mesh position={[0, 0.24, -0.28]} rotation={[0.15, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.024, 0.018, 0.5, 12]} />
                  <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.5} envMapIntensity={0.35} />
                </mesh>
                <mesh position={[0, 0.54, 0]} geometry={getRoundedBox(0.058, 0.04, 0.64, 0.018)} castShadow>
                  <meshStandardMaterial color={c2} roughness={0.48} envMapIntensity={0.35} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0.28, 0]} geometry={getRoundedBox(0.64, 0.06, 0.62, 0.02)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} roughness={0.52} envMapIntensity={0.35} />
            </mesh>
            {/* Woven cane backrest slats */}
            <mesh position={[0, 0.58, -0.26]} rotation={[-0.22, 0, 0]} geometry={getRoundedBox(0.62, 0.42, 0.036, 0.015)} castShadow>
              <meshStandardMaterial color="#B59164" bumpMap={linenTex} bumpScale={0.014} roughness={0.78} envMapIntensity={0.28} />
            </mesh>
            <group ref={cushionSquishRef}>
              <mesh position={[0, 0.37, 0.02]} geometry={getRoundedBox(0.6, 0.14, 0.58, 0.045)} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.55, -0.18]} rotation={[-0.22, 0, 0]} geometry={getRoundedBox(0.56, 0.34, 0.11, 0.04)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
            </group>
          </group>
        );
      }

      case 'chair-dining-bentwood': {
        return (
          <group ref={chairSlideRef}>
            {[
              [-0.2, -0.2],
              [0.2, -0.2],
              [-0.2, 0.2],
              [0.2, 0.2],
            ].map(([lx, lz], i) => (
              <mesh key={i} position={[lx, 0.22, lz]} castShadow>
                <cylinderGeometry args={[0.018, 0.012, 0.44, 10]} />
                <meshStandardMaterial color={c2} roughness={0.45} />
              </mesh>
            ))}
            <mesh position={[0, 0.45, 0]} geometry={getRoundedBox(0.46, 0.055, 0.46, 0.022)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {[-0.19, 0.19].map((bx, i) => (
              <mesh key={i} position={[bx, 0.62, -0.21]} rotation={[-0.08, 0, 0]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.36, 10]} />
                <meshStandardMaterial color={c2} roughness={0.45} />
              </mesh>
            ))}
            <mesh position={[0, 0.76, -0.23]} geometry={getRoundedBox(0.46, 0.12, 0.045, 0.018)} castShadow>
              <meshStandardMaterial color={c2} roughness={0.45} />
            </mesh>
          </group>
        );
      }

      case 'chair-studio-task': {
        return (
          <group>
            {[0, 1, 2, 3, 4].map((idx) => {
              const ang = (idx / 5) * Math.PI * 2;
              return (
                <mesh
                  key={idx}
                  position={[Math.cos(ang) * 0.14, 0.04, Math.sin(ang) * 0.14]}
                  rotation={[0, -ang, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.28, 0.03, 0.035]} />
                  <meshStandardMaterial color={c2} roughness={0.3} metalness={0.78} />
                </mesh>
              );
            })}
            <mesh position={[0, 0.24, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.032, 0.38, 12]} />
              <meshStandardMaterial color="#252625" roughness={0.28} metalness={0.82} />
            </mesh>
            <mesh position={[0, 0.45, 0]} geometry={getRoundedBox(0.5, 0.09, 0.48, 0.035)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.74, -0.21]} rotation={[-0.08, 0, 0]} geometry={getRoundedBox(0.46, 0.52, 0.06, 0.025)} castShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {[-0.27, 0.27].map((ax, i) => (
              <mesh key={i} position={[ax, 0.58, 0]} geometry={getRoundedBox(0.04, 0.03, 0.28, 0.012)} castShadow>
                <meshStandardMaterial color="#252625" roughness={0.42} />
              </mesh>
            ))}
          </group>
        );
      }

      case 'chair-bar-stool': {
        return (
          <group ref={stoolSpinRef}>
            {[
              [-0.17, -0.17],
              [0.17, -0.17],
              [-0.17, 0.17],
              [0.17, 0.17],
            ].map(([lx, lz], i) => (
              <mesh key={i} position={[lx, 0.36, lz]} castShadow>
                <cylinderGeometry args={[0.014, 0.011, 0.72, 10]} />
                <meshStandardMaterial color={c2} roughness={0.35} metalness={0.75} />
              </mesh>
            ))}
            <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.2, 0.01, 10, 28]} />
              <meshStandardMaterial color={c2} roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.19, 0.18, 0.075, 24]} />
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
          </group>
        );
      }

      case 'chair-cinema-recliner': {
        return (
          <group>
            <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.84, 0.1, 0.86]} />
              <meshStandardMaterial color="#181818" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.28, 0.02]} geometry={getRoundedBox(0.62, 0.22, 0.74, 0.06)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {[-0.37, 0.37].map((ax, i) => (
              <mesh key={i} position={[ax, 0.42, 0]} geometry={getRoundedBox(0.16, 0.48, 0.84, 0.04)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
            ))}
            <group ref={reclinerBackRef} position={[0, 0.36, -0.3]}>
              <mesh position={[0, 0.34, 0]} geometry={getRoundedBox(0.6, 0.68, 0.2, 0.06)} castShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.7, 0.02]} geometry={getRoundedBox(0.48, 0.18, 0.16, 0.05)} castShadow>
                <meshStandardMaterial color={c2} roughness={0.52} />
              </mesh>
            </group>
            <mesh ref={reclinerFootRef} position={[0, 0.22, 0.44]} geometry={getRoundedBox(0.56, 0.1, 0.38, 0.035)} castShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
          </group>
        );
      }

      case 'table-marble-coffee': {
        return (
          <group>
            {/* Crossed architectural timber plinth */}
            <mesh position={[0, 0.14, 0]} geometry={getRoundedBox(0.66, 0.28, 0.2, 0.02)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.14, 0]} geometry={getRoundedBox(0.2, 0.28, 0.66, 0.02)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.5} />
            </mesh>
            {/* Thick honed marble slab */}
            <mesh position={[0, 0.315, 0]} geometry={getRoundedBox(1.14, 0.07, 1.14, 0.022)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {/* Curated coffee-table art books & ceramic bowl */}
            <mesh position={[-0.24, 0.368, 0.16]} rotation={[0, 0.12, 0]} castShadow>
              <boxGeometry args={[0.3, 0.034, 0.23]} />
              <meshStandardMaterial color="#383A37" roughness={0.65} />
            </mesh>
            <mesh position={[-0.24, 0.398, 0.16]} rotation={[0, 0.04, 0]} castShadow>
              <boxGeometry args={[0.26, 0.026, 0.2]} />
              <meshStandardMaterial color="#D6CFC2" roughness={0.72} />
            </mesh>
            <mesh position={[0.22, 0.375, -0.14]} castShadow>
              <cylinderGeometry args={[0.13, 0.08, 0.055, 22]} />
              <meshPhysicalMaterial color="#5D6B53" roughness={0.35} clearcoat={0.3} />
            </mesh>
          </group>
        );
      }

      case 'table-travertine-coffee': {
        return (
          <group>
            <mesh position={[0, 0.35, 0]} geometry={coffeeTopGeo} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {[-0.38, 0.38].map((px, i) => (
              <mesh key={i} position={[px, 0.165, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.14, 0.17, 0.33, 24]} />
                <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.5} />
              </mesh>
            ))}
            <mesh position={[-0.22, 0.395, 0.05]} rotation={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[0.28, 0.032, 0.22]} />
              <meshStandardMaterial color="#E5DED2" roughness={0.7} />
            </mesh>
            <mesh position={[0.24, 0.41, -0.04]} castShadow>
              <cylinderGeometry args={[0.1, 0.06, 0.07, 18]} />
              <meshStandardMaterial color="#5D6B53" roughness={0.42} />
            </mesh>
          </group>
        );
      }

      case 'table-curved-designer': {
        return (
          <group>
            {[
              [-0.42, -0.06],
              [0.36, 0.16],
              [0.14, -0.22],
            ].map(([px, pz], i) => (
              <mesh key={i} position={[px, 0.19, pz]} castShadow receiveShadow>
                <cylinderGeometry args={[0.07, 0.105, 0.38, 22]} />
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
            ))}
            <mesh position={[0, 0.395, 0]} geometry={kidneyTopGeo} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[-0.14, 0.43, 0.02]} geometry={turnedVaseGeo} scale={0.55} castShadow>
              <meshPhysicalMaterial color={c2} roughness={0.34} clearcoat={0.38} />
            </mesh>
          </group>
        );
      }

      case 'table-dining-oak': {
        return (
          <group>
            <mesh position={[0, 0.73, 0]} geometry={diningTopGeo} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {[-0.72, 0.72].map((px, i) => (
              <mesh key={i} position={[px, 0.35, 0]} geometry={getRoundedBox(0.14, 0.7, 0.66, 0.025)} castShadow receiveShadow>
                <meshStandardMaterial color={c2} roughness={0.52} />
              </mesh>
            ))}
            <mesh position={[0, 0.22, 0]} castShadow>
              <boxGeometry args={[1.45, 0.05, 0.08]} />
              <meshStandardMaterial color={c2} roughness={0.52} />
            </mesh>
            {[-0.68, 0, 0.68].map((px) =>
              [-0.3, 0.3].map((pz) => (
                <mesh key={`${px}-${pz}`} position={[px, 0.768, pz]} castShadow>
                  <cylinderGeometry args={[0.12, 0.1, 0.015, 20]} />
                  <meshStandardMaterial color="#E6E1D8" roughness={0.3} />
                </mesh>
              )),
            )}
            <mesh position={[0, 0.76, 0]} geometry={turnedVaseGeo} scale={0.62} castShadow>
              <meshPhysicalMaterial color="#5D6B53" roughness={0.36} clearcoat={0.3} />
            </mesh>
            {[-0.22, 0.22].map((cx, idx) => (
              <group key={idx} position={[cx, 0.79, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.022, 0.024, 0.07, 12]} />
                  <meshStandardMaterial color="#ECE6DC" roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.052, 0]}>
                  <sphereGeometry args={[0.014, 8, 8]} />
                  <meshStandardMaterial color="#FFCE73" emissive="#FF9E3D" emissiveIntensity={isNight ? 1.8 : 0.85} />
                </mesh>
              </group>
            ))}
          </group>
        );
      }

      case 'table-studio-desk':
      case 'table-sitstand-desk':
      case 'table-gaming-desk': {
        const isGaming = instance.catalogId === 'table-gaming-desk';
        const isSitStand = instance.catalogId === 'table-sitstand-desk';
        return (
          <group>
            {[-0.74, 0.74].map((lx, i) => (
              <group key={i} position={[lx, 0.36, 0]}>
                <mesh position={[0, 0, -0.3]} castShadow>
                  <boxGeometry args={[0.045, 0.72, 0.045]} />
                  <meshStandardMaterial color={c2} roughness={0.32} metalness={0.65} />
                </mesh>
                <mesh position={[0, 0, 0.3]} castShadow>
                  <boxGeometry args={[0.045, 0.72, 0.045]} />
                  <meshStandardMaterial color={c2} roughness={0.32} metalness={0.65} />
                </mesh>
                <mesh position={[0, -0.34, 0]} castShadow>
                  <boxGeometry args={[0.05, 0.04, 0.66]} />
                  <meshStandardMaterial color={c2} roughness={0.32} metalness={0.65} />
                </mesh>
              </group>
            ))}
            <group ref={isSitStand ? deskLiftRef : undefined}>
              <mesh position={[0, 0.73, 0]} geometry={deskTopGeo} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.758, 0.12]} receiveShadow>
                <boxGeometry args={[0.84, 0.006, 0.36]} />
                <meshStandardMaterial color="#2D2F2D" roughness={0.85} />
              </mesh>
              <mesh position={[-0.08, 0.768, 0.12]} geometry={getRoundedBox(0.32, 0.014, 0.11, 0.004)}>
                <meshStandardMaterial color="#1F201F" roughness={0.45} />
              </mesh>
              <mesh position={[-0.58, 0.79, 0.12]} castShadow>
                <cylinderGeometry args={[0.035, 0.032, 0.07, 16]} />
                <meshStandardMaterial color="#DCD5C8" roughness={0.38} />
              </mesh>
              {(isGaming ? [-0.34, 0.34] : [0]).map((mx, i) => (
                <group
                  key={i}
                  position={[mx, 0.75, -0.22]}
                  rotation={[0, isGaming ? (mx < 0 ? 0.14 : -0.14) : 0, 0]}
                >
                  <mesh position={[0, 0.14, -0.02]} castShadow>
                    <boxGeometry args={[0.04, 0.28, 0.04]} />
                    <meshStandardMaterial color="#232423" roughness={0.32} metalness={0.65} />
                  </mesh>
                  <mesh position={[0, 0.31, 0.02]} geometry={getRoundedBox(isGaming ? 0.62 : 0.74, 0.38, 0.026, 0.01)} castShadow>
                    <meshStandardMaterial color="#1A1B1A" roughness={0.28} metalness={0.5} />
                  </mesh>
                  <mesh position={[0, 0.31, 0.035]}>
                    <planeGeometry args={[isGaming ? 0.59 : 0.7, 0.35]} />
                    <meshStandardMaterial
                      color={isGaming ? '#24352C' : '#DBD6CC'}
                      emissive={isGaming ? (activeState ? '#5D8B6F' : '#32483C') : '#BEB8AA'}
                      emissiveIntensity={0.45}
                      roughness={0.2}
                    />
                  </mesh>
                </group>
              ))}
              {isGaming && (
                <group position={[0.66, 0.94, -0.16]}>
                  <mesh geometry={getRoundedBox(0.22, 0.38, 0.38, 0.02)} castShadow>
                    <meshStandardMaterial color="#1D1F1E" roughness={0.3} metalness={0.5} />
                  </mesh>
                  {[0.08, -0.06].map((fy, idx) => (
                    <mesh
                      key={idx}
                      ref={(el) => {
                        fanRefs.current[idx] = el;
                      }}
                      position={[0, fy, 0.195]}
                    >
                      <torusGeometry args={[0.05, 0.01, 8, 12]} />
                      <meshStandardMaterial
                        color={activeState ? '#7BA888' : '#5D6B53'}
                        emissive={activeState ? '#7BA888' : '#3C4736'}
                        emissiveIntensity={activeState ? 1.2 : 0.4}
                      />
                    </mesh>
                  ))}
                  <mesh position={[0, -0.22, -0.22]}>
                    <boxGeometry args={[1.6, 0.015, 0.02]} />
                    <meshStandardMaterial
                      color="#7BA888"
                      emissive={activeState ? '#8BB996' : '#5D6B53'}
                      emissiveIntensity={activeState ? 1.3 : 0.5}
                    />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        );
      }

      case 'shelf-architectural-bookcase': {
        const bookPalette = ['#DED7C9', '#5D6B53', '#C8B8A2', '#8B6849', '#323533'];
        return (
          <group>
            {[-0.64, 0.64].map((ux, i) => (
              <group key={i} position={[ux, 1.02, 0]}>
                <mesh position={[0, 0, -0.16]} castShadow>
                  <boxGeometry args={[0.03, 2.04, 0.03]} />
                  <meshStandardMaterial color={c2} roughness={0.32} metalness={0.65} />
                </mesh>
                <mesh position={[0, 0, 0.16]} castShadow>
                  <boxGeometry args={[0.03, 2.04, 0.03]} />
                  <meshStandardMaterial color={c2} roughness={0.32} metalness={0.65} />
                </mesh>
              </group>
            ))}
            {[0.12, 0.56, 1.0, 1.44, 1.88].map((sy, idx) => (
              <group key={idx} position={[0, sy, 0]}>
                <mesh geometry={getRoundedBox(1.32, 0.032, 0.36, 0.01)} castShadow receiveShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
                <group position={[-0.4, 0.14, 0]}>
                  {[0, 1, 2, 3, 4].map((b) => (
                    <mesh key={b} position={[b * 0.048, 0, 0]} castShadow>
                      <boxGeometry args={[0.036, 0.24 - ((b + idx) % 3) * 0.03, 0.18]} />
                      <meshStandardMaterial color={bookPalette[(b + idx) % bookPalette.length]} roughness={0.78} />
                    </mesh>
                  ))}
                </group>
              </group>
            ))}
          </group>
        );
      }

      case 'lamp-brass-arc': {
        return (
          <group>
            {/* Weighted honed marble base */}
            <mesh position={[0, 0.035, -0.14]} castShadow receiveShadow>
              <cylinderGeometry args={[0.18, 0.2, 0.07, 26]} />
              <meshPhysicalMaterial color="#DBD4C6" roughness={0.28} clearcoat={0.45} envMapIntensity={0.34} />
            </mesh>
            {/* Smooth continuous parabolic brushed brass arc tube */}
            <mesh geometry={arcLampTubeGeo} castShadow>
              <meshStandardMaterial color={c1} roughness={0.22} metalness={0.9} envMapIntensity={0.65} />
            </mesh>
            <mesh position={[0, 1.66, 0.58]} castShadow>
              <cylinderGeometry args={[0.17, 0.22, 0.27, 26, 1, true]} />
              <meshPhysicalMaterial color={c2} map={linenMaps.map} normalMap={linenMaps.normalMap} roughness={0.92} sheen={0.25} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 1.66, 0.58]}>
              <sphereGeometry args={[0.05, 14, 14]} />
              <meshStandardMaterial ref={lampBulbMatRef} color="#FFF3D6" emissive="#FFD89A" emissiveIntensity={0.85 * lampMultiplier} />
            </mesh>
            <pointLight ref={lampLightRef} position={[0, 1.54, 0.58]} color="#FFD9A0" intensity={0.88 * lampMultiplier} distance={5.2} decay={2} />
          </group>
        );
      }

      case 'lamp-ceramic-table': {
        const lampOn = activeState || lampMultiplier > 0.25;
        return (
          <group>
            {/* Sculpted LatheGeometry stoneware amphora lamp base */}
            <mesh geometry={lampBaseLatheGeo} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.295, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.022, 0.04, 14]} />
              <meshStandardMaterial color="#B89552" roughness={0.24} metalness={0.88} />
            </mesh>
            <mesh position={[0, 0.4, 0]} castShadow>
              <cylinderGeometry args={[0.125, 0.175, 0.22, 24, 1, true]} />
              <meshPhysicalMaterial color={c2} map={linenMaps.map} normalMap={linenMaps.normalMap} roughness={0.9} sheen={0.25} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.37, 0]}>
              <sphereGeometry args={[0.038, 12, 12]} />
              <meshStandardMaterial ref={lampBulbMatRef} color="#FFF3D6" emissive="#FFD89A" emissiveIntensity={lampOn ? 0.95 * Math.max(0.55, lampMultiplier) : 0.08} />
            </mesh>
            <pointLight ref={lampLightRef} position={[0, 0.35, 0]} color="#FFD9A0" intensity={lampOn ? 0.68 * Math.max(0.45, lampMultiplier) : 0} distance={3.6} decay={2} />
          </group>
        );
      }

      case 'plant-areca-palm':
      case 'plant-fiddle-fig':
      case 'plant-olive-tree': {
        const isPalm = instance.catalogId === 'plant-areca-palm';
        const isOlive = instance.catalogId === 'plant-olive-tree';
        return (
          <group>
            {/* Flared stoneware planter with lip */}
            <mesh position={[0, 0.21, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.22, 0.15, 0.42, 24]} />
              <meshPhysicalMaterial color={c2} map={ceramicMaps.map} normalMap={ceramicMaps.normalMap} roughness={0.58} />
            </mesh>
            <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.215, 0.015, 8, 24]} />
              <meshStandardMaterial color={c2} roughness={0.58} />
            </mesh>
            <mesh position={[0, 0.405, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.03, 18]} />
              <meshStandardMaterial color="#362A20" roughness={0.95} />
            </mesh>
            <group ref={foliageRef}>
              {isPalm ? (
                Array.from({ length: 10 }).map((_, idx) => {
                  const ang = (idx / 10) * Math.PI * 2 + (idx % 2) * 0.22;
                  const tilt = 0.28 + (idx % 3) * 0.18;
                  return (
                    <group key={idx} position={[0, 0.42, 0]} rotation={[0, ang, 0]}>
                      <mesh position={[0, 0.36, 0.06]} rotation={[tilt, 0, 0]} castShadow>
                        <cylinderGeometry args={[0.004, 0.012, 0.72, 6]} />
                        <meshStandardMaterial color="#596E47" roughness={0.78} />
                      </mesh>
                      {[0.24, 0.38, 0.52, 0.64].map((ly, li) => (
                        <group key={li} position={[0, ly, Math.sin(tilt) * ly]} rotation={[tilt + li * 0.14, 0, 0]}>
                          <mesh geometry={palmBladeGeo} position={[-0.01, 0, 0]} rotation={[0.45, 0.55, 0.35]} scale={0.7 - li * 0.08} castShadow>
                            <meshStandardMaterial color={c1} roughness={0.72} side={THREE.DoubleSide} />
                          </mesh>
                          <mesh geometry={palmBladeGeo} position={[0.01, 0, 0]} rotation={[0.45, -0.55, -0.35]} scale={0.7 - li * 0.08} castShadow>
                            <meshStandardMaterial color={c1} roughness={0.72} side={THREE.DoubleSide} />
                          </mesh>
                        </group>
                      ))}
                    </group>
                  );
                })
              ) : (
                <>
                  {/* Main sculpted trunk + 3 natural forks */}
                  <mesh position={[0, 0.78, 0]} castShadow>
                    <cylinderGeometry args={[0.018, 0.036, 0.76, 10]} />
                    <meshStandardMaterial color="#6A513B" roughness={0.88} />
                  </mesh>
                  {[
                    [0.09, 1.08, 0.05, 0.38, 0.28],
                    [-0.1, 1.14, -0.04, -0.42, -0.32],
                    [0.02, 1.24, -0.08, -0.25, 0.22],
                  ].map(([bx, by, bz, rx, rz], bi) => (
                    <group key={bi}>
                      <mesh position={[bx * 0.5, by - 0.16, bz * 0.5]} rotation={[rx, 0, rz]} castShadow>
                        <cylinderGeometry args={[0.008, 0.015, 0.42, 8]} />
                        <meshStandardMaterial color="#6A513B" roughness={0.88} />
                      </mesh>
                      {Array.from({ length: isOlive ? 10 : 7 }).map((_, li) => {
                        const la = (li / (isOlive ? 10 : 7)) * Math.PI * 2;
                        return (
                          <mesh
                            key={li}
                            geometry={broadLeafGeo}
                            position={[bx + Math.cos(la) * 0.07, by + (li % 3) * 0.08, bz + Math.sin(la) * 0.07]}
                            rotation={[0.6 + (li % 3) * 0.25, la, 0.2]}
                            scale={isOlive ? [0.55, 0.78, 0.7] : [1.05, 1.05, 1]}
                            castShadow
                          >
                            <meshStandardMaterial color={c1} roughness={isOlive ? 0.8 : 0.64} side={THREE.DoubleSide} />
                          </mesh>
                        );
                      })}
                    </group>
                  ))}
                </>
              )}
            </group>
          </group>
        );
      }

      case 'rug-woven-wool':
      case 'rug-jute-runner': {
        const w = catalog?.width ?? 2.8;
        const d = catalog?.depth ?? 2.0;
        const fringeCount = 14;
        return (
          <group ref={rugUnrollRef} position={[0, 0.012, 0]}>
            <mesh geometry={getRoundedBox(w, 0.018, d, 0.008)} receiveShadow>
              <meshPhysicalMaterial
                color={c1}
                bumpMap={rugTex}
                bumpScale={0.014}
                roughness={0.96}
                sheen={0.28}
                envMapIntensity={0.16}
                polygonOffset
                polygonOffsetFactor={-1}
              />
            </mesh>
            <mesh position={[0, 0.002, 0]} geometry={getRoundedBox(w - 0.18, 0.017, d - 0.18, 0.008)} receiveShadow>
              <meshPhysicalMaterial
                color={c2}
                bumpMap={rugTex}
                bumpScale={0.012}
                roughness={0.96}
                sheen={0.25}
                envMapIntensity={0.16}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
            {/* Braided fringe tassels on both ends */}
            {[-w / 2 - 0.045, w / 2 + 0.045].map((fx, side) =>
              Array.from({ length: fringeCount }).map((_, f) => (
                <mesh
                  key={`${side}-${f}`}
                  position={[fx, -0.002, -d * 0.44 + (f / (fringeCount - 1)) * d * 0.88]}
                >
                  <boxGeometry args={[0.08, 0.005, 0.014]} />
                  <meshStandardMaterial color="#DCD5C7" roughness={0.95} />
                </mesh>
              )),
            )}
          </group>
        );
      }

      case 'curtain-linen-drapes': {
        return (
          <group>
            <mesh position={[0, 2.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.015, 0.015, 2.25, 12]} />
              <meshStandardMaterial color={c2} roughness={0.32} metalness={0.75} />
            </mesh>
            {[-1.14, 1.14].map((fx, i) => (
              <mesh key={i} position={[fx, 2.42, 0]}>
                <sphereGeometry args={[0.028, 12, 12]} />
                <meshStandardMaterial color={c2} roughness={0.28} metalness={0.82} />
              </mesh>
            ))}
            <group ref={curtainLeftPanelRef} position={[-0.78, 1.2, 0]}>
              {[0, 1, 2, 3, 4].map((p) => (
                <mesh key={p} position={[(p - 2) * 0.072, 0, Math.sin(p) * 0.022]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.042, 0.048, 2.38, 10]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
            </group>
            <group ref={curtainRightPanelRef} position={[0.78, 1.2, 0]}>
              {[0, 1, 2, 3, 4].map((p) => (
                <mesh key={p} position={[(p - 2) * 0.072, 0, Math.sin(p) * 0.022]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.042, 0.048, 2.38, 10]} />
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              ))}
            </group>
          </group>
        );
      }

      case 'art-landscape-painting': {
        return (
          <group>
            {/* Outer timber shadow-box frame */}
            <mesh position={[0, 0.42, 0]} geometry={getRoundedBox(1.18, 0.045, 0.055, 0.008)} castShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.48} />
            </mesh>
            <mesh position={[0, -0.42, 0]} geometry={getRoundedBox(1.18, 0.045, 0.055, 0.008)} castShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.48} />
            </mesh>
            <mesh position={[-0.568, 0, 0]} geometry={getRoundedBox(0.045, 0.88, 0.055, 0.008)} castShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.48} />
            </mesh>
            <mesh position={[0.568, 0, 0]} geometry={getRoundedBox(0.045, 0.88, 0.055, 0.008)} castShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.48} />
            </mesh>
            {/* Mat board & painted canvas */}
            <mesh position={[0, 0, -0.008]}>
              <planeGeometry args={[1.09, 0.8]} />
              <meshStandardMaterial color={c1} roughness={0.92} />
            </mesh>
            <mesh position={[0, 0, 0.006]}>
              <planeGeometry args={[0.92, 0.66]} />
              <meshStandardMaterial map={paintingTex} roughness={0.86} envMapIntensity={0.2} />
            </mesh>
          </group>
        );
      }

      case 'art-plaster-triptych': {
        return (
          <group>
            <mesh geometry={getRoundedBox(1.16, 0.88, 0.045, 0.012)} castShadow>
              <meshStandardMaterial color={c2} roughness={0.5} envMapIntensity={0.32} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <boxGeometry args={[1.06, 0.78, 0.012]} />
              <meshStandardMaterial color={c1} roughness={0.92} envMapIntensity={0.22} />
            </mesh>
            <mesh position={[-0.22, 0.06, 0.036]}>
              <boxGeometry args={[0.36, 0.46, 0.015]} />
              <meshStandardMaterial color="#D8CFC0" roughness={0.92} envMapIntensity={0.22} />
            </mesh>
            <mesh position={[0.24, -0.08, 0.036]}>
              <boxGeometry args={[0.32, 0.34, 0.015]} />
              <meshStandardMaterial color="#6D7A62" roughness={0.9} envMapIntensity={0.24} />
            </mesh>
          </group>
        );
      }

      case 'art-brass-mirror': {
        return (
          <group>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.46, 0.46, 0.035, 36]} />
              <meshStandardMaterial color={c1} roughness={0.2} metalness={0.92} />
            </mesh>
            <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.43, 0.43, 0.01, 36]} />
              <meshPhysicalMaterial color="#D6DFE4" roughness={0.04} metalness={0.94} clearcoat={1.0} />
            </mesh>
          </group>
        );
      }

      case 'decor-vase-books': {
        return (
          <group>
            {/* Stacked hardcover linen books */}
            <mesh position={[-0.08, 0.02, 0.02]} rotation={[0, 0.08, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.28, 0.038, 0.21]} />
              <meshStandardMaterial color="#3B3D3A" roughness={0.68} />
            </mesh>
            <mesh position={[-0.075, 0.056, 0.015]} rotation={[0, -0.05, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.25, 0.032, 0.19]} />
              <meshStandardMaterial color="#D8CFC2" roughness={0.74} />
            </mesh>
            <mesh position={[-0.08, 0.086, 0.02]} rotation={[0, 0.14, 0]} castShadow>
              <boxGeometry args={[0.22, 0.028, 0.17]} />
              <meshStandardMaterial color={c2} roughness={0.7} />
            </mesh>
            {/* Turned stoneware amphora vase beside books */}
            <group position={[0.13, 0, -0.03]}>
              <mesh geometry={turnedVaseGeo} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
              <mesh position={[0, 0.34, 0]} rotation={[0.18, 0, -0.14]} castShadow>
                <cylinderGeometry args={[0.004, 0.006, 0.24, 6]} />
                <meshStandardMaterial color="#5D6B53" roughness={0.82} />
              </mesh>
              {[
                [0.03, 0.38, 0.02, 0.4],
                [-0.025, 0.42, -0.01, -0.5],
              ].map(([lx, ly, lz, ry], i) => (
                <mesh key={i} geometry={broadLeafGeo} position={[lx, ly, lz]} rotation={[0.5, ry, 0.2]} scale={0.38} castShadow>
                  <meshStandardMaterial color="#5D6B53" roughness={0.78} side={THREE.DoubleSide} />
                </mesh>
              ))}
            </group>
          </group>
        );
      }

      case 'decor-travertine-pedestal': {
        return (
          <group>
            <mesh position={[0, 0.42, 0]} geometry={getRoundedBox(0.4, 0.84, 0.4, 0.015)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.84, 0]} geometry={turnedVaseGeo} castShadow receiveShadow>
              <meshPhysicalMaterial color={c2} roughness={0.34} clearcoat={0.35} />
            </mesh>
          </group>
        );
      }

      case 'decor-hearth-console': {
        return (
          <group>
            <mesh position={[0, 0.56, 0]} geometry={getRoundedBox(1.96, 1.1, 0.44, 0.025)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.42, 0.05]}>
              <boxGeometry args={[1.1, 0.54, 0.38]} />
              <meshStandardMaterial color={c2} roughness={0.45} metalness={0.3} />
            </mesh>
            <mesh position={[0, 1.12, 0.04]} geometry={getRoundedBox(2.04, 0.06, 0.5, 0.018)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.28, 0.21]}>
              <boxGeometry args={[0.68, 0.16, 0.04]} />
              <meshStandardMaterial color="#FF9E44" emissive="#FF7A24" emissiveIntensity={1.15} />
            </mesh>
          </group>
        );
      }

      case 'kitchen-island-prep': {
        return (
          <group>
            <mesh position={[0, 0.43, 0]} geometry={getRoundedBox(2.08, 0.86, 0.86, 0.02)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.89, 0.03]} geometry={getRoundedBox(2.2, 0.06, 0.98, 0.018)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {[-1.07, 1.07].map((wx, i) => (
              <mesh key={i} position={[wx, 0.46, 0.03]} geometry={getRoundedBox(0.06, 0.92, 0.98, 0.018)} castShadow receiveShadow>
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
            ))}
            <mesh position={[-0.48, 0.925, 0]}>
              <boxGeometry args={[0.66, 0.012, 0.46]} />
              <meshStandardMaterial color="#1D1E1D" roughness={0.18} />
            </mesh>
            <mesh position={[-0.48, 1.0, 0.02]} castShadow>
              <cylinderGeometry args={[0.11, 0.11, 0.14, 20]} />
              <meshStandardMaterial color="#A8A49E" roughness={0.24} metalness={0.85} />
            </mesh>
            {activeState && (
              <group ref={steamGroupRef} position={[-0.48, 1.09, 0.02]}>
                {[0, 1, 2, 3].map((s) => (
                  <mesh key={s}>
                    <sphereGeometry args={[0.045, 8, 8]} />
                    <meshBasicMaterial color="#FFFFFF" transparent opacity={0.32} depthWrite={false} />
                  </mesh>
                ))}
              </group>
            )}
            <group position={[0.45, 0.92, -0.18]}>
              <mesh position={[0, 0.14, 0]} castShadow>
                <cylinderGeometry args={[0.014, 0.016, 0.28, 12]} />
                <meshStandardMaterial color="#C5A059" roughness={0.2} metalness={0.92} />
              </mesh>
              <mesh position={[0, 0.27, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.14, 10]} />
                <meshStandardMaterial color="#C5A059" roughness={0.2} metalness={0.92} />
              </mesh>
              {activeState && (
                <mesh position={[0, 0.13, 0.12]}>
                  <cylinderGeometry args={[0.008, 0.012, 0.25, 8]} />
                  <meshStandardMaterial color="#BCE0F5" transparent opacity={0.65} roughness={0.1} />
                </mesh>
              )}
            </group>
          </group>
        );
      }

      case 'kitchen-modular-wall': {
        return (
          <group>
            <mesh position={[0, 0.43, 0]} geometry={getRoundedBox(2.72, 0.86, 0.62, 0.02)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.88, 0.02]} geometry={getRoundedBox(2.76, 0.04, 0.65, 0.01)} castShadow receiveShadow>
              <meshStandardMaterial color="#E2DDD2" roughness={0.25} />
            </mesh>
            <group ref={doorLeftRef} position={[-0.95, 1.65, 0.25]}>
              <mesh position={[0.38, 0, 0]} geometry={getRoundedBox(0.76, 0.68, 0.04, 0.012)} castShadow>
                <meshStandardMaterial color={c2} roughness={0.45} />
              </mesh>
            </group>
            <group ref={doorRightRef} position={[0.95, 1.65, 0.25]}>
              <mesh position={[-0.38, 0, 0]} geometry={getRoundedBox(0.76, 0.68, 0.04, 0.012)} castShadow>
                <meshStandardMaterial color={c2} roughness={0.45} />
              </mesh>
            </group>
            <mesh position={[0, 1.75, -0.05]} castShadow>
              <cylinderGeometry args={[0.14, 0.34, 0.52, 4]} />
              <meshStandardMaterial color="#252625" roughness={0.35} metalness={0.65} />
            </mesh>
            <mesh position={[0, 1.28, -0.15]}>
              <boxGeometry args={[2.3, 0.014, 0.03]} />
              <meshStandardMaterial color="#FFE7C2" emissive="#FFD596" emissiveIntensity={0.65} />
            </mesh>
          </group>
        );
      }

      case 'bath-vanity-mirror': {
        return (
          <group>
            <mesh position={[0, 0.42, 0]} geometry={getRoundedBox(1.42, 0.72, 0.52, 0.03)} castShadow receiveShadow>
              <meshStandardMaterial color={c2} bumpMap={woodBump} bumpScale={0.004} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.8, 0]} geometry={getRoundedBox(1.46, 0.05, 0.56, 0.015)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.9, 0.04]} castShadow>
              <cylinderGeometry args={[0.24, 0.18, 0.15, 24]} />
              <meshStandardMaterial color="#ECE7DE" roughness={0.18} />
            </mesh>
            <group position={[0, 1.48, -0.22]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.42, 0.42, 0.03, 36]} />
                <meshStandardMaterial color="#DCE3E8" roughness={0.05} metalness={0.92} />
              </mesh>
              <mesh position={[0, 0, -0.018]}>
                <torusGeometry args={[0.43, 0.018, 12, 36]} />
                <meshStandardMaterial color="#FFF2D6" emissive="#FFE1AC" emissiveIntensity={0.85 * Math.max(0.55, lampMultiplier)} />
              </mesh>
            </group>
          </group>
        );
      }

      case 'bath-shower-tub': {
        return (
          <group>
            <mesh position={[-0.45, 0.3, 0]} geometry={getRoundedBox(0.92, 0.56, 0.84, 0.18)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <group position={[0.45, 0, 0]}>
              <mesh position={[0, 0.03, 0]} receiveShadow>
                <boxGeometry args={[0.88, 0.06, 0.88]} />
                <meshStandardMaterial color="#DCD7CD" roughness={0.35} />
              </mesh>
              <mesh position={[0, 1.08, 0.43]}>
                <boxGeometry args={[0.88, 2.08, 0.025]} />
                <meshPhysicalMaterial color="#E6F2FA" transparent opacity={0.26} roughness={0.05} clearcoat={1} />
              </mesh>
              <mesh position={[-0.43, 1.08, 0]}>
                <boxGeometry args={[0.025, 2.08, 0.88]} />
                <meshPhysicalMaterial color="#E6F2FA" transparent opacity={0.26} roughness={0.05} clearcoat={1} />
              </mesh>
              <mesh position={[0, 1.98, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.14, 0.025, 20]} />
                <meshStandardMaterial color={c2} roughness={0.25} metalness={0.85} />
              </mesh>
              {activeState && (
                <group ref={steamGroupRef} position={[0, 0.9, 0]}>
                  {[0, 1, 2, 3, 4].map((d) => (
                    <mesh key={d} position={[((d % 3) - 1) * 0.08, 0, 0]}>
                      <cylinderGeometry args={[0.005, 0.005, 0.35, 6]} />
                      <meshBasicMaterial color="#CBE6F7" transparent opacity={0.55} />
                    </mesh>
                  ))}
                </group>
              )}
            </group>
          </group>
        );
      }

      case 'bath-towel-rack': {
        return (
          <group>
            {[-0.28, 0.28].map((lx, i) => (
              <mesh key={i} position={[lx, 0.72, 0]} rotation={[0.14, 0, 0]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 1.44, 10]} />
                <meshStandardMaterial color={c1} roughness={0.22} metalness={0.9} />
              </mesh>
            ))}
            {[0.5, 0.9, 1.25].map((ry, i) => (
              <mesh key={i} position={[0, ry, 0.03 - (i - 1) * 0.05]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, 0.56, 10]} />
                <meshStandardMaterial color={c1} roughness={0.22} metalness={0.9} />
              </mesh>
            ))}
            <mesh ref={towelRef} position={[0, 0.78, 0.05]} geometry={getRoundedBox(0.44, 0.48, 0.04, 0.012)} castShadow>
              <meshStandardMaterial color={c2} bumpMap={linenTex} bumpScale={0.01} roughness={0.92} />
            </mesh>
          </group>
        );
      }

      case 'tech-tv-media-wall':
      case 'cinema-screen-rig': {
        const isCinema = instance.catalogId === 'cinema-screen-rig';
        const screenOn = activeState;
        return (
          <group>
            <mesh position={[0, 0.24, 0]} geometry={getRoundedBox(isCinema ? 2.6 : 2.28, 0.38, 0.42, 0.025)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            {isCinema &&
              [-1.38, 1.38].map((sx, i) => (
                <mesh key={i} position={[sx, 0.62, 0.05]} geometry={getRoundedBox(0.26, 1.22, 0.3, 0.02)} castShadow>
                  <meshStandardMaterial color="#1C1D1C" roughness={0.4} />
                </mesh>
              ))}
            <mesh position={[0, isCinema ? 1.22 : 1.08, -0.05]} geometry={getRoundedBox(isCinema ? 2.35 : 1.65, isCinema ? 1.28 : 0.95, 0.04, 0.012)} castShadow>
              <meshStandardMaterial color="#141514" roughness={0.25} />
            </mesh>
            <mesh position={[0, isCinema ? 1.22 : 1.08, -0.025]}>
              <planeGeometry args={[isCinema ? 2.26 : 1.58, isCinema ? 1.2 : 0.89]} />
              <meshStandardMaterial
                color={screenOn ? '#3A4A4F' : '#111211'}
                emissive={screenOn ? '#5B7065' : '#000000'}
                emissiveIntensity={screenOn ? 0.7 : 0}
                roughness={0.18}
              />
            </mesh>
          </group>
        );
      }

      case 'office-whiteboard-easel': {
        return (
          <group>
            {[-0.56, 0.56].map((lx, i) => (
              <mesh key={i} position={[lx, 0.88, 0]} castShadow>
                <boxGeometry args={[0.045, 1.76, 0.045]} />
                <meshStandardMaterial color="#A8825A" roughness={0.5} />
              </mesh>
            ))}
            <mesh position={[0, 1.22, 0.02]} geometry={getRoundedBox(1.26, 0.88, 0.04, 0.012)} castShadow>
              <meshStandardMaterial color={c1} roughness={0.16} />
            </mesh>
            <mesh position={[-0.18, 1.26, 0.045]}>
              <boxGeometry args={[0.55, 0.012, 0.005]} />
              <meshStandardMaterial color={c2} roughness={0.6} />
            </mesh>
            <mesh position={[0.1, 1.12, 0.045]}>
              <boxGeometry args={[0.42, 0.012, 0.005]} />
              <meshStandardMaterial color="#252625" roughness={0.6} />
            </mesh>
          </group>
        );
      }

      case 'kids-play-tent': {
        return (
          <group>
            <mesh position={[0, 0.02, 0]} receiveShadow>
              <cylinderGeometry args={[0.56, 0.58, 0.04, 24]} />
              <meshStandardMaterial color="#DFD3C3" roughness={0.94} />
            </mesh>
            <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
              <coneGeometry args={[0.58, 1.48, 5, 1, true]} />
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={toyBounceRef} position={[0, 0.16, 0.25]} castShadow>
              <sphereGeometry args={[0.11, 14, 14]} />
              <meshStandardMaterial color="#D6947A" roughness={0.85} />
            </mesh>
          </group>
        );
      }

      case 'pooja-carved-mandir': {
        return (
          <group>
            <mesh position={[0, 0.38, 0]} geometry={getRoundedBox(1.4, 0.74, 0.62, 0.025)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 1.38, -0.14]} geometry={getRoundedBox(1.32, 1.28, 0.34, 0.025)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 1.32, 0.04]}>
              <boxGeometry args={[1.08, 1.05, 0.02]} />
              <meshStandardMaterial color="#593B25" emissive="#422B18" emissiveIntensity={0.42} roughness={0.5} />
            </mesh>
            <mesh position={[0, 2.08, -0.05]} castShadow>
              <coneGeometry args={[0.45, 0.35, 8]} />
              <meshStandardMaterial color={c2} roughness={0.25} metalness={0.85} />
            </mesh>
            <group ref={doorLeftRef} position={[-0.56, 1.32, 0.2]}>
              <mesh position={[0.28, 0, 0]} castShadow>
                <boxGeometry args={[0.54, 1.06, 0.03]} />
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
            </group>
            <group ref={doorRightRef} position={[0.56, 1.32, 0.2]}>
              <mesh position={[-0.28, 0, 0]} castShadow>
                <boxGeometry args={[0.54, 1.06, 0.03]} />
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
              </mesh>
            </group>
            <group ref={bellGroupRef} position={[0, 1.72, 0.14]}>
              {[-0.24, 0.24].map((bx, i) => (
                <mesh key={i} position={[bx, 0, 0]} castShadow>
                  <coneGeometry args={[0.045, 0.1, 14]} />
                  <meshStandardMaterial color={c2} roughness={0.2} metalness={0.92} />
                </mesh>
              ))}
            </group>
            <group position={[0, 0.78, 0.16]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.07, 0.04, 0.05, 16]} />
                <meshStandardMaterial color={c2} roughness={0.2} metalness={0.92} />
              </mesh>
              <mesh ref={diyaFlameRef} position={[0, 0.06, 0]}>
                <coneGeometry args={[0.02, 0.065, 10]} />
                <meshStandardMaterial color="#FFCC55" emissive="#FF8C24" emissiveIntensity={1.65} />
              </mesh>
              <pointLight position={[0, 0.12, 0.05]} color="#FFB86B" intensity={0.85} distance={3.2} decay={2} />
              <group ref={steamGroupRef} position={[0.22, 0.06, 0]}>
                {[0, 1, 2].map((s) => (
                  <mesh key={s}>
                    <sphereGeometry args={[0.025, 8, 8]} />
                    <meshBasicMaterial color="#EFECE6" transparent opacity={0.28} depthWrite={false} />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        );
      }

      case 'balcony-hanging-swing': {
        return (
          <group>
            <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.45, 0.025, 12, 28]} />
              <meshStandardMaterial color="#2A2B2A" roughness={0.35} metalness={0.75} />
            </mesh>
            <mesh position={[-0.25, 0.95, -0.25]} castShadow>
              <cylinderGeometry args={[0.024, 0.024, 1.85, 12]} />
              <meshStandardMaterial color="#2A2B2A" roughness={0.35} metalness={0.75} />
            </mesh>
            <mesh position={[-0.08, 1.82, -0.08]} rotation={[0, Math.PI / 4, -Math.PI / 3]}>
              <cylinderGeometry args={[0.022, 0.022, 0.55, 12]} />
              <meshStandardMaterial color="#2A2B2A" roughness={0.35} metalness={0.75} />
            </mesh>
            <group ref={swingBasketRef} position={[0.06, 1.72, 0.06]}>
              <mesh position={[0, -0.35, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.7, 8]} />
                <meshStandardMaterial color="#C5A059" roughness={0.25} metalness={0.85} />
              </mesh>
              <mesh position={[0, -0.82, 0]} castShadow>
                <sphereGeometry args={[0.42, 20, 16, 0, Math.PI * 1.4]} />
                <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, -0.95, 0.05]} castShadow>
                <cylinderGeometry args={[0.3, 0.28, 0.12, 20]} />
                <meshStandardMaterial color={c2} roughness={0.92} />
              </mesh>
            </group>
          </group>
        );
      }

      case 'balcony-bistro-set': {
        return (
          <group>
            <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.38, 0.38, 0.035, 24]} />
              <meshStandardMaterial color={c2} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.36, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.035, 0.7, 12]} />
              <meshStandardMaterial color="#2A2B2A" roughness={0.4} metalness={0.65} />
            </mesh>
            {[-0.58, 0.58].map((cx, i) => (
              <group key={i} position={[cx, 0, 0]} rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
                <mesh position={[0, 0.42, 0]} geometry={getRoundedBox(0.42, 0.04, 0.42, 0.015)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
                <mesh position={[0, 0.65, -0.19]} geometry={getRoundedBox(0.42, 0.38, 0.04, 0.015)} castShadow>
                  <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
                </mesh>
              </group>
            ))}
          </group>
        );
      }

      default: {
        return (
          <group>
            <mesh position={[0, 0.45, 0]} geometry={getRoundedBox(0.38, 0.9, 0.38, 0.02)} castShadow receiveShadow>
              <meshPhysicalMaterial key={pbr.canonical} color={c1} {...primaryPbrProps} />
            </mesh>
            <mesh position={[0, 0.9, 0]} geometry={turnedVaseGeo} scale={0.78} castShadow>
              <meshStandardMaterial color={c2} roughness={0.4} />
            </mesh>
          </group>
        );
      }
    }
  };

  return (
    <group
      ref={groupRef}
      position={instance.position}
      rotation={[0, instance.rotationY, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHoverChange?.(instance.instanceId);
        document.body.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        setHovered(false);
        onHoverChange?.(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(instance.instanceId);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onStartDrag(instance.instanceId, e);
      }}
    >
      {renderParts()}

      {(isSelected || hovered) && (
        <group position={[0, 0.018, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[ringRadius, ringRadius + 0.036, 48]} />
            <meshBasicMaterial
              color={isSelected ? '#5D6B53' : '#C5A059'}
              transparent
              opacity={isSelected ? 0.95 : 0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[ringRadius, 48]} />
            <meshBasicMaterial
              color={isSelected ? '#5D6B53' : '#C5A059'}
              transparent
              opacity={isSelected ? 0.14 : 0.07}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} visible={false}>
        <ringGeometry args={[ringRadius * 0.85, ringRadius * 0.95, 48]} />
        <meshBasicMaterial color="#5D6B53" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
