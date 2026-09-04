import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resolveBootLocale } from '@/lib/locale.ts';
import type { AppLocale } from '@/lib/locale.ts';

import apiEn from './locales/en/api.json';
import authEn from './locales/en/auth.json';
import commonEn from './locales/en/common.json';
import designerEn from './locales/en/designer.json';
import documentsEn from './locales/en/documents.json';
import encountersEn from './locales/en/encounters.json';
import formsEn from './locales/en/forms.json';
import homeEn from './locales/en/home.json';
import hospitalEn from './locales/en/hospital.json';
import invitationsEn from './locales/en/invitations.json';
import journeysEn from './locales/en/journeys.json';
import patientsEn from './locales/en/patients.json';
import usersEn from './locales/en/users.json';
import validationEn from './locales/en/validation.json';
import workflowsEn from './locales/en/workflows.json';
import apiEs from './locales/es/api.json';
import authEs from './locales/es/auth.json';
import commonEs from './locales/es/common.json';
import designerEs from './locales/es/designer.json';
import documentsEs from './locales/es/documents.json';
import encountersEs from './locales/es/encounters.json';
import formsEs from './locales/es/forms.json';
import homeEs from './locales/es/home.json';
import hospitalEs from './locales/es/hospital.json';
import invitationsEs from './locales/es/invitations.json';
import journeysEs from './locales/es/journeys.json';
import patientsEs from './locales/es/patients.json';
import usersEs from './locales/es/users.json';
import validationEs from './locales/es/validation.json';
import workflowsEs from './locales/es/workflows.json';

const resources = {
  en: {
    api: apiEn,
    auth: authEn,
    common: commonEn,
    forms: formsEn,
    designer: designerEn,
    documents: documentsEn,
    encounters: encountersEn,
    home: homeEn,
    hospital: hospitalEn,
    invitations: invitationsEn,
    journeys: journeysEn,
    patients: patientsEn,
    users: usersEn,
    validation: validationEn,
    workflows: workflowsEn,
  },
  es: {
    api: apiEs,
    auth: authEs,
    common: commonEs,
    forms: formsEs,
    designer: designerEs,
    documents: documentsEs,
    encounters: encountersEs,
    home: homeEs,
    hospital: hospitalEs,
    invitations: invitationsEs,
    journeys: journeysEs,
    patients: patientsEs,
    users: usersEs,
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
      'auth',
      'forms',
      'designer',
      'documents',
      'encounters',
      'patients',
      'users',
      'invitations',
      'home',
      'hospital',
      'journeys',
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
