import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { resolveApiBaseUrl } from './lib/resolveApiBaseUrl';

const resolvedBase = resolveApiBaseUrl();
const loadPath = resolvedBase ? `${resolvedBase}/api/v1/i18n/{{lng}}/{{ns}}` : '/api/v1/i18n/{{lng}}/{{ns}}';

const namespaces = ['common', 'home', 'login', 'signup', 'callback', 'dashboard', 'notFound', 'legal', 'characters'];
const supportedPrefixes = ['en', 'pt', 'es', 'fr', 'de', 'zh', 'hi', 'ar', 'ru', 'ja', 'ko', 'it'];
const supportedLngs = [
  'en-US', 'pt-BR', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'hi-IN', 'ar-SA', 'ru-RU', 'ja-JP', 'ko-KR', 'it-IT',
  ...supportedPrefixes
];

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en-US',
    supportedLngs,
    ns: namespaces,
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    backend: {
      loadPath,
    },
    returnNull: false,
  });

export default i18n;
