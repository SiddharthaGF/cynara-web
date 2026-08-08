import type { SearchSchemaInput } from '@tanstack/react-router';

import { DEFAULT_FORM_PAGE_SIZE } from '@/api/forms.ts';

export interface FormListSearch {
  page: number;
  pageSize: number;
}

export type FormListSearchInput = Partial<FormListSearch> & SearchSchemaInput;

function positiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function validateFormListSearch(
  search: FormListSearchInput,
): FormListSearch {
  return {
    page: positiveInt(search.page, 1),
    pageSize: positiveInt(search.pageSize, DEFAULT_FORM_PAGE_SIZE),
  };
}
