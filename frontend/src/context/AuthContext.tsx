import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type RoleName = 'super_admin' | 'server_admin' | 'reseller' | 'account_owner' | 'team_member' | 'read_only';

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: RoleName;
  permissions: string[];
  locale: string;
  theme: string;
  status?: string;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setLocale: (locale: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    const accessToken = localStorage.getItem('hostmaster.access_token');
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMe();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = user?.theme ?? localStorage.getItem('hostmaster.theme') ?? 'dark';
    document.documentElement.dir = (user?.locale ?? localStorage.getItem('hostmaster.locale') ?? 'en') === 'ar' ? 'rtl' : 'ltr';
  }, [user]);

  const login = async (identifier: string, password: string) => {
    const response = await api.post('/auth/login', { identifier, password });
    const payload = response.data.data;
    localStorage.setItem('hostmaster.access_token', payload.accessToken);
    localStorage.setItem('hostmaster.refresh_token', payload.refreshToken);
    localStorage.setItem('hostmaster.locale', payload.user.locale);
    localStorage.setItem('hostmaster.theme', payload.user.theme);
    setUser(payload.user);
    document.documentElement.dir = payload.user.locale === 'ar' ? 'rtl' : 'ltr';
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('hostmaster.access_token');
      localStorage.removeItem('hostmaster.refresh_token');
      setUser(null);
    }
  };

  const setLocale = (locale: string) => {
    localStorage.setItem('hostmaster.locale', locale);
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  };

  const setTheme = (theme: 'dark' | 'light') => {
    localStorage.setItem('hostmaster.theme', theme);
    document.documentElement.dataset.theme = theme;
    setUser((current) => (current ? { ...current, theme } : current));
  };

  const value = useMemo(() => ({ user, loading, login, logout, refreshMe, setLocale, setTheme }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
