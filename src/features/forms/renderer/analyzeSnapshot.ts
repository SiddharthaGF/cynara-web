import type { TFunction } from 'i18next';

import { WIDGETS_BY_FIELD_TYPE } from '@/features/forms/designer/fieldInspectorMeta.ts';
import { iterateFields } from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';
import { translateValidationIssue } from '@/features/forms/validation/translateValidationIssue.ts';
import { validateDraft } from '@/features/forms/validation/validateDraft.ts';

import type { ConfigWarning } from './types.ts';

const SUPPORTED_RENDER_TYPES = new Set([
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
]);

export function analyzeSnapshot(
  model: FormDraftModel,
  t: TFunction<'validation'>,
): ConfigWarning[] {
  const warnings: ConfigWarning[] = [];

  for (const issue of validateDraft(model)) {
    warnings.push({
      code: issue.code,
      message: translateValidationIssue(issue, t),
      fieldId: extractFieldId(issue.path),
    });
  }

  for (const field of iterateFields(model.clinical.fields)) {
    const presentation = model.ui.fields[field.id];

    if (
      !SUPPORTED_RENDER_TYPES.has(field.type) &&
      field.type !== 'component-ref'
    ) {
      warnings.push({
        code: 'UNSUPPORTED_FIELD_TYPE',
        message: t('renderer.UNSUPPORTED_FIELD_TYPE', { type: field.type }),
        fieldId: field.id,
      });
    }

    if (field.type === 'component-ref') {
      if (!field.componentCode?.trim()) {
        warnings.push({
          code: 'UNRESOLVED_COMPONENT',
          message: t('renderer.UNRESOLVED_COMPONENT'),
          fieldId: field.id,
        });
      } else if (field.componentVersion?.trim()) {
        warnings.push({
          code: 'COMPONENT_NOT_COMPILED',
          message: t('renderer.COMPONENT_NOT_COMPILED', {
            componentCode: field.componentCode,
          }),
          fieldId: field.id,
        });
      } else {
        warnings.push({
          code: 'UNPINNED_COMPONENT',
          message: t('renderer.UNPINNED_COMPONENT', {
            componentCode: field.componentCode,
          }),
          fieldId: field.id,
        });
      }
    }

    if (presentation?.widget) {
      const allowed = WIDGETS_BY_FIELD_TYPE[field.type] ?? [];
      if (!allowed.includes(presentation.widget)) {
        warnings.push({
          code: 'UNKNOWN_WIDGET',
          message: t('renderer.UNKNOWN_WIDGET', {
            widget: presentation.widget,
            fieldType: field.type,
          }),
          fieldId: field.id,
        });
      }
    }

    if (presentation?.hidden) {
      warnings.push({
        code: 'HIDDEN_BY_UI',
        message: t('renderer.HIDDEN_BY_UI'),
        fieldId: field.id,
      });
    }
  }

  return warnings;
}

function extractFieldId(path: string): string | undefined {
  const match = /\/fields\/(?<fieldId>[^/]+)/.exec(path);
  return match?.groups?.fieldId;
}
