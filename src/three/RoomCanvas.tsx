import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { FurnitureInstance, QualityLevel, RoomDimensions, RoomShellConfig } from '../types/room';
import { getCatalogItem } from '../data/catalog';
import { RoomArchitecture } from './RoomArchitecture';
import { FurnitureModel } from './FurnitureModels';
import { PostProcessingEffects } from './PostProcessingEffects';
import { isNightLightingPreset, resolveLightingPreset } from './lightingPresets';
import { detectSoftwareWebGL } from './webglCapabilities';

export type CameraPreset =
  | 'wide'
  | 'entrance'
  | 'bed-showcase'
  | 'close-up'
  | 'corner'
  | 'top-down'
  | 'walkthrough'
  | 'isometric'
  | 'eye-level'
  | 'top-plan';

export interface ZoomCommand {
  type: 'in' | 'out' | 'reset';
  tick: number;
}

interface RoomCanvasProps {
  dimensions: RoomDimensions;
  shell: RoomShellConfig;
  furniture: FurnitureInstance[];
  selectedId: string | null;
  walkthroughMode: boolean;
  cameraPreset: CameraPreset;
  cameraPresetTick: number;
  constructionKey: number;
  qualityLevel?: QualityLevel;
  focusSelectedItem?: boolean;
  zoomCommand?: ZoomCommand | null;
  allowOrbit?: boolean;
  cinematicPreview?: boolean;
  onCinematicStageChange?: (caption: string) => void;
  reducedMotion?: boolean;
  deletingIds?: string[];
  ghostPreview?: { catalogId: string; x: number; z: number } | null;
  hideFurniture?: boolean;
  gridSnap?: boolean;
  showDimensions?: boolean;
  autoRotate?: boolean;
  authShowcaseMode?: boolean;
  interactive?: boolean;
  onSelectFurniture?: (id: string | null) => void;
  onUpdateFurniturePosition?: (id: string, pos: [number, number, number]) => void;
  onDragEnd?: (id: string) => void;
  onRegisterCapture?: (captureFn: (() => string | null) | null) => void;
}

const _targetVec = new THREE.Vector3();
const _targetColor = new THREE.Color();
const _skyColor = new THREE.Color();
const _groundColor = new THREE.Color();
const _bgColor = new THREE.Color();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _cinPos = new THREE.Vector3();
const _cinPosB = new THREE.Vector3();
const _cinTarget = new THREE.Vector3();
const _cinTargetB = new THREE.Vector3();

const StudioEnvironment: React.FC = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const rt = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.24;
    return () => {
      rt.dispose();
      roomEnv.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

const CaptureRegistrar: React.FC<{
  onRegisterCapture?: (fn: (() => string | null) | null) => void;
}> = ({ onRegisterCapture }) => {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!onRegisterCapture) return;
    onRegisterCapture(() => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL('image/png', 1.0);
      } catch {
        return null;
      }
    });
    return () => onRegisterCapture(null);
  }, [gl, scene, camera, onRegisterCapture]);
  return null;
};

