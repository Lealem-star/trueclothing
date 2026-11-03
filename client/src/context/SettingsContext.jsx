import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    businessName: 'True clothing',
    phone: '0985698888',
    telegramUrl: 't.me/Trueclothing16',
    payTelebirr: true,
    payCbeBirr: true,
    payBank: false
  });
  const [loading, setLoading] = useState(true);

  const fetchPublicSettings = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data.success && res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.warn('Failed to fetch public settings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchPublicSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

