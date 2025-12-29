"use client";
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSwitcher() {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1  hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-white transition-all shadow-sm"
      title="Đổi ngôn ngữ / Switch Language"
    >
      <span className="text-lg">{lang === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
      <span className="hidden md:inline">{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
    </button>
  );
}