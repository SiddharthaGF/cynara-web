import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  ClinicalField,
  ComponentSummary,
  FieldPresentation,
  FieldRules,
} from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { FieldInspectorBody } from './FieldInspectorBody.tsx';
import type { RuleFieldOption } from './FieldInspectorRulesSection.tsx';

interface FieldInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: ClinicalField;
  presentation: FieldPresentation | null;
  rules: FieldRules | null;
  fieldIndex: number;
  fieldOptions: RuleFieldOption[];
  components: ComponentSummary[];
  onChangeField: (patch: Partial<ClinicalField>) => void;
  onChangePresentation: (patch: Partial<FieldPresentation>) => void;
  onChangeRules: (patch: Partial<FieldRules>) => void;
  readOnly?: boolean;
}

/** Advanced field settings — docked right rail (same shell as AI chat). */
export function FieldInspector({
  open,
  onOpenChange,
  field,
  presentation,
  rules,
  fieldIndex,
  fieldOptions,
  components,
  onChangeField,
  onChangePresentation,
  onChangeRules,
  readOnly = false,
}: FieldInspectorProps): JSX.Element | null {
  const { t } = useTranslation('designer');

  if (!open) {
    return null;
  }

  return (
    <aside
      className={cn(
        'inspector-shell flex h-full min-h-0 w-full max-w-[22rem] shrink-0 flex-col border-l border-border/50 xl:max-w-[24rem]',
      )}
      aria-label={t('inspector.caseFile')}
    >
      <FieldInspectorBody
        key={field.id}
        field={field}
        presentation={presentation}
        rules={rules}
        fieldIndex={fieldIndex}
        fieldOptions={fieldOptions}
        components={components}
        onChangeField={onChangeField}
        onChangePresentation={onChangePresentation}
        onChangeRules={onChangeRules}
        onClose={() => {
          onOpenChange(false);
        }}
        readOnly={readOnly}
      />
    </aside>
  );
}
