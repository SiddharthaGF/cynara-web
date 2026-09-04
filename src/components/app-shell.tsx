import {
  useLocation,
  useParams,
  useRouteContext,
} from '@tanstack/react-router';
import {
  ClipboardList,
  Hospital,
  LayoutDashboard,
  Users,
  Workflow,
} from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CommandPalette } from '@/components/command-palette.tsx';
import { NavMain } from '@/components/nav-main.tsx';
import { NavUser } from '@/components/nav-user.tsx';
import { SiteHeader } from '@/components/site-header.tsx';
import { DocumentMeta } from '@/components/theme-toggle.tsx';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from '@/components/ui/sidebar.tsx';
import { WorkspaceSwitcher } from '@/components/workspace-switcher.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { cn } from '@/lib/utils.ts';

interface AppShellProps {
  children: ReactNode;
  variant?: 'catalog' | 'minimal';
  className?: string;
}

export type NavTarget =
  | '/$locale'
  | '/$locale/forms'
  | '/$locale/workflows'
  | '/$locale/patients'
  | '/$locale/admin';

export interface NavEntry {
  to: NavTarget;
  labelKey: string;
  icon: typeof LayoutDashboard;
  /** Any one of these subjects (with the read action) reveals the entry. */
  subjects: readonly ('Catalog' | 'Patient' | 'Workflow' | 'Workspace')[];
}

export interface NavGroup {
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
  return { groups };
}

export function AppShell({
  children,
  variant = 'catalog',
  className,
}: AppShellProps): JSX.Element {
  // Catalog keeps a visible sidebar; the designer collapses it to an icon strip for canvas room.
  const defaultOpen = variant === 'catalog';
  const { sidebarOpen } = useRouteContext({ from: '/$locale' });

  return (
    <SidebarProvider
      defaultOpen={sidebarOpen ?? defaultOpen}
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
  const { hospitalCode, memberships, workspace } = useRouteContext({
    from: '/$locale',
  });
  const location = useLocation();
  const { groups } = useAccessibleNav();
  const [commandOpen, setCommandOpen] = useState(false);

  const isOnHome =
    location.pathname === `/${locale}` || location.pathname === `/${locale}/`;
  const isOnForms = location.pathname.startsWith(`/${locale}/forms`);
  const isOnWorkflows = location.pathname.startsWith(`/${locale}/workflows`);
  const isOnPatients = location.pathname.startsWith(`/${locale}/patients`);
  const isOnAdmin = location.pathname.startsWith(`/${locale}/admin`);
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
            <WorkspaceSwitcher
              workspaceCode={hospitalCode}
              workspaceName={workspace?.name ?? null}
              memberships={memberships}
            />
          </SidebarHeader>
          <SidebarContent>
            <NavMain
              groups={groups}
              locale={locale}
              activeByTarget={routeActiveByTarget}
            />
          </SidebarContent>

          <SidebarFooter className='border-t border-sidebar-border/60'>
            <NavUser />
          </SidebarFooter>
        </nav>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className={cn('relative z-10', className)}>
        <SiteHeader
          currentSection={currentSectionLabel()}
          locale={locale}
          onSearch={() => {
            setCommandOpen(true);
          }}
        />
        <div className='relative z-10 min-w-0'>{children}</div>
      </SidebarInset>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </>
  );
}
