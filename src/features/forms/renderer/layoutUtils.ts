import type { FieldPresentation } from '@/features/forms/types.ts';

const WIDTH_CLASSES: Record<NonNullable<FieldPresentation['width']>, string> = {
  full: 'col-span-full',
  half: 'col-span-full @min-[38rem]/preview:col-span-6',
  third: 'col-span-full @min-[38rem]/preview:col-span-4',
  quarter: 'col-span-full @min-[38rem]/preview:col-span-3',
};

export function widthClass(width: FieldPresentation['width'] | undefined): string {
  return WIDTH_CLASSES[width ?? 'full'];
}
