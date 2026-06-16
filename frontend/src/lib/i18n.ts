"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// Translations bundled inline so SSR and client produce identical strings,
// eliminating the React hydration mismatch caused by empty SSR resources.
import enCommon from "../../public/locales/en/common.json";
import hiCommon from "../../public/locales/hi/common.json";

const isBrowser = typeof window !== "undefined";

if (isBrowser) {
  i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: "en",
      supportedLngs: ["en", "hi"],
      // Seed the store with bundled translations so the first render
      // matches SSR output, then HttpBackend will refresh in background.
      resources: {
        en: { common: enCommon },
        hi: { common: hiCommon },
      },
      backend: {
        loadPath: "/locales/{{lng}}/{{ns}}.json",
      },
      detection: {
        order: ["localStorage", "cookie", "htmlTag", "path"],
        caches: ["localStorage", "cookie"],
      },
      ns: ["common"],
      defaultNS: "common",
      interpolation: {
        escapeValue: false,
      },
    });
} else {
  i18n
    .use(initReactI18next)
    .init({
      fallbackLng: "en",
      supportedLngs: ["en", "hi"],
      ns: ["common"],
      defaultNS: "common",
      resources: {
        en: { common: enCommon },
        hi: { common: hiCommon },
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
