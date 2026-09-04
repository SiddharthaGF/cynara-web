import { Check, Copy } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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

/**
 * Builds the one-time accept link. Exported for unit testing; the component
 * is the only caller and the token never leaves dialog-local state.
 */
export function buildAcceptLink(
  origin: string,
  locale: string,
  token: string,
): string {
  return `${origin}/${locale}/invitations/accept?token=${encodeURIComponent(token)}`;
}

interface CopyLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raw invitation token, held only in dialog-local state (R5). */
  token: string;
  locale: string;
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
}: CopyLinkDialogProps): JSX.Element {
  const { t } = useTranslation('invitations');
  const [copied, setCopied] = useState(false);
  const link = buildAcceptLink(window.location.origin, locale, token);

  const handleCopy = (): void => {
    void navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('copyLink.title')}</DialogTitle>
          <DialogDescription>{t('copyLink.description')}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-2'>
          <Input
            readOnly
            value={link}
            aria-label={t('copyLink.tokenLabel')}
            onFocus={(event) => event.currentTarget.select()}
          />
          <p className='text-xs text-muted-foreground'>
            {t('copyLink.securityNote')}
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
