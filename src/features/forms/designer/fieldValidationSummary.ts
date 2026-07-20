import type { TFunction } from 'i18next';

import type {
  ClinicalField,
  FieldRules,
  RuleExpression,
} from '@/features/forms/types.ts';

export interface FieldValidationRule {
  id: string;
  label: string;
  detail?: string;
}

function formatRuleExpression(
  expression: RuleExpression | undefined,
  t: TFunction<'designer'>,
): string | null {
  if (!expression) {
    return null;
  }

  if ('ref' in expression) {
    return expression.ref;
  }

  if ('lit' in expression) {
    if (expression.lit === null) {
      return t('validationRules.empty');
    }
    return String(expression.lit);
  }

  if ('op' in expression) {
    if (expression.op === 'eq' && expression.args.length >= 2) {
      const left = formatRuleExpression(expression.args[0], t);
      const right = formatRuleExpression(expression.args[1], t);
      if (left && right) {
        return t('validationRules.equals', { left, right });
      }
    }

    if (expression.args.length > 0) {
      const parts = expression.args
        .map((arg) => formatRuleExpression(arg, t))
        .filter((part): part is string => part !== null);
      if (parts.length > 0) {
        return `${expression.op}(${parts.join(', ')})`;
      }
    }
  }

  return null;
}

function pushConditionalRule(
  rules: FieldValidationRule[],
  id: string,
  labelKey: string,
  expression: RuleExpression | undefined,
  t: TFunction<'designer'>,
): void {
  const detail = formatRuleExpression(expression, t);
  if (!detail) {
    return;
  }

  rules.push({ id, label: t(labelKey), detail });
}

export function collectFieldValidationRules(
  field: ClinicalField,
  fieldRules: FieldRules | null | undefined,
  t: TFunction<'designer'>,
): FieldValidationRule[] {
  const rules: FieldValidationRule[] = [];

  if (field.required) {
    rules.push({ id: 'required', label: t('validationRules.required') });
  }

  if (field.readOnly) {
    rules.push({ id: 'read-only', label: t('validationRules.readOnly') });
  }

  if (field.minLength !== undefined) {
    rules.push({
      id: 'min-length',
      label: t('validationRules.minLength'),
      detail: String(field.minLength),
    });
  }

  if (field.maxLength !== undefined) {
    rules.push({
      id: 'max-length',
      label: t('validationRules.maxLength'),
      detail: String(field.maxLength),
    });
  }

  if (field.pattern) {
    rules.push({
      id: 'pattern',
      label: t('validationRules.pattern'),
      detail: field.pattern,
    });
  }

  if (field.minimum !== undefined) {
    rules.push({
      id: 'minimum',
      label: t('validationRules.minimum'),
      detail: String(field.minimum),
    });
  }

  if (field.maximum !== undefined) {
    rules.push({
      id: 'maximum',
      label: t('validationRules.maximum'),
      detail: String(field.maximum),
    });
  }

  if (field.multipleOf !== undefined) {
    rules.push({
      id: 'multiple-of',
      label: t('validationRules.multipleOf'),
      detail: String(field.multipleOf),
    });
  }

  if (field.decimalPlaces !== undefined) {
    rules.push({
      id: 'decimal-places',
      label: t('validationRules.decimalPlaces'),
      detail: String(field.decimalPlaces),
    });
  }

  if (field.minItems !== undefined) {
    rules.push({
      id: 'min-items',
      label: t('validationRules.minItems'),
      detail: String(field.minItems),
    });
  }

  if (field.maxItems !== undefined) {
    rules.push({
      id: 'max-items',
      label: t('validationRules.maxItems'),
      detail: String(field.maxItems),
    });
  }

  if (fieldRules) {
    pushConditionalRule(
      rules,
      'visible-when',
      'validationRules.visibleWhen',
      fieldRules.visibleWhen,
      t,
    );
    pushConditionalRule(
      rules,
      'enabled-when',
      'validationRules.enabledWhen',
      fieldRules.enabledWhen,
      t,
    );
    pushConditionalRule(
      rules,
      'required-when',
      'validationRules.requiredWhen',
      fieldRules.requiredWhen,
      t,
    );

    const calculate = formatRuleExpression(fieldRules.calculate, t);
    if (calculate) {
      rules.push({
        id: 'calculate',
        label: t('validationRules.calculated'),
        detail: calculate,
      });
    }
  }

  return rules;
}
