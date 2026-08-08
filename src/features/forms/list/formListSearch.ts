import type { SearchSchemaInput } from '@tanstack/react-router';

import { DEFAULT_FORM_PAGE_SIZE } from '@/api/forms.ts';

export type FormFilterStatus = 'all' | 'draft' | 'review' | 'published';

const FORM_FILTER_STATUSES: ReadonlySet<FormFilterStatus> = new Set([
  'all',
  'draft',
  'review',
  'published',
]);

export interface FormListSearch {
  page: number;
  pageSize: number;
  query?: string;
  status?: FormFilterStatus;
}

export type FormListSearchInput = Partial<FormListSearch> & SearchSchemaInput;

function positiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function filterStatus(value: unknown): FormFilterStatus | undefined {
  if (
    typeof value !== 'string' ||
    !FORM_FILTER_STATUSES.has(value as FormFilterStatus)
  ) {
    return undefined;
  }
  return value as FormFilterStatus;
}

export function validateFormListSearch(
  search: FormListSearchInput,
): FormListSearch {
  const query =
    typeof search.query === 'string' ? search.query.trim() : undefined;
  const status = filterStatus(search.status) ?? 'all';
  return {
    page: positiveInt(search.page, 1),
    pageSize: positiveInt(search.pageSize, DEFAULT_FORM_PAGE_SIZE),
    ...(query && query.length > 0 ? { query } : {}),
    ...(status === 'all' ? {} : { status }),
  };
}
