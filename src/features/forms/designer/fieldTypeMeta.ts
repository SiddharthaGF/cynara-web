import type { LucideIcon } from 'lucide-react';
import {
  AlignLeft,
  Calendar,
  CircleDot,
  Hash,
  LayoutGrid,
  List,
  Puzzle,
  TextCursorInput,
  ToggleLeft,
} from 'lucide-react';

import type { FieldType } from '@/features/forms/types.ts';

export interface FieldTypeMeta {
  type: FieldType;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'basic' | 'advanced' | 'clinical';
}

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
    icon: TextCursorInput,
    group: 'basic',
  },
  {
    type: 'textarea',
    label: 'Paragraph',
    description: 'Multi-line text',
    icon: AlignLeft,
    group: 'basic',
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Decimal values',
    icon: Hash,
    group: 'basic',
  },
  {
    type: 'integer',
    label: 'Whole number',
    description: 'Integer values',
    icon: Hash,
    group: 'basic',
  },
  {
    type: 'boolean',
    label: 'Yes / No',
    description: 'Toggle or checkbox',
    icon: ToggleLeft,
    group: 'basic',
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Calendar date',
    icon: Calendar,
    group: 'basic',
  },
  {
    type: 'choice',
    label: 'Choice',
    description: 'Single or multiple options',
    icon: CircleDot,
    group: 'basic',
  },
  {
    type: 'group',
    label: 'Section',
    description: 'Group related questions',
    icon: LayoutGrid,
    group: 'advanced',
  },
  {
    type: 'repeater',
    label: 'Repeatable section',
    description: 'Add rows dynamically',
    icon: List,
    group: 'advanced',
  },
  {
    type: 'component-ref',
    label: 'Clinical block',
    description: 'Reusable component',
    icon: Puzzle,
    group: 'clinical',
  },
];

export function getFieldTypeMeta(type: FieldType): FieldTypeMeta {
  return (
    FIELD_TYPES.find((item) => item.type === type) ?? {
      type,
      label: type,
      description: '',
      icon: TextCursorInput,
      group: 'basic',
    }
  );
}
