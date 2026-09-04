import type { TFunction } from 'i18next';

import type { CapabilityCode } from '@/lib/capabilities.ts';

export interface InvitationCreateValues {
  email: string;
  actorId: string;
  capabilities: CapabilityCode[];
  name: string;
  surname: string;
  phone: string;
  language: string;
}

export interface InvitationFieldErrors {
  email?: string;
  actorId?: string;
  capabilities?: string;
}

export const INITIAL_INVITATION_VALUES: InvitationCreateValues = {
  email: '',
  actorId: '',
  capabilities: [],
  name: '',
  surname: '',
  phone: '',
  language: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const ACTOR_ID_MAX_LENGTH = 128;

/** Create-dialog validation; the server remains authoritative for taken actor ids and memberships. */
export function validateInvitationCreate(
  values: InvitationCreateValues,
  t: TFunction,
): InvitationFieldErrors {
  const errors: InvitationFieldErrors = {};

  const email = values.email.trim();
  if (email.length === 0) {
    errors.email = t('create.errors.emailRequired');
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = t('create.errors.emailInvalid');
  }

  const actorId = values.actorId.trim();
  if (actorId.length === 0) {
    errors.actorId = t('create.errors.actorIdRequired');
  } else if (actorId.length > ACTOR_ID_MAX_LENGTH) {
    errors.actorId = t('create.errors.actorIdLength');
  }

  if (values.capabilities.length === 0) {
    errors.capabilities = t('create.errors.capabilitiesRequired');
  }

  return errors;
}
