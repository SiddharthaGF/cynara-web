import type { FieldPresentation } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

const WIDTH_CLASSES: Record<NonNullable<FieldPresentation['width']>, string> = {
  full: 'col-span-full',
  half: 'col-span-full @min-[38rem]/preview:col-span-6',
  third: 'col-span-full @min-[38rem]/preview:col-span-4',
  quarter: 'col-span-full @min-[38rem]/preview:col-span-3',
};

export function widthClass(width: FieldPresentation['width'] | undefined): string {
  return WIDTH_CLASSES[width ?? 'full'];
}

export function fieldShellClass(className?: string): string {
  return cn('grid gap-2', className);
}
