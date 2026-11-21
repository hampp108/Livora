import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppRoute, DashboardTab, DesignStyleId, RoomProject, RoomType } from './types/room';
import { useRoomShiftStore } from './store/useRoomShiftStore';
import { ROOM_TEMPLATES } from './data/stylesAndTemplates';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { CreateRoomWizard } from './components/CreateRoomWizard';
import { RoomEditor } from './components/RoomEditor';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';

function formatStyleTitle(id: DesignStyleId): string {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const LivoraWorkspace: React.FC = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const store = useRoomShiftStore(user?.id ?? null, user?.fullName);
  const [route, setRoute] = useState<AppRoute>('landing');
  const [pendingRoute, setPendingRoute] = useState<AppRoute | null>(null);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    store.projects[0]?.id ?? null,
  );
  const [animateRoomConstruction, setAnimateRoomConstruction] = useState(false);

  // Sync activeProjectId if user switches and current project doesn't exist in new bucket
  useEffect(() => {
    if (!store.projects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(store.projects[0]?.id ?? null);
    }
  }, [store.projects, activeProjectId]);

  const activeProject =
    store.projects.find((p) => p.id === activeProjectId) ?? store.projects[0] ?? null;

  const navigateProtected = useCallback(
    (target: AppRoute) => {
      if (!isAuthenticated) {
        setPendingRoute(target);
        setRoute('login');
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        return;
      }
      setRoute(target);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    [isAuthenticated],
  );

  const handleAuthSuccess = useCallback(() => {
    const dest = pendingRoute ?? 'dashboard';
    setPendingRoute(null);
    setRoute(dest);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pendingRoute]);

  const handleSignOut = useCallback(() => {
    signOut();
    setPendingRoute(null);
    setRoute('landing');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [signOut]);

  const openEditor = (project: RoomProject, withConstruction = false) => {
    setActiveProjectId(project.id);
    setAnimateRoomConstruction(withConstruction);
    navigateProtected('editor');
  };

  const handleQuickStart = (
    kind: 'bedroom' | 'living' | 'workspace' | 'gaming' | 'empty' | 'style',
    styleId?: DesignStyleId,
    roomTypeOverride?: RoomType,
  ) => {
    if (!isAuthenticated) {
      setPendingRoute('create-room');
      setRoute('login');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }

    if (kind === 'style' && styleId && roomTypeOverride) {
      const styleName = formatStyleTitle(styleId);
      const created = store.createProject({
        name: `${styleName} ${roomTypeOverride}`,
        roomType: roomTypeOverride,
        styleId,
        length:
          roomTypeOverride === 'Living Room'
            ? 5.8
            : roomTypeOverride === 'Bedroom'
            ? 5.4
            : roomTypeOverride === 'Kitchen'
            ? 5.2
            : 4.4,
        width:
          roomTypeOverride === 'Living Room'
            ? 4.6
            : roomTypeOverride === 'Bedroom'
            ? 4.5
            : roomTypeOverride === 'Kitchen'
            ? 4.4
            : 3.6,
        height: 2.95,
        unit: store.settings.defaultUnit,
        startingPoint: 'theme',
      });
      openEditor(created, true);
      return;
    }
    const created = store.createQuickStartProject(kind, styleId);
    openEditor(created, true);
  };

  const handleUseTemplate = (templateId: string) => {
    const tpl = ROOM_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const created = store.createProject({
      name: tpl.name,
      roomType: tpl.roomType,
      styleId: tpl.styleId,
      length: tpl.dimensions.length,
      width: tpl.dimensions.width,
      height: tpl.dimensions.height,
      unit: store.settings.defaultUnit,
      startingPoint: 'template',
      templateId: tpl.id,
    });
    openEditor(created, true);
  };

  return (
    <AnimatePresence mode="wait">
      {route === 'landing' && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LandingPage
            projects={store.projects}
            currentUser={user}
            onOpenAuth={(target) => {
              setRoute(target);
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            }}
            onSignOut={handleSignOut}
            onOpenDashboard={(tab = 'overview') => {
              setDashboardTab(tab);
              navigateProtected('dashboard');
            }}
            onStartDesigning={() => navigateProtected('create-room')}
            onExploreStyle={(styleId, roomType) => handleQuickStart('style', styleId, roomType)}
            onOpenProject={(proj) => openEditor(proj, false)}
          />
        </motion.div>
      )}

      {route === 'login' && (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LoginPage
            onSuccess={handleAuthSuccess}
            onGoRegister={() => setRoute('register')}
            onGoForgotPassword={() => setRoute('forgot-password')}
            onBackToLanding={() => {
              setPendingRoute(null);
              setRoute('landing');
            }}
          />
        </motion.div>
      )}

      {route === 'register' && (
        <motion.div
          key="register"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <RegisterPage
            onSuccess={handleAuthSuccess}
            onGoLogin={() => setRoute('login')}
            onBackToLanding={() => {
              setPendingRoute(null);
              setRoute('landing');
            }}
          />
        </motion.div>
      )}

      {route === 'forgot-password' && (
        <motion.div
          key="forgot-password"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ForgotPasswordPage
            onGoLogin={() => setRoute('login')}
            onBackToLanding={() => {
              setPendingRoute(null);
              setRoute('landing');
            }}
          />
        </motion.div>
      )}

      {route === 'dashboard' && isAuthenticated && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <Dashboard
            projects={store.projects}
            activities={store.activities}
            settings={store.settings}
            userEmail={user?.email}
            initialTab={dashboardTab}
            onUpdateSettings={store.setSettings}
            onBackToLanding={() => {
              setRoute('landing');
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            }}
            onSignOut={handleSignOut}
            onStartCreateRoom={() => navigateProtected('create-room')}
            onOpenProject={(proj) => openEditor(proj, false)}
            onQuickStart={handleQuickStart}
            onUseTemplate={handleUseTemplate}
            onRenameProject={store.renameProject}
            onDuplicateProject={store.duplicateProject}
            onDeleteProject={store.deleteProject}
            onToggleSaveArchive={(id) => store.toggleSaveArchive(id)}
            onUpdateProject={store.upsertProject}
          />
        </motion.div>
      )}

      {route === 'create-room' && isAuthenticated && (
        <motion.div
          key="create-room"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          <CreateRoomWizard
            defaultUnit={store.settings.defaultUnit}
            onCancel={() => navigateProtected('dashboard')}
            onCreateProject={store.createProject}
            onFinishToEditor={(proj) => openEditor(proj, true)}
          />
        </motion.div>
      )}

      {route === 'editor' && isAuthenticated && activeProject && (
        <motion.div
          key={`editor-${activeProject.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <RoomEditor
            project={activeProject}
            settings={store.settings}
            startWithConstruction={animateRoomConstruction}
            onSaveProject={store.upsertProject}
            onLogActivity={store.logActivity}
            onBackToDashboard={() => navigateProtected('dashboard')}
            onChangeQuality={(q) => store.setSettings({ ...store.settings, qualityLevel: q })}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LivoraWorkspace />
    </AuthProvider>
  );
}
