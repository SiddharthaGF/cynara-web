import {
  duplicateFieldCodeExists,
  duplicateFieldIdExists,
  iterateFields,
} from '../model/formDraft.ts';
import type { FormDraftModel, ValidationIssue } from '../types.ts';

export function validateDraft(model: FormDraftModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!model.clinical.schemaVersion) {
    issues.push({
      code: 'MISSING_SCHEMA_VERSION',
      path: '/clinical/schemaVersion',
      message: 'Clinical schemaVersion is required.',
    });
  }

  if (model.clinical.fields.length === 0) {
    issues.push({
      code: 'EMPTY_FORM',
      path: '/clinical/fields',
      message: 'Add at least one field before saving.',
    });
  }

  for (const field of iterateFields(model.clinical.fields)) {
    const path = `/clinical/fields/${field.id}`;

    if (!field.id.trim()) {
      issues.push({
        code: 'MISSING_FIELD_ID',
        path: `${path}/id`,
        message: 'Field id is required.',
      });
    }

    if (!field.code.trim()) {
      issues.push({
        code: 'MISSING_FIELD_CODE',
        path: `${path}/code`,
        message: 'Field code is required.',
      });
    }

    if (duplicateFieldIdExists(model.clinical.fields, field.id)) {
      issues.push({
        code: 'DUPLICATE_FIELD_ID',
        path: `${path}/id`,
        message: `Duplicate field id '${field.id}'.`,
      });
    }

    if (duplicateFieldCodeExists(model.clinical.fields, field.code)) {
      issues.push({
        code: 'DUPLICATE_FIELD_CODE',
        path: `${path}/code`,
        message: `Duplicate field code '${field.code}'.`,
      });
    }

    if (field.type === 'component-ref') {
      if (!field.componentCode?.trim()) {
        issues.push({
          code: 'MISSING_COMPONENT_CODE',
          path: `${path}/componentCode`,
          message: 'Select a reusable component.',
        });
      } else if (field.componentVersion && !field.componentVersion.trim()) {
        issues.push({
          code: 'INVALID_COMPONENT_VERSION',
          path: `${path}/componentVersion`,
          message: 'Component version must not be blank when set.',
        });
      }
    }

    if (
      field.type === 'choice' &&
      (!field.options || field.options.length === 0)
    ) {
      issues.push({
        code: 'CHOICE_OPTIONS_REQUIRED',
        path: `${path}/options`,
        message: 'Choice fields require at least one option.',
      });
    }
  }

  if (
    model.ui.clinicalSchemaVersion &&
    model.ui.clinicalSchemaVersion !== model.clinical.schemaVersion
  ) {
    issues.push({
      code: 'CLINICAL_VERSION_MISMATCH',
      path: '/ui/clinicalSchemaVersion',
      message: 'UI schema version does not match clinical schema version.',
    });
  }

  return issues;
}

export function issuesForField(
  issues: ValidationIssue[],
  fieldId: string,
): ValidationIssue[] {
  return issues.filter((issue) => issue.path.includes(`/${fieldId}`));
}
