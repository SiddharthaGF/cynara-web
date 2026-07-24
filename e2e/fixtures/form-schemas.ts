/** Deterministic AI stream payloads for e2e (real app, mocked SSE only). */

export const INITIAL_CLINICAL = {
  fields: [
    {
      id: 'notes',
      code: 'clinical.notes',
      type: 'text',
      maxLength: 500,
    },
  ],
  schemaVersion: '1.0.0',
};

export const INITIAL_UI = {
  clinicalSchemaVersion: '1.0.0',
  fields: {
    notes: {
      label: 'Clinical notes',
      widget: 'text-input',
    },
  },
  layout: [{ type: 'field', fieldId: 'notes' }],
  schemaVersion: '1.0.0',
};

export const INITIAL_RULES = {
  clinicalSchemaVersion: '1.0.0',
  fields: {},
  schemaVersion: '1.0.0',
  validations: [],
};

/** Clinical order the designer must show after AI apply. */
export const APPLIED_FIELD_ORDER = [
  'surgery-date',
  'current-weight',
  'comorbidities',
  'clinical-notes',
] as const;

export const APPLIED_LABELS = [
  'Surgery date',
  'Current weight',
  'Comorbidities',
  'Clinical notes',
] as const;

/**
 * AI payload: clinical fields in the expected order, but ui.layout deliberately
 * reversed so a stale-layout bug would make preview disagree with the designer.
 * Ids/codes follow cynara clinical-schema kebab/dot conventions so autosave
 * against the real API succeeds.
 */
export const APPLIED_CLINICAL = {
  fields: [
    {
      id: 'surgery-date',
      code: 'followup.surgery-date',
      type: 'date',
      required: true,
    },
    {
      id: 'current-weight',
      code: 'followup.weight-kg',
      type: 'number',
      required: true,
      minimum: 1,
      maximum: 400,
      multipleOf: 0.1,
      decimalPlaces: 1,
    },
    {
      id: 'comorbidities',
      code: 'followup.comorbidities',
      type: 'textarea',
      maxLength: 2000,
    },
    {
      id: 'clinical-notes',
      code: 'followup.notes',
      type: 'text',
      maxLength: 500,
    },
  ],
  schemaVersion: '1.0.0',
};

export const APPLIED_UI = {
  schemaVersion: '1.0.0',
  clinicalSchemaVersion: '1.0.0',
  fields: {
    'clinical-notes': {
      label: 'Clinical notes',
      placeholder: 'Short answer text.',
      widget: 'text-input',
    },
    'comorbidities': { label: 'Comorbidities', widget: 'textarea' },
    'current-weight': { label: 'Current weight', widget: 'number-input' },
    'surgery-date': { label: 'Surgery date', widget: 'date-picker' },
  },
  // Wrong order on purpose — sync must rebuild from clinical.fields.
  layout: [
    { fieldId: 'clinical-notes', type: 'field' },
    { fieldId: 'comorbidities', type: 'field' },
    { fieldId: 'current-weight', type: 'field' },
    { fieldId: 'surgery-date', type: 'field' },
  ],
};

export const APPLIED_RULES = {
  clinicalSchemaVersion: '1.0.0',
  fields: {},
  schemaVersion: '1.0.0',
  validations: [],
};

export const ASSISTANT_MESSAGE =
  'I created a follow-up form with surgery date, weight, comorbidities, and clinical notes.';

export const ASSISTANT_SUMMARY =
  'Added surgery date, weight, comorbidities, and clinical notes.';
