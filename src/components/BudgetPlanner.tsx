import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Lamp,
  PaintBucket,
  Grid,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  DesignStyleId,
  DimensionUnit,
  FloorMaterial,
  RoomProject,
  RoomType,
} from '../types/room';
import { getCatalogItem } from '../data/catalog';
import {
  createStarterFurniture,
  DESIGN_STYLES,
  getDefaultShellForRoom,
} from '../data/stylesAndTemplates';
import { FLOOR_RATE_INR_PER_M2, formatINR, formatSignedINR } from '../utils/currency';

interface BudgetPlannerProps {
  projects?: RoomProject[];
  theme?: 'light' | 'dark';
  defaultUnit?: DimensionUnit;
  onOpenProject?: (project: RoomProject) => void;
  onStartCreateRoom?: () => void;
}

const ROOM_TYPE_LIST: RoomType[] = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Study Room',
  'Dining Room',
  'Home Office',
  'Kids Room',
  'Gaming Room',
  'Bathroom',
  'Home Theater',
  'Pooja Room',
  'Balcony',
];

const FLOOR_RATE_PER_M2 = FLOOR_RATE_INR_PER_M2;

const STYLE_FINISH_MULTIPLIER: Record<DesignStyleId, number> = {
  minimalist: 0.92,
  scandinavian: 0.96,
  japandi: 1.05,
  'modern-luxury': 1.18,
  traditional: 1.12,
  contemporary: 1.08,
  bohemian: 0.98,
};

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  projects = [],
  theme = 'light',
  defaultUnit = 'm',
  onOpenProject,
  onStartCreateRoom,
}) => {
  const isDark = theme === 'dark';

  const [sourceMode, setSourceMode] = useState<'custom' | 'project'>(
    projects.length > 0 ? 'project' : 'custom',
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? '');
  const [roomType, setRoomType] = useState<RoomType>('Living Room');
  const [styleId, setStyleId] = useState<DesignStyleId>('modern-luxury');
  const [unit, setUnit] = useState<DimensionUnit>(defaultUnit);
  const [lengthM, setLengthM] = useState<number>(5.6);
  const [widthM, setWidthM] = useState<number>(4.4);
  const [availableBudget, setAvailableBudget] = useState<number>(450000);
  const [finishTier, setFinishTier] = useState<'essential' | 'studio' | 'bespoke'>('studio');

  const linkedProject = useMemo(
    () => (sourceMode === 'project' ? projects.find((p) => p.id === selectedProjectId) ?? null : null),
    [sourceMode, projects, selectedProjectId],
  );

  const activeRoomType = linkedProject ? linkedProject.roomType : roomType;
  const activeStyleId = linkedProject ? linkedProject.styleId : styleId;
  const activeLength = linkedProject ? linkedProject.dimensions.length : lengthM;
  const activeWidth = linkedProject ? linkedProject.dimensions.width : widthM;
  const activeHeight = linkedProject ? linkedProject.dimensions.height : 2.95;

  const activeShell = useMemo(
    () => (linkedProject ? linkedProject.shell : getDefaultShellForRoom(activeRoomType, activeStyleId)),
    [linkedProject, activeRoomType, activeStyleId],
  );

  const activeFurniture = useMemo(
    () =>
      linkedProject
        ? linkedProject.furniture
        : createStarterFurniture(activeRoomType, activeStyleId, activeLength, activeWidth),
    [linkedProject, activeRoomType, activeStyleId, activeLength, activeWidth],
  );

  const tierMultiplier = finishTier === 'essential' ? 0.85 : finishTier === 'bespoke' ? 1.22 : 1.0;

  const breakdown = useMemo(() => {
    let furnitureCost = 0;
    let lightingCost = 0;
    let wallDecorItemsCost = 0;
    let accessoriesCost = 0;

    for (const inst of activeFurniture) {
      const cat = getCatalogItem(inst.catalogId);
      if (!cat) continue;
      if (cat.category === 'Lamps') {
        lightingCost += cat.price;
      } else if (cat.category === 'Wall Art') {
        wallDecorItemsCost += cat.price;
      } else if (
        cat.category === 'Rugs' ||
        cat.category === 'Plants' ||
        cat.category === 'Curtains' ||
        cat.category === 'Decorative'
      ) {
        accessoriesCost += cat.price;
      } else {
        furnitureCost += cat.price;
      }
    }

    const floorAreaM2 = activeLength * activeWidth;
    const wallAreaM2 = 2 * (activeLength + activeWidth) * activeHeight;

    const floorInfo = FLOOR_RATE_PER_M2[activeShell.floorMaterial] ?? {
      label: 'White Oak Wood',
      rate: 3800,
    };
    const styleMult = STYLE_FINISH_MULTIPLIER[activeStyleId] ?? 1.0;

    const flooringCost = Math.round(floorAreaM2 * floorInfo.rate * tierMultiplier);
    const paintRatePerM2 = activeShell.hasAccentWall ? 720 : 550;
    const wallDecorationCost = Math.round(
      wallAreaM2 * paintRatePerM2 * tierMultiplier + wallDecorItemsCost,
    );
    const architecturalLightingAllowance = activeShell.hasChandelier ? 38000 : 14000;
    const totalLightingCost = Math.round(
      (lightingCost + architecturalLightingAllowance) * tierMultiplier,
    );
    const draperyAllowance = activeShell.hasCurtains ? Math.round(activeShell.windowCount * 8500) : 0;
    const totalAccessoriesCost = Math.round((accessoriesCost + draperyAllowance) * tierMultiplier);
    const adjustedFurnitureCost = Math.round(furnitureCost * styleMult * (finishTier === 'essential' ? 0.88 : finishTier === 'bespoke' ? 1.15 : 1.0));

    const subtotal =
      adjustedFurnitureCost +
      totalLightingCost +
      wallDecorationCost +
      flooringCost +
      totalAccessoriesCost;

    const otherMaterialsCost = Math.round(subtotal * 0.08 + (activeLength + activeWidth) * 950);
    const totalEstimated = subtotal + otherMaterialsCost;

    const categories = [
      {
        id: 'furniture',
        label: 'Furniture',
        amount: adjustedFurnitureCost,
        detail: `${activeFurniture.length} catalog pieces & millwork (${DESIGN_STYLES.find((s) => s.id === activeStyleId)?.name ?? activeStyleId})`,
        icon: Layers,
        color: '#30332F',
      },
      {
        id: 'flooring',
        label: 'Flooring',
        amount: flooringCost,
        detail: `${floorAreaM2.toFixed(1)} m² · ${floorInfo.label} (~${formatINR(floorInfo.rate)}/m² benchmark)`,
        icon: Grid,
        color: '#8C7967',
      },
      {
        id: 'lighting',
        label: 'Lighting',
        amount: totalLightingCost,
        detail: activeShell.hasChandelier
          ? 'Lamps + fluted glass chandelier & dimmers'
          : 'Task lamps + cove/ambient fixtures',
        icon: Lamp,
        color: '#B89552',
      },
      {
        id: 'wall',
        label: 'Wall Decoration',
        amount: wallDecorationCost,
        detail: `${wallAreaM2.toFixed(1)} m² plaster/paint + wall art`,
        icon: PaintBucket,
        color: '#78816C',
      },
      {
        id: 'accessories',
        label: 'Accessories',
        amount: totalAccessoriesCost,
        detail: activeShell.hasCurtains
          ? 'Rugs, plants, decor & linen drapery'
          : 'Rugs, botanicals & sculpted accents',
        icon: Sparkles,
        color: '#9F8D79',
      },
      {
        id: 'other',
        label: 'Other Materials',
        amount: otherMaterialsCost,
        detail: 'Baseboards, trim hardware & 8% install contingency',
        icon: Wrench,
        color: '#636860',
      },
    ];

    return {
      floorAreaM2,
      wallAreaM2,
      floorLabel: floorInfo.label,
      totalEstimated,
      categories,
    };
  }, [activeFurniture, activeLength, activeWidth, activeHeight, activeShell, activeStyleId, finishTier, tierMultiplier]);

  const remaining = availableBudget - breakdown.totalEstimated;
  const isOverBudget = remaining < 0;
  const utilizationPct = Math.min(100, Math.round((breakdown.totalEstimated / Math.max(1, availableBudget)) * 100));

  const factor = unit === 'ft' ? 3.28084 : 1;
  const headingCls = isDark ? 'text-[#F4F0E8]' : 'text-[#30332F]';
  const bodyCls = isDark ? 'text-[#D8C9B5]' : 'text-[#4C4E49]';
  const mutedCls = isDark ? 'text-[#9F9A90]' : 'text-[#6E6B64]';
  const cardCls = isDark ? 'bg-[#1B1D1B] border-[#2E312E]' : 'bg-[#FFFFFF] border-[#D8C9B5]';
  const surfaceCls = isDark ? 'bg-[#222522] border-[#343834]' : 'bg-[#F4F0E8] border-[#D8C9B5]';
  const inputCls = isDark
    ? 'bg-[#161816] border-[#353833] text-[#F4F0E8]'
    : 'bg-[#FFFFFF] border-[#D8C9B5] text-[#30332F]';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border ${cardCls} space-y-5`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#78816C]" />
              <h2 className={`font-display text-xl ${headingCls}`}>Room Cost Parameters</h2>
            </div>
            {projects.length > 0 && (
              <div className={`inline-flex p-0.5 rounded-lg border ${surfaceCls} text-[11px]`}>
                <button
                  type="button"
                  onClick={() => setSourceMode('project')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    sourceMode === 'project'
                      ? isDark
                        ? 'bg-[#F4F0E8] text-[#30332F]'
                        : 'bg-[#30332F] text-[#FFFFFF]'
                      : mutedCls
                  }`}
                >
                  From Project
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('custom')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    sourceMode === 'custom'
                      ? isDark
                        ? 'bg-[#F4F0E8] text-[#30332F]'
                        : 'bg-[#30332F] text-[#FFFFFF]'
                      : mutedCls
                  }`}
                >
                  Custom Specs
                </button>
              </div>
            )}
          </div>

          {sourceMode === 'project' && projects.length > 0 ? (
            <div>
              <label className={`block text-xs font-medium ${bodyCls} mb-1.5`}>
                Linked Room Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className={`w-full px-3 py-2.5 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.roomType} · {p.dimensions.length.toFixed(1)}×{p.dimensions.width.toFixed(1)}m)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium ${bodyCls} mb-1.5`}>Room Type</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as RoomType)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
                  >
                    {ROOM_TYPE_LIST.map((rt) => (
                      <option key={rt} value={rt}>
                        {rt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium ${bodyCls} mb-1.5`}>
                    Interior Style
                  </label>
                  <select
                    value={styleId}
                    onChange={(e) => setStyleId(e.target.value as DesignStyleId)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
                  >
                    {DESIGN_STYLES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${bodyCls}`}>Room Dimensions</span>
                  <div className={`inline-flex p-0.5 rounded-md border ${surfaceCls} text-[11px]`}>
                    {(['m', 'ft'] as DimensionUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnit(u)}
                        className={`px-2 py-0.5 rounded font-medium ${
                          unit === u
                            ? isDark
                              ? 'bg-[#F4F0E8] text-[#30332F]'
                              : 'bg-[#30332F] text-[#FFFFFF]'
                            : mutedCls
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={mutedCls}>Length</span>
                      <span className={`font-mono-tabular font-medium ${headingCls}`}>
                        {(lengthM * factor).toFixed(1)} {unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2.8}
                      max={9.5}
                      step={0.2}
                      value={lengthM}
                      onChange={(e) => setLengthM(Number(e.target.value))}
                      className="w-full accent-[#78816C]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={mutedCls}>Width</span>
                      <span className={`font-mono-tabular font-medium ${headingCls}`}>
                        {(widthM * factor).toFixed(1)} {unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2.6}
                      max={8.0}
                      step={0.2}
                      value={widthM}
                      onChange={(e) => setWidthM(Number(e.target.value))}
                      className="w-full accent-[#78816C]"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Available Budget */}
          <div className={`pt-3 border-t ${isDark ? 'border-[#2E312E]' : 'border-[#E6DDD0]'} space-y-2.5`}>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-medium ${bodyCls}`}>Total Available Budget (INR)</label>
              <span className={`font-mono-tabular text-sm font-semibold ${headingCls}`}>
                {formatINR(availableBudget)}
              </span>
            </div>
            <input
              type="number"
              min={25000}
              max={5000000}
              step={10000}
              value={availableBudget}
              onChange={(e) =>
                setAvailableBudget(Math.max(25000, Math.min(5000000, Number(e.target.value) || 25000)))
              }
              className={`w-full px-3 py-2 text-xs font-mono-tabular border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
            />
            <input
              type="range"
              min={50000}
              max={2500000}
              step={10000}
              value={Math.min(2500000, availableBudget)}
              onChange={(e) => setAvailableBudget(Number(e.target.value))}
              className="w-full accent-[#78816C]"
            />
          </div>

          {/* Finish Grade */}
          <div>
            <label className={`block text-xs font-medium ${bodyCls} mb-1.5`}>
              Material & Installation Tier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'essential', label: 'Essential' },
                  { id: 'studio', label: 'Studio' },
                  { id: 'bespoke', label: 'Bespoke' },
                ] as const
              ).map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setFinishTier(tier.id)}
                  className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-colors ${
                    finishTier === tier.id
                      ? isDark
                        ? 'bg-[#F4F0E8] text-[#30332F] border-[#F4F0E8]'
                        : 'bg-[#30332F] text-[#FFFFFF] border-[#30332F]'
                      : `${inputCls} hover:border-[#8C7967]`
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transparent Assumption Notice */}
          <div className={`p-3.5 rounded-xl border ${surfaceCls} flex items-start gap-2.5 text-[11px] ${mutedCls} leading-relaxed`}>
            <Info className="w-4 h-4 text-[#78816C] shrink-0 mt-0.5" />
            <p>
              <strong className={headingCls}>Estimated Indian Market Benchmark:</strong> Furniture & decor values sum your placed Livora catalog items in INR (₹). Flooring, wall paint, lighting allowances, and trim contingency use standard per-m² architectural estimating rates—not binding contractor quotes.
            </p>
          </div>
        </div>

        {/* Right Breakdown & Summary */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top Summary Metric Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-5 rounded-2xl border ${cardCls}`}>
              <p className={`text-[11px] font-medium uppercase tracking-[0.12em] ${mutedCls}`}>
                Total Estimated Cost
              </p>
              <p className={`font-display text-2xl sm:text-3xl mt-1.5 font-mono-tabular ${headingCls}`}>
                {formatINR(breakdown.totalEstimated)}
              </p>
              <p className={`text-[11px] mt-1 ${mutedCls}`}>
                {breakdown.floorAreaM2.toFixed(1)} m² · {activeRoomType}
              </p>
            </div>

            <div className={`p-5 rounded-2xl border ${cardCls}`}>
              <p className={`text-[11px] font-medium uppercase tracking-[0.12em] ${mutedCls}`}>
                Available Budget
              </p>
              <p className={`font-display text-2xl sm:text-3xl mt-1.5 font-mono-tabular ${headingCls}`}>
                {formatINR(availableBudget)}
              </p>
              <p className={`text-[11px] mt-1 ${mutedCls}`}>
                {utilizationPct}% of budget allocated
              </p>
            </div>

            <div className={`p-5 rounded-2xl border ${cardCls}`}>
              <p className={`text-[11px] font-medium uppercase tracking-[0.12em] ${mutedCls}`}>
                {isOverBudget ? 'Over Budget' : 'Remaining Balance'}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {isOverBudget ? (
                  <AlertTriangle className="w-5 h-5 text-[#B44C3E] shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#78816C] shrink-0" />
                )}
                <p
                  className={`font-display text-2xl sm:text-3xl font-mono-tabular ${
                    isOverBudget ? 'text-[#B44C3E]' : 'text-[#78816C]'
                  }`}
                >
                  {formatSignedINR(remaining)}
                </p>
              </div>
              <p className={`text-[11px] mt-1 ${mutedCls}`}>
                {isOverBudget
                  ? 'Consider Essential tier or fewer statement pieces'
                  : 'Buffer available for custom styling'}
              </p>
            </div>
          </div>

          {/* Budget Utilization Progress Bar */}
          <div className={`p-5 rounded-2xl border ${cardCls} space-y-3`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${headingCls}`}>Budget Allocation Progress</span>
              <span className={`font-mono-tabular ${isOverBudget ? 'text-[#B44C3E] font-semibold' : 'text-[#78816C] font-semibold'}`}>
                {formatINR(breakdown.totalEstimated)} / {formatINR(availableBudget)}
              </span>
            </div>
            <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-[#292C29]' : 'bg-[#EDE7DC]'}`}>
              <div
                className={`h-full transition-all duration-300 ${
                  isOverBudget ? 'bg-[#B44C3E]' : 'bg-[#78816C]'
                }`}
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
          </div>

          {/* 6-Category Detailed Breakdown */}
          <div className={`p-6 rounded-2xl border ${cardCls} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className={`font-display text-xl ${headingCls}`}>Category Cost Breakdown</h3>
              {linkedProject && onOpenProject ? (
                <button
                  type="button"
                  onClick={() => onOpenProject(linkedProject)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78816C] hover:underline"
                >
                  <span>Edit {linkedProject.name} in 3D</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                onStartCreateRoom && (
                  <button
                    type="button"
                    onClick={onStartCreateRoom}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78816C] hover:underline"
                  >
                    <span>Build this room in 3D</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )
              )}
            </div>

            <div className="space-y-3.5">
              {breakdown.categories.map((cat) => {
                const Icon = cat.icon;
                const share = Math.round((cat.amount / Math.max(1, breakdown.totalEstimated)) * 100);
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${surfaceCls} border`}>
                          <Icon className="w-3.5 h-3.5 text-[#78816C]" />
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${headingCls}`}>{cat.label}</p>
                          <p className={`text-[11px] ${mutedCls} truncate`}>{cat.detail}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-mono-tabular font-semibold ${headingCls}`}>
                          {formatINR(cat.amount)}
                        </p>
                        <p className={`text-[10px] font-mono-tabular ${mutedCls}`}>{share}%</p>
                      </div>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#262926]' : 'bg-[#EFEAE0]'}`}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${share}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
