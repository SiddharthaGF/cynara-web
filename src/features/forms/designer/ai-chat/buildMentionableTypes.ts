import type { TFunction } from 'i18next';

import { FIELD_TYPE_KEYS } from '../fieldTypeMeta.ts';
import {
  listMentionableFieldTypes,
  type MentionableFieldType,
} from './fieldTypeMentions.ts';

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
