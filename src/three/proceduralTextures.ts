import * as THREE from 'three';
import { FloorMaterial } from '../types/room';

const textureCache = new Map<string, THREE.CanvasTexture>();

function createCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor = true,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a tangent-space Sobel normal map canvas from a grayscale height canvas.
 */
function buildNormalCanvas(heightCanvas: HTMLCanvasElement, strength = 2.0): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const [outCanvas, outCtx] = createCanvas(w);
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x: number, y: number): number => {
    const cx = ((x % w) + w) % w;
    const cy = ((y % h) + h) % h;
    return src[(cy * w + cx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

export interface PBRFloorTextures {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export interface PBRSurfaceMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export function getFloorPBRTextures(
  material: FloorMaterial,
  roomL = 5,
  roomW = 4,
): PBRFloorTextures {
  const key = `floor-pbr2-${material}-${Math.round(roomL)}-${Math.round(roomW)}`;
  const cachedMap = textureCache.get(`${key}-map`);
  const cachedBump = textureCache.get(`${key}-bump`);
  const cachedNormal = textureCache.get(`${key}-normal`);
  const cachedRough = textureCache.get(`${key}-rough`);
  if (cachedMap && cachedBump && cachedNormal && cachedRough) {
    return {
      map: cachedMap,
      bumpMap: cachedBump,
      normalMap: cachedNormal,
      roughnessMap: cachedRough,
    };
  }

  const size = 1024;
  const [canvas, ctx] = createCanvas(size);
  const [bumpCanvas, bctx] = createCanvas(size);
  const [roughCanvas, rctx] = createCanvas(size);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#B8B8B8';
  rctx.fillRect(0, 0, size, size);

  if (material === 'white-oak' || material === 'smoked-walnut') {
    const isWalnut = material === 'smoked-walnut';
    ctx.fillStyle = isWalnut ? '#533B2A' : '#C3A885';
    ctx.fillRect(0, 0, size, size);

    const planks = 8;
    const plankH = size / planks;
    for (let p = 0; p < planks; p++) {
      const y = p * plankH;
      const toneShift = ((p * 19) % 16) - 8;
      const baseR = (isWalnut ? 83 : 195) + toneShift;
      const baseG = (isWalnut ? 59 : 168) + toneShift;
      const baseB = (isWalnut ? 42 : 133) + toneShift;
      ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
      ctx.fillRect(0, y, size, plankH);

      bctx.fillStyle = `rgb(${124 + (p % 3) * 5},${124 + (p % 3) * 5},${124 + (p % 3) * 5})`;
      bctx.fillRect(0, y, size, plankH);

      const rTone = (isWalnut ? 112 : 134) + (p % 4) * 8;
      rctx.fillStyle = `rgb(${rTone},${rTone},${rTone})`;
      rctx.fillRect(0, y, size, plankH);

      for (let g = 0; g < 44; g++) {
        const gy = y + (g / 44) * plankH;
        const alpha = 0.055 + ((g * 13 + p * 7) % 10) * 0.008;
        ctx.strokeStyle = isWalnut
          ? `rgba(26, 15, 9, ${alpha})`
          : `rgba(116, 84, 53, ${alpha})`;
        ctx.lineWidth = 1.2 + ((g + p) % 2);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(
          size * 0.33,
          gy + Math.sin(g + p) * 3.5,
          size * 0.66,
          gy - Math.cos(g) * 3.5,
          size,
          gy,
        );
        ctx.stroke();

        bctx.strokeStyle = `rgba(102,102,102,${alpha * 1.4})`;
        bctx.lineWidth = 1;
        bctx.beginPath();
        bctx.moveTo(0, gy);
        bctx.lineTo(size, gy);
        bctx.stroke();

        rctx.strokeStyle = `rgba(175,175,175,${alpha * 1.6})`;
        rctx.beginPath();
        rctx.moveTo(0, gy);
        rctx.lineTo(size, gy);
        rctx.stroke();
      }

      ctx.fillStyle = isWalnut ? 'rgba(18, 10, 6, 0.56)' : 'rgba(96, 70, 44, 0.34)';
      ctx.fillRect(0, y, size, 3);
      bctx.fillStyle = '#303030';
      bctx.fillRect(0, y, size, 3);
      rctx.fillStyle = '#E6E6E6';
      rctx.fillRect(0, y, size, 3);

      const jointX = ((p * 271 + 140) % (size - 140)) + 70;
      ctx.fillRect(jointX, y, 3, plankH);
      bctx.fillRect(jointX, y, 3, plankH);
    }
  } else if (material === 'herringbone-oak') {
    ctx.fillStyle = '#C9AE8A';
    ctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#8C8C8C';
    rctx.fillRect(0, 0, size, size);
    const step = 96;
    for (let y = -size; y < size * 2; y += step) {
      for (let x = -size; x < size * 2; x += step) {
        const parity = (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0;
        const shade = ((Math.abs(x + y) * 11) % 18) - 9;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(parity ? Math.PI / 4 : -Math.PI / 4);
        ctx.fillStyle = `rgb(${201 + shade},${174 + shade},${138 + shade})`;
        ctx.fillRect(-step * 0.72, -step * 0.23, step * 1.44, step * 0.46);
        ctx.strokeStyle = 'rgba(104, 76, 48, 0.34)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-step * 0.72, -step * 0.23, step * 1.44, step * 0.46);
        ctx.restore();

        bctx.save();
        bctx.translate(x, y);
        bctx.rotate(parity ? Math.PI / 4 : -Math.PI / 4);
        bctx.fillStyle = '#888888';
        bctx.fillRect(-step * 0.72, -step * 0.23, step * 1.44, step * 0.46);
        bctx.strokeStyle = '#383838';
        bctx.lineWidth = 2;
        bctx.strokeRect(-step * 0.72, -step * 0.23, step * 1.44, step * 0.46);
        bctx.restore();
      }
    }
  } else if (material === 'polished-marble') {
    ctx.fillStyle = '#E5E1D8';
    ctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#484848';
    rctx.fillRect(0, 0, size, size);

    for (let v = 0; v < 24; v++) {
      ctx.strokeStyle = v % 3 === 0 ? 'rgba(115, 108, 97, 0.24)' : 'rgba(160, 150, 134, 0.18)';
      ctx.lineWidth = 1.5 + (v % 4) * 1.1;
      ctx.beginPath();
      let px = (v * 97) % size;
      let py = 0;
      ctx.moveTo(px, py);
      for (let s = 1; s <= 10; s++) {
        px += Math.sin(s * 1.3 + v) * 48;
        py = (s / 10) * size;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(130, 122, 110, 0.34)';
    ctx.lineWidth = 2.5;
    bctx.strokeStyle = '#444444';
    bctx.lineWidth = 2.5;
    rctx.strokeStyle = '#9C9C9C';
    rctx.lineWidth = 3;
    for (let g = 0; g <= size; g += size / 2) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, size);
      ctx.moveTo(0, g);
      ctx.lineTo(size, g);
      ctx.stroke();

      bctx.beginPath();
      bctx.moveTo(g, 0);
      bctx.lineTo(g, size);
      bctx.moveTo(0, g);
      bctx.lineTo(size, g);
      bctx.stroke();

      rctx.beginPath();
      rctx.moveTo(g, 0);
      rctx.lineTo(g, size);
      rctx.moveTo(0, g);
      rctx.lineTo(size, g);
      rctx.stroke();
    }
  } else if (material === 'ceramic-tile') {
    ctx.fillStyle = '#DAD4CA';
    ctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#686868';
    rctx.fillRect(0, 0, size, size);
    const tiles = 4;
    const tileS = size / tiles;
    for (let ty = 0; ty < tiles; ty++) {
      for (let tx = 0; tx < tiles; tx++) {
        const delta = ((tx * 7 + ty * 11) % 8) - 4;
        ctx.fillStyle = `rgb(${216 + delta},${210 + delta},${200 + delta})`;
        ctx.fillRect(tx * tileS + 3, ty * tileS + 3, tileS - 6, tileS - 6);
        bctx.fillStyle = '#929292';
        bctx.fillRect(tx * tileS + 3, ty * tileS + 3, tileS - 6, tileS - 6);
        bctx.strokeStyle = '#383838';
        bctx.lineWidth = 4;
        bctx.strokeRect(tx * tileS, ty * tileS, tileS, tileS);
      }
    }
  } else if (material === 'plush-carpet') {
    ctx.fillStyle = '#C4BEB2';
    ctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#F2F2F2';
    rctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 16000; i++) {
      const x = (Math.abs(Math.sin(i * 12.9898)) * size) % size;
      const y = (Math.abs(Math.cos(i * 78.233)) * size) % size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(72,68,62,0.12)';
      ctx.fillRect(x, y, 3, 3);
      bctx.fillStyle = i % 2 === 0 ? '#A4A4A4' : '#606060';
      bctx.fillRect(x, y, 3, 3);
    }
  } else if (material === 'polished-concrete') {
    ctx.fillStyle = '#C2BEB5';
    ctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#767676';
    rctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4800; i++) {
      const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const ry = (Math.sin(i * 78.233) * 43758.5453) % 1;
      const px = Math.abs(rx) * size;
      const py = Math.abs(ry) * size;
      const r = 1 + (i % 5) * 1.4;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(78,75,70,0.08)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(85,82,76,0.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  } else {
    // warm-travertine
    ctx.fillStyle = '#D6CBB8';
    ctx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#888888';
    rctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 64; i++) {
      const y = (i / 64) * size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(165, 148, 124, 0.18)' : 'rgba(240, 234, 222, 0.16)';
      ctx.fillRect(0, y, size, 6 + (i % 8));
      bctx.fillStyle = i % 2 === 0 ? '#747474' : '#8E8E8E';
      bctx.fillRect(0, y, size, 5);
    }
    ctx.strokeStyle = 'rgba(130, 115, 92, 0.28)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, size, size / 2);
    ctx.strokeRect(0, size / 2, size, size / 2);
  }

  const normalCanvas = buildNormalCanvas(bumpCanvas, material === 'plush-carpet' ? 1.4 : 1.8);
  const rx = Math.max(1, roomL / 2.2);
  const ry = Math.max(1, roomW / 2.2);
  const mapTex = finalizeTexture(canvas, rx, ry, true);
  const bumpTex = finalizeTexture(bumpCanvas, rx, ry, false);
  const normalTex = finalizeTexture(normalCanvas, rx, ry, false);
  const roughTex = finalizeTexture(roughCanvas, rx, ry, false);

  textureCache.set(`${key}-map`, mapTex);
  textureCache.set(`${key}-bump`, bumpTex);
  textureCache.set(`${key}-normal`, normalTex);
  textureCache.set(`${key}-rough`, roughTex);

  return { map: mapTex, bumpMap: bumpTex, normalMap: normalTex, roughnessMap: roughTex };
}

export function getFloorTexture(material: FloorMaterial, roomL = 5, roomW = 4): THREE.CanvasTexture {
  return getFloorPBRTextures(material, roomL, roomW).map;
}

export function getWoodPBRTextures(variant: 'oak' | 'walnut' | 'teak' | 'dark-wood'): PBRSurfaceMaps {
  const key = `wood-pbr-${variant}`;
  const m = textureCache.get(`${key}-map`);
  const n = textureCache.get(`${key}-normal`);
  const r = textureCache.get(`${key}-rough`);
  if (m && n && r) return { map: m, normalMap: n, roughnessMap: r };

  const size = 512;
  const [albedoC, actx] = createCanvas(size);
  const [heightC, hctx] = createCanvas(size);
  const [roughC, rctx] = createCanvas(size);

  // Neutral grayscale-tinted wood grain map (multiplies cleanly with material color)
  actx.fillStyle = variant === 'dark-wood' ? '#D6D0CA' : variant === 'walnut' ? '#DDD4CB' : '#EAE4DC';
  actx.fillRect(0, 0, size, size);
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, size, size);
  const baseRough = variant === 'teak' ? 124 : variant === 'walnut' ? 116 : 128;
  rctx.fillStyle = `rgb(${baseRough},${baseRough},${baseRough})`;
  rctx.fillRect(0, 0, size, size);

  const fibers = variant === 'oak' ? 140 : 180;
  for (let i = 0; i < fibers; i++) {
    const y = (i / fibers) * size;
    const dark = ((i * 19) % 10) > 5;
    const tone = dark ? 185 : 235;
    actx.strokeStyle = `rgba(${tone},${tone - 4},${tone - 8},${dark ? 0.28 : 0.18})`;
    actx.lineWidth = 1.2 + (i % 3) * 0.8;
    actx.beginPath();
    actx.moveTo(0, y);
    actx.bezierCurveTo(
      size * 0.33,
      y + Math.sin(i * 0.7) * 8,
      size * 0.66,
      y - Math.cos(i * 0.5) * 8,
      size,
      y,
    );
    actx.stroke();

    const hv = 102 + ((i * 17) % 52);
    hctx.strokeStyle = `rgb(${hv},${hv},${hv})`;
    hctx.lineWidth = 1.6;
    hctx.beginPath();
    hctx.moveTo(0, y);
    hctx.bezierCurveTo(
      size * 0.33,
      y + Math.sin(i * 0.7) * 8,
      size * 0.66,
      y - Math.cos(i * 0.5) * 8,
      size,
      y,
    );
    hctx.stroke();

    const rv = dark ? baseRough + 30 : baseRough - 16;
    rctx.strokeStyle = `rgb(${rv},${rv},${rv})`;
    rctx.lineWidth = 1.5;
    rctx.beginPath();
    rctx.moveTo(0, y);
    rctx.lineTo(size, y);
    rctx.stroke();
  }

  // Subtle wood cathedral knots
  for (let k = 0; k < 3; k++) {
    const kx = (k * 167 + 90) % size;
    const ky = (k * 193 + 110) % size;
    actx.strokeStyle = 'rgba(130, 120, 110, 0.22)';
    actx.lineWidth = 1.5;
    for (let ring = 1; ring <= 4; ring++) {
      actx.beginPath();
      actx.ellipse(kx, ky, ring * 18, ring * 5, 0.08, 0, Math.PI * 2);
      actx.stroke();
    }
  }

  const normalC = buildNormalCanvas(heightC, 1.5);
  const mapTex = finalizeTexture(albedoC, 2, 2, true);
  const normalTex = finalizeTexture(normalC, 2, 2, false);
  const roughTex = finalizeTexture(roughC, 2, 2, false);
  textureCache.set(`${key}-map`, mapTex);
  textureCache.set(`${key}-normal`, normalTex);
  textureCache.set(`${key}-rough`, roughTex);
  return { map: mapTex, normalMap: normalTex, roughnessMap: roughTex };
}

export function getFabricPBRTextures(variant: 'linen' | 'velvet' | 'cotton' | 'boucle'): PBRSurfaceMaps {
  const key = `fabric-pbr-${variant}`;
  const m = textureCache.get(`${key}-map`);
  const n = textureCache.get(`${key}-normal`);
  const r = textureCache.get(`${key}-rough`);
  if (m && n && r) return { map: m, normalMap: n, roughnessMap: r };

  const size = 512;
  const [albedoC, actx] = createCanvas(size);
  const [heightC, hctx] = createCanvas(size);
  const [roughC, rctx] = createCanvas(size);

  actx.fillStyle = '#F2F0EC';
  actx.fillRect(0, 0, size, size);
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, size, size);
  const baseR = variant === 'velvet' ? 196 : 232;
  rctx.fillStyle = `rgb(${baseR},${baseR},${baseR})`;
  rctx.fillRect(0, 0, size, size);

  if (variant === 'boucle') {
    for (let i = 0; i < 6500; i++) {
      const x = ((i * 73) % size) + ((i % 7) - 3);
      const y = (Math.floor((i * 73) / size) * 9 + (i % 11)) % size;
      const rad = 2 + (i % 3);
      const tone = i % 2 === 0 ? 248 : 216;
      actx.fillStyle = `rgb(${tone},${tone - 2},${tone - 5})`;
      actx.beginPath();
      actx.arc(x, y, rad, 0, Math.PI * 2);
      actx.fill();

      const hv = i % 2 === 0 ? 185 : 92;
      hctx.fillStyle = `rgb(${hv},${hv},${hv})`;
      hctx.beginPath();
      hctx.arc(x, y, rad, 0, Math.PI * 2);
      hctx.fill();
    }
  } else if (variant === 'velvet') {
    // Directional nap shimmer & subtle soft pile variation
    for (let y = 0; y < size; y += 3) {
      const wave = Math.sin(y * 0.04) * 10;
      const t = Math.round(230 + wave);
      actx.fillStyle = `rgb(${t},${t},${t})`;
      actx.fillRect(0, y, size, 3);
      const rv = Math.round(188 - wave * 1.4);
      rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rctx.fillRect(0, y, size, 3);
    }
    for (let i = 0; i < 2400; i++) {
      const x = (Math.abs(Math.sin(i * 19.3)) * size) % size;
      const y = (Math.abs(Math.cos(i * 41.7)) * size) % size;
      hctx.fillStyle = i % 2 === 0 ? 'rgba(145,145,145,0.4)' : 'rgba(110,110,110,0.4)';
      hctx.fillRect(x, y, 3, 2);
    }
  } else {
    // Linen or Cotton fine cross-hatch weave
    const step = variant === 'linen' ? 6 : 4;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const check = ((x / step + y / step) % 2) === 0;
        const jitter = ((x * 7 + y * 13) % 16) - 8;
        const av = (check ? 245 : 226) + jitter;
        actx.fillStyle = `rgb(${av},${av},${av - 2})`;
        actx.fillRect(x, y, step - 1, step - 1);

        const hv = (check ? 156 : 102) + jitter;
        hctx.fillStyle = `rgb(${hv},${hv},${hv})`;
        hctx.fillRect(x, y, step - 1, step - 1);
      }
    }
  }

  const repeat = variant === 'boucle' ? 6 : variant === 'velvet' ? 4 : 8;
  const normalC = buildNormalCanvas(heightC, variant === 'boucle' ? 1.8 : 1.2);
  const mapTex = finalizeTexture(albedoC, repeat, repeat, true);
  const normalTex = finalizeTexture(normalC, repeat, repeat, false);
  const roughTex = finalizeTexture(roughC, repeat, repeat, false);
  textureCache.set(`${key}-map`, mapTex);
  textureCache.set(`${key}-normal`, normalTex);
  textureCache.set(`${key}-rough`, roughTex);
  return { map: mapTex, normalMap: normalTex, roughnessMap: roughTex };
}

