import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Sofa,
  Utensils,
  ChefHat,
  Laptop,
  Gamepad2,
  Briefcase,
  Baby,
  Bath,
  Film,
  Flame,
  Sun,
  Maximize2,
  Check,
} from 'lucide-react';
import {
  CeilingType,
  DesignStyleId,
  DimensionUnit,
  FloorMaterial,
  RoomProject,
  RoomType,
  WallSide,
} from '../types/room';
import {
  DESIGN_STYLES,
  getDefaultShellForRoom,
  ROOM_TEMPLATES,
} from '../data/stylesAndTemplates';
import { LivoraWordmark } from './LivoraWordmark';

interface CreateRoomWizardProps {
  defaultUnit: DimensionUnit;
  onCancel: () => void;
  onCreateProject: (input: {
    name: string;
    roomType: RoomType;
    styleId: DesignStyleId;
    length: number;
    width: number;
    height: number;
    unit: DimensionUnit;
    shellOverrides?: Partial<RoomProject['shell']>;
    startingPoint: 'empty' | 'template' | 'theme';
    templateId?: string;
  }) => RoomProject;
  onFinishToEditor: (project: RoomProject) => void;
}

const ROOM_TYPE_OPTIONS: Array<{
  type: RoomType;
  icon: React.ComponentType<{ className?: string }>;
  defaultDims: [number, number, number];
  hint: string;
}> = [
  { type: 'Bedroom', icon: BedDouble, defaultDims: [5.4, 4.5, 3.0], hint: 'Platform bed, tufted bench & glowing wardrobe' },
  { type: 'Living Room', icon: Sofa, defaultDims: [5.8, 4.6, 3.0], hint: 'Sectional sofa, travertine table & OLED wall' },
  { type: 'Dining Room', icon: Utensils, defaultDims: [5.4, 4.2, 3.0], hint: 'Six-seater oak table, chairs & centerpiece' },
  { type: 'Kitchen', icon: ChefHat, defaultDims: [5.2, 4.4, 2.95], hint: 'Marble waterfall island, cabinetry & bar stools' },
  { type: 'Study Room', icon: Laptop, defaultDims: [4.4, 3.6, 2.85], hint: 'Executive desk, bookcase & task lighting' },
  { type: 'Gaming Room', icon: Gamepad2, defaultDims: [4.6, 3.8, 2.85], hint: 'Dual curved monitors, RGB tower & lounge' },
  { type: 'Home Office', icon: Briefcase, defaultDims: [4.8, 4.0, 2.9], hint: 'Motorized sit-stand desk & glass whiteboard' },
  { type: 'Kids Room', icon: Baby, defaultDims: [4.5, 4.0, 2.85], hint: 'Timber bunk bed, play tent & starry ceiling' },
  { type: 'Bathroom', icon: Bath, defaultDims: [3.8, 3.2, 2.85], hint: 'Halo vanity mirror, soaking tub & rainfall shower' },
  { type: 'Home Theater', icon: Film, defaultDims: [5.8, 4.6, 3.0], hint: '120" projection screen, recliners & acoustic panels' },
  { type: 'Pooja Room', icon: Flame, defaultDims: [3.4, 3.2, 2.9], hint: 'Carved teak mandir, brass bells & flickering diya' },
  { type: 'Balcony', icon: Sun, defaultDims: [4.4, 2.8, 2.8], hint: 'Hanging rattan swing, bistro table & foliage' },
  { type: 'Custom Room', icon: Maximize2, defaultDims: [5.4, 4.4, 2.9], hint: 'Flexible architectural canvas' },
];

