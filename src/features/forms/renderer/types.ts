import type { FormRuleEvaluationResult } from '@cynara/rule-engine';

import { parseDraft } from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel, FormVersion } from '@/features/forms/types.ts';

export type FormValues = Record<string, unknown>;

export type RepeaterRowValues = Record<string, unknown>;

export interface FormRendererContext {
  model: FormSnapshot;
  values: FormValues;
  readOnly: boolean;
  showValidation: boolean;
  evaluation: FormRuleEvaluationResult;
  fieldErrors: Record<string, string[]>;
  onValueChange: (code: string, value: unknown) => void;
  onRepeaterRowChange: (
    repeaterCode: string,
    rowIndex: number,
    childCode: string,
    value: unknown,
  ) => void;
  onAddRepeaterRow: (repeaterCode: string) => void;
  onRemoveRepeaterRow: (repeaterCode: string, rowIndex: number) => void;
}

export interface ConfigWarning {
  code: string;
  message: string;
  fieldId?: string;
}

export type FormSnapshot = FormDraftModel;

export function parseFormSnapshot(version: {
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
}): FormSnapshot {
  return parseDraft(version);
}

export function parsePublishedSnapshot(version: FormVersion): FormSnapshot {
  return parseDraft(version);
}
