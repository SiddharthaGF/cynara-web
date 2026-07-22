import { Sparkles } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { MentionItem } from '@/components/ui/mention.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';

import { FieldTypeIcon } from '../FieldTypeIcon.tsx';
import type { listMentionableFields } from './fieldMentions.ts';
import type { listMentionableFieldTypes } from './fieldTypeMentions.ts';

export function FieldMentionList({
  fields,
  emptyLabel,
  menuHint,
}: {
  fields: ReturnType<typeof listMentionableFields>;
  emptyLabel: string;
  menuHint: string;
}): JSX.Element {
  if (fields.length === 0) {
    return (
      <p className='px-2.5 py-2 text-xs text-muted-foreground'>{emptyLabel}</p>
    );
  }

  return (
    <>
      <ScrollArea className='max-h-44 w-full pr-1'>
        <div className='flex flex-col gap-0.5'>
          {fields.map((field) => (
            <MentionItem
              key={field.id}
              value={field.id}
              label={field.id}
              className='items-start gap-2.5 rounded-lg px-2.5 py-2'
            >
              <FieldTypeIcon
                type={field.type}
                className='mt-0.5 size-3.5 text-muted-foreground'
              />
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-medium'>
                  {field.pathLabel}
                </span>
                <span className='mt-0.5 block truncate font-mono text-[10px] text-muted-foreground'>
                  @{field.id}
                </span>
              </span>
            </MentionItem>
          ))}
        </div>
      </ScrollArea>
      <p className='mt-1 border-t border-border/50 px-2.5 pt-1.5 text-[10px] text-muted-foreground'>
        {menuHint}
      </p>
    </>
  );
}

export function TypeMentionList({
  types,
  emptyLabel,
  menuHint,
}: {
  types: ReturnType<typeof listMentionableFieldTypes>;
  emptyLabel: string;
  menuHint: string;
}): JSX.Element {
  if (types.length === 0) {
    return (
      <p className='px-2.5 py-2 text-xs text-muted-foreground'>{emptyLabel}</p>
    );
  }

  return (
    <>
      <ScrollArea className='max-h-44 w-full pr-1'>
        <div className='flex flex-col gap-0.5'>
          {types.map((item) => (
            <MentionItem
              key={item.type}
              value={item.slug}
              label={item.slug}
              className='items-start gap-2.5 rounded-lg px-2.5 py-2'
            >
              <FieldTypeIcon
                type={item.type}
                className='mt-0.5 size-3.5 text-muted-foreground'
              />
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-medium'>
                  {item.label}
                </span>
                <span className='mt-0.5 block truncate text-[11px] text-muted-foreground'>
                  {item.description}
                </span>
                <span className='mt-0.5 block truncate font-mono text-[10px] text-muted-foreground'>
                  #{item.slug}
                </span>
              </span>
            </MentionItem>
          ))}
        </div>
      </ScrollArea>
      <p className='mt-1 border-t border-border/50 px-2.5 pt-1.5 text-[10px] text-muted-foreground'>
        {menuHint}
      </p>
    </>
  );
}

export function ChatEmptyState({
  onPickPrompt,
}: {
  onPickPrompt: (prompt: string) => void;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const prompts = [
    t('ai.prompts.vitals'),
    t('ai.prompts.intake'),
    t('ai.prompts.meds'),
  ];

  return (
    <div className='flex h-full flex-col justify-center gap-5 px-5 py-8'>
      <div className='space-y-2'>
        <h3 className='ai-chat-empty-title'>{t('ai.emptyTitle')}</h3>
        <p className='max-w-[36ch] text-sm leading-relaxed text-muted-foreground'>
          {t('ai.empty')}
        </p>
      </div>

      <div className='space-y-2'>
        <p className='ai-chat-eyebrow'>{t('ai.tryThese')}</p>
        <div className='flex flex-col gap-2'>
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type='button'
              className='ai-chat-prompt'
              onClick={() => {
                onPickPrompt(prompt);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatAiTrigger({
  onOpen,
  disabled,
}: {
  onOpen: () => void;
  disabled?: boolean;
}): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <Button
      type='button'
      size='sm'
      variant='secondary'
      disabled={disabled}
      onClick={onOpen}
      title={t('ai.open')}
      className='shrink-0 gap-1.5 rounded-full px-2.5 sm:px-3'
    >
      <Sparkles className='size-3.5' />
      <span className='hidden sm:inline'>{t('ai.open')}</span>
    </Button>
  );
}
