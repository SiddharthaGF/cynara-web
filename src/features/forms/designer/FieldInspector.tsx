import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  PanelHeader,
  PanelHeaderCloseButton,
} from '@/components/panel/index.ts';
import { Sheet, SheetContent } from '@/components/ui/sheet.tsx';
import type {
  ClinicalField,
  ComponentSummary,
  FieldPresentation,
  FieldRules,
} from '@/features/forms/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';
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

/**
 * Field settings — docked right rail on desktop, floating bottom sheet on
 * mobile. The body component is shared so the same chrome (hero header, tabs,
 * autosave behavior) renders in either surface.
 */
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
  const isMobile = useIsMobile();

  if (!open) {
    return null;
  }

  const body = (
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
      hideCloseButton={isMobile}
      readOnly={readOnly}
    />
  );

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        modal
      >
        <SheetContent
          side='bottom'
          fullHeight
          showCloseButton={false}
          className='inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border-t p-0'
        >
          <PanelHeader
            surface='mobile'
            title={t('mobile.fieldSettings.sheetTitle')}
            subtitle={t('mobile.fieldSettings.sheetSubtitle')}
            overlay={
              <PanelHeaderCloseButton
                onClick={() => {
                  onOpenChange(false);
                }}
                label={t('inspector.close')}
              />
            }
          />
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'inspector-shell flex h-full min-h-0 w-full max-w-[22rem] shrink-0 flex-col border-l border-border/50 xl:max-w-[24rem]',
      )}
      aria-label={t('inspector.caseFile')}
    >
      {body}
    </aside>
  );
}
