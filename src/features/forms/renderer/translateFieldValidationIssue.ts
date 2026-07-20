import type { TFunction } from 'i18next';

import type { FieldValidationIssue } from './validateFieldValue.ts';

export function translateFieldValidationIssue(
  issue: FieldValidationIssue,
  t: TFunction<'validation'>,
): string {
  return t(`fieldErrors.${issue.code}`, {
    defaultValue: issue.code,
    ...issue.params,
  });
}
