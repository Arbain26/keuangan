import { useEffect } from 'react';
import { useLanguage } from './useLanguage';

/**
 * Hook to reactively set document.title based on language or key.
 * @param {string} titleOrKey - Direct title string or translation key
 * @param {object} [params] - Optional interpolation params
 */
export const usePageTitle = (titleOrKey, params) => {
  const { t, lang } = useLanguage();

  useEffect(() => {
    if (!titleOrKey) {
      document.title = 'Keuangan';
      return;
    }

    const translated = t(titleOrKey, params);
    const titleText = translated || titleOrKey;
    document.title = `${titleText} — Keuangan`;
  }, [titleOrKey, params, t, lang]);
};

export default usePageTitle;
