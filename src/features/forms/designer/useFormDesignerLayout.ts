import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import {
  appendFieldToLayout,
  buildLayout,
  createField,
  insertFieldInLayout,
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
  FormVersion,
} from '../types.ts';
import { useComponentCatalog } from './useComponentCatalog.ts';
import { useFormDraft } from './useFormDraft.ts';

export function useFormDesignerLayout(
  code: string,
  initialDraft: FormVersion,
): {
  draft: ReturnType<typeof useFormDraft>;
  components: ReturnType<typeof useComponentCatalog>;
  selectedFieldId: string | null;
  setSelectedFieldId: Dispatch<SetStateAction<string | null>>;
  showAdvanced: boolean;
  setShowAdvanced: Dispatch<SetStateAction<boolean>>;
  selectedField: ClinicalField | null;
  selectedFieldIndex: number;
  selectedPresentation: FieldPresentation | null;
  selectedRules: FieldRules | null;
  ruleFieldOptions: { code: string; label: string }[];
  handleAddField: (type: FieldType, atIndex?: number) => void;
  handleOpenAdvanced: (fieldId: string) => void;
  handleChangeFieldType: (fieldId: string, type: FieldType) => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
  handleRemove: (fieldId: string) => void;
  handleChangePresentation: (
    fieldId: string,
    patch: Partial<FieldPresentation>,
  ) => void;
  handleToggleRequired: (fieldId: string, required: boolean) => void;
  handleInspectorChangeField: (patch: Partial<ClinicalField>) => void;
  handleInspectorChangePresentation: (
    patch: Partial<FieldPresentation>,
  ) => void;
  handleInspectorChangeRules: (patch: Partial<FieldRules>) => void;
} {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const components = useComponentCatalog();
  const draft = useFormDraft(code, initialDraft);

  useEffect(() => {
    if (!selectedFieldId) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }

      // Let nested overlays (select, menu, popover) consume Escape first.
      if (
        document.querySelector(
          '[data-slot="select-content"][data-open], [data-slot="dropdown-menu-content"][data-open], [data-slot="popover-content"][data-open]',
        )
      ) {
        return;
      }

      setSelectedFieldId(null);
      setShowAdvanced(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFieldId]);

  const selectedField = useMemo(
    () =>
      draft.model.clinical.fields.find(
        (field) => field.id === selectedFieldId,
      ) ?? null,
    [draft.model.clinical.fields, selectedFieldId],
  );

  const selectedFieldIndex = useMemo(
    () =>
      selectedField
        ? draft.model.clinical.fields.findIndex(
            (field) => field.id === selectedField.id,
          )
        : -1,
    [draft.model.clinical.fields, selectedField],
  );

  const selectedPresentation = selectedField
    ? (draft.model.ui.fields[selectedField.id] ?? null)
    : null;
  const selectedRules = selectedField
    ? (draft.model.rules.fields[selectedField.id] ?? null)
    : null;

  const ruleFieldOptions = useMemo(
    () =>
      [...iterateFields(draft.model.clinical.fields)].map((item) => {
        const label = draft.model.ui.fields[item.id]?.label?.trim();
        return {
          code: item.code,
          label: label && label.length > 0 ? label : item.code,
        };
      }),
    [draft.model.clinical.fields, draft.model.ui.fields],
  );

  function handleAddField(type: FieldType, atIndex?: number): void {
    draft.setModel((current) => {
      const index = atIndex ?? current.clinical.fields.length;
      const nextField = createField(type, index);
      const fields = [...current.clinical.fields];
      fields.splice(index, 0, nextField);
      const clinical = {
        ...current.clinical,
        fields,
      };
      const ui = syncUiSchema(clinical, current.ui);
      const priorLayout = current.ui.layout ?? [];
      if (atIndex === undefined) {
        ui.layout = appendFieldToLayout(priorLayout, nextField.id);
      } else if (priorLayout.length > 0) {
        ui.layout = insertFieldInLayout(priorLayout, nextField, index);
      } else {
        ui.layout = buildLayout(fields);
      }
      ui.fields[nextField.id] = {
        label: ui.fields[nextField.id]?.label,
        widget: ui.fields[nextField.id]?.widget,
      };
      setSelectedFieldId(nextField.id);
      setShowAdvanced(false);
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

  function handleInspectorChangeField(patch: Partial<ClinicalField>): void {
    if (!selectedField) {
      return;
    }
    draft.setModel((current) => ({
      ...current,
      clinical: {
        ...current.clinical,
        fields: updateField(current.clinical.fields, selectedField.id, patch),
      },
    }));
  }

  function handleInspectorChangePresentation(
    patch: Partial<FieldPresentation>,
  ): void {
    if (!selectedField) {
      return;
    }
    handleChangePresentation(selectedField.id, patch);
  }

  function handleInspectorChangeRules(patch: Partial<FieldRules>): void {
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
    selectedFieldIndex,
    selectedPresentation,
    selectedRules,
    ruleFieldOptions,
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
