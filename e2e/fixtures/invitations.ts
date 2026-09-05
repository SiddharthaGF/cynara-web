import type { Page, Route } from '@playwright/test';

export interface InvitationRow {
  id: string;
  email: string;
  hospitalId: string;
  status: string;
  linkVersion: number;
  createdAt: string;
  issuedAt: string;
  expiresAt: string;
}

export function invitationRow(
  overrides: Partial<InvitationRow> = {},
): InvitationRow {
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

const JSON_API = 'application/vnd.api+json';

/** Lists the workspace's invitations (browser-direct client SDK call). */
export function stubInvitationList(page: Page, rows: InvitationRow[]): void {
  void page.route('**/api/user-invitations', async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: JSON_API,
      body: JSON.stringify(rows),
    });
  });
}

/** Creates an invitation; returns the record plus the one-time token. */
export function stubCreateInvitation(
  page: Page,
  invitation: InvitationRow,
  token: string,
  status = 201,
): void {
  void page.route('**/api/user-invitations', async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status,
      contentType: JSON_API,
      body: JSON.stringify({ invitation, token }),
    });
  });
}

/** Cancels an invitation; the row persists with status `cancelled`. */
export function stubCancelInvitation(
  page: Page,
  invitation: InvitationRow,
): void {
  void page.route('**/api/user-invitations/*/cancel', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: JSON_API,
      body: JSON.stringify(invitation),
    });
  });
}

/** Resends an invitation; returns the record plus a fresh token (supersede). */
export function stubResendInvitation(
  page: Page,
  invitation: InvitationRow,
  token: string,
): void {
  void page.route('**/api/user-invitations/*/resend', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: JSON_API,
      body: JSON.stringify({ invitation, token }),
    });
  });
}

/**
 * Base64 prefix of `{"file":"/src/server/invitation-acceptance.ts` embedded in
 * the TanStack Start server-function transport URL. Matching on it scopes the
 * stub to the accept flow without touching auth/session server functions.
 */
const ACCEPT_FN_PREFIX =
  '**/_serverFn/eyJmaWxlIjoiL3NyYy9zZXJ2ZXIvaW52aXRhdGlvbi1hY2NlcHRhbmNlLnRz*';

export interface AcceptStub {
  accepted: boolean;
  member?: {
    user: { id: string; email: string };
    hospital: { id: string; code: string; name: string };
    actor: { id: string };
    capabilities: string[];
  } | null;
}

/**
 * Stubs the anonymous accept server function (server-side fetch, so the
 * browser-direct `/api/...` route cannot intercept it). Register AFTER page
 * load so unrelated server functions are unaffected. Supports an artificial
 * delay to hold the submit button in its pending (disabled) state.
 */
export function stubAcceptInvitation(
  page: Page,
  payload: AcceptStub,
  options: { status?: number; delayMs?: number; onRequest?: () => void } = {},
): void {
  const { status = 200, delayMs = 0, onRequest } = options;
  void page.route(ACCEPT_FN_PREFIX, async (route: Route) => {
    onRequest?.();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

/** Stubs a 429 rate-limit on the accept server function. */
export function stubAcceptRateLimited(page: Page): void {
  void page.route(ACCEPT_FN_PREFIX, async (route: Route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ errors: [{ status: '429' }] }),
    });
  });
}
