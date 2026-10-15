import { useLanguage } from '../hooks/useLanguage';
import { Globe } from 'lucide-react';

/**
 * Komponen LanguageSwitcher untuk beralih antara Bahasa Indonesia (ID) dan English (EN).
 *
 * Props:
 * - variant: 'pill' | 'header' | 'minimal' | 'dropdown'
 * - className: additional CSS classes
 */
export const LanguageSwitcher = ({ variant = 'header', className = '' }) => {
  const { lang, setLang, t } = useLanguage();

  const toggleLang = () => {
    setLang(lang === 'id' ? 'en' : 'id');
  };

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs font-semibold ${className}`}
        role="group"
        aria-label={t('lang.switchLabel')}
      >
        <button
          type="button"
          onClick={() => setLang('id')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
            lang === 'id'
              ? 'bg-white text-gray-900 shadow-xs font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
          aria-pressed={lang === 'id'}
        >
          <span className="text-sm leading-none" role="img" aria-label="Indonesia">🇮🇩</span>
          <span>ID</span>
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
            lang === 'en'
              ? 'bg-white text-gray-900 shadow-xs font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
          aria-pressed={lang === 'en'}
        >
          <span className="text-sm leading-none" role="img" aria-label="English">🇬🇧</span>
          <span>EN</span>
        </button>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={toggleLang}
        title={t('lang.switchLabel')}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-colors hover:bg-gray-100 text-gray-600 ${className}`}
      >
        <Globe className="w-3.5 h-3.5 text-gray-400" />
        <span className="uppercase">{lang}</span>
      </button>
    );
  }

  // Default 'header' variant: Sleek button with globe icon and toggle
  return (
    <button
      type="button"
      onClick={toggleLang}
      title={t('lang.switchLabel')}
      aria-label={t('lang.switchLabel')}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200/80 bg-white/80 hover:bg-gray-50/90 text-gray-700 text-xs font-medium backdrop-blur-xs transition shadow-xs hover:border-gray-300 ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-gray-400" />
      <span className="font-semibold text-gray-900">{lang.toUpperCase()}</span>
      <span className="text-[10px] text-gray-400">|</span>
      <span className="text-[10px] text-gray-400 font-normal">
        {lang === 'id' ? 'EN' : 'ID'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
