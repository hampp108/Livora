import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  RotateCw,
  Copy,
  Trash2,
  Sun,
  Sunrise,
  Sunset,
  Lamp,
  Moon,
  Eye,
  SplitSquareHorizontal,
  Sparkles,
  Search,
  Plus,
  Layers,
  Sliders,
  ArrowDownToLine,
  Hammer,
  Check,
  Bookmark,
  Camera,
  Share2,
  X,
  Zap,
  Film,
  BedDouble,
  Wind,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import {
  CeilingType,
  FloorMaterial,
  FurnitureCategory,
  FurnitureInstance,
  LightingPreset,
  QualityLevel,
  RoomProject,
  RoomType,
  UserSettings,
  WallSide,
} from '../types/room';
import {
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  getCatalogItem,
} from '../data/catalog';
import {
  createStarterFurniture,
  DESIGN_STYLES,
  getDefaultShellForRoom,
} from '../data/stylesAndTemplates';
import { CameraPreset, RoomCanvas, ZoomCommand } from '../three/RoomCanvas';
import {
  isNightLightingPreset,
  LIGHTING_PRESET_LIST,
  normalizeLightingPreset,
  resolveLightingPreset,
} from '../three/lightingPresets';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { AIDesignStudioPanel } from './AIDesignStudioPanel';
import { LivoraWordmark } from './LivoraWordmark';
import { estimateProjectTotalINR, formatINR } from '../utils/currency';
import { MATERIAL_GROUPS, normalizeFurnitureFinish } from '../three/pbrMaterials';

interface RoomEditorProps {
  project: RoomProject;
  settings: UserSettings;
  startWithConstruction?: boolean;
  onSaveProject: (updated: RoomProject) => void;
  onLogActivity: (action: string, projectName: string, category?: 'create' | 'edit' | 'style' | 'save') => void;
  onBackToDashboard: () => void;
  onChangeQuality?: (q: QualityLevel) => void;
}

type RightTab = 'item' | 'room' | 'lighting' | 'ai';

const ROOM_TYPES: RoomType[] = [
  'Bedroom',
  'Living Room',
  'Dining Room',
  'Kitchen',
  'Study Room',
  'Gaming Room',
  'Home Office',
  'Kids Room',
  'Bathroom',
  'Home Theater',
  'Pooja Room',
  'Balcony',
  'Custom Room',
];

const WALL_PALETTE = [
  '#F5F3EE',
  '#FAF8F3',
  '#EAE2D3',
  '#DFD6C7',
  '#D6C5B2',
  '#C8C4BA',
  '#5D6B53',
  '#353937',
  '#252625',
];

const FURNITURE_SWATCHES = [
  '#EFEAE0',
  '#DDD4C4',
  '#C7B8A1',
  '#9C7651',
  '#6B4C35',
  '#5D6B53',
  '#B57B5E',
  '#2D2E2C',
];

const FLOOR_MATERIALS: Array<{ id: FloorMaterial; label: string; color: string }> = [
  { id: 'white-oak', label: 'White Oak Wood', color: '#C9AE8B' },
  { id: 'herringbone-oak', label: 'Herringbone Oak', color: '#D6BE9E' },
  { id: 'smoked-walnut', label: 'Smoked Walnut', color: '#6B4D38' },
  { id: 'polished-marble', label: 'Calacatta Marble', color: '#EFECE5' },
  { id: 'ceramic-tile', label: 'Ceramic Tile', color: '#E2DDD4' },
  { id: 'plush-carpet', label: 'Plush Carpet', color: '#CFC9BD' },
  { id: 'polished-concrete', label: 'Polished Concrete', color: '#C9C5BD' },
  { id: 'warm-travertine', label: 'Warm Travertine', color: '#DFD5C3' },
];

const CONFETTI_PIECES = Array.from({ length: 22 }).map((_, i) => ({
  id: i,
  x: (Math.sin(i * 1.7) * 140),
  y: -70 - (i % 5) * 28,
  rot: (i * 47) % 360,
  color: ['#5D6B53', '#C5A059', '#D8C7AE', '#1F2220', '#8FA089'][i % 5],
}));

