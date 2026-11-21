import * as THREE from 'three';
import { getCatalogItem } from '../data/catalog';
import { FloorMaterial, FurnitureInstance, RoomProject } from '../types/room';
import { isNightLightingPreset, resolveLightingPreset } from './lightingPresets';

const FLOOR_HEX: Record<FloorMaterial, string> = {
  'white-oak': '#C8AF8C',
  'herringbone-oak': '#CFAF86',
  'smoked-walnut': '#5D4433',
  'polished-concrete': '#B8B3AA',
  'warm-travertine': '#D4C8B4',
  'polished-marble': '#DED9CF',
  'ceramic-tile': '#D5CFC4',
  'plush-carpet': '#BEB6A9',
};

const THUMB_WIDTH = 380;
const THUMB_HEIGHT = 238;

const thumbnailCache = new Map<string, string>();
const inFlightCallbacks = new Map<string, Array<(url: string | null) => void>>();

interface QueueTask {
  sig: string;
  project: RoomProject;
}

const renderQueue: QueueTask[] = [];
let isProcessing = false;
let sharedRenderer: THREE.WebGLRenderer | null = null;
let rendererUnavailable = false;

function getSharedRenderer(): THREE.WebGLRenderer | null {
  if (rendererUnavailable) return null;
  if (sharedRenderer) return sharedRenderer;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = THUMB_WIDTH;
    canvas.height = THUMB_HEIGHT;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'default',
    });
    renderer.setSize(THUMB_WIDTH, THUMB_HEIGHT, false);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.74;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    sharedRenderer = renderer;
    return sharedRenderer;
  } catch {
    rendererUnavailable = true;
    return null;
  }
}

export function buildProjectThumbnailSignature(project: RoomProject): string {
  const fSig = project.furniture
    .map(
      (f) =>
        `${f.catalogId}:${f.position[0].toFixed(2)},${f.position[2].toFixed(2)}:${f.rotationY.toFixed(2)}:${f.scale.toFixed(2)}:${f.primaryColor}:${f.secondaryColor}`,
    )
    .join('|');
  return [
    project.id,
    project.dimensions.length.toFixed(2),
    project.dimensions.width.toFixed(2),
    project.dimensions.height.toFixed(2),
    project.shell.wallColor,
    project.shell.hasAccentWall ? project.shell.accentWallColor : 'none',
    project.shell.floorMaterial,
    project.shell.windowWall,
    project.shell.lightingPreset,
    fSig,
  ].join('~');
}

