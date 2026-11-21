import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityLogItem,
  DesignStyleId,
  DimensionUnit,
  RoomProject,
  RoomType,
  UserSettings,
} from '../types/room';
import {
  createStarterFurniture,
  DEFAULT_USER_SETTINGS,
  DESIGN_STYLES,
  getDefaultShellForRoom,
  INITIAL_ACTIVITIES,
  INITIAL_PROJECTS,
  ROOM_TEMPLATES,
} from '../data/stylesAndTemplates';

function getStorageKeys(userId?: string | null) {
  if (userId) {
    return {
      scope: userId,
      projects: `livora_u_${userId}_projects_v2`,
      activities: `livora_u_${userId}_activities_v2`,
      settings: `livora_u_${userId}_settings_v2`,
    };
  }
  return {
    scope: 'guest',
    projects: 'livora_projects_v2',
    activities: 'livora_activities_v2',
    settings: 'livora_settings_v2',
  };
}

const LEGACY_STORAGE_KEYS = {
  projects: 'roomshift_projects_v2',
  activities: 'roomshift_activities_v2',
  settings: 'roomshift_settings_v2',
};

function safeRead<T>(key: string, legacyKey: string | null, fallback: T): T {
  try {
    const raw = localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useRoomShiftStore(userId?: string | null, userDisplayName?: string) {
  const keys = getStorageKeys(userId);
  const activeScopeRef = useRef<string>(keys.scope);

  const [projects, setProjects] = useState<RoomProject[]>(() =>
    safeRead(keys.projects, userId ? null : LEGACY_STORAGE_KEYS.projects, INITIAL_PROJECTS),
  );
  const [activities, setActivities] = useState<ActivityLogItem[]>(() =>
    safeRead(keys.activities, userId ? null : LEGACY_STORAGE_KEYS.activities, INITIAL_ACTIVITIES),
  );
  const [settings, setSettings] = useState<UserSettings>(() => {
    const base = {
      ...DEFAULT_USER_SETTINGS,
      ...safeRead<Partial<UserSettings>>(
        keys.settings,
        userId ? null : LEGACY_STORAGE_KEYS.settings,
        {},
      ),
    };
    if (userDisplayName && base.displayName === DEFAULT_USER_SETTINGS.displayName) {
      base.displayName = userDisplayName;
    }
    return base;
  });

  // Switch storage bucket cleanly whenever the signed-in user changes
  useEffect(() => {
    const nextKeys = getStorageKeys(userId);
    if (activeScopeRef.current === nextKeys.scope) {
      if (userDisplayName) {
        setSettings((prev) =>
          prev.displayName === DEFAULT_USER_SETTINGS.displayName
            ? { ...prev, displayName: userDisplayName }
            : prev,
        );
      }
      return;
    }

    activeScopeRef.current = nextKeys.scope;
    setProjects(
      safeRead(nextKeys.projects, userId ? null : LEGACY_STORAGE_KEYS.projects, INITIAL_PROJECTS),
    );
    setActivities(
      safeRead(
        nextKeys.activities,
        userId ? null : LEGACY_STORAGE_KEYS.activities,
        INITIAL_ACTIVITIES,
      ),
    );
    const nextSettings = {
      ...DEFAULT_USER_SETTINGS,
      ...safeRead<Partial<UserSettings>>(
        nextKeys.settings,
        userId ? null : LEGACY_STORAGE_KEYS.settings,
        {},
      ),
    };
    if (userDisplayName && nextSettings.displayName === DEFAULT_USER_SETTINGS.displayName) {
      nextSettings.displayName = userDisplayName;
    }
    setSettings(nextSettings);
  }, [userId, userDisplayName]);

  useEffect(() => {
    if (activeScopeRef.current !== keys.scope) return;
    try {
      localStorage.setItem(keys.projects, JSON.stringify(projects));
    } catch {
      // ignore quota errors
    }
  }, [projects, keys.projects, keys.scope]);

  useEffect(() => {
    if (activeScopeRef.current !== keys.scope) return;
    try {
      localStorage.setItem(keys.activities, JSON.stringify(activities));
    } catch {
      // ignore quota errors
    }
  }, [activities, keys.activities, keys.scope]);

  useEffect(() => {
    if (activeScopeRef.current !== keys.scope) return;
    try {
      localStorage.setItem(keys.settings, JSON.stringify(settings));
    } catch {
      // ignore quota errors
    }
  }, [settings, keys.settings, keys.scope]);

  const logActivity = useCallback(
    (action: string, projectName: string, category: ActivityLogItem['category'] = 'edit') => {
      const entry: ActivityLogItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action,
        projectName,
        timestamp: 'Just now',
        category,
      };
      setActivities((prev) => [entry, ...prev].slice(0, 18));
    },
    [],
  );

  const upsertProject = useCallback((updated: RoomProject) => {
    const stamped: RoomProject = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === stamped.id);
      if (exists) {
        return prev.map((p) => (p.id === stamped.id ? stamped : p));
      }
      return [stamped, ...prev];
    });
    return stamped;
  }, []);

  const createProject = useCallback(
    (input: {
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
    }): RoomProject => {
      const tpl = input.templateId
        ? ROOM_TEMPLATES.find((t) => t.id === input.templateId)
        : undefined;
      const effectiveStyle = tpl?.styleId ?? input.styleId;
      const effectiveRoom = tpl?.roomType ?? input.roomType;
      const shell = {
        ...getDefaultShellForRoom(effectiveRoom, effectiveStyle),
        ...input.shellOverrides,
      };

      const furniture =
        input.startingPoint === 'empty'
          ? []
          : createStarterFurniture(
              tpl?.roomType ?? input.roomType,
              effectiveStyle,
              input.length,
              input.width,
            );

      const now = new Date().toISOString();
      const newProject: RoomProject = {
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim() || `${input.roomType} Concept`,
        roomType: input.roomType,
        styleId: effectiveStyle,
        dimensions: {
          length: input.length,
          width: input.width,
          height: input.height,
          unit: input.unit,
        },
        shell,
        furniture,
        createdAt: now,
        updatedAt: now,
        savedToArchive: false,
      };

      setProjects((prev) => [newProject, ...prev]);
      logActivity(`Created a new ${input.roomType.toLowerCase()}`, newProject.name, 'create');
      return newProject;
    },
    [logActivity],
  );

  const createQuickStartProject = useCallback(
    (kind: 'bedroom' | 'living' | 'workspace' | 'gaming' | 'empty' | 'style', styleId?: DesignStyleId) => {
      const map: Record<
        string,
        { name: string; roomType: RoomType; style: DesignStyleId; l: number; w: number; h: number; empty?: boolean }
      > = {
        bedroom: {
          name: 'Serene Master Bedroom',
          roomType: 'Bedroom',
          style: 'scandinavian',
          l: 4.8,
          w: 4.2,
          h: 2.85,
        },
        living: {
          name: 'Architectural Living Lounge',
          roomType: 'Living Room',
          style: 'modern-luxury',
          l: 5.8,
          w: 4.6,
          h: 3.0,
        },
        workspace: {
          name: 'Oak Daylight Study',
          roomType: 'Study Room',
          style: 'japandi',
          l: 4.4,
          w: 3.6,
          h: 2.8,
        },
        gaming: {
          name: 'Contemporary Creator Room',
          roomType: 'Gaming Room',
          style: 'contemporary',
          l: 4.6,
          w: 3.8,
          h: 2.8,
        },
        empty: {
          name: 'Blank Architectural Canvas',
          roomType: 'Custom Room',
          style: 'minimalist',
          l: 5.2,
          w: 4.2,
          h: 2.9,
          empty: true,
        },
      };

      if (kind === 'style' && styleId) {
        const st = DESIGN_STYLES.find((s) => s.id === styleId) ?? DESIGN_STYLES[0];
        return createProject({
          name: `${st.name} Concept`,
          roomType: 'Living Room',
          styleId: st.id,
          length: 5.6,
          width: 4.5,
          height: 2.95,
          unit: settings.defaultUnit,
          startingPoint: 'theme',
        });
      }

      const cfg = map[kind] ?? map.living;
      return createProject({
        name: cfg.name,
        roomType: cfg.roomType,
        styleId: cfg.style,
        length: cfg.l,
        width: cfg.w,
        height: cfg.h,
        unit: settings.defaultUnit,
        startingPoint: cfg.empty ? 'empty' : 'theme',
      });
    },
    [createProject, settings.defaultUnit],
  );

  const renameProject = useCallback(
    (projectId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p,
        ),
      );
      logActivity(`Renamed project`, trimmed, 'edit');
    },
    [logActivity],
  );

  const duplicateProject = useCallback(
    (projectId: string) => {
      const source = projects.find((p) => p.id === projectId);
      if (!source) return;
      const now = new Date().toISOString();
      const copy: RoomProject = {
        ...source,
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${source.name} (Copy)`,
        furniture: source.furniture.map((f) => ({
          ...f,
          instanceId: `${f.catalogId}-${Math.random().toString(36).slice(2, 8)}`,
        })),
        createdAt: now,
        updatedAt: now,
      };
      setProjects((prev) => [copy, ...prev]);
      logActivity(`Duplicated project`, copy.name, 'create');
      return copy;
    },
    [projects, logActivity],
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (target) {
        logActivity(`Deleted project`, target.name, 'edit');
      }
    },
    [projects, logActivity],
  );

  const toggleSaveArchive = useCallback(
    (projectId: string, saved?: boolean) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const nextSaved = saved !== undefined ? saved : !p.savedToArchive;
          logActivity(nextSaved ? 'Saved a design' : 'Removed from saved designs', p.name, 'save');
          return { ...p, savedToArchive: nextSaved, updatedAt: new Date().toISOString() };
        }),
      );
    },
    [logActivity],
  );

  return {
    projects,
    activities,
    settings,
    setSettings,
    logActivity,
    upsertProject,
    createProject,
    createQuickStartProject,
    renameProject,
    duplicateProject,
    deleteProject,
    toggleSaveArchive,
  };
}
