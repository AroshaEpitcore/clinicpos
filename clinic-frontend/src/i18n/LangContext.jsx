import { createContext, useContext, useState, useCallback } from 'react';
import { TRANSLATIONS } from './translations';

const LangContext = createContext(null);

const STORAGE_KEY = 'patient_lang';
const VALID = ['en', 'si'];

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (VALID.includes(saved)) return saved;
  } catch { /* ignore */ }
  return 'en';
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  const setLang = useCallback((next) => {
    if (!VALID.includes(next)) return;
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === 'en' ? 'si' : 'en');
  }, [lang, setLang]);

  /**
   * t('key') or t('key', { name: 'value' }) for substitution.
   * Falls back to English if the key is missing in the active language,
   * then to the key itself.
   */
  const t = useCallback((key, vars) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    let str = dict[key] ?? TRANSLATIONS.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return str;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
