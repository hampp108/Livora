import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Box,
  Calculator,
  Compass,
  Layers,
  Maximize2,
  Menu,
  Minimize2,
  RotateCcw,
  RotateCw,
  Sparkles,
  SplitSquareHorizontal,
  Sun,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Palette,
  IndianRupee,
} from 'lucide-react';
import { RoomCanvas, ZoomCommand } from '../three/RoomCanvas';
import { LazyRoomViewport } from '../three/LazyRoomViewport';
import { RoomComparisonPanel } from './RoomComparisonPanel';
import { BudgetPlanner } from './BudgetPlanner';
import { LivoraWordmark } from './LivoraWordmark';
import { getCatalogItem } from '../data/catalog';
import { formatINR } from '../utils/currency';
import {
  buildDefaultShell,
  createStarterFurniture,
  DESIGN_STYLES,
  getDefaultShellForRoom,
} from '../data/stylesAndTemplates';
import {
  AuthUser,
  DashboardTab,
  DesignStyleId,
  FloorMaterial,
  RoomDimensions,
  RoomProject,
  RoomType,
} from '../types/room';

interface LandingPageProps {
  projects: RoomProject[];
  currentUser?: AuthUser | null;
  onOpenDashboard: (initialTab?: DashboardTab) => void;
  onOpenAuth?: (route: 'login' | 'register') => void;
  onSignOut?: () => void;
  onStartDesigning: () => void;
  onExploreStyle: (styleId: DesignStyleId, roomType?: RoomType) => void;
  onOpenProject: (project: RoomProject) => void;
}

const HERO_ROOMS: Array<{ type: RoomType; dims: RoomDimensions }> = [
  { type: 'Living Room', dims: { length: 5.8, width: 4.6, height: 3.0, unit: 'm' } },
  { type: 'Bedroom', dims: { length: 5.4, width: 4.5, height: 3.0, unit: 'm' } },
  { type: 'Kitchen', dims: { length: 5.2, width: 4.4, height: 2.95, unit: 'm' } },
  { type: 'Study Room', dims: { length: 4.4, width: 3.6, height: 2.85, unit: 'm' } },
];

const SHOWCASE_STYLES: DesignStyleId[] = [
  'minimalist',
  'modern-luxury',
  'scandinavian',
  'traditional',
  'contemporary',
];

const WALL_PALETTES = [
  { label: 'Cream Plaster', hex: '#F4F0E8' },
  { label: 'Sand Beige', hex: '#E6DAC8' },
  { label: 'Muted Sage', hex: '#DCE1D7' },
  { label: 'Warm Taupe', hex: '#CFC4B4' },
  { label: 'Deep Charcoal', hex: '#30332F' },
];

