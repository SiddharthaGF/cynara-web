import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from '@tanstack/react-router';
import {
  ClipboardList,
  Hospital,
  LayoutDashboard,
  Search,
  Users,
  Workflow,
} from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '@/api/query-keys.ts';
import { getWorkspace } from '@/api/workspace.ts';
import { CommandPalette } from '@/components/command-palette.tsx';
import { CynaraMark } from '@/components/cynara-mark.tsx';
import { SettingsMenu } from '@/components/settings-menu.tsx';
import { DocumentMeta } from '@/components/theme-toggle.tsx';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
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

type NavTarget =
  | '/$locale'
  | '/$locale/forms'
  | '/$locale/workflows'
  | '/$locale/patients'
  | '/$locale/admin';

interface NavEntry {
  to: NavTarget;
  labelKey: string;
  icon: typeof LayoutDashboard;
  /** Any one of these subjects (with the read action) reveals the entry. */
  subjects: readonly ('Catalog' | 'Patient' | 'Workflow' | 'Workspace')[];
}

interface NavGroup {
  labelKey: string;
  entries: NavEntry[];
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    labelKey: 'nav.care',
    entries: [
      {
        to: '/$locale',
        labelKey: 'nav.home',
        icon: LayoutDashboard,
        subjects: [],
      },
      {
        to: '/$locale/patients',
        labelKey: 'nav.patients',
        icon: Users,
        subjects: ['Patient'],
      },
    ],
  },
  {
    labelKey: 'nav.configuration',
    entries: [
      {
        to: '/$locale/forms',
        labelKey: 'nav.forms',
        icon: ClipboardList,
        subjects: ['Catalog'],
      },
      {
        to: '/$locale/workflows',
        labelKey: 'nav.workflows',
        icon: Workflow,
        subjects: ['Workflow'],
      },
      {
        to: '/$locale/admin',
        labelKey: 'nav.administration',
        icon: Hospital,
        subjects: ['Catalog', 'Workspace'],
      },
    ],
  },
];

function useAccessibleNav(): {
  groups: NavGroup[];
  homeTarget: NavTarget;
} {
  const { can, isLoading } = useCapabilities();
  const groups = NAV_GROUPS.flatMap((group) => {
    const entries = group.entries.filter(
      (entry) =>
        !isLoading &&
        (entry.subjects.length === 0 ||
          entry.subjects.some((subject) => can('read', subject))),
    );
    return entries.length === 0 ? [] : [{ labelKey: group.labelKey, entries }];
  });
  return { groups, homeTarget: '/$locale' };
}

function actorInitials(actorId: string | null): string {
  if (!actorId) {
    return '?';
  }
  const first = actorId.trim().charAt(0).toUpperCase();
  return first || '?';
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
      className='ambient-bg relative min-h-svh'
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
  className,
}: AppShellContentProps): JSX.Element {
  const { t } = useTranslation('common');
  const { locale } = useParams({ from: '/$locale' });
  const location = useLocation();
  const { state } = useSidebar();
  const { can, actorId } = useCapabilities();
  const { groups, homeTarget } = useAccessibleNav();
  const [commandOpen, setCommandOpen] = useState(false);

  const canReadWorkspace = can('read', 'Workspace');
  const workspaceQuery = useQuery({
    queryKey: queryKeys.workspace.detail(),
    queryFn: getWorkspace,
    enabled: canReadWorkspace,
  });
  const workspaceName = workspaceQuery.data?.name ?? null;

  const isOnHome =
    location.pathname === `/${locale}` || location.pathname === `/${locale}/`;
  const isOnForms = location.pathname.startsWith(`/${locale}/forms`);
  const isOnWorkflows = location.pathname.startsWith(`/${locale}/workflows`);
  const isOnPatients = location.pathname.startsWith(`/${locale}/patients`);
  const isOnAdmin = location.pathname.startsWith(`/${locale}/admin`);
  const isCollapsed = state === 'collapsed';

  const routeActiveByTarget: Record<NavTarget, boolean> = {
    '/$locale': isOnHome,
    '/$locale/forms': isOnForms,
    '/$locale/workflows': isOnWorkflows,
    '/$locale/patients': isOnPatients,
    '/$locale/admin': isOnAdmin,
  };

  function currentSectionLabel(): string | null {
    if (isOnHome) {
      return t('nav.home');
    }
    if (isOnPatients) {
      return t('nav.patients');
    }
    if (isOnForms) {
      return t('nav.forms');
    }
    if (isOnWorkflows) {
      return t('nav.workflows');
    }
    if (isOnAdmin) {
      return t('nav.administration');
    }
    return null;
  }

  return (
    <>
      <DocumentMeta />
      <Sidebar
        side='left'
        variant='sidebar'
        collapsible='icon'
        className='border-r border-sidebar-border/80'
      >
        <nav
          aria-label={t('nav.sidebar')}
          className='flex h-full flex-col'
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
            {groups.map((group) => (
              <SidebarGroup key={group.labelKey}>
                <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.entries.map((entry) => {
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
            ))}
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
        </nav>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className={cn('relative z-10', className)}>
        <div className='flex items-center gap-2 border-b border-border/60 bg-card/70 px-3 py-2 backdrop-blur-md md:gap-3 md:px-4'>
          <SidebarTrigger className='text-muted-foreground' />
          <span className='hidden min-w-0 truncate text-sm font-medium text-foreground/90 sm:block'>
            {workspaceName ?? currentSectionLabel() ?? t('appName')}
          </span>
          <div className='ml-auto flex items-center gap-1'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => {
                setCommandOpen(true);
              }}
              aria-label={t('search.trigger')}
              data-testid='global-search-trigger'
              className='text-muted-foreground'
            >
              <Search className='size-4' />
              <span className='hidden text-sm md:inline'>
                {t('search.trigger')}
              </span>
              <kbd className='pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground'>
                ⌘K
              </kbd>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t('user.menuLabel')}
                data-testid='user-menu-trigger'
                className='focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
              >
                <Avatar className='size-7'>
                  <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>
                    {actorInitials(actorId)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    {t('user.signedInAs', { actorId: actorId ?? t('appName') })}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canReadWorkspace ? (
                    <DropdownMenuItem
                      render={
                        <Link
                          to='/$locale/admin/workspace'
                          params={{ locale }}
                        />
                      }
                      data-testid='user-menu-workspace-settings'
                    >
                      {t('user.workspaceSettings')}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className='relative z-10 min-w-0'>{children}</div>
      </SidebarInset>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </>
  );
}
