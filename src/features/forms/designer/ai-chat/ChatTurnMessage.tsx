import {
  CheckIcon,
  ChevronDownIcon,
  Clock3Icon,
  RotateCwIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Bubble, BubbleContent } from '@/components/ui/bubble.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Collapsible,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { cn } from '@/lib/utils.ts';

import { ChatMentionContent } from './ChatMentionContent.tsx';
import type { ChatTurn } from './chatTurns.ts';
import type { MentionableField } from './fieldMentions.ts';
import type { MentionableFieldType } from './fieldTypeMentions.ts';

const USER_PREVIEW_LENGTH = 180;

export function ChatTurnMessage({
  turn,
  fieldsById,
  typesBySlug,
  onRetry,
  onRemoveQueued,
}: {
  turn: ChatTurn;
  fieldsById?: Map<string, MentionableField>;
  typesBySlug?: Map<string, MentionableFieldType>;
  onRetry?: () => void;
  onRemoveQueued?: (turnId: string) => void;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const isUser = turn.role === 'user';
  const isQueued = Boolean(turn.queued);
  const contentNodes = (
    <ChatMentionContent
      content={turn.content}
      fieldsById={fieldsById}
      typesBySlug={typesBySlug}
    />
  );
  const showBody = turn.content.length > 0 || turn.streaming;
  const showApplied =
    turn.draftApplied === true && !turn.streaming && !turn.failed;
  // Explicit false means the turn finished with schemas identical to the
  // Open draft (mode unchanged / no-op patch). Surface that so a confident
  // Assistant claim cannot be mistaken for a canvas update.
  const showUnchanged =
    turn.draftApplied === false && !turn.streaming && !turn.failed;
  let authorIcon = (
    <SparklesIcon
      className='size-3 opacity-70'
      aria-hidden
    />
  );
  if (isQueued) {
    authorIcon = (
      <Clock3Icon
        className='size-3 opacity-70'
        aria-hidden
      />
    );
  } else if (isUser) {
    authorIcon = (
      <UserIcon
        className='size-3 opacity-70'
        aria-hidden
      />
    );
  }
  let authorLabel = t('ai.assistant');
  if (isQueued) {
    authorLabel = t('ai.queued');
  } else if (isUser) {
    authorLabel = t('ai.you');
  }
  let bubbleVariant: 'destructive' | 'outline' | 'tinted' = 'outline';
  if (turn.failed) {
    bubbleVariant = 'destructive';
  } else if (isUser) {
    bubbleVariant = 'tinted';
  }

  return (
    <Message
      align={isUser ? 'end' : 'start'}
      className={cn(
        'ai-chat-row',
        isUser ? 'ai-chat-row--user' : 'ai-chat-row--assistant',
        isQueued && 'ai-chat-row--queued',
      )}
    >
      <MessageContent>
        <MessageHeader className='ai-chat-author gap-1.5 px-1'>
          {authorIcon}
          {authorLabel}
        </MessageHeader>

        {showBody ? (
          <Bubble
            variant={bubbleVariant}
            align={isUser ? 'end' : 'start'}
            className={cn(
              'ai-chat-bubble',
              isUser ? 'ai-chat-bubble--user' : 'ai-chat-bubble--assistant',
              isQueued && 'ai-chat-bubble--queued',
            )}
          >
            <BubbleContent className='ai-chat-bubble-content whitespace-pre-wrap text-[15px] leading-relaxed'>
              {isUser && turn.content.length > 0 ? (
                <UserCollapsibleMessage content={turn.content}>
                  {contentNodes}
                </UserCollapsibleMessage>
              ) : (
                <>
                  {turn.content.length > 0 ? contentNodes : null}
                  {turn.streaming && turn.content.length === 0 ? (
                    <span className='flex w-full min-w-[10rem] items-center justify-between gap-3'>
                      <span className='shimmer text-muted-foreground'>
                        {turn.streamPhase === 'schema'
                          ? t('ai.applying')
                          : t('ai.thinking')}
                      </span>
                      <Spinner className='size-3.5 shrink-0 text-muted-foreground' />
                    </span>
                  ) : null}
                </>
              )}
            </BubbleContent>
          </Bubble>
        ) : null}

        {turn.streaming && turn.content.length > 0 ? (
          <Bubble
            variant='outline'
            align='start'
            className='ai-chat-bubble ai-chat-bubble--assistant ai-chat-bubble--status'
          >
            <BubbleContent className='ai-chat-bubble-content flex w-full min-w-[10rem] items-center justify-between gap-3 text-[14px] leading-relaxed'>
              <span className='text-muted-foreground'>
                {turn.streamPhase === 'schema'
                  ? t('ai.applying')
                  : t('ai.streamingReply')}
              </span>
              <Spinner className='size-3.5 shrink-0 text-muted-foreground' />
            </BubbleContent>
          </Bubble>
        ) : null}

        {showApplied ? (
          <Bubble
            variant='outline'
            align='start'
            className='ai-chat-bubble ai-chat-bubble--assistant ai-chat-bubble--applied'
          >
            <BubbleContent className='ai-chat-bubble-content flex items-start gap-2 whitespace-pre-wrap text-[14px] leading-relaxed'>
              <CheckIcon
                className='mt-0.5 size-3.5 shrink-0 text-primary'
                aria-hidden
              />
              <span className='min-w-0'>
                <span className='font-medium'>{t('ai.applied')}</span>
                {turn.appliedSummary ? (
                  <>
                    {' '}
                    <span className='text-muted-foreground'>
                      {turn.appliedSummary}
                    </span>
                  </>
                ) : null}
              </span>
            </BubbleContent>
          </Bubble>
        ) : null}

        {showUnchanged ? (
          <Bubble
            variant='outline'
            align='start'
            className='ai-chat-bubble ai-chat-bubble--assistant ai-chat-bubble--unchanged'
          >
            <BubbleContent className='ai-chat-bubble-content text-[14px] leading-relaxed text-muted-foreground'>
              {t('ai.unchanged')}
            </BubbleContent>
          </Bubble>
        ) : null}

        {isQueued && onRemoveQueued ? (
          <MessageFooter className='px-1'>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              className='h-7 gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground'
              aria-label={t('ai.removeQueued')}
              onClick={() => {
                onRemoveQueued(turn.id);
              }}
            >
              <XIcon className='size-3' />
              {t('ai.removeQueued')}
            </Button>
          </MessageFooter>
        ) : null}

        {turn.failed && onRetry ? (
          <MessageFooter className='px-1'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 gap-1.5 rounded-full px-2.5 text-xs'
              onClick={onRetry}
            >
              <RotateCwIcon className='size-3' />
              {t('ai.retry')}
            </Button>
          </MessageFooter>
        ) : null}
      </MessageContent>
    </Message>
  );
}

function UserCollapsibleMessage({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const [open, setOpen] = useState(false);
  const isLong = content.length > USER_PREVIEW_LENGTH;
  const preview = `${content.slice(0, USER_PREVIEW_LENGTH)}…`;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
    >
      <div>{open || !isLong ? children : preview}</div>
      {isLong ? (
        <CollapsibleTrigger
          render={
            <Button
              type='button'
              variant='link'
              className='mt-1 h-auto gap-1 p-0 text-muted-foreground'
            />
          }
        >
          {open ? t('ai.showLess') : t('ai.showMore')}
          <ChevronDownIcon
            data-icon='inline-end'
            className={cn(
              'size-3.5 transition-transform',
              open && 'rotate-180',
            )}
          />
        </CollapsibleTrigger>
      ) : null}
    </Collapsible>
  );
}