const FLOOR_OPTIONS: Array<{ id: FloorMaterial; group: string; label: string; swatch: string }> = [
  { id: 'white-oak', group: 'Wood', label: 'White Oak Wood', swatch: '#C9AE8B' },
  { id: 'herringbone-oak', group: 'Wood', label: 'Herringbone Wood', swatch: '#D6BE9E' },
  { id: 'smoked-walnut', group: 'Wood', label: 'Smoked Walnut', swatch: '#6B4D38' },
  { id: 'polished-marble', group: 'Marble', label: 'Calacatta Marble', swatch: '#EFECE5' },
  { id: 'ceramic-tile', group: 'Tile', label: 'Architectural Tile', swatch: '#E2DDD4' },
  { id: 'plush-carpet', group: 'Carpet', label: 'Plush Wool Carpet', swatch: '#CFC9BD' },
  { id: 'polished-concrete', group: 'Stone', label: 'Polished Concrete', swatch: '#C9C5BD' },
  { id: 'warm-travertine', group: 'Stone', label: 'Warm Travertine', swatch: '#DFD5C3' },
];

const WALL_SWATCHES = [
  { hex: '#F5F3EE', label: 'Warm Cream' },
  { hex: '#EAE2D3', label: 'Sand Plaster' },
  { hex: '#D6CCB9', label: 'Taupe Stone' },
  { hex: '#DCE2D8', label: 'Muted Sage' },
  { hex: '#5D6B53', label: 'Deep Olive' },
  { hex: '#2F3130', label: 'Charcoal' },
];

const CEILING_OPTIONS: Array<{ id: CeilingType; label: string }> = [
  { id: 'recessed-cove', label: 'Recessed Cove' },
  { id: 'flat-plaster', label: 'Flat Plaster' },
  { id: 'exposed-beams', label: 'Exposed Beams' },
  { id: 'starry-cinema', label: 'Starry Ceiling' },
];

