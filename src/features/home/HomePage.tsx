import { Link, useParams } from '@tanstack/react-router';
import {
  ClipboardList,
  Hospital,
  Stethoscope,
  UserPlus,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { PageHeader } from '@/components/page-header.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { HomeDashboard } from '@/features/home/HomeDashboard.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import type {
  CapabilityAction,
  CapabilitySubject,
} from '@/lib/capabilities.ts';

interface Requirement {
  action: CapabilityAction;
  subject: CapabilitySubject;
}

interface QuickAction {
  key: 'registerPatient' | 'newEncounter' | 'createForm' | 'createWorkflow';
  to:
    | '/$locale/patients/register'
    | '/$locale/patients'
    | '/$locale/forms'
    | '/$locale/workflows';
  icon: LucideIcon;
  requires: readonly Requirement[];
}

interface BrowseEntry {
  key: 'patients' | 'forms' | 'workflows' | 'administration';
  to:
    | '/$locale/patients'
    | '/$locale/forms'
    | '/$locale/workflows'
    | '/$locale/admin';
  icon: LucideIcon;
  requires: readonly Requirement[];
}

const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    key: 'registerPatient',
    to: '/$locale/patients/register',
    icon: UserPlus,
    requires: [{ action: 'write', subject: 'Patient' }],
  },
  {
    key: 'newEncounter',
    to: '/$locale/patients',
    icon: Stethoscope,
    requires: [{ action: 'write', subject: 'Encounter' }],
  },
  {
    key: 'createForm',
    to: '/$locale/forms',
    icon: ClipboardList,
    requires: [{ action: 'write', subject: 'Catalog' }],
  },
  {
    key: 'createWorkflow',
    to: '/$locale/workflows',
    icon: Workflow,
    requires: [{ action: 'write', subject: 'Catalog' }],
  },
];

const BROWSE_ENTRIES: readonly BrowseEntry[] = [
  {
    key: 'patients',
    to: '/$locale/patients',
    icon: Users,
    requires: [{ action: 'read', subject: 'Patient' }],
  },
  {
    key: 'forms',
    to: '/$locale/forms',
    icon: ClipboardList,
    requires: [{ action: 'read', subject: 'Catalog' }],
  },
  {
    key: 'workflows',
    to: '/$locale/workflows',
    icon: Workflow,
    requires: [{ action: 'read', subject: 'Workflow' }],
  },
  {
    key: 'administration',
    to: '/$locale/admin',
    icon: Hospital,
    requires: [
      { action: 'read', subject: 'Workspace' },
      { action: 'read', subject: 'Catalog' },
    ],
  },
];

export function HomePage(): JSX.Element {
  const { t } = useTranslation('home');
  const { locale } = useParams({ from: '/$locale' });
  const { can, hasData } = useCapabilities();

  const quickActions = QUICK_ACTIONS.filter((action) =>
    action.requires.some((requirement) =>
      can(requirement.action, requirement.subject),
    ),
  );
  const browseEntries = BROWSE_ENTRIES.filter((entry) =>
    entry.requires.some((requirement) =>
      can(requirement.action, requirement.subject),
    ),
  );
  const hasAnyAction = quickActions.length > 0 || browseEntries.length > 0;

  const loadingState = (
    <div className='grid gap-3'>
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-10 w-full' />
    </div>
  );

  const emptyState = (
    <Empty
      className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'
      data-testid='home-empty'
    >
      <EmptyHeader>
        <EmptyTitle className='text-lg'>{t('emptyTitle')}</EmptyTitle>
        <EmptyDescription>{t('emptyDescription')}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-5xl px-6 py-6 pb-12'>
        <PageHeader
          className='mb-6'
          title={t('title')}
          subtitle={t('subtitle')}
        />

        {hasData ? (
          <>
            {quickActions.length > 0 ? (
              <section className='mb-6'>
                <h2 className='mb-3 font-heading text-xs font-medium tracking-widest text-muted-foreground uppercase'>
                  {t('startSection')}
                </h2>
                <div className='grid gap-2 sm:grid-cols-2'>
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.key}
                        to={action.to}
                        params={{ locale }}
                        data-testid={`home-action-${action.key}`}
                        className='group flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/35 hover:bg-muted/40'
                      >
                        <Icon className='size-4 shrink-0 text-muted-foreground' />
                        {t(`actions.${action.key}.title`)}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {hasAnyAction ? (
              <div className='mb-8'>
                <HomeDashboard />
              </div>
            ) : (
              emptyState
            )}

            {browseEntries.length > 0 ? (
              <section>
                <h2 className='mb-3 font-heading text-xs font-medium tracking-widest text-muted-foreground uppercase'>
                  {t('browseSection')}
                </h2>
                <div className='flex flex-wrap gap-2'>
                  {browseEntries.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <Button
                        key={entry.key}
                        variant='ghost'
                        size='sm'
                        nativeButton={false}
                        data-testid={`home-browse-${entry.key}`}
                        render={
                          <Link
                            to={entry.to}
                            params={{ locale }}
                          />
                        }
                      >
                        <Icon className='size-4' />
                        {t(`browse.${entry.key}`)}
                      </Button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          loadingState
        )}
      </div>
    </AppShell>
  );
}
