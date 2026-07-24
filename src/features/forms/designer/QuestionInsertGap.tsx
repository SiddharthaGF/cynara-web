import { PlusIcon } from 'lucide-react';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import type { FieldType } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { FieldTypeIcon } from './FieldTypeIcon.tsx';
import { FIELD_TYPE_GROUPS, FIELD_TYPES } from './fieldTypeMeta.ts';
import type { FieldTypeMeta } from './fieldTypeMeta.ts';
import { useFieldGroupLabel, useFieldTypeMeta } from './useFieldTypeMeta.ts';

interface QuestionInsertGapProps {
  insertAt: number;
  onAdd: (type: FieldType, atIndex: number) => void;
  alwaysVisible?: boolean;
}

export function QuestionInsertGap({
  insertAt,
  onAdd,
  alwaysVisible = false,
}: QuestionInsertGapProps): JSX.Element {
  const { t } = useTranslation('designer');
  const [open, setOpen] = useState(false);

  return (
    <li
      className={cn(
        'question-insert group/insert relative z-10 list-none',
        (open || alwaysVisible) && 'question-insert--open',
        alwaysVisible && 'question-insert--visible',
      )}
    >
      <div className='question-insert-hit'>
        <span
          aria-hidden
          className='question-insert-line'
        />
        <Popover
          open={open}
          onOpenChange={setOpen}
        >
          <PopoverTrigger
            render={
              <button
                type='button'
                className='question-insert-trigger'
                aria-label={t('canvas.insertQuestion')}
              />
            }
          >
            <PlusIcon className='size-4' />
          </PopoverTrigger>
          <PopoverContent
            side='bottom'
            sideOffset={8}
            align='center'
            className='question-insert-menu w-[min(100vw-2rem,18rem)] p-0'
          >
            <PopoverHeader className='border-b border-border/60 px-3 py-2.5'>
              <PopoverTitle className='text-sm'>
                {t('canvas.insertQuestionTitle')}
              </PopoverTitle>
              <PopoverDescription className='text-xs'>
                {t('canvas.insertQuestionHint')}
              </PopoverDescription>
            </PopoverHeader>
            <ScrollArea className='h-[min(20rem,50vh)]'>
              <div className='grid gap-3 p-2'>
                {FIELD_TYPE_GROUPS.map((group) => {
                  const items = FIELD_TYPES.filter(
                    (item) => item.group === group.id,
                  );
                  if (items.length === 0) {
                    return null;
                  }
                  return (
                    <InsertTypeGroup
                      key={group.id}
                      groupId={group.id}
                      types={items.map((item) => item.type)}
                      onPick={(type) => {
                        onAdd(type, insertAt);
                        setOpen(false);
                      }}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </li>
  );
}

function InsertTypeGroup({
  groupId,
  types,
  onPick,
}: {
  groupId: FieldTypeMeta['group'];
  types: FieldType[];
  onPick: (type: FieldType) => void;
}): JSX.Element {
  const groupLabel = useFieldGroupLabel(groupId);

  return (
    <div>
      <p className='px-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase'>
        {groupLabel}
      </p>
      <ul className='grid gap-0.5'>
        {types.map((type) => (
          <InsertTypeItem
            key={type}
            type={type}
            onPick={onPick}
          />
        ))}
      </ul>
    </div>
  );
}

function InsertTypeItem({
  type,
  onPick,
}: {
  type: FieldType;
  onPick: (type: FieldType) => void;
}): JSX.Element {
  const meta = useFieldTypeMeta(type);

  return (
    <li>
      <Button
        type='button'
        variant='ghost'
        className='h-auto w-full justify-start gap-2.5 px-2 py-1.5 font-normal'
        onClick={() => {
          onPick(type);
        }}
      >
        <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10'>
          <FieldTypeIcon
            type={type}
            className='size-3.5 text-primary'
          />
        </span>
        <span className='truncate text-sm'>{meta.label}</span>
      </Button>
    </li>
  );
}