const WordRevealHeading: React.FC<{ text: string }> = ({ text }) => {
  const words = text.split(' ');
  return (
    <h1 className="font-display text-3xl sm:text-4xl text-[#1F2220] flex flex-wrap gap-x-2.5 gap-y-1">
      {words.map((word, idx) => (
        <motion.span
          key={`${text}-${idx}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, delay: idx * 0.055, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
};

export const CreateRoomWizard: React.FC<CreateRoomWizardProps> = ({
  defaultUnit,
  onCancel,
  onCreateProject,
  onFinishToEditor,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [roomType, setRoomType] = useState<RoomType>('Bedroom');
  const [projectName, setProjectName] = useState('Atelier Master Bedroom');
  const [unit, setUnit] = useState<DimensionUnit>(defaultUnit);

  const [lengthM, setLengthM] = useState(5.4);
  const [widthM, setWidthM] = useState(4.5);
  const [heightM, setHeightM] = useState(3.0);

  const [wallColor, setWallColor] = useState('#EFECE6');
  const [floorMaterial, setFloorMaterial] = useState<FloorMaterial>('white-oak');
  const [ceilingType, setCeilingType] = useState<CeilingType>('recessed-cove');
  const [windowWall, setWindowWall] = useState<WallSide>('right');
  const [windowCount, setWindowCount] = useState(2);

  const [startingPoint, setStartingPoint] = useState<'empty' | 'template' | 'theme'>('theme');
  const [selectedStyleId, setSelectedStyleId] = useState<DesignStyleId>('modern-luxury');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(ROOM_TEMPLATES[0].id);

  const [buildProgress, setBuildProgress] = useState(0);
  const [buildPhase, setBuildPhase] = useState('Laying architectural floor slab...');

  const factor = unit === 'ft' ? 3.28084 : 1;
  const toDisplay = (meters: number) => Number((meters * factor).toFixed(2));
  const fromDisplay = (val: number) => Math.max(2.2, Math.min(12, val / factor));

  const handleSelectRoomType = (opt: (typeof ROOM_TYPE_OPTIONS)[number]) => {
    setRoomType(opt.type);
    setLengthM(opt.defaultDims[0]);
    setWidthM(opt.defaultDims[1]);
    setHeightM(opt.defaultDims[2]);
    setProjectName(`New ${opt.type}`);
    const defaults = getDefaultShellForRoom(opt.type, selectedStyleId);
    setWallColor(defaults.wallColor);
    setFloorMaterial(defaults.floorMaterial);
    setCeilingType(defaults.ceilingType);
    if (opt.type === 'Custom Room') {
      setStartingPoint('empty');
    } else if (startingPoint === 'empty') {
      setStartingPoint('theme');
    }
  };

  useEffect(() => {
    if (step !== 3) return;
    setBuildProgress(12);
    setBuildPhase('Laying architectural floor slab...');

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setBuildProgress(46);
        setBuildPhase('Raising plaster walls, screens & windows...');
      }, 420),
    );
    timers.push(
      window.setTimeout(() => {
        setBuildProgress(82);
        setBuildPhase('Placing bespoke furniture & volumetric lighting...');
      }, 920),
    );
    timers.push(
      window.setTimeout(() => {
        setBuildProgress(100);
        setBuildPhase('Launching Live 3D Designer...');
      }, 1380),
    );
    timers.push(
      window.setTimeout(() => {
        const created = onCreateProject({
          name: projectName,
          roomType,
          styleId: selectedStyleId,
          length: lengthM,
          width: widthM,
          height: heightM,
          unit,
          startingPoint,
          templateId: startingPoint === 'template' ? selectedTemplateId : undefined,
          shellOverrides: {
            wallColor,
            floorMaterial,
            ceilingType,
            windowWall,
            windowCount,
          },
        });
        onFinishToEditor(created);
      }, 1780),
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#30332F] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-[#D8C9B5] bg-[#F4F0E8]/95 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onCancel}
              className="inline-flex items-center gap-2 text-xs font-medium text-[#4F514D] hover:text-[#1F2220] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </motion.button>
            <span className="hidden sm:inline-block h-4 w-px bg-[#D8C9B5]" />
            <LivoraWordmark theme="light" size="sm" showMonogram={false} className="hidden sm:inline-flex" />
          </div>

          <div className="flex items-center gap-4 text-xs text-[#6B6D68]">
            <span className={step === 1 ? 'text-[#1F2220] font-semibold' : ''}>01 · Room Function</span>
            <span aria-hidden="true">/</span>
            <span className={step === 2 ? 'text-[#1F2220] font-semibold' : ''}>02 · Size & Style</span>
            <span aria-hidden="true">/</span>
            <span className={step === 3 ? 'text-[#5D6B53] font-semibold' : ''}>03 · Live Designer</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-[#E5E0D5]">
        <motion.div
          className="h-full bg-[#5D6B53]"
          initial={false}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Main Step Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.3 }}
              className="space-y-7"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5D6B53]">
                    Step 01 · Room Function
                  </p>
                  <WordRevealHeading text="What type of space are you designing?" />
                </div>

                <div className="w-full md:w-80">
                  <label className="block text-xs font-medium text-[#4A4C49] mb-1.5">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Sunlit Oak Bedroom"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-[#DDD7CB] rounded-lg focus:outline-none focus:border-[#5D6B53]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {ROOM_TYPE_OPTIONS.map((opt, idx) => {
                  const Icon = opt.icon;
                  const active = roomType === opt.type;
                  return (
                    <motion.button
                      key={opt.type}
                      type="button"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.032 }}
                      whileHover={{ y: -4, boxShadow: '0 12px 24px -10px rgba(31,34,32,0.14)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectRoomType(opt)}
                      className="group relative overflow-hidden p-4 rounded-xl border border-[#DDD7CB] bg-[#FBF9F5] text-left transition-colors hover:border-[#8D877B]"
                    >
                      {/* Expanding Ink Fill Effect */}
                      <motion.span
                        aria-hidden="true"
                        initial={false}
                        animate={{
                          scale: active ? 2.8 : 0,
                          opacity: active ? 1 : 0,
                        }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full bg-[#1F2220] pointer-events-none origin-center"
                      />

                      <div className="relative z-10 flex items-start justify-between mb-2.5">
                        <span
                          className={`p-2 rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${
                            active ? 'bg-[#2E322F] text-[#D2C2A8]' : 'bg-[#EFECE4] text-[#5D6B53]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        {active && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-[#5D6B53] text-[#F5F3EE] flex items-center justify-center"
                          >
                            <Check className="w-3 h-3" />
                          </motion.span>
                        )}
                      </div>

                      <p
                        className={`relative z-10 font-display text-base mb-1 transition-colors ${
                          active ? 'text-[#F5F3EE]' : 'text-[#1F2220]'
                        }`}
                      >
                        {opt.type}
                      </p>
                      <p
                        className={`relative z-10 text-[11px] leading-snug transition-colors ${
                          active ? 'text-[#C8C3B8]' : 'text-[#6B6D68]'
                        }`}
                      >
                        {opt.hint}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.3 }}
              className="space-y-7"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5D6B53]">
                    Step 02 · Room Size & Style
                  </p>
                  <WordRevealHeading text="Dial in dimensions, surfaces, and palette." />
                </div>

                <div className="inline-flex p-1 rounded-lg bg-[#EFECE4] border border-[#DDD7CB] self-start">
                  {(['m', 'ft'] as DimensionUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        unit === u ? 'bg-[#1F2220] text-[#F5F3EE]' : 'text-[#525450]'
                      }`}
                    >
                      {u === 'm' ? 'Meters (m)' : 'Feet (ft)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Dimensions & Blueprint */}
                <div className="lg:col-span-5 space-y-5 p-5 rounded-xl border border-[#E2DDD3] bg-[#FBF9F5]">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span>Length (X Axis)</span>
                      <span className="font-mono-tabular">
                        {toDisplay(lengthM)} {unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={toDisplay(2.8)}
                      max={toDisplay(10.0)}
                      step={unit === 'm' ? 0.1 : 0.5}
                      value={toDisplay(lengthM)}
                      onChange={(e) => setLengthM(fromDisplay(Number(e.target.value)))}
                      className="w-full accent-[#5D6B53]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span>Width (Z Axis)</span>
                      <span className="font-mono-tabular">
                        {toDisplay(widthM)} {unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={toDisplay(2.6)}
                      max={toDisplay(8.5)}
                      step={unit === 'm' ? 0.1 : 0.5}
                      value={toDisplay(widthM)}
                      onChange={(e) => setWidthM(fromDisplay(Number(e.target.value)))}
                      className="w-full accent-[#5D6B53]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span>Ceiling Height (Y Axis)</span>
                      <span className="font-mono-tabular">
                        {toDisplay(heightM)} {unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={toDisplay(2.4)}
                      max={toDisplay(4.2)}
                      step={unit === 'm' ? 0.05 : 0.25}
                      value={toDisplay(heightM)}
                      onChange={(e) => setHeightM(fromDisplay(Number(e.target.value)))}
                      className="w-full accent-[#5D6B53]"
                    />
                  </div>

                  {/* Proportional Footprint Blueprint */}
                  <div className="h-44 rounded-lg border border-[#DDD7CB] bg-[#EFECE4] flex items-center justify-center p-3">
                    <svg viewBox="0 0 320 170" className="w-full h-full">
                      {(() => {
                        const scale = Math.min(220 / Math.max(lengthM, 1.5), 112 / Math.max(widthM, 1.5));
                        const rw = lengthM * scale;
                        const rh = widthM * scale;
                        const ox = (320 - rw) / 2;
                        const oy = (170 - rh) / 2;
                        const floorHex =
                          FLOOR_OPTIONS.find((f) => f.id === floorMaterial)?.swatch ?? '#C9AE8B';
                        return (
                          <g>
                            <rect
                              x={ox}
                              y={oy}
                              width={rw}
                              height={rh}
                              fill={floorHex}
                              fillOpacity="0.65"
                              stroke="#30332F"
                              strokeWidth="3"
                            />
                            <text
                              x="160"
                              y="88"
                              textAnchor="middle"
                              fontSize="11"
                              fontFamily="Playfair Display, serif"
                              fill="#30332F"
                            >
                              {roomType} · {(toDisplay(lengthM) * toDisplay(widthM)).toFixed(1)} {unit}²
                            </text>
                          </g>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Wall & Window quick options */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-[#4A4C49] mb-1">
                        Ceiling Type
                      </label>
                      <select
                        value={ceilingType}
                        onChange={(e) => setCeilingType(e.target.value as CeilingType)}
                        className="w-full px-2.5 py-2 text-xs bg-[#F5F3EE] border border-[#DDD7CB] rounded-lg"
                      >
                        {CEILING_OPTIONS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#4A4C49] mb-1">
                        Window Wall & Count
                      </label>
                      <div className="flex gap-1.5">
                        <select
                          value={windowWall}
                          onChange={(e) => setWindowWall(e.target.value as WallSide)}
                          className="flex-1 px-2 py-2 text-xs bg-[#F5F3EE] border border-[#DDD7CB] rounded-lg capitalize"
                        >
                          <option value="right">Right</option>
                          <option value="back">Back</option>
                          <option value="left">Left</option>
                        </select>
                        <select
                          value={windowCount}
                          onChange={(e) => setWindowCount(Number(e.target.value))}
                          className="w-14 px-2 py-2 text-xs bg-[#F5F3EE] border border-[#DDD7CB] rounded-lg"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Wall Color, Floor Material & Design Theme */}
                <div className="lg:col-span-7 space-y-5 p-5 rounded-xl border border-[#E2DDD3] bg-[#FBF9F5]">
                  <div>
                    <label className="block text-xs font-medium text-[#3A3C39] mb-2">
                      Wall Paint Color
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {WALL_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() => setWallColor(sw.hex)}
                          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                            wallColor === sw.hex
                              ? 'bg-[#1F2220] text-[#F5F3EE] border-[#1F2220]'
                              : 'bg-[#F5F3EE] text-[#1F2220] border-[#DDD7CB]'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: sw.hex }}
                          />
                          <span>{sw.label}</span>
                        </button>
                      ))}
                      <input
                        type="color"
                        value={wallColor}
                        onChange={(e) => setWallColor(e.target.value)}
                        title="Custom wall colour"
                        className="w-8 h-8 rounded-lg border border-[#DDD7CB] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3A3C39] mb-2">
                      Floor Material (Wood · Marble · Tile · Carpet)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FLOOR_OPTIONS.map((fl) => (
                        <button
                          key={fl.id}
                          type="button"
                          onClick={() => setFloorMaterial(fl.id)}
                          className={`px-2.5 py-2 rounded-lg border text-left transition-colors ${
                            floorMaterial === fl.id
                              ? 'bg-[#1F2220] text-[#F5F3EE] border-[#1F2220]'
                              : 'bg-[#F5F3EE] text-[#1F2220] border-[#DDD7CB] hover:border-[#8D877B]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-black/20 shrink-0"
                              style={{ backgroundColor: fl.swatch }}
                            />
                            <span className="text-[10px] uppercase tracking-wider opacity-75">
                              {fl.group}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium truncate">{fl.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5E0D5]">
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="text-xs font-medium text-[#3A3C39]">
                        Design Direction & Furnishing
                      </label>
                      <div className="inline-flex p-0.5 rounded-lg bg-[#EFECE4] text-[11px]">
                        {(
                          [
                            { id: 'theme', label: 'Curated Style' },
                            { id: 'template', label: 'Template' },
                            { id: 'empty', label: 'Empty Room' },
                          ] as const
                        ).map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setStartingPoint(mode.id)}
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                              startingPoint === mode.id
                                ? 'bg-[#1F2220] text-[#F5F3EE]'
                                : 'text-[#525450]'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {startingPoint === 'theme' && (
                      <div className="grid grid-cols-3 gap-2.5">
                        {DESIGN_STYLES.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setSelectedStyleId(st.id)}
                            className={`rounded-lg overflow-hidden border text-left transition-all ${
                              selectedStyleId === st.id
                                ? 'border-[#5D6B53] ring-2 ring-[#5D6B53]/30'
                                : 'border-[#E2DDD3]'
                            }`}
                          >
                            <div className="aspect-[16/9] bg-[#E5E0D5] overflow-hidden">
                              <img
                                src={st.image}
                                alt={st.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="px-2.5 py-1.5 text-[11px] font-medium bg-[#F5F3EE] truncate">
                              {st.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {startingPoint === 'template' && (
                      <div className="grid grid-cols-2 gap-2">
                        {ROOM_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(tpl.id)}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              selectedTemplateId === tpl.id
                                ? 'bg-[#1F2220] text-[#F5F3EE] border-[#1F2220]'
                                : 'bg-[#F5F3EE] text-[#1F2220] border-[#DDD7CB]'
                            }`}
                          >
                            <p className="text-[10px] text-[#5D6B53] font-medium">{tpl.roomType}</p>
                            <p className="text-xs font-display">{tpl.name}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {startingPoint === 'empty' && (
                      <p className="text-xs text-[#6B6D68] p-3 rounded-lg bg-[#EFECE4]/70">
                        Starts with a clean, empty architectural room shell calibrated to your exact dimensions and flooring.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-16 max-w-lg mx-auto text-center space-y-6"
            >
              {/* Animated Building Room Isometric Preview */}
              <div className="w-44 h-36 mx-auto relative flex items-center justify-center">
                <svg viewBox="0 0 180 140" className="w-full h-full">
                  <motion.polygon
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35 }}
                    points="90,62 150,88 90,114 30,88"
                    fill="#D6BE9E"
                    stroke="#1F2220"
                    strokeWidth="2"
                  />
                  <motion.polygon
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: buildProgress > 35 ? 1 : 0, opacity: buildProgress > 35 ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ transformOrigin: '60px 88px' }}
                    points="90,22 30,48 30,88 90,62"
                    fill="#EAE5DC"
                    stroke="#1F2220"
                    strokeWidth="2"
                  />
                  <motion.polygon
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: buildProgress > 35 ? 1 : 0, opacity: buildProgress > 35 ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ transformOrigin: '120px 88px' }}
                    points="90,22 150,48 150,88 90,62"
                    fill="#F5F3EE"
                    stroke="#1F2220"
                    strokeWidth="2"
                  />
                  <motion.rect
                    x="74"
                    y="66"
                    width="32"
                    height="20"
                    rx="3"
                    fill="#5D6B53"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{
                      y: buildProgress > 68 ? 66 : -20,
                      opacity: buildProgress > 68 ? 1 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  />
                </svg>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5D6B53]">
                  Building Your Room
                </p>
                <h2 className="font-display text-3xl text-[#1F2220]">{projectName}</h2>
              </div>

              <div className="w-full h-2 bg-[#E5E0D5] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#5D6B53]"
                  animate={{ width: `${buildProgress}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>

              <p className="text-xs text-[#4F514D] font-mono-tabular">
                {buildPhase} · {buildProgress}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Step Controls */}
        {step < 3 && (
          <div className="pt-7 mt-7 border-t border-[#E2DDD3] flex items-center justify-between">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => (step === 1 ? onCancel() : setStep(1))}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#4F514D] hover:text-[#1F2220] border border-[#DDD7CB] rounded-lg bg-[#FBF9F5] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{step === 1 ? 'Cancel' : 'Previous'}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setStep(step === 1 ? 2 : 3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#1F2220] hover:bg-[#323533] text-[#F5F3EE] rounded-lg transition-colors"
            >
              <span>{step === 2 ? 'Enter Live 3D Designer' : 'Continue to Size & Style'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        )}
      </main>
    </div>
  );
};
