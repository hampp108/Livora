import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  FolderKanban,
  PlusSquare,
  Sparkles,
  Image as ImageIcon,
  LayoutTemplate,
  Bookmark,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  MoreHorizontal,
  ArrowRight,
  Copy,
  Trash2,
  Edit3,
  X,
  Check,
  Search,
  Home,
  Sun,
  Moon,
  Layers,
  Clock,
  Compass,
  SplitSquareHorizontal,
  Calculator,
  Menu,
  LogOut,
} from 'lucide-react';
import {
  ActivityLogItem,
  DashboardTab,
  DesignStyleId,
  RoomProject,
  UserSettings,
} from '../types/room';
import { DESIGN_STYLES, ROOM_TEMPLATES } from '../data/stylesAndTemplates';
import { RoomPreviewGraphic } from './RoomPreviewGraphic';
import { AIDesignStudioPanel } from './AIDesignStudioPanel';
import { BudgetPlanner } from './BudgetPlanner';
import { RoomComparisonPanel } from './RoomComparisonPanel';
import { LivoraWordmark } from './LivoraWordmark';
import { computeFurnitureINR, estimateProjectTotalINR, formatINR } from '../utils/currency';

interface DashboardProps {
  projects: RoomProject[];
  activities: ActivityLogItem[];
  settings: UserSettings;
  userEmail?: string;
  initialTab?: DashboardTab;
  onUpdateSettings: (next: UserSettings) => void;
  onBackToLanding: () => void;
  onSignOut?: () => void;
  onStartCreateRoom: () => void;
  onOpenProject: (project: RoomProject) => void;
  onQuickStart: (
    kind: 'bedroom' | 'living' | 'workspace' | 'gaming' | 'empty' | 'style',
    styleId?: DesignStyleId,
  ) => void;
  onUseTemplate: (templateId: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onToggleSaveArchive: (id: string) => void;
  onUpdateProject: (updated: RoomProject) => void;
}

const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 550;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="font-mono-tabular">{display}</span>;
};

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDimensions(p: RoomProject): string {
  const factor = p.dimensions.unit === 'ft' ? 3.28084 : 1;
  const u = p.dimensions.unit;
  return `${(p.dimensions.length * factor).toFixed(1)} × ${(p.dimensions.width * factor).toFixed(1)} × ${(p.dimensions.height * factor).toFixed(1)} ${u}`;
}

type QuickStartKind = 'bedroom' | 'living' | 'workspace' | 'gaming' | 'empty';

const QUICK_START_CARDS: Array<{
  id: QuickStartKind;
  title: string;
  subtitle: string;
  tag: string;
  accent: string;
  floor: string;
}> = [
  {
    id: 'bedroom',
    title: 'Design a Bedroom',
    subtitle: '4.8 × 4.2m · Nordic Suite',
    tag: 'SANCTUARY',
    accent: '#D8CFC2',
    floor: '#DEC9A8',
  },
  {
    id: 'living',
    title: 'Create a Living Room',
    subtitle: '5.8 × 4.6m · Modern Luxury',
    tag: 'LOUNGE',
    accent: '#C5A059',
    floor: '#D6BE9E',
  },
  {
    id: 'workspace',
    title: 'Design a Workspace',
    subtitle: '4.4 × 3.6m · Japandi Study',
    tag: 'ATELIER',
    accent: '#5D6B53',
    floor: '#C9AE8B',
  },
  {
    id: 'gaming',
    title: 'Create a Gaming Room',
    subtitle: '4.6 × 3.8m · Creator Rig',
    tag: 'STUDIO RIG',
    accent: '#6E8CA8',
    floor: '#C8BFB0',
  },
  {
    id: 'empty',
    title: 'Start from an Empty Room',
    subtitle: '5.2 × 4.2m · Blank Canvas',
    tag: 'ARCHITECTURAL',
    accent: '#8D877B',
    floor: '#CECAC2',
  },
];

