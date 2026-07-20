import { useForm } from '@tanstack/react-form';
import { useEffect, useRef } from 'react';

function valuesEqual<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function fieldErrorText(errors: unknown[]): string | undefined {
  const [first] = errors;
  if (typeof first === 'string') {
    return first;
  }
  if (first && typeof first === 'object' && 'message' in first) {
    const {message} = (first);
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
}

/** Keeps TanStack Form in sync with props-driven defaults (designer panels). */
export function useSyncedTanstackForm<TFormData>(
  options: {
    defaultValues: TFormData;
    onValuesChange: (values: TFormData) => void;
  },
) {
  const { defaultValues, onValuesChange } = options;
  const onValuesChangeRef = useRef(onValuesChange);
  const defaultValuesRef = useRef(defaultValues);

  useEffect(() => {
    onValuesChangeRef.current = onValuesChange;
  }, [onValuesChange]);

  useEffect(() => {
    defaultValuesRef.current = defaultValues;
  }, [defaultValues]);

  const form = useForm({
    defaultValues,
    listeners: {
      onChange: ({ formApi }) => {
        const {values} = formApi.state;
        if (valuesEqual(values, defaultValuesRef.current)) {
          return;
        }
        onValuesChangeRef.current(values);
      },
    },
  });

  useEffect(() => {
    const current = form.state.values;
    const next = defaultValuesRef.current;
    if (!valuesEqual(current, next)) {
      form.reset(next);
    }
  }, [defaultValues, form]);

  return form;
}

export type SyncedTanstackForm<TFormData> = ReturnType<
  typeof useSyncedTanstackForm<TFormData>
>;
