import { Minus, Plus } from 'lucide-react';
import { useEffect, useState, type ComponentProps, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group.tsx';
import {
  formatNumericDisplay,
  normalizeNumericValue,
} from '@/lib/number-format.ts';
import { cn } from '@/lib/utils.ts';

interface NumberInputProps
  extends Omit<ComponentProps<'input'>, 'type' | 'onChange' | 'value'> {
  value?: string | number | null;
  integer?: boolean;
  decimalPlaces?: number;
  onValueChange?: (value: number | null) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function normalizeDecimalInput(raw: string): string {
  return raw.replace(',', '.');
}

function parseNumber(raw: string, asInteger: boolean): number | null {
  const normalized = normalizeDecimalInput(raw.trim());
  if (normalized === '' || normalized === '-' || normalized === '.') {
    return null;
  }

  const parsed = asInteger
    ? Number.parseInt(normalized, 10)
    : Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function isPartialNumberInput(raw: string, asInteger: boolean): boolean {
  const normalized = normalizeDecimalInput(raw);
  if (normalized === '' || normalized === '-' || normalized === '-.') {
    return true;
  }

  if (asInteger) {
    return false;
  }

  return normalized.endsWith('.');
}

function formatExternalValue(
  value: string | number | null | undefined,
  integer: boolean,
  step?: number | string,
  decimalPlaces?: number,
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return '';
  }

  if (integer) {
    return String(value);
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }

  const stepAmount = typeof step === 'number' ? step : undefined;
  return formatNumericDisplay(numeric, {
    step: stepAmount,
    decimalPlaces,
  });
}

function NumberInput({
  className,
  value,
  integer = false,
  decimalPlaces,
  min,
  max,
  step,
  disabled,
  readOnly,
  onValueChange,
  onChange,
  onBlur,
  onFocus,
  ...props
}: NumberInputProps): JSX.Element {
  const { t } = useTranslation('common');
  const stepAmount = typeof step === 'number' ? step : undefined;
  const externalValue = formatExternalValue(
    value,
    integer,
    stepAmount,
    decimalPlaces,
  );
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(externalValue);
  const interactive = !disabled && !readOnly;
  const displayValue = isFocused ? draft : externalValue;
  const currentNumber = parseNumber(displayValue, integer);
  const increment = integer ? (stepAmount ?? 1) : (stepAmount ?? 1);

  useEffect(() => {
    if (!isFocused) {
      setDraft(externalValue);
    }
  }, [externalValue, isFocused]);

  function normalizeCommittedValue(next: number): number {
    return normalizeNumericValue(next, {
      integer,
      step: stepAmount,
      decimalPlaces,
      min: typeof min === 'number' ? min : undefined,
      max: typeof max === 'number' ? max : undefined,
    });
  }

  function commitNumber(next: number): void {
    const normalized = normalizeCommittedValue(next);
    const nextText = integer
      ? String(normalized)
      : formatNumericDisplay(normalized, {
          step: stepAmount,
          decimalPlaces,
        });
    setDraft(nextText);
    onValueChange?.(normalized);
  }

  function stepBy(direction: 1 | -1): void {
    const base = currentNumber ?? 0;
    commitNumber(base + direction * increment);
  }

  const canDecrease =
    interactive &&
    (currentNumber === null ||
      typeof min !== 'number' ||
      normalizeCommittedValue((currentNumber ?? 0) - increment) >= min);
  const canIncrease =
    interactive &&
    (currentNumber === null ||
      typeof max !== 'number' ||
      normalizeCommittedValue((currentNumber ?? 0) + increment) <= max);

  return (
    <InputGroup className={cn('w-full', className)}>
      <InputGroupAddon align='inline-start'>
        <InputGroupButton
          size='icon-xs'
          disabled={!canDecrease}
          aria-label={t('numberInput.decrease')}
          onClick={() => {
            stepBy(-1);
          }}
        >
          <Minus />
        </InputGroupButton>
      </InputGroupAddon>

      <InputGroupInput
        type='text'
        inputMode={integer ? 'numeric' : 'decimal'}
        value={displayValue}
        disabled={disabled}
        readOnly={readOnly}
        className='text-center'
        onFocus={(event) => {
          setIsFocused(true);
          setDraft(externalValue);
          onFocus?.(event);
        }}
        onChange={(event) => {
          onChange?.(event);
          const raw = normalizeDecimalInput(event.target.value);

          if (raw === '' || raw === '-') {
            setDraft(raw);
            onValueChange?.(null);
            return;
          }

          if (integer && !/^-?\d*$/.test(raw)) {
            return;
          }

          if (!integer && !/^-?\d*\.?\d*$/.test(raw)) {
            return;
          }

          setDraft(raw);

          if (isPartialNumberInput(raw, integer)) {
            return;
          }

          const parsed = parseNumber(raw, integer);
          if (parsed !== null) {
            onValueChange?.(parsed);
          }
        }}
        onBlur={(event) => {
          setIsFocused(false);

          if (draft === '' || draft === '-' || draft === '.' || draft === '-.') {
            setDraft('');
            onValueChange?.(null);
            onBlur?.(event);
            return;
          }

          const parsed = parseNumber(draft, integer);
          if (parsed === null) {
            setDraft(externalValue);
            onBlur?.(event);
            return;
          }

          commitNumber(parsed);
          onBlur?.(event);
        }}
        {...props}
      />

      <InputGroupAddon align='inline-end'>
        <InputGroupButton
          size='icon-xs'
          disabled={!canIncrease}
          aria-label={t('numberInput.increase')}
          onClick={() => {
            stepBy(1);
          }}
        >
          <Plus />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { NumberInput };
