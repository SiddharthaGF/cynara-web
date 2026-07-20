import type { FieldType } from '@/features/forms/types.ts';

import { FIELD_TYPES } from '../fieldTypeMeta.ts';

/** Locale-facing #slug for each clinical field type. */
const FIELD_TYPE_SLUGS: Record<FieldType, { en: string; es: string }> = {
  'text': { en: 'short-answer', es: 'respuesta-corta' },
  'textarea': { en: 'paragraph', es: 'parrafo' },
  'number': { en: 'number', es: 'numero' },
  'integer': { en: 'whole-number', es: 'entero' },
  'boolean': { en: 'yes-no', es: 'si-no' },
  'date': { en: 'date', es: 'fecha' },
  'datetime': { en: 'date-time', es: 'fecha-hora' },
  'time': { en: 'time', es: 'hora' },
  'choice': { en: 'choice', es: 'opcion' },
  'group': { en: 'section', es: 'seccion' },
  'repeater': { en: 'repeater', es: 'repetidor' },
  'component-ref': { en: 'clinical-block', es: 'bloque-clinico' },
};

export const FIELD_TYPE_MENTION_RE = /#(?<slug>[a-zA-Z][\w-]*)/g;

export interface MentionableFieldType {
  type: FieldType;
  /** Token inserted after `#` (locale-aware). */
  slug: string;
  label: string;
  description: string;
}

export function fieldTypeSlug(
  type: FieldType,
  locale: string,
): string {
  const entry = FIELD_TYPE_SLUGS[type];
  if (!entry) {
    return type;
  }
  return locale.trim().toLowerCase().startsWith('es') ? entry.es : entry.en;
}

export function listMentionableFieldTypes(
  locale: string,
  labels: Record<FieldType, { label: string; description: string }>,
): MentionableFieldType[] {
  return FIELD_TYPES.map((meta) => {
    const copy = labels[meta.type];
    return {
      type: meta.type,
      slug: fieldTypeSlug(meta.type, locale),
      label: copy?.label ?? meta.label,
      description: copy?.description ?? meta.description,
    };
  });
}

export function filterMentionableFieldTypes(
  types: MentionableFieldType[],
  query: string,
): MentionableFieldType[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return types;
  }
  return types.filter((item) => {
    const haystack =
      `${item.label} ${item.description} ${item.slug} ${item.type}`.toLowerCase();
    return haystack.includes(needle);
  });
}

/** Resolve a #slug (or raw FieldType) to a FieldType. */
export function resolveFieldTypeSlug(slug: string): FieldType | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const [type, aliases] of Object.entries(FIELD_TYPE_SLUGS) as [
    FieldType,
    { en: string; es: string },
  ][]) {
    if (
      type === normalized ||
      aliases.en === normalized ||
      aliases.es === normalized
    ) {
      return type;
    }
  }
  return null;
}

export function extractMentionedFieldTypes(text: string): FieldType[] {
  const found: FieldType[] = [];
  const seen = new Set<FieldType>();
  for (const match of text.matchAll(FIELD_TYPE_MENTION_RE)) {
    const slug = match.groups?.slug;
    const type = slug ? resolveFieldTypeSlug(slug) : null;
    if (type && !seen.has(type)) {
      seen.add(type);
      found.push(type);
    }
  }
  return found;
}

export function buildFieldTypeLabelMap(
  types: MentionableFieldType[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of types) {
    map.set(item.slug, item.label);
    map.set(item.type, item.label);
  }
  return map;
}

/** Detect which mention trigger is active at the caret, if any. */
export function detectMentionTrigger(
  value: string,
  caret: number,
): '@' | '#' | null {
  const before = value.slice(0, Math.max(0, caret));
  const match = /(?:^|[\s([{])(?<trigger>[@#])(?<query>[^\s@#]*)$/.exec(
    before,
  );
  const trigger = match?.groups?.trigger;
  if (trigger === '@' || trigger === '#') {
    return trigger;
  }
  return null;
}
