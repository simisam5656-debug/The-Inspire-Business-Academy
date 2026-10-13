import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation, Language } from '../../i18n';

export const LanguageSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className={`inline-flex items-center gap-1.5 p-1 rounded-lg bg-white/80 border border-[#1F3FBF]/20 text-xs ${className}`}>
      <Languages className="w-3.5 h-3.5 text-[#1F3FBF] ml-1" />
      <button
        type="button"
        onClick={() => setLanguage('roman-urdu')}
        className={`px-2 py-1 rounded font-medium transition-colors ${
          language === 'roman-urdu'
            ? 'bg-[#1F3FBF] text-white shadow-xs'
            : 'text-[#0F1F5C]/70 hover:text-[#0F1F5C]'
        }`}
      >
        {t.common.romanUrdu}
      </button>
      <button
        type="button"
        onClick={() => setLanguage('english')}
        className={`px-2 py-1 rounded font-medium transition-colors ${
          language === 'english'
            ? 'bg-[#1F3FBF] text-white shadow-xs'
            : 'text-[#0F1F5C]/70 hover:text-[#0F1F5C]'
        }`}
      >
        {t.common.english}
      </button>
    </div>
  );
};
