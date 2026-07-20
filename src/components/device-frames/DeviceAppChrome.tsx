import {
  Activity,
  CalendarHeart,
  ChevronLeft,
  ClipboardList,
  Ellipsis,
  FlaskConical,
  FolderHeart,
  House,
  Leaf,
  MoreHorizontal,
  Pill,
  Search,
  Settings,
  Stethoscope,
  UsersRound,
} from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { cn } from '@/lib/utils.ts';

export type DeviceChromeKind = 'desktop' | 'mobile';

export interface DeviceAppChromeProps {
  /** Which simulated app shell to render around `children`. */
  kind: DeviceChromeKind;
  /** Visual hint shown at the top of the sidebar (form code) — desktop only. */
  contextLabel?: string;
  children: ReactNode;
  className?: string;
}

interface NavItem {
  icon: typeof House;
  labelKey: string;
  active?: boolean;
}

const desktopNav: NavItem[] = [
  { icon: House, labelKey: 'formPreview.chrome.navHome', active: true },
  { icon: ClipboardList, labelKey: 'formPreview.chrome.navIntake' },
  { icon: Stethoscope, labelKey: 'formPreview.chrome.navAssessments' },
  { icon: UsersRound, labelKey: 'formPreview.chrome.navPatients' },
  { icon: CalendarHeart, labelKey: 'formPreview.chrome.navSchedule' },
  { icon: Pill, labelKey: 'formPreview.chrome.formulary' },
  { icon: Activity, labelKey: 'formPreview.chrome.reports' },
  { icon: FolderHeart, labelKey: 'formPreview.chrome.archive' },
];

const secondaryNav: NavItem[] = [
  { icon: FlaskConical, labelKey: 'formPreview.chrome.research' },
  { icon: Settings, labelKey: 'formPreview.chrome.settings' },
];

export function DeviceAppChrome({
  kind,
  contextLabel,
  children,
  className,
}: DeviceAppChromeProps): JSX.Element {
  if (kind === 'mobile') {
    return (
      <MobileShell
        contextLabel={contextLabel}
        className={className}
      >
        {children}
      </MobileShell>
    );
  }

  return (
    <DesktopShell
      contextLabel={contextLabel}
      className={className}
    >
      {children}
    </DesktopShell>
  );
}

function DesktopShell({
  contextLabel,
  children,
  className,
}: {
  contextLabel?: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div className={cn('device-chrome device-chrome-desktop h-full w-full', className)}>
      <aside
        aria-hidden
        className='device-chrome-sidebar device-chrome-sidebar--grid flex h-full w-60 shrink-0 flex-col overflow-hidden text-[13px]'
      >
        <div className='flex items-center gap-2 px-4 pt-5 pb-4'>
          <span className='flex size-7 items-center justify-center rounded-lg bg-primary/12 text-primary'>
            <Leaf className='size-3.5' strokeWidth={2.25} />
          </span>
          <span className='font-display text-[15px] font-semibold tracking-tight text-foreground'>
            {t('formPreview.chrome.brand')}
          </span>
        </div>

        <div className='px-3 pb-3'>
          <label className='flex h-8 items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2.5 text-muted-foreground'>
            <Search className='size-3.5' strokeWidth={2} />
            <span className='text-[12px]'>{t('formPreview.chrome.searchPlaceholder')}</span>
            <span className='ml-auto rounded border border-border/60 px-1 font-mono text-[10px] tracking-tight text-muted-foreground/80'>
              ⌘K
            </span>
          </label>
        </div>

        {contextLabel ? (
          <div className='mx-3 mb-3 rounded-md border border-dashed border-primary/25 bg-primary/5 px-2.5 py-2'>
            <p className='font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary/80'>
              {t('formPreview.chrome.contextLabel')}
            </p>
            <p className='mt-0.5 truncate font-mono text-[11px] text-foreground/85'>
              {contextLabel}
            </p>
          </div>
        ) : null}

        <nav className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 pb-4'>
          <NavGroup
            titleKey='formPreview.chrome.workspace'
            items={desktopNav}
          />
          <NavGroup
            titleKey='formPreview.chrome.system'
            items={secondaryNav}
          />
        </nav>

        <div className='mt-auto flex shrink-0 items-center gap-2.5 border-t border-border/60 px-3 py-3'>
          <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30 font-mono text-[10px] font-semibold text-foreground/80'>
            DR
          </span>
          <div className='min-w-0 leading-tight'>
            <p className='truncate text-[12px] font-medium text-foreground/90'>
              {t('formPreview.chrome.userName')}
            </p>
            <p className='truncate text-[10.5px] text-muted-foreground'>
              {t('formPreview.chrome.userRole')}
            </p>
          </div>
          <MoreHorizontal className='ml-auto size-3.5 shrink-0 text-muted-foreground' />
        </div>
      </aside>

      <div className='device-chrome-content flex min-w-0 flex-1 flex-col overflow-hidden bg-background'>
        <DesktopTopBar />
        <ScrollArea className='min-h-0 flex-1'>{children}</ScrollArea>
      </div>
    </div>
  );
}