export function getOtherPBRTextures(variant: 'marble' | 'leather' | 'ceramic'): PBRSurfaceMaps {
  const key = `other-pbr-${variant}`;
  const m = textureCache.get(`${key}-map`);
  const n = textureCache.get(`${key}-normal`);
  const r = textureCache.get(`${key}-rough`);
  if (m && n && r) return { map: m, normalMap: n, roughnessMap: r };

  const size = 512;
  const [albedoC, actx] = createCanvas(size);
  const [heightC, hctx] = createCanvas(size);
  const [roughC, rctx] = createCanvas(size);

  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, size, size);

  if (variant === 'marble') {
    actx.fillStyle = '#EFECE6';
    actx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#4A4A4A';
    rctx.fillRect(0, 0, size, size);
    for (let v = 0; v < 18; v++) {
      actx.strokeStyle = v % 2 === 0 ? 'rgba(130, 122, 112, 0.28)' : 'rgba(170, 162, 148, 0.18)';
      actx.lineWidth = 1.2 + (v % 3) * 1.1;
      actx.beginPath();
      let px = (v * 79) % size;
      actx.moveTo(px, 0);
      for (let s = 1; s <= 10; s++) {
        px += Math.sin(s * 1.4 + v) * 32;
        actx.lineTo(px, (s / 10) * size);
      }
      actx.stroke();

      rctx.strokeStyle = 'rgba(105, 105, 105, 0.35)';
      rctx.lineWidth = 1.5;
      rctx.stroke();
    }
  } else if (variant === 'leather') {
    actx.fillStyle = '#E6DFD8';
    actx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#868686';
    rctx.fillRect(0, 0, size, size);
    // Natural pebble hide grain
    for (let i = 0; i < 4200; i++) {
      const x = (Math.abs(Math.sin(i * 17.7)) * size) % size;
      const y = (Math.abs(Math.cos(i * 53.1)) * size) % size;
      const rad = 2 + (i % 3);
      actx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(60,50,44,0.09)';
      actx.beginPath();
      actx.arc(x, y, rad, 0, Math.PI * 2);
      actx.fill();

      const hv = i % 2 === 0 ? 148 : 108;
      hctx.fillStyle = `rgb(${hv},${hv},${hv})`;
      hctx.beginPath();
      hctx.arc(x, y, rad, 0, Math.PI * 2);
      hctx.fill();
    }
  } else {
    // ceramic glaze speckles
    actx.fillStyle = '#EFECE5';
    actx.fillRect(0, 0, size, size);
    rctx.fillStyle = '#5A5A5A';
    rctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1600; i++) {
      const x = (Math.abs(Math.sin(i * 11.3)) * size) % size;
      const y = (Math.abs(Math.cos(i * 67.9)) * size) % size;
      actx.fillStyle = 'rgba(110, 100, 90, 0.08)';
      actx.fillRect(x, y, 2, 2);
    }
  }

  const normalC = buildNormalCanvas(heightC, variant === 'leather' ? 1.5 : 0.9);
  const mapTex = finalizeTexture(albedoC, 2, 2, true);
  const normalTex = finalizeTexture(normalC, 2, 2, false);
  const roughTex = finalizeTexture(roughC, 2, 2, false);
  textureCache.set(`${key}-map`, mapTex);
  textureCache.set(`${key}-normal`, normalTex);
  textureCache.set(`${key}-rough`, roughTex);
  return { map: mapTex, normalMap: normalTex, roughnessMap: roughTex };
}

