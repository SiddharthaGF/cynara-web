import { XIcon } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';

interface PanelHeaderProps {
  /**
   * Title text. Required.
   */
  title: ReactNode;
  /** Single-line caption rendered beneath the title (mobile only). */
  subtitle?: ReactNode;
  /** Small uppercase eyebrow rendered above the title (desktop only). */
  eyebrow?: ReactNode;
  /** Optional icon rendered to the left of the title (e.g. FlaskConical). */
  icon?: ReactNode;
  /** Optional row of badges/chips rendered below the title. */
  badges?: ReactNode;
  /** Optional metadata row rendered beneath the badges (e.g. code chip). */
  meta?: ReactNode;
  /** Optional row of action buttons rendered on the right of the title. */
  actions?: ReactNode;
  /** Optional absolutely-positioned slot for things like the close X. */
  overlay?: ReactNode;
  /** Visual density. Mobile = sheet (compact). Desktop = docked rail. */
  surface?: 'desktop' | 'mobile';
  /** Override the bottom border (e.g. disable when the panel has no body). */
  bordered?: boolean;
  className?: string;
}

/**
 * Shared chrome for the inspector, AI chat, and preview side panels. Keeps the
 * title/subtitle/eyebrow/actions slots consistent across surfaces so the
 * docked rail and the bottom sheet stay visually aligned.
 */
export function PanelHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  badges,
  meta,
  actions,
  overlay,
  surface = 'desktop',
  bordered = true,
  className,
}: PanelHeaderProps): JSX.Element {
  const isMobile = surface === 'mobile';

  return (
    <header
      className={cn(
        'relative shrink-0',
        bordered && 'border-b border-border/60',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-w-0 items-start gap-2',
          isMobile ? 'px-4 py-2.5' : 'px-4 py-3',
        )}
      >
        {icon ? (
          <span
            aria-hidden='true'
            className='mt-0.5 flex size-5 shrink-0 items-center justify-center text-primary'
          >
            {icon}
          </span>
        ) : null}

        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          {eyebrow ? (
            <p className='text-[10px] font-medium tracking-wide text-muted-foreground uppercase'>
              {eyebrow}
            </p>
          ) : null}
          <Title
            title={title}
            surface={surface}
          />
          {subtitle ? (
            <p className='truncate text-xs text-muted-foreground'>{subtitle}</p>
          ) : null}
        </div>

        {actions ? (
          <div className='flex shrink-0 items-center gap-1'>{actions}</div>
        ) : null}
      </div>

      {badges ? (
        <div className='flex flex-wrap items-center gap-1.5 px-4 pt-1 pb-2'>
          {badges}
        </div>
      ) : null}

      {meta ? (
        <div className='flex flex-wrap items-center gap-2 px-4 pt-0 pb-3'>
          {meta}
        </div>
      ) : null}

      {overlay}
    </header>
  );
}

function Title({
  title,
  surface,
}: {
  title: ReactNode;
  surface: 'desktop' | 'mobile';
}): JSX.Element {
  const isMobile = surface === 'mobile';
  if (isMobile) {
    return (
      <span className='truncate text-sm font-semibold text-foreground'>
        {title}
      </span>
    );
  }
  return (
    <h2 className='truncate text-base font-semibold text-foreground'>
      {title}
    </h2>
  );
}

/**
 * Optional close-X that anchors to the top-right corner. The docked surface
 * uses this; the bottom sheet relies on `SheetContent`'s built-in close
 * button so it does not render this.
 */
export function PanelHeaderCloseButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}): JSX.Element {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'absolute top-2.5 right-2.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        className,
      )}
    >
      <XIcon className='size-4' />
    </button>
  );
}
