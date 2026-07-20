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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card.tsx';
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { cn } from '@/lib/utils.ts';

import { FieldTypeIcon } from '../FieldTypeIcon.tsx';
import {
  FIELD_MENTION_RE,
  type MentionableField,
} from './fieldMentions.ts';
import {
  FIELD_TYPE_MENTION_RE,
  type MentionableFieldType,
} from './fieldTypeMentions.ts';

/** Matches shadcn Bubble “Show More / Collapsible” example. */
const USER_PREVIEW_LENGTH = 180;

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  failed?: boolean;
  /** Waiting to send while another reply is in flight. */
  queued?: boolean;
  /** True while SSE tokens are still arriving. */
  streaming?: boolean;
  /** True when this turn updated the open form draft. */
  draftApplied?: boolean;
  /** Short designer-facing note about what was applied. */
  appliedSummary?: string;
}

export function toApiMessages(
  nextTurns: ChatTurn[],
): { role: 'user' | 'assistant'; content: string }[] {
  return nextTurns
    .filter((turn) => !turn.failed && !(turn.streaming && !turn.content))
    .map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));
}

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
  const contentNodes = renderContentWithMentions(
    turn.content,
    fieldsById,
    typesBySlug,
  );
  const showBody = turn.content.length > 0 || turn.streaming;
  const showApplied = Boolean(turn.draftApplied) && !turn.streaming && !turn.failed;

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
          {isQueued ? (
            <Clock3Icon
              className='size-3 opacity-70'
              aria-hidden
            />
          ) : isUser ? (
            <UserIcon
              className='size-3 opacity-70'
              aria-hidden
            />
          ) : (
            <SparklesIcon
              className='size-3 opacity-70'
              aria-hidden
            />
          )}
          {isQueued ? t('ai.queued') : isUser ? t('ai.you') : t('ai.assistant')}
        </MessageHeader>

        {showBody ? (
          <Bubble
            variant={
              turn.failed ? 'destructive' : isUser ? 'tinted' : 'outline'
            }
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
                        {t('ai.thinking')}
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
              <span className='text-muted-foreground'>{t('ai.applying')}</span>
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
                className='mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400'
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

interface MentionHit {
  index: number;
  length: number;
  kind: 'field' | 'type';
  token: string;
  label: string;
  field?: MentionableField;
  fieldType?: MentionableFieldType;
}

function renderContentWithMentions(
  content: string,
  fieldsById?: Map<string, MentionableField>,
  typesBySlug?: Map<string, MentionableFieldType>,
): ReactNode {
  const hits: MentionHit[] = [];

  if (fieldsById && fieldsById.size > 0) {
    for (const match of content.matchAll(FIELD_MENTION_RE)) {
      const id = match.groups?.fieldId;
      const index = match.index ?? 0;
      const field = id ? fieldsById.get(id) : undefined;
      if (id && field) {
        hits.push({
          index,
          length: match[0].length,
          kind: 'field',
          token: id,
          label: field.label,
          field,
        });
      }
    }
  }

  if (typesBySlug && typesBySlug.size > 0) {
    for (const match of content.matchAll(FIELD_TYPE_MENTION_RE)) {
      const slug = match.groups?.slug;
      const index = match.index ?? 0;
      const fieldType = slug ? typesBySlug.get(slug) : undefined;
      if (slug && fieldType) {
        hits.push({
          index,
          length: match[0].length,
          kind: 'type',
          token: slug,
          label: fieldType.label,
          fieldType,
        });
      }
    }
  }

  if (hits.length === 0) {
    return content;
  }

  hits.sort((a, b) => a.index - b.index);

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const hit of hits) {
    if (hit.index >= lastIndex) {
      if (hit.index > lastIndex) {
        nodes.push(content.slice(lastIndex, hit.index));
      }
      nodes.push(
        <MentionChip
          key={`mention-${key}`}
          hit={hit}
        />,
      );
      key += 1;
      lastIndex = hit.index + hit.length;
    }
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }
  return nodes;
}

function MentionChip({ hit }: { hit: MentionHit }): JSX.Element {
  const { t } = useTranslation('designer');
  const prefix = hit.kind === 'field' ? '@' : '#';

  const trigger = (
    <span className='ai-chat-mention-chip'>
      {prefix}
      {hit.label}
    </span>
  );

  if (hit.kind === 'field' && hit.field) {
    const field = hit.field;
    return (
      <HoverCard>
        <HoverCardTrigger
          className='inline cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
          render={<button type='button' />}
        >
          {trigger}
        </HoverCardTrigger>
        <HoverCardContent
          side='top'
          className='w-auto max-w-[16rem] space-y-1.5 p-3'
        >
          <p className='text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>
            {t('ai.mention.contextField')}
          </p>
          <p className='text-sm font-medium leading-snug'>{field.pathLabel}</p>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <FieldTypeIcon
              type={field.type}
              className='size-3.5'
            />
            <span>{t(`fieldTypes.${field.type}.label`)}</span>
          </div>
          <p className='font-mono text-[11px] text-muted-foreground'>
            @{field.id}
            {field.code !== field.id ? (
              <span className='mt-0.5 block'>{field.code}</span>
            ) : null}
          </p>
        </HoverCardContent>
      </HoverCard>
    );
  }

  if (hit.kind === 'type' && hit.fieldType) {
    const item = hit.fieldType;
    return (
      <HoverCard>
        <HoverCardTrigger
          className='inline cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
          render={<button type='button' />}
        >
          {trigger}
        </HoverCardTrigger>
        <HoverCardContent
          side='top'
          className='w-auto max-w-[16rem] space-y-1.5 p-3'
        >
          <p className='text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>
            {t('ai.mention.contextType')}
          </p>
          <div className='flex items-center gap-1.5'>
            <FieldTypeIcon
              type={item.type}
              className='size-3.5'
            />
            <p className='text-sm font-medium leading-snug'>{item.label}</p>
          </div>
          <p className='text-xs leading-relaxed text-muted-foreground'>
            {item.description}
          </p>
          <p className='font-mono text-[11px] text-muted-foreground'>
            #{item.slug}
          </p>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return trigger;
}
