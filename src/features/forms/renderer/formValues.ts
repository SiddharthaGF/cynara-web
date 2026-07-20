import { iterateFields } from '@/features/forms/model/formDraft.ts';
import type { ClinicalField, FormDraftModel } from '@/features/forms/types.ts';

import type { FormValues, RepeaterRowValues } from './types.ts';

export function createInitialValues(model: FormDraftModel): FormValues {
  const values: FormValues = {};

  for (const field of iterateFields(model.clinical.fields)) {
    if (field.default !== undefined && field.type !== 'repeater') {
      values[field.code] = field.default;
    }

    if (field.type === 'repeater') {
      const minItems = field.minItems ?? 0;
      const rows: RepeaterRowValues[] = [];
      for (let index = 0; index < Math.max(minItems, 0); index += 1) {
        rows.push(createRepeaterRowDefaults(field));
      }
      values[field.code] = rows;
    }
  }

  return values;
}

function createRepeaterRowDefaults(field: ClinicalField): RepeaterRowValues {
  const row: RepeaterRowValues = {};
  for (const child of field.items ?? []) {
    if (child.default !== undefined) {
      row[child.code] = child.default;
    }
  }
  return row;
}

export function flattenValuesForRules(values: FormValues): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  for (const [code, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      const rows = value as RepeaterRowValues[];
      for (const row of rows) {
        for (const [childCode, childValue] of Object.entries(row)) {
          flat[childCode] = childValue;
        }
      }
      flat[code] = rows.length;
    } else {
      flat[code] = value;
    }
  }

  return flat;
}

export function getRepeaterRows(values: FormValues, repeaterCode: string): RepeaterRowValues[] {
  const raw = values[repeaterCode];
  return Array.isArray(raw) ? (raw as RepeaterRowValues[]) : [];
}

export function setScalarValue(
  values: FormValues,
  code: string,
  value: unknown,
): FormValues {
  return { ...values, [code]: value };
}

export function setRepeaterRowValue(
  values: FormValues,
  repeaterCode: string,
  rowIndex: number,
  childCode: string,
  value: unknown,
): FormValues {
  const rows = [...getRepeaterRows(values, repeaterCode)];
  rows[rowIndex] = {
    ...rows[rowIndex],
    [childCode]: value,
  };
  return { ...values, [repeaterCode]: rows };
}

export function addRepeaterRow(
  values: FormValues,
  field: ClinicalField,
): FormValues {
  const rows = [...getRepeaterRows(values, field.code), createRepeaterRowDefaults(field)];
  return { ...values, [field.code]: rows };
}

export function removeRepeaterRow(
  values: FormValues,
  repeaterCode: string,
  rowIndex: number,
): FormValues {
  const rows = getRepeaterRows(values, repeaterCode).filter(
    (_, index) => index !== rowIndex,
  );
  return { ...values, [repeaterCode]: rows };
}

export function getScalarValue(values: FormValues, code: string): unknown {
  return values[code];
}

export function getRepeaterChildValue(
  values: FormValues,
  repeaterCode: string,
  rowIndex: number,
  childCode: string,
): unknown {
  return getRepeaterRows(values, repeaterCode)[rowIndex]?.[childCode];
}
