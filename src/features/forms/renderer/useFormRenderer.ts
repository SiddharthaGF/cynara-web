import { evaluateRules } from '@cynara/rule-engine';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { iterateFields } from '@/features/forms/model/formDraft.ts';

import { analyzeSnapshot } from './analyzeSnapshot.ts';
import { collectFieldErrors } from './collectFieldErrors.ts';
import {
  addRepeaterRow,
  createInitialValues,
  flattenValuesForRules,
  getRepeaterRows,
  removeRepeaterRow,
  setRepeaterRowValue,
  setScalarValue,
} from './formValues.ts';
import { translateFieldValidationIssue } from './translateFieldValidationIssue.ts';
import type { FormSnapshot, FormValues } from './types.ts';

interface UseFormRendererOptions {
  model: FormSnapshot;
  readOnly?: boolean;
  initialValues?: FormValues;
}

export function useFormRenderer({
  model,
  readOnly = false,
  initialValues,
}: UseFormRendererOptions) {
  const { t } = useTranslation('validation');
  const [values, setValues] = useState<FormValues>(
    () => initialValues ?? createInitialValues(model),
  );
  const [showValidation, setShowValidation] = useState(false);

  const configWarnings = useMemo(() => analyzeSnapshot(model, t), [model, t]);

  const evaluation = useMemo(
    () =>
      evaluateRules(
        model.clinical,
        model.rules,
        flattenValuesForRules(values),
        model.ui,
      ),
    [model, values],
  );

  const fieldErrors = useMemo(() => {
    if (!showValidation) {
      return {};
    }
    return collectFieldErrors(model, values, evaluation, (issue) =>
      translateFieldValidationIssue(issue, t),
    );
  }, [evaluation, model, showValidation, t, values]);

  const resetValues = useCallback(() => {
    setValues(initialValues ?? createInitialValues(model));
    setShowValidation(false);
  }, [initialValues, model]);

  const triggerValidation = useCallback(() => {
    setShowValidation(true);
  }, []);

  const onValueChange = useCallback((code: string, value: unknown) => {
    setValues((current) => setScalarValue(current, code, value));
  }, []);

  const onRepeaterRowChange = useCallback(
    (
      repeaterCode: string,
      rowIndex: number,
      childCode: string,
      value: unknown,
    ) => {
      setValues((current) =>
        setRepeaterRowValue(current, repeaterCode, rowIndex, childCode, value),
      );
    },
    [],
  );

  const onAddRepeaterRow = useCallback(
    (repeaterCode: string) => {
      const field = [...iterateFields(model.clinical.fields)].find(
        (item) => item.code === repeaterCode && item.type === 'repeater',
      );
      if (!field) {
        return;
      }
      const currentRows = getRepeaterRows(values, repeaterCode);
      if (
        field.maxItems !== undefined &&
        currentRows.length >= field.maxItems
      ) {
        return;
      }
      setValues((current) => addRepeaterRow(current, field));
    },
    [model.clinical.fields, values],
  );

  const onRemoveRepeaterRow = useCallback(
    (repeaterCode: string, rowIndex: number) => {
      const field = [...iterateFields(model.clinical.fields)].find(
        (item) => item.code === repeaterCode && item.type === 'repeater',
      );
      if (!field) {
        return;
      }
      const currentRows = getRepeaterRows(values, repeaterCode);
      if (
        field.minItems !== undefined &&
        currentRows.length <= field.minItems
      ) {
        return;
      }
      setValues((current) =>
        removeRepeaterRow(current, repeaterCode, rowIndex),
      );
    },
    [model.clinical.fields, values],
  );

  const hasValidationErrors =
    Object.keys(fieldErrors).length > 0 ||
    evaluation.validationErrors.length > 0;

  return {
    values,
    readOnly,
    showValidation,
    evaluation,
    fieldErrors,
    configWarnings,
    hasValidationErrors,
    resetValues,
    triggerValidation,
    onValueChange,
    onRepeaterRowChange,
    onAddRepeaterRow,
    onRemoveRepeaterRow,
  };
}

export type UseFormRendererReturn = ReturnType<typeof useFormRenderer>;
