import type { TFunction } from 'i18next';

import type { WorkflowValidationIssue } from '@/features/workflows/types.ts';

function extractQuotedValue(
  message: string,
  label: string,
): string | undefined {
  const match = new RegExp(`${label} '([^']+)'`).exec(message);
  return match?.[1];
}

export function translateWorkflowIssue(
  issue: WorkflowValidationIssue,
  t: TFunction<'workflows'>,
): string {
  switch (issue.code) {
    case 'INVALID_NODE_ID':
    case 'DUPLICATE_NODE_ID':
    case 'UNREACHABLE_NODE': {
      const id = extractQuotedValue(issue.message, 'id');
      return t(`issues.${issue.code}`, { id: id ?? '' });
    }
    case 'CONDITION_UNKNOWN_REF': {
      const ref = extractQuotedValue(issue.message, 'ref');
      return t(`issues.${issue.code}`, { ref: ref ?? '' });
    }
    default: {
      return t(`issues.${issue.code}`, {
        defaultValue: issue.message,
      });
    }
  }
}
