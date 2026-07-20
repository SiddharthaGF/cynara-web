import type {
  ChoiceOption,
  ClinicalField,
  FieldPresentation,
  FieldRules,
  FieldType,
  RuleExpression,
} from '@/features/forms/types.ts';

function parseOptionalInt(value: string): number | undefined {
  if (value === '') {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalNumber(value: string): number | undefined {
  if (value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export interface PresentationFormValues {
  placeholder: string;
  widget: string;
  width: NonNullable<FieldPresentation['width']>;
  hidden: boolean;
  timePresetNow: boolean;
}

export function presentationToFormValues(
  presentation: FieldPresentation | null,
  currentWidget: string,
): PresentationFormValues {
  return {
    placeholder: presentation?.placeholder ?? '',
    widget: currentWidget,
    width: presentation?.width ?? 'full',
    hidden: presentation?.hidden ?? false,
    timePresetNow: presentation?.timePresets?.includes('now') ?? false,
  };
}

export function presentationFormValuesToPatch(
  values: PresentationFormValues,
): Partial<FieldPresentation> {
  return {
    placeholder: values.placeholder || undefined,
    widget: values.widget || undefined,
    width: values.width,
    hidden: values.hidden || undefined,
    timePresets: values.timePresetNow ? ['now'] : undefined,
  };
}

export interface QuestionEditFormValues {
  label: string;
  helpText: string;
  type: FieldType;
}

export function questionEditToFormValues(
  presentation: FieldPresentation | undefined,
  fieldType: FieldType,
): QuestionEditFormValues {
  return {
    label: presentation?.label ?? '',
    helpText: presentation?.helpText ?? '',
    type: fieldType,
  };
}

export interface ClinicalFormValues {
  description: string;
  readOnly: boolean;
  code: string;
  defaultText: string;
  defaultBoolean: boolean;
  defaultChoice: string;
  minLength: string;
  maxLength: string;
  pattern: string;
  minimum: string;
  maximum: string;
  multipleOf: string;
  decimalPlaces: string;
  options: ChoiceOption[];
  allowMultiple: boolean;
  minItems: string;
  maxItems: string;
  componentCode: string;
  componentVersion: string;
}

export function clinicalFieldToFormValues(field: ClinicalField): ClinicalFormValues {
  return {
    description: field.description ?? '',
    readOnly: field.readOnly ?? false,
    code: field.code,
    defaultText:
      field.default !== undefined &&
      field.default !== null &&
      typeof field.default !== 'boolean'
        ? String(field.default)
        : '',
    defaultBoolean: field.default === true,
    defaultChoice: typeof field.default === 'string' ? field.default : '',
    minLength: field.minLength === undefined ? '' : String(field.minLength),
    maxLength: field.maxLength === undefined ? '' : String(field.maxLength),
    pattern: field.pattern ?? '',
    minimum: field.minimum === undefined ? '' : String(field.minimum),
    maximum: field.maximum === undefined ? '' : String(field.maximum),
    multipleOf: field.multipleOf === undefined ? '' : String(field.multipleOf),
    decimalPlaces:
      field.decimalPlaces === undefined ? '' : String(field.decimalPlaces),
    options: field.options ?? [],
    allowMultiple: field.allowMultiple ?? false,
    minItems: field.minItems === undefined ? '' : String(field.minItems),
    maxItems: field.maxItems === undefined ? '' : String(field.maxItems),
    componentCode: field.componentCode ?? '',
    componentVersion: field.componentVersion ?? '',
  };
}

function parseDefaultValue(
  field: ClinicalField,
  values: ClinicalFormValues,
): ClinicalField['default'] {
  if (field.type === 'boolean') {
    return values.defaultBoolean ? true : undefined;
  }

  if (field.type === 'choice') {
    return values.defaultChoice || undefined;
  }

  if (!values.defaultText) {
    return undefined;
  }

  if (field.type === 'number') {
    return Number(values.defaultText);
  }

  if (field.type === 'integer') {
    return Number.parseInt(values.defaultText, 10);
  }

  return values.defaultText;
}

export function clinicalFormValuesToPatch(
  field: ClinicalField,
  values: ClinicalFormValues,
): Partial<ClinicalField> {
  return {
    description: values.description || undefined,
    readOnly: values.readOnly || undefined,
    code: values.code,
    default: parseDefaultValue(field, values),
    minLength: parseOptionalInt(values.minLength),
    maxLength: parseOptionalInt(values.maxLength),
    pattern: values.pattern || undefined,
    minimum: parseOptionalNumber(values.minimum),
    maximum: parseOptionalNumber(values.maximum),
    multipleOf: parseOptionalNumber(values.multipleOf),
    decimalPlaces:
      field.type === 'number' ? parseOptionalInt(values.decimalPlaces) : undefined,
    options: field.type === 'choice' ? values.options : undefined,
    allowMultiple: field.type === 'choice' ? values.allowMultiple : undefined,
    minItems: parseOptionalInt(values.minItems),
    maxItems: parseOptionalInt(values.maxItems),
    componentCode: values.componentCode || undefined,
    componentVersion: values.componentVersion || undefined,
  };
}

export interface RulesFormValues {
  visibleWhenRef: string;
  visibleWhenLit: string;
  enabledWhenRef: string;
  enabledWhenLit: string;
  requiredWhenRef: string;
  requiredWhenLit: string;
  calculateRef: string;
}

export function rulesToFormValues(rules: FieldRules | null): RulesFormValues {
  return {
    visibleWhenRef: parseEqRef(rules?.visibleWhen),
    visibleWhenLit: parseEqLit(rules?.visibleWhen),
    enabledWhenRef: parseEqRef(rules?.enabledWhen),
    enabledWhenLit: parseEqLit(rules?.enabledWhen),
    requiredWhenRef: parseEqRef(rules?.requiredWhen),
    requiredWhenLit: parseEqLit(rules?.requiredWhen),
    calculateRef:
      rules?.calculate && 'ref' in rules.calculate ? rules.calculate.ref : '',
  };
}

export function rulesFormValuesToPatch(
  values: RulesFormValues,
): Partial<FieldRules> {
  return {
    visibleWhen: buildEqExpression(values.visibleWhenRef, values.visibleWhenLit),
    enabledWhen: buildEqExpression(values.enabledWhenRef, values.enabledWhenLit),
    requiredWhen: buildEqExpression(
      values.requiredWhenRef,
      values.requiredWhenLit,
    ),
    calculate: values.calculateRef ? { ref: values.calculateRef } : undefined,
  };
}

function parseEqRef(expression: RuleExpression | undefined): string {
  if (!expression) {
    return '';
  }
  if ('op' in expression && expression.op === 'eq') {
    const [left] = expression.args;
    return left && 'ref' in left ? left.ref : '';
  }
  if ('ref' in expression) {
    return expression.ref;
  }
  return '';
}

function parseEqLit(expression: RuleExpression | undefined): string {
  if (!expression || !('op' in expression) || expression.op !== 'eq') {
    return '';
  }
  const [, right] = expression.args;
  if (!right || !('lit' in right)) {
    return '';
  }
  if (right.lit === null) {
    return '';
  }
  return String(right.lit);
}

function buildEqExpression(
  ref: string,
  lit: string,
): RuleExpression | undefined {
  if (!ref) {
    return undefined;
  }
  const parsedLit = coerceLiteral(lit);
  return {
    op: 'eq',
    args: [{ ref }, { lit: parsedLit }],
  };
}

function coerceLiteral(value: string): string | number | boolean | null {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (value === 'null') {
    return null;
  }
  if (value !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}