const IsometricThumbnail: React.FC<{
  kind: QuickStartKind;
  accent: string;
  floor: string;
  isDark: boolean;
}> = ({ kind, accent, floor, isDark }) => {
  const wallLeft = isDark ? '#272A27' : '#EAE5DC';
  const wallRight = isDark ? '#303430' : '#F4F0E8';
  const strokeCol = isDark ? '#8C887E' : '#2D2E2C';
  const floorColor = isDark && kind === 'empty' ? '#3B3F3B' : floor;

  return (
    <svg viewBox="14 6 128 88" className="w-full h-28">
      {/* Subtle blueprint shadow */}
      <polygon
        points="78,47 132,70 78,94 24,70"
        fill={isDark ? 'rgba(0,0,0,0.42)' : 'rgba(31,33,32,0.08)'}
      />

      {/* Back-left & back-right walls */}
      <polygon points="78,10 22,34 22,67 78,43" fill={wallLeft} stroke={strokeCol} strokeWidth="1.15" />
      <polygon points="78,10 134,34 134,67 78,43" fill={wallRight} stroke={strokeCol} strokeWidth="1.15" />

      {/* Window opening on right wall for sunlit rooms */}
      {kind !== 'empty' && (
        <polygon
          points="94,21 120,32 120,52 94,41"
          fill={kind === 'gaming' ? '#394D63' : '#CFE1EE'}
          stroke={strokeCol}
          strokeWidth="0.9"
        />
      )}

      {/* Floor diamond */}
      <polygon points="78,43 134,67 78,91 22,67" fill={floorColor} stroke={strokeCol} strokeWidth="1.35" />

      {/* Floor plank lines */}
      <line x1="50" y1="55" x2="106" y2="79" stroke={strokeCol} strokeOpacity="0.14" strokeWidth="0.7" />
      <line x1="64" y1="49" x2="120" y2="73" stroke={strokeCol} strokeOpacity="0.14" strokeWidth="0.7" />

      {kind === 'bedroom' && (
        <>
          {/* Woven area rug */}
          <polygon points="78,50 112,65 78,80 44,65" fill="#F2ECE1" stroke={strokeCol} strokeWidth="0.75" />
          {/* Headboard */}
          <polygon points="48,37 68,28 68,46 48,55" fill="#7D5C43" stroke={strokeCol} strokeWidth="0.9" />
          {/* Bed mattress & duvet */}
          <polygon points="50,54 70,45 94,55 74,64" fill="#FAF7F0" stroke={strokeCol} strokeWidth="0.9" />
          <polygon points="62,59 80,51 94,57 76,65" fill={accent} stroke={strokeCol} strokeWidth="0.8" />
          {/* Pillows */}
          <ellipse cx="60" cy="49" rx="4.5" ry="2.6" fill="#FFFFFF" stroke={strokeCol} strokeWidth="0.6" />
          <ellipse cx="67" cy="46" rx="4.5" ry="2.6" fill="#FFFFFF" stroke={strokeCol} strokeWidth="0.6" />
          {/* Warm bedside lamp glow */}
          <circle cx="42" cy="48" r="5" fill="#F6D594" fillOpacity="0.45" />
          <circle cx="42" cy="48" r="2.2" fill="#FFF2D6" stroke={strokeCol} strokeWidth="0.6" />
        </>
      )}

      {kind === 'living' && (
        <>
          {/* Large woven rug */}
          <polygon points="78,51 114,66 78,81 42,66" fill="#E6DEC9" stroke={strokeCol} strokeWidth="0.75" />
          {/* L-Sectional Sofa */}
          <polygon points="44,53 66,43 88,52 66,62" fill="#F6F2EA" stroke={strokeCol} strokeWidth="0.9" />
          <polygon points="44,46 66,36 66,43 44,53" fill="#DDD5C5" stroke={strokeCol} strokeWidth="0.85" />
          {/* Travertine Coffee Table */}
          <polygon points="78,58 92,64 78,70 64,64" fill={accent} stroke={strokeCol} strokeWidth="0.85" />
          {/* Plant pot */}
          <circle cx="114" cy="56" r="5.5" fill="#5D6B53" stroke={strokeCol} strokeWidth="0.7" />
        </>
      )}

      {kind === 'workspace' && (
        <>
          {/* Runner rug */}
          <polygon points="78,53 108,66 78,79 48,66" fill="#C9BA9E" stroke={strokeCol} strokeWidth="0.7" />
          {/* Timber Studio Desk */}
          <polygon points="52,48 80,36 94,42 66,54" fill="#9A724F" stroke={strokeCol} strokeWidth="0.9" />
          {/* Desk Monitor */}
          <polygon points="62,38 76,32 76,41 62,47" fill="#232524" stroke={strokeCol} strokeWidth="0.75" />
          {/* Task chair */}
          <circle cx="80" cy="60" r="6" fill={accent} stroke={strokeCol} strokeWidth="0.85" />
          <circle cx="42" cy="59" r="5" fill="#5D6B53" stroke={strokeCol} strokeWidth="0.7" />
        </>
      )}

      {kind === 'gaming' && (
        <>
          {/* Dark creator rug */}
          <polygon points="78,52 110,66 78,80 46,66" fill="#323634" stroke={strokeCol} strokeWidth="0.75" />
          {/* Gaming desk */}
          <polygon points="50,48 80,35 94,41 64,54" fill="#252726" stroke={strokeCol} strokeWidth="0.9" />
          {/* Dual RGB monitors */}
          <polygon points="56,37 78,28 78,38 56,47" fill="#1D2630" stroke="#7BB3D8" strokeWidth="1" />
          {/* RGB strip accent */}
          <line x1="50" y1="48" x2="80" y2="35" stroke="#D4AF6A" strokeWidth="1.6" />
          {/* Creator chair */}
          <circle cx="82" cy="61" r="6.5" fill="#5D6B53" stroke={strokeCol} strokeWidth="0.85" />
        </>
      )}

      {kind === 'empty' && (
        <>
          {/* Perspective blueprint lines */}
          <line x1="78" y1="43" x2="78" y2="91" stroke={strokeCol} strokeDasharray="2.5 2.5" strokeOpacity="0.45" strokeWidth="0.9" />
          <line x1="22" y1="67" x2="134" y2="67" stroke={strokeCol} strokeDasharray="2.5 2.5" strokeOpacity="0.45" strokeWidth="0.9" />
          <circle cx="78" cy="67" r="9" fill="none" stroke="#C5A059" strokeWidth="1.1" strokeDasharray="2 2" />
        </>
      )}
    </svg>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  activities,
  settings,
  userEmail,
  initialTab = 'overview',
  onUpdateSettings,
  onBackToLanding,
  onSignOut,
  onStartCreateRoom,
  onOpenProject,
  onQuickStart,
  onUseTemplate,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
  onToggleSaveArchive,
  onUpdateProject,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<RoomProject | null>(null);
  const [inspirationModalId, setInspirationModalId] = useState<DesignStyleId | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [aiTargetProjectId, setAiTargetProjectId] = useState<string>(projects[0]?.id ?? '');

  useEffect(() => {
    if (initialTab && initialTab !== 'create') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const isDark = settings.dashboardTheme === 'dark';

  const toggleDashboardTheme = () => {
    onUpdateSettings({
      ...settings,
      dashboardTheme: isDark ? 'light' : 'dark',
    });
  };

  // Architectural dual-theme color tokens aligned to Cream #F4F0E8, Sand #D8C9B5, Taupe #8C7967, Charcoal #30332F, Sage #78816C
  const t = useMemo(
    () =>
      isDark
        ? {
            canvas: 'bg-[#161816] text-[#F4F0E8]',
            sidebar: 'bg-[#1B1D1B] border-[#2E312E]',
            header: 'bg-[#1B1D1B]/95 border-[#2E312E]',
            card: 'bg-[#202320] border-[#313531]',
            cardHover: 'hover:border-[#78816C]',
            surface: 'bg-[#262A26] border-[#363B36]',
            subtleText: 'text-[#A8A399]',
            bodyText: 'text-[#D8C9B5]',
            headingText: 'text-[#F4F0E8]',
            accentText: 'text-[#96A287]',
            goldText: 'text-[#D8C9B5]',
            divider: 'border-[#2E312E]',
            divideY: 'divide-[#2A2D2A]',
            navInactive: 'text-[#A8A399] hover:text-[#F4F0E8] hover:bg-[#262A26]',
            navActiveBg: 'bg-[#F4F0E8]',
            navActiveText: 'text-[#30332F]',
            primaryBtn: 'bg-[#F4F0E8] hover:bg-[#D8C9B5] text-[#30332F]',
            sageBtn: 'bg-[#78816C] hover:bg-[#89937C] text-[#FFFFFF]',
            ghostBtn: 'border-[#383C38] text-[#D8C9B5] hover:bg-[#262A26]',
            input: 'bg-[#161816] border-[#343834] text-[#F4F0E8] placeholder:text-[#78756E]',
            heroBanner:
              'bg-gradient-to-br from-[#202320] via-[#1C1E1C] to-[#26241F] border-[#333631]',
            modal: 'bg-[#1E201E] border-[#353935] text-[#F4F0E8]',
            menu: 'bg-[#232623] border-[#383C38]',
          }
        : {
            canvas: 'bg-[#F4F0E8] text-[#30332F]',
            sidebar: 'bg-[#ECE5D8] border-[#D8C9B5]',
            header: 'bg-[#F4F0E8]/95 border-[#D8C9B5]',
            card: 'bg-[#FFFFFF] border-[#D8C9B5]',
            cardHover: 'hover:border-[#78816C]',
            surface: 'bg-[#F4F0E8] border-[#D8C9B5]',
            subtleText: 'text-[#6E6B64]',
            bodyText: 'text-[#4C4E49]',
            headingText: 'text-[#30332F]',
            accentText: 'text-[#78816C]',
            goldText: 'text-[#8C7967]',
            divider: 'border-[#D8C9B5]',
            divideY: 'divide-[#EAE3D5]',
            navInactive: 'text-[#52554F] hover:text-[#30332F] hover:bg-[#DFD4C2]/60',
            navActiveBg: 'bg-[#30332F]',
            navActiveText: 'text-[#FFFFFF]',
            primaryBtn: 'bg-[#30332F] hover:bg-[#434742] text-[#FFFFFF]',
            sageBtn: 'bg-[#78816C] hover:bg-[#66705B] text-[#FFFFFF]',
            ghostBtn: 'border-[#D8C9B5] text-[#30332F] hover:bg-[#F4F0E8]',
            input: 'bg-[#FFFFFF] border-[#D8C9B5] text-[#30332F] placeholder:text-[#8C7967]',
            heroBanner:
              'bg-gradient-to-br from-[#FFFFFF] via-[#FAF7F1] to-[#ECE4D4] border-[#D8C9B5]',
            modal: 'bg-[#FFFFFF] border-[#D8C9B5] text-[#30332F]',
            menu: 'bg-[#FFFFFF] border-[#D8C9B5]',
          },
    [isDark],
  );

  useEffect(() => {
    if (!projects.some((p) => p.id === aiTargetProjectId) && projects[0]) {
      setAiTargetProjectId(projects[0].id);
    }
  }, [projects, aiTargetProjectId]);

  const savedProjects = useMemo(() => projects.filter((p) => p.savedToArchive), [projects]);
  const recentProjects = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [projects],
  );
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentProjects;
    return recentProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.roomType.toLowerCase().includes(q) ||
        p.styleId.toLowerCase().includes(q),
    );
  }, [recentProjects, searchQuery]);

  const totalFurniturePieces = useMemo(
    () => projects.reduce((acc, p) => acc + p.furniture.length, 0),
    [projects],
  );

  const navItems: Array<{
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'projects', label: 'My Projects', icon: FolderKanban },
    { id: 'create', label: 'Create New Room', icon: PlusSquare },
    { id: 'compare', label: 'Compare Designs', icon: SplitSquareHorizontal },
    { id: 'budget', label: 'Budget Planner', icon: Calculator },
    { id: 'ai-studio', label: 'AI Design Studio', icon: Sparkles },
    { id: 'inspiration', label: 'Inspiration Gallery', icon: ImageIcon },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'saved', label: 'Saved Designs', icon: Bookmark },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: DashboardTab) => {
    setMobileNavOpen(false);
    if (id === 'create') {
      onStartCreateRoom();
      return;
    }
    setActiveTab(id);
    setOpenMenuId(null);
  };

  const renderProjectCard = (project: RoomProject) => {
    const isMenuOpen = openMenuId === project.id;
    const isRenaming = renamingId === project.id;
    const furnitureINR = computeFurnitureINR(project);
    const totalEstINR = estimateProjectTotalINR(project);

    return (
      <motion.div
        key={project.id}
        layout
        whileHover={{ y: -4 }}
        transition={{ duration: 0.22 }}
        className={`group relative rounded-2xl border ${t.card} ${t.cardHover} overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-all`}
      >
        <div
          onClick={() => onOpenProject(project)}
          className={`cursor-pointer relative aspect-[16/10] overflow-hidden border-b ${t.divider}`}
        >
          <RoomPreviewGraphic
            project={project}
            theme={isDark ? 'dark' : 'light'}
            className="w-full h-full"
          />
          <div className="absolute top-3 left-3">
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium tracking-wider uppercase ${
                isDark
                  ? 'bg-[#151715]/85 text-[#DFDAD0] border border-[#353834]'
                  : 'bg-[#FCFBF7]/90 text-[#343734] border border-[#E2DBD0]'
              }`}
            >
              {project.roomType}
            </span>
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-end justify-end p-3 opacity-0 group-hover:opacity-100">
            <span className="px-3 py-1.5 rounded-lg bg-[#1F2120]/90 text-[#F7F4EE] text-xs font-medium shadow-sm">
              Open 3D Studio
            </span>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            {isRenaming ? (
              <div className="flex items-center gap-1.5 mb-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRenameProject(project.id, renameValue);
                      setRenamingId(null);
                    }
                  }}
                  autoFocus
                  className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none ${t.input}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    onRenameProject(project.id, renameValue);
                    setRenamingId(null);
                  }}
                  className={`p-1.5 rounded ${t.sageBtn}`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <h3 className={`font-display text-lg font-medium ${t.headingText} truncate`}>
                {project.name}
              </h3>
            )}

            <div className={`flex flex-wrap items-center gap-1.5 text-xs ${t.subtleText} mt-1`}>
              <span className="font-mono-tabular">{formatDimensions(project)}</span>
              <span aria-hidden="true">·</span>
              <span>Edited {formatRelativeDate(project.updatedAt)}</span>
            </div>

            <div className={`flex items-center justify-between text-[11px] mt-2 pt-2 border-t ${t.divider}`}>
              <span className={t.subtleText}>
                Est. Total ({project.furniture.length} pcs)
              </span>
              <span
                className={`font-mono-tabular font-semibold ${t.headingText}`}
                title={`Catalog furniture: ${formatINR(furnitureINR)}`}
              >
                {formatINR(totalEstINR)}
              </span>
            </div>
          </div>

          <div className={`pt-3 border-t ${t.divider} flex items-center justify-between gap-2`}>
            <button
              type="button"
              onClick={() => onOpenProject(project)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 ${t.primaryBtn} text-xs font-medium rounded-lg transition-colors whitespace-nowrap`}
            >
              <span>Continue Editing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="relative">
              <button
                type="button"
                aria-label="More project options"
                onClick={() => setOpenMenuId(isMenuOpen ? null : project.id)}
                className={`p-1.5 rounded-lg border ${t.ghostBtn} transition-colors`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div
                  className={`absolute right-0 bottom-10 z-30 w-44 rounded-lg border ${t.menu} shadow-xl py-1 text-xs`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(project.id);
                      setRenameValue(project.name);
                      setOpenMenuId(null);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                      isDark ? 'hover:bg-[#2B2F2B] text-[#F2EEE5]' : 'hover:bg-[#EFECE4] text-[#1F2120]'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Rename</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateProject(project.id);
                      setOpenMenuId(null);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                      isDark ? 'hover:bg-[#2B2F2B] text-[#F2EEE5]' : 'hover:bg-[#EFECE4] text-[#1F2120]'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleSaveArchive(project.id);
                      setOpenMenuId(null);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                      isDark ? 'hover:bg-[#2B2F2B] text-[#F2EEE5]' : 'hover:bg-[#EFECE4] text-[#1F2120]'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{project.savedToArchive ? 'Remove from Saved' : 'Save Design'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('compare');
                      setOpenMenuId(null);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                      isDark ? 'hover:bg-[#2B2F2B] text-[#F2EEE5]' : 'hover:bg-[#F4F0E8] text-[#30332F]'
                    }`}
                  >
                    <SplitSquareHorizontal className="w-3.5 h-3.5" />
                    <span>Compare Design</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmProject(project);
                      setOpenMenuId(null);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                      isDark
                        ? 'hover:bg-[#3A2220] text-[#EA8A80]'
                        : 'hover:bg-[#F5E8E6] text-[#8B3228]'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const selectedStyleModal = inspirationModalId
    ? DESIGN_STYLES.find((s) => s.id === inspirationModalId) ?? null
    : null;

  const aiTargetProject =
    projects.find((p) => p.id === aiTargetProjectId) ?? projects[0] ?? null;

  return (
    <div className={`min-h-screen ${t.canvas} flex transition-colors duration-300`}>
      {/* Collapsible Sidebar (Desktop/Tablet) */}
      <motion.aside
        initial={{ x: -16, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: sidebarCollapsed ? 76 : 260 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className={`hidden md:flex sticky top-0 h-screen shrink-0 border-r ${t.sidebar} flex-col justify-between z-30 transition-colors duration-300`}
      >
        <div>
          {/* Brand & Collapse Toggle */}
          <div className={`h-16 px-4 border-b ${t.divider} flex items-center justify-between`}>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="flex items-center group text-left whitespace-nowrap transition-opacity hover:opacity-85"
              >
                <LivoraWordmark theme={isDark ? 'dark' : 'light'} size="md" showSublabel />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`p-2 rounded-lg ${t.navInactive} transition-colors ml-auto`}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? t.navActiveText : t.navInactive
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-bg"
                      className={`absolute inset-0 rounded-lg ${t.navActiveBg}`}
                      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="relative z-10 whitespace-nowrap truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile, Account & Help */}
        <div className={`p-3 border-t ${t.divider} space-y-1`}>
          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg ${t.navInactive} transition-colors text-left`}
          >
            <div className="w-8 h-8 rounded-full bg-[#5D6B53] text-[#F7F4EE] flex items-center justify-center text-xs font-semibold shrink-0 ring-2 ring-[#C5A059]/35">
              {settings.displayName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className={`text-xs font-medium ${t.headingText} truncate`}>
                  {settings.displayName}
                </p>
                <p className={`text-[11px] ${t.subtleText} truncate`}>{settings.roleTitle}</p>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${t.navInactive} transition-colors`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="whitespace-nowrap">Account settings</span>}
          </button>

          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${t.navInactive} transition-colors`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="whitespace-nowrap">Help and support</span>}
          </button>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                isDark
                  ? 'text-[#D89A92] hover:bg-[#332220]'
                  : 'text-[#8B3228] hover:bg-[#F5E8E6]'
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Content Canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Header */}
        <header
          className={`h-16 px-4 sm:px-6 lg:px-10 border-b ${t.header} flex items-center justify-between gap-4 transition-colors duration-300`}
        >
          <div className={`flex items-center gap-3 text-xs ${t.subtleText}`}>
            <button
              type="button"
              aria-label="Open workspace navigation"
              onClick={() => setMobileNavOpen((v) => !v)}
              className={`md:hidden p-2 rounded-lg border ${t.ghostBtn}`}
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onBackToLanding}
              className={`inline-flex items-center gap-1.5 transition-colors ${
                isDark ? 'hover:text-[#F4F0E8]' : 'hover:text-[#30332F]'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="font-brand text-xs">LIVORA</span>
            </button>
            <span aria-hidden="true">/</span>
            <span className={`${t.headingText} font-medium capitalize`}>
              {navItems.find((n) => n.id === activeTab)?.label ?? 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dashboard Light / Dark Theme Toggle */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={toggleDashboardTheme}
              aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border ${t.ghostBtn} transition-colors whitespace-nowrap`}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#D4AF6A]" />
                  <span className="hidden sm:inline">Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#5D6B53]" />
                  <span className="hidden sm:inline">Dark Theme</span>
                </>
              )}
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartCreateRoom}
              className={`inline-flex items-center gap-2 px-4 py-2 ${t.primaryBtn} text-xs font-medium rounded-lg transition-colors whitespace-nowrap`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Room</span>
            </motion.button>
          </div>
        </header>

        {/* Mobile Drawer Navigation */}
        {mobileNavOpen && (
          <div className={`md:hidden border-b ${t.divider} ${t.sidebar} px-4 py-3 space-y-1`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive ? `${t.navActiveBg} ${t.navActiveText}` : t.navInactive
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#8B3228] hover:bg-[#F5E8E6]"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}

        {/* Tab Viewports */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 max-w-[1380px] w-full mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-10"
              >
                {/* Architectural Welcome Hero Card */}
                <section
                  className={`relative overflow-hidden rounded-2xl border ${t.heroBanner} p-7 sm:p-9 flex flex-col lg:flex-row lg:items-center justify-between gap-8`}
                >
                  {/* Decorative architectural drafting vector graphic */}
                  <svg
                    viewBox="0 0 360 180"
                    className="pointer-events-none absolute right-0 top-0 h-full w-80 opacity-20"
                    aria-hidden="true"
                  >
                    <g
                      fill="none"
                      stroke={isDark ? '#D4AF6A' : '#5D6B53'}
                      strokeWidth="0.9"
                    >
                      <polygon points="180,18 330,78 180,138 30,78" />
                      <polygon points="180,38 290,82 180,126 70,82" strokeDasharray="3 3" />
                      <line x1="180" y1="18" x2="180" y2="168" />
                      <line x1="30" y1="78" x2="330" y2="78" />
                      <circle cx="180" cy="78" r="28" strokeDasharray="2 2" />
                    </g>
                  </svg>

                  <div className="relative z-10 space-y-3 max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${t.goldText}`}>
                        Livora Design Atelier
                      </span>
                      <span className={`h-px w-8 ${isDark ? 'bg-[#3C3F38]' : 'bg-[#D5CEBE]'}`} />
                      <span className={`text-[11px] font-editorial italic text-sm ${t.accentText}`}>
                        {settings.studioName}
                      </span>
                    </div>

                    <h1
                      className={`font-display text-3xl sm:text-4xl xl:text-[2.65rem] leading-[1.12] tracking-tight ${t.headingText} text-balance`}
                    >
                      Welcome back, {settings.displayName.split(' ')[0]}. Ready to transform your{' '}
                      <em className={`italic font-normal ${t.accentText}`}>space</em>?
                    </h1>
                    <p className={`font-editorial text-lg sm:text-xl italic ${t.bodyText}`}>
                      Your next beautiful space starts with an architectural idea.
                    </p>
                  </div>

                  <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onStartCreateRoom}
                      className={`inline-flex items-center gap-2 px-5 py-3 ${t.sageBtn} text-sm font-medium rounded-xl shadow-sm transition-colors whitespace-nowrap`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Room</span>
                    </motion.button>
                  </div>
                </section>

                {/* A. Statistics Overview */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Total Projects',
                      value: projects.length,
                      detail: 'Active studio files',
                      icon: FolderKanban,
                    },
                    {
                      label: 'Rooms Designed',
                      value: projects.filter((p) => p.furniture.length > 0).length,
                      detail: `${totalFurniturePieces} 3D pieces placed`,
                      icon: Layers,
                    },
                    {
                      label: 'Saved Designs',
                      value: savedProjects.length,
                      detail: 'Archived milestones',
                      icon: Bookmark,
                    },
                    {
                      label: 'Recently Edited',
                      value: projects.filter(
                        (p) => Date.now() - new Date(p.updatedAt).getTime() < 7 * 86400000,
                      ).length,
                      detail: 'Updated this week',
                      icon: Clock,
                    },
                  ].map((stat) => {
                    const StatIcon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className={`p-5 rounded-2xl border ${t.card} flex flex-col justify-between gap-3 transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <p className={`text-[11px] font-medium uppercase tracking-[0.12em] ${t.subtleText}`}>
                            {stat.label}
                          </p>
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isDark ? 'bg-[#252824] text-[#D4AF6A]' : 'bg-[#EFEBE1] text-[#5D6B53]'
                            }`}
                          >
                            <StatIcon className="w-4 h-4" />
                          </span>
                        </div>
                        <div>
                          <p className={`font-display text-3xl font-medium ${t.headingText}`}>
                            <AnimatedCounter value={stat.value} />
                          </p>
                          <p className={`text-[11px] mt-1 ${t.accentText}`}>{stat.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </section>

                {/* B. Recent Projects */}
                <section className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.goldText}`}>
                        Spatial Portfolio
                      </p>
                      <h2 className={`font-display text-2xl sm:text-3xl ${t.headingText}`}>
                        Recent <em className="italic font-normal">Projects</em>
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('projects')}
                      className={`text-xs font-medium ${t.accentText} hover:underline transition-colors`}
                    >
                      View all projects
                    </button>
                  </div>

                  {recentProjects.length === 0 ? (
                    <div
                      className={`p-10 rounded-2xl border border-dashed ${t.divider} text-center space-y-3`}
                    >
                      <p className="font-display text-lg">No room projects yet</p>
                      <p className={`text-xs ${t.subtleText}`}>
                        Create your first 3D room to begin designing.
                      </p>
                      <button
                        type="button"
                        onClick={onStartCreateRoom}
                        className={`px-4 py-2 ${t.primaryBtn} text-xs font-medium rounded-lg`}
                      >
                        + Create New Room
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recentProjects.slice(0, 6).map(renderProjectCard)}
                    </div>
                  )}
                </section>

                {/* C. Quick Start */}
                <section className="space-y-4">
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.goldText}`}>
                      Rapid Spatial Launch
                    </p>
                    <h2 className={`font-display text-2xl sm:text-3xl ${t.headingText}`}>
                      Quick <em className="italic font-normal">Start</em>
                    </h2>
                    <p className={`text-xs ${t.subtleText} mt-0.5`}>
                      Launch a pre-proportioned 3D architectural environment in one click.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {QUICK_START_CARDS.map((card) => (
                      <motion.button
                        key={card.id}
                        type="button"
                        whileHover={{ y: -4 }}
                        onClick={() => onQuickStart(card.id)}
                        className={`group p-4 rounded-2xl border ${t.card} ${t.cardHover} text-left transition-all flex flex-col justify-between shadow-xs hover:shadow-md`}
                      >
                        <div className={`rounded-xl ${t.surface} border p-2 mb-3 overflow-hidden relative`}>
                          <span
                            className={`absolute top-2 left-2 text-[9px] font-semibold tracking-[0.16em] ${t.subtleText}`}
                          >
                            {card.tag}
                          </span>
                          <IsometricThumbnail
                            kind={card.id}
                            accent={card.accent}
                            floor={card.floor}
                            isDark={isDark}
                          />
                        </div>
                        <div>
                          <p
                            className={`font-display text-base font-medium ${t.headingText} ${
                              isDark ? 'group-hover:text-[#96A287]' : 'group-hover:text-[#78816C]'
                            } transition-colors`}
                          >
                            {card.title}
                          </p>
                          <p className={`text-[11px] ${t.subtleText} font-mono-tabular mt-0.5`}>
                            {card.subtitle}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </section>

                {/* D. Design Inspiration */}
                <section className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${t.goldText}`}>
                        Material Directions
                      </p>
                      <h2 className={`font-display text-2xl sm:text-3xl ${t.headingText}`}>
                        Design <em className="italic font-normal">Inspiration</em>
                      </h2>
                      <p className={`text-xs ${t.subtleText} mt-0.5`}>
                        Click any architectural direction to inspect its palette or start a project.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inspiration')}
                      className={`text-xs font-medium ${t.accentText} hover:underline`}
                    >
                      Open gallery
                    </button>
                  </div>

                  <div className="flex gap-5 overflow-x-auto pb-4 snap-x">
                    {DESIGN_STYLES.map((style) => (
                      <motion.div
                        key={style.id}
                        whileHover={{ y: -4 }}
                        onClick={() => setInspirationModalId(style.id)}
                        className={`group cursor-pointer min-w-[290px] sm:min-w-[330px] snap-start rounded-2xl overflow-hidden border ${t.card} ${t.cardHover} shrink-0 shadow-xs hover:shadow-md transition-all`}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-[#E5E0D5]">
                          <img
                            src={style.image}
                            alt={style.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-4 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h3 className={`font-display text-lg font-medium ${t.headingText}`}>
                              {style.name}
                            </h3>
                            <div className="flex items-center gap-1">
                              {style.palette.slice(0, 4).map((hex) => (
                                <span
                                  key={hex}
                                  className="w-3 h-3 rounded-full border border-black/15"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>
                          <p className={`text-xs ${t.subtleText} truncate`}>{style.tagline}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* E. Recent Activity Timeline */}
                <section className="space-y-4 pb-6">
                  <div className="flex items-center gap-2">
                    <Compass className={`w-4 h-4 ${t.goldText}`} />
                    <h2 className={`font-display text-2xl ${t.headingText}`}>Recent Activity</h2>
                  </div>
                  <div className={`rounded-2xl border ${t.card} divide-y ${t.divideY}`}>
                    {activities.slice(0, 6).map((act) => (
                      <div
                        key={act.id}
                        className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5D6B53] shrink-0" />
                          <span className={`font-medium ${t.headingText} truncate`}>
                            {act.action}
                          </span>
                          <span aria-hidden="true" className={t.subtleText}>
                            ·
                          </span>
                          <span className={`${t.bodyText} truncate`}>{act.projectName}</span>
                        </div>
                        <span className={`${t.subtleText} font-mono-tabular whitespace-nowrap shrink-0`}>
                          {act.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className={`font-display text-3xl ${t.headingText}`}>My Projects</h1>
                    <p className={`text-xs ${t.subtleText} mt-1`}>
                      {projects.length} total room files stored locally in your Livora workspace
                    </p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className={`w-4 h-4 ${t.subtleText} absolute left-3 top-1/2 -translate-y-1/2`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by name, room type, or style..."
                      className={`w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:outline-none ${t.input}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map(renderProjectCard)}
                </div>
              </motion.div>
            )}

            {activeTab === 'compare' && (
              <motion.div
                key="compare"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div>
                  <h1 className={`font-display text-3xl ${t.headingText}`}>Before & After Comparison</h1>
                  <p className={`text-sm ${t.bodyText} mt-1`}>
                    Compare any saved room against its unfurnished shell or another saved design with synchronized 3D framing.
                  </p>
                </div>
                <RoomComparisonPanel
                  projects={projects}
                  theme={isDark ? 'dark' : 'light'}
                  onOpenProject={onOpenProject}
                />
              </motion.div>
            )}

            {activeTab === 'budget' && (
              <motion.div
                key="budget"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div>
                  <h1 className={`font-display text-3xl ${t.headingText}`}>Smart Budget Planner</h1>
                  <p className={`text-sm ${t.bodyText} mt-1`}>
                    Plan room budgets across Furniture, Lighting, Wall Decoration, Flooring, Accessories, and Materials.
                  </p>
                </div>
                <BudgetPlanner
                  projects={projects}
                  theme={isDark ? 'dark' : 'light'}
                  defaultUnit={settings.defaultUnit}
                  onOpenProject={onOpenProject}
                  onStartCreateRoom={onStartCreateRoom}
                />
              </motion.div>
            )}

            {activeTab === 'ai-studio' && (
              <motion.div
                key="ai-studio"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div>
                  <h1 className={`font-display text-3xl ${t.headingText}`}>AI Design Studio</h1>
                  <p className={`text-sm ${t.bodyText} mt-1`}>
                    Select any project below to generate a spatial concept and open it directly in 3D.
                  </p>
                </div>

                {aiTargetProject ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className={`lg:col-span-5 p-6 rounded-2xl border ${t.card} space-y-5`}>
                      <div>
                        <label className={`block text-xs font-medium ${t.bodyText} mb-1.5`}>
                          Target Project
                        </label>
                        <select
                          value={aiTargetProject.id}
                          onChange={(e) => setAiTargetProjectId(e.target.value)}
                          className={`w-full px-3 py-2 text-xs border rounded-lg ${t.input}`}
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.roomType})
                            </option>
                          ))}
                        </select>
                      </div>

                      <AIDesignStudioPanel
                        roomType={aiTargetProject.roomType}
                        dimensions={aiTargetProject.dimensions}
                        currentStyleId={aiTargetProject.styleId}
                        theme={isDark ? 'dark' : 'light'}
                        onApplyDesign={({ styleId, shellPatch, furniture, dimensionsPatch }) => {
                          const updated: RoomProject = {
                            ...aiTargetProject,
                            styleId,
                            dimensions: dimensionsPatch
                              ? { ...aiTargetProject.dimensions, ...dimensionsPatch }
                              : aiTargetProject.dimensions,
                            shell: { ...aiTargetProject.shell, ...shellPatch },
                            furniture,
                            updatedAt: new Date().toISOString(),
                          };
                          onUpdateProject(updated);
                          onOpenProject(updated);
                        }}
                      />
                    </div>

                    <div className={`lg:col-span-7 p-6 rounded-2xl border ${t.card} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-display text-xl ${t.headingText}`}>
                            {aiTargetProject.name}
                          </h3>
                          <p className={`text-xs ${t.subtleText} font-mono-tabular`}>
                            {aiTargetProject.roomType} · {formatDimensions(aiTargetProject)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenProject(aiTargetProject)}
                          className={`px-3.5 py-2 ${t.primaryBtn} text-xs font-medium rounded-lg`}
                        >
                          Open 3D Viewport
                        </button>
                      </div>
                      <RoomPreviewGraphic
                        project={aiTargetProject}
                        theme={isDark ? 'dark' : 'light'}
                        className={`w-full aspect-[16/10] rounded-xl border ${t.divider}`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={`p-10 rounded-2xl border ${t.card} text-center`}>
                    <p className={`text-sm ${t.bodyText} mb-4`}>
                      Create a room project first to apply AI spatial concepts.
                    </p>
                    <button
                      type="button"
                      onClick={onStartCreateRoom}
                      className={`px-4 py-2 ${t.primaryBtn} text-xs font-medium rounded-lg`}
                    >
                      + Create New Room
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'inspiration' && (
              <motion.div
                key="inspiration"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div>
                  <h1 className={`font-display text-3xl ${t.headingText}`}>Inspiration Gallery</h1>
                  <p className={`text-sm ${t.bodyText} mt-1`}>
                    Curated architectural interior styles ready to launch as an editable 3D scene.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {DESIGN_STYLES.map((style) => (
                    <div
                      key={style.id}
                      onClick={() => setInspirationModalId(style.id)}
                      className={`group cursor-pointer rounded-2xl overflow-hidden border ${t.card} ${t.cardHover} flex flex-col transition-all`}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-[#E5E0D5]">
                        <img
                          src={style.image}
                          alt={style.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5 space-y-2">
                        <h3 className={`font-display text-xl ${t.headingText}`}>{style.name}</h3>
                        <p className={`text-xs ${t.subtleText}`}>{style.tagline}</p>
                        <p className={`text-xs ${t.bodyText} leading-relaxed`}>{style.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div>
                  <h1 className={`font-display text-3xl ${t.headingText}`}>
                    Architectural Templates
                  </h1>
                  <p className={`text-sm ${t.bodyText} mt-1`}>
                    Pre-furnished floor plans calibrated with balanced traffic paths and lighting.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ROOM_TEMPLATES.map((tpl) => {
                    const styleObj = DESIGN_STYLES.find((s) => s.id === tpl.styleId);
                    return (
                      <div
                        key={tpl.id}
                        className={`rounded-2xl overflow-hidden border ${t.card} flex flex-col justify-between`}
                      >
                        {styleObj && (
                          <div className="aspect-[16/9] overflow-hidden bg-[#E5E0D5]">
                            <img
                              src={styleObj.image}
                              alt={tpl.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <div className={`flex items-center justify-between text-xs ${t.accentText} mb-1`}>
                              <span>{tpl.roomType}</span>
                              <span className="font-mono-tabular">
                                {tpl.dimensions.length} × {tpl.dimensions.width} m
                              </span>
                            </div>
                            <h3 className={`font-display text-xl ${t.headingText} mb-1.5`}>
                              {tpl.name}
                            </h3>
                            <p className={`text-xs ${t.bodyText} leading-relaxed`}>
                              {tpl.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => onUseTemplate(tpl.id)}
                            className={`w-full py-2.5 ${t.primaryBtn} text-xs font-medium rounded-lg transition-colors`}
                          >
                            Use Template in 3D Studio
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'saved' && (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div>
                  <h1 className={`font-display text-3xl ${t.headingText}`}>Saved Designs</h1>
                  <p className={`text-sm ${t.bodyText} mt-1`}>
                    Bookmarked architectural milestones ready for client review or iteration.
                  </p>
                </div>

                {savedProjects.length === 0 ? (
                  <div className={`p-12 rounded-2xl border border-dashed ${t.divider} text-center space-y-2`}>
                    <p className={`font-display text-lg ${t.headingText}`}>No saved designs yet</p>
                    <p className={`text-xs ${t.subtleText}`}>
                      Click "Save Design" in the 3D Editor or project menu to bookmark a milestone.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedProjects.map(renderProjectCard)}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="max-w-2xl space-y-6"
              >
                <div>
                  <h1 className={`font-display text-3xl ${t.headingText}`}>Studio Settings</h1>
                  <p className={`text-sm ${t.bodyText} mt-1`}>
                    Configure workspace appearance, default units, snapping behavior, and profile details.
                  </p>
                </div>

                <div className={`p-6 rounded-2xl border ${t.card} space-y-5`}>
                  {/* Dashboard Appearance Theme */}
                  <div>
                    <label className={`block text-xs font-medium ${t.bodyText} mb-2`}>
                      Dashboard Theme
                    </label>
                    <div className={`inline-flex p-1 rounded-lg border ${t.surface}`}>
                      {(
                        [
                          { id: 'light', label: 'Warm Ivory (Light)', icon: Sun },
                          { id: 'dark', label: 'Charcoal Studio (Dark)', icon: Moon },
                        ] as const
                      ).map((opt) => {
                        const ThemeIcon = opt.icon;
                        const active = (settings.dashboardTheme ?? 'light') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              onUpdateSettings({ ...settings, dashboardTheme: opt.id })
                            }
                            className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              active ? `${t.navActiveBg} ${t.navActiveText}` : t.subtleText
                            }`}
                          >
                            <ThemeIcon className="w-3.5 h-3.5" />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-medium ${t.bodyText} mb-1.5`}>
                        Designer Name
                      </label>
                      <input
                        type="text"
                        value={settings.displayName}
                        onChange={(e) =>
                          onUpdateSettings({ ...settings, displayName: e.target.value })
                        }
                        className={`w-full px-3 py-2 text-xs border rounded-lg ${t.input}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${t.bodyText} mb-1.5`}>
                        Role Title
                      </label>
                      <input
                        type="text"
                        value={settings.roleTitle}
                        onChange={(e) =>
                          onUpdateSettings({ ...settings, roleTitle: e.target.value })
                        }
                        className={`w-full px-3 py-2 text-xs border rounded-lg ${t.input}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${t.bodyText} mb-2`}>
                      Default Measurement Unit
                    </label>
                    <div className={`inline-flex p-1 rounded-lg border ${t.surface}`}>
                      {(['m', 'ft'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => onUpdateSettings({ ...settings, defaultUnit: u })}
                          className={`px-4 py-1.5 text-xs font-medium rounded-md ${
                            settings.defaultUnit === u
                              ? `${t.navActiveBg} ${t.navActiveText}`
                              : t.subtleText
                          }`}
                        >
                          {u === 'm' ? 'Meters (m)' : 'Feet (ft)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`space-y-3 pt-3 border-t ${t.divider}`}>
                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span>Snap furniture to 0.25m architectural grid</span>
                      <input
                        type="checkbox"
                        checked={settings.gridSnap}
                        onChange={(e) =>
                          onUpdateSettings({ ...settings, gridSnap: e.target.checked })
                        }
                        className="accent-[#5D6B53] w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span>Display floor perimeter dimension guides in 3D</span>
                      <input
                        type="checkbox"
                        checked={settings.showDimensionsOverlay}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            showDimensionsOverlay: e.target.checked,
                          })
                        }
                        className="accent-[#5D6B53] w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span>Reduced Motion (calm transitions, disable idle camera sway)</span>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.reducedMotion)}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            reducedMotion: e.target.checked,
                          })
                        }
                        className="accent-[#5D6B53] w-4 h-4"
                      />
                    </label>
                    <div className="pt-2">
                      <label className={`block text-xs font-medium ${t.bodyText} mb-2`}>
                        3D Viewport Quality & Post-Processing
                      </label>
                      <div className={`inline-flex p-1 rounded-lg border ${t.surface}`}>
                        {(['low', 'medium', 'high', 'ultra'] as const).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => onUpdateSettings({ ...settings, qualityLevel: q })}
                            className={`px-3.5 py-1.5 text-xs font-medium rounded-md capitalize ${
                              settings.qualityLevel === q
                                ? `${t.navActiveBg} ${t.navActiveText}`
                                : t.subtleText
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Inspiration Preview Modal */}
      <AnimatePresence>
        {selectedStyleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setInspirationModalId(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-2xl w-full rounded-2xl overflow-hidden border ${t.modal}`}
            >
              <div className="aspect-[16/10] relative bg-[#E5E0D5]">
                <img
                  src={selectedStyleModal.image}
                  alt={selectedStyleModal.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setInspirationModalId(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-[#1F2120]/80 text-[#F7F4EE]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-display text-2xl ${t.headingText}`}>
                      {selectedStyleModal.name}
                    </h3>
                    <p className={`text-xs ${t.subtleText}`}>{selectedStyleModal.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedStyleModal.palette.map((hex) => (
                      <span
                        key={hex}
                        className="w-5 h-5 rounded-full border border-black/15"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
                <p className={`text-sm ${t.bodyText} leading-relaxed`}>
                  {selectedStyleModal.description}
                </p>
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setInspirationModalId(null)}
                    className={`px-4 py-2 text-xs font-medium border rounded-lg ${t.ghostBtn}`}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedStyleModal.id;
                      setInspirationModalId(null);
                      onQuickStart('style', id);
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2 ${t.primaryBtn} text-xs font-medium rounded-lg`}
                  >
                    <span>Start New Project Using This Style</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Profile Modal */}
      <AnimatePresence>
        {showAccountModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
            onClick={() => setShowAccountModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-md w-full rounded-2xl border ${t.modal} p-6 space-y-4`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`font-display text-xl ${t.headingText}`}>Designer Profile</h3>
                <button type="button" onClick={() => setShowAccountModal(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <p className={`font-medium ${t.headingText}`}>{settings.displayName}</p>
                {userEmail && (
                  <p className={`text-xs ${t.subtleText} font-mono-tabular`}>{userEmail}</p>
                )}
                <p className={`text-xs ${t.subtleText}`}>{settings.studioName}</p>
                <p className={`text-xs ${t.accentText}`}>{settings.roleTitle}</p>
              </div>
              <div className={`pt-3 border-t ${t.divider} flex justify-end gap-2`}>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountModal(false);
                      onSignOut();
                    }}
                    className="px-4 py-2 border border-[#DFB8B3] text-[#8B3228] hover:bg-[#F5E8E6] text-xs font-medium rounded-lg"
                  >
                    Sign Out
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false);
                    setActiveTab('settings');
                  }}
                  className={`px-4 py-2 ${t.primaryBtn} text-xs font-medium rounded-lg`}
                >
                  Edit Studio Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help & Support Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-md w-full rounded-2xl border ${t.modal} p-6 space-y-4`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`font-display text-xl ${t.headingText}`}>
                  Livora Studio Controls & Shortcuts
                </h3>
                <button type="button" onClick={() => setShowHelpModal(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className={`space-y-2.5 text-xs ${t.bodyText}`}>
                <p>
                  <strong className={t.headingText}>Orbit & Zoom:</strong> Drag empty canvas to orbit, scroll to zoom, right-drag to pan.
                </p>
                <p>
                  <strong className={t.headingText}>Move Furniture:</strong> Click any piece to select, then drag smoothly across the floor.
                </p>
                <p>
                  <strong className={t.headingText}>Lighting Presets:</strong> Switch between Natural Daylight, Soft Morning, Golden Hour, Warm Evening, and Night Ambient directly inside the 3D Studio.
                </p>
                <p>
                  <strong className={t.headingText}>Walkthrough Mode:</strong> Use W/A/S/D or Arrow keys to walk inside the room and drag to look around.
                </p>
                <p>
                  <strong className={t.headingText}>Before & After:</strong> Toggle Comparison mode in the editor toolbar to compare against the empty shell.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Project Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmProject(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`max-w-md w-full rounded-2xl border ${t.modal} p-6 space-y-4`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`font-display text-xl ${t.headingText}`}>Delete Project?</h3>
                <button type="button" onClick={() => setDeleteConfirmProject(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-sm ${t.bodyText} leading-relaxed`}>
                Are you sure you want to delete{' '}
                <strong className={t.headingText}>{deleteConfirmProject.name}</strong>? This action removes the room layout from your saved workspace.
              </p>
              <div className={`pt-3 border-t ${t.divider} flex justify-end gap-2.5`}>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmProject(null)}
                  className={`px-4 py-2 text-xs font-medium border rounded-lg ${t.ghostBtn}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteProject(deleteConfirmProject.id);
                    setDeleteConfirmProject(null);
                  }}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#A93D31] hover:bg-[#8E3127] text-[#FFFFFF] transition-colors"
                >
                  Delete Project
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
