import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from '@/components/ui/sidebar.tsx';
import type { FieldType } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { FIELD_TYPE_GROUPS, FIELD_TYPES } from './fieldTypeMeta.ts';
import type { FieldTypeMeta } from './fieldTypeMeta.ts';
import { useFieldGroupLabel, useFieldTypeMeta } from './useFieldTypeMeta.ts';

interface FieldPaletteContentProps {
  onAdd: (type: FieldType) => void;
  disabled?: boolean;
}

export function DesignerSidebar({
  onAdd,
  disabled = false,
}: FieldPaletteContentProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <Sidebar
      collapsible='offcanvas'
      className='border-r'
    >
      <SidebarHeader className='border-b px-4 py-4'>
        <h2 className='font-heading text-sm font-semibold'>
          {t('palette.title')}
        </h2>
        <p className='text-xs text-muted-foreground'>
          {t('palette.description')}
        </p>
      </SidebarHeader>
      <SidebarContent className='overflow-hidden'>
        <FieldPaletteContent
          onAdd={onAdd}
          disabled={disabled}
        />
      </SidebarContent>
    </Sidebar>
  );
}

function FieldPaletteContent({
  onAdd,
  disabled = false,
}: FieldPaletteContentProps): JSX.Element {
  return (
    <ScrollArea className='h-full'>
      <div className='grid gap-4 p-3'>
        {FIELD_TYPE_GROUPS.map((group, groupIndex) => {
          const items = FIELD_TYPES.filter((item) => item.group === group.id);
          if (items.length === 0) {
            return null;
          }

          return (
            <FieldPaletteGroup
              key={group.id}
              groupId={group.id}
              showSeparator={groupIndex > 0}
              items={items}
              disabled={disabled}
              onAdd={onAdd}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}

function FieldPaletteGroup({
  groupId,
  showSeparator,
  items,
  disabled,
  onAdd,
}: {
  groupId: FieldTypeMeta['group'];
  showSeparator: boolean;
  items: FieldTypeMeta[];
  disabled: boolean;
  onAdd: (type: FieldType) => void;
}): JSX.Element {
  const groupLabel = useFieldGroupLabel(groupId);

  return (
    <div>
      {showSeparator ? <Separator className='mb-4' /> : null}
      <p className='mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {groupLabel}
      </p>
      <ul className='grid gap-1'>
        {items.map((item) => (
          <PaletteItem
            key={item.type}
            type={item.type}
            icon={item.icon}
            disabled={disabled}
            onAdd={onAdd}
          />
        ))}
      </ul>
    </div>
  );
}

function PaletteItem({
  type,
  icon: Icon,
  disabled,
  onAdd,
}: {
  type: FieldType;
  icon: FieldTypeMeta['icon'];
  disabled: boolean;
  onAdd: (type: FieldType) => void;
}): JSX.Element {
  const meta = useFieldTypeMeta(type);

  return (
    <li>
      <Button
        type='button'
        variant='ghost'
        disabled={disabled}
        className={cn(
          'h-auto w-full justify-start gap-3 px-2 py-2 text-left font-normal',
        )}
        onClick={() => {
          onAdd(type);
        }}
      >
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
          <Icon className='size-4 text-primary' />
        </span>
        <span className='grid min-w-0 gap-0.5'>
          <span className='truncate text-sm'>{meta.label}</span>
          <span className='truncate text-xs text-muted-foreground'>
            {meta.description}
          </span>
        </span>
      </Button>
    </li>
  );
}
