import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card.tsx';

import { FieldTypeIcon } from '../FieldTypeIcon.tsx';
import type { MentionableField } from './fieldMentions.ts';
import type { MentionableFieldType } from './fieldTypeMentions.ts';
import { scanMentionHits, type MentionHit } from './mentionScan.ts';

export function ChatMentionContent({
  content,
  fieldsById,
  typesBySlug,
}: {
  content: string;
  fieldsById?: Map<string, MentionableField>;
  typesBySlug?: Map<string, MentionableFieldType>;
}): JSX.Element {
  return <>{renderContentWithMentions(content, fieldsById, typesBySlug)}</>;
}

function renderContentWithMentions(
  content: string,
  fieldsById?: Map<string, MentionableField>,
  typesBySlug?: Map<string, MentionableFieldType>,
): ReactNode {
  const hits = scanMentionHits(content, fieldsById, typesBySlug);

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

export function MentionChip({ hit }: { hit: MentionHit }): JSX.Element {
  const { t } = useTranslation('designer');
  const prefix = hit.kind === 'field' ? '@' : '#';

  const trigger = (
    <span className='ai-chat-mention-chip'>
      {prefix}
      {hit.label}
    </span>
  );

  if (hit.kind === 'field' && hit.field) {
    const { field } = hit;
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
            {field.code === field.id ? null : (
              <span className='mt-0.5 block'>{field.code}</span>
            )}
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
