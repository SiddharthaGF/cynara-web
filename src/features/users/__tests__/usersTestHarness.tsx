import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createInstance, type i18n as I18nInstance } from 'i18next';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import apiEn from '@/i18n/locales/en/api.json';
import authEn from '@/i18n/locales/en/auth.json';
import commonEn from '@/i18n/locales/en/common.json';
import hospitalEn from '@/i18n/locales/en/hospital.json';
import usersEn from '@/i18n/locales/en/users.json';
import apiEs from '@/i18n/locales/es/api.json';
import authEs from '@/i18n/locales/es/auth.json';
import commonEs from '@/i18n/locales/es/common.json';
import hospitalEs from '@/i18n/locales/es/hospital.json';
import usersEs from '@/i18n/locales/es/users.json';

/** A directory list row fixture builder matching the promoted DTO shape. */
export function listItem(
  id: string,
  email: string,
  hospitals: string[],
): { id: string; email: string; hospitals: string[] } {
  return { id, email, hospitals };
}

export const listResponse = {
  items: [
    listItem('u-1', 'ada@cynara.dev', ['hospital-norte']),
    listItem('u-2', 'grace@cynara.dev', ['hospital-sur']),
  ],
  page: 1,
  pageSize: 20,
  totalCount: 2,
};

export const detailFixture = {
  id: 'u-1',
  email: 'ada@cynara.dev',
  userName: 'ada',
  memberships: [
    {
      hospital: 'hospital-norte',
      actorId: 'actor-ada',
      createdAt: '2026-01-02T03:04:05Z',
    },
  ],
  // Deliberately unsorted: the UI must render the union as returned.
  capabilities: ['users.read', 'audit.read', 'catalog.read'],
  flags: {
    emailConfirmed: true,
    lockoutEnabled: false,
    lockoutEnd: null as string | null,
  },
};

/**
 * Creates a dedicated i18next instance for one locale with only the
 * namespaces the screens touch, mirroring the app resources.
 */
export function makeI18n(locale: 'en' | 'es'): I18nInstance {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: locale,
    resources: {
      en: {
        users: usersEn,
        api: apiEn,
        common: commonEn,
        auth: authEn,
        hospital: hospitalEn,
      },
      es: {
        users: usersEs,
        api: apiEs,
        common: commonEs,
        auth: authEs,
        hospital: hospitalEs,
      },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    saveMissing: true,
    missingKeyHandler: (
      _locales: readonly string[],
      _ns: string | string[],
      key: string,
    ) => {
      missingKeys.push(`${locale}:${key}`);
    },
  });
  return instance;
}

/** Namespaced translator so assertions read the same keys components use. */
export function usersT(i18n: I18nInstance): (key: string) => string {
  return (key: string) => i18n.t(`users:${key}`);
}

/** Collected missing-key reports across instances; cleared per test. */
export const missingKeys: string[] = [];

/** Fresh QueryClient with retries off; static rendering fires no effects,
 * so seeded entries are read verbatim and nothing refetches on mount. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

interface RenderOptions {
  client?: QueryClient;
  i18n?: I18nInstance;
}

/** Renders through the providers the screens expect, to static markup. */
export function renderStatic(
  ui: ReactElement,
  options: RenderOptions = {},
): string {
  const client = options.client ?? makeQueryClient();
  const i18n = options.i18n ?? makeI18n('en');
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(I18nextProvider, { i18n }, ui),
    ),
  );
}

/** Wraps children for provider contexts where the element is reused. */
export function withProviders(
  ui: ReactNode,
  client: QueryClient,
  i18n: I18nInstance,
): ReactElement {
  return createElement(
    QueryClientProvider,
    { client },
    createElement(I18nextProvider, { i18n }, ui),
  );
}
