import { DEFAULT_WIDGETS } from '../designer/fieldInspectorMeta.ts';
import type {
  ClinicalField,
  ClinicalSchema,
  FieldType,
  FormDraftModel,
  LayoutNode,
  RulesSchema,
  UiSchema,
} from '../types.ts';

function createUiSchema(clinical: ClinicalSchema): UiSchema {
  return {
    schemaVersion: '1.0.0',
    clinicalSchemaVersion: clinical.schemaVersion,
    fields: {},
    layout: [],
  };
}

function createRulesSchema(clinical: ClinicalSchema): RulesSchema {
  return {
    schemaVersion: '1.0.0',
    clinicalSchemaVersion: clinical.schemaVersion,
    fields: {},
    validations: [],
  };
}

export function parseDraft(version: {
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
}): FormDraftModel {
  const clinical = JSON.parse(version.clinicalSchemaJson) as ClinicalSchema;
  const ui = version.uiSchemaJson
    ? (JSON.parse(version.uiSchemaJson) as UiSchema)
    : createUiSchema(clinical);
  const rules = version.rulesSchemaJson
    ? (JSON.parse(version.rulesSchemaJson) as RulesSchema)
    : createRulesSchema(clinical);

  return { clinical, ui, rules };
}

export function serializeDraft(model: FormDraftModel): {
  clinicalSchemaJson: string;
  uiSchemaJson: string;
  rulesSchemaJson: string;
} {
  const syncedUi = syncUiSchema(model.clinical, model.ui);
  const syncedRules = syncRulesSchema(model.clinical, model.rules);

  return {
    clinicalSchemaJson: JSON.stringify(model.clinical),
    uiSchemaJson: JSON.stringify(syncedUi),
    rulesSchemaJson: JSON.stringify(syncedRules),
  };
}

export function formatFormExportJson(model: FormDraftModel): string {
  const { clinicalSchemaJson, uiSchemaJson, rulesSchemaJson } =
    serializeDraft(model);

  return JSON.stringify(
    {
      clinical: JSON.parse(clinicalSchemaJson) as ClinicalSchema,
      ui: JSON.parse(uiSchemaJson) as UiSchema,
      rules: JSON.parse(rulesSchemaJson) as RulesSchema,
    },
    null,
    2,
  );
}

export function syncUiSchema(clinical: ClinicalSchema, ui: UiSchema): UiSchema {
  const fields: UiSchema['fields'] = {};
  for (const field of iterateFields(clinical.fields)) {
    fields[field.id] = ui.fields[field.id] ?? {
      label: humanize(field.id),
      widget: DEFAULT_WIDGETS[field.type],
    };
  }

  return {
    ...ui,
    clinicalSchemaVersion: clinical.schemaVersion,
    fields,
    layout: resolveLayout(clinical, ui),
  };
}

function resolveLayout(clinical: ClinicalSchema, ui: UiSchema): LayoutNode[] {
  if (ui.layout && ui.layout.length > 0) {
    return ui.layout;
  }

  return buildLayout(clinical.fields);
}

export function appendFieldToLayout(
  layout: LayoutNode[],
  fieldId: string,
): LayoutNode[] {
  const fieldNode: LayoutNode = { type: 'field', fieldId };

  if (layout.length === 0) {
    return [fieldNode];
  }

  const last = layout.at(-1);
  if (last?.type === 'section') {
    return [
      ...layout.slice(0, -1),
      { ...last, children: [...last.children, fieldNode] },
    ];
  }

  return [...layout, fieldNode];
}

/** Insert a top-level field node at `index` (canvas order). */
export function insertFieldInLayout(
  layout: LayoutNode[],
  field: ClinicalField,
  index: number,
): LayoutNode[] {
  const next = [...layout];
  const at = Math.max(0, Math.min(index, next.length));
  next.splice(at, 0, layoutForField(field));
  return next;
}

export function removeFieldFromLayout(
  layout: LayoutNode[],
  fieldId: string,
): LayoutNode[] {
  const next: LayoutNode[] = [];

  for (const node of layout) {
    if (node.type === 'field') {
      if (node.fieldId !== fieldId) {
        next.push(node);
      }
    } else if (node.type === 'section') {
      next.push({
        ...node,
        children: removeFieldFromLayout(node.children, fieldId),
      });
    } else if (node.type === 'group') {
      if (node.fieldId !== fieldId) {
        next.push({
          ...node,
          children: removeFieldFromLayout(node.children, fieldId),
        });
      }
    } else if (node.fieldId !== fieldId) {
      next.push({
        ...node,
        itemTemplate: removeFieldFromLayout(node.itemTemplate, fieldId),
      });
    }
  }

  return next;
}

