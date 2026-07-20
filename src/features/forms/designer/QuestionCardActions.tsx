import {
  ChevronDown,
  ChevronUp,
  Copy,
  MoreVertical,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';

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
    <div className='flex w-full items-center justify-between gap-3 sm:contents'>
      <div className='flex items-center gap-1'>
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                aria-label={t('canvas.duplicate')}
                disabled
                className='hidden sm:inline-flex'
              />
            }
          >
            <Copy />
          </TooltipTrigger>
          <TooltipContent>{t('canvas.duplicateSoon')}</TooltipContent>
        </Tooltip>
      </div>

      <div className='hidden items-center gap-3 sm:flex'>
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
        <Button
          type='button'
          variant='outline'
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
          variant='destructive'
          size='icon-sm'
          aria-label={t('canvas.deleteQuestion')}
          onClick={() => {
            onRemove(field.id);
          }}
        >
          <Trash2 />
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type='button'
              variant='outline'
              size='icon-sm'
              className='sm:hidden'
              aria-label={t('canvas.actionsMenu')}
            />
          }
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuCheckboxItem
            checked={field.required ?? false}
            onCheckedChange={(checked) => {
              onToggleRequired(field.id, checked);
            }}
          >
            {t('canvas.required')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuItem
            onClick={() => {
              onOpenAdvanced(field.id);
            }}
          >
            {t('canvas.moreOptions')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            {t('canvas.duplicateSoon')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            onClick={() => {
              onRemove(field.id);
            }}
          >
            {t('canvas.deleteQuestion')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
