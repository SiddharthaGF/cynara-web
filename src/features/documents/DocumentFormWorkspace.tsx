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
import { parseDraft } from '@/features/forms/model/formDraft.ts';
import { useFormRenderer } from '@/features/forms/renderer/FormRenderer.tsx';
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
      />

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
