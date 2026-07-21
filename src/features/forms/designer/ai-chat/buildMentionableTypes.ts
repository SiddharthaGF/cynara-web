import type { TFunction } from 'i18next';

import {
  listMentionableFieldTypes,
  type MentionableFieldType,
} from './fieldTypeMentions.ts';

const FIELD_TYPE_KEYS = [
  'text',
  'textarea',
  'number',
  'integer',
  'boolean',
  'date',
  'datetime',
  'time',
  'choice',
  'group',
  'repeater',
  'component-ref',
] as const;

export function buildMentionableTypes(
  locale: string,
  t: TFunction<'designer'>,
): MentionableFieldType[] {
  const labels = Object.fromEntries(
    FIELD_TYPE_KEYS.map((type) => [
      type,
      {
        label: t(`fieldTypes.${type}.label`),
        description: t(`fieldTypes.${type}.description`),
      },
    ]),
  ) as Parameters<typeof listMentionableFieldTypes>[1];
  return listMentionableFieldTypes(locale, labels);
}
