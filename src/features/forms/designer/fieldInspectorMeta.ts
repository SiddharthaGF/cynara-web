import type { LucideIcon } from 'lucide-react';
import {
  Columns2,
  Columns3,
  Columns4,
  Square,
} from 'lucide-react';

import type { FieldPresentation, FieldType } from '@/features/forms/types.ts';

export type FieldWidth = NonNullable<FieldPresentation['width']>;

export const WIDTH_OPTIONS: FieldWidth[] = [
  'full',
  'half',
  'third',
  'quarter',
];

/** Shared icons for width options in the inspector select. */
const WIDTH_ICONS: Record<FieldWidth, LucideIcon> = {
  full: Square,
  half: Columns2,
  third: Columns3,
  quarter: Columns4,
};

export function getWidthIcon(width: FieldWidth): LucideIcon {
  return WIDTH_ICONS[width] ?? Square;
}

export const WIDGETS_BY_FIELD_TYPE: Record<FieldType, string[]> = {
  'text': ['text-input'],
  'textarea': ['textarea'],
  'number': ['number-input'],
  'integer': ['integer-input'],
  'boolean': ['checkbox', 'toggle'],
  'date': ['date-picker'],
  'datetime': ['datetime-picker'],
  'time': ['time-picker'],
  'choice': ['select', 'multi-select', 'radio-group', 'checkbox-group'],
  'group': ['group'],
  'repeater': ['repeater'],
  'component-ref': ['component'],
};

export const DEFAULT_WIDGETS: Record<FieldType, string> = {
  'text': 'text-input',
  'textarea': 'textarea',
  'number': 'number-input',
  'integer': 'integer-input',
  'boolean': 'checkbox',
  'date': 'date-picker',
  'datetime': 'datetime-picker',
  'time': 'time-picker',
  'choice': 'select',
  'group': 'group',
  'repeater': 'repeater',
  'component-ref': 'component',
};
