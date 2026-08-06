import { Link } from '@tanstack/react-router';
import { ArrowLeft, FileText } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ClinicalDocumentDto } from '@/api/clinical-documents.ts';
import {
  isForbiddenClinicalDocumentError,
  isInProgressClinicalDocument,
  isStaleClinicalDocumentError,
  isTerminalClinicalDocument,
} from '@/api/clinical-documents.ts';
import { describeApiError } from '@/api/error-message.ts';
import { isStaleFormResponseError } from '@/api/form-responses.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { InsufficientPermissionNotice } from '@/features/access-control/InsufficientPermissionNotice.tsx';
import {
  clinicalDocumentStatusBadgeVariant,
  formatClinicalDocumentStatus,
} from '@/features/documents/clinicalDocumentForm.ts';
import { DocumentActionsBar } from '@/features/documents/DocumentActionsBar.tsx';
import { DocumentDetailShell } from '@/features/documents/DocumentDetailStates.tsx';
import { DocumentMetadataGrid } from '@/features/documents/DocumentMetadataGrid.tsx';
import {
  DocumentTransitionConfirmDialog,
  type DocumentTransitionKind,
} from '@/features/documents/DocumentTransitionConfirmDialog.tsx';
import {
  useClinicalDocumentTransitions,
  useUpdateFormResponse,
} from '@/features/documents/useClinicalDocumentsCatalog.ts';
import { parseDraft } from '@/features/forms/model/formDraft.ts';
import {
  FormRendererView,
  useFormRenderer,
} from '@/features/forms/renderer/FormRenderer.tsx';
import { createInitialValues } from '@/features/forms/renderer/formValues.ts';
import type { FormValues } from '@/features/forms/renderer/types.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface DocumentFormWorkspaceProps {
  document: ClinicalDocumentDto;
  response: {
    id: string;
    answersJson: string;
    rowVersion: number;
  };
  formVersion: {
    code: string;
    version: string | null;
    clinicalSchemaJson: string;
    uiSchemaJson: string | null;
    rulesSchemaJson: string | null;
  };
  definitionName: string;
  locale: string;
  patientId: string;
  encounterId: string;
}

