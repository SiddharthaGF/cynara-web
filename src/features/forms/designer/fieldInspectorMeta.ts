import type { FieldPresentation, FieldType } from '@/features/forms/types.ts';

export const WIDTH_OPTIONS: FieldPresentation['width'][] = [
  'full',
  'half',
  'third',
  'quarter',
];

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
