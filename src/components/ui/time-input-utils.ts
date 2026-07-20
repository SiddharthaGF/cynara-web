import type { ChangeEvent, InputEvent } from 'react';

export interface ParsedTime {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface TimeStepConfig {
  stepSeconds: number;
  allowAny: boolean;
  showSeconds: boolean;
}

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function resolveTimeStep(step?: number | string): TimeStepConfig {
  if (step === 'any') {
    return { stepSeconds: 1, allowAny: true, showSeconds: false };
  }

  const parsed =
    typeof step === 'number'
      ? step
      : step === undefined || step === ''
        ? 60
        : Number(step);

  const stepSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 60;

  return {
    stepSeconds,
    allowAny: false,
    showSeconds: stepSeconds < 60,
  };
}

export function parseTimeString(value: string): ParsedTime | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);

  if (!isValidTimeParts(hours, minutes, seconds)) {
    return null;
  }

  return { hours, minutes, seconds };
}

export function isValidTimeParts(hours: number, minutes: number, seconds: number): boolean {
  return (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    Number.isInteger(seconds) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59 &&
    seconds >= 0 &&
    seconds <= 59
  );
}

export function timePartsToMs({ hours, minutes, seconds }: ParsedTime): number {
  return hours * MS_PER_HOUR + minutes * MS_PER_MINUTE + seconds * MS_PER_SECOND;
}

export function msToTimeParts(ms: number): ParsedTime {
  const normalized = ((ms % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  const hours = Math.floor(normalized / MS_PER_HOUR);
  const minutes = Math.floor((normalized % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((normalized % MS_PER_MINUTE) / MS_PER_SECOND);

  return { hours, minutes, seconds };
}

export function formatTimeParts(
  parts: ParsedTime,
  includeSeconds: boolean,
): string {
  const hours = String(parts.hours).padStart(2, '0');
  const minutes = String(parts.minutes).padStart(2, '0');

  if (!includeSeconds) {
    return `${hours}:${minutes}`;
  }

  const seconds = String(parts.seconds).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatNowTime(
  step?: number | string,
  min?: string,
  max?: string,
): string {
  const { stepSeconds, allowAny, showSeconds } = resolveTimeStep(step);
  const now = new Date();
  const parts: ParsedTime = {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
  };
  const minMs = parseBoundaryTime(min);
  const maxMs = parseBoundaryTime(max);
  const snapped = msToTimeParts(
    snapTimeMs(timePartsToMs(parts), minMs, maxMs, stepSeconds, allowAny),
  );

  return formatTimeParts(snapped, showSeconds);
}

export function parseBoundaryTime(value: string | undefined): number | null {
  if (value === undefined || value === '') {
    return null;
  }

  const parsed = parseTimeString(value);
  return parsed ? timePartsToMs(parsed) : null;
}

export function clampTimeMs(
  ms: number,
  minMs: number | null,
  maxMs: number | null,
): number {
  let result = ms;

  if (minMs !== null) {
    result = Math.max(minMs, result);
  }
  if (maxMs !== null) {
    result = Math.min(maxMs, result);
  }

  return result;
}

export function snapTimeMs(
  ms: number,
  minMs: number | null,
  maxMs: number | null,
  stepSeconds: number,
  allowAny: boolean,
): number {
  const min = minMs ?? 0;
  const clamped = clampTimeMs(ms, minMs, maxMs);

  if (allowAny) {
    return clamped;
  }

  const stepMs = stepSeconds * MS_PER_SECOND;
  const snapped = min + Math.round((clamped - min) / stepMs) * stepMs;
  return clampTimeMs(snapped, minMs, maxMs);
}

export function normalizeTimeValue(
  value: string,
  min: string | undefined,
  max: string | undefined,
  step: number | string | undefined,
): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    return '';
  }

  const parsed = parseTimeString(trimmed);
  if (!parsed) {
    return '';
  }

  const { stepSeconds, allowAny, showSeconds } = resolveTimeStep(step);
  const minMs = parseBoundaryTime(min);
  const maxMs = parseBoundaryTime(max);
  const snapped = snapTimeMs(
    timePartsToMs(parsed),
    minMs,
    maxMs,
    stepSeconds,
    allowAny,
  );

  return formatTimeParts(msToTimeParts(snapped), showSeconds);
}

export function normalizeTypedTime(raw: string, includeSeconds: boolean): string | null {
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  }

  if (digits.length <= 2) {
    const hours = Number(digits);
    if (hours > 23) {
      return null;
    }
    return `${String(hours).padStart(2, '0')}:00${includeSeconds ? ':00' : ''}`;
  }

  if (digits.length <= 4) {
    const hours = Number(digits.slice(0, 2));
    const minutes = Number(digits.slice(2).padEnd(2, '0'));
    if (!isValidTimeParts(hours, minutes, 0)) {
      return null;
    }
    return formatTimeParts({ hours, minutes, seconds: 0 }, includeSeconds);
  }

  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));
  const seconds = Number(digits.slice(4, 6).padEnd(2, '0'));
  if (!isValidTimeParts(hours, minutes, seconds)) {
    return null;
  }

  return formatTimeParts({ hours, minutes, seconds }, includeSeconds);
}

export function buildHourOptions(): string[] {
  return Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
}

export function buildMinuteOptions(stepSeconds: number, allowAny: boolean): string[] {
  if (allowAny || stepSeconds <= 60) {
    return Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
  }

  if (stepSeconds % 60 === 0) {
    const interval = stepSeconds / 60;
    const values: string[] = [];
    for (let minute = 0; minute < 60; minute += interval) {
      values.push(String(minute).padStart(2, '0'));
    }
    return values;
  }

  return Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
}

export function buildSecondOptions(stepSeconds: number, allowAny: boolean): string[] {
  if (allowAny || stepSeconds === 1) {
    return Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
  }

  const values: string[] = [];
  for (let second = 0; second < 60; second += stepSeconds) {
    values.push(String(second).padStart(2, '0'));
  }
  return values;
}

export function isTimeWithinRange(
  ms: number,
  minMs: number | null,
  maxMs: number | null,
): boolean {
  if (minMs !== null && ms < minMs) {
    return false;
  }
  if (maxMs !== null && ms > maxMs) {
    return false;
  }
  return true;
}

export function createSyntheticChangeEvent(
  value: string,
  target: HTMLInputElement,
): ChangeEvent<HTMLInputElement> {
  target.value = value;
  return {
    target,
    currentTarget: target,
    bubbles: true,
    cancelable: false,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: false,
    nativeEvent: new Event('change'),
    preventDefault: () => undefined,
    isDefaultPrevented: () => false,
    stopPropagation: () => undefined,
    isPropagationStopped: () => false,
    persist: () => undefined,
    timeStamp: Date.now(),
    type: 'change',
  };
}

export function createSyntheticInputEvent(
  value: string,
  target: HTMLInputElement,
): InputEvent<HTMLInputElement> {
  target.value = value;
  return {
    ...createSyntheticChangeEvent(value, target),
    type: 'input',
    data: '',
    nativeEvent: new InputEvent('input'),
  } as InputEvent<HTMLInputElement>;
}
