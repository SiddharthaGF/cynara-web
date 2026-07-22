import type { CSSProperties, JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.tsx';
import type {
  ClinicalField,
  ComponentSummary,
  FieldPresentation,
  FieldRules,
} from '@/features/forms/types.ts';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset.ts';
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
  const keyboardInset = useKeyboardInset();

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
    // Same `min(calc(...), N)` workaround as in FormPreviewDialog: avoid
    // Mixing the calc() inside min() because some engines serialize the
    // Resulting max-height too aggressively and the sheet shrinks to a stub.
    const insetPx = `${Math.max(0, keyboardInset)}px`;
    const sheetStyle: CSSProperties = {
      maxHeight: `calc(100dvh - ${insetPx})`,
      height: `calc(100dvh - ${insetPx})`,
      paddingBottom: insetPx,
    };
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        modal
      >
        <SheetContent
          side='bottom'
          showCloseButton
          fullHeight
          style={sheetStyle}
          className='inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl border-t p-0'
        >
          <SheetHeader
            style={{ paddingRight: 'calc(var(--kb-safe) + 2.5rem)' }}
            className='flex flex-row items-center justify-between gap-2 border-b px-4 py-2.5'
          >
            <div className='flex min-w-0 flex-col'>
              <SheetTitle className='text-sm font-semibold'>
                {t('mobile.fieldSettings.sheetTitle')}
              </SheetTitle>
              <SheetDescription className='truncate text-xs text-muted-foreground'>
                {t('mobile.fieldSettings.sheetSubtitle')}
              </SheetDescription>
            </div>
          </SheetHeader>
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
