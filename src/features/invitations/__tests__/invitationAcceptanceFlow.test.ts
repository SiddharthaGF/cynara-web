import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/client.ts';
import { describeApiError } from '@/api/error-message.ts';
import {
  invitationsT,
  makeI18n,
  missingKeys,
} from '@/features/invitations/__tests__/invitationsTestHarness.tsx';
import { parseAcceptSearch } from '@/routes/$locale/invitations/accept.tsx';
import { mapApiResponseError } from '@/server/api-proxy.ts';
import {
  toAcceptResult,
  validateAcceptInput,
} from '@/server/invitation-acceptance.ts';

const MEMBER = {
  user: { id: 'u-1', email: 'ada@cynara.dev' },
  hospital: { id: 'h-1', code: 'HOSP', name: 'Hospital Central' },
  actor: { id: 'ada-01' },
  capabilities: ['user-invitations.read'],
};

/** Acc Req 1 — Public route with token search param (validateSearch). */
describe('accept search parsing', () => {
  it('keeps a valid token', () => {
    expect(parseAcceptSearch({ token: 'tok-abc' })).toStrictEqual({
      token: 'tok-abc',
    });
  });

  it('yields undefined for a missing token (page renders the generic invalid state)', () => {
    expect(parseAcceptSearch({})).toStrictEqual({ token: undefined });
  });

  it('trims surrounding whitespace', () => {
    expect(parseAcceptSearch({ token: '  tok-abc  ' })).toStrictEqual({
      token: 'tok-abc',
    });
  });
});

/** Acc Req 2 — Password-only acceptance (input validator + member summary mapping). */
describe('password-only acceptance', () => {
  it('accepts a token plus password and maps the member summary', () => {
    expect(
      validateAcceptInput({ token: 'tok-abc', password: 'S3cure-pw' }),
    ).toStrictEqual({ token: 'tok-abc', password: 'S3cure-pw' });
    const result = toAcceptResult({ accepted: true, member: MEMBER });
    expect(result.accepted).toBeTruthy();
    expect(result.member?.user.email).toBe('ada@cynara.dev');
    expect(result.member?.actor.id).toBe('ada-01');
  });

  it('rejects a missing token and a missing password (400)', () => {
    expect(() =>
      validateAcceptInput({ token: '', password: 'S3cure-pw' }),
    ).toThrow(expect.objectContaining({ status: 400 }));
    expect(() =>
      validateAcceptInput({ token: 'tok-abc', password: '' }),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });
});

/** Acc Req 3 — Uniform invalid-link state (expired/used → accepted:false, no state leak). */
describe('uniform invalid-link envelope', () => {
  it('maps an expired link to accepted:false with no member', () => {
    expect(toAcceptResult({ accepted: false })).toStrictEqual({
      accepted: false,
      member: null,
    });
  });

  it('maps an already-used link to the identical shape (no oracle)', () => {
    expect(toAcceptResult({ accepted: false, member: null })).toStrictEqual({
      accepted: false,
      member: null,
    });
  });
});

/** Acc Req 4 — Rate-limit and error handling (429 surfaced; form stays open). */
describe('acceptance error handling', () => {
  it('maps a 429 response to an ApiError with status 429 (the server fn throws it; the page keeps the form open)', async () => {
    const error = await mapApiResponseError(
      Response.json({ errors: [{ status: '429' }] }, { status: 429 }),
    );
    expect(error).toMatchObject({ status: 429 });
  });

  it('maps 429 to the localized rate-limit message (not the generic invalid state)', () => {
    const i18n = makeI18n('en');
    const message = describeApiError(
      new ApiError(429, 'Too Many Requests', 'Rate limited'),
      i18n.t,
    );
    expect(message).toBe(i18n.t('api:errors.rateLimited'));
    // The 429 message is specific; it must NOT equal the generic invalid-link copy.
    expect(message).not.toBe(invitationsT(i18n)('accept.invalidDescription'));
  });
});

/** Acc Req 5 — Localized acceptance copy (es) with no missing keys. */
describe('acceptance i18n (es)', () => {
  it('resolves the accept flow copy in Spanish with no missing keys', () => {
    missingKeys.length = 0;
    const i18n = makeI18n('es');
    const t = invitationsT(i18n);
    for (const key of [
      'accept.title',
      'accept.passwordLabel',
      'accept.submit',
      'accept.invalidTitle',
      'accept.invalidDescription',
      'accept.successTitle',
    ]) {
      expect(t(key).length).toBeGreaterThan(0);
    }
    expect(missingKeys).toStrictEqual([]);
  });
});
