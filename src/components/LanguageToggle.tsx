import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
    >
      <Languages size={20} className="text-gray-600 dark:text-gray-300" />
    </button>
  );
}