function addFurnitureProxy(
  parent: THREE.Group,
  inst: FurnitureInstance,
  disposables: Array<{ dispose: () => void }>,
) {
  const cat = getCatalogItem(inst.catalogId);
  const w = (cat?.width ?? 0.9) * inst.scale;
  const h = (cat?.height ?? 0.8) * inst.scale;
  const d = (cat?.depth ?? 0.9) * inst.scale;

  const group = new THREE.Group();
  group.position.set(inst.position[0], inst.position[1], inst.position[2]);
  group.rotation.y = inst.rotationY;

  const track = <T extends { dispose: () => void }>(res: T): T => {
    disposables.push(res);
    return res;
  };

  const primaryMat = track(
    new THREE.MeshStandardMaterial({
      color: inst.primaryColor,
      roughness: cat?.category === 'Rugs' ? 0.92 : 0.62,
      metalness: 0.04,
    }),
  );
  const secondaryMat = track(
    new THREE.MeshStandardMaterial({
      color: inst.secondaryColor,
      roughness: 0.55,
      metalness: 0.08,
    }),
  );
  const pillowMat = track(
    new THREE.MeshStandardMaterial({
      color: '#EAE4DA',
      roughness: 0.9,
      metalness: 0,
    }),
  );

  const boxMesh = (
    bw: number,
    bh: number,
    bd: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
  ) => {
    const geo = track(new THREE.BoxGeometry(bw, bh, bd));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  switch (cat?.category) {
    case 'Beds': {
      // Frame plinth
      boxMesh(w, h * 0.24, d, 0, h * 0.16, 0, secondaryMat);
      // Mattress
      boxMesh(w * 0.94, h * 0.22, d * 0.9, 0, h * 0.38, d * 0.03, pillowMat);
      // Duvet fold
      boxMesh(w * 0.96, h * 0.24, d * 0.62, 0, h * 0.4, d * 0.17, primaryMat);
      // Headboard
      boxMesh(w * 1.04, h * 0.92, 0.1, 0, h * 0.52, -d * 0.46, secondaryMat);
      // Pillows
      boxMesh(w * 0.36, 0.14, 0.42, -w * 0.22, h * 0.55, -d * 0.31, pillowMat);
      boxMesh(w * 0.36, 0.14, 0.42, w * 0.22, h * 0.55, -d * 0.31, pillowMat);
      break;
    }
    case 'Sofas': {
      boxMesh(w, h * 0.34, d * 0.88, 0, h * 0.24, d * 0.05, primaryMat);
      boxMesh(w, h * 0.62, d * 0.22, 0, h * 0.52, -d * 0.36, primaryMat);
      if (w > 1.0) {
        boxMesh(0.16, h * 0.52, d * 0.88, -w * 0.46, h * 0.36, d * 0.04, secondaryMat);
        boxMesh(0.16, h * 0.52, d * 0.88, w * 0.46, h * 0.36, d * 0.04, secondaryMat);
      }
      break;
    }
    case 'Tables': {
      const topThick = Math.max(0.04, h * 0.09);
      boxMesh(w, topThick, d, 0, h - topThick / 2, 0, primaryMat);
      const legH = h - topThick;
      const lx = w * 0.4;
      const lz = d * 0.38;
      boxMesh(0.055, legH, 0.055, -lx, legH / 2, -lz, secondaryMat);
      boxMesh(0.055, legH, 0.055, lx, legH / 2, -lz, secondaryMat);
      boxMesh(0.055, legH, 0.055, -lx, legH / 2, lz, secondaryMat);
      boxMesh(0.055, legH, 0.055, lx, legH / 2, lz, secondaryMat);
      break;
    }
    case 'Wardrobes':
    case 'Cabinets':
    case 'Shelves': {
      boxMesh(w, h, d, 0, h / 2, 0, primaryMat);
      boxMesh(w * 0.03, h * 0.94, d * 0.04, 0, h / 2, d * 0.5, secondaryMat);
      break;
    }
    case 'Plants': {
      const potGeo = track(new THREE.CylinderGeometry(w * 0.32, w * 0.24, h * 0.34, 12));
      const pot = new THREE.Mesh(potGeo, secondaryMat);
      pot.position.y = h * 0.17;
      pot.castShadow = true;
      group.add(pot);

      const leafMat = track(
        new THREE.MeshStandardMaterial({ color: '#4E6145', roughness: 0.72, metalness: 0.02 }),
      );
      const crownGeo = track(new THREE.SphereGeometry(w * 0.42, 12, 10));
      const crown = new THREE.Mesh(crownGeo, leafMat);
      crown.position.y = h * 0.65;
      crown.scale.set(1, 1.15, 1);
      crown.castShadow = true;
      group.add(crown);
      break;
    }
    case 'Lamps': {
      boxMesh(w * 0.48, 0.04, d * 0.48, 0, 0.02, 0, secondaryMat);
      const poleGeo = track(new THREE.CylinderGeometry(0.022, 0.025, h * 0.72, 8));
      const pole = new THREE.Mesh(poleGeo, secondaryMat);
      pole.position.y = h * 0.38;
      group.add(pole);
      const shadeMat = track(
        new THREE.MeshStandardMaterial({
          color: '#E6D6BC',
          emissive: '#FFB96E',
          emissiveIntensity: 0.45,
          roughness: 0.78,
        }),
      );
      const shadeGeo = track(new THREE.CylinderGeometry(w * 0.28, w * 0.4, h * 0.24, 14));
      const shade = new THREE.Mesh(shadeGeo, shadeMat);
      shade.position.y = h * 0.84;
      group.add(shade);
      break;
    }
    case 'Rugs': {
      boxMesh(w, 0.014, d, 0, 0.008, 0, primaryMat);
      break;
    }
    case 'Wall Art': {
      boxMesh(w, h, 0.05, 0, h / 2, 0, secondaryMat);
      boxMesh(w * 0.88, h * 0.84, 0.02, 0, h / 2, 0.03, primaryMat);
      break;
    }
    default: {
      boxMesh(w, h, d, 0, h / 2, 0, primaryMat);
      break;
    }
  }

  parent.add(group);
}

function renderThumbnailSync(project: RoomProject): string | null {
  const renderer = getSharedRenderer();
  if (!renderer) return null;

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(res: T): T => {
    disposables.push(res);
    return res;
  };

  try {
    const preset = resolveLightingPreset(project.shell.lightingPreset);
    const night = isNightLightingPreset(project.shell.lightingPreset);
    renderer.toneMappingExposure = preset.exposure;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(night ? '#161A22' : '#D9D2C5');

    const L = Math.max(2.4, project.dimensions.length);
    const W = Math.max(2.4, project.dimensions.width);
    const H = Math.max(2.4, project.dimensions.height);

    // Calibrated architectural lighting
    const hemi = new THREE.HemisphereLight(
      preset.skyColor,
      preset.groundColor,
      preset.hemiIntensity * 1.15,
    );
    scene.add(hemi);

    const sunDir =
      project.shell.windowWall === 'left'
        ? new THREE.Vector3(-4.5, 4.8, 2.2)
        : project.shell.windowWall === 'back'
        ? new THREE.Vector3(1.8, 4.8, -4.5)
        : new THREE.Vector3(4.5, 4.8, 2.2);

    const dirLight = new THREE.DirectionalLight(preset.sunColor, preset.sunIntensity * 0.92);
    dirLight.position.copy(sunDir);
    scene.add(dirLight);

    const fillPoint = new THREE.PointLight(
      night ? '#EFC083' : preset.fillColor,
      night ? 1.85 : 0.72,
      Math.max(L, W) * 2.2,
      2,
    );
    fillPoint.position.set(0, H * 0.76, 0.25);
    scene.add(fillPoint);

    // Architectural Shell
    const floorMat = track(
      new THREE.MeshStandardMaterial({
        color: FLOOR_HEX[project.shell.floorMaterial] ?? '#C8AF8C',
        roughness: 0.62,
        metalness: 0.04,
      }),
    );
    const floorMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(L, W)), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const wallMat = track(
      new THREE.MeshStandardMaterial({
        color: project.shell.wallColor || '#E2DBD0',
        roughness: 0.88,
        metalness: 0.01,
      }),
    );
    const backWallMat = project.shell.hasAccentWall
      ? track(
          new THREE.MeshStandardMaterial({
            color: project.shell.accentWallColor || '#5D6B53',
            roughness: 0.86,
            metalness: 0.01,
          }),
        )
      : wallMat;

    const wallThick = 0.12;
    const backWall = new THREE.Mesh(
      track(new THREE.BoxGeometry(L + wallThick * 2, H, wallThick)),
      backWallMat,
    );
    backWall.position.set(0, H / 2, -W / 2 - wallThick / 2);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(
      track(new THREE.BoxGeometry(wallThick, H, W)),
      wallMat,
    );
    leftWall.position.set(-L / 2 - wallThick / 2, H / 2, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Subtle recessed window glow panel on windowWall
    const winMat = track(
      new THREE.MeshStandardMaterial({
        color: night ? '#263448' : '#EBF2F7',
        emissive: night ? '#1C2A3D' : '#F3E5CE',
        emissiveIntensity: night ? 0.4 : 0.72,
        roughness: 0.2,
      }),
    );
    if (project.shell.windowWall === 'back') {
      const win = new THREE.Mesh(track(new THREE.BoxGeometry(L * 0.42, H * 0.56, 0.04)), winMat);
      win.position.set(0, H * 0.52, -W / 2 + 0.02);
      scene.add(win);
    } else if (project.shell.windowWall === 'left') {
      const win = new THREE.Mesh(track(new THREE.BoxGeometry(0.04, H * 0.56, W * 0.44)), winMat);
      win.position.set(-L / 2 + 0.02, H * 0.52, 0);
      scene.add(win);
    } else {
      // Right window light strip hint along floor edge
      const frame = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.06, H * 0.56, W * 0.44)),
        winMat,
      );
      frame.position.set(L / 2 - 0.03, H * 0.52, 0);
      scene.add(frame);
    }

    // Skirting board
    const skirtMat = track(
      new THREE.MeshStandardMaterial({ color: '#D6CEC0', roughness: 0.78 }),
    );
    const backSkirt = new THREE.Mesh(track(new THREE.BoxGeometry(L, 0.09, 0.03)), skirtMat);
    backSkirt.position.set(0, 0.045, -W / 2 + 0.015);
    scene.add(backSkirt);

    // Furniture proxies
    const furnitureGroup = new THREE.Group();
    for (const inst of project.furniture) {
      addFurnitureProxy(furnitureGroup, inst, disposables);
    }
    scene.add(furnitureGroup);

    // Camera framed in warm architectural corner 3/4 view
    const camera = new THREE.PerspectiveCamera(42, THUMB_WIDTH / THUMB_HEIGHT, 0.1, 45);
    const camDist = Math.max(L, W) * 1.12;
    camera.position.set(camDist * 0.62, Math.max(2.35, H * 0.92), camDist * 0.86);
    camera.lookAt(-L * 0.06, H * 0.28, -W * 0.05);

    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  } catch {
    return null;
  } finally {
    for (const item of disposables) {
      item.dispose();
    }
  }
}

