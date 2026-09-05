import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createInstance, type i18n as I18nInstance } from 'i18next';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';

import type { InvitationDto } from '@/api/invitations.ts';
import apiEn from '@/i18n/locales/en/api.json';
import authEn from '@/i18n/locales/en/auth.json';
import commonEn from '@/i18n/locales/en/common.json';
import hospitalEn from '@/i18n/locales/en/hospital.json';
import invitationsEn from '@/i18n/locales/en/invitations.json';
import apiEs from '@/i18n/locales/es/api.json';
import authEs from '@/i18n/locales/es/auth.json';
import commonEs from '@/i18n/locales/es/common.json';
import hospitalEs from '@/i18n/locales/es/hospital.json';
import invitationsEs from '@/i18n/locales/es/invitations.json';

/** A lifecycle-metadata-only row fixture matching the promoted DTO shape. */
export function invitationFixture(
  overrides: Partial<InvitationDto> = {},
): InvitationDto {
  return {
    id: 'inv-1',
    email: 'ada@cynara.dev',
    hospitalId: 'hosp-1',
    status: 'pending',
    linkVersion: 1,
    createdAt: '2026-01-02T03:04:05Z',
    issuedAt: '2026-01-02T03:04:05Z',
    expiresAt: '2026-01-05T03:04:05Z',
    ...overrides,
  };
}

/** One row per backend status for the full badge matrix. */
export const sixStatusFixtures: InvitationDto[] = [
  invitationFixture({
    id: 'inv-pending',
    email: 'pending@cynara.dev',
    status: 'pending',
  }),
  invitationFixture({
    id: 'inv-accepted',
    email: 'accepted@cynara.dev',
    status: 'accepted',
  }),
  invitationFixture({
    id: 'inv-expired',
    email: 'expired@cynara.dev',
    status: 'expired',
  }),
  invitationFixture({
    id: 'inv-revoked',
    email: 'revoked@cynara.dev',
    status: 'revoked',
  }),
  invitationFixture({
    id: 'inv-cancelled',
    email: 'cancelled@cynara.dev',
    status: 'cancelled',
  }),
  invitationFixture({
    id: 'inv-used',
    email: 'used@cynara.dev',
    status: 'already-used',
  }),
];

/**
 * Creates a dedicated i18next instance for one locale with only the
 * namespaces the invitation screens touch, mirroring the app resources.
 */
export function makeI18n(locale: 'en' | 'es'): I18nInstance {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: locale,
    resources: {
      en: {
        invitations: invitationsEn,
        api: apiEn,
        common: commonEn,
        auth: authEn,
        hospital: hospitalEn,
      },
      es: {
        invitations: invitationsEs,
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
export function invitationsT(i18n: I18nInstance): (key: string) => string {
  return (key: string) => i18n.t(`invitations:${key}`);
}

/** Collected missing-key reports across instances; cleared per test. */
export const missingKeys: string[] = [];

/** Fresh QueryClient with retries off; static rendering fires no effects. */
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