export function syncRulesSchema(
  clinical: ClinicalSchema,
  rules: RulesSchema,
): RulesSchema {
  const knownIds = new Set(
    [...iterateFields(clinical.fields)].map((field) => field.id),
  );
  const fields: RulesSchema['fields'] = {};
  for (const fieldId of knownIds) {
    if (rules.fields[fieldId]) {
      fields[fieldId] = rules.fields[fieldId];
    }
  }

  return {
    ...rules,
    clinicalSchemaVersion: clinical.schemaVersion,
    fields,
    validations: rules.validations ?? [],
  };
}

export function buildLayout(fields: ClinicalField[]): LayoutNode[] {
  return fields.map((field) => layoutForField(field));
}

function layoutForField(field: ClinicalField): LayoutNode {
  if (field.type === 'group' && field.items && field.items.length > 0) {
    return {
      type: 'group',
      fieldId: field.id,
      children: field.items.map((item) => ({
        type: 'field',
        fieldId: item.id,
      })),
    };
  }

  if (field.type === 'repeater' && field.items && field.items.length > 0) {
    return {
      type: 'repeater',
      fieldId: field.id,
      itemTemplate: field.items.map((item) => ({
        type: 'field',
        fieldId: item.id,
      })),
    };
  }

  return { type: 'field', fieldId: field.id };
}

export function* iterateFields(
  fields: ClinicalField[],
): Generator<ClinicalField> {
  for (const field of fields) {
    yield field;
    if (field.items) {
      yield* iterateFields(field.items);
    }
  }
}

export function findFieldById(
  fields: ClinicalField[],
  fieldId: string,
): ClinicalField | null {
  for (const field of iterateFields(fields)) {
    if (field.id === fieldId) {
      return field;
    }
  }
  return null;
}

export function collectRepeaterChildIds(fields: ClinicalField[]): Set<string> {
  const ids = new Set<string>();
  for (const field of fields) {
    if (field.type === 'repeater' && field.items) {
      for (const child of iterateFields(field.items)) {
        ids.add(child.id);
      }
    }
  }
  return ids;
}

export function createField(type: FieldType, index: number): ClinicalField {
  const id = `${type}-${index + 1}`;
  const code = `form.${id.replaceAll('-', '.')}`;

  const base: ClinicalField = { id, code, type };

  if (type === 'choice') {
    return {
      ...base,
      options: [
        { value: 'option-a', label: 'Option A' },
        { value: 'option-b', label: 'Option B' },
      ],
    };
  }

  if (type === 'group') {
    return {
      ...base,
      items: [createField('text', 0), createField('text', 1)],
    };
  }

  if (type === 'repeater') {
    return {
      ...base,
      repeatable: true,
      minItems: 0,
      maxItems: 20,
      items: [createField('text', 0)],
    };
  }

  if (type === 'component-ref') {
    return {
      ...base,
      componentCode: '',
    };
  }

  return base;
}

function humanize(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function moveField(
  fields: ClinicalField[],
  fromIndex: number,
  toIndex: number,
): ClinicalField[] {
  const next = [...fields];
  const [item] = next.splice(fromIndex, 1);
  if (!item) {
    return fields;
  }
  next.splice(toIndex, 0, item);
  return next;
}

export function removeField(
  fields: ClinicalField[],
  fieldId: string,
): ClinicalField[] {
  return fields.filter((field) => field.id !== fieldId);
}

export function updateField(
  fields: ClinicalField[],
  fieldId: string,
  patch: Partial<ClinicalField>,
): ClinicalField[] {
  return fields.map((field) =>
    field.id === fieldId ? { ...field, ...patch } : field,
  );
}

export function duplicateFieldIdExists(
  fields: ClinicalField[],
  fieldId: string,
): boolean {
  const ids = [...iterateFields(fields)].map((field) => field.id);
  return ids.filter((id) => id === fieldId).length > 1;
}

export function duplicateFieldCodeExists(
  fields: ClinicalField[],
  code: string,
): boolean {
  const codes = [...iterateFields(fields)].map((field) => field.code);
  return codes.filter((item) => item === code).length > 1;
}