function pumpQueue() {
  if (isProcessing || renderQueue.length === 0) return;
  isProcessing = true;

  setTimeout(() => {
    const task = renderQueue.shift();
    if (task) {
      let url = thumbnailCache.get(task.sig) ?? null;
      if (!url) {
        url = renderThumbnailSync(task.project);
        if (url) {
          thumbnailCache.set(task.sig, url);
        }
      }
      const cbs = inFlightCallbacks.get(task.sig) ?? [];
      inFlightCallbacks.delete(task.sig);
      for (const cb of cbs) cb(url);
    }
    isProcessing = false;
    if (renderQueue.length > 0) {
      pumpQueue();
    }
  }, 45);
}

export function requestRoomThumbnail(
  project: RoomProject,
  onReady: (dataUrl: string | null) => void,
): () => void {
  const sig = buildProjectThumbnailSignature(project);
  const cached = thumbnailCache.get(sig);
  if (cached) {
    onReady(cached);
    return () => {};
  }

  let active = true;
  const wrapped = (url: string | null) => {
    if (active) onReady(url);
  };

  const existing = inFlightCallbacks.get(sig);
  if (existing) {
    existing.push(wrapped);
  } else {
    inFlightCallbacks.set(sig, [wrapped]);
    renderQueue.push({ sig, project });
    pumpQueue();
  }

  return () => {
    active = false;
  };
}
