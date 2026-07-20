import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LOCALE,
  getStoredLocale,
  resolveLocale,
} from '@/lib/locale.ts';
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

export function createI18n(initialLocale?: AppLocale) {
  const locale =
    initialLocale ??
    (typeof window === 'undefined'
      ? DEFAULT_LOCALE
      : resolveLocale(getStoredLocale()));

  const instance = createInstance();

  void instance.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    ns: ['common', 'forms', 'designer', 'validation'],
    interpolation: { escapeValue: false },
  });

  return instance;
}

export const i18nInstance = createI18n();

export type I18nNamespace = keyof (typeof resources)['en'];
