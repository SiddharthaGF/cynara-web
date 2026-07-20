import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resolveBootLocale } from '@/lib/locale.ts';
import type { AppLocale } from '@/lib/locale.ts';

import commonEn from './locales/en/common.json';
import designerEn from './locales/en/designer.json';
import formsEn from './locales/en/forms.json';
import validationEn from './locales/en/validation.json';
import commonEs from './locales/es/common.json';
import designerEs from './locales/es/designer.json';
import formsEs from './locales/es/forms.json';
import validationEs from './locales/es/validation.json';

const resources = {
  en: {
    common: commonEn,
    forms: formsEn,
    designer: designerEn,
    validation: validationEn,
  },
  es: {
    common: commonEs,
    forms: formsEs,
    designer: designerEs,
    validation: validationEs,
  },
} as const;

function createI18n(initialLocale?: AppLocale) {
  const locale = initialLocale ?? resolveBootLocale();
  const instance = createInstance();

  void instance.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'forms', 'designer', 'validation'],
    interpolation: { escapeValue: false },
  });

  return instance;
}

/**
 * Boot language comes from the URL on the client (`/es/...` → es) so hydration
 * matches SSR. Route `beforeLoad` still syncs on navigation / server render.
 */
export const i18nInstance = createI18n();
