import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Check,
  AlertCircle,
  Sliders,
  ArrowRight,
  Loader2,
  IndianRupee,
  Sun,
  Compass,
  Palette,
} from 'lucide-react';
import {
  CeilingType,
  DesignStyleId,
  FloorMaterial,
  FurnitureInstance,
  LightingPreset,
  RoomDimensions,
  RoomShellConfig,
  RoomType,
} from '../types/room';
import { FURNITURE_CATALOG, getCatalogItem } from '../data/catalog';
import { createStarterFurniture, DESIGN_STYLES } from '../data/stylesAndTemplates';
import { normalizeLightingPreset } from '../three/lightingPresets';
import { formatINR } from '../utils/currency';

interface AIDesignStudioPanelProps {
  roomType: RoomType;
  dimensions: RoomDimensions;
  currentStyleId: DesignStyleId;
  theme?: 'light' | 'dark';
  onApplyDesign: (patch: {
    styleId: DesignStyleId;
    dimensionsPatch?: Partial<RoomDimensions>;
    shellPatch: Partial<RoomShellConfig>;
    furniture: FurnitureInstance[];
    summaryLabel: string;
  }) => void;
}

interface AISuggestionResult {
  conceptTitle: string;
  designRationale: string;
  budgetNote?: string;
  estimatedCostINR?: number;
  wallColor: string;
  accentWallColor: string;
  ceilingColor: string;
  floorMaterial: FloorMaterial;
  ceilingType: CeilingType;
  lightingPreset: LightingPreset;
  lightingRecommendations?: string;
  spaceOptimizationSuggestions?: string[];
  colorCombinations?: Array<{
    role: string;
    name: string;
    hex: string;
  }>;
  furniture: Array<{
    itemId: string;
    x: number;
    z: number;
    rotationY: number;
    primaryColor: string;
    secondaryColor?: string;
  }>;
}

const COLOR_PREFERENCES = [
  'Warm Cream & Sand Beige',
  'Muted Sage & Natural Oak',
  'Charcoal & Smoked Walnut',
  'Soft Linen & Brushed Brass',
  'Taupe Stone & Ivory',
];

const MOOD_OPTIONS = [
  'Calm & Sunlit',
  'Cozy & Intimate',
  'Gallery Minimal',
  'Organic & Grounded',
  'Evening Architectural',
];

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

