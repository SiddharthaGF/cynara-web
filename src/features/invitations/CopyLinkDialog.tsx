import { Check, Copy } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { buildAcceptLink } from '@/features/invitations/accept-link.ts';

interface CopyLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raw invitation token, held only in dialog-local state (R5). */
  token: string;
  locale: string;
  /** Optional copy overrides; defaults keep the shared copy-link wording. */
  title?: string;
  description?: string;
  note?: string;
}

/**
 * Surfaces the one-time accept link after create/resend. The token lives only
 * here, in dialog-local state; it never enters list state, query keys, or
 * logs. The accept link is the only place the raw token is shown.
 */
export function CopyLinkDialog({
  open,
  onOpenChange,
  token,
  locale,
  title,
  description,
  note,
}: CopyLinkDialogProps): JSX.Element {
  const { t } = useTranslation('invitations');
  const [copied, setCopied] = useState(false);
  /*
   * The accept link targets this frontend origin, which only exists in the
   * browser; the empty server value keeps the server render deterministic.
   */
  const [origin] = useState<string>(() =>
    typeof window === 'undefined' ? '' : window.location.origin,
  );
  const link = buildAcceptLink(origin, locale, token);

  const handleCopy = (): void => {
    void navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      toast.success(t('copyLink.copied'));
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{title ?? t('copyLink.title')}</DialogTitle>
          <DialogDescription>
            {description ?? t('copyLink.description')}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-2'>
          <Input
            readOnly
            value={link}
            aria-label={t('copyLink.tokenLabel')}
            onFocus={(event) => event.currentTarget.select()}
            className='kardex-folio font-mono text-xs'
          />
          <p className='text-xs text-muted-foreground'>
            {note ?? t('copyLink.securityNote')}
          </p>
        </div>
        <DialogFooter className='mt-2'>
          <Button
            type='button'
            variant='outline'
            onClick={handleCopy}
          >
            {copied ? (
              <Check data-icon='inline-start' />
            ) : (
              <Copy data-icon='inline-start' />
            )}
            {copied ? t('copyLink.copied') : t('copyLink.copy')}
          </Button>
          <Button
            type='button'
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('copyLink.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
