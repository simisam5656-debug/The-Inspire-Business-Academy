import React, { createContext, useContext, useState, ReactNode } from 'react';
import { romanUrdu, TranslationSchema } from './translations/romanUrdu';
import { english } from './translations/english';

export type Language = 'roman-urdu' | 'english';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSchema;
}

const translationsMap: Record<Language, TranslationSchema> = {
  'roman-urdu': romanUrdu,
  english: english,
};

const I18nContext = createContext<I18nContextType>({
  language: 'roman-urdu',
  setLanguage: () => {},
  t: romanUrdu,
});

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('inspire_lang');
      if (saved === 'english' || saved === 'roman-urdu') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'roman-urdu'; // Default is Roman Urdu
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('inspire_lang', lang);
    } catch {
      // ignore
    }
  };

  const t = translationsMap[language] || romanUrdu;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => useContext(I18nContext);
