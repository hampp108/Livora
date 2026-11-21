import { RoomProject } from '../types/room';
import { getCatalogItem } from '../data/catalog';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return inrFormatter.format(safe);
}

export function formatSignedINR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const absFormatted = inrFormatter.format(Math.abs(safe));
  return `${safe >= 0 ? '+' : '-'}${absFormatted}`;
}

export const FLOOR_RATE_INR_PER_M2: Record<string, { label: string; rate: number }> = {
  'white-oak': { label: 'White Oak Wood', rate: 3800 },
  'herringbone-oak': { label: 'Herringbone Oak', rate: 4800 },
  'smoked-walnut': { label: 'Smoked Walnut', rate: 5200 },
  'polished-marble': { label: 'Calacatta Marble', rate: 6500 },
  'warm-travertine': { label: 'Warm Travertine', rate: 5400 },
  'polished-concrete': { label: 'Polished Concrete', rate: 3200 },
  'ceramic-tile': { label: 'Ceramic Tile', rate: 2400 },
  'plush-carpet': { label: 'Plush Carpet', rate: 2200 },
};

export function computeFurnitureINR(project: Pick<RoomProject, 'furniture'>): number {
  return project.furniture.reduce(
    (sum, item) => sum + (getCatalogItem(item.catalogId)?.price ?? 0),
    0,
  );
}

export function estimateProjectTotalINR(project: RoomProject): number {
  const furnitureSum = computeFurnitureINR(project);
  const floorArea = project.dimensions.length * project.dimensions.width;
  const wallArea =
    2 * (project.dimensions.length + project.dimensions.width) * project.dimensions.height;
  const floorRate = FLOOR_RATE_INR_PER_M2[project.shell.floorMaterial]?.rate ?? 3800;
  const flooringCost = Math.round(floorArea * floorRate);
  const wallPaintCost = Math.round(wallArea * (project.shell.hasAccentWall ? 720 : 550));
  const lightingAllowance = project.shell.hasChandelier ? 38000 : 14000;
  const draperyAllowance = project.shell.hasCurtains
    ? Math.round(project.shell.windowCount * 8500)
    : 0;
  const subtotal = furnitureSum + flooringCost + wallPaintCost + lightingAllowance + draperyAllowance;
  return Math.round(subtotal * 1.08);
}