const AnimatedLightingRig: React.FC<{
  shell: RoomShellConfig;
  dimensions: RoomDimensions;
  isSoftwareGl: boolean;
  qualityLevel: QualityLevel;
  authShowcaseMode?: boolean;
  reducedMotion?: boolean;
}> = ({ shell, dimensions, isSoftwareGl, qualityLevel, authShowcaseMode = false, reducedMotion = false }) => {
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const { gl, scene } = useThree();

  const preset = resolveLightingPreset(shell.lightingPreset);
  const shadowBound = Math.max(dimensions.length, dimensions.width) * 0.85 + 2;
  const shadowSize =
    qualityLevel === 'ultra' || qualityLevel === 'high'
      ? 2048
      : qualityLevel === 'medium'
      ? 1024
      : 512;

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();
    const warmthShift = (shell.ambientWarmth - 0.5) * 0.14;
    const overallBrightness = shell.overallBrightness ?? 1.0;
    const ambientMult = shell.ambientIntensity ?? 1.0;
    const shadowMult = shell.shadowIntensity ?? 1.0;
    const targetExposure = shell.exposure ?? preset.exposure;
    const showcasePulse = authShowcaseMode && !reducedMotion ? Math.sin(t * 0.45) * 0.08 : 0;

    if (dirRef.current) {
      _targetVec.set(...preset.sunPosition);
      if (authShowcaseMode && !reducedMotion) {
        _targetVec.x += Math.sin(t * 0.25) * 0.9;
        _targetVec.z += Math.cos(t * 0.22) * 0.6;
      }
      dirRef.current.position.lerp(_targetVec, 1 - Math.exp(-3.2 * dt));

      _targetColor.set(preset.sunColor);
      if (warmthShift !== 0) {
        _targetColor.offsetHSL(-warmthShift * 0.14, warmthShift * 0.22, 0);
      }
      dirRef.current.color.lerp(_targetColor, 1 - Math.exp(-3.2 * dt));
      dirRef.current.intensity = THREE.MathUtils.damp(
        dirRef.current.intensity,
        preset.sunIntensity * (shell.sunIntensity + showcasePulse) * overallBrightness,
        3.5,
        dt,
      );
    }

    if (fillRef.current) {
      _targetColor.set(preset.fillColor);
      fillRef.current.color.lerp(_targetColor, 1 - Math.exp(-3.2 * dt));
      const targetFill = (preset.fillIntensity * overallBrightness) / Math.max(0.55, shadowMult * 0.9);
      fillRef.current.intensity = THREE.MathUtils.damp(fillRef.current.intensity, targetFill, 3.5, dt);
    }

    if (hemiRef.current) {
      _skyColor.set(preset.skyColor);
      _groundColor.set(preset.groundColor);
      hemiRef.current.color.lerp(_skyColor, 1 - Math.exp(-3.2 * dt));
      hemiRef.current.groundColor.lerp(_groundColor, 1 - Math.exp(-3.2 * dt));
      hemiRef.current.intensity = THREE.MathUtils.damp(
        hemiRef.current.intensity,
        preset.hemiIntensity * ambientMult * overallBrightness,
        3.5,
        dt,
      );
    }

    scene.environmentIntensity = THREE.MathUtils.damp(
      scene.environmentIntensity ?? 0.18,
      preset.envIntensity * ambientMult * overallBrightness,
      3.5,
      dt,
    );

    _bgColor.set(preset.bgColor);
    if (!scene.background || !(scene.background instanceof THREE.Color)) {
      scene.background = _bgColor.clone();
    } else {
      scene.background.lerp(_bgColor, 1 - Math.exp(-3.2 * dt));
    }

    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, targetExposure, 3.5, dt);
  });

  return (
    <>
      <hemisphereLight
        ref={hemiRef}
        args={[preset.skyColor, preset.groundColor, preset.hemiIntensity]}
      />
      <directionalLight
        ref={dirRef}
        position={preset.sunPosition}
        color={preset.sunColor}
        intensity={preset.sunIntensity * shell.sunIntensity}
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-radius={3.8}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-camera-left={-shadowBound}
        shadow-camera-right={shadowBound}
        shadow-camera-top={shadowBound}
        shadow-camera-bottom={-shadowBound}
      />
      <directionalLight
        ref={fillRef}
        position={[-6, 4, -5]}
        intensity={preset.fillIntensity}
        color={preset.fillColor}
      />
    </>
  );
};

const DEFAULT_ISOMETRIC_DIR = new THREE.Vector3(0.72, 0.50, 0.72).normalize();
const CORNER_ISOMETRIC_DIR = new THREE.Vector3(-0.72, 0.50, 0.72).normalize();

function computeRoomFitDistance(
  dimensions: RoomDimensions,
  fovDeg: number,
  aspect: number,
  viewDir: THREE.Vector3 = DEFAULT_ISOMETRIC_DIR,
  fillRatio = 1.04,
  targetYRatio = 0.40,
): number {
  const halfL = dimensions.length / 2 + 0.12;
  const halfW = dimensions.width / 2 + 0.12;
  const minY = -0.10;
  const maxY = dimensions.height + 0.04;
  const targetY = dimensions.height * targetYRatio;

  const dir = viewDir.clone().normalize();
  const forward = dir.clone().negate();
  const worldUp = Math.abs(forward.y) > 0.98
    ? new THREE.Vector3(0, 0, -1)
    : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
  const camUp = new THREE.Vector3().crossVectors(right, forward).normalize();

  const vFovRad = THREE.MathUtils.degToRad(Math.max(24, Math.min(75, fovDeg)));
  const safeAspect = Math.max(0.55, aspect || 1.35);
  const tanHalfV = Math.tan(vFovRad / 2) * fillRatio;
  const tanHalfH = Math.tan(vFovRad / 2) * safeAspect * fillRatio;

  // For isometric cutaway views, the front-most corner nearest the camera has both adjacent walls hidden;
  // framing against only the visible floor corner there prevents excessive zooming out into empty space.
  const xzFootprint: [number, number][] = [
    [-halfL, -halfW],
    [halfL, -halfW],
    [-halfL, halfW],
    [halfL, halfW],
  ];

  const corners: [number, number, number][] = [];
  for (const [cx, cz] of xzFootprint) {
    corners.push([cx, minY, cz]);
    const isCutawayCorner = cx * dir.x > 0 && cz * dir.z > 0 && Math.abs(dir.y) < 0.92;
    corners.push([cx, isCutawayCorner ? 0.14 : maxY, cz]);
  }

  let requiredDist = 2.8;
  const rel = new THREE.Vector3();
  for (const [cx, cy, cz] of corners) {
    rel.set(cx, cy - targetY, cz);
    const rx = Math.abs(rel.dot(right));
    const ry = Math.abs(rel.dot(camUp));
    const rz = rel.dot(dir);
    const neededV = rz + ry / tanHalfV;
    const neededH = rz + rx / tanHalfH;
    if (neededV > requiredDist) requiredDist = neededV;
    if (neededH > requiredDist) requiredDist = neededH;
  }

  return requiredDist;
}

