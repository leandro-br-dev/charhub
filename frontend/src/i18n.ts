import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { resolveApiBaseUrl } from './lib/resolveApiBaseUrl';

const resolvedBase = resolveApiBaseUrl();
const loadPath = resolvedBase
  ? `${resolvedBase}/api/v1/i18n/{{lng}}/{{ns}}?v=${new Date().getTime()}`
  : `/api/v1/i18n/{{lng}}/{{ns}}?v=${new Date().getTime()}`;

const namespaces = ['common', 'home', 'login', 'signup', 'callback', 'dashboard', 'notFound', 'legal', 'characters', 'chat', 'imageGallery', 'story', 'navigation', 'profile', 'plans', 'welcome'];
const supportedLngs = ['en-US', 'pt-BR', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'hi-IN', 'ar-SA', 'ru-RU', 'ja-JP', 'ko-KR', 'it-IT'];

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: false,
    supportedLngs,
    load: 'currentOnly',
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
      requestOptions: {
        cache: 'default',
      },
    },
    returnNull: false,
    saveMissing: false,
  });

export default i18n;
