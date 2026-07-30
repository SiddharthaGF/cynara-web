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
    return translate('errors.unknown');
  }

  const { status } = error;
  if (status === 0 || status === 504 || status === 502 || status === 503) {
    return translate('errors.network');
  }
  if (status === 401) {
    return translate('errors.unauthorized');
  }
  if (status === 403) {
    return translate('errors.forbidden');
  }
  if (status === 404) {
    return translate('errors.notFound');
  }
  if (status === 409) {
    return translate('errors.conflict');
  }
  if (status === 412) {
    return translate('errors.preconditionFailed');
  }
  if (status === 422 || status === 400) {
    return translate('errors.validation');
  }
  if (status === 429) {
    return translate('errors.rateLimited');
  }
  if (status >= 500) {
    return translate('errors.server');
  }

  if (error.message && error.message.trim().length > 0) {
    return error.message;
  }
  if (error.title && error.title.trim().length > 0) {
    return error.title;
  }
  return translate('errors.unknown');
}