export const RoomEditor: React.FC<RoomEditorProps> = ({
  project: initialProject,
  settings,
  startWithConstruction = false,
  onSaveProject,
  onLogActivity,
  onBackToDashboard,
  onChangeQuality,
}) => {
  const [project, setProject] = useState<RoomProject>(initialProject);
  const [history, setHistory] = useState<RoomProject[]>([initialProject]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory | 'All'>('All');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [rightTab, setRightTab] = useState<RightTab>('room');

  const [walkthroughMode, setWalkthroughMode] = useState(false);
  const [cinematicPreview, setCinematicPreview] = useState(false);
  const [cinematicCaption, setCinematicCaption] = useState('Entrance Sweep · Architectural Threshold');
  const [compareMode, setCompareMode] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('wide');
  const [cameraPresetTick, setCameraPresetTick] = useState(0);
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand>({ type: 'reset', tick: 0 });
  const [isFullscreenViewport, setIsFullscreenViewport] = useState(false);
  const [constructionKey, setConstructionKey] = useState(startWithConstruction ? 1 : 0);
  const [qualityLevel, setQualityLevel] = useState<QualityLevel>(settings.qualityLevel ?? 'high');
  const [isDissolvingRoom, setIsDissolvingRoom] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [draggingCatalogId, setDraggingCatalogId] = useState<string | null>(null);
  const [ghostPreview, setGhostPreview] = useState<{ catalogId: string; x: number; z: number } | null>(null);
  const [deletedUndoToast, setDeletedUndoToast] = useState<{ name: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const [atmosphereOpen, setAtmosphereOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );
  const [rightPanelOpen, setRightPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );

  const captureFnRef = useRef<(() => string | null) | null>(null);
  const atmosphereRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    setPrefersReducedMotion(mq.matches);
    const handler = (ev: MediaQueryListEvent) => setPrefersReducedMotion(ev.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!atmosphereOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (atmosphereRef.current && !atmosphereRef.current.contains(e.target as Node)) {
        setAtmosphereOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, [atmosphereOpen]);

  const isReducedMotion = Boolean(settings.reducedMotion) || prefersReducedMotion;

  useEffect(() => {
    setProject(initialProject);
    setHistory([initialProject]);
    setHistoryIndex(0);
    setSelectedId(null);
    setConstructionKey(startWithConstruction ? 1 : 0);
  }, [initialProject.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((curr) => (curr === msg ? null : curr)), 2400);
  }, []);

  const commitChange = useCallback(
    (next: RoomProject, logText?: string, category: 'edit' | 'style' | 'save' = 'edit') => {
      setProject(next);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, next].slice(-25);
      });
      setHistoryIndex((idx) => Math.min(24, idx + 1));
      onSaveProject(next);
      if (logText) {
        onLogActivity(logText, next.name, category);
      }
    },
    [historyIndex, onSaveProject, onLogActivity],
  );

  const handleLivePosition = useCallback((id: string, pos: [number, number, number]) => {
    setProject((prev) => ({
      ...prev,
      furniture: prev.furniture.map((f) => (f.instanceId === id ? { ...f, position: pos } : f)),
    }));
  }, []);

  const handleDragComplete = useCallback(
    (id: string) => {
      const piece = project.furniture.find((f) => f.instanceId === id);
      commitChange(project, piece ? `Moved ${piece.name}` : undefined);
    },
    [project, commitChange],
  );

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const prevProject = history[historyIndex - 1];
    setHistoryIndex((idx) => idx - 1);
    setProject(prevProject);
    onSaveProject(prevProject);
    setDeletedUndoToast(null);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextProject = history[historyIndex + 1];
    setHistoryIndex((idx) => idx + 1);
    setProject(nextProject);
    onSaveProject(nextProject);
  };

  const selectedPiece = useMemo(
    () => project.furniture.find((f) => f.instanceId === selectedId) ?? null,
    [project.furniture, selectedId],
  );

  const selectedCatalog = useMemo(
    () => (selectedPiece ? getCatalogItem(selectedPiece.catalogId) : undefined),
    [selectedPiece],
  );

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    const list = FURNITURE_CATALOG.filter((item) => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
    return [...list].sort((a, b) => {
      const aRec = a.recommendedRooms?.includes(project.roomType) ? 0 : 1;
      const bRec = b.recommendedRooms?.includes(project.roomType) ? 0 : 1;
      return aRec - bRec;
    });
  }, [activeCategory, catalogSearch, project.roomType]);

  const handleAddFurniture = (catalogId: string, dropPos?: [number, number]) => {
    const cat = getCatalogItem(catalogId);
    if (!cat) return;
    const x = dropPos ? dropPos[0] : (Math.random() - 0.5) * Math.max(1, project.dimensions.length * 0.35);
    const z = dropPos ? dropPos[1] : (Math.random() - 0.5) * Math.max(1, project.dimensions.width * 0.35);
    const y = cat.mountType === 'wall' ? (cat.defaultMountHeight ?? 1.55) : 0;

    const defaultClosedIds = new Set([
      'bed-platform-oak',
      'bed-canopy-suite',
      'nightstand-curved-lamp',
      'wardrobe-glass-display',
      'wardrobe-fluted-oak',
      'cabinet-walnut-credenza',
      'chair-cinema-recliner',
      'table-sitstand-desk',
    ]);

    const newInst: FurnitureInstance = {
      instanceId: `${cat.id}-${Date.now().toString(36)}`,
      catalogId: cat.id,
      name: cat.name,
      position: [Number(x.toFixed(2)), y, Number(z.toFixed(2))],
      rotationY: 0,
      scale: 1,
      primaryColor: cat.defaultPrimaryColor,
      secondaryColor: cat.defaultSecondaryColor,
      finish: cat.defaultFinish,
      isActiveState: !defaultClosedIds.has(cat.id),
    };

    const next: RoomProject = {
      ...project,
      furniture: [...project.furniture, newInst],
    };
    commitChange(next, `Added ${cat.name}`);
    setSelectedId(newInst.instanceId);
    setRightTab('item');
  };

  const updateSelectedPiece = (patch: Partial<FurnitureInstance>) => {
    if (!selectedPiece) return;
    const next: RoomProject = {
      ...project,
      furniture: project.furniture.map((f) =>
        f.instanceId === selectedPiece.instanceId ? { ...f, ...patch } : f,
      ),
    };
    commitChange(next);
  };

  const handleRotate90 = () => {
    if (!selectedPiece) return;
    updateSelectedPiece({ rotationY: selectedPiece.rotationY + Math.PI / 2 });
  };

  const handleSnapToFloor = () => {
    if (!selectedPiece) return;
    const cat = getCatalogItem(selectedPiece.catalogId);
    const targetY = cat?.mountType === 'wall' ? (cat.defaultMountHeight ?? 1.55) : 0;
    updateSelectedPiece({
      position: [selectedPiece.position[0], targetY, selectedPiece.position[2]],
    });
  };

  const handleDuplicateSelected = () => {
    if (!selectedPiece) return;
    const clone: FurnitureInstance = {
      ...selectedPiece,
      instanceId: `${selectedPiece.catalogId}-${Date.now().toString(36)}`,
      position: [
        Math.min(project.dimensions.length / 2 - 0.4, selectedPiece.position[0] + 0.55),
        selectedPiece.position[1],
        Math.min(project.dimensions.width / 2 - 0.4, selectedPiece.position[2] + 0.45),
      ],
    };
    const next: RoomProject = {
      ...project,
      furniture: [...project.furniture, clone],
    };
    commitChange(next, `Duplicated ${selectedPiece.name}`);
    setSelectedId(clone.instanceId);
  };

  const handleDeleteSelected = () => {
    if (!selectedPiece) return;
    const targetId = selectedPiece.instanceId;
    const deletedName = selectedPiece.name;
    setSelectedId(null);

    const finalizeRemoval = () => {
      setDeletingIds((prev) => prev.filter((id) => id !== targetId));
      const next: RoomProject = {
        ...project,
        furniture: project.furniture.filter((f) => f.instanceId !== targetId),
      };
      commitChange(next, `Removed ${deletedName}`);
      setDeletedUndoToast({ name: deletedName });
      window.setTimeout(() => setDeletedUndoToast(null), 4000);
    };

    if (isReducedMotion) {
      finalizeRemoval();
    } else {
      setDeletingIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));
      window.setTimeout(finalizeRemoval, 280);
    }
  };

  const updateShell = (patch: Partial<RoomProject['shell']>, logText?: string) => {
    const next: RoomProject = {
      ...project,
      shell: { ...project.shell, ...patch },
    };
    commitChange(next, logText, 'style');
  };

  const handleSwitchRoomType = (nextRoomType: RoomType) => {
    if (nextRoomType === project.roomType) return;
    setIsDissolvingRoom(true);
    setSelectedId(null);
    window.setTimeout(() => {
      const nextShell = getDefaultShellForRoom(nextRoomType, project.styleId);
      const nextFurniture = createStarterFurniture(
        nextRoomType,
        project.styleId,
        project.dimensions.length,
        project.dimensions.width,
      );
      commitChange(
        {
          ...project,
          roomType: nextRoomType,
          shell: nextShell,
          furniture: nextFurniture,
        },
        `Switched room type to ${nextRoomType}`,
        'style',
      );
      setConstructionKey((k) => k + 1);
      setIsDissolvingRoom(false);
    }, 340);
  };

  const handleApplyStyleTheme = (styleId: RoomProject['styleId']) => {
    const st = DESIGN_STYLES.find((s) => s.id === styleId);
    if (!st) return;
    const updatedFurniture =
      project.furniture.length > 0
        ? project.furniture.map((f) => {
            const cat = getCatalogItem(f.catalogId);
            if (!cat) return f;
            if (cat.category === 'Rugs') return { ...f, primaryColor: st.accentFurnitureColors.rug };
            if (cat.category === 'Sofas' || cat.category === 'Beds' || cat.category === 'Chairs') {
              return {
                ...f,
                primaryColor: st.accentFurnitureColors.upholstery,
                secondaryColor: st.accentFurnitureColors.wood,
              };
            }
            if (
              cat.category === 'Tables' ||
              cat.category === 'Wardrobes' ||
              cat.category === 'Cabinets' ||
              cat.category === 'Shelves'
            ) {
              return {
                ...f,
                primaryColor: st.accentFurnitureColors.wood,
                secondaryColor: st.accentFurnitureColors.metal,
              };
            }
            return f;
          })
        : createStarterFurniture(
            project.roomType,
            styleId,
            project.dimensions.length,
            project.dimensions.width,
          );

    commitChange(
      {
        ...project,
        styleId,
        shell: { ...project.shell, ...st.shellPatch },
        furniture: updatedFurniture,
      },
      `Applied ${st.name} theme`,
      'style',
    );
  };

  const handleManualSave = () => {
    const saved: RoomProject = { ...project, savedToArchive: true };
    commitChange(saved, 'Saved a design', 'save');
    setSavedToast(true);
    setShowConfetti(true);
    window.setTimeout(() => setSavedToast(false), 1800);
    window.setTimeout(() => setShowConfetti(false), 1300);
  };

  const handlePhotoExport = () => {
    const dataUrl = captureFnRef.current?.();
    if (!dataUrl) {
      showToast('Viewport snapshot unavailable in this browser mode.');
      return;
    }
    const link = document.createElement('a');
    link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-render.png`;
    link.href = dataUrl;
    link.click();
    showToast('High-res room render downloaded');
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}?room=${encodeURIComponent(project.id)}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    showToast('Project link copied to clipboard');
  };

  const handleDeleteRef = useRef(handleDeleteSelected);
  handleDeleteRef.current = handleDeleteSelected;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !walkthroughMode && !cinematicPreview) {
          handleDeleteRef.current();
        }
      } else if (e.key === 'Escape') {
        if (atmosphereOpen) setAtmosphereOpen(false);
        else if (cinematicPreview) setCinematicPreview(false);
        else if (walkthroughMode) setWalkthroughMode(false);
        else setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, walkthroughMode, cinematicPreview, atmosphereOpen]);

  const emptyShellForCompare = useMemo(
    () => ({
      ...project.shell,
      wallColor: '#E2DBD0',
      hasAccentWall: false,
      hasCurtains: false,
    }),
    [project.shell],
  );

  const isNightMode = isNightLightingPreset(project.shell.lightingPreset);
  const activeLightingPresetId = normalizeLightingPreset(project.shell.lightingPreset);
  const activeLightingPreset = resolveLightingPreset(project.shell.lightingPreset);
  const isBedSelected = Boolean(
    selectedPiece &&
      getCatalogItem(selectedPiece.catalogId)?.category === 'Beds' &&
      selectedPiece.catalogId !== 'bed-kids-bunk',
  );
  const hasBed = useMemo(
    () =>
      project.furniture.some(
        (f) =>
          getCatalogItem(f.catalogId)?.category === 'Beds' &&
          f.catalogId !== 'bed-kids-bunk',
      ),
    [project.furniture],
  );
  const hidePanels = walkthroughMode || cinematicPreview || isFullscreenViewport;
  const catalogTotalCost = useMemo(
    () =>
      project.furniture.reduce(
        (sum, item) => sum + (getCatalogItem(item.catalogId)?.price ?? 0),
        0,
      ),
    [project.furniture],
  );
  const estimatedRoomTotal = useMemo(() => estimateProjectTotalINR(project), [project]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F4F0E8] text-[#30332F] flex flex-col">
      {/* TOP ARCHITECTURAL TOOLBAR */}
      <header className="h-14 px-4 border-b border-[#E2DDD3] bg-[#F3EFE6]/95 flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#4F514D] hover:text-[#1F2220] hover:bg-[#EAE4D8] rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </motion.button>

          <span className="h-4 w-px bg-[#DDD7CB]" />
          <LivoraWordmark size="sm" showMonogram={false} className="hidden md:inline-flex" />
          <span className="hidden md:inline-block h-4 w-px bg-[#DDD7CB]" />

          <input
            type="text"
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            onBlur={() => onSaveProject(project)}
            className="font-display text-base bg-transparent border-b border-transparent hover:border-[#C7B8A1] focus:border-[#5D6B53] focus:outline-none px-1 py-0.5 min-w-0 w-36 sm:w-48 truncate"
          />

          {/* Quick Room-Type Switcher */}
          <select
            value={project.roomType}
            onChange={(e) => handleSwitchRoomType(e.target.value as RoomType)}
            title="Switch room function (dissolves & rebuilds 3D space)"
            className="hidden lg:block px-2.5 py-1 text-xs font-medium bg-[#FBF9F5] border border-[#DDD7CB] rounded-lg text-[#1F2220] focus:outline-none focus:border-[#5D6B53]"
          >
            {ROOM_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>

          {!hidePanels && (
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => setLeftPanelOpen((v) => !v)}
                title={leftPanelOpen ? 'Hide Furniture Catalog' : 'Show Furniture Catalog'}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  leftPanelOpen
                    ? 'bg-[#30332F] text-[#FFFFFF] border-[#30332F]'
                    : 'bg-[#FBF9F5] text-[#4F514D] border-[#DDD7CB] hover:text-[#1F2220]'
                }`}
              >
                <PanelLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Catalog</span>
              </button>
              <button
                type="button"
                onClick={() => setRightPanelOpen((v) => !v)}
                title={rightPanelOpen ? 'Hide Inspector' : 'Show Inspector'}
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  rightPanelOpen
                    ? 'bg-[#30332F] text-[#FFFFFF] border-[#30332F]'
                    : 'bg-[#FBF9F5] text-[#4F514D] border-[#DDD7CB] hover:text-[#1F2220]'
                }`}
              >
                <PanelRight className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Inspector</span>
              </button>
            </div>
          )}
        </div>

        {/* Center Editing Actions */}
        {!hidePanels && (
          <div className="hidden xl:flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo"
              className="p-2 rounded-lg hover:bg-[#EAE4D8] disabled:opacity-35 transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
              className="p-2 rounded-lg hover:bg-[#EAE4D8] disabled:opacity-35 transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <span className="h-4 w-px bg-[#DDD7CB] mx-1" />

            <button
              type="button"
              onClick={handleRotate90}
              disabled={!selectedPiece}
              title="Rotate 90°"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg hover:bg-[#EAE4D8] disabled:opacity-35"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </button>
            <button
              type="button"
              onClick={handleSnapToFloor}
              disabled={!selectedPiece}
              title="Snap to Floor"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg hover:bg-[#EAE4D8] disabled:opacity-35"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Snap</span>
            </button>
            <button
              type="button"
              onClick={handleDuplicateSelected}
              disabled={!selectedPiece}
              title="Duplicate"
              className="p-2 rounded-lg hover:bg-[#EAE4D8] disabled:opacity-35"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={!selectedPiece}
              title="Delete Selected"
              className="p-2 rounded-lg hover:bg-[#F5E8E6] text-[#8B3228] disabled:opacity-35"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right Controls: Day/Night, Quality, Photo, Share, Compare, Cinematic, Walk, Save */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Day / Night Toggle */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              const targetPreset = resolveLightingPreset(
                isNightMode ? 'golden-hour' : 'night-ambient',
              );
              updateShell(
                {
                  lightingPreset: targetPreset.id as LightingPreset,
                  exposure: targetPreset.exposure,
                  sunIntensity: 1.0,
                },
                isNightMode ? 'Switched to Golden Hour' : 'Switched to Night Ambient',
              );
            }}
            title="Toggle Day / Night Lighting"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              isNightMode
                ? 'bg-[#1F2220] text-[#FFE1AC] border-[#1F2220]'
                : 'bg-[#FBF9F5] text-[#1F2220] border-[#DDD7CB] hover:border-[#8D877B]'
            }`}
          >
            {isNightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-[#B8863B]" />}
            <span className="hidden sm:inline">{isNightMode ? 'Night' : 'Day'}</span>
          </motion.button>

          {/* Render Quality Selector */}
          <select
            value={qualityLevel}
            onChange={(e) => {
              const nextQ = e.target.value as QualityLevel;
              setQualityLevel(nextQ);
              onChangeQuality?.(nextQ);
              showToast(`Render quality set to ${nextQ.toUpperCase()}`);
            }}
            title="3D Post-Processing Quality"
            className="hidden md:block px-2 py-1.5 text-xs font-medium bg-[#FBF9F5] border border-[#DDD7CB] rounded-lg text-[#3A3C39] focus:outline-none"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High (SSAO)</option>
            <option value="ultra">Ultra</option>
          </select>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handlePhotoExport}
            title="Download High-Res Render PNG"
            className="p-2 rounded-lg bg-[#FBF9F5] border border-[#DDD7CB] hover:border-[#8D877B] text-[#3A3C39]"
          >
            <Camera className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handleShareLink}
            title="Copy Share Link"
            className="hidden sm:inline-flex p-2 rounded-lg bg-[#FBF9F5] border border-[#DDD7CB] hover:border-[#8D877B] text-[#3A3C39]"
          >
            <Share2 className="w-3.5 h-3.5" />
          </motion.button>

          <button
            type="button"
            onClick={() => {
              setCompareMode((v) => !v);
              setWalkthroughMode(false);
              setCinematicPreview(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              compareMode
                ? 'bg-[#5D6B53] text-[#F5F3EE] border-[#5D6B53]'
                : 'bg-[#FBF9F5] text-[#3A3C39] border-[#DDD7CB] hover:border-[#8D877B]'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Before / After</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCinematicPreview((v) => !v);
              setWalkthroughMode(false);
              setCompareMode(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              cinematicPreview
                ? 'bg-[#5D6B53] text-[#F5F3EE] border-[#5D6B53]'
                : 'bg-[#FBF9F5] text-[#3A3C39] border-[#DDD7CB] hover:border-[#8D877B]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{cinematicPreview ? 'Exit Preview' : 'Cinematic'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setWalkthroughMode((v) => !v);
              setCinematicPreview(false);
              setCompareMode(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              walkthroughMode
                ? 'bg-[#1F2220] text-[#F5F3EE] border-[#1F2220]'
                : 'bg-[#FBF9F5] text-[#3A3C39] border-[#DDD7CB] hover:border-[#8D877B]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{walkthroughMode ? 'Editor' : 'Walk'}</span>
          </button>

          <div className="relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleManualSave}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1F2220] hover:bg-[#323533] text-[#F5F3EE] text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {savedToast ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedToast ? 'Saved' : 'Save'}</span>
            </motion.button>

            {/* Sparkle / Confetti Celebration */}
            <AnimatePresence>
              {showConfetti && (
                <div className="pointer-events-none fixed top-14 right-8 z-50">
                  {CONFETTI_PIECES.map((p) => (
                    <motion.span
                      key={p.id}
                      initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
                      animate={{
                        opacity: 0,
                        x: p.x,
                        y: -p.y + 90,
                        scale: 0.4,
                        rotate: p.rot,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.05, ease: 'easeOut' }}
                      className="absolute w-2 h-2 rounded-xs"
                      style={{ backgroundColor: p.color }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN STUDIO BODY */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Mobile/Tablet Backdrop when a drawer is open */}
        {!hidePanels && (leftPanelOpen || rightPanelOpen) && (
          <div
            onClick={() => {
              setLeftPanelOpen(false);
              setRightPanelOpen(false);
            }}
            className="lg:hidden fixed inset-0 top-14 bg-black/25 z-20"
            aria-hidden="true"
          />
        )}

        {/* LEFT: Furniture & Asset Library */}
        <AnimatePresence>
          {!hidePanels && leftPanelOpen && (
            <motion.aside
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed lg:static top-14 bottom-0 left-0 w-64 lg:w-60 xl:w-64 shrink-0 border-r border-[#E2DDD3] bg-[#FBF9F5]/98 flex flex-col min-h-0 z-30 lg:z-20 shadow-xl lg:shadow-none"
            >
              <div className="p-3 border-b border-[#E2DDD3] space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm text-[#1F2220]">Furniture Catalog</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#6B6D68] font-mono-tabular">
                      {filteredCatalog.length} items
                    </span>
                    <button
                      type="button"
                      onClick={() => setLeftPanelOpen(false)}
                      aria-label="Close catalog panel"
                      className="lg:hidden p-1 rounded hover:bg-[#EAE4D8] text-[#4F514D]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#6B6D68] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search beds, sofas, kitchen, lamps..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#F5F3EE] border border-[#DDD7CB] rounded-lg focus:outline-none focus:border-[#5D6B53]"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('All')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                      activeCategory === 'All'
                        ? 'bg-[#1F2220] text-[#F5F3EE]'
                        : 'bg-[#EFECE4] text-[#4F514D] hover:text-[#1F2220]'
                    }`}
                  >
                    All
                  </button>
                  {FURNITURE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                        activeCategory === cat
                          ? 'bg-[#1F2220] text-[#F5F3EE]'
                          : 'bg-[#EFECE4] text-[#4F514D] hover:text-[#1F2220]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredCatalog.map((item, idx) => {
                  const isRecommended = item.recommendedRooms?.includes(project.roomType);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.28) }}
                      draggable
                      onDragStart={(e) => {
                        const dt = (e as unknown as React.DragEvent<HTMLDivElement>).dataTransfer;
                        dt?.setData('text/livora-catalog-id', item.id);
                        setDraggingCatalogId(item.id);
                      }}
                      onDragEnd={() => {
                        setDraggingCatalogId(null);
                        setGhostPreview(null);
                      }}
                      onClick={() => handleAddFurniture(item.id)}
                      className="group cursor-pointer p-3 rounded-xl border border-[#E5E0D5] bg-[#F5F3EE] hover:border-[#5D6B53] hover:bg-[#EFECE4]/70 transition-all flex items-start justify-between gap-2.5"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-sm border border-black/15 shrink-0"
                            style={{ backgroundColor: item.defaultPrimaryColor }}
                          />
                          <p className="text-xs font-medium text-[#1F2220] truncate">
                            {item.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-[#6B6D68]">
                          {item.category} ·{' '}
                          <span className="font-mono-tabular">
                            {item.width.toFixed(1)}×{item.depth.toFixed(1)}m
                          </span>{' '}
                          ·{' '}
                          <span className="font-mono-tabular text-[#5D6B53] font-medium">
                            {formatINR(item.price)}
                          </span>
                        </p>
                        {isRecommended && (
                          <p className="text-[10px] text-[#5D6B53] font-medium">
                            Curated for {project.roomType}
                          </p>
                        )}
                      </div>
                      <span className="p-1.5 rounded-md bg-[#EAE4D8] group-hover:bg-[#5D6B53] group-hover:text-[#F5F3EE] text-[#3A3C39] transition-colors shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* CENTRE: Large 3D Room Viewport */}
        <main
          className="flex-1 min-w-0 relative bg-[#E8E0D3]"
          onDragOver={(e) => {
            e.preventDefault();
            if (!draggingCatalogId) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width - 0.5) * (project.dimensions.length * 0.72);
            const nz = ((e.clientY - rect.top) / rect.height - 0.5) * (project.dimensions.width * 0.72);
            setGhostPreview({
              catalogId: draggingCatalogId,
              x: Math.round(nx * 4) / 4,
              z: Math.round(nz * 4) / 4,
            });
          }}
          onDragLeave={() => setGhostPreview(null)}
          onDrop={(e) => {
            e.preventDefault();
            const catId = e.dataTransfer.getData('text/livora-catalog-id') || draggingCatalogId;
            if (catId) {
              const rect = e.currentTarget.getBoundingClientRect();
              const nx = ((e.clientX - rect.left) / rect.width - 0.5) * (project.dimensions.length * 0.72);
              const nz = ((e.clientY - rect.top) / rect.height - 0.5) * (project.dimensions.width * 0.72);
              handleAddFurniture(catId, [Math.round(nx * 4) / 4, Math.round(nz * 4) / 4]);
            }
            setDraggingCatalogId(null);
            setGhostPreview(null);
          }}
        >
          {/* Dissolve / Rebuild Transition Fade */}
          <AnimatePresence>
            {isDissolvingRoom && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-[#F5F3EE] pointer-events-none flex items-center justify-center"
              >
                <p className="font-display text-2xl text-[#1F2220]">Rebuilding space...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {compareMode ? (
            <BeforeAfterSlider
              className="w-full h-full"
              beforeLabel="ORIGINAL"
              afterLabel={`REDESIGNED · ${project.name}`}
              beforeContent={
                <RoomCanvas
                  dimensions={project.dimensions}
                  shell={emptyShellForCompare}
                  furniture={[]}
                  selectedId={null}
                  walkthroughMode={false}
                  cameraPreset={cameraPreset}
                  cameraPresetTick={cameraPresetTick}
                  constructionKey={0}
                  zoomCommand={zoomCommand}
                  qualityLevel={qualityLevel}
                  interactive={false}
                  showDimensions={settings.showDimensionsOverlay}
                />
              }
              afterContent={
                <RoomCanvas
                  dimensions={project.dimensions}
                  shell={project.shell}
                  furniture={project.furniture}
                  selectedId={null}
                  walkthroughMode={false}
                  cameraPreset={cameraPreset}
                  cameraPresetTick={cameraPresetTick}
                  constructionKey={0}
                  zoomCommand={zoomCommand}
                  qualityLevel={qualityLevel}
                  reducedMotion={isReducedMotion}
                  interactive={false}
                  showDimensions={settings.showDimensionsOverlay}
                />
              }
            />
          ) : (
            <RoomCanvas
              dimensions={project.dimensions}
              shell={project.shell}
              furniture={project.furniture}
              selectedId={selectedId}
              walkthroughMode={walkthroughMode}
              cinematicPreview={cinematicPreview}
              onCinematicStageChange={setCinematicCaption}
              reducedMotion={isReducedMotion}
              deletingIds={deletingIds}
              cameraPreset={cameraPreset}
              cameraPresetTick={cameraPresetTick}
              zoomCommand={zoomCommand}
              focusSelectedItem={false}
              constructionKey={constructionKey}
              qualityLevel={qualityLevel}
              ghostPreview={ghostPreview}
              gridSnap={settings.gridSnap}
              showDimensions={settings.showDimensionsOverlay}
              onSelectFurniture={setSelectedId}
              onUpdateFurniturePosition={handleLivePosition}
              onDragEnd={handleDragComplete}
              onRegisterCapture={(fn) => {
                captureFnRef.current = fn;
              }}
            />
          )}

          {/* Compact Selected Item Action Bar */}
          <AnimatePresence>
            {!hidePanels && !compareMode && selectedPiece && selectedCatalog && (
              <motion.div
                key={selectedPiece.instanceId}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="absolute top-3 left-3 z-20 max-w-[calc(100%-13rem)] px-3 py-2 rounded-xl border border-[#D8C9B5] bg-[#FFFFFF]/95 shadow-md flex flex-wrap items-center gap-2 text-xs"
              >
                <span className="px-1.5 py-0.5 rounded bg-[#F4F0E8] text-[10px] font-semibold uppercase tracking-wider text-[#78816C]">
                  {selectedCatalog.category}
                </span>
                <span className="font-display text-sm text-[#30332F] font-medium truncate max-w-[170px]">
                  {selectedPiece.name}
                </span>
                <span className="hidden sm:inline font-mono-tabular text-[11px] text-[#6E6B64]">
                  {selectedCatalog.width.toFixed(1)}×{selectedCatalog.depth.toFixed(1)}m
                </span>
                <span className="font-mono-tabular font-semibold text-[#30332F]">
                  {formatINR(selectedCatalog.price)}
                </span>

                <span className="h-3.5 w-px bg-[#D8C9B5]" />

                <button
                  type="button"
                  onClick={() => {
                    setCameraPreset('close-up');
                    setCameraPresetTick((t) => t + 1);
                  }}
                  title="Focus camera on selected item"
                  className="px-2 py-1 rounded-md bg-[#F4F0E8] hover:bg-[#D8C9B5]/60 text-[11px] font-medium text-[#30332F]"
                >
                  Focus
                </button>

                {isBedSelected ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedPiece({ duvetFolded: !selectedPiece.duvetFolded })
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
                      selectedPiece.duvetFolded
                        ? 'bg-[#5D6B53] text-[#F5F3EE]'
                        : 'bg-[#1F2220] text-[#F5F3EE]'
                    }`}
                  >
                    <BedDouble className="w-3 h-3" />
                    <span>{selectedPiece.duvetFolded ? 'Smooth Duvet' : 'Turn Down'}</span>
                  </button>
                ) : (
                  selectedCatalog.interactiveLabel && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedPiece({ isActiveState: !selectedPiece.isActiveState })
                      }
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
                        selectedPiece.isActiveState
                          ? 'bg-[#5D6B53] text-[#F5F3EE]'
                          : 'bg-[#1F2220] text-[#F5F3EE]'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{selectedCatalog.interactiveLabel}</span>
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Clear selection"
                  className="p-1 rounded-md hover:bg-[#F4F0E8] text-[#6E6B64]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible Atmosphere Lighting Preset Dropdown (Closed by Default) */}
          {!hidePanels && !compareMode && (
            <div ref={atmosphereRef} className="absolute top-3 right-3 z-20 flex flex-col items-end">
              <button
                type="button"
                aria-expanded={atmosphereOpen}
                onClick={() => setAtmosphereOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#D8C9B5] bg-[#FFFFFF]/95 hover:bg-[#F4F0E8] shadow-sm text-xs font-medium text-[#30332F] transition-colors"
              >
                {activeLightingPresetId === 'natural-daylight' ? (
                  <Sun className="w-3.5 h-3.5 text-[#78816C]" />
                ) : activeLightingPresetId === 'soft-morning' ? (
                  <Sunrise className="w-3.5 h-3.5 text-[#78816C]" />
                ) : activeLightingPresetId === 'golden-hour' ? (
                  <Sunset className="w-3.5 h-3.5 text-[#B8863B]" />
                ) : activeLightingPresetId === 'warm-evening' ? (
                  <Lamp className="w-3.5 h-3.5 text-[#B8863B]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#30332F]" />
                )}
                <span className="hidden sm:inline text-[#6E6B64]">Atmosphere:</span>
                <span>{activeLightingPreset.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#6E6B64] transition-transform ${
                    atmosphereOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {atmosphereOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="mt-1.5 w-60 rounded-xl border border-[#D8C9B5] bg-[#FFFFFF]/98 shadow-xl p-2"
                  >
                    <div className="flex items-center justify-between px-2 pb-1.5 mb-1.5 border-b border-[#EAE4D8]">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78816C]">
                        Atmosphere
                      </span>
                      <span className="text-[10px] font-mono-tabular text-[#6E6B64]">
                        EV {activeLightingPreset.exposure.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {LIGHTING_PRESET_LIST.map((preset) => {
                        const isActive = activeLightingPresetId === preset.id;
                        const PresetIcon =
                          preset.id === 'natural-daylight'
                            ? Sun
                            : preset.id === 'soft-morning'
                            ? Sunrise
                            : preset.id === 'golden-hour'
                            ? Sunset
                            : preset.id === 'warm-evening'
                            ? Lamp
                            : Moon;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              updateShell(
                                {
                                  lightingPreset: preset.id as LightingPreset,
                                  exposure: preset.exposure,
                                  sunIntensity: 1.0,
                                },
                                `Switched lighting to ${preset.label}`,
                              );
                              setAtmosphereOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-[#30332F] text-[#FFFFFF]'
                                : 'text-[#3A3C39] hover:bg-[#F4F0E8]'
                            }`}
                          >
                            <span className="inline-flex items-center gap-2 truncate">
                              <PresetIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive ? 'text-[#D8C9B5]' : 'text-[#78816C]'
                                }`}
                              />
                              <span className="truncate">{preset.label}</span>
                            </span>
                            {isActive && <Check className="w-3 h-3 shrink-0 text-[#D8C9B5]" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Walkthrough HUD */}
          {walkthroughMode && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-5 py-2.5 rounded-xl bg-[#1F2220]/95 text-[#F5F3EE] text-xs shadow-lg">
              <span>Use W / A / S / D or Arrow keys to walk · Drag viewport to look around</span>
              <button
                type="button"
                onClick={() => setWalkthroughMode(false)}
                className="pointer-events-auto px-3 py-1 bg-[#F5F3EE] text-[#1F2220] font-medium rounded-md whitespace-nowrap shrink-0"
              >
                Exit Walkthrough
              </button>
            </div>
          )}

          {/* Cinematic Preview Mode HUD */}
          {cinematicPreview && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-5 py-2.5 rounded-xl bg-[#1F2220]/95 border border-[#4A4942] text-[#F5F3EE] text-xs shadow-xl">
              <div className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-[#D8B679]" />
                <span className="font-medium tracking-wide">{cinematicCaption}</span>
              </div>
              <button
                type="button"
                onClick={() => setCinematicPreview(false)}
                className="pointer-events-auto px-3 py-1 bg-[#F5F3EE] text-[#1F2220] font-medium rounded-md whitespace-nowrap shrink-0 hover:bg-[#E7E1D5]"
              >
                Exit Preview
              </button>
            </div>
          )}

          {/* Bottom Camera Presets & Zoom Dock */}
          {!walkthroughMode && !cinematicPreview && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FFFFFF]/95 border border-[#D8C9B5] shadow-sm max-w-[95vw] overflow-x-auto">
              {(
                [
                  { id: 'wide', label: 'Wide' },
                  { id: 'entrance', label: 'Entrance' },
                  { id: 'bed-showcase', label: hasBed ? 'Bed Showcase' : 'Focal View' },
                  { id: 'close-up', label: 'Close-up' },
                  { id: 'corner', label: 'Corner' },
                  { id: 'top-down', label: 'Top-down' },
                ] as Array<{ id: CameraPreset; label: string }>
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => {
                    setCameraPreset(cam.id);
                    setCameraPresetTick((t) => t + 1);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    cameraPreset === cam.id
                      ? 'bg-[#30332F] text-[#FFFFFF]'
                      : 'text-[#52554F] hover:bg-[#F4F0E8] hover:text-[#30332F]'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
              <span className="h-4 w-px bg-[#D8C9B5] mx-0.5 shrink-0" />
              <button
                type="button"
                title="Zoom In"
                onClick={() => setZoomCommand((z) => ({ type: 'in', tick: z.tick + 1 }))}
                className="p-1.5 rounded-lg text-[#30332F] hover:bg-[#F4F0E8] shrink-0"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Zoom Out"
                onClick={() => setZoomCommand((z) => ({ type: 'out', tick: z.tick + 1 }))}
                className="p-1.5 rounded-lg text-[#30332F] hover:bg-[#F4F0E8] shrink-0"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Reset Full Room View"
                onClick={() => {
                  setCameraPreset('wide');
                  setZoomCommand((z) => ({ type: 'reset', tick: z.tick + 1 }));
                }}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#30332F] hover:bg-[#F4F0E8] rounded-lg whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                type="button"
                title={isFullscreenViewport ? 'Exit Fullscreen' : 'Fullscreen 3D Viewport'}
                onClick={() => setIsFullscreenViewport((v) => !v)}
                className="p-1.5 rounded-lg text-[#30332F] hover:bg-[#F4F0E8] shrink-0"
              >
                {isFullscreenViewport ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="h-4 w-px bg-[#D8C9B5] mx-0.5 shrink-0" />
              <button
                type="button"
                title="Replay Room Construction Animation"
                onClick={() => setConstructionKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#78816C] hover:bg-[#F4F0E8] rounded-lg whitespace-nowrap shrink-0"
              >
                <Hammer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Build Anim</span>
              </button>
            </div>
          )}

          {/* Slide-in Undo Delete Toast */}
          <AnimatePresence>
            {deletedUndoToast && (
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className="absolute bottom-20 right-4 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#1F2220] text-[#F5F3EE] text-xs shadow-lg"
              >
                <span>Removed {deletedUndoToast.name}</span>
                <button
                  type="button"
                  onClick={handleUndo}
                  className="px-2.5 py-1 rounded-md bg-[#5D6B53] text-[#F5F3EE] font-medium hover:bg-[#4D5A44]"
                >
                  Undo
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* General Notification Toast */}
          <AnimatePresence>
            {toastMsg && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-2 rounded-lg bg-[#1F2220] text-[#F5F3EE] text-xs shadow-md"
              >
                {toastMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* RIGHT: Properties & Customisation Panel */}
        <AnimatePresence>
          {!hidePanels && rightPanelOpen && (
            <motion.aside
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed lg:static top-14 bottom-0 right-0 w-72 lg:w-68 xl:w-76 shrink-0 border-l border-[#E2DDD3] bg-[#FBF9F5]/98 flex flex-col min-h-0 z-30 lg:z-20 shadow-xl lg:shadow-none"
            >
              {/* Tabs */}
              <div className="grid grid-cols-4 border-b border-[#E2DDD3] bg-[#F3EFE6]/90">
                {(
                  [
                    { id: 'item', label: 'Item', icon: Sliders },
                    { id: 'room', label: 'Room', icon: Layers },
                    { id: 'lighting', label: 'Light', icon: Sun },
                    { id: 'ai', label: 'AI', icon: Sparkles },
                  ] as Array<{
                    id: RightTab;
                    label: string;
                    icon: React.ComponentType<{ className?: string }>;
                  }>
                ).map((t) => {
                  const Icon = t.icon;
                  const active = rightTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setRightTab(t.id)}
                      className={`py-2.5 flex flex-col items-center justify-center gap-1 text-[11px] font-medium border-b-2 transition-colors ${
                        active
                          ? 'border-[#1F2220] text-[#1F2220] bg-[#FBF9F5]'
                          : 'border-transparent text-[#6B6D68] hover:text-[#1F2220]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {rightTab === 'item' && (
                  <>
                    {selectedPiece ? (
                      <div className="space-y-5">
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E5E0D5]">
                          <div>
                            <p className="text-[11px] text-[#5D6B53] font-medium">
                              {selectedCatalog?.category ?? 'Furniture'}
                            </p>
                            <h3 className="font-display text-lg text-[#1F2220]">
                              {selectedPiece.name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={handleDeleteSelected}
                            className="p-1.5 rounded-lg text-[#8B3228] hover:bg-[#F5E8E6]"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Position Controls */}
                        <div className="space-y-2.5">
                          <label className="block text-xs font-medium text-[#3A3C39]">
                            Position (meters)
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                              <div key={axis}>
                                <span className="block text-[10px] text-[#6B6D68] mb-0.5">
                                  {axis}
                                </span>
                                <input
                                  type="number"
                                  step={0.1}
                                  value={Number(selectedPiece.position[idx].toFixed(2))}
                                  onChange={(e) => {
                                    const nextPos = [...selectedPiece.position] as [
                                      number,
                                      number,
                                      number,
                                    ];
                                    nextPos[idx] = Number(e.target.value) || 0;
                                    updateSelectedPiece({ position: nextPos });
                                  }}
                                  className="w-full px-2 py-1.5 text-xs font-mono-tabular bg-[#F5F3EE] border border-[#DDD7CB] rounded-md"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Rotation & Scale */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-[#3A3C39]">Rotation</span>
                              <span className="font-mono-tabular text-[#6B6D68]">
                                {Math.round(((selectedPiece.rotationY * 180) / Math.PI) % 360)}°
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-Math.PI}
                              max={Math.PI}
                              step={0.087}
                              value={selectedPiece.rotationY}
                              onChange={(e) =>
                                updateSelectedPiece({ rotationY: Number(e.target.value) })
                              }
                              className="w-full accent-[#5D6B53]"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-[#3A3C39]">Resize / Scale</span>
                              <span className="font-mono-tabular text-[#6B6D68]">
                                {Math.round(selectedPiece.scale * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0.65}
                              max={1.45}
                              step={0.05}
                              value={selectedPiece.scale}
                              onChange={(e) =>
                                updateSelectedPiece({ scale: Number(e.target.value) })
                              }
                              className="w-full accent-[#5D6B53]"
                            />
                          </div>
                        </div>

                        {/* PBR Material Customisation System */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-medium text-[#3A3C39]">
                              Material & Surface Finish
                            </label>
                            <span className="text-[11px] font-medium capitalize text-[#5D6B53]">
                              {normalizeFurnitureFinish(selectedPiece.finish).replace('-', ' ')}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {MATERIAL_GROUPS.map((grp) => (
                              <div key={grp.group} className="space-y-1">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7D7A72]">
                                  {grp.group}
                                </span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {grp.items.map((mat) => {
                                    const active =
                                      normalizeFurnitureFinish(selectedPiece.finish) === mat.id;
                                    return (
                                      <button
                                        key={mat.id}
                                        type="button"
                                        onClick={() =>
                                          updateSelectedPiece({
                                            finish: mat.id,
                                            primaryColor: mat.defaultColor,
                                          })
                                        }
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-colors ${
                                          active
                                            ? 'border-[#30332F] bg-[#EFECE4] text-[#1F2220] font-semibold'
                                            : 'border-[#E0D9CC] bg-[#FFFFFF] text-[#4C4E48] hover:border-[#8D897E]'
                                        }`}
                                      >
                                        <span
                                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                                          style={{ backgroundColor: mat.swatch }}
                                        />
                                        <span className="truncate">{mat.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Primary & Secondary Colors */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-[#3A3C39]">
                            Primary Colour
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {FURNITURE_SWATCHES.map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => updateSelectedPiece({ primaryColor: hex })}
                                className={`w-6 h-6 rounded-full border transition-transform ${
                                  selectedPiece.primaryColor === hex
                                    ? 'ring-2 ring-[#1F2220] scale-110'
                                    : 'border-black/20'
                                }`}
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                            <input
                              type="color"
                              value={selectedPiece.primaryColor}
                              onChange={(e) =>
                                updateSelectedPiece({ primaryColor: e.target.value })
                              }
                              className="w-6 h-6 rounded-full overflow-hidden border border-[#DDD7CB] cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-[#3A3C39]">
                            Frame / Accent Tone
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['#8B6849', '#5B4332', '#C5A059', '#252625', '#D6CFC2', '#5D6B53'].map(
                              (hex) => (
                                <button
                                  key={hex}
                                  type="button"
                                  onClick={() => updateSelectedPiece({ secondaryColor: hex })}
                                  className={`w-6 h-6 rounded-full border transition-transform ${
                                    selectedPiece.secondaryColor === hex
                                      ? 'ring-2 ring-[#1F2220] scale-110'
                                      : 'border-black/20'
                                  }`}
                                  style={{ backgroundColor: hex }}
                                />
                              ),
                            )}
                          </div>
                        </div>

                        {/* Bed & Bedding Choreography Controls */}
                        {isBedSelected && (
                          <div className="p-3 rounded-xl bg-[#EFECE4] border border-[#DDD7CB] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#1F2220] inline-flex items-center gap-1.5">
                                <BedDouble className="w-3.5 h-3.5 text-[#5D6B53]" />
                                Bed & Bedding
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCameraPreset('bed-showcase');
                                  setCameraPresetTick((t) => t + 1);
                                }}
                                className="text-[11px] font-medium text-[#5D6B53] hover:text-[#1F2220]"
                              >
                                Focus Shot
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSelectedPiece({ duvetFolded: !selectedPiece.duvetFolded })
                                }
                                className={`py-2 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                                  selectedPiece.duvetFolded
                                    ? 'bg-[#5D6B53] text-[#F5F3EE]'
                                    : 'bg-[#1F2220] text-[#F5F3EE]'
                                }`}
                              >
                                {selectedPiece.duvetFolded ? 'Smooth Duvet' : 'Fold / Turn Down'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSelectedPiece({
                                    pillowFluffTick: (selectedPiece.pillowFluffTick ?? 0) + 1,
                                  })
                                }
                                className="py-2 px-2.5 rounded-lg text-[11px] font-medium bg-[#FBF9F5] border border-[#DDD7CB] hover:bg-[#E7E1D5] text-[#1F2220] transition-colors"
                              >
                                Fluff Pillows
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedPiece({
                                  bedAssemblyTick: (selectedPiece.bedAssemblyTick ?? 0) + 1,
                                })
                              }
                              className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-medium bg-[#FBF9F5] border border-[#DDD7CB] hover:bg-[#E7E1D5] text-[#4F514D] inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Replay Bed Assembly</span>
                            </button>
                          </div>
                        )}

                        {!isBedSelected && selectedCatalog?.interactiveLabel && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedPiece({ isActiveState: !selectedPiece.isActiveState })
                            }
                            className={`w-full py-2 px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                              selectedPiece.isActiveState
                                ? 'bg-[#5D6B53] text-[#F5F3EE]'
                                : 'bg-[#1F2220] text-[#F5F3EE]'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{selectedCatalog.interactiveLabel}</span>
                          </button>
                        )}

                        <div className="pt-3 border-t border-[#E5E0D5] grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleSnapToFloor}
                            className="py-2 text-xs font-medium border border-[#DDD7CB] rounded-lg hover:bg-[#EFECE4]"
                          >
                            Snap to Floor
                          </button>
                          <button
                            type="button"
                            onClick={handleDuplicateSelected}
                            className="py-2 text-xs font-medium border border-[#DDD7CB] rounded-lg hover:bg-[#EFECE4]"
                          >
                            Duplicate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center space-y-2">
                        <p className="font-display text-base text-[#1F2220]">No item selected</p>
                        <p className="text-xs text-[#6B6D68] leading-relaxed">
                          Click any piece in the 3D viewport to inspect dimensions, price, interactive actions, or materials.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {rightTab === 'room' && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-display text-base text-[#1F2220] mb-2">
                        Wall Finishes
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {WALL_PALETTE.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => updateShell({ wallColor: hex }, 'Changed wall colour')}
                            className={`w-6 h-6 rounded-full border ${
                              project.shell.wallColor === hex
                                ? 'ring-2 ring-[#1F2220]'
                                : 'border-black/20'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={project.shell.wallColor}
                          onChange={(e) => updateShell({ wallColor: e.target.value })}
                          className="w-6 h-6 rounded-full border border-[#DDD7CB] cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="flex items-center justify-between text-xs py-1 cursor-pointer">
                          <span>Back Accent Wall & Grid Panels</span>
                          <input
                            type="checkbox"
                            checked={project.shell.hasAccentWall}
                            onChange={(e) => updateShell({ hasAccentWall: e.target.checked })}
                            className="accent-[#5D6B53] w-4 h-4"
                          />
                        </label>
                        <label className="flex items-center justify-between text-xs py-1 cursor-pointer">
                          <span>Slatted Timber Screens</span>
                          <input
                            type="checkbox"
                            checked={Boolean(project.shell.hasSlattedScreens)}
                            onChange={(e) => updateShell({ hasSlattedScreens: e.target.checked })}
                            className="accent-[#5D6B53] w-4 h-4"
                          />
                        </label>
                        <label className="flex items-center justify-between text-xs py-1 cursor-pointer">
                          <span>Fluted Glass Chandelier</span>
                          <input
                            type="checkbox"
                            checked={Boolean(project.shell.hasChandelier)}
                            onChange={(e) => updateShell({ hasChandelier: e.target.checked })}
                            className="accent-[#5D6B53] w-4 h-4"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E5E0D5]">
                      <h3 className="font-display text-base text-[#1F2220] mb-2">
                        Floor Material
                      </h3>
                      <div className="grid grid-cols-1 gap-1.5">
                        {FLOOR_MATERIALS.map((fl) => (
                          <button
                            key={fl.id}
                            type="button"
                            onClick={() =>
                              updateShell({ floorMaterial: fl.id }, `Changed floor to ${fl.label}`)
                            }
                            className={`px-3 py-2 rounded-lg border text-left text-xs flex items-center gap-2.5 transition-colors ${
                              project.shell.floorMaterial === fl.id
                                ? 'bg-[#1F2220] text-[#F5F3EE] border-[#1F2220]'
                                : 'bg-[#F5F3EE] text-[#1F2220] border-[#DDD7CB]'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-sm border border-black/15 shrink-0"
                              style={{ backgroundColor: fl.color }}
                            />
                            <span>{fl.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E5E0D5] space-y-3">
                      <h3 className="font-display text-base text-[#1F2220]">
                        Ceiling & Windows
                      </h3>
                      <select
                        value={project.shell.ceilingType}
                        onChange={(e) =>
                          updateShell({ ceilingType: e.target.value as CeilingType })
                        }
                        className="w-full px-3 py-2 text-xs bg-[#F5F3EE] border border-[#DDD7CB] rounded-lg"
                      >
                        <option value="flat-plaster">Flat Plaster Ceiling</option>
                        <option value="recessed-cove">Recessed Cove Ceiling</option>
                        <option value="exposed-beams">Exposed Oak Beams</option>
                        <option value="starry-cinema">Twinkling Starry Ceiling</option>
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-[#6B6D68] mb-1">
                            Window Wall
                          </label>
                          <select
                            value={project.shell.windowWall}
                            onChange={(e) =>
                              updateShell({ windowWall: e.target.value as WallSide })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-[#F5F3EE] border border-[#DDD7CB] rounded-lg"
                          >
                            <option value="right">Right</option>
                            <option value="back">Back</option>
                            <option value="left">Left</option>
                            <option value="front">Front</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#6B6D68] mb-1">
                            Windows
                          </label>
                          <select
                            value={project.shell.windowCount}
                            onChange={(e) =>
                              updateShell({ windowCount: Number(e.target.value) })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-[#F5F3EE] border border-[#DDD7CB] rounded-lg"
                          >
                            <option value={1}>1 Window</option>
                            <option value={2}>2 Windows</option>
                            <option value={3}>3 Windows</option>
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center justify-between text-xs pt-1 cursor-pointer">
                        <span>Swaying Sheer & Linen Curtains</span>
                        <input
                          type="checkbox"
                          checked={project.shell.hasCurtains}
                          onChange={(e) => updateShell({ hasCurtains: e.target.checked })}
                          className="accent-[#5D6B53] w-4 h-4"
                        />
                      </label>

                      {project.shell.hasCurtains && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#4F514D]">Curtains Open / Close</span>
                            <span className="font-mono-tabular text-[#6B6D68]">
                              {Math.round((project.shell.curtainsOpen ?? 0.72) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={project.shell.curtainsOpen ?? 0.72}
                            onChange={(e) =>
                              updateShell({ curtainsOpen: Number(e.target.value) })
                            }
                            className="w-full accent-[#5D6B53]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5">
                      <h3 className="font-display text-base text-[#1F2220]">
                        Room Dimensions (m)
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { key: 'length', label: 'Length' },
                            { key: 'width', label: 'Width' },
                            { key: 'height', label: 'Height' },
                          ] as const
                        ).map((dim) => (
                          <div key={dim.key}>
                            <span className="block text-[10px] text-[#6B6D68] mb-0.5">
                              {dim.label}
                            </span>
                            <input
                              type="number"
                              step={0.2}
                              min={2.4}
                              max={12}
                              value={Number(project.dimensions[dim.key].toFixed(2))}
                              onChange={(e) => {
                                const val = Math.max(2.4, Math.min(12, Number(e.target.value) || 3));
                                commitChange({
                                  ...project,
                                  dimensions: { ...project.dimensions, [dim.key]: val },
                                });
                              }}
                              className="w-full px-2 py-1.5 text-xs font-mono-tabular bg-[#F5F3EE] border border-[#DDD7CB] rounded-md"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {rightTab === 'lighting' && (
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-display text-base text-[#1F2220]">
                          Lighting Studio
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            updateShell(
                              {
                                overallBrightness: 1.0,
                                exposure: activeLightingPreset.exposure,
                                sunIntensity: 1.0,
                                ambientIntensity: 1.0,
                                lampGlow: 1.0,
                                shadowIntensity: 1.0,
                                ambientWarmth: 0.58,
                              },
                              'Reset balanced lighting calibration',
                            )
                          }
                          className="text-[11px] font-medium text-[#5D6B53] hover:text-[#1F2220]"
                        >
                          Reset Defaults
                        </button>
                      </div>
                      <p className="text-xs text-[#6B6D68] mb-3">
                        Calibrated presets automatically adjust environment light and exposure.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {LIGHTING_PRESET_LIST.map((preset) => {
                          const isSelectedPreset = activeLightingPresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                updateShell(
                                  {
                                    lightingPreset: preset.id as LightingPreset,
                                    exposure: preset.exposure,
                                    sunIntensity: 1.0,
                                  },
                                  `Switched lighting to ${preset.label}`,
                                )
                              }
                              className={`p-2.5 rounded-lg border text-left transition-colors ${
                                isSelectedPreset
                                  ? 'bg-[#1F2220] text-[#F5F3EE] border-[#1F2220]'
                                  : 'bg-[#F5F3EE] text-[#1F2220] border-[#DDD7CB] hover:border-[#8D877B]'
                              }`}
                            >
                              <p className="text-xs font-medium">{preset.label}</p>
                              <p
                                className={`text-[10px] mt-0.5 line-clamp-1 ${
                                  isSelectedPreset ? 'text-[#C8C3B8]' : 'text-[#6B6D68]'
                                }`}
                              >
                                {preset.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E5E0D5] space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Overall Brightness</span>
                          <span className="font-mono-tabular">
                            {Math.round((project.shell.overallBrightness ?? 1.0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.55}
                          max={1.45}
                          step={0.05}
                          value={project.shell.overallBrightness ?? 1.0}
                          onChange={(e) =>
                            updateShell({ overallBrightness: Number(e.target.value) })
                          }
                          className="w-full accent-[#5D6B53]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Ambient Lighting</span>
                          <span className="font-mono-tabular">
                            {Math.round((project.shell.ambientIntensity ?? 1.0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.25}
                          max={1.5}
                          step={0.05}
                          value={project.shell.ambientIntensity ?? 1.0}
                          onChange={(e) =>
                            updateShell({ ambientIntensity: Number(e.target.value) })
                          }
                          className="w-full accent-[#5D6B53]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Interior Lamps</span>
                          <span className="font-mono-tabular">
                            {Math.round(project.shell.lampGlow * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={2}
                          step={0.1}
                          value={project.shell.lampGlow}
                          onChange={(e) =>
                            updateShell({ lampGlow: Number(e.target.value) })
                          }
                          className="w-full accent-[#5D6B53]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Shadow Intensity</span>
                          <span className="font-mono-tabular">
                            {Math.round((project.shell.shadowIntensity ?? 1.0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.35}
                          max={1.5}
                          step={0.05}
                          value={project.shell.shadowIntensity ?? 1.0}
                          onChange={(e) =>
                            updateShell({ shadowIntensity: Number(e.target.value) })
                          }
                          className="w-full accent-[#5D6B53]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Color Temperature (Cool / Warm)</span>
                          <span className="font-mono-tabular">
                            {Math.round(project.shell.ambientWarmth * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={project.shell.ambientWarmth}
                          onChange={(e) =>
                            updateShell({ ambientWarmth: Number(e.target.value) })
                          }
                          className="w-full accent-[#5D6B53]"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5">
                      <h3 className="font-display text-base text-[#1F2220]">
                        Transform Theme
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {DESIGN_STYLES.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleApplyStyleTheme(st.id)}
                            className={`px-2.5 py-2 rounded-lg border text-left text-xs transition-colors ${
                              project.styleId === st.id
                                ? 'bg-[#5D6B53] text-[#F5F3EE] border-[#5D6B53]'
                                : 'bg-[#F5F3EE] text-[#1F2220] border-[#DDD7CB]'
                            }`}
                          >
                            {st.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {rightTab === 'ai' && (
                  <AIDesignStudioPanel
                    roomType={project.roomType}
                    dimensions={project.dimensions}
                    currentStyleId={project.styleId}
                    onApplyDesign={({ styleId, shellPatch, furniture, dimensionsPatch, summaryLabel }) => {
                      commitChange(
                        {
                          ...project,
                          styleId,
                          dimensions: dimensionsPatch
                            ? { ...project.dimensions, ...dimensionsPatch }
                            : project.dimensions,
                          shell: { ...project.shell, ...shellPatch },
                          furniture,
                        },
                        summaryLabel,
                        'style',
                      );
                    }}
                  />
                )}
              </div>

              <div className="p-3 border-t border-[#D8C9B5] bg-[#F4F0E8] flex items-center justify-between text-xs">
                <div
                  className="font-mono-tabular text-[#6E6B64]"
                  title={`Estimated full room execution incl. finishes: ${formatINR(estimatedRoomTotal)}`}
                >
                  <span>{project.furniture.length} items</span>
                  <span className="mx-1.5">·</span>
                  <span className="text-[#30332F] font-semibold">
                    {formatINR(catalogTotalCost)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="inline-flex items-center gap-1.5 text-[#30332F] hover:text-[#78816C] font-medium"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{project.savedToArchive ? 'Saved' : 'Bookmark'}</span>
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
