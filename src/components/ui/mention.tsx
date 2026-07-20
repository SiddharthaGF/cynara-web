import * as MentionPrimitive from '@diceui/mention';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Mention({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Root>) {
  return (
    <MentionPrimitive.Root
      data-slot='mention'
      className={cn(
        // No padding on tags — extra width desyncs caret from highlighter text.
        '**:data-tag:rounded-sm **:data-tag:bg-muted **:data-tag:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function MentionLabel({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Label>) {
  return (
    <MentionPrimitive.Label
      data-slot='mention-label'
      className={cn('px-0.5 py-1.5 text-sm font-semibold', className)}
      {...props}
    />
  );
}

function MentionInput({
  className,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Input>) {
  return (
    <MentionPrimitive.Input
      data-slot='mention-input'
      className={cn(
        'block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 text-transparent shadow-xs caret-foreground outline-none placeholder:text-muted-foreground placeholder:[-webkit-text-fill-color:var(--muted-foreground)] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [-webkit-text-fill-color:transparent]',
        className,
      )}
      {...props}
    />
  );
}

/** Auto-growing textarea slotted into DiceUI Mention (input-only primitive). */
function MentionTextarea({
  className,
  onInput,
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'children'>): React.JSX.Element {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  function resize(): void {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.style.height = '0px';
    const minPx = 2.5 * 16;
    // Grow with content; ScrollArea clips + scrolls at max height.
    el.style.height = `${Math.max(el.scrollHeight, minPx)}px`;
    const viewport = el.closest(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLElement | null;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }

  React.useLayoutEffect(() => {
    resize();
  });

  return (
    <MentionPrimitive.Input asChild>
      <textarea
        ref={ref}
        data-slot='mention-input'
        rows={1}
        className={cn(
          'ai-chat-mention-input block w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 text-transparent shadow-xs caret-foreground outline-none placeholder:text-muted-foreground placeholder:[-webkit-text-fill-color:var(--muted-foreground)] focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [-webkit-text-fill-color:transparent]',
          className,
        )}
        {...props}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
      />
    </MentionPrimitive.Input>
  );
}


function MentionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Content>) {
  return (
    <MentionPrimitive.Portal>
      <MentionPrimitive.Content
        data-slot='mention-content'
        className={cn(
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in',
          className,
        )}
        {...props}
      >
        {children}
      </MentionPrimitive.Content>
    </MentionPrimitive.Portal>
  );
}

function MentionItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MentionPrimitive.Item>) {
  return (
    <MentionPrimitive.Item
      data-slot='mention-item'
      className={cn(
        'relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted data-highlighted:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </MentionPrimitive.Item>
  );
}

export {
  Mention,
  MentionContent,
  MentionInput,
  MentionItem,
  MentionLabel,
  MentionTextarea,
};