const FLOOR_SWATCHES: Array<{ id: FloorMaterial; label: string; color: string }> = [
  { id: 'white-oak', label: 'White Oak', color: '#D6BE9E' },
  { id: 'herringbone-oak', label: 'Herringbone Oak', color: '#DEC9A8' },
  { id: 'smoked-walnut', label: 'Smoked Walnut', color: '#6E513B' },
  { id: 'polished-marble', label: 'Marble', color: '#EFECE5' },
  { id: 'warm-travertine', label: 'Travertine', color: '#E2D8C7' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  projects,
  currentUser,
  onOpenDashboard,
  onOpenAuth,
  onSignOut,
  onStartDesigning,
  onExploreStyle,
  onOpenProject,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('top');

  // Interactive Hero state
  const [heroRoomType, setHeroRoomType] = useState<RoomType>('Living Room');
  const [heroStyleId, setHeroStyleId] = useState<DesignStyleId>('modern-luxury');
  const [heroZoom, setHeroZoom] = useState<ZoomCommand>({ type: 'reset', tick: 0 });
  const [heroFullscreen, setHeroFullscreen] = useState(false);
  const [heroAutoRotate, setHeroAutoRotate] = useState(true);

  // Interactive Room Explorer state
  const [expRoomType, setExpRoomType] = useState<RoomType>('Bedroom');
  const [expStyleId, setExpStyleId] = useState<DesignStyleId>('scandinavian');
  const [expWallColor, setExpWallColor] = useState<string>('#F4F0E8');
  const [expFloor, setExpFloor] = useState<FloorMaterial>('herringbone-oak');
  const [expZoom, setExpZoom] = useState<ZoomCommand>({ type: 'reset', tick: 0 });
  const [expFullscreen, setExpFullscreen] = useState(false);

  const heroTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroTextRef.current) {
        gsap.from(heroTextRef.current.querySelectorAll('.hero-reveal'), {
          y: 22,
          opacity: 0,
          duration: 0.75,
          stagger: 0.08,
          ease: 'power3.out',
        });
      }
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const sectionIds = [
      'top',
      'how-it-works',
      'features',
      'explore-interactive',
      'showcase',
      'compare',
      'ai-recommendations',
      'budget-planner',
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-32% 0px -52% 0px', threshold: 0.05 },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const heroRoomSpec = useMemo(
    () => HERO_ROOMS.find((r) => r.type === heroRoomType) ?? HERO_ROOMS[0],
    [heroRoomType],
  );
  const heroShell = useMemo(
    () => getDefaultShellForRoom(heroRoomType, heroStyleId),
    [heroRoomType, heroStyleId],
  );
  const heroFurniture = useMemo(
    () =>
      createStarterFurniture(
        heroRoomType,
        heroStyleId,
        heroRoomSpec.dims.length,
        heroRoomSpec.dims.width,
      ),
    [heroRoomType, heroStyleId, heroRoomSpec],
  );
  const heroFurnitureCost = useMemo(
    () => heroFurniture.reduce((s, f) => s + (getCatalogItem(f.catalogId)?.price ?? 0), 0),
    [heroFurniture],
  );

  const expRoomSpec = useMemo(
    () => HERO_ROOMS.find((r) => r.type === expRoomType) ?? HERO_ROOMS[1],
    [expRoomType],
  );
  const expShell = useMemo(() => {
    const base = getDefaultShellForRoom(expRoomType, expStyleId);
    return {
      ...base,
      wallColor: expWallColor,
      floorMaterial: expFloor,
    };
  }, [expRoomType, expStyleId, expWallColor, expFloor]);

  const expFurniture = useMemo(
    () =>
      createStarterFurniture(
        expRoomType,
        expStyleId,
        expRoomSpec.dims.length,
        expRoomSpec.dims.width,
      ),
    [expRoomType, expStyleId, expRoomSpec],
  );
  const expFurnitureCost = useMemo(
    () => expFurniture.reduce((s, f) => s + (getCatalogItem(f.catalogId)?.price ?? 0), 0),
    [expFurniture],
  );

  const handleStylePickInExplorer = (id: DesignStyleId) => {
    setExpStyleId(id);
    const st = buildDefaultShell(id);
    setExpWallColor(st.wallColor);
    setExpFloor(st.floorMaterial);
  };

  return (
    <div id="top" className="min-h-screen bg-[#F4F0E8] text-[#30332F]">
      {/* Unified Responsive Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#F4F0E8]/95 border-b border-[#D8C9B5]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 h-16 flex items-center justify-between gap-4">
          <a
            href="#top"
            className="whitespace-nowrap shrink-0 transition-opacity hover:opacity-85"
          >
            <LivoraWordmark theme="light" size="md" />
          </a>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-[#545751]">
            <button
              type="button"
              onClick={() => scrollToSection('top')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeSection === 'top'
                  ? 'text-[#30332F] border-[#30332F]'
                  : 'border-transparent hover:text-[#30332F]'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeSection === 'features' || activeSection === 'how-it-works'
                  ? 'text-[#30332F] border-[#30332F]'
                  : 'border-transparent hover:text-[#30332F]'
              }`}
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('explore-interactive')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeSection === 'explore-interactive' || activeSection === 'showcase'
                  ? 'text-[#30332F] border-[#30332F]'
                  : 'border-transparent hover:text-[#30332F]'
              }`}
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('compare')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeSection === 'compare'
                  ? 'text-[#30332F] border-[#30332F]'
                  : 'border-transparent hover:text-[#30332F]'
              }`}
            >
              Compare
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('ai-recommendations')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeSection === 'ai-recommendations'
                  ? 'text-[#30332F] border-[#30332F]'
                  : 'border-transparent hover:text-[#30332F]'
              }`}
            >
              AI Studio
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('budget-planner')}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                activeSection === 'budget-planner'
                  ? 'text-[#30332F] border-[#30332F]'
                  : 'border-transparent hover:text-[#30332F]'
              }`}
            >
              Budget Planner
            </button>
            <button
              type="button"
              onClick={() => onOpenDashboard('projects')}
              className="border-b-2 border-transparent pb-0.5 hover:text-[#30332F] transition-colors whitespace-nowrap shrink-0"
            >
              My Projects
            </button>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {!currentUser && onOpenAuth ? (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="hidden sm:inline-flex px-4 py-2 text-xs font-medium border border-[#D8C9B5] bg-[#FFFFFF] hover:bg-[#F4F0E8] text-[#30332F] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenDashboard('overview')}
                  className="hidden sm:inline-flex px-4 py-2 text-xs font-medium border border-[#D8C9B5] bg-[#FFFFFF] hover:bg-[#F4F0E8] text-[#30332F] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Workspace
                </button>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="hidden md:inline-flex px-3 py-2 text-xs font-medium text-[#6B6E66] hover:text-[#8B3228] transition-colors whitespace-nowrap shrink-0"
                  >
                    Sign Out
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={onStartDesigning}
              className="px-4 py-2 text-xs font-medium bg-[#30332F] hover:bg-[#434742] text-[#FFFFFF] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Start Designing
            </button>
            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg border border-[#D8C9B5] bg-[#FFFFFF] text-[#30332F]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#D8C9B5] bg-[#FFFFFF] px-5 py-4 space-y-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => scrollToSection('top')}
              className="block w-full text-left py-1.5 text-[#30332F]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-1.5 text-[#30332F]"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('explore-interactive')}
              className="block w-full text-left py-1.5 text-[#30332F]"
            >
              Explore Rooms
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('compare')}
              className="block w-full text-left py-1.5 text-[#30332F]"
            >
              Compare Before & After
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('ai-recommendations')}
              className="block w-full text-left py-1.5 text-[#30332F]"
            >
              AI Studio
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('budget-planner')}
              className="block w-full text-left py-1.5 text-[#30332F]"
            >
              Budget Planner
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDashboard('projects');
              }}
              className="block w-full text-left py-1.5 text-[#30332F]"
            >
              My Projects
            </button>
            {!currentUser && onOpenAuth ? (
              <div className="pt-2 border-t border-[#E6DED0] flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="flex-1 py-2 text-xs font-medium border border-[#D8C9B5] rounded-lg text-[#30332F]"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="flex-1 py-2 text-xs font-medium bg-[#30332F] text-[#FFFFFF] rounded-lg"
                >
                  Create Account
                </button>
              </div>
            ) : (
              onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="block w-full text-left py-1.5 text-[#8B3228]"
                >
                  Sign Out
                </button>
              )
            )}
          </div>
        )}
      </header>

      {/* 1. HERO SECTION */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-14 lg:pt-12 lg:pb-18">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div ref={heroTextRef} className="lg:col-span-5 flex flex-col justify-center space-y-5 py-2">
            <p className="hero-reveal text-xs font-semibold tracking-[0.16em] uppercase text-[#78816C]">
              Architectural 3D Room Planning
            </p>
            <h1 className="hero-reveal font-display text-4xl sm:text-5xl xl:text-[3.35rem] leading-[1.08] tracking-tight text-[#30332F] text-balance">
              Design Every Room Before You Move a Single Piece.
            </h1>
            <p className="hero-reveal text-base text-[#52554F] leading-relaxed max-w-lg">
              Transform your spaces with intelligent room visualisation, personalised interior recommendations and smarter design planning.
            </p>

            <div className="hero-reveal flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onStartDesigning}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#30332F] hover:bg-[#434742] text-[#FFFFFF] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                <span>Start Designing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('explore-interactive')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#FFFFFF] hover:bg-[#ECE5D8] text-[#30332F] text-sm font-medium rounded-lg border border-[#D8C9B5] transition-colors whitespace-nowrap"
              >
                <span>Explore Demo</span>
              </button>
            </div>

            {/* Live Hero Room & Style Quick Switcher */}
            <div className="hero-reveal pt-4 border-t border-[#D8C9B5] space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {HERO_ROOMS.map((r) => (
                  <button
                    key={r.type}
                    type="button"
                    onClick={() => setHeroRoomType(r.type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      heroRoomType === r.type
                        ? 'bg-[#30332F] text-[#FFFFFF] border-[#30332F]'
                        : 'bg-[#FFFFFF] text-[#4C4E49] border-[#D8C9B5] hover:border-[#8C7967]'
                    }`}
                  >
                    {r.type}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SHOWCASE_STYLES.map((id) => {
                  const st = DESIGN_STYLES.find((s) => s.id === id);
                  if (!st) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setHeroStyleId(id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                        heroStyleId === id
                          ? 'bg-[#78816C] text-[#FFFFFF] border-[#78816C]'
                          : 'bg-[#F4F0E8] text-[#4C4E49] border-[#D8C9B5] hover:border-[#8C7967]'
                      }`}
                    >
                      {st.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive 3D Hero Viewport (Full-Room Framing + Zoom/Reset/Fullscreen) */}
          <div
            className={`${
              heroFullscreen
                ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl'
                : 'lg:col-span-7 min-h-[420px] sm:min-h-[480px] lg:min-h-[540px] rounded-2xl relative'
            } overflow-hidden border border-[#D8C9B5] bg-[#EAE3D5]`}
          >
            <LazyRoomViewport forceMount={heroFullscreen} className="w-full h-full">
              <RoomCanvas
                dimensions={heroRoomSpec.dims}
                shell={heroShell}
                furniture={heroFurniture}
                selectedId={null}
                walkthroughMode={false}
                cameraPreset="isometric"
                cameraPresetTick={0}
                constructionKey={0}
                zoomCommand={heroZoom}
                allowOrbit
                autoRotate={heroAutoRotate}
                interactive={false}
                showDimensions={false}
              />
            </LazyRoomViewport>

            {/* Top-Right Interactive Camera Toolbar */}
            <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 bg-[#FFFFFF]/95 border border-[#D8C9B5] rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setHeroZoom((z) => ({ type: 'in', tick: z.tick + 1 }))}
                title="Zoom In"
                className="p-1.5 rounded-lg hover:bg-[#F4F0E8] text-[#30332F] transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setHeroZoom((z) => ({ type: 'out', tick: z.tick + 1 }))}
                title="Zoom Out"
                className="p-1.5 rounded-lg hover:bg-[#F4F0E8] text-[#30332F] transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setHeroZoom((z) => ({ type: 'reset', tick: z.tick + 1 }))}
                title="Reset View"
                className="p-1.5 rounded-lg hover:bg-[#F4F0E8] text-[#30332F] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setHeroAutoRotate((r) => !r)}
                title={heroAutoRotate ? 'Pause Rotation' : 'Auto-Rotate 360°'}
                className={`p-1.5 rounded-lg transition-colors ${
                  heroAutoRotate ? 'bg-[#78816C] text-[#FFFFFF]' : 'hover:bg-[#F4F0E8] text-[#30332F]'
                }`}
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setHeroFullscreen((v) => !v)}
                title={heroFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
                className="p-1.5 rounded-lg hover:bg-[#F4F0E8] text-[#30332F] transition-colors"
              >
                {heroFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Subtle Floating Room Info Readout */}
            <div className="pointer-events-none absolute bottom-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="px-3.5 py-2 rounded-xl bg-[#30332F]/90 text-[#F4F0E8] flex items-center gap-3 shadow-sm">
                <span className="font-medium">
                  {heroRoomType} · {DESIGN_STYLES.find((s) => s.id === heroStyleId)?.name}
                </span>
                <span className="text-[#D8C9B5]">|</span>
                <span className="font-mono-tabular text-[#D8C9B5]">
                  {heroRoomSpec.dims.length.toFixed(1)}×{heroRoomSpec.dims.width.toFixed(1)}m
                </span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#FFFFFF]/95 text-[#30332F] border border-[#D8C9B5] font-mono-tabular font-medium shadow-sm">
                Catalog Est. {formatINR(heroFurnitureCost)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section id="how-it-works" className="border-t border-[#D8C9B5] bg-[#FFFFFF]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78816C] mb-2">
              How It Works
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-[#30332F]">
              From blank dimensions to a budgeted, walk-ready 3D room.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: Box,
                title: 'Define Space & Room Type',
                body: 'Choose Living Room, Bedroom, Kitchen, Study Room, or 9 additional room functions with exact wall dimensions and window placements.',
              },
              {
                step: '02',
                icon: Layers,
                title: 'Customize Materials & AI Layout',
                body: 'Swap wall plaster colors, oak or marble flooring, and 3D catalog furniture—or ask Gemini to propose a layout aligned to your budget.',
              },
              {
                step: '03',
                icon: SplitSquareHorizontal,
                title: 'Compare, Budget & Walk Through',
                body: 'Inspect Before-and-After sliders, review itemized category costs, and step inside your room at eye level before purchasing anything.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-6 rounded-2xl border border-[#D8C9B5] bg-[#F4F0E8]/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-[#D8C9B5] flex items-center justify-center text-[#78816C]">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-mono-tabular text-xs font-semibold text-[#8C7967]">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="font-display text-xl text-[#30332F]">{item.title}</h3>
                  <p className="text-sm text-[#52554F] leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. MAIN FEATURES */}
      <section id="features" className="border-t border-[#D8C9B5] bg-[#F4F0E8]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78816C] mb-2">
              Main Features
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-[#30332F]">
              Everything required to visualize, style, and budget any Indian home interior.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Box,
                title: 'True-Scale 3D Visualization',
                body: 'Orbit, inspect clearances, toggle cutaway or first-person walkthrough, and preview 13 room functions with PBR surface materials.',
              },
              {
                icon: Sun,
                title: 'Atmosphere & Lighting Presets',
                body: 'Evaluate spaces across Natural Daylight, Soft Morning, Golden Hour, Warm Evening, and Night Ambient with realistic lamp glow.',
              },
              {
                icon: Palette,
                title: '47+ Curated Furniture Pieces',
                body: 'Drag, rotate, scale, and recolor beds, sofas, modular cabinetry, rugs, dining sets, and lighting fixtures in real time.',
              },
              {
                icon: Wand2,
                title: 'Gemini AI Spatial Studio',
                body: 'Input room dimensions, design requirements, and your INR budget to generate palette harmonies, lighting plans, and layouts.',
              },
              {
                icon: SplitSquareHorizontal,
                title: 'Before & After Comparison',
                body: 'Slide between empty room shells and furnished designs—or two competing concepts—with synchronized 3D framing and cost delta.',
              },
              {
                icon: IndianRupee,
                title: 'Smart INR Budget Planner',
                body: 'Calculate realistic Indian market estimates across furniture, flooring, wall finishes, lighting, and execution contingency.',
              },
            ].map((feat) => {
              const FeatIcon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-6 rounded-2xl border border-[#D8C9B5] bg-[#FFFFFF] space-y-3"
                >
                  <span className="w-10 h-10 rounded-xl bg-[#F4F0E8] border border-[#D8C9B5] flex items-center justify-center text-[#78816C]">
                    <FeatIcon className="w-5 h-5" />
                  </span>
                  <h3 className="font-display text-xl text-[#30332F]">{feat.title}</h3>
                  <p className="text-sm text-[#52554F] leading-relaxed">{feat.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE ROOM EXPLORATION & CUSTOMIZATION */}
      <section id="explore-interactive" className="border-t border-[#D8C9B5] bg-[#FFFFFF]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78816C] mb-2">
                Interactive Room Exploration
              </p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-[#30332F]">
                Customize room type, style, palette, and surfaces live in 3D.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onExploreStyle(expStyleId, expRoomType)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#30332F] hover:bg-[#434742] text-[#FFFFFF] text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Open This Room in Full Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Customizer Sidebar */}
            <div className="lg:col-span-4 p-6 rounded-2xl border border-[#D8C9B5] bg-[#FFFFFF] space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7967] mb-2">
                  1. Room Selection
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {HERO_ROOMS.map((r) => (
                    <button
                      key={r.type}
                      type="button"
                      onClick={() => setExpRoomType(r.type)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                        expRoomType === r.type
                          ? 'bg-[#30332F] text-[#FFFFFF] border-[#30332F]'
                          : 'bg-[#F4F0E8] text-[#30332F] border-[#D8C9B5] hover:border-[#8C7967]'
                      }`}
                    >
                      {r.type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7967] mb-2">
                  2. Design Style
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SHOWCASE_STYLES.map((id) => {
                    const st = DESIGN_STYLES.find((s) => s.id === id);
                    if (!st) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleStylePickInExplorer(id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          expStyleId === id
                            ? 'bg-[#78816C] text-[#FFFFFF] border-[#78816C]'
                            : 'bg-[#F4F0E8] text-[#30332F] border-[#D8C9B5] hover:border-[#8C7967]'
                        }`}
                      >
                        {st.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7967] mb-2">
                  3. Wall Color Palette
                </label>
                <div className="flex flex-wrap gap-2">
                  {WALL_PALETTES.map((wp) => (
                    <button
                      key={wp.hex}
                      type="button"
                      onClick={() => setExpWallColor(wp.hex)}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        expWallColor === wp.hex
                          ? 'border-[#30332F] bg-[#F4F0E8] font-medium'
                          : 'border-[#D8C9B5] bg-[#FFFFFF]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: wp.hex }}
                      />
                      <span>{wp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7967] mb-2">
                  4. Flooring Material
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FLOOR_SWATCHES.map((fl) => (
                    <button
                      key={fl.id}
                      type="button"
                      onClick={() => setExpFloor(fl.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        expFloor === fl.id
                          ? 'bg-[#30332F] text-[#FFFFFF] border-[#30332F]'
                          : 'bg-[#F4F0E8] text-[#30332F] border-[#D8C9B5]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-sm border border-black/20 shrink-0"
                        style={{ backgroundColor: fl.color }}
                      />
                      <span className="truncate">{fl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E6DDD0] flex items-center justify-between text-xs">
                <span className="text-[#6E6B64]">Placed Catalog Furniture ({expFurniture.length})</span>
                <span className="font-mono-tabular font-semibold text-[#30332F]">
                  {formatINR(expFurnitureCost)}
                </span>
              </div>
            </div>

            {/* Interactive Explorer 3D Viewport */}
            <div
              className={`${
                expFullscreen
                  ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl'
                  : 'lg:col-span-8 min-h-[420px] lg:min-h-[500px] rounded-2xl relative'
              } overflow-hidden border border-[#D8C9B5] bg-[#EAE3D5]`}
            >
              <LazyRoomViewport forceMount={expFullscreen} className="w-full h-full">
                <RoomCanvas
                  dimensions={expRoomSpec.dims}
                  shell={expShell}
                  furniture={expFurniture}
                  selectedId={null}
                  walkthroughMode={false}
                  cameraPreset="isometric"
                  cameraPresetTick={0}
                  constructionKey={0}
                  zoomCommand={expZoom}
                  allowOrbit
                  interactive={false}
                  showDimensions
                />
              </LazyRoomViewport>

              <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 bg-[#FFFFFF]/95 border border-[#D8C9B5] rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpZoom((z) => ({ type: 'in', tick: z.tick + 1 }))}
                  title="Zoom In"
                  className="p-1.5 rounded-lg hover:bg-[#F4F0E8] text-[#30332F]"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpZoom((z) => ({ type: 'out', tick: z.tick + 1 }))}
                  title="Zoom Out"
                  className="p-1.5 rounded-lg hover:bg-[#F4F0E8] text-[#30332F]"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpZoom((z) => ({ type: 'reset', tick: z.tick + 1 }))}
                  title="Reset View"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[#F4F0E8] text-xs font-medium text-[#30332F]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpFullscreen((v) => !v)}
                  title={expFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
                  className="p-1.5 rounded-lg hover:bg-[#F4F0E8] text-[#30332F]"
                >
                  {expFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ROOM DESIGN SHOWCASE */}
      <section id="showcase" className="border-t border-[#D8C9B5] bg-[#FFFFFF]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78816C] mb-2">
                Room Design Showcase
              </p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-[#30332F]">
                Architectural directions curated for real homes.
              </h2>
            </div>
            <button
              type="button"
              onClick={onStartDesigning}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#30332F] hover:text-[#78816C] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Create custom room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DESIGN_STYLES.map((style) => (
              <motion.article
                key={style.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.22 }}
                onClick={() => onExploreStyle(style.id)}
                className="group cursor-pointer rounded-2xl overflow-hidden border border-[#D8C9B5] bg-[#F4F0E8]/45 flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#E5DEC9]">
                  <img
                    src={style.image}
                    alt={`${style.name} interior design`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-[#FFFFFF]">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="font-display text-xl text-[#30332F]">{style.name}</h3>
                      <div className="flex items-center gap-1">
                        {style.palette.slice(0, 4).map((hex) => (
                          <span
                            key={hex}
                            className="w-3.5 h-3.5 rounded-full border border-black/15"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[#8C7967] font-medium mb-2">{style.tagline}</p>
                    <p className="text-sm text-[#52554F] leading-relaxed">{style.description}</p>
                  </div>
                  <div className="pt-3 border-t border-[#EAE3D5] flex items-center justify-between text-xs font-medium text-[#30332F] group-hover:text-[#78816C] transition-colors">
                    <span>Launch 3D room in {style.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. BEFORE-AND-AFTER COMPARISON */}
      <section id="compare" className="border-t border-[#D8C9B5] bg-[#FFFFFF]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78816C] mb-2">
              Before-and-After Comparison
            </p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-[#30332F]">
              Verify every material upgrade and INR cost delta at a glance.
            </h2>
          </div>

          <RoomComparisonPanel
            projects={projects}
            theme="light"
            onOpenProject={onOpenProject}
          />
        </div>
      </section>

      {/* 7. AI-POWERED DESIGN RECOMMENDATIONS */}
      <section id="ai-recommendations" className="border-t border-[#D8C9B5] bg-[#F4F0E8]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78816C]">
                AI-Powered Design Recommendations
              </p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-[#30332F]">
                Tailored room palettes, lighting plans, and layouts from your brief and budget.
              </h2>
              <p className="text-sm text-[#52554F] leading-relaxed">
                Provide your room dimensions, lifestyle requirements (such as reading nooks, wardrobe clearance, or hybrid work desks), and a target budget in INR. Livora generates color combinations, lighting recommendations, space optimization advice, and an immediately editable 3D layout.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenDashboard('ai-studio')}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#30332F] hover:bg-[#434742] text-[#FFFFFF] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Open AI Design Studio</span>
                </button>
                <button
                  type="button"
                  onClick={onStartDesigning}
                  className="px-5 py-3 bg-[#FFFFFF] hover:bg-[#ECE5D8] text-[#30332F] text-sm font-medium rounded-lg border border-[#D8C9B5] transition-colors whitespace-nowrap"
                >
                  Create Custom Room
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-[#D8C9B5] bg-[#FFFFFF] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78816C]">
                    Sample AI Brief Output · Bedroom 5.4 × 4.5m
                  </p>
                  <p className="font-display text-lg text-[#30332F]">
                    Warm Modern Sanctuary · Target {formatINR(350000)}
                  </p>
                </div>
                <span className="font-mono-tabular text-xs font-semibold px-2.5 py-1 rounded-md bg-[#F4F0E8] text-[#30332F] border border-[#D8C9B5]">
                  Est. {formatINR(328000)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F4F0E8]/70 border border-[#E5DEC9] space-y-1.5">
                  <p className="font-semibold text-[#30332F]">Color Combinations</p>
                  <ul className="space-y-1 text-[#52554F]">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#78816C] shrink-0" />
                      <span>Warm Ivory walls + Herringbone Oak floor</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#78816C] shrink-0" />
                      <span>Muted Sage & Sand Beige upholstery accents</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F4F0E8]/70 border border-[#E5DEC9] space-y-1.5">
                  <p className="font-semibold text-[#30332F]">Lighting Recommendations</p>
                  <ul className="space-y-1 text-[#52554F]">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#78816C] shrink-0" />
                      <span>2700K cove ceiling + dual linen bedside lamps</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#78816C] shrink-0" />
                      <span>Golden Hour daylight balance through sheer curtains</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F4F0E8]/50 border border-[#E5DEC9] text-xs space-y-1">
                <p className="font-semibold text-[#30332F]">Space Optimization</p>
                <p className="text-[#52554F]">
                  Center platform bed on back wall to retain 0.9m walkway clearance on both sides while tucking the fluted wardrobe flush along the left elevation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SMART BUDGET PLANNER & 9. WHY CHOOSE LIVORA */}
      <section id="budget-planner" className="border-t border-[#D8C9B5] bg-[#FFFFFF]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-16 lg:py-20 space-y-16">
          <div>
            <div className="max-w-2xl mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78816C] mb-2">
                Smart Budget Planner
              </p>
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-[#30332F]">
                Transparent category cost planning linked to real 3D room sizes.
              </h2>
            </div>

            <BudgetPlanner
              projects={projects}
              theme="light"
              onStartCreateRoom={onStartDesigning}
            />
          </div>

          <div className="pt-12 border-t border-[#D8C9B5]">
            <div className="max-w-2xl mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78816C] mb-2">
                Why Choose Livora
              </p>
              <h2 className="font-display text-3xl tracking-tight text-[#30332F]">
                Built for homeowners, renters, and interior studios who plan with precision.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: Compass,
                  title: 'Eliminates Guesswork',
                  body: 'Verify furniture clearances, door swings, and sightlines in true 3D scale before ordering heavy pieces.',
                },
                {
                  icon: Sparkles,
                  title: 'Budget-Aware Gemini AI',
                  body: 'Generate room palettes and catalog furniture arrangements tuned to your stated room function and target budget.',
                },
                {
                  icon: Calculator,
                  title: 'Honest Cost Breakdown',
                  body: 'Combine real catalog furniture totals with transparent surface-area estimates across flooring, lighting, and walls.',
                },
                {
                  icon: Layers,
                  title: 'Multi-Project Workspace',
                  body: 'Save, duplicate, compare side-by-side, and revisit your room iterations anytime inside your persistent studio.',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="p-5 rounded-2xl border border-[#D8C9B5] bg-[#F4F0E8]/60 space-y-2.5"
                  >
                    <Icon className="w-5 h-5 text-[#78816C]" />
                    <h3 className="font-display text-lg text-[#30332F]">{card.title}</h3>
                    <p className="text-xs text-[#52554F] leading-relaxed">{card.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-16">
        <div className="rounded-2xl bg-[#30332F] text-[#F4F0E8] px-8 py-12 lg:px-14 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl space-y-3">
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-balance">
              Ready to furnish, budget, and walk through your next space?
            </h2>
            <p className="text-sm text-[#D8C9B5] leading-relaxed">
              Launch a new room wizard from scratch or manage saved rooms, comparisons, and budgets inside the Livora Workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onStartDesigning}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#FFFFFF] hover:bg-[#F4F0E8] text-[#30332F] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Start Designing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenDashboard('overview')}
              className="px-5 py-3 border border-[#8C7967] hover:border-[#D8C9B5] text-[#F4F0E8] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Open Workspace
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#D8C9B5] py-8 bg-[#F4F0E8]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E6B64]">
          <LivoraWordmark theme="light" size="sm" />
          <span>Architectural 3D Interior Visualization, Comparison & Budget Planning</span>
          <span>© 2026 Livora Studio</span>
        </div>
      </footer>
    </div>
  );
};
