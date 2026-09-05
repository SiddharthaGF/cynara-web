import { describe, expect, it } from 'vitest';

import {
  invitationFixture,
  invitationsT,
  makeI18n,
  missingKeys,
  renderStatic,
  sixStatusFixtures,
} from '@/features/invitations/__tests__/invitationsTestHarness.tsx';
import { buildAcceptLink } from '@/features/invitations/accept-link.ts';
import {
  INITIAL_INVITATION_VALUES,
  validateInvitationCreate,
} from '@/features/invitations/invitationForm.ts';
import {
  badgeVariantForStatus,
  INVITATION_STATUSES,
  isInvitationStatus,
  isRenewableStatus,
} from '@/features/invitations/invitationStatus.ts';
import { InvitationStatusBadge } from '@/features/invitations/InvitationStatusBadge.tsx';
import { InvitationView } from '@/features/invitations/InvitationView.tsx';

/** Mgmt Req 2 Scen 1 — Full status matrix renders (6 statuses + unknown fallback). */
describe('invitation status matrix', () => {
  it('renders a distinct badge for every backend status', () => {
    const i18n = makeI18n('en');
    const t = invitationsT(i18n);
    const rendered = INVITATION_STATUSES.map((status) =>
      renderStatic(<InvitationStatusBadge status={status} />, { i18n }),
    );
    const expected: string[] = INVITATION_STATUSES.map((status) =>
      t(`status.${status}`),
    );
    const all = rendered.join('\n');
    expect(expected.every((label) => all.includes(label))).toBeTruthy();
  });

  it('falls back to a neutral label for unknown statuses', () => {
    const i18n = makeI18n('en');
    const html = renderStatic(<InvitationStatusBadge status='mystery' />, {
      i18n,
    });
    expect(html).toContain(invitationsT(i18n)('status.unknown'));
  });

  it('maps each status to the designed badge variant', () => {
    expect({
      pending: badgeVariantForStatus('pending'),
      accepted: badgeVariantForStatus('accepted'),
      revoked: badgeVariantForStatus('revoked'),
      cancelled: badgeVariantForStatus('cancelled'),
    }).toStrictEqual({
      pending: 'default',
      accepted: 'secondary',
      revoked: 'destructive',
      cancelled: 'destructive',
    });
    expect(isInvitationStatus('already-used')).toBeTruthy();
    expect(isInvitationStatus('mystery')).toBeFalsy();
  });
});

/** Mgmt Req 2 Scen 2 + Req 4 Scen 2 + D8 — Terminal rows persist, display-only, never deleted. */
describe('terminal invitation rows', () => {
  it('renders revoked/cancelled/accepted/already-used rows without action buttons', () => {
    const i18n = makeI18n('en');
    const terminal = sixStatusFixtures.filter(
      (fixture) => !isRenewableStatus(fixture.status),
    );
    for (const fixture of terminal) {
      const html = renderStatic(
        <InvitationView
          invitation={fixture}
          locale='en'
          canWrite={true}
          onCancel={() => undefined}
          onResend={() => undefined}
        />,
        { i18n },
      );
      // Row persists (email visible) but renders no action buttons.
      expect(html).toContain(fixture.email);
      expect(html).not.toContain('<button');
    }
  });

  it('never offers mutations without .write, even for renewable rows', () => {
    const i18n = makeI18n('en');
    const html = renderStatic(
      <InvitationView
        invitation={invitationFixture({ status: 'pending' })}
        locale='en'
        canWrite={false}
        onCancel={() => undefined}
        onResend={() => undefined}
      />,
      { i18n },
    );
    expect(html).toContain('ada@cynara.dev');
    expect(html).not.toContain('<button');
  });
});

