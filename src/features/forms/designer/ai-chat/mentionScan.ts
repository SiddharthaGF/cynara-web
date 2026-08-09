import { FIELD_MENTION_RE, type MentionableField } from './fieldMentions.ts';
import {
  FIELD_TYPE_MENTION_RE,
  type MentionableFieldType,
} from './fieldTypeMentions.ts';

export interface MentionHit {
  index: number;
  length: number;
  kind: 'field' | 'type';
  label: string;
  field?: MentionableField;
  fieldType?: MentionableFieldType;
}

/**
 * Finds `@field-id` and `#type-slug` mentions in raw chat text, resolved to
 * known fields/types. Shared by the plain-text renderer and the markdown
 * renderer so mention chips behave identically in both.
 */
export function scanMentionHits(
  content: string,
  fieldsById?: Map<string, MentionableField>,
  typesBySlug?: Map<string, MentionableFieldType>,
): MentionHit[] {
  const hits: MentionHit[] = [];

  if (fieldsById && fieldsById.size > 0) {
    for (const match of content.matchAll(FIELD_MENTION_RE)) {
      const id = match.groups?.fieldId;
      const index = match.index ?? 0;
      const field = id ? fieldsById.get(id) : undefined;
      if (id && field) {
        hits.push({
          index,
          length: match[0].length,
          kind: 'field',
          label: field.label,
          field,
        });
      }
    }
  }

  if (typesBySlug && typesBySlug.size > 0) {
    for (const match of content.matchAll(FIELD_TYPE_MENTION_RE)) {
      const slug = match.groups?.slug;
      const index = match.index ?? 0;
      const fieldType = slug ? typesBySlug.get(slug) : undefined;
      if (slug && fieldType) {
        hits.push({
          index,
          length: match[0].length,
          kind: 'type',
          label: fieldType.label,
          fieldType,
        });
      }
    }
  }

  return hits;
}