export const AIDesignStudioPanel: React.FC<AIDesignStudioPanelProps> = ({
  roomType: initialRoomType,
  dimensions,
  currentStyleId,
  theme = 'light',
  onApplyDesign,
}) => {
  const isDark = theme === 'dark';
  const [styleId, setStyleId] = useState<DesignStyleId>(currentStyleId);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType>(initialRoomType);
  const [lengthInput, setLengthInput] = useState<number>(dimensions.length);
  const [widthInput, setWidthInput] = useState<number>(dimensions.width);
  const [heightInput, setHeightInput] = useState<number>(dimensions.height);
  const [colorPref, setColorPref] = useState(COLOR_PREFERENCES[0]);
  const [mood, setMood] = useState(MOOD_OPTIONS[0]);
  const [budget, setBudget] = useState<number>(350000);
  const [designRequirements, setDesignRequirements] = useState(
    'Keep clear walkway circulation, warm reading light, and balanced storage.',
  );

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiPlan, setAiPlan] = useState<AISuggestionResult | null>(null);

  useEffect(() => {
    setLengthInput(dimensions.length);
    setWidthInput(dimensions.width);
    setHeightInput(dimensions.height);
  }, [dimensions.length, dimensions.width, dimensions.height]);

  useEffect(() => {
    setSelectedRoomType(initialRoomType);
  }, [initialRoomType]);

  useEffect(() => {
    let active = true;
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => {
        if (active) setAiConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (active) setAiConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const effectiveDims: RoomDimensions = useMemo(
    () => ({
      length: Math.max(2.4, Math.min(12, Number(lengthInput) || dimensions.length)),
      width: Math.max(2.4, Math.min(12, Number(widthInput) || dimensions.width)),
      height: Math.max(2.4, Math.min(4.5, Number(heightInput) || dimensions.height)),
      unit: dimensions.unit,
    }),
    [lengthInput, widthInput, heightInput, dimensions],
  );

  const aiPlanCatalogSummary = useMemo(() => {
    if (!aiPlan) return null;
    const resolved = aiPlan.furniture
      .map((f) => {
        const cat = getCatalogItem(f.itemId);
        return cat ? { item: cat, spec: f } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const total = resolved.reduce((acc, row) => acc + row.item.price, 0);
    return { items: resolved, total };
  }, [aiPlan]);

  const curatedPreviewTotal = useMemo(() => {
    const starter = createStarterFurniture(
      selectedRoomType,
      styleId,
      effectiveDims.length,
      effectiveDims.width,
    );
    return starter.reduce((acc, f) => acc + (getCatalogItem(f.catalogId)?.price ?? 0), 0);
  }, [selectedRoomType, styleId, effectiveDims.length, effectiveDims.width]);

  const handleGenerateWithGemini = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const styleObj = DESIGN_STYLES.find((s) => s.id === styleId);
      const catalogSummary = FURNITURE_CATALOG.map((item) => ({
        itemId: item.id,
        name: item.name,
        category: item.category,
        width: item.width,
        depth: item.depth,
        price: item.price,
      }));

      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomType: selectedRoomType,
          style: styleObj?.name ?? styleId,
          colorPreference: colorPref,
          mood,
          budget,
          designRequirements,
          dimensions: effectiveDims,
          catalogSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to generate AI suggestion.');
        setAiPlan(null);
      } else {
        setAiPlan(data.plan);
      }
    } catch {
      setErrorMsg('Network error reaching the AI planning service.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAIPlan = () => {
    if (!aiPlan) return;
    const mappedFurniture: FurnitureInstance[] = aiPlan.furniture
      .map((f) => {
        const cat = FURNITURE_CATALOG.find((c) => c.id === f.itemId);
        if (!cat) return null;
        return {
          instanceId: `${cat.id}-${Math.random().toString(36).slice(2, 8)}`,
          catalogId: cat.id,
          name: cat.name,
          position: [
            Number(f.x) || 0,
            cat.mountType === 'wall' ? (cat.defaultMountHeight ?? 1.5) : 0,
            Number(f.z) || 0,
          ] as [number, number, number],
          rotationY: Number(f.rotationY) || 0,
          scale: 1,
          primaryColor: f.primaryColor || cat.defaultPrimaryColor,
          secondaryColor: f.secondaryColor || cat.defaultSecondaryColor,
          finish: cat.defaultFinish,
        };
      })
      .filter((x): x is FurnitureInstance => x !== null);

    onApplyDesign({
      styleId,
      dimensionsPatch: effectiveDims,
      shellPatch: {
        wallColor: aiPlan.wallColor,
        accentWallColor: aiPlan.accentWallColor,
        ceilingColor: aiPlan.ceilingColor,
        floorMaterial: aiPlan.floorMaterial,
        ceilingType: aiPlan.ceilingType,
        lightingPreset: normalizeLightingPreset(aiPlan.lightingPreset),
        exposure: undefined,
      },
      furniture:
        mappedFurniture.length > 0
          ? mappedFurniture
          : createStarterFurniture(selectedRoomType, styleId, effectiveDims.length, effectiveDims.width),
      summaryLabel: `Applied AI concept "${aiPlan.conceptTitle}"`,
    });
  };

  const handleApplyCuratedPreset = (presetStyleId: DesignStyleId) => {
    const preset = DESIGN_STYLES.find((s) => s.id === presetStyleId) ?? DESIGN_STYLES[0];
    const furniture = createStarterFurniture(
      selectedRoomType,
      preset.id,
      effectiveDims.length,
      effectiveDims.width,
    );
    onApplyDesign({
      styleId: preset.id,
      dimensionsPatch: effectiveDims,
      shellPatch: preset.shellPatch,
      furniture,
      summaryLabel: `Applied ${preset.name} architectural preset`,
    });
  };

  const headingCls = isDark ? 'text-[#F4F0E8]' : 'text-[#30332F]';
  const mutedCls = isDark ? 'text-[#A8A399]' : 'text-[#6A675F]';
  const labelCls = isDark ? 'text-[#D8C9B5]' : 'text-[#444640]';
  const inputCls = isDark
    ? 'bg-[#191B19] border-[#353833] text-[#F4F0E8]'
    : 'bg-[#FFFFFF] border-[#D8C9B5] text-[#30332F]';
  const cardCls = isDark
    ? 'bg-[#222522] border-[#343834] text-[#D8C9B5]'
    : 'bg-[#F4F0E8] border-[#D8C9B5] text-[#444640]';
  const primaryBtnCls = isDark
    ? 'bg-[#F4F0E8] hover:bg-[#D8C9B5] text-[#30332F]'
    : 'bg-[#30332F] hover:bg-[#434742] text-[#FFFFFF]';

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-display text-lg ${headingCls}`}>AI Design Studio</h3>
          <span className={`text-[11px] font-medium ${aiConfigured ? 'text-[#78816C]' : mutedCls}`}>
            {aiConfigured === null
              ? 'Checking…'
              : aiConfigured
              ? 'Gemini Ready'
              : 'Preset Mode'}
          </span>
        </div>
        <p className={`text-xs ${mutedCls} leading-relaxed`}>
          Enter room size, style, INR budget, and functional notes to generate a structured architectural plan.
        </p>
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        <div>
          <label className={`block text-xs font-medium ${labelCls} mb-1`}>Room Function</label>
          <select
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value as RoomType)}
            className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
          >
            {ROOM_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>
        </div>

        {/* Room Dimensions */}
        <div>
          <label className={`block text-xs font-medium ${labelCls} mb-1`}>
            Room Dimensions (meters)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Length', value: lengthInput, setter: setLengthInput, min: 2.4, max: 12 },
              { label: 'Width', value: widthInput, setter: setWidthInput, min: 2.4, max: 12 },
              { label: 'Height', value: heightInput, setter: setHeightInput, min: 2.4, max: 4.5 },
            ].map((dim) => (
              <div key={dim.label}>
                <span className={`block text-[10px] ${mutedCls} mb-0.5`}>{dim.label}</span>
                <input
                  type="number"
                  step={0.1}
                  min={dim.min}
                  max={dim.max}
                  value={Number(dim.value.toFixed(2))}
                  onChange={(e) => dim.setter(Number(e.target.value) || dim.min)}
                  className={`w-full px-2 py-1.5 text-xs font-mono-tabular border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className={`block text-xs font-medium ${labelCls} mb-1.5`}>
            Interior Design Style
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {DESIGN_STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStyleId(st.id)}
                className={`px-2.5 py-1.5 text-left text-xs font-medium rounded-lg border transition-colors ${
                  styleId === st.id
                    ? isDark
                      ? 'bg-[#F4F0E8] text-[#30332F] border-[#F4F0E8]'
                      : 'bg-[#30332F] text-[#FFFFFF] border-[#30332F]'
                    : `${inputCls} hover:border-[#8C7967]`
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-medium ${labelCls}`}>Target Budget (INR)</label>
            <span className={`text-xs font-mono-tabular font-semibold ${headingCls}`}>
              {formatINR(budget)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <IndianRupee
                className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${mutedCls}`}
              />
              <input
                type="number"
                min={50000}
                max={3500000}
                step={10000}
                value={budget}
                onChange={(e) =>
                  setBudget(Math.max(50000, Math.min(3500000, Number(e.target.value) || 50000)))
                }
                className={`w-full pl-7 pr-2.5 py-2 text-xs font-mono-tabular border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
              />
            </div>
          </div>
          <input
            type="range"
            min={50000}
            max={1500000}
            step={10000}
            value={Math.min(1500000, budget)}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full mt-2 accent-[#78816C]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={`block text-xs font-medium ${labelCls} mb-1`}>Colour Palette</label>
            <select
              value={colorPref}
              onChange={(e) => setColorPref(e.target.value)}
              className={`w-full px-2.5 py-2 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
            >
              {COLOR_PREFERENCES.map((cp) => (
                <option key={cp} value={cp}>
                  {cp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-medium ${labelCls} mb-1`}>Lighting & Mood</label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className={`w-full px-2.5 py-2 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] ${inputCls}`}
            >
              {MOOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={`block text-xs font-medium ${labelCls} mb-1`}>
            Design Requirements
          </label>
          <textarea
            rows={2}
            maxLength={350}
            value={designRequirements}
            onChange={(e) => setDesignRequirements(e.target.value)}
            placeholder="e.g. Work-from-home desk corner, reading lamp, ample storage..."
            className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:border-[#78816C] resize-none ${inputCls}`}
          />
        </div>
      </div>

      {/* Live Gemini Action */}
      {aiConfigured ? (
        <button
          type="button"
          onClick={handleGenerateWithGemini}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#78816C] hover:bg-[#66705B] text-[#FFFFFF] text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Designing room plan…</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Design Plan</span>
            </>
          )}
        </button>
      ) : (
        <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${cardCls}`}>
          <div className={`flex items-center gap-1.5 font-medium ${headingCls}`}>
            <AlertCircle className="w-3.5 h-3.5 text-[#8C7967] shrink-0" />
            <span>Gemini API not configured</span>
          </div>
          <p className="leading-relaxed">
            Live AI spatial generation uses server-side <code className="font-mono">GEMINI_API_KEY</code>. Apply a curated architectural preset below anytime.
          </p>
        </div>
      )}

      {loading && (
        <div className={`p-3.5 rounded-lg border space-y-2.5 animate-pulse ${cardCls}`}>
          <div className="h-3.5 w-2/3 rounded bg-black/10" />
          <div className="h-3 w-full rounded bg-black/10" />
          <div className="h-3 w-5/6 rounded bg-black/10" />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="h-8 rounded bg-black/10" />
            <div className="h-8 rounded bg-black/10" />
            <div className="h-8 rounded bg-black/10" />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-[#F5E8E6] border border-[#D8B4AE] text-xs text-[#6E2D26]">
          {errorMsg}
        </div>
      )}

      {/* Structured Gemini Proposal Card */}
      {aiPlan && aiPlanCatalogSummary && !loading && (
        <div className={`p-3.5 rounded-lg border space-y-3 ${cardCls}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#78816C] font-semibold">
                AI Spatial Proposal
              </p>
              <h4 className={`font-display text-base ${headingCls}`}>{aiPlan.conceptTitle}</h4>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-[10px] ${mutedCls}`}>Est. Room Total</p>
              <p className={`font-mono-tabular text-xs font-semibold ${headingCls}`}>
                {formatINR(aiPlan.estimatedCostINR ?? aiPlanCatalogSummary.total)}
              </p>
            </div>
          </div>

          <p className={`text-xs ${labelCls} leading-relaxed`}>{aiPlan.designRationale}</p>

          {/* Color Combinations */}
          <div className="space-y-1.5">
            <p className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${headingCls}`}>
              <Palette className="w-3.5 h-3.5 text-[#78816C]" />
              <span>Color Combinations</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(aiPlan.colorCombinations?.length
                ? aiPlan.colorCombinations
                : [
                    { role: 'Walls', name: 'Primary Coat', hex: aiPlan.wallColor },
                    { role: 'Accent', name: 'Feature Tone', hex: aiPlan.accentWallColor },
                    { role: 'Ceiling', name: 'Upper Plane', hex: aiPlan.ceilingColor },
                  ]
              ).map((sw, idx) => (
                <div
                  key={`${sw.hex}-${idx}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                    isDark ? 'border-[#343834] bg-[#191B19]' : 'border-[#D8C9B5] bg-[#FFFFFF]'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <div className="min-w-0">
                    <p className={`text-[10px] font-medium truncate ${headingCls}`}>{sw.name}</p>
                    <p className={`text-[9px] truncate ${mutedCls}`}>{sw.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lighting Advice */}
          {aiPlan.lightingRecommendations && (
            <div className="space-y-1">
              <p className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${headingCls}`}>
                <Sun className="w-3.5 h-3.5 text-[#78816C]" />
                <span>Lighting Recommendations</span>
              </p>
              <p className={`text-[11px] ${mutedCls} leading-relaxed`}>
                {aiPlan.lightingRecommendations}
              </p>
            </div>
          )}

          {/* Space Optimization */}
          {aiPlan.spaceOptimizationSuggestions && aiPlan.spaceOptimizationSuggestions.length > 0 && (
            <div className="space-y-1">
              <p className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${headingCls}`}>
                <Compass className="w-3.5 h-3.5 text-[#78816C]" />
                <span>Space Optimization</span>
              </p>
              <ul className={`space-y-1 text-[11px] ${mutedCls}`}>
                {aiPlan.spaceOptimizationSuggestions.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#78816C] mt-1.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiPlan.budgetNote && (
            <p className={`text-[11px] ${mutedCls} italic`}>{aiPlan.budgetNote}</p>
          )}

          <div
            className={`rounded-md border ${
              isDark ? 'border-[#343834] bg-[#191B19]' : 'border-[#D8C9B5] bg-[#FFFFFF]'
            } p-2.5 space-y-1.5`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className={headingCls}>
                Placed Catalog Plan ({aiPlanCatalogSummary.items.length})
              </span>
              <span className="font-mono-tabular text-[#78816C]">
                {formatINR(aiPlanCatalogSummary.total)}
              </span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {aiPlanCatalogSummary.items.map((row, idx) => (
                <div
                  key={`${row.item.id}-${idx}`}
                  className={`flex items-center justify-between text-[11px] ${mutedCls}`}
                >
                  <span className="truncate pr-2">{row.item.name}</span>
                  <span className="font-mono-tabular shrink-0">{formatINR(row.item.price)}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyAIPlan}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 ${primaryBtnCls} text-xs font-medium rounded-lg transition-colors`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply AI Plan to 3D Scene</span>
          </button>
        </div>
      )}

      {/* Curated Architectural Preset Application */}
      <div className={`pt-3 border-t ${isDark ? 'border-[#2E312E]' : 'border-[#D8C9B5]'} space-y-2.5`}>
        <div className="flex items-center justify-between text-xs">
          <span className={`inline-flex items-center gap-1.5 font-medium ${labelCls}`}>
            <Sliders className="w-3.5 h-3.5 text-[#78816C]" />
            <span>Curated Architectural Preset</span>
          </span>
          <span className={`font-mono-tabular text-[11px] ${mutedCls}`}>
            Est. {formatINR(curatedPreviewTotal)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleApplyCuratedPreset(styleId)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 ${primaryBtnCls} text-xs font-medium rounded-lg transition-colors`}
        >
          <span>
            Apply {DESIGN_STYLES.find((s) => s.id === styleId)?.name} ({selectedRoomType})
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
