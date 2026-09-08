// i18n.js

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./lib/locales";
import enCommon from "./public/locales/en/common.json";
import jaCommon from "./public/locales/ja/common.json";
import thCommon from "./public/locales/th/common.json";

i18n.use(initReactI18next).init({
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  resources: {
    en: {
      common: enCommon,
    },
    ja: {
      common: jaCommon,
    },
    th: {
      common: thCommon,
    },
  },
  ns: ["common"],
  defaultNS: "common",
});

export default i18n;
