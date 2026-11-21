import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Columns2,
  Maximize2,
  Minimize2,
  RotateCcw,
  SplitSquareHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { RoomProject } from '../types/room';
import { getCatalogItem } from '../data/catalog';
import { buildDefaultShell, DESIGN_STYLES } from '../data/stylesAndTemplates';
import { RoomCanvas, ZoomCommand } from '../three/RoomCanvas';
import { LazyRoomViewport } from '../three/LazyRoomViewport';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { formatINR, formatSignedINR } from '../utils/currency';

interface RoomComparisonPanelProps {
  projects: RoomProject[];
  theme?: 'light' | 'dark';
  onOpenProject?: (project: RoomProject) => void;
}

const FLOOR_LABELS: Record<string, string> = {
  'white-oak': 'White Oak Wood',
  'herringbone-oak': 'Herringbone Oak',
  'smoked-walnut': 'Smoked Walnut',
  'polished-concrete': 'Polished Concrete',
  'warm-travertine': 'Warm Travertine',
  'polished-marble': 'Calacatta Marble',
  'ceramic-tile': 'Ceramic Tile',
  'plush-carpet': 'Plush Carpet',
};

function computeFurnitureTotal(project: RoomProject): number {
  return project.furniture.reduce(
    (sum, item) => sum + (getCatalogItem(item.catalogId)?.price ?? 0),
    0,
  );
}

