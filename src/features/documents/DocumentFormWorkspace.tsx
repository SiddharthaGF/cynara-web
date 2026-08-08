import { useBlocker } from '@tanstack/react-router';
import { CloudUpload } from 'lucide-react';
import type { JSX } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { DocumentDetailShell } from '@/features/documents/DocumentDetailStates.tsx';
import { DocumentFormAlerts } from '@/features/documents/DocumentFormAlerts.tsx';
import { DocumentFormCard } from '@/features/documents/DocumentFormCard.tsx';
import { DocumentFormHeader } from '@/features/documents/DocumentFormHeader.tsx';
import {
  DocumentTransitionConfirmDialog,
  type DocumentTransitionKind,
} from '@/features/documents/DocumentTransitionConfirmDialog.tsx';
import {
  useClinicalDocumentTransitions,
  useUpdateFormResponse,
} from '@/features/documents/useClinicalDocumentsCatalog.ts';
import { useDocumentAutosave } from '@/features/documents/useDocumentAutosave.ts';
import { parseDraft } from '@/features/forms/model/formDraft.ts';
import { useFormRenderer } from '@/features/forms/renderer/FormRenderer.tsx';
import { createInitialValues } from '@/features/forms/renderer/formValues.ts';
import type { FormValues } from '@/features/forms/renderer/types.ts';
import { usePatientDetail } from '@/features/patients/usePatientsCatalog.ts';
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
  const { patient } = usePatientDetail(patientId);
  const patientName = patient
    ? `${patient.givenName} ${patient.familyName}`
    : undefined;

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

  // ─── Unsaved-changes tracking + draft autosave ────────────────────────────
  const latestRowVersionRef = useRef(response.rowVersion);
  latestRowVersionRef.current = response.rowVersion;

  const persistAnswers = useCallback(
    async (answersJson: string): Promise<{ ok: boolean; stale: boolean }> => {
      try {
        const saved = await saveAnswers({
          id: response.id,
          answersJson,
          rowVersion: latestRowVersionRef.current,
        });
        latestRowVersionRef.current = saved.rowVersion;
        return { ok: true, stale: false };
      } catch (err) {
        if (isStaleFormResponseError(err)) {
          setStaleError(true);
          return { ok: false, stale: true };
        }
        // Save failures surface through `saveError`; the document stays dirty for retry.
        return { ok: false, stale: false };
      }
    },
    [response.id, saveAnswers],
  );

  const { isDirty, markSaved, markDiscarding } = useDocumentAutosave({
    editable,
    valuesJson: JSON.stringify(renderer.values),
    save: async (answersJson: string): Promise<boolean> => {
      resetSave();
      const result = await persistAnswers(answersJson);
      return result.ok;
    },
  });

  // Flushes pending changes before a transition so completing never loses unsaved edits.
  const flushPending = useCallback(async (): Promise<boolean> => {
    const answersJson = JSON.stringify(renderer.values);
    const first = await persistAnswers(answersJson);
    if (first.ok) {
      markSaved(answersJson);
      return true;
    }
    if (!first.stale) {
      return false;
    }
    const retry = await persistAnswers(answersJson);
    if (retry.ok) {
      markSaved(answersJson);
      return true;
    }
    return false;
  }, [markSaved, persistAnswers, renderer.values]);

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  });

  const keepEditing = useCallback((): void => {
    if (blocker.status !== 'blocked') {
      return;
    }
    blocker.reset();
  }, [blocker]);

  const discardChanges = useCallback((): void => {
    if (blocker.status !== 'blocked') {
      return;
    }
    markDiscarding();
    blocker.proceed();
  }, [blocker, markDiscarding]);

  const runTransition = async (
    kind: DocumentTransitionKind,
    reason?: string,
  ): Promise<void> => {
    setActionError(null);
    setStaleError(false);
    resetTransition();
    resetSave();

    if (editable && isDirty && !(await flushPending())) {
      setPendingAction(null);
      return;
    }

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
      const answersJson = JSON.stringify(renderer.values);
      await saveAnswers({
        id: response.id,
        answersJson,
        rowVersion: response.rowVersion,
      });
      markSaved(answersJson);
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

  const handleDismissStale = (): void => {
    setStaleError(false);
    window.location.reload();
  };

  return (
    <DocumentDetailShell>
      <DocumentFormHeader
        definitionName={definitionName}
        fallbackCode={formVersion.code}
        status={document.status}
        locale={locale}
        patientId={patientId}
        encounterId={encounterId}
        patientName={patientName}
      />

      {isDirty ? (
        <div
          className='mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400'
          data-testid='document-unsaved-indicator'
        >
          <CloudUpload className='size-3.5' />
          {isSaving ? t('detail.autosaving') : t('detail.unsaved')}
        </div>
      ) : null}

      <DocumentFormAlerts
        mutationForbidden={mutationForbidden}
        canWrite={canWrite}
        staleError={staleError}
        actionError={actionError}
        saveError={saveError}
        transitionError={transitionError}
        terminal={terminal}
        onDismissStale={handleDismissStale}
      />

      <DocumentFormCard
        document={document}
        definitionName={definitionName}
        fallbackCode={formVersion.code}
        version={formVersion.version}
        language={i18n.language}
        model={model}
        renderer={renderer}
        editable={editable}
        terminal={terminal}
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

      <DocumentTransitionConfirmDialog
        key={pendingAction ?? 'closed'}
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

      <Dialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open) {
            keepEditing();
          }
        }}
      >
        <DialogContent
          className='sm:max-w-md'
          data-testid='document-unsaved-dialog'
        >
          <DialogHeader>
            <DialogTitle>{t('detail.unsavedTitle')}</DialogTitle>
            <DialogDescription>{t('detail.unsavedBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className='mt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={keepEditing}
            >
              {t('detail.keepEditing')}
            </Button>
            <Button
              type='button'
              variant='destructive'
              data-testid='document-unsaved-discard'
              onClick={discardChanges}
            >
              {t('detail.discard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
