'use client';

import { ClockIcon } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type JSX,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import {
  buildHourOptions,
  buildMinuteOptions,
  buildSecondOptions,
  createSyntheticChangeEvent,
  createSyntheticInputEvent,
  formatNowTime,
  formatTimeParts,
  msToTimeParts,
  normalizeTimeValue,
  parseBoundaryTime,
  parseTimeString,
  resolveTimeStep,
  snapTimeMs,
  timePartsToMs,
  type ParsedTime,
} from '@/components/ui/time-input-utils.ts';
import type { TimePreset } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

/** Total width shared by the trigger and the scroll picker panel. */
const TIME_PICKER_WIDTH = {
  minutes: '5.25rem',
  seconds: '7.75rem',
} as const;

function timePickerWidth(showSeconds: boolean): string {
  return showSeconds ? TIME_PICKER_WIDTH.seconds : TIME_PICKER_WIDTH.minutes;
}

function timePickerShellClass(compact: boolean): string {
  return compact ? 'shrink-0' : 'w-full min-w-0';
}

/** Layout helper for time fields inside form columns (preview + renderer). */
export const TIME_FIELD_LAYOUT_CLASS = 'w-full min-w-0';

interface TimeInputProps
  extends Omit<
    ComponentProps<'input'>,
    'type' | 'value' | 'defaultValue' | 'onChange' | 'step'
  > {
  value?: string;
  defaultValue?: string;
  step?: number | string;
  /** Fixed width for datetime rows; standalone fields fill the field column. */
  compact?: boolean;
  /** Quick-fill presets configured in the UI schema. */
  presets?: TimePreset[];
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
}

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  {
    className,
    value,
    defaultValue = '',
    min,
    max,
    step,
    disabled,
    readOnly,
    required,
    compact = false,
    presets,
    name,
    id,
    placeholder,
    onChange,
    onValueChange,
    onInput,
    onBlur,
    onFocus,
    ...props
  },
  ref,
): JSX.Element {
  const { t } = useTranslation('common');
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const currentValue = isControlled ? (value ?? '') : uncontrolledValue;
  const interactive = !disabled && !readOnly;
  const { stepSeconds, allowAny, showSeconds } = resolveTimeStep(step);
  const minMs = parseBoundaryTime(typeof min === 'string' ? min : undefined);
  const maxMs = parseBoundaryTime(typeof max === 'string' ? max : undefined);
  const emptyPlaceholder = placeholder ?? (showSeconds ? '--:--:--' : '--:--');
  const pickerWidth = timePickerWidth(showSeconds);

  useImperativeHandle(ref, () => hiddenRef.current as HTMLInputElement);

  const parsedValue = useMemo(
    () => parseTimeString(currentValue) ?? { hours: 0, minutes: 0, seconds: 0 },
    [currentValue],
  );

  const hourOptions = useMemo(() => buildHourOptions(), []);
  const minuteOptions = useMemo(
    () => buildMinuteOptions(stepSeconds, allowAny),
    [allowAny, stepSeconds],
  );
  const secondOptions = useMemo(
    () => (showSeconds ? buildSecondOptions(stepSeconds, allowAny) : []),
    [allowAny, showSeconds, stepSeconds],
  );

  useEffect(() => {
    if (hiddenRef.current) {
      hiddenRef.current.value = currentValue;
    }
  }, [currentValue]);

  function commitValue(nextValue: string): void {
    const normalized = normalizeTimeValue(
      nextValue,
      typeof min === 'string' ? min : undefined,
      typeof max === 'string' ? max : undefined,
      step,
    );

    if (!isControlled) {
      setUncontrolledValue(normalized);
    }

    if (hiddenRef.current) {
      hiddenRef.current.value = normalized;
    }

    onValueChange?.(normalized);

    const target = hiddenRef.current;
    if (!target) {
      return;
    }

    onChange?.(createSyntheticChangeEvent(normalized, target));
    onInput?.(createSyntheticInputEvent(normalized, target));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (!interactive) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const base = parseTimeString(currentValue) ?? { hours: 0, minutes: 0, seconds: 0 };
      const direction = event.key === 'ArrowUp' ? 1 : -1;
      const nextMs = snapTimeMs(
        timePartsToMs(base) + direction * stepSeconds * 1_000,
        minMs,
        maxMs,
        stepSeconds,
        allowAny,
      );
      commitValue(formatTimeParts(msToTimeParts(nextMs), showSeconds));
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handlePartSelect(part: keyof ParsedTime, nextPartValue: string): void {
    const base = parseTimeString(currentValue) ?? { hours: 0, minutes: 0, seconds: 0 };
    const next: ParsedTime = {
      ...base,
      [part]: Number(nextPartValue),
    };
    const nextMs = snapTimeMs(
      timePartsToMs(next),
      minMs,
      maxMs,
      stepSeconds,
      allowAny,
    );
    commitValue(formatTimeParts(msToTimeParts(nextMs), showSeconds));
  }

  const showNowPreset = interactive && presets?.includes('now') === true;

  function handleNowPreset(): void {
    commitValue(
      formatNowTime(
        step,
        typeof min === 'string' ? min : undefined,
        typeof max === 'string' ? max : undefined,
      ),
    );
    setOpen(false);
  }

  const picker = (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!interactive) {
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        id={showNowPreset ? undefined : inputId}
        disabled={!interactive}
        aria-label={currentValue ? undefined : t('timeInput.openPicker')}
        aria-haspopup='listbox'
        aria-expanded={open}
        render={
          <button
            type='button'
            data-slot='time-input-trigger'
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1 text-sm transition-colors outline-none select-none',
              compact ? 'shrink-0' : 'w-full min-w-0',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
              'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
              'dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
              !currentValue && 'text-muted-foreground',
              open && 'border-ring ring-3 ring-ring/50',
              className,
            )}
            style={compact ? { width: pickerWidth } : undefined}
            onKeyDown={handleKeyDown}
            onFocus={onFocus as ComponentProps<'button'>['onFocus']}
            onBlur={onBlur as unknown as ComponentProps<'button'>['onBlur']}
            aria-required={required}
            aria-invalid={props['aria-invalid']}
          />
        }
      >
        <ClockIcon
          className={cn(
            'size-4 shrink-0 text-muted-foreground',
            open && 'text-primary',
          )}
        />
        <span className='min-w-0 flex-1 truncate text-center tabular-nums tracking-wide'>
          {currentValue || emptyPlaceholder}
        </span>
      </PopoverTrigger>

      <PopoverContent
        align='start'
        sideOffset={4}
        className='w-(--anchor-width) min-w-0 overflow-hidden p-0'
      >
        <TimePickerPanel
          hours={String(parsedValue.hours).padStart(2, '0')}
          minutes={String(parsedValue.minutes).padStart(2, '0')}
          seconds={showSeconds ? String(parsedValue.seconds).padStart(2, '0') : undefined}
          hourOptions={hourOptions}
          minuteOptions={minuteOptions}
          secondOptions={secondOptions}
          open={open}
          onHourSelect={(next) => {
            handlePartSelect('hours', next);
          }}
          onMinuteSelect={(next) => {
            handlePartSelect('minutes', next);
          }}
          onSecondSelect={(next) => {
            handlePartSelect('seconds', next);
          }}
        />
      </PopoverContent>

      <input
        {...props}
        ref={hiddenRef}
        type='time'
        name={name}
        id={inputId}
        value={currentValue}
        min={typeof min === 'string' ? min : undefined}
        max={typeof max === 'string' ? max : undefined}
        step={step}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        tabIndex={-1}
        aria-hidden='true'
        className='hidden'
        onChange={() => undefined}
      />
    </Popover>
  );

  return (
    <div
      data-slot='time-input'
      className={cn(
        'flex items-center gap-2',
        compact ? 'shrink-0' : TIME_FIELD_LAYOUT_CLASS,
      )}
    >
      <div className={timePickerShellClass(compact)}>{picker}</div>
      {showNowPreset ? (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 shrink-0 px-2.5'
          onClick={handleNowPreset}
        >
          {t('timeInput.presets.now')}
        </Button>
      ) : null}
    </div>
  );
});

