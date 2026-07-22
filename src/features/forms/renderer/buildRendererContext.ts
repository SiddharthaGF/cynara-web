import type { FormDraftModel } from '@/features/forms/types.ts';

import type { FormRendererContext } from './types.ts';
import type { UseFormRendererReturn } from './useFormRenderer.ts';

export function buildRendererContext(
  model: FormDraftModel,
  renderer: UseFormRendererReturn,
  options?: { showConditionalFields?: boolean },
): FormRendererContext {
  return {
    model,
    values: renderer.values,
    readOnly: renderer.readOnly,
    showValidation: renderer.showValidation,
    evaluation: renderer.evaluation,
    fieldErrors: renderer.fieldErrors,
    showConditionalFields: options?.showConditionalFields ?? false,
    onValueChange: renderer.onValueChange,
    onRepeaterRowChange: renderer.onRepeaterRowChange,
    onAddRepeaterRow: renderer.onAddRepeaterRow,
    onRemoveRepeaterRow: renderer.onRemoveRepeaterRow,
  };
}
