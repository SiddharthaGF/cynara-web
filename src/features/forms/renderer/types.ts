import type { FormRuleEvaluationResult } from '@cynara/rule-engine';

import type { FormDraftModel } from '@/features/forms/types.ts';

export type FormValues = Record<string, unknown>;

export type RepeaterRowValues = Record<string, unknown>;

export interface FormRendererContext {
  model: FormSnapshot;
  values: FormValues;
  readOnly: boolean;
  showValidation: boolean;
  evaluation: FormRuleEvaluationResult;
  fieldErrors: Record<string, string[]>;
  /**
   * When true, fields whose visibility rule currently resolves to false are
   * still rendered in the preview (with a "conditional" badge and a muted
   * surface) so authors can see every authored field. Defaults to false so
   * existing consumers behave as before.
   */
  showConditionalFields?: boolean;
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