interface TimePickerPanelProps {
  hours: string;
  minutes: string;
  seconds?: string;
  hourOptions: string[];
  minuteOptions: string[];
  secondOptions: string[];
  open: boolean;
  onHourSelect: (value: string) => void;
  onMinuteSelect: (value: string) => void;
  onSecondSelect: (value: string) => void;
}

function TimePickerPanel({
  hours,
  minutes,
  seconds,
  hourOptions,
  minuteOptions,
  secondOptions,
  open,
  onHourSelect,
  onMinuteSelect,
  onSecondSelect,
}: TimePickerPanelProps): JSX.Element {
  const readout = seconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;

  return (
    <div className='w-full shrink-0 px-2 py-2'>
      <div
        role='listbox'
        aria-label={readout}
        className='relative'
      >
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 top-1/2 z-10 h-9 -translate-y-1/2 rounded-md border border-primary/20 bg-primary/8'
        />
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 top-0 z-20 h-8 bg-gradient-to-b from-popover via-popover/80 to-transparent'
        />
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8 bg-gradient-to-t from-popover via-popover/80 to-transparent'
        />

        <div className='relative z-0 flex items-center justify-center gap-0.5'>
          <TimeColumn
            options={hourOptions}
            selected={hours}
            open={open}
            onSelect={onHourSelect}
          />
          <TimeSeparator />
          <TimeColumn
            options={minuteOptions}
            selected={minutes}
            open={open}
            onSelect={onMinuteSelect}
          />
          {seconds !== undefined ? (
            <>
              <TimeSeparator />
              <TimeColumn
                options={secondOptions}
                selected={seconds}
                open={open}
                onSelect={onSecondSelect}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface TimeColumnProps {
  options: string[];
  selected: string;
  open: boolean;
  onSelect: (value: string) => void;
}

function TimeColumn({
  options,
  selected,
  open,
  onSelect,
}: TimeColumnProps): JSX.Element {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    selectedRef.current?.scrollIntoView({ block: 'center' });
  }, [open, selected]);

  return (
    <ScrollArea className='h-36 w-9 [&_[data-slot=scroll-area-scrollbar]]:hidden'>
      <div className='flex flex-col py-[3.375rem]'>
        {options.map((option) => {
          const isSelected = option === selected;

          return (
            <button
              key={option}
              ref={isSelected ? selectedRef : undefined}
              type='button'
              role='option'
              aria-selected={isSelected}
              data-selected={isSelected ? true : undefined}
              className={cn(
                'relative z-0 flex h-9 w-full cursor-default items-center justify-center rounded-md text-sm outline-hidden select-none transition-[color,opacity,transform] duration-150 tabular-nums',
                'hover:text-foreground focus-visible:text-foreground',
                isSelected
                  ? 'scale-[1.02] font-semibold text-primary motion-reduce:scale-100'
                  : 'text-muted-foreground/70',
              )}
              onClick={() => {
                onSelect(option);
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function TimeSeparator(): JSX.Element {
  return (
    <span
      aria-hidden
      className='text-base leading-none font-light text-muted-foreground/50 select-none'
    >
      :
    </span>
  );
}

export { TimeInput };
