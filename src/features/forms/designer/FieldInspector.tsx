import { X } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { Drawer, DrawerContent } from '@/components/ui/drawer.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import {
  DEFAULT_WIDGETS,
  WIDGETS_BY_FIELD_TYPE,
} from '@/features/forms/designer/fieldInspectorMeta.ts';
import type {
  ClinicalField,
  ComponentSummary,
  FieldPresentation,
  FieldRules,
} from '@/features/forms/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';
import { cn } from '@/lib/utils.ts';

import { FieldInspectorClinicalSection } from './FieldInspectorClinicalSection.tsx';
import { FieldInspectorPresentationSection } from './FieldInspectorPresentationSection.tsx';
import { FieldInspectorRulesSection } from './FieldInspectorRulesSection.tsx';
import { useFieldTypeMeta } from './useFieldTypeMeta.ts';

interface FieldInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: ClinicalField;
  presentation: FieldPresentation | null;
  rules: FieldRules | null;
  fieldCodes: string[];
  components: ComponentSummary[];
  onChangeField: (patch: Partial<ClinicalField>) => void;
  onChangePresentation: (patch: Partial<FieldPresentation>) => void;
  onChangeRules: (patch: Partial<FieldRules>) => void;
  readOnly?: boolean;
}

/** Advanced settings — drawer on mobile, side panel on desktop */
export function FieldInspector({
  open,
  onOpenChange,
  field,
  presentation,
  rules,
  fieldCodes,
  components,
  onChangeField,
  onChangePresentation,
  onChangeRules,
  readOnly = false,
}: FieldInspectorProps): JSX.Element | null {
  const isMobile = useIsMobile();
  const body = (
    <FieldInspectorBody
      key={field.id}
      field={field}
      presentation={presentation}
      rules={rules}
      fieldCodes={fieldCodes}
      components={components}
      onChangeField={onChangeField}
      onChangePresentation={onChangePresentation}
      onChangeRules={onChangeRules}
      onClose={() => {
        onOpenChange(false);
      }}
      readOnly={readOnly}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        swipeDirection='right'
        showSwipeHandle
      >
        <DrawerContent className='max-h-dvh'>{body}</DrawerContent>
      </Drawer>
    );
  }

  if (!open) {
    return null;
  }

  return (
    <aside className='flex w-80 shrink-0 flex-col border-l bg-sidebar min-h-0'>
      {body}
    </aside>
  );
}

function FieldInspectorBody({
  field,
  presentation,
  rules,
  fieldCodes,
  components,
  onChangeField,
  onChangePresentation,
  onChangeRules,
  onClose,
  readOnly = false,
}: Omit<FieldInspectorProps, 'open' | 'onOpenChange'> & {
  onClose: () => void;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const { t: tc } = useTranslation('common');
  const isMobile = useIsMobile();
  const meta = useFieldTypeMeta(field.type);
  const widgetOptions = WIDGETS_BY_FIELD_TYPE[field.type];
  const currentWidget = presentation?.widget ?? DEFAULT_WIDGETS[field.type];
  const [mobileTab, setMobileTab] = useState('presentation');

  return (
    <Card className='flex h-full min-h-0 flex-col rounded-none border-0 shadow-none md:border-l'>
      <CardHeader className='shrink-0 flex-row items-start justify-between gap-2'>
        <div className='min-w-0'>
          <CardDescription>{meta.label}</CardDescription>
          <CardTitle className='font-heading'>
            {t('inspector.moreOptions')}
          </CardTitle>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={tc('actions.close')}
          onClick={onClose}
        >
          <X />
        </Button>
      </CardHeader>

      <CardContent className='flex-1 overflow-hidden p-0'>
        <ScrollArea className='h-full'>
          <div className='grid gap-5 p-4 pt-0'>
            {isMobile ? (
              <Tabs
                value={mobileTab}
                onValueChange={(value) => {
                  if (typeof value === 'string') {
                    setMobileTab(value);
                  }
                }}
              >
                <TabsList className='grid w-full grid-cols-3'>
                  <TabsTrigger value='presentation'>
                    {t('inspector.tabs.presentation')}
                  </TabsTrigger>
                  <TabsTrigger value='clinical'>
                    {t('inspector.tabs.clinical')}
                  </TabsTrigger>
                  <TabsTrigger value='rules'>
                    {t('inspector.tabs.rules')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : null}

            <div
              className={cn(
                isMobile && mobileTab !== 'presentation' && 'hidden',
              )}
            >
              <FieldInspectorPresentationSection
                field={field}
                presentation={presentation}
                widgetOptions={widgetOptions}
                currentWidget={currentWidget}
                readOnly={readOnly}
                onChangePresentation={onChangePresentation}
              />
            </div>

            {isMobile ? null : <Separator />}

            <div
              className={cn(isMobile && mobileTab !== 'clinical' && 'hidden')}
            >
              <FieldInspectorClinicalSection
                field={field}
                components={components}
                readOnly={readOnly}
                onChangeField={onChangeField}
              />

              <Separator />

              <FieldInspectorRulesSection
                field={field}
                fieldCodes={fieldCodes}
                rules={rules}
                readOnly={readOnly}
                onChangeRules={onChangeRules}
              />
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
