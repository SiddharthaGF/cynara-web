import type {
  ClinicalField,
  FieldType,
  FormDraftModel,
} from '@/features/forms/types.ts';

/** Token written into chat text: `@field-id` */
export const FIELD_MENTION_RE = /@(?<fieldId>[a-zA-Z][\w-]*)/g;

export interface MentionableField {
  id: string;
  code: string;
  type: FieldType;
  label: string;
  /** Breadcrumb for nested fields, e.g. "Medications › Dose". */
  pathLabel: string;
  /** Lowercased haystack searched by the mention filter. Precomputed once. */
  searchText: string;
}

export function listMentionableFields(
  model: FormDraftModel,
): MentionableField[] {
  const out: MentionableField[] = [];
  walkFields(model.clinical.fields, model, [], out);
  return out;
}

function walkFields(
  fields: ClinicalField[],
  model: FormDraftModel,
  ancestors: string[],
  out: MentionableField[],
): void {
  for (const field of fields) {
    const label = resolveFieldLabel(field, model);
    const pathLabel =
      ancestors.length > 0 ? `${ancestors.join(' › ')} › ${label}` : label;
    out.push({
      id: field.id,
      code: field.code,
      type: field.type,
      label,
      pathLabel,
      searchText:
        `${label} ${pathLabel} ${field.id} ${field.code} ${field.type}`.toLowerCase(),
    });
    if (field.items && field.items.length > 0) {
      walkFields(field.items, model, [...ancestors, label], out);
    }
  }
}

export function resolveFieldLabel(
  field: ClinicalField,
  model: FormDraftModel,
): string {
  const fromUi = model.ui.fields[field.id]?.label?.trim();
  if (fromUi) {
    return fromUi;
  }
  if (field.description?.trim()) {
    return field.description.trim();
  }
  return field.code || field.id;
}

export function filterMentionableFields(
  fields: MentionableField[],
  query: string,
): MentionableField[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return fields;
  }
  return fields.filter((field) => field.searchText.includes(needle));
}

export function extractMentionedFieldIds(
  text: string,
  knownIds: ReadonlySet<string>,
): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(FIELD_MENTION_RE)) {
    const id = match.groups?.fieldId;
    if (id && !seen.has(id) && knownIds.has(id)) {
      seen.add(id);
      found.push(id);
    }
  }
  return found;
}
