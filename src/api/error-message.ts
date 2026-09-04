import type { TFunction } from 'i18next';

import { ApiError } from '@/api/client.ts';

/**
 * Translate an `ApiError` into a human-readable, locale-aware message. Falls
 * back to the API-provided `detail`/`title` if no rule matches, then to a
 * generic unknown-error string. Designed to be safe to call without i18n
 * (the bare fallback is always returned).
 *
 * Accepts plain `{ status }` records as well as `ApiError` instances because
 * TanStack Start server functions serialize thrown errors across the
 * client/server boundary, dropping the prototype while keeping the fields.
 * Without this, server-side statuses (notably 429) would surface as generic
 * unknown errors on anonymous flows like invitation acceptance.
 */
export function describeApiError(error: unknown, translate: TFunction): string {
  let status: number | null = null;
  if (error instanceof ApiError) {
    ({ status } = error);
  } else if (isStatusRecord(error)) {
    ({ status } = error);
  }
  if (status === null) {
    return translate('api:errors.unknown');
  }

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

  const { message, title } = errorText(error);
  if (message.trim().length > 0) {
    return message;
  }
  if (title.trim().length > 0) {
    return title;
  }
  return translate('api:errors.unknown');
}

function errorText(error: unknown): { message: string; title: string } {
  if (error instanceof ApiError) {
    const { message, title } = error;
    return { message, title };
  }
  if (isRecord(error)) {
    const { message, title } = error;
    return {
      message: typeof message === 'string' ? message : '',
      title: typeof title === 'string' ? title : '',
    };
  }
  return { message: '', title: '' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStatusRecord(value: unknown): value is { status: number } {
  return (
    isRecord(value) &&
    typeof value.status === 'number' &&
    Number.isInteger(value.status)
  );
}
