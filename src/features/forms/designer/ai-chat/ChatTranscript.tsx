import { ArrowDownIcon, RotateCwIcon } from 'lucide-react';
import {
  type JSX,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { cn } from '@/lib/utils.ts';

import { ChatEmptyState } from './ChatComposer.tsx';
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
  idPrefix: _idPrefix,
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
  idPrefix: string;
  onRetry: () => void;
  onPickPrompt: (prompt: string) => void;
  onRemoveQueued: (turnId: string) => void;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const viewportRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  function resolveViewport(): HTMLElement | null {
    if (viewportRef.current?.isConnected) {
      return viewportRef.current;
    }
    const root = bottomRef.current?.closest('[data-slot="scroll-area"]');
    const viewport = root?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    viewportRef.current = viewport ?? null;
    return viewportRef.current;
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const viewport = resolveViewport();
    if (!viewport) {
      bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
      return;
    }
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    stickToBottomRef.current = true;
  }

  const scrollLatestUserTurnIntoView = useCallback(
    (node: HTMLDivElement | null): void => {
      if (!node) {
        return;
      }
      const root = node.closest('[data-slot="scroll-area"]');
      const viewport = root?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      );
      viewportRef.current = viewport ?? null;
      stickToBottomRef.current = true;
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'auto' });
      } else {
        node.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    },
    [],
  );

  useLayoutEffect(() => {
    resolveViewport();
  });

  useEffect(() => {
    if (turns.length === 0 && !isBusy) {
      return undefined;
    }
    const viewport = resolveViewport();
    if (!viewport) {
      return undefined;
    }

    function onScroll(): void {
      const el = resolveViewport();
      if (!el) {
        return;
      }
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distance < 64;
      stickToBottomRef.current = nearBottom;
      setShowJumpToLatest(!nearBottom);
    }

    viewport.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      viewport.removeEventListener('scroll', onScroll);
    };
  }, [turns.length, isBusy]);

  useEffect(() => {
    if (!stickToBottomRef.current) {
      return;
    }
    scrollToBottom(isBusy ? 'auto' : 'smooth');
  }, [turns, isBusy, error, stopped]);

  const latestUserTurnId = findLatestUserTurnId(turns);

  if (turns.length === 0 && !isBusy) {
    return (
      <div className='min-h-0 flex-1 overflow-hidden'>
        <ChatEmptyState onPickPrompt={onPickPrompt} />
      </div>
    );
  }

  return (
    <div className='relative min-h-0 flex-1 overflow-hidden'>
      <ScrollArea className='ai-chat-transcript-scroll h-full min-h-0 w-full'>
        <div
          role='log'
          aria-relevant='additions'
          aria-busy={isBusy}
          className='flex flex-col gap-6 px-4 py-5'
        >
          {turns.map((turn) => (
            <div
              key={turn.id}
              ref={
                turn.id === latestUserTurnId
                  ? scrollLatestUserTurnIntoView
                  : undefined
              }
              className='min-w-0 shrink-0'
            >
              <ChatTurnMessage
                turn={turn}
                fieldsById={fieldsById}
                typesBySlug={typesBySlug}
                onRetry={turn.failed && canRetry ? onRetry : undefined}
                onRemoveQueued={turn.queued ? onRemoveQueued : undefined}
              />
            </div>
          ))}

          {stopped && !isBusy && !error ? (
            <div className='ai-chat-status'>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                {t('ai.stopped')}
              </p>
              {canRetry ? (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='mt-3 h-8 gap-1.5 rounded-full'
                  onClick={onRetry}
                >
                  <RotateCwIcon className='size-3.5' />
                  {t('ai.retry')}
                </Button>
              ) : null}
            </div>
          ) : null}

          {error && !isBusy ? (
            <div className='ai-chat-status ai-chat-status--error'>
              <p className='text-sm font-medium text-destructive'>
                {t('ai.errorLabel')}
              </p>
              <p className='mt-1 text-sm leading-relaxed text-destructive/90'>
                {error}
              </p>
              {canRetry ? (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='mt-3 h-8 gap-1.5 rounded-full'
                  onClick={onRetry}
                >
                  <RotateCwIcon className='size-3.5' />
                  {t('ai.retry')}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div
            ref={bottomRef}
            aria-hidden
            className='h-px w-full shrink-0'
          />
        </div>
      </ScrollArea>

      <Button
        type='button'
        size='icon-sm'
        variant='secondary'
        aria-label={t('ai.scrollToLatest')}
        className={cn(
          'absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-background shadow-sm transition-[translate,scale,opacity] duration-200',
          showJumpToLatest
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-3 scale-95 opacity-0',
        )}
        onClick={() => {
          scrollToBottom('smooth');
          setShowJumpToLatest(false);
        }}
      >
        <ArrowDownIcon className='size-3.5' />
      </Button>
    </div>
  );
}

function findLatestUserTurnId(turns: ChatTurn[]): string | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn?.role === 'user') {
      return turn.id;
    }
  }
  return null;
}
