import { createContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';

const STORAGE_KEY = 'keuangan_lang';
const VALID_LANGS = ['id', 'en'];
const DEFAULT_LANG = 'id';

/**
 * Membaca bahasa dari localStorage dengan validasi.
 * Lazy initial state — tidak menyebabkan flash bahasa default saat refresh.
 */
const getInitialLang = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_LANGS.includes(stored)) return stored;
  } catch {
    /* localStorage mungkin tidak tersedia */
  }
  return DEFAULT_LANG;
};

export const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(getInitialLang);

  /** Set bahasa baru dengan validasi dan persistensi */
  const setLang = useCallback((newLang) => {
    const validLang = VALID_LANGS.includes(newLang) ? newLang : DEFAULT_LANG;
    setLangState(validLang);
    try {
      localStorage.setItem(STORAGE_KEY, validLang);
    } catch {
      /* ignore storage error */
    }
  }, []);

  /** Update atribut lang pada document setiap kali bahasa berubah */
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /**
   * Fungsi terjemahan dengan interpolasi.
   * t('auth.copyright', { year: 2026 }) => "© 2026 Keuangan. Koneksi Aman."
   * Fallback: bahasa aktif → id → key itu sendiri.
   */
  const t = useCallback((key, params) => {
    const getValue = (obj, path) => {
      const keys = path.split('.');
      let result = obj;
      for (const k of keys) {
        if (result === null || result === undefined) return undefined;
        result = result[k];
      }
      return result;
    };

    let value = getValue(translations[lang], key);

    // Fallback ke bahasa Indonesia
    if (value === undefined && lang !== 'id') {
      value = getValue(translations.id, key);
    }

    // Fallback terakhir: kembalikan key
    if (value === undefined) {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation key: "${key}" for lang "${lang}"`);
      }
      return key;
    }

    // Jika value adalah array, kembalikan langsung (mis. daftar fitur)
    if (Array.isArray(value)) return value;

    // Interpolasi parameter
    if (params && typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : `{${paramKey}}`;
      });
    }

    return value;
  }, [lang]);

  /** Format mata uang — selalu IDR, format mengikuti locale bahasa */
  const formatCurrency = useCallback((amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return lang === 'id' ? 'Rp0' : 'Rp0';
    }
    try {
      return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return 'Rp' + amount;
    }
  }, [lang]);

  /** Format tanggal dari string "YYYY-MM-DD" — aman dari bug timezone */
  const formatDate = useCallback((dateString, options) => {
    if (!dateString) return '-';

    // Parse aman YYYY-MM-DD
    if (typeof dateString === 'string' && dateString.includes('-')) {
      const parts = dateString.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          try {
            return date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', options || {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
          } catch {
            return dateString;
          }
        }
      }
    }

    return dateString || '-';
  }, [lang]);

  /** Format angka ringkas — 1.500.000 → "1,5 jt" (id) atau "1.5M" (en) */
  const formatCompact = useCallback((amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '0';
    try {
      return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      }).format(amount);
    } catch {
      return String(amount);
    }
  }, [lang]);

  const value = {
    lang,
    setLang,
    t,
    formatCurrency,
    formatDate,
    formatCompact,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
