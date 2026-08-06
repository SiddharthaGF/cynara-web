import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isForbiddenClinicalDocumentError,
  type StartClinicalDocumentInput,
} from '@/api/clinical-documents.ts';
import { describeApiError } from '@/api/error-message.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { useStartClinicalDocument } from '@/features/documents/useClinicalDocumentsCatalog.ts';
import { useDocumentDefinitions } from '@/features/hospital/useDocumentCatalogAdmin.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface StartDocumentDialogProps {
  encounterId: string;
  facilityId: string;
  clinicalAreaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (documentId: string) => void;
  onForbidden: (message: string) => void;
}

export function StartDocumentDialog({
  encounterId,
  facilityId,
  clinicalAreaId,
  open,
  onOpenChange,
  onCreated,
  onForbidden,
}: StartDocumentDialogProps): JSX.Element {
  const { t } = useTranslation(['documents', 'api']);
  const { can } = useCapabilities();
  const { startDocument, isStarting } = useStartClinicalDocument();

  const list = useDocumentDefinitions({ includeRetired: false });

  const definitions = can('write', 'ClinicalDocument')
    ? list.items.filter(
        (definition) =>
          definition.facilityId === facilityId &&
          definition.clinicalAreaId === clinicalAreaId,
      )
    : [];

  const [documentDefinitionId, setDocumentDefinitionId] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDocumentDefinitionId('');
      setFieldError(null);
      setServerError(null);
    }
  }, [open]);

  const emptyCatalog =
    !list.isLoading && list.error === null && definitions.length === 0;

  const handleSubmit = async (): Promise<void> => {
    if (!documentDefinitionId) {
      setFieldError(t('start.errors.definitionRequired'));
      return;
    }
    setFieldError(null);
    setServerError(null);

    const input: StartClinicalDocumentInput = {
      documentDefinitionId,
      encounterId,
    };

    try {
      const created = await startDocument(input);
      onOpenChange(false);
      onCreated(created.id);
    } catch (err) {
      if (isForbiddenClinicalDocumentError(err)) {
        onForbidden(describeApiError(err, t));
        onOpenChange(false);
        return;
      }
      setServerError(describeApiError(err, t));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className='sm:max-w-md'
        data-testid='start-document-dialog'
      >
        <DialogHeader>
          <DialogTitle>{t('start.title')}</DialogTitle>
          <DialogDescription>{t('start.description')}</DialogDescription>
        </DialogHeader>

        {serverError ? (
          <Alert
            variant='destructive'
            data-testid='start-document-error'
          >
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        {list.error ? (
          <Alert variant='destructive'>
            <AlertDescription>{list.error}</AlertDescription>
          </Alert>
        ) : null}

        {emptyCatalog ? (
          <Empty className='min-h-36 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-8'>
            <EmptyHeader>
              <EmptyTitle>{t('start.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('start.emptyDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {list.isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : null}

        {!list.isLoading && !emptyCatalog && definitions.length > 0 ? (
          <form
            className='grid gap-4'
            data-testid='start-document-form'
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <Field data-invalid={Boolean(fieldError)}>
              <FieldLabel htmlFor='start-document-definition'>
                {t('start.fields.definition')}
              </FieldLabel>
              <Select
                items={definitions.map((definition) => ({
                  value: definition.id,
                  label: definition.name || definition.code,
                }))}
                value={documentDefinitionId || null}
                onValueChange={(next: string | null) => {
                  setDocumentDefinitionId(next ?? '');
                  setFieldError(null);
                }}
                disabled={isStarting}
              >
                <SelectTrigger
                  id='start-document-definition'
                  className='w-full'
                  aria-invalid={Boolean(fieldError)}
                >
                  <SelectValue
                    placeholder={t('start.fields.definitionPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {definitions.map((definition) => (
                    <SelectItem
                      key={definition.id}
                      value={definition.id}
                    >
                      {definition.name || definition.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError ? <FieldError>{fieldError}</FieldError> : null}
            </Field>

            <DialogFooter className='mt-2'>
              <Button
                type='button'
                variant='ghost'
                disabled={isStarting}
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {t('start.cancel')}
              </Button>
              <Button
                type='submit'
                data-testid='start-document-submit'
                disabled={isStarting}
              >
                {isStarting ? <Spinner data-icon='inline-start' /> : null}
                {isStarting ? t('start.submitting') : t('start.submit')}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