export function getPlasterBumpTexture(): THREE.CanvasTexture {
  const key = 'plaster-bump-hq';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = (Math.abs(Math.sin(i * 19.31)) * size) % size;
    const y = (Math.abs(Math.cos(i * 43.17)) * size) % size;
    const v = 114 + (i % 30);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 4, 2.5);
  }

  const tex = finalizeTexture(canvas, 3, 2, false);
  textureCache.set(key, tex);
  return tex;
}

export function getFabricWeaveTexture(type: 'boucle' | 'linen' | 'rug' = 'linen'): THREE.CanvasTexture {
  const key = `fabric-${type}-hq`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, size, size);

  const step = type === 'rug' ? 10 : type === 'boucle' ? 7 : 5;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const check = ((x / step + y / step) % 2) === 0;
      const jitter = ((x * 7 + y * 13) % 26) - 13;
      const v = (check ? 152 : 108) + jitter;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, step - 1, step - 1);
    }
  }

  const tex = finalizeTexture(canvas, type === 'rug' ? 10 : 8, type === 'rug' ? 10 : 8, false);
  textureCache.set(key, tex);
  return tex;
}

export function getWoodGrainBumpTexture(): THREE.CanvasTexture {
  const key = 'wood-grain-bump';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 120; i++) {
    const y = (i / 120) * size;
    const v = 104 + ((i * 17) % 44);
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + Math.sin(i) * 4, size * 0.7, y - Math.cos(i) * 4, size, y);
    ctx.stroke();
  }
  const tex = finalizeTexture(canvas, 2, 2, false);
  textureCache.set(key, tex);
  return tex;
}

