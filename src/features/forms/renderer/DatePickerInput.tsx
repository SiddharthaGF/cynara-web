import { format, isValid, parse } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { TFunction } from 'i18next';
import { CalendarIcon } from 'lucide-react';
import { useMemo, useState, type JSX } from 'react';
import type { Labels } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Calendar } from '@/components/ui/calendar.tsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import { formatNowTime } from '@/components/ui/time-input-utils.ts';
import {
  TIME_FIELD_LAYOUT_CLASS,
  TimeInput,
} from '@/components/ui/time-input.tsx';
import type { ClinicalField, TimePreset } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

// Spanish day-picker formatters, built once at module scope (Intl construction is expensive).
const esMonthYearFormatter = new Intl.DateTimeFormat('es', {
  month: 'long',
  year: 'numeric',
});
const esWeekdayFormatter = new Intl.DateTimeFormat('es', { weekday: 'long' });

interface DatePickerInputProps {
  fieldType: Extract<ClinicalField['type'], 'date' | 'datetime'>;
  value: unknown;
  enabled: boolean;
  placeholder: string | undefined;
  inputId?: string;
  timePresets?: TimePreset[];
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  onChange: (value: unknown) => void;
}

export function DatePickerInput({
  fieldType,
  value,
  enabled,
  placeholder,
  inputId,
  timePresets,
  ariaInvalid = false,
  ariaRequired = false,
  onChange,
}: DatePickerInputProps): JSX.Element {
  const { i18n, t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | undefined>();
  const [pendingTime, setPendingTime] = useState('');
  const locale = i18n.language.startsWith('es') ? es : enUS;
  // ARIA labels follow the active language, not react-day-picker's default English.
  const labels = useMemo(
    () => localizedCalendarLabels(i18n.language, t),
    [i18n.language, t],
  );
  const storedDate = parseStoredDate(value, fieldType);
  const storedTime = fieldType === 'datetime' ? extractTimeValue(value) : '';
  const isValueEmpty = value === '' || value === undefined || value === null;
  const displayDate = isValueEmpty ? undefined : (storedDate ?? pendingDate);
  const displayTime = isValueEmpty ? '' : storedTime || pendingTime;

  const label = displayDate
    ? format(displayDate, 'PPP', { locale })
    : (placeholder ?? t('placeholders.selectDate'));

  function commitDateTime(date: Date, time: string): void {
    setPendingDate(undefined);
    setPendingTime('');
    onChange(combineDateAndTime(date, time));
  }

  function handleDateSelect(date: Date | undefined): void {
    if (fieldType !== 'datetime') {
      if (!date) {
        onChange('');
        return;
      }
      onChange(format(date, 'yyyy-MM-dd'));
      setOpen(false);
      return;
    }

    if (!date) {
      const time = storedTime || pendingTime;
      setPendingDate(undefined);
      if (time) {
        setPendingTime(time);
        onChange('');
        return;
      }
      setPendingTime('');
      onChange('');
      return;
    }

    const time = storedTime || pendingTime;
    if (time) {
      commitDateTime(date, time);
      return;
    }

    setPendingDate(date);
  }

  function handleTimeChange(nextTime: string): void {
    if (fieldType !== 'datetime') {
      return;
    }

    if (nextTime === '') {
      setPendingTime('');
      const date = storedDate ?? pendingDate;
      if (date) {
        setPendingDate(date);
        onChange('');
      }
      return;
    }

    const date = storedDate ?? pendingDate;
    if (date) {
      commitDateTime(date, nextTime);
      return;
    }

    setPendingTime(nextTime);
  }

  function handleNowPreset(): void {
    if (fieldType !== 'datetime' || !enabled) {
      return;
    }

    commitDateTime(new Date(), formatNowTime());
  }

  const showNowPreset = enabled && timePresets?.includes('now') === true;

  if (fieldType === 'datetime') {
    return (
      <div className={cn('flex items-center gap-2', TIME_FIELD_LAYOUT_CLASS)}>
        <div className='min-w-0 flex-1'>
          <Popover
            open={open}
            onOpenChange={setOpen}
          >
            <PopoverTrigger
              id={inputId}
              disabled={!enabled}
              render={
                <Button
                  type='button'
                  variant='outline'
                  aria-invalid={ariaInvalid || undefined}
                  aria-required={ariaRequired || undefined}
                  className={cn(
                    'w-full min-w-0 justify-start text-left font-normal',
                    !displayDate && 'text-muted-foreground',
                  )}
                />
              }
            >
              <CalendarIcon className='size-4 shrink-0' />
              <span className='truncate'>{label}</span>
            </PopoverTrigger>
            <PopoverContent
              className='w-auto p-0'
              align='start'
            >
              <Calendar
                mode='single'
                selected={displayDate}
                locale={locale}
                labels={labels}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <TimeInput
            compact
            value={displayTime}
            disabled={!enabled}
            onValueChange={handleTimeChange}
          />
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
      </div>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger
        id={inputId}
        disabled={!enabled}
        render={
          <Button
            type='button'
            variant='outline'
            aria-invalid={ariaInvalid || undefined}
            aria-required={ariaRequired || undefined}
            className={cn(
              'w-full justify-start text-left font-normal',
              !displayDate && 'text-muted-foreground',
            )}
          />
        }
      >
        <CalendarIcon className='size-4 shrink-0' />
        <span className='truncate'>{label}</span>
      </PopoverTrigger>
      <PopoverContent
        className='w-auto p-0'
        align='start'
      >
        <Calendar
          mode='single'
          selected={displayDate}
          locale={locale}
          labels={labels}
          captionLayout='dropdown'
          startMonth={new Date(1900, 0)}
          endMonth={new Date(2100, 11)}
          defaultMonth={displayDate}
          onSelect={handleDateSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * ARIA labels for the day-picker in the active language. Only Spanish needs
 * overrides — react-day-picker's defaults are already English.
 */
function localizedCalendarLabels(
  language: string,
  t: TFunction,
): Partial<Labels> | undefined {
  if (!language.toLowerCase().startsWith('es')) {
    return undefined;
  }
  return {
    labelPrevious: () => t('calendar.goToPreviousMonth'),
    labelNext: () => t('calendar.goToNextMonth'),
    labelMonthDropdown: () => t('calendar.chooseMonth'),
    labelYearDropdown: () => t('calendar.chooseYear'),
    labelNav: () => t('calendar.navigation'),
    labelGrid: (date) =>
      t('calendar.monthGrid', {
        month: esMonthYearFormatter.format(date),
      }),
    labelWeekday: (date) =>
      t('calendar.weekday', {
        weekday: esWeekdayFormatter.format(date),
      }),
  };
}

function parseStoredDate(
  value: unknown,
  fieldType: 'date' | 'datetime',
): Date | undefined {
  if (typeof value !== 'string' || value === '') {
    return undefined;
  }

  const datePart = fieldType === 'datetime' ? value.slice(0, 10) : value;
  const parsed = parse(datePart, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

function extractTimeValue(value: unknown): string {
  if (typeof value !== 'string' || value.length < 16) {
    return '';
  }

  const timePart = value.includes('T') ? value.split('T')[1] : value.slice(11);
  return timePart.slice(0, 5);
}

function combineDateAndTime(date: Date, time: string): string {
  const [hours = '00', minutes = '00'] = time.split(':');
  const next = new Date(date);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  return format(next, "yyyy-MM-dd'T'HH:mm");
}
