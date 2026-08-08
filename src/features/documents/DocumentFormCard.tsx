import { FileText } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { ClinicalDocumentDto } from '@/api/clinical-documents.ts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { DocumentActionsBar } from '@/features/documents/DocumentActionsBar.tsx';
import { DocumentMetadataGrid } from '@/features/documents/DocumentMetadataGrid.tsx';
import type { DocumentTransitionKind } from '@/features/documents/DocumentTransitionConfirmDialog.tsx';
import { FormRendererView } from '@/features/forms/renderer/FormRenderer.tsx';
import type { FormSnapshot } from '@/features/forms/renderer/types.ts';
import type { UseFormRendererReturn } from '@/features/forms/renderer/useFormRenderer.ts';

interface DocumentFormCardProps {
  document: ClinicalDocumentDto;
  definitionName: string;
  fallbackCode: string;
  version: string | null;
  language: string;
  model: FormSnapshot;
  renderer: UseFormRendererReturn;
  editable: boolean;
  terminal: boolean;
  isSaving: boolean;
  isTransitioning: boolean;
  onSave: () => void;
  onComplete: () => void;
  onTransition: (kind: DocumentTransitionKind) => void;
}

export function DocumentFormCard({
  document,
  definitionName,
  fallbackCode,
  version,
  language,
  model,
  renderer,
  editable,
  terminal,
  isSaving,
  isTransitioning,
  onSave,
  onComplete,
  onTransition,
}: DocumentFormCardProps): JSX.Element {
  const { t } = useTranslation('documents');
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <Card
          className={
            terminal
              ? 'border-border/70 bg-muted/15 shadow-sm'
              : 'border-border/70 shadow-sm'
          }
          data-testid='document-detail-view'
        >
          <CardHeader>
            <CardTitle className='flex items-center gap-2 font-heading text-lg'>
              <FileText className='size-4 text-muted-foreground' />
              {definitionName || fallbackCode}
            </CardTitle>
            <CardDescription>
              {t('detail.fields.formVersion')}: {version ?? fallbackCode}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <DocumentMetadataGrid
              document={document}
              language={language}
            />

            <div
              className='border-t border-border/70 pt-6'
              data-testid='document-form-canvas'
            >
              <FormRendererView
                model={model}
                renderer={renderer}
              />
            </div>

            {editable ? (
              <DocumentActionsBar
                isSaving={isSaving}
                isTransitioning={isTransitioning}
                onSave={onSave}
                onComplete={onComplete}
                onTransition={onTransition}
              />
            ) : null}
          </CardContent>
        </Card>
      </m.div>
    </LazyMotion>
  );
}
