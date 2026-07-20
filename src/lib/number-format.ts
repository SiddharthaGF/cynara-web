export const MAX_DECIMAL_PLACES = 10;

export function clampDecimalPlaces(decimals: number): number {
  if (!Number.isFinite(decimals)) {
    return 0;
  }

  return Math.min(MAX_DECIMAL_PLACES, Math.max(0, Math.trunc(decimals)));
}

export function decimalPlacesFromStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    return 0;
  }

  let decimals = 0;
  let scaled = step;

  while (
    decimals < MAX_DECIMAL_PLACES &&
    Math.abs(Math.round(scaled) - scaled) > 1e-9
  ) {
    scaled *= 10;
    decimals += 1;
  }

  return decimals;
}

export function resolveDecimalPlaces(options?: {
  decimalPlaces?: number;
  step?: number;
  fallback?: number;
}): number {
  if (options?.decimalPlaces !== undefined) {
    return clampDecimalPlaces(options.decimalPlaces);
  }

  if (options?.step !== undefined && options.step > 0) {
    return decimalPlacesFromStep(options.step);
  }

  return clampDecimalPlaces(options?.fallback ?? 2);
}

export function roundToDecimals(value: number, decimals: number): number {
  const places = clampDecimalPlaces(decimals);

  if (!Number.isFinite(value) || places <= 0) {
    return Math.round(value);
  }

  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function snapToStep(
  value: number,
  step: number,
  min?: number,
  max?: number,
): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  if (!Number.isFinite(step) || step <= 0) {
    return clampNumber(value, min, max);
  }

  const decimals = decimalPlacesFromStep(step);
  const factor = 10 ** decimals;
  const scaledStep = Math.round(step * factor);
  const scaledValue = Math.round(value * factor);
  const scaledMin =
    min !== undefined && Number.isFinite(min) ? Math.round(min * factor) : 0;

  let snapped =
    scaledMin +
    Math.round((scaledValue - scaledMin) / scaledStep) * scaledStep;

  if (min !== undefined && Number.isFinite(min)) {
    snapped = Math.max(Math.round(min * factor), snapped);
  }

  if (max !== undefined && Number.isFinite(max)) {
    snapped = Math.min(Math.round(max * factor), snapped);
  }

  return snapped / factor;
}

export function clampNumber(
  value: number,
  min?: number,
  max?: number,
): number {
  let result = value;

  if (min !== undefined && Number.isFinite(min)) {
    result = Math.max(min, result);
  }

  if (max !== undefined && Number.isFinite(max)) {
    result = Math.min(max, result);
  }

  return result;
}

export function isMultipleOf(value: number, step: number): boolean {
  if (!Number.isFinite(step) || step <= 0) {
    return true;
  }

  return Math.abs(value / step - Math.round(value / step)) <= 1e-6;
}

export function normalizeNumericValue(
  value: number,
  options?: {
    integer?: boolean;
    step?: number;
    decimalPlaces?: number;
    min?: number;
    max?: number;
  },
): number {
  const min = options?.min;
  const max = options?.max;

  if (options?.integer) {
    return Math.trunc(clampNumber(value, min, max));
  }

  let result = clampNumber(value, min, max);

  if (options?.step !== undefined && options.step > 0) {
    result = snapToStep(result, options.step, min, max);
  }

  const decimals = resolveDecimalPlaces({
    decimalPlaces: options?.decimalPlaces,
    step: options?.step,
  });

  return roundToDecimals(result, decimals);
}

export function formatNumericDisplay(
  value: number,
  options?: {
    step?: number;
    decimalPlaces?: number;
    fallbackDecimals?: number;
  },
): string {
  const decimals = resolveDecimalPlaces({
    decimalPlaces: options?.decimalPlaces,
    step: options?.step,
    fallback: options?.fallbackDecimals,
  });

  const normalized = normalizeNumericValue(value, {
    step: options?.step,
    decimalPlaces: options?.decimalPlaces,
  });

  return trimTrailingZeros(normalized.toFixed(decimals));
}

function trimTrailingZeros(value: string): string {
  if (!value.includes('.')) {
    return value;
  }

  return value
    .replace(/(?<kept>\.\d*?[1-9])0+$/u, '$<kept>')
    .replace(/\.0+$/u, '')
    .replace(/\.$/u, '');
}
