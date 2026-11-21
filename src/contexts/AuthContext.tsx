import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser } from '../types/room';

const USERS_KEY = 'livora_auth_users_v1';
const SESSION_KEY = 'livora_auth_session_v1';

interface StoredAuthRecord {
  id: string;
  fullName: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

interface StoredSession {
  user: AuthUser;
  rememberMe: boolean;
}

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  firebaseConfigured: boolean;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<AuthActionResult>;
  signUp: (fullName: string, email: string, password: string) => Promise<AuthActionResult>;
  resetPassword: (email: string, newPassword: string) => Promise<AuthActionResult>;
  signOut: () => void;
  updateUserName: (fullName: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function readStoredUsers(): StoredAuthRecord[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredUsers(users: StoredAuthRecord[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore storage quota errors
  }
}

function readInitialSession(): AuthUser | null {
  try {
    const fromLocal = localStorage.getItem(SESSION_KEY);
    if (fromLocal) {
      const parsed = JSON.parse(fromLocal) as StoredSession;
      if (parsed?.user?.id && parsed?.user?.email) return parsed.user;
    }
    const fromSession = sessionStorage.getItem(SESSION_KEY);
    if (fromSession) {
      const parsed = JSON.parse(fromSession) as StoredSession;
      if (parsed?.user?.id && parsed?.user?.email) return parsed.user;
    }
  } catch {
    // ignore corrupted session storage
  }
  return null;
}

function persistSession(user: AuthUser | null, rememberMe: boolean) {
  try {
    if (!user) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    const payload: StoredSession = { user, rememberMe };
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // ignore storage quota errors
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => readInitialSession());
  const [remembered, setRemembered] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(SESSION_KEY));
    } catch {
      return true;
    }
  });

  const firebaseConfigured = Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID,
  );

  // Ensure a seeded studio demo account exists so first-time visitors can test login immediately if desired,
  // while still requiring explicit password entry and full validation.
  useEffect(() => {
    const existing = readStoredUsers();
    if (existing.length > 0) return;
    let active = true;
    (async () => {
      const salt = generateSalt();
      const passwordHash = await hashPassword('Livora@2026', salt);
      if (!active) return;
      const current = readStoredUsers();
      if (current.length === 0) {
        writeStoredUsers([
          {
            id: 'usr-studio-demo',
            fullName: 'Aarav Mehta',
            email: 'studio@livora.design',
            salt,
            passwordHash,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean): Promise<AuthActionResult> => {
      const norm = normalizeEmail(email);
      if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
        return { ok: false, error: 'Please enter a valid email address.' };
      }
      if (!password) {
        return { ok: false, error: 'Please enter your password.' };
      }

      const users = readStoredUsers();
      const match = users.find((u) => u.email === norm);
      if (!match) {
        return {
          ok: false,
          error: 'No account found for this email. Create an account to get started.',
        };
      }

      const computedHash = await hashPassword(password, match.salt);
      if (computedHash !== match.passwordHash) {
        return { ok: false, error: 'Incorrect password. Please try again or reset your password.' };
      }

      const authUser: AuthUser = {
        id: match.id,
        fullName: match.fullName,
        email: match.email,
        createdAt: match.createdAt,
      };
      setUser(authUser);
      setRemembered(rememberMe);
      persistSession(authUser, rememberMe);
      return { ok: true, user: authUser };
    },
    [],
  );

  const signUp = useCallback(
    async (fullName: string, email: string, password: string): Promise<AuthActionResult> => {
      const cleanName = fullName.trim();
      const norm = normalizeEmail(email);
      if (cleanName.length < 2) {
        return { ok: false, error: 'Please enter your full name (at least 2 characters).' };
      }
      if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
        return { ok: false, error: 'Please enter a valid email address.' };
      }
      if (password.length < 8) {
        return { ok: false, error: 'Password must be at least 8 characters long.' };
      }

      const users = readStoredUsers();
      if (users.some((u) => u.email === norm)) {
        return { ok: false, error: 'An account with this email already exists. Please sign in.' };
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const createdAt = new Date().toISOString();
      const record: StoredAuthRecord = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fullName: cleanName,
        email: norm,
        salt,
        passwordHash,
        createdAt,
      };
      writeStoredUsers([record, ...users]);

      const authUser: AuthUser = {
        id: record.id,
        fullName: record.fullName,
        email: record.email,
        createdAt: record.createdAt,
      };
      setUser(authUser);
      setRemembered(true);
      persistSession(authUser, true);
      return { ok: true, user: authUser };
    },
    [],
  );

  const resetPassword = useCallback(
    async (email: string, newPassword: string): Promise<AuthActionResult> => {
      const norm = normalizeEmail(email);
      if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
        return { ok: false, error: 'Please enter a valid email address.' };
      }
      if (newPassword.length < 8) {
        return { ok: false, error: 'New password must be at least 8 characters long.' };
      }

      const users = readStoredUsers();
      const idx = users.findIndex((u) => u.email === norm);
      if (idx === -1) {
        return { ok: false, error: 'No Livora account matches that email address.' };
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(newPassword, salt);
      const updatedUsers = [...users];
      updatedUsers[idx] = { ...updatedUsers[idx], salt, passwordHash };
      writeStoredUsers(updatedUsers);
      return { ok: true };
    },
    [],
  );

  const signOut = useCallback(() => {
    setUser(null);
    persistSession(null, false);
  }, []);

  const updateUserName = useCallback(
    (fullName: string) => {
      const clean = fullName.trim();
      if (!clean || !user) return;
      const updated: AuthUser = { ...user, fullName: clean };
      setUser(updated);
      persistSession(updated, remembered);
      const users = readStoredUsers();
      writeStoredUsers(
        users.map((u) => (u.id === user.id ? { ...u, fullName: clean } : u)),
      );
    },
    [user, remembered],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      firebaseConfigured,
      signIn,
      signUp,
      resetPassword,
      signOut,
      updateUserName,
    }),
    [user, firebaseConfigured, signIn, signUp, resetPassword, signOut, updateUserName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
