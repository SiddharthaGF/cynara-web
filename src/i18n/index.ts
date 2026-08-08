import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resolveBootLocale } from '@/lib/locale.ts';
import type { AppLocale } from '@/lib/locale.ts';

import apiEn from './locales/en/api.json';
import commonEn from './locales/en/common.json';
import designerEn from './locales/en/designer.json';
import documentsEn from './locales/en/documents.json';
import encountersEn from './locales/en/encounters.json';
import formsEn from './locales/en/forms.json';
import hospitalEn from './locales/en/hospital.json';
import patientsEn from './locales/en/patients.json';
import validationEn from './locales/en/validation.json';
import workflowsEn from './locales/en/workflows.json';
import apiEs from './locales/es/api.json';
import commonEs from './locales/es/common.json';
import designerEs from './locales/es/designer.json';
import documentsEs from './locales/es/documents.json';
import encountersEs from './locales/es/encounters.json';
import formsEs from './locales/es/forms.json';
import hospitalEs from './locales/es/hospital.json';
import patientsEs from './locales/es/patients.json';
import validationEs from './locales/es/validation.json';
import workflowsEs from './locales/es/workflows.json';

const resources = {
  en: {
    api: apiEn,
    common: commonEn,
    forms: formsEn,
    designer: designerEn,
    documents: documentsEn,
    encounters: encountersEn,
    hospital: hospitalEn,
    patients: patientsEn,
    validation: validationEn,
    workflows: workflowsEn,
  },
  es: {
    api: apiEs,
    common: commonEs,
    forms: formsEs,
    designer: designerEs,
    documents: documentsEs,
    encounters: encountersEs,
    hospital: hospitalEs,
    patients: patientsEs,
    validation: validationEs,
    workflows: workflowsEs,
  },
} as const;

export function createI18n(
  initialLocale?: AppLocale,
): ReturnType<typeof createInstance> {
  const locale = initialLocale ?? resolveBootLocale();
  const instance = createInstance();

  void instance.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'forms',
      'designer',
      'documents',
      'encounters',
      'patients',
      'hospital',
      'validation',
      'api',
      'workflows',
    ],
    interpolation: { escapeValue: false },
  });

  return instance;
}

/**
 * Boot language comes from the URL on the client (`/es/...` → es) so hydration
 * matches SSR. Route `beforeLoad` still syncs on navigation / server render.
 */
export const i18nInstance = createI18n();
