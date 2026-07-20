import { useMemo, useState } from 'react';

import {
  appendFieldToLayout,
  createField,
  iterateFields,
  moveField,
  removeField,
  removeFieldFromLayout,
  syncUiSchema,
  updateField,
} from '../model/formDraft.ts';
import type {
  ClinicalField,
  FieldPresentation,
  FieldRules,
  FieldType,
} from '../types.ts';
import { useComponentCatalog } from './useComponentCatalog.ts';
import { useFormDraft } from './useFormDraft.ts';

export function useFormDesignerLayout(
  code: string,
  setOpenMobile: (open: boolean) => void,
) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const components = useComponentCatalog();
  const draft = useFormDraft(code);

  const selectedField = useMemo(
    () =>
      draft.model.clinical.fields.find(
        (field) => field.id === selectedFieldId,
      ) ?? null,
    [draft.model.clinical.fields, selectedFieldId],
  );

  const selectedPresentation = selectedField
    ? (draft.model.ui.fields[selectedField.id] ?? null)
    : null;
  const selectedRules = selectedField
    ? (draft.model.rules.fields[selectedField.id] ?? null)
    : null;

  const fieldCodes = useMemo(
    () =>
      [...iterateFields(draft.model.clinical.fields)].map((item) => item.code),
    [draft.model.clinical.fields],
  );

  function handleAddField(type: FieldType): void {
    draft.setModel((current) => {
      const nextField = createField(type, current.clinical.fields.length);
      const clinical = {
        ...current.clinical,
        fields: [...current.clinical.fields, nextField],
      };
      const ui = syncUiSchema(clinical, current.ui);
      ui.layout = appendFieldToLayout(ui.layout ?? [], nextField.id);
      ui.fields[nextField.id] = {
        label: ui.fields[nextField.id]?.label,
        widget: ui.fields[nextField.id]?.widget,
      };
      setSelectedFieldId(nextField.id);
      setShowAdvanced(false);
      setOpenMobile(false);
      return { ...current, clinical, ui };
    });
  }

  function handleOpenAdvanced(fieldId: string): void {
    setSelectedFieldId(fieldId);
    setShowAdvanced(true);
  }

  function handleChangeFieldType(fieldId: string, type: FieldType): void {
    draft.setModel((current) => {
      const index = current.clinical.fields.findIndex(
        (field) => field.id === fieldId,
      );
      if (index === -1) {
        return current;
      }

      const existing = current.clinical.fields[index];
      if (!existing || existing.type === type) {
        return current;
      }

      const template = createField(type, index);
      const nextField = {
        ...template,
        id: existing.id,
        code: existing.code,
        required: existing.required,
        readOnly: existing.readOnly,
      };

      const clinical = {
        ...current.clinical,
        fields: current.clinical.fields.map((field) =>
          field.id === fieldId ? nextField : field,
        ),
      };
      const ui = syncUiSchema(clinical, current.ui);
      const prevPresentation = current.ui.fields[fieldId];
      if (prevPresentation) {
        ui.fields[fieldId] = {
          ...ui.fields[fieldId],
          label: prevPresentation.label,
          helpText: prevPresentation.helpText,
          placeholder: prevPresentation.placeholder,
        };
      }

      return { ...current, clinical, ui };
    });
  }

  function handleMoveUp(index: number): void {
    draft.setModel((current) => ({
      ...current,
      clinical: {
        ...current.clinical,
        fields: moveField(current.clinical.fields, index, index - 1),
      },
    }));
  }

  function handleMoveDown(index: number): void {
    draft.setModel((current) => ({
      ...current,
      clinical: {
        ...current.clinical,
        fields: moveField(current.clinical.fields, index, index + 1),
      },
    }));
  }

  function handleRemove(fieldId: string): void {
    draft.setModel((current) => {
      const clinical = {
        ...current.clinical,
        fields: removeField(current.clinical.fields, fieldId),
      };
      const ui = syncUiSchema(clinical, current.ui);
      ui.layout = removeFieldFromLayout(ui.layout ?? [], fieldId);
      const { [fieldId]: _removedFieldRules, ...remainingFieldRules } =
        current.rules.fields;
      const rules = {
        ...current.rules,
        fields: remainingFieldRules,
      };
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
        setShowAdvanced(false);
      }
      return { ...current, clinical, ui, rules };
    });
  }

  function handleChangePresentation(
    fieldId: string,
    patch: Partial<FieldPresentation>,
  ): void {
    draft.setModel((current) => {
      const merged: FieldPresentation = {
        ...current.ui.fields[fieldId],
        ...patch,
      };

      if ('timePresets' in patch && !patch.timePresets?.length) {
        delete merged.timePresets;
      }

      return {
        ...current,
        ui: {
          ...current.ui,
          fields: {
            ...current.ui.fields,
            [fieldId]: merged,
          },
        },
      };
    });
  }

  function handleToggleRequired(fieldId: string, required: boolean): void {
    draft.setModel((current) => ({
      ...current,
      clinical: {
        ...current.clinical,
        fields: updateField(current.clinical.fields, fieldId, { required }),
      },
    }));
  }

  function handleInspectorChangeField(patch: Partial<ClinicalField>) {
    if (!selectedField) {
      return;
    }
    draft.setModel((current) => ({
      ...current,
      clinical: {
        ...current.clinical,
        fields: updateField(
          current.clinical.fields,
          selectedField.id,
          patch,
        ),
      },
    }));
  }

  function handleInspectorChangePresentation(patch: Partial<FieldPresentation>) {
    if (!selectedField) {
      return;
    }
    handleChangePresentation(selectedField.id, patch);
  }

  function handleInspectorChangeRules(patch: Partial<FieldRules>) {
    if (!selectedField) {
      return;
    }
    draft.setModel((current) => ({
      ...current,
      rules: {
        ...current.rules,
        fields: {
          ...current.rules.fields,
          [selectedField.id]: {
            ...current.rules.fields[selectedField.id],
            ...patch,
          },
        },
      },
    }));
  }

  return {
    draft,
    components,
    selectedFieldId,
    setSelectedFieldId,
    showAdvanced,
    setShowAdvanced,
    selectedField,
    selectedPresentation,
    selectedRules,
    fieldCodes,
    handleAddField,
    handleOpenAdvanced,
    handleChangeFieldType,
    handleMoveUp,
    handleMoveDown,
    handleRemove,
    handleChangePresentation,
    handleToggleRequired,
    handleInspectorChangeField,
    handleInspectorChangePresentation,
    handleInspectorChangeRules,
  };
}