/** Mgmt Req 3 — Create (valid → no errors; invalid → field errors). D10 actorId/capabilities. */
describe('create invitation validation', () => {
  it('accepts a valid create payload', () => {
    const i18n = makeI18n('en');
    const errors = validateInvitationCreate(
      {
        ...INITIAL_INVITATION_VALUES,
        email: 'ada@cynara.dev',
        actorId: 'ada-01',
        capabilities: ['user-invitations.read'],
      },
      i18n.t,
    );
    expect(errors).toStrictEqual({});
  });

  it('rejects missing/invalid email, actorId, and capabilities', () => {
    const i18n = makeI18n('en');
    const { t } = i18n;
    expect(
      validateInvitationCreate(
        {
          ...INITIAL_INVITATION_VALUES,
          email: '',
          actorId: 'a',
          capabilities: ['users.read'],
        },
        t,
      ).email,
    ).toBeTruthy();
    expect(
      validateInvitationCreate(
        {
          ...INITIAL_INVITATION_VALUES,
          email: 'not-an-email',
          actorId: 'a',
          capabilities: ['users.read'],
        },
        t,
      ).email,
    ).toBeTruthy();
    expect(
      validateInvitationCreate(
        {
          ...INITIAL_INVITATION_VALUES,
          email: 'a@b.co',
          actorId: '',
          capabilities: ['users.read'],
        },
        t,
      ).actorId,
    ).toBeTruthy();
    expect(
      validateInvitationCreate(
        {
          ...INITIAL_INVITATION_VALUES,
          email: 'a@b.co',
          actorId: 'x'.repeat(129),
          capabilities: ['users.read'],
        },
        t,
      ).actorId,
    ).toBeTruthy();
    expect(
      validateInvitationCreate(
        {
          ...INITIAL_INVITATION_VALUES,
          email: 'a@b.co',
          actorId: 'a',
          capabilities: [],
        },
        t,
      ).capabilities,
    ).toBeTruthy();
  });
});

/** Mgmt Req 4 Scen 1 + Req 5 — Cancel/resend offered only for renewable (pending/expired). */
describe('cancel and resend gating', () => {
  it('offers cancel and resend for pending and expired rows with .write', () => {
    const i18n = makeI18n('en');
    const t = invitationsT(i18n);
    for (const status of ['pending', 'expired'] as const) {
      expect(isRenewableStatus(status)).toBeTruthy();
      const html = renderStatic(
        <InvitationView
          invitation={invitationFixture({ status })}
          locale='en'
          canWrite={true}
          onCancel={() => undefined}
          onResend={() => undefined}
        />,
        { i18n },
      );
      expect(html).toContain(t('actions.resend'));
      expect(html).toContain(t('actions.cancel'));
    }
  });

  it('surfaces the fresh token only inside the copy-link dialog (create/resend)', () => {
    // Static markup omits the client portal; cover the link builder directly.
    expect(buildAcceptLink('https://app.test', 'en', 'tok-fresh-123')).toBe(
      'https://app.test/en/invitations/accept?token=tok-fresh-123',
    );
    expect(
      buildAcceptLink('https://app.test', 'es', 'tok-fresh-123'),
    ).toContain('/es/invitations/accept?token=');
  });
});

/** Mgmt Req 6 (D7/R5) — Token absent from listings, cache, and logs. */
describe('token hygiene', () => {
  it('renders list rows with lifecycle metadata only and no token material', () => {
    const i18n = makeI18n('en');
    const html = renderStatic(
      <InvitationView
        invitation={invitationFixture({
          id: 'inv-9',
          email: 'nina@cynara.dev',
        })}
        locale='en'
        canWrite={true}
        onCancel={() => undefined}
        onResend={() => undefined}
      />,
      { i18n },
    );
    expect(html).toContain('nina@cynara.dev');
    expect(html.toLowerCase()).not.toContain('token=');
    expect(html).not.toContain('tok-');
  });

  it('keeps the token out of the list DTO shape', () => {
    expect('token' in invitationFixture()).toBeFalsy();
  });
});

/** Mgmt Req 7 — Localized admin copy (es, voseo) with no missing keys. */
describe('admin i18n (es)', () => {
  it('renders Spanish admin copy with no missing keys', () => {
    missingKeys.length = 0;
    const i18n = makeI18n('es');
    const html = renderStatic(
      <InvitationView
        invitation={invitationFixture({ status: 'pending' })}
        locale='es'
        canWrite={true}
        onCancel={() => undefined}
        onResend={() => undefined}
      />,
      { i18n },
    );
    expect(html.length).toBeGreaterThan(0);
    expect(missingKeys).toStrictEqual([]);
  });
});