const CameraRig: React.FC<{
  dimensions: RoomDimensions;
  furniture: FurnitureInstance[];
  walkthroughMode: boolean;
  cinematicPreview: boolean;
  onCinematicStageChange?: (caption: string) => void;
  reducedMotion: boolean;
  cameraPreset: CameraPreset;
  cameraPresetTick: number;
  constructionKey: number;
  selectedPiece: FurnitureInstance | null;
  focusSelectedItem: boolean;
  zoomCommand?: ZoomCommand | null;
  allowOrbit: boolean;
  autoRotate: boolean;
  authShowcaseMode?: boolean;
  isDraggingFurniture: boolean;
  isSoftwareGl: boolean;
}> = ({
  dimensions,
  furniture,
  walkthroughMode,
  cinematicPreview,
  onCinematicStageChange,
  reducedMotion,
  cameraPreset,
  cameraPresetTick,
  constructionKey,
  selectedPiece,
  focusSelectedItem,
  zoomCommand,
  allowOrbit,
  autoRotate,
  authShowcaseMode = false,
  isDraggingFurniture,
  isSoftwareGl,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, gl, size } = useThree();
  const activeTransition = useRef(false);
  const desiredPos = useRef(new THREE.Vector3(8.2, 5.6, 8.2));
  const desiredTarget = useRef(new THREE.Vector3(0, 1.0, 0));
  const userInteractingRef = useRef(false);
  const hasInitializedFitRef = useRef(false);
  const userHasOrbitedRef = useRef(false);
  const cinematicTimeRef = useRef(0);
  const lastCaptionRef = useRef('');
  const zoomOffsetVec = useRef(new THREE.Vector3());

  // Walkthrough state
  const keysRef = useRef<Record<string, boolean>>({});
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.05);
  const lookDragRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const bedPiece = useMemo(
    () =>
      furniture.find((f) => {
        const cat = getCatalogItem(f.catalogId);
        return cat?.category === 'Beds' && f.catalogId !== 'bed-kids-bunk';
      }) ?? null,
    [furniture],
  );

  // Reset cinematic timer when preview toggles on
  useEffect(() => {
    if (cinematicPreview) {
      cinematicTimeRef.current = 0;
      lastCaptionRef.current = '';
      activeTransition.current = false;
    }
  }, [cinematicPreview]);

  const getFitDistance = useCallback(
    (fillRatio = 1.04, viewDir: THREE.Vector3 = DEFAULT_ISOMETRIC_DIR, targetYRatio = 0.40) => {
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 40;
      const aspect = size.height > 0 ? size.width / size.height : 1.45;
      return computeRoomFitDistance(dimensions, fov, aspect, viewDir, fillRatio, targetYRatio);
    },
    [camera, size.width, size.height, dimensions],
  );

  // Place camera at tightly framed architectural overview on initial mount & resize (until user orbits)
  useEffect(() => {
    if (walkthroughMode || cinematicPreview) return;
    if (size.width === 0 || size.height === 0) return;
    if (cameraPreset !== 'wide' && cameraPreset !== 'isometric') return;

    const targetY = dimensions.height * 0.40;
    const dist = getFitDistance(1.04, DEFAULT_ISOMETRIC_DIR, 0.40);
    desiredTarget.current.set(0, targetY, 0);
    desiredPos.current.copy(desiredTarget.current).addScaledVector(DEFAULT_ISOMETRIC_DIR, dist);

    if (!hasInitializedFitRef.current || !userHasOrbitedRef.current) {
      hasInitializedFitRef.current = true;
      camera.position.copy(desiredPos.current);
      camera.lookAt(desiredTarget.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(desiredTarget.current);
        controlsRef.current.update();
      }
      activeTransition.current = false;
    }
  }, [
    size.width,
    size.height,
    getFitDistance,
    dimensions.height,
    dimensions.length,
    dimensions.width,
    camera,
    walkthroughMode,
    cinematicPreview,
    cameraPreset,
  ]);

  // Cinematic intro glide from elevated angle when room constructs
  useEffect(() => {
    if (walkthroughMode || cinematicPreview) return;
    const dist = getFitDistance(1.04, DEFAULT_ISOMETRIC_DIR, 0.40);
    const targetY = dimensions.height * 0.40;
    userHasOrbitedRef.current = false;
    if (constructionKey > 0 && !reducedMotion) {
      camera.position.set(0, targetY, 0).addScaledVector(DEFAULT_ISOMETRIC_DIR, dist * 1.24);
      desiredTarget.current.set(0, targetY, 0);
      desiredPos.current.copy(desiredTarget.current).addScaledVector(DEFAULT_ISOMETRIC_DIR, dist);
      activeTransition.current = true;
    } else {
      desiredTarget.current.set(0, targetY, 0);
      desiredPos.current.copy(desiredTarget.current).addScaledVector(DEFAULT_ISOMETRIC_DIR, dist);
      camera.position.copy(desiredPos.current);
      camera.lookAt(desiredTarget.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(desiredTarget.current);
        controlsRef.current.update();
      }
      activeTransition.current = false;
    }
  }, [constructionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera presets
  useEffect(() => {
    if (cinematicPreview) return;

    if (walkthroughMode || cameraPreset === 'walkthrough') {
      camera.position.set(0, 1.62, Math.max(0.8, dimensions.width * 0.34));
      yawRef.current = 0;
      pitchRef.current = -0.04;
      const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      activeTransition.current = false;
      return;
    }

    const span = Math.max(dimensions.length, dimensions.width);
    const dist = getFitDistance(1.04, DEFAULT_ISOMETRIC_DIR, 0.40);
    const targetY = dimensions.height * 0.40;
    if (cameraPresetTick > 0) {
      userHasOrbitedRef.current = true;
    }

    switch (cameraPreset) {
      case 'top-down':
      case 'top-plan': {
        const topDir = new THREE.Vector3(0.01, 1, 0.01).normalize();
        const topDist = getFitDistance(0.92, topDir, 0);
        desiredPos.current.set(0.01, Math.max(span * 1.22, topDist), 0.01);
        desiredTarget.current.set(0, 0, 0);
        break;
      }
      case 'entrance':
        desiredPos.current.set(
          -dimensions.length * 0.34,
          1.56,
          dimensions.width * 0.42,
        );
        desiredTarget.current.set(0.15, 0.92, -dimensions.width * 0.18);
        break;
      case 'bed-showcase':
        if (bedPiece) {
          desiredPos.current.set(
            bedPiece.position[0] + 1.85,
            1.36,
            bedPiece.position[2] + 2.25,
          );
          desiredTarget.current.set(
            bedPiece.position[0],
            0.68,
            bedPiece.position[2] - 0.14,
          );
        } else {
          desiredPos.current.set(1.9, 1.4, 2.15);
          desiredTarget.current.set(0, 0.72, -dimensions.width * 0.18);
        }
        break;
      case 'close-up':
      case 'eye-level':
        if (selectedPiece) {
          desiredTarget.current.set(
            selectedPiece.position[0],
            Math.max(0.45, selectedPiece.position[1] + 0.5),
            selectedPiece.position[2],
          );
          desiredPos.current.set(
            selectedPiece.position[0] + 2.1,
            1.46,
            selectedPiece.position[2] + 2.35,
          );
        } else {
          desiredPos.current.set(dimensions.length * 0.36, 1.54, dimensions.width * 0.44);
          desiredTarget.current.set(-0.25, 0.92, -0.55);
        }
        break;
      case 'corner': {
        const cornerDist = getFitDistance(1.04, CORNER_ISOMETRIC_DIR, 0.40);
        desiredTarget.current.set(0, targetY, 0);
        desiredPos.current.copy(desiredTarget.current).addScaledVector(CORNER_ISOMETRIC_DIR, cornerDist);
        break;
      }
      case 'wide':
      case 'isometric':
      default: {
        desiredTarget.current.set(0, targetY, 0);
        desiredPos.current.copy(desiredTarget.current).addScaledVector(DEFAULT_ISOMETRIC_DIR, dist);
        break;
      }
    }
    if (cameraPreset !== 'wide' && cameraPreset !== 'isometric') {
      activeTransition.current = true;
    } else if (cameraPresetTick > 0) {
      userHasOrbitedRef.current = false;
      activeTransition.current = true;
    }
  }, [
    cameraPreset,
    cameraPresetTick,
    walkthroughMode,
    cinematicPreview,
    dimensions.length,
    dimensions.width,
    dimensions.height,
    camera,
    selectedPiece,
    bedPiece,
    getFitDistance,
  ]);

  // Programmatic Zoom In / Zoom Out / Reset View controls
  useEffect(() => {
    if (!zoomCommand || zoomCommand.tick === 0 || walkthroughMode || cinematicPreview) return;
    if (zoomCommand.type === 'reset') {
      userHasOrbitedRef.current = false;
      const dist = getFitDistance(1.04, DEFAULT_ISOMETRIC_DIR, 0.40);
      const targetY = dimensions.height * 0.40;
      desiredTarget.current.set(0, targetY, 0);
      desiredPos.current.copy(desiredTarget.current).addScaledVector(DEFAULT_ISOMETRIC_DIR, dist);
      activeTransition.current = true;
      return;
    }

    userHasOrbitedRef.current = true;
    const currentTarget = controlsRef.current?.target ?? desiredTarget.current;
    const minDist = 1.2;
    const maxDist = Math.max(dimensions.length, dimensions.width) * 2.5;
    zoomOffsetVec.current.copy(camera.position).sub(currentTarget);
    const currLen = Math.max(0.5, zoomOffsetVec.current.length());
    const factor = zoomCommand.type === 'in' ? 0.78 : 1.28;
    const nextLen = THREE.MathUtils.clamp(currLen * factor, minDist, maxDist);
    zoomOffsetVec.current.normalize().multiplyScalar(nextLen);
    desiredTarget.current.copy(currentTarget);
    desiredPos.current.copy(currentTarget).add(zoomOffsetVec.current);
    activeTransition.current = true;
  }, [zoomCommand?.tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional explicit focus pull only when focusSelectedItem is explicitly enabled
  useEffect(() => {
    if (!focusSelectedItem || !selectedPiece || walkthroughMode || cinematicPreview || isDraggingFurniture) {
      return;
    }
    const [px, py, pz] = selectedPiece.position;
    desiredTarget.current.set(px, Math.max(0.45, py + 0.48), pz);
    desiredPos.current.set(px + 2.45, 1.7, pz + 2.6);
    activeTransition.current = true;
  }, [selectedPiece?.instanceId, focusSelectedItem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Walkthrough listeners
  useEffect(() => {
    if (!walkthroughMode) return;
    const dom = gl.domElement;
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      lookDragRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!lookDragRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      yawRef.current -= dx * 0.0042;
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - dy * 0.0035, -1.1, 1.1);
    };
    const onPointerUp = () => {
      lookDragRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [walkthroughMode, gl]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();

    if (walkthroughMode) {
      const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);

      const speed = 2.4 * dt;
      _forward.set(0, 0, -1).applyAxisAngle(_yAxis, yawRef.current);
      _right.set(1, 0, 0).applyAxisAngle(_yAxis, yawRef.current);

      const k = keysRef.current;
      if (k.KeyW || k.ArrowUp) camera.position.addScaledVector(_forward, speed);
      if (k.KeyS || k.ArrowDown) camera.position.addScaledVector(_forward, -speed);
      if (k.KeyD || k.ArrowRight) camera.position.addScaledVector(_right, speed);
      if (k.KeyA || k.ArrowLeft) camera.position.addScaledVector(_right, -speed);

      const maxX = dimensions.length / 2 - 0.35;
      const maxZ = dimensions.width / 2 - 0.35;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -maxX, maxX);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -maxZ, maxZ);
      camera.position.y = 1.62;
      return;
    }

    // Dedicated 18-second Choreographed Cinematic Tour
    if (cinematicPreview && controlsRef.current) {
      cinematicTimeRef.current = (cinematicTimeRef.current + (reducedMotion ? dt * 0.45 : dt)) % 18.0;
      const ct = cinematicTimeRef.current;
      const L = dimensions.length;
      const W = dimensions.width;
      const H = dimensions.height;
      const bx = bedPiece ? bedPiece.position[0] : 0;
      const bz = bedPiece ? bedPiece.position[2] : -W * 0.22;

      let caption = '';
      if (ct < 4.5) {
        caption = 'Entrance Sweep · Architectural Threshold';
        const u = THREE.MathUtils.smoothstep(ct, 0, 4.5);
        _cinPos.set(-L * 0.34, 1.56, W * 0.42);
        _cinPosB.set(L * 0.22, 1.44, W * 0.35);
        _cinTarget.set(0, 0.9, -W * 0.2);
        _cinTargetB.set(bx, 0.78, bz);
        _cinPos.lerp(_cinPosB, u);
        _cinTarget.lerp(_cinTargetB, u);
      } else if (ct < 9.0) {
        caption = bedPiece
          ? 'Bed & Layered Bedding Showcase'
          : 'Centerpiece Craftsmanship Showcase';
        const u = THREE.MathUtils.smoothstep(ct, 4.5, 9.0);
        _cinPos.set(bx + 1.75, 1.24, bz + 1.9);
        _cinPosB.set(bx - 1.5, 1.08, bz + 1.7);
        _cinTarget.set(bx, 0.65, bz - 0.14);
        _cinTargetB.set(bx, 0.62, bz);
        _cinPos.lerp(_cinPosB, u);
        _cinTarget.lerp(_cinTargetB, u);
      } else if (ct < 13.5) {
        caption = 'Interior Millwork & Ambient Lighting';
        const u = THREE.MathUtils.smoothstep(ct, 9.0, 13.5);
        _cinPos.set(L * 0.32, 1.68, -W * 0.05);
        _cinPosB.set(-L * 0.26, 1.48, W * 0.26);
        _cinTarget.set(0, 1.15, -W * 0.25);
        _cinTargetB.set(L * 0.1, 0.95, 0);
        _cinPos.lerp(_cinPosB, u);
        _cinTarget.lerp(_cinTargetB, u);
      } else {
        caption = 'Wide Spatial Overview';
        const u = THREE.MathUtils.smoothstep(ct, 13.5, 18.0);
        const wideFit = getFitDistance(1.04, DEFAULT_ISOMETRIC_DIR, 0.40);
        _cinPos.set(-L * 0.26, 1.48, W * 0.26);
        _cinPosB.set(0, H * 0.40, 0).addScaledVector(DEFAULT_ISOMETRIC_DIR, wideFit);
        _cinTarget.set(0, 0.88, -0.1);
        _cinTargetB.set(0, H * 0.40, 0);
        _cinPos.lerp(_cinPosB, u);
        _cinTarget.lerp(_cinTargetB, u);
      }

      if (caption !== lastCaptionRef.current) {
        lastCaptionRef.current = caption;
        onCinematicStageChange?.(caption);
      }

      camera.position.lerp(_cinPos, 1 - Math.exp(-3.0 * dt));
      controlsRef.current.target.lerp(_cinTarget, 1 - Math.exp(-3.4 * dt));
      controlsRef.current.update();
      return;
    }

    if (activeTransition.current && controlsRef.current) {
      const rate = reducedMotion ? 16 : 4.5;
      camera.position.lerp(desiredPos.current, 1 - Math.exp(-rate * dt));
      controlsRef.current.target.lerp(desiredTarget.current, 1 - Math.exp(-(rate + 0.5) * dt));
      controlsRef.current.update();

      if (
        camera.position.distanceTo(desiredPos.current) < 0.03 &&
        controlsRef.current.target.distanceTo(desiredTarget.current) < 0.03
      ) {
        activeTransition.current = false;
      }
    } else if (
      authShowcaseMode &&
      !userInteractingRef.current &&
      !reducedMotion &&
      controlsRef.current
    ) {
      // Smooth slow showcase camera sweep across bedroom
      const angle = Math.sin(t * 0.14) * 0.42 + 0.68;
      const dist = getFitDistance(0.96, DEFAULT_ISOMETRIC_DIR, 0.36);
      desiredPos.current.set(
        Math.sin(angle) * dist * 0.78,
        dimensions.height * 0.56 + Math.sin(t * 0.18) * 0.16,
        Math.cos(angle) * dist * 0.78,
      );
      desiredTarget.current.set(0, dimensions.height * 0.34, -0.2);
      camera.position.lerp(desiredPos.current, 1 - Math.exp(-1.5 * dt));
      controlsRef.current.target.lerp(desiredTarget.current, 1 - Math.exp(-2.0 * dt));
      controlsRef.current.update();
    } else if (
      !userInteractingRef.current &&
      !isDraggingFurniture &&
      !isSoftwareGl &&
      !reducedMotion &&
      controlsRef.current
    ) {
      // Subtle idle breathing camera sway
      camera.position.y += Math.sin(t * 0.65) * 0.0004;
      camera.position.x += Math.cos(t * 0.45) * 0.0003;
      controlsRef.current.update();
    }
  });

  if (walkthroughMode) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={allowOrbit && !isDraggingFurniture && !cinematicPreview}
      enableZoom={allowOrbit}
      zoomSpeed={0.85}
      enableDamping={!isSoftwareGl}
      dampingFactor={0.07}
      autoRotate={autoRotate && !isSoftwareGl && !cinematicPreview && !reducedMotion}
      autoRotateSpeed={0.5}
      minDistance={1.2}
      maxDistance={Math.max(dimensions.length, dimensions.width) * 2.5}
      maxPolarAngle={Math.PI / 2 - 0.04}
      onStart={() => {
        activeTransition.current = false;
        userInteractingRef.current = true;
        userHasOrbitedRef.current = true;
      }}
      onEnd={() => {
        userInteractingRef.current = false;
      }}
    />
  );
};