export function DocumentFormWorkspace({
  document,
  response,
  formVersion,
  definitionName,
  locale,
  patientId,
  encounterId,
}: DocumentFormWorkspaceProps): JSX.Element {
  const { t, i18n } = useTranslation(['documents', 'api']);
  const { can } = useCapabilities();
  const reduceMotion = useReducedMotion();

  const {
    complete,
    cancel,
    enterInError,
    isTransitioning,
    error: transitionError,
    reset: resetTransition,
  } = useClinicalDocumentTransitions();
  const {
    saveAnswers,
    isSaving,
    error: saveError,
    reset: resetSave,
  } = useUpdateFormResponse();

  const [pendingAction, setPendingAction] =
    useState<DocumentTransitionKind | null>(null);
  const [mutationForbidden, setMutationForbidden] = useState(false);
  const [staleError, setStaleError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canWrite = can('write', 'ClinicalDocument');
  const inProgress = isInProgressClinicalDocument(document.status);
  const terminal = isTerminalClinicalDocument(document.status);
  const editable = inProgress && !mutationForbidden && canWrite;

  const model = useMemo(() => parseDraft(formVersion), [formVersion]);
  const initialValues = useMemo(
    () => mergeAnswers(response.answersJson, model),
    [response.answersJson, model],
  );
  const renderer = useFormRenderer({
    model,
    readOnly: !editable,
    initialValues,
  });

  const runTransition = async (
    kind: DocumentTransitionKind,
    reason?: string,
  ): Promise<void> => {
    setActionError(null);
    setStaleError(false);
    resetTransition();
    resetSave();

    const input = {
      id: document.id,
      rowVersion: document.rowVersion,
      reason,
    };

    try {
      if (kind === 'complete') {
        await complete(input);
      } else if (kind === 'cancel') {
        await cancel(input);
      } else {
        await enterInError(input);
      }
      setPendingAction(null);
    } catch (err) {
      if (isForbiddenClinicalDocumentError(err)) {
        setMutationForbidden(true);
        setPendingAction(null);
        return;
      }
      if (isStaleClinicalDocumentError(err)) {
        setStaleError(true);
        setPendingAction(null);
        return;
      }
      setActionError(describeApiError(err, t));
    }
  };

  const handleSave = async (): Promise<void> => {
    setActionError(null);
    setStaleError(false);
    resetSave();
    renderer.triggerValidation();
    if (renderer.hasValidationErrors) {
      setActionError(t('detail.validationErrors'));
      return;
    }
    try {
      await saveAnswers({
        id: response.id,
        answersJson: JSON.stringify(renderer.values),
        rowVersion: response.rowVersion,
      });
    } catch (err) {
      if (isStaleFormResponseError(err)) {
        setStaleError(true);
        return;
      }
      setActionError(describeApiError(err, t));
    }
  };

  const handleCompleteClick = (): void => {
    renderer.triggerValidation();
    if (renderer.hasValidationErrors) {
      setActionError(t('detail.validationErrors'));
      return;
    }
    setPendingAction('complete');
  };

  return (
    <DocumentDetailShell>
      <LazyMotion features={domAnimation}>
        <m.header
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          }
          className='mb-8'
        >
          <Link
            to='/$locale/patients/$id/encounters/$encounterId'
            params={{ locale, id: patientId, encounterId }}
          >
            <Button
              variant='ghost'
              size='sm'
              className='mb-4 -ml-2'
            >
              <ArrowLeft className='size-4' />
              {t('detail.backToEncounter')}
            </Button>
          </Link>
          <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
            <FileText className='size-3' />
            {t('detail.eyebrow')}
          </p>
          <div className='flex flex-wrap items-center gap-3'>
            <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
              {definitionName || formVersion.code}
            </h1>
            <Badge
              variant={clinicalDocumentStatusBadgeVariant(document.status)}
              data-testid='document-detail-status'
            >
              {formatClinicalDocumentStatus(document.status, t)}
            </Badge>
          </div>
        </m.header>

        {mutationForbidden ? (
          <Alert
            variant='destructive'
            className='mb-6'
            data-testid='document-detail-forbidden'
          >
            <AlertDescription>{t('detail.forbiddenMutate')}</AlertDescription>
          </Alert>
        ) : null}

        {!canWrite && !mutationForbidden ? (
          <InsufficientPermissionNotice descriptionKey='access.documentsWriteMissing' />
        ) : null}

        {staleError ? (
          <Alert
            variant='destructive'
            className='mb-6'
            data-testid='document-detail-stale'
          >
            <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <span>{t('detail.stale')}</span>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setStaleError(false);
                  window.location.reload();
                }}
              >
                {t('detail.reload')}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {actionError || saveError || transitionError ? (
          <Alert
            variant='destructive'
            className='mb-6'
            data-testid='document-detail-action-error'
          >
            <AlertDescription>
              {actionError ?? saveError ?? transitionError}
            </AlertDescription>
          </Alert>
        ) : null}

        {terminal ? (
          <Alert
            className='mb-6'
            data-testid='document-detail-terminal'
          >
            <AlertDescription>{t('detail.terminalBanner')}</AlertDescription>
          </Alert>
        ) : null}

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
                {definitionName || formVersion.code}
              </CardTitle>
              <CardDescription>
                {t('detail.fields.formVersion')}:{' '}
                {formVersion.version ?? formVersion.code}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <DocumentMetadataGrid
                document={document}
                language={i18n.language}
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
                  onSave={() => {
                    void handleSave();
                  }}
                  onComplete={handleCompleteClick}
                  onTransition={(kind) => {
                    setPendingAction(kind);
                  }}
                />
              ) : null}
            </CardContent>
          </Card>
        </m.div>

        <DocumentTransitionConfirmDialog
          kind={pendingAction}
          isPending={isTransitioning}
          error={actionError}
          enteredInErrorReason={document.enteredInErrorReason}
          onDismiss={() => {
            setPendingAction(null);
            setActionError(null);
          }}
          onConfirm={(reason) => {
            if (pendingAction) {
              void runTransition(pendingAction, reason);
            }
          }}
        />
      </LazyMotion>
    </DocumentDetailShell>
  );
}

function mergeAnswers(
  answersJson: string,
  model: ReturnType<typeof parseDraft>,
): FormValues {
  let parsed: FormValues = {};
  try {
    const raw = JSON.parse(answersJson) as unknown;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      parsed = raw as FormValues;
    }
  } catch {
    parsed = {};
  }
  return { ...createInitialValues(model), ...parsed };
}
