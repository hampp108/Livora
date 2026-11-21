import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { RoomDimensions, RoomShellConfig, WallSide } from '../types/room';
import {
  getFloorPBRTextures,
  getOutdoorBackdropTexture,
  getPlasterBumpTexture,
} from './proceduralTextures';
import { isNightLightingPreset, resolveLightingPreset } from './lightingPresets';
import { detectSoftwareWebGL } from './webglCapabilities';

interface RoomArchitectureProps {
  dimensions: RoomDimensions;
  shell: RoomShellConfig;
  walkthroughMode: boolean;
  constructionKey: number;
  showDimensions?: boolean;
  reducedMotion?: boolean;
}

export const RoomArchitecture: React.FC<RoomArchitectureProps> = ({
  dimensions,
  shell,
  walkthroughMode,
  constructionKey,
  showDimensions = true,
  reducedMotion = false,
}) => {
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const { length: L, width: W, height: H } = dimensions;
  const wallT = 0.14;
  const halfL = L / 2;
  const halfW = W / 2;

  const { camera } = useThree();
  const [hiddenWalls, setHiddenWalls] = useState<Record<WallSide, boolean>>({
    front: true,
    back: false,
    left: false,
    right: false,
  });
  const [hideCeiling, setHideCeiling] = useState(true);

  const animProgressRef = useRef(constructionKey > 0 && !reducedMotion ? 0 : 1);
  const floorGroupRef = useRef<THREE.Group>(null);
  const wallsGroupRef = useRef<THREE.Group>(null);
  const trimGroupRef = useRef<THREE.Group>(null);
  const dimGroupRef = useRef<THREE.Group>(null);
  const curtainGroupRef = useRef<THREE.Group>(null);
  const leftCurtainRef = useRef<THREE.Group>(null);
  const rightCurtainRef = useRef<THREE.Group>(null);
  const sheerCurtainRef = useRef<THREE.Mesh>(null);
  const curtainOpenRef = useRef(shell.curtainsOpen ?? 0.72);
  const dustPointsRef = useRef<THREE.Points>(null);
  const chandelierRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);

  useEffect(() => {
    if (constructionKey > 0 && !reducedMotion) {
      animProgressRef.current = 0;
    } else {
      animProgressRef.current = 1;
    }
  }, [constructionKey, reducedMotion]);

  const floorPbr = useMemo(
    () => getFloorPBRTextures(shell.floorMaterial, L, W),
    [shell.floorMaterial, L, W],
  );
  const plasterBump = useMemo(() => getPlasterBumpTexture(), []);
  const isNight = isNightLightingPreset(shell.lightingPreset);
  const outdoorTex = useMemo(() => getOutdoorBackdropTexture(isNight), [isNight]);
  const preset = resolveLightingPreset(shell.lightingPreset);
  const overallBrightness = shell.overallBrightness ?? 1.0;

  const floorRoughness = useMemo(() => {
    switch (shell.floorMaterial) {
      case 'polished-marble':
        return 0.22;
      case 'ceramic-tile':
        return 0.32;
      case 'polished-concrete':
        return 0.36;
      case 'smoked-walnut':
        return 0.4;
      case 'warm-travertine':
        return 0.44;
      case 'herringbone-oak':
        return 0.46;
      case 'plush-carpet':
        return 0.95;
      default:
        return 0.48;
    }
  }, [shell.floorMaterial]);

  // Drifting dust particles in sunbeam
  const dustGeometry = useMemo(() => {
    const count = 80;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * L * 0.72;
      positions[i * 3 + 1] = 0.35 + Math.random() * (H - 0.65);
      positions[i * 3 + 2] = (Math.random() - 0.5) * W * 0.72;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [L, W, H]);

  // Starry ceiling points
  const starsGeometry = useMemo(() => {
    const count = 140;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * (L - 0.4);
      positions[i * 3 + 1] = H - 0.015;
      positions[i * 3 + 2] = (Math.random() - 0.5) * (W - 0.4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [L, W, H]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();

    // Coordinated room construction animation
    if (animProgressRef.current < 1) {
      animProgressRef.current = Math.min(1, animProgressRef.current + dt * 0.62);
      const p = animProgressRef.current;

      if (dimGroupRef.current) {
        const dScale = THREE.MathUtils.smoothstep(p, 0.0, 0.22);
        dimGroupRef.current.scale.set(dScale, 1, dScale);
      }
      if (floorGroupRef.current) {
        const fScale = THREE.MathUtils.smoothstep(p, 0.08, 0.36);
        floorGroupRef.current.scale.set(Math.max(0.01, fScale), 1, Math.max(0.01, fScale));
      }
      if (wallsGroupRef.current) {
        const wScale = THREE.MathUtils.smoothstep(p, 0.24, 0.64);
        wallsGroupRef.current.scale.set(1, Math.max(0.005, wScale), 1);
        wallsGroupRef.current.visible = p > 0.22;
      }
      if (trimGroupRef.current) {
        const tScale = THREE.MathUtils.smoothstep(p, 0.52, 0.9);
        trimGroupRef.current.scale.set(1, Math.max(0.005, tScale), 1);
        trimGroupRef.current.visible = p > 0.5;
      }
    } else {
      if (dimGroupRef.current) dimGroupRef.current.scale.set(1, 1, 1);
      if (floorGroupRef.current) floorGroupRef.current.scale.set(1, 1, 1);
      if (wallsGroupRef.current) {
        wallsGroupRef.current.scale.set(1, 1, 1);
        wallsGroupRef.current.visible = true;
      }
      if (trimGroupRef.current) {
        trimGroupRef.current.scale.set(1, 1, 1);
        trimGroupRef.current.visible = true;
      }
    }

    // Smooth curtain open/close + gentle airflow sway
    const targetOpen = shell.curtainsOpen ?? 0.72;
    curtainOpenRef.current = reducedMotion
      ? targetOpen
      : THREE.MathUtils.damp(curtainOpenRef.current, targetOpen, 6, dt);

    const openFrac = curtainOpenRef.current;
    const wallSpan =
      shell.windowWall === 'back' || shell.windowWall === 'front' ? L : W;
    const count = Math.max(1, Math.min(3, shell.windowCount));
    const winW = Math.min(1.42, (wallSpan - 0.8) / count - 0.22);
    const spanW = Math.min(wallSpan - 0.3, count * (winW + 0.25) + 0.45);
    const openOffset = THREE.MathUtils.lerp(spanW * 0.22, spanW * 0.48, openFrac);
    const bunchScaleX = THREE.MathUtils.lerp(1.55, 0.85, openFrac);

    if (leftCurtainRef.current && rightCurtainRef.current) {
      leftCurtainRef.current.position.x = -openOffset;
      rightCurtainRef.current.position.x = openOffset;
      leftCurtainRef.current.scale.x = bunchScaleX;
      rightCurtainRef.current.scale.x = bunchScaleX;

      if (!reducedMotion) {
        const sway = Math.sin(t * 0.85) * 0.011 * (0.4 + openFrac * 0.6);
        leftCurtainRef.current.rotation.z = sway;
        rightCurtainRef.current.rotation.z = -sway * 0.9;
      } else {
        leftCurtainRef.current.rotation.z = 0;
        rightCurtainRef.current.rotation.z = 0;
      }
    }
    if (sheerCurtainRef.current) {
      const mat = sheerCurtainRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.lerp(0.42, 0.2, openFrac);
    }

    // Slow dust particle drift
    if (dustPointsRef.current && !reducedMotion) {
      dustPointsRef.current.rotation.y = Math.sin(t * 0.08) * 0.04;
      dustPointsRef.current.position.y = Math.sin(t * 0.45) * 0.04;
    }

    // Gentle chandelier rotation & starry twinkle
    if (chandelierRef.current && !reducedMotion) {
      chandelierRef.current.rotation.y = Math.sin(t * 0.16) * 0.03;
    }
    if (starsRef.current) {
      const mat = starsRef.current.material as THREE.PointsMaterial;
      mat.opacity = isNight ? 0.62 + (reducedMotion ? 0 : Math.sin(t * 2.0) * 0.25) : 0.22;
    }

    // Cutaway walls based on camera position
    if (walkthroughMode) {
      if (
        hiddenWalls.front ||
        hiddenWalls.back ||
        hiddenWalls.left ||
        hiddenWalls.right ||
        hideCeiling
      ) {
        setHiddenWalls({ front: false, back: false, left: false, right: false });
        setHideCeiling(false);
      }
      return;
    }

    const nextFront = camera.position.z > halfW + 0.35;
    const nextBack = camera.position.z < -halfW - 0.35;
    const nextRight = camera.position.x > halfL + 0.35;
    const nextLeft = camera.position.x < -halfL - 0.35;
    const nextCeil = camera.position.y > H * 0.78;

    if (
      nextFront !== hiddenWalls.front ||
      nextBack !== hiddenWalls.back ||
      nextRight !== hiddenWalls.right ||
      nextLeft !== hiddenWalls.left
    ) {
      setHiddenWalls({
        front: nextFront,
        back: nextBack,
        left: nextLeft,
        right: nextRight,
      });
    }
    if (nextCeil !== hideCeiling) {
      setHideCeiling(nextCeil);
    }
  });

  // Volumetric sunbeam position/orientation inside window wall
  const sunbeamTransform = useMemo(() => {
    switch (shell.windowWall) {
      case 'right':
        return { pos: [halfL - 1.15, H * 0.44, 0] as [number, number, number], rot: [0, 0, 0.62] as [number, number, number] };
      case 'left':
        return { pos: [-halfL + 1.15, H * 0.44, 0] as [number, number, number], rot: [0, 0, -0.62] as [number, number, number] };
      case 'back':
        return { pos: [0, H * 0.44, -halfW + 1.15] as [number, number, number], rot: [-0.62, 0, 0] as [number, number, number] };
      case 'front':
        return { pos: [0, H * 0.44, halfW - 1.15] as [number, number, number], rot: [0.62, 0, 0] as [number, number, number] };
    }
  }, [shell.windowWall, halfL, halfW, H]);

  const renderWindowsOnWall = (side: WallSide) => {
    if (shell.windowWall !== side || hiddenWalls[side]) return null;
    const count = Math.max(1, Math.min(3, shell.windowCount));
    const wallSpan = side === 'back' || side === 'front' ? L : W;
    const winW = Math.min(1.42, (wallSpan - 0.8) / count - 0.22);
    const winH = Math.min(1.98, H - 0.72);
    const winY = 0.46 + winH / 2;

    const slots: number[] = [];
    for (let i = 0; i < count; i++) {
      slots.push((i - (count - 1) / 2) * (winW + 0.25));
    }

    const transform = (): { pos: [number, number, number]; rotY: number } => {
      switch (side) {
        case 'back':
          return { pos: [0, 0, -halfW + 0.012], rotY: 0 };
        case 'front':
          return { pos: [0, 0, halfW - 0.012], rotY: Math.PI };
        case 'left':
          return { pos: [-halfL + 0.012, 0, 0], rotY: Math.PI / 2 };
        case 'right':
          return { pos: [halfL - 0.012, 0, 0], rotY: -Math.PI / 2 };
      }
    };

    const { pos, rotY } = transform();

    return (
      <group position={pos} rotation={[0, rotY, 0]}>
        {slots.map((offsetX, idx) => (
          <group key={idx} position={[offsetX, winY, 0]}>
            {/* Outer architectural frame */}
            <mesh position={[0, winH / 2, 0.03]} castShadow>
              <boxGeometry args={[winW + 0.1, 0.06, 0.08]} />
              <meshStandardMaterial color={shell.windowFrameColor} roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[0, -winH / 2, 0.03]} castShadow>
              <boxGeometry args={[winW + 0.14, 0.07, 0.11]} />
              <meshStandardMaterial color={shell.windowFrameColor} roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[-winW / 2, 0, 0.03]} castShadow>
              <boxGeometry args={[0.06, winH, 0.08]} />
              <meshStandardMaterial color={shell.windowFrameColor} roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[winW / 2, 0, 0.03]} castShadow>
              <boxGeometry args={[0.06, winH, 0.08]} />
              <meshStandardMaterial color={shell.windowFrameColor} roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.03]} castShadow>
              <boxGeometry args={[0.032, winH, 0.06]} />
              <meshStandardMaterial color={shell.windowFrameColor} roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[0, winH * 0.18, 0.03]} castShadow>
              <boxGeometry args={[winW, 0.03, 0.06]} />
              <meshStandardMaterial color={shell.windowFrameColor} roughness={0.3} metalness={0.6} />
            </mesh>

            {/* Exterior scenic sky + foliage backdrop */}
            <mesh position={[0, 0, 0.005]}>
              <planeGeometry args={[winW - 0.04, winH - 0.04]} />
              <meshStandardMaterial
                map={outdoorTex}
                emissive={preset.windowGlowColor}
                emissiveMap={outdoorTex}
                emissiveIntensity={preset.windowGlowIntensity * overallBrightness}
                roughness={0.95}
                envMapIntensity={0.2}
              />
            </mesh>

            {/* Glass pane */}
            <mesh position={[0, 0, 0.028]}>
              <planeGeometry args={[winW - 0.04, winH - 0.04]} />
              <meshPhysicalMaterial
                color="#EDF4FA"
                roughness={0.05}
                metalness={0.05}
                transparent
                opacity={isSoftwareGl ? 0.28 : 0.18}
                reflectivity={0.85}
                clearcoat={0.8}
              />
            </mesh>
          </group>
        ))}

        {/* Layered floor-to-ceiling sheer & animated open/close linen curtains */}
        {shell.hasCurtains && (
          <group position={[0, H / 2, 0.095]}>
            <mesh position={[0, H / 2 - 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry
                args={[0.015, 0.015, Math.min(wallSpan - 0.25, count * (winW + 0.25) + 0.65), 12]}
              />
              <meshStandardMaterial color="#252625" roughness={0.28} metalness={0.8} />
            </mesh>
            {/* Sheer inner veil */}
            <mesh ref={sheerCurtainRef} position={[0, -0.08, -0.022]}>
              <planeGeometry args={[Math.min(wallSpan - 0.55, count * (winW + 0.22)), H - 0.2]} />
              <meshStandardMaterial
                color="#ECE8DF"
                transparent
                opacity={0.26}
                roughness={0.95}
                envMapIntensity={0.18}
                side={THREE.DoubleSide}
              />
            </mesh>
            <group ref={curtainGroupRef}>
              {[-1, 1].map((dir) => {
                const spanW = Math.min(wallSpan - 0.35, count * (winW + 0.25) + 0.4);
                const panelX = dir * (spanW / 2 - 0.16);
                return (
                  <group
                    key={dir}
                    ref={dir < 0 ? leftCurtainRef : rightCurtainRef}
                    position={[panelX, -0.08, 0]}
                  >
                    {[0, 1, 2, 3, 4].map((pleat) => (
                      <mesh
                        key={pleat}
                        position={[(pleat - 2) * 0.068, 0, Math.sin(pleat * 1.4) * 0.018]}
                        castShadow
                        receiveShadow
                      >
                        <cylinderGeometry args={[0.038, 0.046, H - 0.18, 10]} />
                        <meshStandardMaterial
                          color={shell.curtainColor}
                          roughness={0.94}
                          envMapIntensity={0.2}
                        />
                      </mesh>
                    ))}
                  </group>
                );
              })}
            </group>
          </group>
        )}
      </group>
    );
  };

  const renderDoorOnWall = (side: WallSide) => {
    if (shell.doorWall !== side || hiddenWalls[side]) return null;
    const doorW = 0.92;
    const doorH = Math.min(2.15, H - 0.35);
    const doorOffset = shell.windowWall === side ? -1.45 : 0.95;

    const transform = (): { pos: [number, number, number]; rotY: number } => {
      switch (side) {
        case 'back':
          return { pos: [doorOffset, 0, -halfW + 0.01], rotY: 0 };
        case 'front':
          return { pos: [-doorOffset, 0, halfW - 0.01], rotY: Math.PI };
        case 'left':
          return { pos: [-halfL + 0.01, 0, doorOffset], rotY: Math.PI / 2 };
        case 'right':
          return { pos: [halfL - 0.01, 0, -doorOffset], rotY: -Math.PI / 2 };
      }
    };

    const { pos, rotY } = transform();

    return (
      <group position={pos} rotation={[0, rotY, 0]}>
        <mesh position={[0, doorH + 0.03, 0.02]} castShadow>
          <boxGeometry args={[doorW + 0.14, 0.07, 0.06]} />
          <meshStandardMaterial color={shell.baseboardColor} roughness={0.52} />
        </mesh>
        <mesh position={[-doorW / 2 - 0.035, doorH / 2, 0.02]} castShadow>
          <boxGeometry args={[0.07, doorH, 0.06]} />
          <meshStandardMaterial color={shell.baseboardColor} roughness={0.52} />
        </mesh>
        <mesh position={[doorW / 2 + 0.035, doorH / 2, 0.02]} castShadow>
          <boxGeometry args={[0.07, doorH, 0.06]} />
          <meshStandardMaterial color={shell.baseboardColor} roughness={0.52} />
        </mesh>
        <mesh position={[0, doorH / 2, 0.015]} castShadow receiveShadow>
          <boxGeometry args={[doorW, doorH, 0.04]} />
          <meshStandardMaterial color="#8B6849" roughness={0.5} metalness={0.04} />
        </mesh>
        <mesh position={[0, doorH * 0.65, 0.037]}>
          <boxGeometry args={[doorW * 0.68, doorH * 0.34, 0.01]} />
          <meshStandardMaterial color="#7D5C3F" roughness={0.56} />
        </mesh>
        <mesh position={[0, doorH * 0.25, 0.037]}>
          <boxGeometry args={[doorW * 0.68, doorH * 0.28, 0.01]} />
          <meshStandardMaterial color="#7D5C3F" roughness={0.56} />
        </mesh>
        <mesh position={[doorW * 0.36, 1.0, 0.055]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.13, 10]} />
          <meshStandardMaterial color="#C5A059" roughness={0.2} metalness={0.92} />
        </mesh>
        <mesh position={[doorW * 0.41, 1.0, 0.042]}>
          <cylinderGeometry args={[0.024, 0.024, 0.015, 12]} />
          <meshStandardMaterial color="#C5A059" roughness={0.2} metalness={0.92} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      {/* Subtle Architectural Dimension Guides on Floor */}
      {showDimensions && (
        <group ref={dimGroupRef} position={[0, 0.004, 0]}>
          <mesh position={[0, 0, halfW + 0.28]}>
            <boxGeometry args={[L, 0.004, 0.014]} />
            <meshBasicMaterial color="#8D877B" transparent opacity={0.55} />
          </mesh>
          <mesh position={[-halfL - 0.28, 0, 0]}>
            <boxGeometry args={[0.014, 0.004, W]} />
            <meshBasicMaterial color="#8D877B" transparent opacity={0.55} />
          </mesh>
        </group>
      )}

      {/* Architectural Floor Slab with PBR normal, roughness & subtle reflection */}
      <group ref={floorGroupRef}>
        <mesh position={[0, -0.06, 0]} receiveShadow>
          <boxGeometry args={[L + wallT * 2, 0.12, W + wallT * 2]} />
          <meshStandardMaterial
            map={floorPbr.map}
            normalMap={floorPbr.normalMap}
            normalScale={new THREE.Vector2(0.45, 0.45)}
            roughnessMap={floorPbr.roughnessMap}
            bumpMap={floorPbr.bumpMap}
            bumpScale={shell.floorMaterial === 'plush-carpet' ? 0.01 : 0.004}
            roughness={floorRoughness}
            metalness={shell.floorMaterial === 'polished-marble' ? 0.06 : 0.02}
            envMapIntensity={shell.floorMaterial === 'polished-marble' ? 0.45 : 0.26}
          />
        </mesh>
        <mesh position={[0, -0.14, 0]} receiveShadow>
          <boxGeometry args={[L + wallT * 2 + 0.18, 0.05, W + wallT * 2 + 0.18]} />
          <meshStandardMaterial color="#BFB7A8" roughness={0.9} envMapIntensity={0.14} />
        </mesh>
      </group>

      {/* Walls, Crown Molding, Slatted Architectural Screens & Acoustic Panels */}
      <group ref={wallsGroupRef}>
        {/* Back Wall (-Z) */}
        {!hiddenWalls.back && (
          <group>
            <mesh position={[0, H / 2, -halfW - wallT / 2]} castShadow receiveShadow>
              <boxGeometry args={[L + wallT * 2, H, wallT]} />
              <meshStandardMaterial
                color={shell.hasAccentWall ? shell.accentWallColor : shell.wallColor}
                bumpMap={plasterBump}
                bumpScale={0.007}
                roughness={0.93}
                metalness={0.0}
                envMapIntensity={0.14}
              />
            </mesh>
            {/* Baseboard & Crown Molding */}
            <mesh position={[0, 0.055, -halfW + 0.012]} receiveShadow>
              <boxGeometry args={[L, 0.11, 0.024]} />
              <meshStandardMaterial color={shell.baseboardColor} roughness={0.64} envMapIntensity={0.18} />
            </mesh>
            <mesh position={[0, H - 0.045, -halfW + 0.014]}>
              <boxGeometry args={[L, 0.08, 0.028]} />
              <meshStandardMaterial color={shell.baseboardColor} roughness={0.66} envMapIntensity={0.18} />
            </mesh>

            {/* Architectural Smoked Bronze Grid Mirror / Plaster Relief Paneling on Back Wall */}
            {shell.hasAccentWall && (
              <group position={[0, H / 2, -halfW + 0.014]}>
                {[-1.0, -0.34, 0.34, 1.0].map((gx, i) => (
                  <mesh key={`v-${i}`} position={[gx, 0, 0]}>
                    <boxGeometry args={[0.012, H - 0.18, 0.012]} />
                    <meshStandardMaterial color="#4D443B" roughness={0.28} metalness={0.75} />
                  </mesh>
                ))}
                {[-0.45, 0.45].map((gy, i) => (
                  <mesh key={`h-${i}`} position={[0, gy, 0]}>
                    <boxGeometry args={[2.2, 0.012, 0.012]} />
                    <meshStandardMaterial color="#4D443B" roughness={0.28} metalness={0.75} />
                  </mesh>
                ))}
              </group>
            )}

            {/* Vertical Slatted Timber & Bronze Screens flanking headboard / center */}
            {shell.hasSlattedScreens &&
              [-L * 0.34, L * 0.34].map((sx, sIdx) => (
                <group key={sIdx} position={[sx, H / 2, -halfW + 0.04]}>
                  <mesh position={[0, 0, -0.01]}>
                    <boxGeometry args={[0.72, H - 0.12, 0.012]} />
                    <meshStandardMaterial color="#3A3128" roughness={0.34} metalness={0.22} envMapIntensity={0.25} />
                  </mesh>
                  {Array.from({ length: 9 }).map((_, k) => (
                    <mesh key={k} position={[(k - 4) * 0.08, 0, 0.01]} castShadow>
                      <boxGeometry args={[0.022, H - 0.14, 0.032]} />
                      <meshStandardMaterial color="#5E4632" roughness={0.52} metalness={0.08} envMapIntensity={0.28} />
                    </mesh>
                  ))}
                </group>
              ))}

            {/* Acoustic Grooved Wall Panels for Theater / Gaming */}
            {shell.hasAcousticPanels &&
              [-L * 0.32, 0, L * 0.32].map((ax, idx) => (
                <group key={idx} position={[ax, H * 0.5, -halfW + 0.02]}>
                  {Array.from({ length: 7 }).map((_, sl) => (
                    <mesh key={sl} position={[(sl - 3) * 0.09, 0, 0]} castShadow>
                      <boxGeometry args={[0.05, H * 0.72, 0.025]} />
                      <meshStandardMaterial color="#1F2020" roughness={0.85} envMapIntensity={0.14} />
                    </mesh>
                  ))}
                </group>
              ))}
          </group>
        )}

        {/* Front Wall (+Z) */}
        {!hiddenWalls.front && (
          <group>
            <mesh position={[0, H / 2, halfW + wallT / 2]} castShadow receiveShadow>
              <boxGeometry args={[L + wallT * 2, H, wallT]} />
              <meshStandardMaterial
                color={shell.wallColor}
                bumpMap={plasterBump}
                bumpScale={0.007}
                roughness={0.93}
                metalness={0.0}
                envMapIntensity={0.14}
              />
            </mesh>
            <mesh position={[0, 0.055, halfW - 0.012]} receiveShadow>
              <boxGeometry args={[L, 0.11, 0.024]} />
              <meshStandardMaterial color={shell.baseboardColor} roughness={0.64} envMapIntensity={0.18} />
            </mesh>
          </group>
        )}

        {/* Left Wall (-X) */}
        {!hiddenWalls.left && (
          <group>
            <mesh position={[-halfL - wallT / 2, H / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[wallT, H, W]} />
              <meshStandardMaterial
                color={shell.wallColor}
                bumpMap={plasterBump}
                bumpScale={0.007}
                roughness={0.93}
                metalness={0.0}
                envMapIntensity={0.14}
              />
            </mesh>
            <mesh position={[-halfL + 0.012, 0.055, 0]} receiveShadow>
              <boxGeometry args={[0.024, 0.11, W]} />
              <meshStandardMaterial color={shell.baseboardColor} roughness={0.64} envMapIntensity={0.18} />
            </mesh>
            <mesh position={[-halfL + 0.014, H - 0.045, 0]}>
              <boxGeometry args={[0.028, 0.08, W]} />
              <meshStandardMaterial color={shell.baseboardColor} roughness={0.66} envMapIntensity={0.18} />
            </mesh>
          </group>
        )}

        {/* Right Wall (+X) */}
        {!hiddenWalls.right && (
          <group>
            <mesh position={[halfL + wallT / 2, H / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[wallT, H, W]} />
              <meshStandardMaterial
                color={shell.wallColor}
                bumpMap={plasterBump}
                bumpScale={0.007}
                roughness={0.93}
                metalness={0.0}
                envMapIntensity={0.14}
              />
            </mesh>
            <mesh position={[halfL - 0.012, 0.055, 0]} receiveShadow>
              <boxGeometry args={[0.024, 0.11, W]} />
              <meshStandardMaterial color={shell.baseboardColor} roughness={0.64} envMapIntensity={0.18} />
            </mesh>
            <mesh position={[halfL - 0.014, H - 0.045, 0]}>
              <boxGeometry args={[0.028, 0.08, W]} />
              <meshStandardMaterial color={shell.baseboardColor} roughness={0.66} envMapIntensity={0.18} />
            </mesh>
          </group>
        )}
      </group>

      {/* Volumetric Window Light Shaft & Drifting Dust Particles */}
      {!isNight && shell.sunIntensity > 0.4 && (
        <group>
          <mesh position={sunbeamTransform.pos} rotation={sunbeamTransform.rot}>
            <cylinderGeometry args={[0.55, 1.45, 2.8, 18, 1, true]} />
            <meshBasicMaterial
              color={preset.sunColor}
              transparent
              opacity={isSoftwareGl ? 0.02 : 0.036 * Math.min(1.2, shell.sunIntensity)}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {!isSoftwareGl && (
            <points ref={dustPointsRef} geometry={dustGeometry}>
              <pointsMaterial
                color="#FFF4DF"
                size={0.016}
                transparent
                opacity={0.34}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </points>
          )}
        </group>
      )}

      {/* Windows, Doors, Ceiling & Chandelier/Pendant */}
      <group ref={trimGroupRef}>
        {renderWindowsOnWall('back')}
        {renderWindowsOnWall('front')}
        {renderWindowsOnWall('left')}
        {renderWindowsOnWall('right')}

        {renderDoorOnWall('back')}
        {renderDoorOnWall('front')}
        {renderDoorOnWall('left')}
        {renderDoorOnWall('right')}

        {!hideCeiling && (
          <group>
            <mesh position={[0, H + 0.06, 0]} receiveShadow>
              <boxGeometry args={[L + wallT * 2, 0.12, W + wallT * 2]} />
              <meshStandardMaterial color={shell.ceilingColor} roughness={0.94} envMapIntensity={0.14} />
            </mesh>

            {shell.ceilingType === 'exposed-beams' &&
              [-1, 0, 1].map((idx) => (
                <mesh
                  key={idx}
                  position={[idx * (L * 0.28), H - 0.07, 0]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[0.14, 0.14, W]} />
                  <meshStandardMaterial color="#7C5C40" roughness={0.62} envMapIntensity={0.22} />
                </mesh>
              ))}

            {shell.ceilingType === 'recessed-cove' && (
              <group position={[0, H - 0.04, 0]}>
                <mesh>
                  <boxGeometry args={[L - 0.65, 0.06, W - 0.65]} />
                  <meshStandardMaterial color={shell.ceilingColor} roughness={0.93} envMapIntensity={0.14} />
                </mesh>
                <mesh position={[0, 0.025, 0]}>
                  <boxGeometry args={[L - 0.56, 0.016, W - 0.56]} />
                  <meshStandardMaterial
                    color="#FFE0B2"
                    emissive="#FFD18E"
                    emissiveIntensity={0.26 * preset.practicalLampMultiplier * shell.lampGlow * overallBrightness}
                  />
                </mesh>
              </group>
            )}

            {shell.ceilingType === 'starry-cinema' && (
              <points ref={starsRef} geometry={starsGeometry}>
                <pointsMaterial
                  color="#FFF4D9"
                  size={0.032}
                  transparent
                  opacity={0.7}
                  depthWrite={false}
                />
              </points>
            )}

            {/* Multi-tier Fluted Glass Chandelier OR Architectural Linen Pendant */}
            {shell.hasChandelier ? (
              <group ref={chandelierRef} position={[0, H - 0.42, 0]}>
                <mesh position={[0, 0.36, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 0.03, 18]} />
                  <meshStandardMaterial color="#B8934E" roughness={0.22} metalness={0.9} />
                </mesh>
                <mesh position={[0, 0.18, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.38, 10]} />
                  <meshStandardMaterial color="#B8934E" roughness={0.24} metalness={0.9} />
                </mesh>
                {/* Brass ring arms + fluted amber-white glass tubes */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                  const ang = (idx / 8) * Math.PI * 2;
                  const rad = idx % 2 === 0 ? 0.34 : 0.22;
                  const yOff = idx % 2 === 0 ? -0.02 : -0.14;
                  const rx = Math.cos(ang) * rad;
                  const rz = Math.sin(ang) * rad;
                  return (
                    <group key={idx} position={[rx, yOff, rz]}>
                      <mesh position={[-rx * 0.5, 0.08, -rz * 0.5]} rotation={[0, -ang, Math.PI / 2]}>
                        <cylinderGeometry args={[0.008, 0.008, rad, 8]} />
                        <meshStandardMaterial color="#B8934E" roughness={0.24} metalness={0.9} />
                      </mesh>
                      <mesh castShadow>
                        <cylinderGeometry args={[0.055, 0.055, 0.22, 16]} />
                        <meshStandardMaterial
                          color="#F5E8CE"
                          emissive="#FFCF8C"
                          emissiveIntensity={0.55 * preset.practicalLampMultiplier * shell.lampGlow * overallBrightness}
                          roughness={0.34}
                          transparent
                          opacity={0.92}
                        />
                      </mesh>
                    </group>
                  );
                })}
                {preset.practicalLampMultiplier * shell.lampGlow > 0.3 && (
                  <pointLight
                    position={[0, -0.15, 0]}
                    color="#FFDCA6"
                    intensity={0.68 * preset.practicalLampMultiplier * shell.lampGlow * overallBrightness}
                    distance={6.2}
                    decay={2}
                  />
                )}
              </group>
            ) : (
              <group position={[0, H - 0.44, 0]}>
                <mesh position={[0, 0.24, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.44, 8]} />
                  <meshStandardMaterial color="#252625" roughness={0.3} metalness={0.8} />
                </mesh>
                <mesh position={[0, 0.43, 0]}>
                  <cylinderGeometry args={[0.07, 0.07, 0.03, 16]} />
                  <meshStandardMaterial color="#B8934E" roughness={0.25} metalness={0.85} />
                </mesh>
                <mesh castShadow>
                  <cylinderGeometry args={[0.24, 0.34, 0.18, 28, 1, true]} />
                  <meshStandardMaterial color="#DFD8CA" roughness={0.9} envMapIntensity={0.16} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, -0.02, 0]}>
                  <sphereGeometry args={[0.065, 16, 16]} />
                  <meshStandardMaterial
                    color="#F7E8C9"
                    emissive="#FFD598"
                    emissiveIntensity={0.68 * preset.practicalLampMultiplier * shell.lampGlow * overallBrightness}
                  />
                </mesh>
              </group>
            )}
          </group>
        )}
      </group>
    </group>
  );
};
