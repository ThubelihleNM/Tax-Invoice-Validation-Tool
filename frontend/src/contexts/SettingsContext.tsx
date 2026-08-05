import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface SystemSettings {
  id: number;
  company_name: string;
  company_logo: string;
  default_vat_rate: number;
  currency: string;
  theme: string;
  notification_settings: Record<string, any>;
}

interface SettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
  loading: boolean;
}

const defaultSettings: SystemSettings = {
  id: 1,
  company_name: "Enterprise Solutions Ltd",
  company_logo: "",
  default_vat_rate: 15.00,
  currency: "USD",
  theme: "light",
  notification_settings: {}
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        if (res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.warn('Failed to load system settings, fallback to defaults', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>): Promise<boolean> => {
    try {
      const res = await axios.put('/api/settings', newSettings);
      if (res.data) {
        setSettings(res.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update system settings', err);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