export const RoomCanvas: React.FC<RoomCanvasProps> = ({
  dimensions,
  shell,
  furniture,
  selectedId,
  walkthroughMode,
  cameraPreset,
  cameraPresetTick,
  constructionKey,
  qualityLevel = 'high',
  focusSelectedItem = false,
  zoomCommand = null,
  allowOrbit = true,
  cinematicPreview = false,
  onCinematicStageChange,
  reducedMotion = false,
  deletingIds = [],
  ghostPreview = null,
  hideFurniture = false,
  gridSnap = true,
  showDimensions = true,
  autoRotate = false,
  authShowcaseMode = false,
  interactive = true,
  onSelectFurniture,
  onUpdateFurniturePosition,
  onDragEnd,
  onRegisterCapture,
}) => {
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef(new THREE.Vector3());
  const dragYRef = useRef(0);
  const [contextLost, setContextLost] = useState(false);

  const preset = resolveLightingPreset(shell.lightingPreset);
  const overallBrightness = shell.overallBrightness ?? 1.0;
  const shadowIntensity = shell.shadowIntensity ?? 1.0;
  const lampMultiplier = preset.practicalLampMultiplier * shell.lampGlow * overallBrightness;
  const isNight = isNightLightingPreset(shell.lightingPreset);
  const initialExposure = shell.exposure ?? preset.exposure;
  const contactShadowRes = qualityLevel === 'ultra' ? 1024 : qualityLevel === 'high' ? 512 : 256;

  const selectedPiece = useMemo(
    () => furniture.find((f) => f.instanceId === selectedId) ?? null,
    [furniture, selectedId],
  );

  const draggingPiece = useMemo(
    () => (draggingId ? furniture.find((f) => f.instanceId === draggingId) ?? null : null),
    [furniture, draggingId],
  );

  const ghostCatalogItem = useMemo(
    () => (ghostPreview ? getCatalogItem(ghostPreview.catalogId) : null),
    [ghostPreview],
  );

  const handleStartDrag = useCallback(
    (id: string, e: ThreeEvent<PointerEvent>) => {
      if (!interactive || walkthroughMode || cinematicPreview) return;
      const item = furniture.find((f) => f.instanceId === id);
      if (!item) return;

      onSelectFurniture?.(id);
      dragYRef.current = item.position[1];
      _plane.constant = -item.position[1];
      if (e.ray.intersectPlane(_plane, _hitPoint)) {
        dragOffsetRef.current.set(
          item.position[0] - _hitPoint.x,
          0,
          item.position[2] - _hitPoint.z,
        );
      } else {
        dragOffsetRef.current.set(0, 0, 0);
      }
      setDraggingId(id);
    },
    [furniture, interactive, walkthroughMode, cinematicPreview, onSelectFurniture],
  );

  const handlePointerMoveOnStage = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!draggingId || !onUpdateFurniturePosition) return;
      _plane.constant = -dragYRef.current;
      if (e.ray.intersectPlane(_plane, _hitPoint)) {
        let nx = _hitPoint.x + dragOffsetRef.current.x;
        let nz = _hitPoint.z + dragOffsetRef.current.z;

        if (gridSnap) {
          nx = Math.round(nx * 4) / 4;
          nz = Math.round(nz * 4) / 4;
        }

        const boundX = Math.max(0.4, dimensions.length / 2 - 0.32);
        const boundZ = Math.max(0.4, dimensions.width / 2 - 0.32);
        nx = THREE.MathUtils.clamp(nx, -boundX, boundX);
        nz = THREE.MathUtils.clamp(nz, -boundZ, boundZ);

        onUpdateFurniturePosition(draggingId, [nx, dragYRef.current, nz]);
      }
    },
    [draggingId, dimensions.length, dimensions.width, gridSnap, onUpdateFurniturePosition],
  );

  const stopDragging = useCallback(() => {
    if (draggingId) {
      onDragEnd?.(draggingId);
      setDraggingId(null);
    }
  }, [draggingId, onDragEnd]);

  if (contextLost) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#F4F0E8] text-[#30332F] p-6">
        <div className="text-center max-w-sm">
          <p className="font-display text-xl mb-2">3D Viewport Paused</p>
          <p className="text-sm text-[#5B5D5A] mb-4">
            WebGL context was temporarily interrupted. Click below to restore the architectural scene.
          </p>
          <button
            type="button"
            onClick={() => setContextLost(false)}
            className="px-4 py-2 text-sm font-medium bg-[#30332F] text-[#F4F0E8] rounded-lg"
          >
            Restore 3D Viewport
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative select-none"
      onPointerUp={stopDragging}
      onPointerLeave={stopDragging}
    >
      <Canvas
        shadows={!isSoftwareGl}
        dpr={isSoftwareGl ? 1 : qualityLevel === 'ultra' ? [1, 2] : [1, 1.5]}
        camera={{ fov: 40, near: 0.1, far: 100, position: [5.4, 3.8, 5.4] }}
        gl={{
          alpha: false,
          antialias: !isSoftwareGl,
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: initialExposure,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.domElement.addEventListener('webglcontextlost', (ev) => {
            ev.preventDefault();
            setContextLost(true);
          });
        }}
        onPointerMissed={() => {
          if (interactive && !draggingId && !cinematicPreview) {
            onSelectFurniture?.(null);
          }
        }}
      >
        <StudioEnvironment />
        <CaptureRegistrar onRegisterCapture={onRegisterCapture} />

        <AnimatedLightingRig
          shell={shell}
          dimensions={dimensions}
          isSoftwareGl={isSoftwareGl}
          qualityLevel={qualityLevel}
          authShowcaseMode={authShowcaseMode}
          reducedMotion={reducedMotion}
        />

        <CameraRig
          dimensions={dimensions}
          furniture={furniture}
          walkthroughMode={walkthroughMode}
          cinematicPreview={cinematicPreview}
          onCinematicStageChange={onCinematicStageChange}
          reducedMotion={reducedMotion}
          cameraPreset={cameraPreset}
          cameraPresetTick={cameraPresetTick}
          constructionKey={constructionKey}
          selectedPiece={selectedPiece}
          focusSelectedItem={focusSelectedItem}
          zoomCommand={zoomCommand}
          allowOrbit={allowOrbit}
          autoRotate={autoRotate}
          authShowcaseMode={authShowcaseMode}
          isDraggingFurniture={Boolean(draggingId)}
          isSoftwareGl={isSoftwareGl}
        />

        {/* Invisible Floor Drag Catcher */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.002, 0]}
          onPointerMove={handlePointerMoveOnStage}
          visible={false}
        >
          <planeGeometry args={[dimensions.length + 8, dimensions.width + 8]} />
          <meshBasicMaterial />
        </mesh>

        <RoomArchitecture
          dimensions={dimensions}
          shell={shell}
          walkthroughMode={walkthroughMode}
          constructionKey={constructionKey}
          showDimensions={showDimensions && !cinematicPreview}
          reducedMotion={reducedMotion}
        />

        {/* Floor Alignment Grid & Axis Guides While Dragging Furniture */}
        {draggingPiece && (
          <group position={[0, 0.006, 0]}>
            {gridSnap && (
              <gridHelper
                args={[
                  Math.max(dimensions.length, dimensions.width),
                  Math.round(Math.max(dimensions.length, dimensions.width) * 4),
                  '#78816C',
                  '#B8B0A0',
                ]}
              />
            )}
            <mesh position={[draggingPiece.position[0], 0.002, 0]}>
              <boxGeometry args={[0.012, 0.002, dimensions.width]} />
              <meshBasicMaterial color="#5D6B53" transparent opacity={0.65} />
            </mesh>
            <mesh position={[0, 0.002, draggingPiece.position[2]]}>
              <boxGeometry args={[dimensions.length, 0.002, 0.012]} />
              <meshBasicMaterial color="#5D6B53" transparent opacity={0.65} />
            </mesh>
          </group>
        )}

        {!isSoftwareGl && (
          <ContactShadows
            position={[0, 0.003, 0]}
            resolution={contactShadowRes}
            opacity={THREE.MathUtils.clamp(preset.shadowOpacity * shadowIntensity, 0.18, 0.68)}
            scale={Math.max(dimensions.length, dimensions.width) + 2}
            blur={1.85}
            far={2.8}
          />
        )}

        {/* Ghost Drop Outline & Translucent Preview */}
        {ghostPreview && ghostCatalogItem && (
          <group position={[ghostPreview.x, 0.02, ghostPreview.z]}>
            <mesh position={[0, ghostCatalogItem.height / 2, 0]}>
              <boxGeometry
                args={[ghostCatalogItem.width, ghostCatalogItem.height, ghostCatalogItem.depth]}
              />
              <meshBasicMaterial color="#5D6B53" transparent opacity={0.22} wireframe={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
              <ringGeometry
                args={[
                  Math.max(ghostCatalogItem.width, ghostCatalogItem.depth) * 0.55,
                  Math.max(ghostCatalogItem.width, ghostCatalogItem.depth) * 0.61,
                  40,
                ]}
              />
              <meshBasicMaterial color="#5D6B53" transparent opacity={0.85} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {!hideFurniture &&
          furniture.map((item, idx) => (
            <FurnitureModel
              key={item.instanceId}
              instance={item}
              index={idx}
              constructionKey={constructionKey}
              isSelected={interactive && !cinematicPreview && selectedId === item.instanceId}
              isDeleting={deletingIds.includes(item.instanceId)}
              reducedMotion={reducedMotion}
              lampMultiplier={lampMultiplier}
              isNight={isNight}
              onSelect={(id) => interactive && !cinematicPreview && onSelectFurniture?.(id)}
              onStartDrag={handleStartDrag}
            />
          ))}

        {interactive && (
          <PostProcessingEffects
            qualityLevel={qualityLevel}
            bloomStrength={preset.bloomStrength}
          />
        )}
      </Canvas>
    </div>
  );
};
