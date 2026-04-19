import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';

import { useOffline } from './useOffline';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthReady: boolean;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  login: (token: string, userData?: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Theme Persistence
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const { smartFetch } = useOffline();

  const fetchUserData = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      setIsAuthReady(true);
      return;
    }

    try {
      const response = await smartFetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.Success || data.status === 'success' || data.id) {
          const rawUser = data.data || data.user || data;
          // Normalize user data to prioritize photo_url from backend
          const normalizedUser = {
            ...rawUser,
            profilePicture: rawUser.photo_url || rawUser.profile_picture || rawUser.profilePicture || null
          };
          setUser(normalizedUser);
        } else {
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setIsAuthReady(true);
    }
  };

  const login = async (token: string, userData?: User) => {
    localStorage.setItem('auth_token', token);
    if (userData) {
      // Allow for both direct user object and wrapped user object
      const actualUser = (userData as any).user || userData;
      const normalizedUser = {
        ...actualUser,
        profilePicture: actualUser.photo_url || actualUser.profile_picture || actualUser.profilePicture || null
      };
      setUser(normalizedUser);
      setLoading(false);
      setIsAuthReady(true);
    } else {
      await fetchUserData();
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUserData();
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthReady, isDarkMode, setIsDarkMode, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
