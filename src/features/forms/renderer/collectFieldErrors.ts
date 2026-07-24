import type { FormRuleEvaluationResult } from '@cynara/rule-engine';

import {
  collectRepeaterChildIds,
  iterateFields,
} from '@/features/forms/model/formDraft.ts';
import type { ClinicalField } from '@/features/forms/types.ts';

import { getRepeaterRows } from './formValues.ts';
import type { FormSnapshot, FormValues } from './types.ts';
import {
  type FieldValidationIssue,
  validateClinicalField,
  validateRepeaterField,
} from './validateFieldValue.ts';

function fieldErrorKey(fieldId: string, rowIndex?: number): string {
  return rowIndex === undefined ? fieldId : `${fieldId}::${rowIndex}`;
}

function isValidatableLeaf(field: ClinicalField): boolean {
  return (
    field.type !== 'group' &&
    field.type !== 'repeater' &&
    field.type !== 'component-ref'
  );
}

function translateIssues(
  issues: FieldValidationIssue[],
  translate: (issue: FieldValidationIssue) => string,
): string[] {
  return issues.map(translate);
}

function validateRepeaterRows(
  field: ClinicalField,
  values: FormValues,
  evaluation: FormRuleEvaluationResult,
  errors: Record<string, string[]>,
  translate: (issue: FieldValidationIssue) => string,
): void {
  const repeaterErrors = validateRepeaterField(field, values[field.code]);
  if (repeaterErrors.length > 0) {
    errors[field.id] = translateIssues(repeaterErrors, translate);
  }

  const rows = getRepeaterRows(values, field.code);
  for (const [rowIndex, row] of rows.entries()) {
    const validatableChildren = (field.items ?? []).filter(
      (child) => isValidatableLeaf(child) && evaluation.visibility[child.id],
    );
    for (const child of validatableChildren) {
      const childErrors = validateClinicalField(
        child,
        row[child.code],
        evaluation.required[child.id] ?? false,
      );
      if (childErrors.length > 0) {
        errors[fieldErrorKey(child.id, rowIndex)] = translateIssues(
          childErrors,
          translate,
        );
      }
    }
  }
}

export function collectFieldErrors(
  model: FormSnapshot,
  values: FormValues,
  evaluation: FormRuleEvaluationResult,
  translate: (issue: FieldValidationIssue) => string,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const repeaterChildIds = collectRepeaterChildIds(model.clinical.fields);

  for (const field of iterateFields(model.clinical.fields)) {
    if (field.type === 'repeater') {
      validateRepeaterRows(field, values, evaluation, errors, translate);
    } else if (
      isValidatableLeaf(field) &&
      !repeaterChildIds.has(field.id) &&
      evaluation.visibility[field.id]
    ) {
      const fieldValidation = validateClinicalField(
        field,
        values[field.code],
        evaluation.required[field.id] ?? false,
      );
      if (fieldValidation.length > 0) {
        errors[field.id] = translateIssues(fieldValidation, translate);
      }
    }
  }

  return errors;
}
