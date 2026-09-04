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
 * `Select` pins `ItemText` to `whitespace-nowrap`, so long inspector labels
 * overflow the trigger width and reflow the column. This variant lets item
 * content wrap, keeps the popup anchored to the trigger
 * (`min-w-(--anchor-width)`), caps the popup at 80vw, and drops
 * `alignItemWithTrigger` so wrapping items push the popup outward naturally.
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
