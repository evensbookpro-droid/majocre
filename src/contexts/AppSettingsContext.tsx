import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';

interface AppSettings {
  site_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  contact_email: string;
  contact_phone: string;
  bank_info: string;
  footer_text: string;
}

interface AppSettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const STORAGE_KEY = 'app_settings_cache';

const defaultSettings: AppSettings = {
  site_name: 'MAJOCRE',
  logo_url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MjAgMTgwIj48dGV4dCB4PSIxMCIgeT0iODAiIGZvbnQtZmFtaWx5PSInSW50ZXInLCAnTW9udHNlcnJhdCcsIC1hcHBsZS1zeXN0ZW0sIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iODIiIGxldHRlci1zcGFjaW5nPSItMiIgZmlsbD0iI0ZGRkZGRiI+TUFKT1JJVFk8L3RleHQ+PHRleHQgeD0iMTcwIiB5PSIxNTUiIGZvbnQtZmFtaWx5PSInSW50ZXInLCAnTW9udHNlcnJhdCcsIC1hcHBsZS1zeXN0ZW0sIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iODIiIGxldHRlci1zcGFjaW5nPSItMiIgZmlsbD0iIzdDNERGRiI+Q1JFRElUPC90ZXh0Pjwvc3ZnPg==',
  primary_color: '#794cff',
  secondary_color: '#064e3b', // emerald-950
  accent_color: '#f59e0b', // amber-500
  contact_email: 'contact@premium-saas.com',
  contact_phone: '+33 1 23 45 67 89',
  bank_info: 'FR76 3000 4000 1234 5678 9012 345',
  footer_text: '© Tous droits réservés. Plateforme de services financiers.',
};

const getInitialSettings = (): AppSettings => {
  if (typeof window === 'undefined') return defaultSettings;
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.site_name === 'SaaS Premium') {
        parsed.site_name = 'MAJOCRE';
      }
      if (!parsed.logo_url) {
        parsed.logo_url = defaultSettings.logo_url;
      }
      if (parsed.primary_color === '#10b981') {
        parsed.primary_color = '#794cff';
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse cached settings:', e);
    }
  }
  return defaultSettings;
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);
  // If we have cached settings, we're not "loading" in the sense that blocks the UI
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !localStorage.getItem(STORAGE_KEY);
  });

  const fetchSettings = async () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      setIsLoading(false);
      return;
    }
    try {
      const supabase = getSupabase();
      let data = null;
      let error = null;

      // Try selecting all columns first
      try {
        const { data: fullData, error: fullError } = await supabase
          .from('app_settings')
          .select('id, site_name, logo_url, primary_color, secondary_color, accent_color, contact_email, contact_phone, bank_info, footer_text')
          .single();
        if (fullError) {
          error = fullError;
        } else {
          data = fullData;
        }
      } catch (err) {
        error = err;
      }

      // If that failed due to database cache mismatch, query only the core settings
      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching all settings, trying core settings fallback:', error);
        try {
          const { data: coreData, error: coreError } = await supabase
            .from('app_settings')
            .select('id, site_name, logo_url, primary_color, secondary_color, accent_color')
            .single();
          if (!coreError && coreData) {
            data = {
              ...coreData,
              contact_email: localStorage.getItem('fallback_contact_email') || defaultSettings.contact_email,
              contact_phone: localStorage.getItem('fallback_contact_phone') || defaultSettings.contact_phone,
              bank_info: localStorage.getItem('fallback_bank_info') || defaultSettings.bank_info,
              footer_text: localStorage.getItem('fallback_footer_text') || defaultSettings.footer_text,
            };
            error = null; // Clear error since fallback was successful
          }
        } catch (coreErr) {
          console.error('Failed fetching core settings too:', coreErr);
        }
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching app settings:', error);
      }

      if (data) {
        const fetchedName = data.site_name || defaultSettings.site_name;
        const fetchedPrimary = data.primary_color || defaultSettings.primary_color;
        const newSettings = {
          site_name: fetchedName === 'SaaS Premium' ? 'MAJOCRE' : fetchedName,
          logo_url: data.logo_url || defaultSettings.logo_url,
          primary_color: fetchedPrimary === '#10b981' ? '#794cff' : fetchedPrimary,
          secondary_color: data.secondary_color || defaultSettings.secondary_color,
          accent_color: data.accent_color || defaultSettings.accent_color,
          contact_email: data.contact_email || localStorage.getItem('fallback_contact_email') || defaultSettings.contact_email,
          contact_phone: data.contact_phone || localStorage.getItem('fallback_contact_phone') || defaultSettings.contact_phone,
          bank_info: data.bank_info || localStorage.getItem('fallback_bank_info') || defaultSettings.bank_info,
          footer_text: data.footer_text || localStorage.getItem('fallback_footer_text') || defaultSettings.footer_text,
        };
        
        setSettings(newSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Apply colors to CSS variables
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primary_color);
    root.style.setProperty('--secondary-color', settings.secondary_color);
    root.style.setProperty('--accent-color', settings.accent_color);
    
    // Helper to extract RGB from hex
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '16, 185, 129'; // fallback to emerald-500
    };

    root.style.setProperty('--brand-rgb', hexToRgb(settings.primary_color));
    root.style.setProperty('--accent-rgb', hexToRgb(settings.accent_color));
  }, [settings]);

  return (
    <AppSettingsContext.Provider value={{ settings, isLoading, refreshSettings: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};
