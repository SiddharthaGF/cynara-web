import { X } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import {
  DEFAULT_WIDGETS,
  WIDGETS_BY_FIELD_TYPE,
} from '@/features/forms/designer/fieldInspectorMeta.ts';
import {
  isSectionId,
  type SectionId,
} from '@/features/forms/designer/fieldInspectorStatus.ts';
import type {
  ClinicalField,
  ComponentSummary,
  FieldPresentation,
  FieldRules,
} from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { FieldInspectorClinicalSection } from './FieldInspectorClinicalSection.tsx';
import { FieldInspectorPresentationSection } from './FieldInspectorPresentationSection.tsx';
import {
  FieldInspectorRulesSection,
  type RuleFieldOption,
} from './FieldInspectorRulesSection.tsx';
import { FieldTypeBadge } from './FieldTypeIcon.tsx';

interface FieldInspectorBodyProps {
  field: ClinicalField;
  presentation: FieldPresentation | null;
  rules: FieldRules | null;
  fieldIndex: number;
  fieldOptions: RuleFieldOption[];
  components: ComponentSummary[];
  onChangeField: (patch: Partial<ClinicalField>) => void;
  onChangePresentation: (patch: Partial<FieldPresentation>) => void;
  onChangeRules: (patch: Partial<FieldRules>) => void;
  onClose: () => void;
  /**
   * When true (mobile sheet surface), the in-body close X is omitted because
   * the parent sheet already provides one.
   */
  hideCloseButton?: boolean;
  readOnly?: boolean;
}

export function FieldInspectorBody({
  field,
  presentation,
  rules,
  fieldIndex,
  fieldOptions,
  components,
  onChangeField,
  onChangePresentation,
  onChangeRules,
  onClose,
  hideCloseButton = false,
  readOnly = false,
}: FieldInspectorBodyProps): JSX.Element {
  const { t } = useTranslation('designer');
  const { t: tc } = useTranslation('common');
  const widgetOptions = WIDGETS_BY_FIELD_TYPE[field.type];
  const currentWidget = presentation?.widget ?? DEFAULT_WIDGETS[field.type];
  const [activeTab, setActiveTab] = useState<SectionId>('presentation');

  const label = presentation?.label?.trim() ?? '';
  const showUntitled = label.length === 0;
  const codeText = field.code?.trim() ?? '';
  const questionNumber = fieldIndex + 1;

  const sections: readonly { id: SectionId; label: string }[] = [
    { id: 'presentation', label: t('inspector.tabs.presentation') },
    { id: 'clinical', label: t('inspector.tabs.clinical') },
    { id: 'rules', label: t('inspector.tabs.rules') },
  ];

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <header className='inspector-header shrink-0'>
        <div className='relative flex items-start gap-2 px-4 py-3 pr-12'>
          <div className='min-w-0 flex-1'>
            <p className='inspector-eyebrow'>
              <span>{t('inspector.caseFile')}</span>
              <span
                aria-hidden='true'
                className='text-muted-foreground/40'
              >
                ·
              </span>
              <span>
                {t('inspector.questionNumber', { number: questionNumber })}
              </span>
            </p>

            <h2
              className={cn(
                'inspector-title mt-1.5',
                showUntitled && 'inspector-title--untitled',
              )}
            >
              {showUntitled ? t('canvas.untitledQuestion') : label}
            </h2>

            {codeText ? (
              <p className='mt-2 flex items-center gap-2'>
                <span className='inspector-eyebrow text-[9.5px]'>
                  {t('inspector.codeLabel')}
                </span>
                <code className='inspector-code'>{codeText}</code>
              </p>
            ) : null}

            <div className='mt-3 flex flex-wrap items-center gap-1.5'>
              <FieldTypeBadge type={field.type} />
              {field.required ? (
                <Badge
                  variant='destructive'
                  className='font-normal'
                >
                  {t('canvas.required')}
                </Badge>
              ) : null}
              {field.readOnly ? (
                <Badge
                  variant='outline'
                  className='font-normal'
                >
                  {t('canvas.readOnly')}
                </Badge>
              ) : null}
              {presentation?.hidden ? (
                <Badge
                  variant='outline'
                  className='font-normal'
                >
                  {t('inspector.hidden')}
                </Badge>
              ) : null}
            </div>
          </div>

          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={tc('actions.close')}
            onClick={onClose}
            className={cn(
              'absolute top-2.5 right-2.5 hidden rounded-full md:flex',
              hideCloseButton && 'md:hidden',
            )}
          >
            <X className='size-4' />
          </Button>
        </div>
      </header>

      <div className='shrink-0 px-4 pt-3 pb-2 sm:px-5'>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isSectionId(value)) {
              setActiveTab(value);
            }
          }}
        >
          <TabsList
            variant='line'
            className='grid h-9 w-full grid-cols-3 rounded-none bg-transparent px-1'
            aria-label={t('inspector.tabNavLabel')}
          >
            {sections.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className='px-4'
              >
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className='flex-1 overflow-hidden'>
        <ScrollArea className='h-full'>
          <div className='flex flex-col gap-7 px-4 py-5 sm:px-5'>
            {activeTab === 'presentation' ? (
              <div
                id='inspector-section-presentation'
                className='inspector-section'
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
            ) : null}

            {activeTab === 'clinical' ? (
              <div
                id='inspector-section-clinical'
                className='inspector-section'
              >
                <FieldInspectorClinicalSection
                  field={field}
                  components={components}
                  readOnly={readOnly}
                  onChangeField={onChangeField}
                />
              </div>
            ) : null}

            {activeTab === 'rules' ? (
              <div
                id='inspector-section-rules'
                className='inspector-section'
              >
                <FieldInspectorRulesSection
                  field={field}
                  fieldOptions={fieldOptions}
                  rules={rules}
                  readOnly={readOnly}
                  onChangeRules={onChangeRules}
                />
              </div>
            ) : null}

            <p className='text-[11px] leading-relaxed text-muted-foreground/70'>
              {t('inspector.scopeNote')}
            </p>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
