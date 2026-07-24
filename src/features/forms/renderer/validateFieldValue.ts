import type { ClinicalField } from '@/features/forms/types.ts';
import { isMultipleOf } from '@/lib/number-format.ts';

export interface FieldValidationIssue {
  code: string;
  params?: Record<string, string | number>;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

export function validateClinicalField(
  field: ClinicalField,
  value: unknown,
  required: boolean,
): FieldValidationIssue[] {
  const errors: FieldValidationIssue[] = [];

  if (required && isEmpty(value)) {
    errors.push({ code: 'REQUIRED' });
    return errors;
  }

  if (isEmpty(value)) {
    return errors;
  }

  if (field.type === 'text' || field.type === 'textarea') {
    const text = String(value);
    if (field.minLength !== undefined && text.length < field.minLength) {
      errors.push({ code: 'MIN_LENGTH', params: { count: field.minLength } });
    }
    if (field.maxLength !== undefined && text.length > field.maxLength) {
      errors.push({ code: 'MAX_LENGTH', params: { count: field.maxLength } });
    }
    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(text)) {
          errors.push({ code: 'PATTERN_MISMATCH' });
        }
      } catch {
        errors.push({ code: 'INVALID_PATTERN' });
      }
    }
  }

  if (field.type === 'number' || field.type === 'integer') {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      errors.push({ code: 'INVALID_NUMBER' });
      return errors;
    }
    if (field.type === 'integer' && !Number.isInteger(numeric)) {
      errors.push({ code: 'WHOLE_NUMBER_REQUIRED' });
    }
    if (field.minimum !== undefined && numeric < field.minimum) {
      errors.push({ code: 'MIN_VALUE', params: { value: field.minimum } });
    }
    if (field.maximum !== undefined && numeric > field.maximum) {
      errors.push({ code: 'MAX_VALUE', params: { value: field.maximum } });
    }
    if (
      field.multipleOf !== undefined &&
      field.multipleOf > 0 &&
      !isMultipleOf(numeric, field.multipleOf)
    ) {
      errors.push({ code: 'MULTIPLE_OF', params: { value: field.multipleOf } });
    }
  }

  if (field.type === 'choice' && field.options?.length) {
    const allowed = new Set(field.options.map((option) => option.value));
    if (field.allowMultiple) {
      const selected = Array.isArray(value) ? value : [value];
      for (const item of selected) {
        if (!allowed.has(String(item))) {
          errors.push({ code: 'INVALID_OPTION' });
        }
      }
    } else if (!allowed.has(String(value))) {
      errors.push({ code: 'INVALID_OPTION' });
    }
  }

  return errors;
}

export function validateRepeaterField(
  field: ClinicalField,
  rows: unknown,
): FieldValidationIssue[] {
  const errors: FieldValidationIssue[] = [];
  const rowList = Array.isArray(rows) ? rows : [];

  if (field.minItems !== undefined && rowList.length < field.minItems) {
    errors.push({ code: 'MIN_ROWS', params: { count: field.minItems } });
  }
  if (field.maxItems !== undefined && rowList.length > field.maxItems) {
    errors.push({ code: 'MAX_ROWS', params: { count: field.maxItems } });
  }

  return errors;
}
