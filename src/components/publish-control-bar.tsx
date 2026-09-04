import { Rocket, Undo2 } from 'lucide-react';
import type { JSX } from 'react';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';

interface PublishControlBarProps {
  isReview: boolean;
  isPending: boolean;
  versionTitle?: string;
  statusReviewLabel: string;
  statusDraftLabel: string;
  backToDraftLabel: string;
  publishLabel: string;
  onWithdraw: () => void;
  onPublish: () => void;
}

/**
 * Status badge plus withdraw/publish actions shared by the form and
 * workflow designer lifecycle controls. Callers own data fetching and
 * translate every label; this component only renders the action bar.
 */
export function PublishControlBar({
  isReview,
  isPending,
  versionTitle,
  statusReviewLabel,
  statusDraftLabel,
  backToDraftLabel,
  publishLabel,
  onWithdraw,
  onPublish,
}: PublishControlBarProps): JSX.Element {
  return (
    <div className='flex shrink-0 items-center gap-2'>
      <Badge
        variant={isReview ? 'secondary' : 'outline'}
        className='hidden gap-1.5 font-normal sm:inline-flex'
        title={versionTitle}
      >
        <span
          className='size-1.5 rounded-full bg-current opacity-70'
          aria-hidden='true'
        />
        {isReview ? statusReviewLabel : statusDraftLabel}
      </Badge>

      {isReview ? (
        <Button
          variant='outline'
          size='sm'
          disabled={isPending}
          onClick={onWithdraw}
          aria-label={backToDraftLabel}
        >
          <Undo2
            className='size-3.5'
            aria-hidden='true'
          />
          <span className='hidden md:inline'>{backToDraftLabel}</span>
        </Button>
      ) : null}

      <Button
        size='sm'
        disabled={isPending}
        onClick={onPublish}
      >
        <Rocket
          className='size-3.5'
          aria-hidden='true'
        />
        {publishLabel}
      </Button>
    </div>
  );
}
