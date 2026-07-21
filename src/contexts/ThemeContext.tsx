import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  updateUserThemeInDb: (userId: string, newTheme: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme_preference') as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      // Light mode is the default for new users
      return 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme_preference', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const updateUserThemeInDb = async (userId: string, newTheme: ThemeMode) => {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) return;
      
      const supabase = getSupabase();
      const { error } = await supabase
        .from('users')
        .update({ theme: newTheme })
        .eq('id', userId);
        
      if (error) {
        console.warn("Could not update user theme in database (column may be missing):", error.message);
      }
    } catch (err) {
      console.warn("Failed to update user theme in DB:", err);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, updateUserThemeInDb }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
