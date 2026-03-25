"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

const isBrowser = typeof window !== "undefined";

if (isBrowser) {
  i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: "en",
      supportedLngs: ["en", "hi"],
      backend: {
        loadPath: "/locales/{{lng}}/{{ns}}.json",
      },
      detection: {
        order: ["localStorage", "cookie", "htmlTag", "path"],
        caches: ["localStorage", "cookie"],
      },
      ns: ['common'],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false, // react already safes from xss
      },
    });
} else {
  i18n
    .use(initReactI18next)
    .init({
      fallbackLng: "en",
      supportedLngs: ["en", "hi"],
      ns: ['common'],
      defaultNS: 'common',
      resources: {
        en: { common: {} },
        hi: { common: {} }
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
