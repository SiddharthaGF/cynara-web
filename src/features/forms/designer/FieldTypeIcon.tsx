import type { JSX } from 'react';

import { Badge } from '@/components/ui/badge.tsx';
import type { FieldType } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { getFieldTypeIcon } from './fieldTypeMeta.ts';
import { useFieldTypeMeta } from './useFieldTypeMeta.ts';

interface FieldTypeIconProps {
  type: FieldType;
  className?: string;
}

/** Shared glyph for a field type — use everywhere types are shown. */
export function FieldTypeIcon({
  type,
  className,
}: FieldTypeIconProps): JSX.Element {
  const Icon = getFieldTypeIcon(type);
  return (
    <Icon
      className={cn('size-4 shrink-0', className)}
      aria-hidden='true'
    />
  );
}

interface FieldTypeLabelProps {
  type: FieldType;
  className?: string;
  iconClassName?: string;
}

/** Icon + localized label, for selects and compact rows. */
export function FieldTypeLabel({
  type,
  className,
  iconClassName,
}: FieldTypeLabelProps): JSX.Element {
  const meta = useFieldTypeMeta(type);

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <FieldTypeIcon
        type={type}
        className={cn('text-muted-foreground', iconClassName)}
      />
      <span className='truncate'>{meta.label}</span>
    </span>
  );
}

interface FieldTypeBadgeProps {
  type: FieldType;
  className?: string;
}

/** Badge with the same icon used in palette and type select. */
export function FieldTypeBadge({
  type,
  className,
}: FieldTypeBadgeProps): JSX.Element {
  const meta = useFieldTypeMeta(type);

  return (
    <Badge
      variant='secondary'
      className={cn('gap-1 font-normal', className)}
    >
      <FieldTypeIcon
        type={type}
        className='size-3.5'
      />
      {meta.label}
    </Badge>
  );
}