export function getDuvetFoldBumpTexture(): THREE.CanvasTexture {
  const key = 'duvet-fold-bump-hq';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 28; i++) {
    const startY = (i * 37) % size;
    const amp = 14 + (i % 5) * 6;
    const width = 12 + (i % 4) * 7;
    const shade = i % 2 === 0 ? 'rgba(205,205,205,0.28)' : 'rgba(65,65,65,0.26)';
    ctx.strokeStyle = shade;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.bezierCurveTo(
      size * 0.32,
      startY + Math.sin(i * 1.3) * amp,
      size * 0.68,
      startY - Math.cos(i * 0.9) * amp,
      size,
      startY + ((i % 3) - 1) * 18,
    );
    ctx.stroke();
  }

  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, y, size, 2);
  }

  const tex = finalizeTexture(canvas, 2, 2, false);
  textureCache.set(key, tex);
  return tex;
}

export function getPaintingCanvasTexture(variant = 0): THREE.CanvasTexture {
  const key = `painting-art-${variant}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#DFD6C7');
  grad.addColorStop(0.55, '#CBBFA9');
  grad.addColorStop(1, '#B3A48D');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Soft architectural abstract botanical hills & arch
  ctx.fillStyle = '#5D6B53';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.62, 130, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#7D5C43';
  ctx.beginPath();
  ctx.ellipse(size * 0.34, size * 0.48, 72, 108, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#EAE2D3';
  ctx.beginPath();
  ctx.arc(size * 0.65, size * 0.3, 44, 0, Math.PI * 2);
  ctx.fill();

  // Subtle brush stroke overlay
  for (let i = 0; i < 650; i++) {
    const x = (Math.abs(Math.sin(i * 19.1)) * size) % size;
    const y = (Math.abs(Math.cos(i * 37.7)) * size) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(48,51,47,0.04)';
    ctx.fillRect(x, y, 16, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

export function getOutdoorBackdropTexture(isNight: boolean): THREE.CanvasTexture {
  const key = `outdoor-sky-${isNight ? 'night' : 'day'}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  if (isNight) {
    grad.addColorStop(0, '#0C121D');
    grad.addColorStop(0.65, '#152030');
    grad.addColorStop(1, '#1C252B');
  } else {
    grad.addColorStop(0, '#AFC4D6');
    grad.addColorStop(0.55, '#DDD4C3');
    grad.addColorStop(1, '#8C9B7F');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 14; i++) {
    const cx = (i / 13) * size;
    const cy = size * (0.72 + ((i * 7) % 5) * 0.03);
    const rad = 45 + (i % 4) * 18;
    ctx.fillStyle = isNight ? 'rgba(18, 25, 28, 0.65)' : 'rgba(92, 108, 80, 0.48)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}
