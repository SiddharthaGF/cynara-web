import type { TFunction } from 'i18next';

import type { ValidationIssue } from '@/features/forms/types.ts';

function extractQuotedValue(
  message: string,
  label: string,
): string | undefined {
  const match = new RegExp(`${label} '([^']+)'`).exec(message);
  return match?.[1];
}

export function translateValidationIssue(
  issue: ValidationIssue,
  t: TFunction<'validation'>,
): string {
  switch (issue.code) {
    case 'DUPLICATE_FIELD_ID': {
      const id = extractQuotedValue(issue.message, 'id');
      return t('issues.DUPLICATE_FIELD_ID', { id: id ?? '' });
    }
    case 'DUPLICATE_FIELD_CODE': {
      const code = extractQuotedValue(issue.message, 'code');
      return t('issues.DUPLICATE_FIELD_CODE', { code: code ?? '' });
    }
    default: {
      return t(`issues.${issue.code}`, {
        defaultValue: issue.message,
      });
    }
  }
}
