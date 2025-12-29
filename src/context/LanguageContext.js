"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionary } from '@/utils/dictionary';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('vi');

  useEffect(() => {
    const saved = localStorage.getItem('posture_lang');
    if (saved && (saved === 'vi' || saved === 'en')) {
      setLang(saved);
    }
  }, []);

  const toggleLanguage = () => {
    setLang((prev) => {
      const newLang = prev === 'vi' ? 'en' : 'vi';
      localStorage.setItem('posture_lang', newLang);
      return newLang;
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, t: dictionary[lang], toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: 'vi',
      t: dictionary['vi'],
      toggleLanguage: () => {}
    };
  }

  return context;
}