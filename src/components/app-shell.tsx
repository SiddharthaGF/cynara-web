import { Link, useLocation, useParams } from '@tanstack/react-router';
import { ClipboardList, Hospital, Users } from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CynaraMark } from '@/components/cynara-mark.tsx';
import { SettingsMenu } from '@/components/settings-menu.tsx';
import { DocumentMeta } from '@/components/theme-toggle.tsx';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { cn } from '@/lib/utils.ts';

interface AppShellProps {
  children: ReactNode;
  variant?: 'catalog' | 'minimal';
  className?: string;
}

interface NavEntry {
  to: '/$locale/forms' | '/$locale/patients' | '/$locale/admin';
  labelKey: string;
  icon: typeof ClipboardList;
  /** Any one of these subjects (with the read action) reveals the entry. */
  subjects: readonly ('Catalog' | 'Patient' | 'Workflow' | 'Workspace')[];
}

const NAV_ENTRIES: readonly NavEntry[] = [
  {
    to: '/$locale/forms',
    labelKey: 'nav.forms',
    icon: ClipboardList,
    subjects: ['Catalog'],
  },
  {
    to: '/$locale/patients',
    labelKey: 'nav.patients',
    icon: Users,
    subjects: ['Patient'],
  },
  {
    to: '/$locale/admin',
    labelKey: 'nav.administration',
    icon: Hospital,
    subjects: ['Catalog', 'Workspace'],
  },
];

function useAccessibleNav(): {
  entries: NavEntry[];
  homeTarget: NavEntry['to'];
} {
  const { can, isLoading } = useCapabilities();
  const entries = NAV_ENTRIES.filter(
    (entry) =>
      !isLoading && entry.subjects.some((subject) => can('read', subject)),
  );
  return {
    entries,
    homeTarget: entries[0]?.to ?? '/$locale/forms',
  };
}

export function AppShell({
  children,
  variant = 'catalog',
  className,
}: AppShellProps): JSX.Element {
  // The catalog benefits from a visible sidebar; the designer route hides the
  // Rail by collapsing the sidebar to an icon strip to give the canvas more
  // Breathing room. Users can expand it from the trigger.
  const defaultOpen = variant === 'catalog';

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className='grain ambient-bg relative min-h-svh'
    >
      <AppShellContent
        variant={variant}
        className={className}
      >
        {children}
      </AppShellContent>
    </SidebarProvider>
  );
}

interface AppShellContentProps {
  children: ReactNode;
  variant: 'catalog' | 'minimal';
  className?: string;
}

function AppShellContent({
  children,
  variant,
  className,
}: AppShellContentProps): JSX.Element {
  const { t } = useTranslation('common');
  const { locale } = useParams({ from: '/$locale' });
  const location = useLocation();
  const { state } = useSidebar();
  const { entries, homeTarget } = useAccessibleNav();

  const isOnForms = location.pathname.startsWith(`/${locale}/forms`);
  const isOnPatients = location.pathname.startsWith(`/${locale}/patients`);
  const isOnAdmin = location.pathname.startsWith(`/${locale}/admin`);
  const isCollapsed = state === 'collapsed';

  const routeActiveByTarget: Record<NavEntry['to'], boolean> = {
    '/$locale/forms': isOnForms,
    '/$locale/patients': isOnPatients,
    '/$locale/admin': isOnAdmin,
  };

  return (
    <>
      <DocumentMeta />
      <Sidebar
        side='left'
        variant='sidebar'
        collapsible='icon'
        className='border-r border-sidebar-border/80'
      >
        <SidebarHeader>
          <Link
            to={homeTarget}
            params={{ locale }}
            aria-label={t('appName')}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 transition-opacity hover:opacity-80',
              isCollapsed && 'size-8 justify-center gap-0 p-2',
            )}
          >
            <CynaraMark showWordmark={!isCollapsed} />
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {entries.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel>{t('nav.modules')}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {entries.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <SidebarMenuItem key={entry.to}>
                        <SidebarMenuButton
                          render={
                            <Link
                              to={entry.to}
                              params={{ locale }}
                            />
                          }
                          isActive={routeActiveByTarget[entry.to]}
                          tooltip={t(entry.labelKey)}
                        >
                          <Icon />
                          <span>{t(entry.labelKey)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>

        <SidebarFooter
          className={cn(
            'border-t border-sidebar-border/60',
            isCollapsed && 'p-0',
          )}
        >
          <SidebarGroup className={cn(isCollapsed && 'items-center p-2')}>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem
                  className={cn(isCollapsed && 'flex justify-center')}
                >
                  <SettingsMenu
                    showLabel={!isCollapsed}
                    className={cn(!isCollapsed && 'w-full')}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className={cn('relative z-10', className)}>
        <div className='flex items-center gap-2 border-b border-border/60 bg-card/70 px-3 py-2 backdrop-blur-md md:gap-3 md:px-4'>
          <SidebarTrigger className='text-muted-foreground' />
          {variant === 'catalog' ? (
            <span className='hidden text-xs font-medium tracking-widest text-muted-foreground uppercase sm:inline'>
              {t('clinicalForms')}
            </span>
          ) : null}
        </div>
        <div className='relative z-10 min-w-0'>{children}</div>
      </SidebarInset>
    </>
  );
}
