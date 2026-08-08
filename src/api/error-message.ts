import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client.ts';

/**
 * Translate an `ApiError` into a human-readable, locale-aware message. Falls
 * back to the API-provided `detail`/`title` if no rule matches, then to a
 * generic unknown-error string. Designed to be safe to call without i18n
 * (the bare fallback is always returned).
 */
export function describeApiError(error: unknown, translate: TFunction): string {
  if (!(error instanceof ApiError)) {
    return translate('api:errors.unknown');
  }

  const { status } = error;
  if (status === 0 || status === 504 || status === 502 || status === 503) {
    return translate('api:errors.network');
  }
  if (status === 401) {
    return translate('api:errors.unauthorized');
  }
  if (status === 403) {
    return translate('api:errors.forbidden');
  }
  if (status === 404) {
    return translate('api:errors.notFound');
  }
  if (status === 409) {
    return translate('api:errors.conflict');
  }
  if (status === 412) {
    return translate('api:errors.preconditionFailed');
  }
  if (status === 422 || status === 400) {
    return translate('api:errors.validation');
  }
  if (status === 429) {
    return translate('api:errors.rateLimited');
  }
  if (status >= 500) {
    return translate('api:errors.server');
  }

  if (error.message && error.message.trim().length > 0) {
    return error.message;
  }
  if (error.title && error.title.trim().length > 0) {
    return error.title;
  }
  return translate('api:errors.unknown');
}
