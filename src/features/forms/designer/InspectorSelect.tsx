import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon } from 'lucide-react';
import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { cn } from '@/lib/utils';

type TriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger>;
type ItemProps = React.ComponentProps<typeof SelectPrimitive.Item>;

/**
 * Selects used inside the field inspector / form preview suffer from overly
 * long option labels (e.g. rule-pair `label — code`). The shared `Select`
 * primitive pins `ItemText` to `whitespace-nowrap`, which makes the popup
 * content overflow past its trigger width and reflows the whole column.
 *
 * `InspectorSelect` keeps the same API but:
 * - Removes the `whitespace-nowrap` constraint on `ItemText` so item content
 *   can wrap, while still keeping `min-w-(--anchor-width)` to anchor the
 *   popup to the trigger.
 * - Caps the popup width so it never exceeds 80vw, even with very long codes.
 * - Drops `alignItemWithTrigger` to `false` so wrapping items push the popup
 *   outward naturally instead of forcing it down by character.
 */
const InspectorSelect = Select;

type InspectorSelectContentProps = React.ComponentProps<typeof SelectContent>;

function InspectorSelectContent({
  className,
  children,
  ...props
}: InspectorSelectContentProps): React.JSX.Element {
  return (
    <SelectContent
      alignItemWithTrigger={false}
      className={cn(
        'max-w-[min(80vw,28rem)] min-w-(--anchor-width)',
        className,
      )}
      {...props}
    >
      {children}
    </SelectContent>
  );
}

function InspectorSelectItem({
  children,
  className,
  ...rest
}: ItemProps): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      data-slot='inspector-select-item'
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...rest}
    >
      <SelectPrimitive.ItemText className='flex min-w-0 flex-1 flex-col gap-0.5 break-words'>
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className='pointer-events-none absolute right-2 flex size-4 items-center justify-center' />
        }
      >
        <CheckIcon className='pointer-events-none' />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function InspectorSelectTrigger({
  className,
  children,
  size = 'default',
  ...props
}: TriggerProps & {
  size?: 'default' | 'sm';
}): React.JSX.Element {
  return (
    <SelectTrigger
      data-slot='inspector-select-trigger'
      size={size}
      className={cn('w-full', className)}
      {...props}
    >
      <SelectValue className='min-w-0'>{children}</SelectValue>
    </SelectTrigger>
  );
}

export {
  InspectorSelect,
  InspectorSelectContent,
  InspectorSelectItem,
  InspectorSelectTrigger,
};