function NavGroup({
  titleKey,
  items,
}: {
  titleKey: string;
  items: NavItem[];
}): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div className='grid gap-1'>
      <p className='px-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70'>
        {t(titleKey)}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.labelKey}
          item={item}
        />
      ))}
    </div>
  );
}

function NavLink({ item }: { item: NavItem }): JSX.Element {
  const { t } = useTranslation('designer');
  const Icon = item.icon;

  return (
    <span
      className={cn(
        'flex h-7.5 items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px]',
        item.active
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-foreground/75',
      )}
    >
      <Icon
        className={cn('size-3.5 shrink-0', item.active ? 'text-primary' : 'text-muted-foreground')}
        strokeWidth={item.active ? 2.25 : 1.85}
      />
      <span className='truncate'>{t(item.labelKey)}</span>
      {item.active ? (
        <span className='ml-auto size-1.5 rounded-full bg-primary' />
      ) : null}
    </span>
  );
}

function DesktopTopBar(): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div
      aria-hidden
      className='device-chrome-topbar flex h-11 shrink-0 items-center gap-3 border-b border-border/60 px-5'
    >
      <div className='flex items-center gap-2 text-[12px] text-muted-foreground'>
        <span className='font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70 uppercase'>
          {t('formPreview.chrome.crumbWorkspace')}
        </span>
        <span className='text-muted-foreground/40'>/</span>
        <span className='font-mono text-[10px] tracking-[0.14em] text-foreground/85 uppercase'>
          {t('formPreview.chrome.crumbCurrent')}
        </span>
      </div>

      <div className='ml-auto flex items-center gap-1.5'>
        <span className='inline-flex h-6 items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 text-[10.5px] text-muted-foreground'>
          <span className='size-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_0_2px_oklch(0.72_0.15_148/22%)]' />
          {t('formPreview.chrome.liveBadge')}
        </span>
        <span className='inline-flex h-6 items-center rounded-full border border-border/60 px-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase'>
          {t('formPreview.chrome.envBadge')}
        </span>
        <span className='flex size-6 items-center justify-center rounded-full text-muted-foreground'>
          <Ellipsis className='size-3.5' />
        </span>
      </div>
    </div>
  );
}

function MobileShell({
  contextLabel,
  children,
  className,
}: {
  contextLabel?: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div className={cn('device-chrome device-chrome-mobile flex h-full w-full flex-col bg-background', className)}>
      <header className='device-chrome-mobileheader flex shrink-0 items-center justify-between gap-2 px-3 pt-1.5 pb-2'>
        <button
          type='button'
          tabIndex={-1}
          aria-hidden
          className='flex size-7 items-center justify-center rounded-full text-foreground/80 active:bg-foreground/5'
        >
          <ChevronLeft className='size-4' strokeWidth={2.25} />
        </button>
        <div className='flex min-w-0 flex-1 flex-col items-center text-center'>
          <p className='truncate font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase'>
            {t('formPreview.chrome.mobileEyebrow')}
          </p>
          <p className='-mt-0.5 truncate text-[12.5px] font-semibold tracking-tight text-foreground/90'>
            {contextLabel ?? t('formPreview.chrome.brand')}
          </p>
        </div>
        <button
          type='button'
          tabIndex={-1}
          aria-hidden
          className='flex size-7 items-center justify-center rounded-full text-foreground/80 active:bg-foreground/5'
        >
          <MoreHorizontal className='size-4' strokeWidth={2.25} />
        </button>
      </header>

      <ScrollArea className='min-h-0 flex-1'>{children}</ScrollArea>

      <nav
        aria-hidden
        className='device-chrome-mobiletabs flex shrink-0 items-stretch justify-around border-t border-border/60 px-1 pt-1 pb-2 text-[10px]'
      >
        <MobileTab
          icon={House}
          label={t('formPreview.chrome.tabHome')}
          active
        />
        <MobileTab
          icon={ClipboardList}
          label={t('formPreview.chrome.tabForms')}
        />
        <MobileTab
          icon={UsersRound}
          label={t('formPreview.chrome.tabPatients')}
        />
        <MobileTab
          icon={Activity}
          label={t('formPreview.chrome.tabActivity')}
        />
        <MobileTab
          icon={Settings}
          label={t('formPreview.chrome.tabSettings')}
        />
      </nav>
    </div>
  );
}

function MobileTab({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof House;
  label: string;
  active?: boolean;
}): JSX.Element {
  return (
    <span
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-0.5',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon
        className='size-4'
        strokeWidth={active ? 2.25 : 1.85}
      />
      <span className='truncate text-[9.5px] leading-none font-medium tracking-tight'>{label}</span>
    </span>
  );
}