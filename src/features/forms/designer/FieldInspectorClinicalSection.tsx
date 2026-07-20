import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field.tsx';
import type {
  ClinicalField,
  ComponentSummary,
} from '@/features/forms/types.ts';
import { useSyncedTanstackForm } from '@/lib/useSyncedTanstackForm.ts';

import {
  ClinicalChoiceConstraintFields,
  ClinicalCommonFields,
  ClinicalComponentRefFields,
  ClinicalDefaultValueFields,
  ClinicalDescriptionField,
  ClinicalNumberConstraintFields,
  ClinicalRepeaterConstraintFields,
  ClinicalTextConstraintFields,
} from './FieldInspectorClinicalFields.tsx';
import {
  clinicalFieldToFormValues,
  clinicalFormValuesToPatch,
  type ClinicalFormValues,
} from './fieldInspectorFormUtils.ts';

interface FieldInspectorClinicalSectionProps {
  field: ClinicalField;
  components: ComponentSummary[];
  readOnly: boolean;
  onChangeField: (patch: Partial<ClinicalField>) => void;
}

export function FieldInspectorClinicalSection({
  field,
  components,
  readOnly,
  onChangeField,
}: FieldInspectorClinicalSectionProps): JSX.Element {
  const { t } = useTranslation('designer');

  const form = useSyncedTanstackForm<ClinicalFormValues>({
    defaultValues: clinicalFieldToFormValues(field),
    onValuesChange: (values) => {
      onChangeField(clinicalFormValuesToPatch(field, values));
    },
  });

  const sectionProps = { field, form, t };

  return (
    <FieldSet disabled={readOnly}>
      <FieldLegend variant='label'>
        {t('inspector.clinicalConstraints')}
      </FieldLegend>
      <FieldGroup>
        <ClinicalDescriptionField {...sectionProps} />
        <ClinicalDefaultValueFields {...sectionProps} />
        <ClinicalCommonFields {...sectionProps} />
        <ClinicalTextConstraintFields {...sectionProps} />
        <ClinicalNumberConstraintFields {...sectionProps} />
        <ClinicalChoiceConstraintFields {...sectionProps} />
        <ClinicalRepeaterConstraintFields {...sectionProps} />
        <ClinicalComponentRefFields
          {...sectionProps}
          components={components}
        />
      </FieldGroup>
    </FieldSet>
  );
}
