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
}

export function FieldTypeLabel({ type }: FieldTypeLabelProps): JSX.Element {
  const meta = useFieldTypeMeta(type);

  return (
    <span className='inline-flex min-w-0 items-center gap-2'>
      <FieldTypeIcon
        type={type}
        className='text-muted-foreground'
      />
      <span className='truncate'>{meta.label}</span>
    </span>
  );
}

interface FieldTypeBadgeProps {
  type: FieldType;
}

export function FieldTypeBadge({ type }: FieldTypeBadgeProps): JSX.Element {
  const meta = useFieldTypeMeta(type);

  return (
    <Badge
      variant='secondary'
      className='gap-1 font-normal'
    >
      <FieldTypeIcon
        type={type}
        className='size-3.5'
      />
      {meta.label}
    </Badge>
  );
}
