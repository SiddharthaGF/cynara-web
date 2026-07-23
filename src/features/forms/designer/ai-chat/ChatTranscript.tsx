import { ArrowDownIcon, RotateCwIcon } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Marker, MarkerContent } from '@/components/ui/marker.tsx';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller.tsx';

import { ChatEmptyState } from './ChatMentionLists.tsx';
import { ChatTurnMessage } from './ChatTurnMessage.tsx';
import type { ChatTurn } from './chatTurns.ts';
import type { MentionableField } from './fieldMentions.ts';
import type { MentionableFieldType } from './fieldTypeMentions.ts';

export function ChatTranscript({
  turns,
  fieldsById,
  typesBySlug,
  isBusy,
  error,
  stopped,
  canRetry,
  onRetry,
  onPickPrompt,
  onRemoveQueued,
}: {
  turns: ChatTurn[];
  fieldsById: Map<string, MentionableField>;
  typesBySlug: Map<string, MentionableFieldType>;
  isBusy: boolean;
  error: string | null;
  stopped: boolean;
  canRetry: boolean;
  onRetry: () => void;
  onPickPrompt: (prompt: string) => void;
  onRemoveQueued: (turnId: string) => void;
}): JSX.Element {
  const { t } = useTranslation('designer');

  if (turns.length === 0 && !isBusy) {
    return (
      <div className='min-h-0 flex-1 overflow-hidden'>
        <ChatEmptyState onPickPrompt={onPickPrompt} />
      </div>
    );
  }

  return (
    <div className='relative min-h-0 flex-1 overflow-hidden'>
      <MessageScrollerProvider
        autoScroll
        defaultScrollPosition='end'
        scrollEdgeThreshold={64}
      >
        <MessageScroller className='ai-chat-transcript-scroll h-full min-h-0 w-full'>
          <MessageScrollerViewport aria-label={t('ai.title')}>
            <MessageScrollerContent
              role='log'
              aria-relevant='additions'
              aria-busy={isBusy}
              className='px-4 py-5'
            >
              {turns.map((turn) => (
                <MessageScrollerItem
                  key={turn.id}
                  messageId={turn.id}
                  scrollAnchor={turn.role === 'user'}
                >
                  <ChatTurnMessage
                    turn={turn}
                    fieldsById={fieldsById}
                    typesBySlug={typesBySlug}
                    onRetry={turn.failed && canRetry ? onRetry : undefined}
                    onRemoveQueued={turn.queued ? onRemoveQueued : undefined}
                  />
                </MessageScrollerItem>
              ))}

              {stopped && !isBusy && !error ? (
                <MessageScrollerItem
                  key='stopped'
                  className='ai-chat-status'
                >
                  <Marker
                    role='status'
                    variant='border'
                    className='flex-col items-stretch gap-3 border-border/60 pb-0 text-muted-foreground'
                  >
                    <MarkerContent>{t('ai.stopped')}</MarkerContent>
                    {canRetry ? (
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        className='h-8 gap-1.5 self-start rounded-full'
                        onClick={onRetry}
                      >
                        <RotateCwIcon className='size-3.5' />
                        {t('ai.retry')}
                      </Button>
                    ) : null}
                  </Marker>
                </MessageScrollerItem>
              ) : null}

              {error && !isBusy ? (
                <MessageScrollerItem
                  key='error'
                  className='ai-chat-status ai-chat-status--error'
                >
                  <Marker
                    role='status'
                    variant='border'
                    className='flex-col items-stretch gap-3 border-destructive/20 pb-0 text-destructive'
                  >
                    <MarkerContent className='flex flex-col gap-1'>
                      <span className='font-medium'>{t('ai.errorLabel')}</span>
                      <span className='leading-relaxed text-destructive/90'>
                        {error}
                      </span>
                    </MarkerContent>
                    {canRetry ? (
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        className='h-8 gap-1.5 self-start rounded-full'
                        onClick={onRetry}
                      >
                        <RotateCwIcon className='size-3.5' />
                        {t('ai.retry')}
                      </Button>
                    ) : null}
                  </Marker>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>

          <MessageScrollerButton
            type='button'
            aria-label={t('ai.scrollToLatest')}
            className='bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background shadow-sm'
          >
            <ArrowDownIcon className='size-3.5' />
            <span className='sr-only'>{t('ai.scrollToLatest')}</span>
          </MessageScrollerButton>
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  );
}
