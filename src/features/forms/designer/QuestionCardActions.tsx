import {
  Asterisk,
  ChevronDown,
  ChevronUp,
  Copy,
  MoreVertical,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Field, FieldLabel } from '@/components/ui/field.tsx';
import { Separator } from '@/components/ui/separator.tsx';

import type { QuestionCardProps } from './QuestionCard.tsx';

export function QuestionCardActions({
  field,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onToggleRequired,
  onOpenAdvanced,
  onRemove,
}: Pick<
  QuestionCardProps,
  | 'field'
  | 'index'
  | 'total'
  | 'onMoveUp'
  | 'onMoveDown'
  | 'onToggleRequired'
  | 'onOpenAdvanced'
  | 'onRemove'
>): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div className='flex w-full items-center justify-between gap-1.5 sm:contents'>
      <div className='flex items-center gap-0.5'>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={t('canvas.moveUp')}
          disabled={index === 0}
          onClick={() => {
            onMoveUp(index);
          }}
        >
          <ChevronUp />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={t('canvas.moveDown')}
          disabled={index === total - 1}
          onClick={() => {
            onMoveDown(index);
          }}
        >
          <ChevronDown />
        </Button>
      </div>

      <div className='hidden items-center sm:flex'>
        <Field orientation='horizontal'>
          <Checkbox
            id={`${field.id}-required-footer`}
            checked={field.required ?? false}
            onCheckedChange={(checked) => {
              onToggleRequired(field.id, checked);
            }}
          />
          <FieldLabel htmlFor={`${field.id}-required-footer`}>
            {t('canvas.required')}
          </FieldLabel>
        </Field>

        <Separator
          orientation='vertical'
          className='mx-1 h-4'
        />

        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={t('canvas.moreOptions')}
          onClick={() => {
            onOpenAdvanced(field.id);
          }}
        >
          <MoreVertical />
        </Button>

        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={t('canvas.deleteQuestion')}
          onClick={() => {
            onRemove(field.id);
          }}
          className='text-destructive hover:bg-destructive/10 hover:text-destructive'
        >
          <Trash2 />
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              className='sm:hidden'
              aria-label={t('canvas.actionsMenu')}
            />
          }
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='min-w-44'
        >
          <DropdownMenuCheckboxItem
            checked={field.required ?? false}
            onCheckedChange={(checked) => {
              onToggleRequired(field.id, checked);
            }}
            className='whitespace-nowrap'
          >
            <Asterisk className='size-4' />
            <span>{t('canvas.required')}</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuItem
            className='whitespace-nowrap'
            onClick={() => {
              onOpenAdvanced(field.id);
            }}
          >
            <Settings2 className='size-4' />
            <span>{t('canvas.moreOptions')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled
            className='whitespace-nowrap'
          >
            <Copy className='size-4' />
            <span>{t('canvas.duplicateSoon')}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            className='whitespace-nowrap'
            onClick={() => {
              onRemove(field.id);
            }}
          >
            <Trash2 className='size-4' />
            <span>{t('canvas.deleteQuestion')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
