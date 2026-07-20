import type { LucideIcon } from 'lucide-react';
import {
  AlignLeft,
  Binary,
  Calendar,
  CalendarClock,
  CircleDot,
  Clock,
  ListPlus,
  Puzzle,
  Rows3,
  Sigma,
  ToggleLeft,
  Type,
} from 'lucide-react';

import type { FieldType } from '@/features/forms/types.ts';

export interface FieldTypeMeta {
  type: FieldType;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'basic' | 'advanced' | 'clinical';
}

/** Single source of truth for field-type icons across palette, select, badges. */
const FIELD_TYPE_ICONS: Record<FieldType, LucideIcon> = {
  'text': Type,
  'textarea': AlignLeft,
  'number': Sigma,
  'integer': Binary,
  'boolean': ToggleLeft,
  'date': Calendar,
  'datetime': CalendarClock,
  'time': Clock,
  'choice': CircleDot,
  'group': Rows3,
  'repeater': ListPlus,
  'component-ref': Puzzle,
};

export const FIELD_TYPE_GROUPS = [
  { id: 'basic' as const, label: 'Basic' },
  { id: 'advanced' as const, label: 'Advanced' },
  { id: 'clinical' as const, label: 'Clinical' },
];

export const FIELD_TYPES: FieldTypeMeta[] = [
  {
    type: 'text',
    label: 'Short answer',
    description: 'Single line text',
    icon: FIELD_TYPE_ICONS.text,
    group: 'basic',
  },
  {
    type: 'textarea',
    label: 'Paragraph',
    description: 'Multi-line text',
    icon: FIELD_TYPE_ICONS.textarea,
    group: 'basic',
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Decimal values',
    icon: FIELD_TYPE_ICONS.number,
    group: 'basic',
  },
  {
    type: 'integer',
    label: 'Whole number',
    description: 'Integer values',
    icon: FIELD_TYPE_ICONS.integer,
    group: 'basic',
  },
  {
    type: 'boolean',
    label: 'Yes / No',
    description: 'Toggle or checkbox',
    icon: FIELD_TYPE_ICONS.boolean,
    group: 'basic',
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Calendar date',
    icon: FIELD_TYPE_ICONS.date,
    group: 'basic',
  },
  {
    type: 'datetime',
    label: 'Date & time',
    description: 'Date and time',
    icon: FIELD_TYPE_ICONS.datetime,
    group: 'basic',
  },
  {
    type: 'time',
    label: 'Time',
    description: 'Time of day',
    icon: FIELD_TYPE_ICONS.time,
    group: 'basic',
  },
  {
    type: 'choice',
    label: 'Choice',
    description: 'Single or multiple options',
    icon: FIELD_TYPE_ICONS.choice,
    group: 'basic',
  },
  {
    type: 'group',
    label: 'Section',
    description: 'Group related questions',
    icon: FIELD_TYPE_ICONS.group,
    group: 'advanced',
  },
  {
    type: 'repeater',
    label: 'Repeatable section',
    description: 'Add rows dynamically',
    icon: FIELD_TYPE_ICONS.repeater,
    group: 'advanced',
  },
  {
    type: 'component-ref',
    label: 'Clinical block',
    description: 'Reusable component',
    icon: FIELD_TYPE_ICONS['component-ref'],
    group: 'clinical',
  },
];

export function getFieldTypeMeta(type: FieldType): FieldTypeMeta {
  return (
    FIELD_TYPES.find((item) => item.type === type) ?? {
      type,
      label: type,
      description: '',
      icon: FIELD_TYPE_ICONS[type] ?? Type,
      group: 'basic',
    }
  );
}

export function getFieldTypeIcon(type: FieldType): LucideIcon {
  return FIELD_TYPE_ICONS[type] ?? Type;
}