export const RoomComparisonPanel: React.FC<RoomComparisonPanelProps> = ({
  projects,
  theme = 'light',
  onOpenProject,
}) => {
  const isDark = theme === 'dark';
  const [targetId, setTargetId] = useState<string>(projects[0]?.id ?? '');
  const [baselineMode, setBaselineMode] = useState<'empty-shell' | string>('empty-shell');
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ type: 'reset', tick: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const targetProject = useMemo(
    () => projects.find((p) => p.id === targetId) ?? projects[0] ?? null,
    [projects, targetId],
  );

  const baselineProject = useMemo(() => {
    if (!targetProject) return null;
    if (baselineMode === 'empty-shell') {
      return {
        ...targetProject,
        id: `${targetProject.id}-original`,
        name: `${targetProject.name} (Original Shell)`,
        styleId: 'minimalist' as const,
        shell: {
          ...buildDefaultShell('minimalist'),
          wallColor: '#E6DFD1',
          baseboardColor: '#CFC7B7',
          hasAccentWall: false,
          hasCurtains: false,
          hasChandelier: false,
          hasSlattedScreens: false,
          floorMaterial: 'polished-concrete' as const,
        },
        furniture: [],
      };
    }
    return projects.find((p) => p.id === baselineMode) ?? targetProject;
  }, [targetProject, baselineMode, projects]);

  const summary = useMemo(() => {
    if (!targetProject || !baselineProject) return null;
    const origCost = computeFurnitureTotal(baselineProject);
    const nextCost = computeFurnitureTotal(targetProject);
    const costDiff = nextCost - origCost;

    const origStyle =
      baselineMode === 'empty-shell'
        ? 'Unfinished Structural Shell'
        : DESIGN_STYLES.find((s) => s.id === baselineProject.styleId)?.name ??
          baselineProject.styleId;
    const nextStyle =
      DESIGN_STYLES.find((s) => s.id === targetProject.styleId)?.name ?? targetProject.styleId;

    const changes: string[] = [];
    if (origStyle !== nextStyle) {
      changes.push(`Style shifted from ${origStyle} to ${nextStyle}`);
    }
    if (baselineProject.shell.wallColor !== targetProject.shell.wallColor) {
      changes.push('Updated primary wall plaster tone');
    }
    if (baselineProject.shell.floorMaterial !== targetProject.shell.floorMaterial) {
      changes.push(
        `Upgraded floor from ${FLOOR_LABELS[baselineProject.shell.floorMaterial] ?? baselineProject.shell.floorMaterial} to ${FLOOR_LABELS[targetProject.shell.floorMaterial] ?? targetProject.shell.floorMaterial}`,
      );
    }
    const pieceDelta = targetProject.furniture.length - baselineProject.furniture.length;
    if (pieceDelta !== 0) {
      changes.push(
        pieceDelta > 0
          ? `Added ${pieceDelta} furnished & decorative 3D pieces`
          : `Streamlined layout by ${Math.abs(pieceDelta)} pieces`,
      );
    }
    if (targetProject.shell.hasCurtains && !baselineProject.shell.hasCurtains) {
      changes.push('Added layered linen window drapery');
    }
    if (targetProject.shell.hasChandelier && !baselineProject.shell.hasChandelier) {
      changes.push('Installed architectural ceiling luminaire');
    }
    if (changes.length === 0) {
      changes.push('Identical spatial configuration selected — choose another baseline to compare');
    }

    return {
      origCost,
      nextCost,
      costDiff,
      origStyle,
      nextStyle,
      origFloor: FLOOR_LABELS[baselineProject.shell.floorMaterial] ?? baselineProject.shell.floorMaterial,
      nextFloor: FLOOR_LABELS[targetProject.shell.floorMaterial] ?? targetProject.shell.floorMaterial,
      origCount: baselineProject.furniture.length,
      nextCount: targetProject.furniture.length,
      changes,
    };
  }, [targetProject, baselineProject, baselineMode]);

  if (!targetProject || !baselineProject || !summary) {
    return (
      <div className={`p-10 rounded-2xl border text-center ${isDark ? 'bg-[#1B1D1B] border-[#2E312E] text-[#D8C9B5]' : 'bg-[#FFFFFF] border-[#D8C9B5] text-[#4C4E49]'}`}>
        Create or open at least one room project to compare before-and-after transformations.
      </div>
    );
  }

  const headingCls = isDark ? 'text-[#F4F0E8]' : 'text-[#30332F]';
  const bodyCls = isDark ? 'text-[#D8C9B5]' : 'text-[#4C4E49]';
  const mutedCls = isDark ? 'text-[#9F9A90]' : 'text-[#6E6B64]';
  const cardCls = isDark ? 'bg-[#1B1D1B] border-[#2E312E]' : 'bg-[#FFFFFF] border-[#D8C9B5]';
  const inputCls = isDark
    ? 'bg-[#161816] border-[#353833] text-[#F4F0E8]'
    : 'bg-[#FFFFFF] border-[#D8C9B5] text-[#30332F]';

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className={`p-4 rounded-2xl border ${cardCls} flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <div>
            <label className={`block text-[11px] font-medium ${mutedCls} mb-1`}>
              ORIGINAL (Baseline)
            </label>
            <select
              value={baselineMode}
              onChange={(e) => setBaselineMode(e.target.value)}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
            >
              <option value="empty-shell">Original Unfurnished Room Shell</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.roomType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-[11px] font-medium ${mutedCls} mb-1`}>
              REDESIGNED (Target Design)
            </label>
            <select
              value={targetProject.id}
              onChange={(e) => setTargetId(e.target.value)}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.roomType})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`inline-flex p-1 rounded-lg border ${isDark ? 'bg-[#222522] border-[#343834]' : 'bg-[#F4F0E8] border-[#D8C9B5]'}`}>
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'slider'
                  ? isDark
                    ? 'bg-[#F4F0E8] text-[#30332F]'
                    : 'bg-[#30332F] text-[#FFFFFF]'
                  : mutedCls
              }`}
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              <span>Slider</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'side-by-side'
                  ? isDark
                    ? 'bg-[#F4F0E8] text-[#30332F]'
                    : 'bg-[#30332F] text-[#FFFFFF]'
                  : mutedCls
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Side by Side</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setZoomCommand((z) => ({ type: 'in', tick: z.tick + 1 }))}
            title="Zoom In"
            className={`p-2 rounded-lg border ${inputCls} hover:border-[#78816C]`}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomCommand((z) => ({ type: 'out', tick: z.tick + 1 }))}
            title="Zoom Out"
            className={`p-2 rounded-lg border ${inputCls} hover:border-[#78816C]`}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomCommand((z) => ({ type: 'reset', tick: z.tick + 1 }))}
            title="Reset Camera View"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium ${inputCls} hover:border-[#78816C]`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Interactive 3D Comparison Viewport */}
      <div
        className={`${
          isFullscreen
            ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl'
            : 'relative rounded-2xl'
        } overflow-hidden border ${isDark ? 'border-[#343834] bg-[#161816]' : 'border-[#D8C9B5] bg-[#EAE3D5]'}`}
      >
        <button
          type="button"
          onClick={() => setIsFullscreen((v) => !v)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF]/95 hover:bg-[#F4F0E8] text-[#30332F] border border-[#D8C9B5] text-xs font-medium shadow-sm"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>

        {viewMode === 'slider' ? (
          <LazyRoomViewport
            className={isFullscreen ? 'w-full h-full' : 'w-full h-[440px] lg:h-[520px]'}
            forceMount={isFullscreen}
          >
            <BeforeAfterSlider
              className="w-full h-full"
              beforeLabel="ORIGINAL"
              afterLabel="REDESIGNED"
              beforeContent={
                <RoomCanvas
                  dimensions={baselineProject.dimensions}
                  shell={baselineProject.shell}
                  furniture={baselineProject.furniture}
                  selectedId={null}
                  walkthroughMode={false}
                  cameraPreset="isometric"
                  cameraPresetTick={0}
                  constructionKey={0}
                  zoomCommand={zoomCommand}
                  allowOrbit={false}
                  interactive={false}
                  showDimensions={false}
                />
              }
              afterContent={
                <RoomCanvas
                  dimensions={targetProject.dimensions}
                  shell={targetProject.shell}
                  furniture={targetProject.furniture}
                  selectedId={null}
                  walkthroughMode={false}
                  cameraPreset="isometric"
                  cameraPresetTick={0}
                  constructionKey={0}
                  zoomCommand={zoomCommand}
                  allowOrbit={false}
                  interactive={false}
                  showDimensions={false}
                />
              }
            />
          </LazyRoomViewport>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isFullscreen ? 'h-full' : 'h-[440px] lg:h-[500px]'} divide-y md:divide-y-0 md:divide-x ${isDark ? 'divide-[#343834]' : 'divide-[#D8C9B5]'}`}>
            <div className="relative h-full">
              <span className="pointer-events-none absolute top-4 left-4 z-20 px-2.5 py-1 bg-[#30332F]/90 text-[#F4F0E8] text-[11px] font-semibold tracking-[0.12em] uppercase rounded">
                ORIGINAL
              </span>
              <RoomCanvas
                dimensions={baselineProject.dimensions}
                shell={baselineProject.shell}
                furniture={baselineProject.furniture}
                selectedId={null}
                walkthroughMode={false}
                cameraPreset="isometric"
                cameraPresetTick={0}
                constructionKey={0}
                zoomCommand={zoomCommand}
                allowOrbit
                interactive={false}
                showDimensions={false}
              />
            </div>
            <div className="relative h-full">
              <span className="pointer-events-none absolute top-4 left-4 z-20 px-2.5 py-1 bg-[#78816C]/95 text-[#FFFFFF] text-[11px] font-semibold tracking-[0.12em] uppercase rounded">
                REDESIGNED
              </span>
              <RoomCanvas
                dimensions={targetProject.dimensions}
                shell={targetProject.shell}
                furniture={targetProject.furniture}
                selectedId={null}
                walkthroughMode={false}
                cameraPreset="isometric"
                cameraPresetTick={0}
                constructionKey={0}
                zoomCommand={zoomCommand}
                allowOrbit
                interactive={false}
                showDimensions={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Transformation Summary */}
      <div className={`p-6 rounded-2xl border ${cardCls} grid grid-cols-1 lg:grid-cols-12 gap-6`}>
        <div className="lg:col-span-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78816C]">
            Transformation Summary
          </p>
          <h3 className={`font-display text-2xl ${headingCls}`}>
            What Changed in This Design
          </h3>
          <ul className={`space-y-2 text-xs ${bodyCls}`}>
            {summary.changes.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#78816C] mt-1.5 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {onOpenProject && (
            <button
              type="button"
              onClick={() => onOpenProject(targetProject)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#30332F] hover:bg-[#434742] text-[#FFFFFF] text-xs font-medium rounded-lg transition-colors"
            >
              <span>Open {targetProject.name} in 3D Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#222522] border-[#343834]' : 'bg-[#F4F0E8] border-[#D8C9B5]'} space-y-2`}>
            <p className={`text-[11px] uppercase tracking-wider font-semibold ${mutedCls}`}>
              Design Style & Surfaces
            </p>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className={mutedCls}>Style:</span>
                <span className={`font-medium ${headingCls}`}>
                  {summary.origStyle} → {summary.nextStyle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={mutedCls}>Flooring:</span>
                <span className={`font-medium ${headingCls}`}>
                  {summary.origFloor} → {summary.nextFloor}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className={mutedCls}>Wall Palette:</span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border border-black/15"
                    style={{ backgroundColor: baselineProject.shell.wallColor }}
                    title={baselineProject.shell.wallColor}
                  />
                  <span className={mutedCls}>→</span>
                  <span
                    className="w-4 h-4 rounded-full border border-black/15"
                    style={{ backgroundColor: targetProject.shell.wallColor }}
                    title={targetProject.shell.wallColor}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#222522] border-[#343834]' : 'bg-[#F4F0E8] border-[#D8C9B5]'} space-y-2`}>
            <p className={`text-[11px] uppercase tracking-wider font-semibold ${mutedCls}`}>
              Furniture & Cost Difference
            </p>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className={mutedCls}>Placed Items:</span>
                <span className={`font-mono-tabular font-medium ${headingCls}`}>
                  {summary.origCount} → {summary.nextCount} pieces
                </span>
              </div>
              <div className="flex justify-between">
                <span className={mutedCls}>Catalog Furniture Value:</span>
                <span className={`font-mono-tabular font-medium ${headingCls}`}>
                  {formatINR(summary.origCost)} → {formatINR(summary.nextCost)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-black/10">
                <span className={mutedCls}>Estimated Difference:</span>
                <span className="font-mono-tabular font-semibold text-[#78816C]">
                  {formatSignedINR(summary.costDiff)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
