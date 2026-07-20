export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'choice'
  | 'group'
  | 'repeater'
  | 'component-ref';

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface ClinicalField {
  id: string;
  code: string;
  type: FieldType;
  required?: boolean;
  readOnly?: boolean;
  description?: string;
  default?: string | number | boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  /** Explicit display/storage precision for number fields (0–10). */
  decimalPlaces?: number;
  options?: ChoiceOption[];
  allowMultiple?: boolean;
  componentCode?: string;
  componentVersion?: string;
  items?: ClinicalField[];
  repeatable?: boolean;
  minItems?: number;
  maxItems?: number;
}

export interface ClinicalSchema {
  $schema?: string;
  schemaVersion: string;
  fields: ClinicalField[];
}

export interface FieldPresentation {
  label?: string;
  helpText?: string;
  placeholder?: string;
  widget?: string;
  width?: 'full' | 'half' | 'third' | 'quarter';
  hidden?: boolean;
  /** Quick-fill actions for time and datetime widgets. */
  timePresets?: TimePreset[];
}

export type TimePreset = 'now';

export interface UiSchema {
  $schema?: string;
  schemaVersion: string;
  clinicalSchemaVersion: string;
  fields: Record<string, FieldPresentation>;
  layout?: LayoutNode[];
}

export type LayoutNode =
  | { type: 'section'; title: string; children: LayoutNode[] }
  | { type: 'field'; fieldId: string }
  | { type: 'group'; fieldId: string; children: LayoutNode[] }
  | { type: 'repeater'; fieldId: string; itemTemplate: LayoutNode[] };

export interface FieldRules {
  visibleWhen?: RuleExpression;
  enabledWhen?: RuleExpression;
  requiredWhen?: RuleExpression;
  calculate?: RuleExpression;
}

export interface CrossFieldValidation {
  code: string;
  message: string;
  when?: RuleExpression;
  assert: RuleExpression;
}

export interface RulesSchema {
  $schema?: string;
  schemaVersion: string;
  clinicalSchemaVersion: string;
  fields: Record<string, FieldRules>;
  validations?: CrossFieldValidation[];
}

export type RuleExpression =
  | { ref: string }
  | { lit: string | number | boolean | null }
  | { op: string; args: RuleExpression[] };

export interface FormDraftModel {
  clinical: ClinicalSchema;
  ui: UiSchema;
  rules: RulesSchema;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface FormSummary {
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  editableVersionId: string | null;
  editableStatus: string | null;
  editableRowVersion: number | null;
  publishedVersions: string[];
}

export interface FormVersion {
  id: string;
  code: string;
  version: string | null;
  status: string;
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
  contentHash: string | null;
  dependencyMetadataJson: string | null;
  rowVersion: number;
  createdAt: string;
  submittedForReviewAt: string | null;
  publishedAt: string | null;
  retiredAt: string | null;
}

export interface ComponentSummary {
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  draftVersionId: string | null;
  draftRowVersion: number | null;
  publishedVersions: string[];
}
