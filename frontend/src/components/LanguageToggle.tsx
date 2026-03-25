"use client";

import { useTranslation } from "react-i18next";
import { Globe2 } from "lucide-react";

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-white px-4 py-2 rounded-full border border-white/10 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105"
      title="Toggle Language"
    >
      <Globe2 className="w-4 h-4 text-emerald-400" />
      <span className="text-sm font-medium tracking-wide">
        {i18n.language === 'hi' ? 'EN / हिंदी' : 'HI / English'}
      </span>
    </button>
  );
}
