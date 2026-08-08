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
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
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
  const reduceMotion = useReducedMotion();

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
    <div className='grid gap-4 sm:grid-cols-2'>
      <Skeleton className='h-28 w-full' />
      <Skeleton className='h-28 w-full' />
      <Skeleton className='h-28 w-full' />
      <Skeleton className='h-28 w-full' />
    </div>
  );

  const emptyState = (
    <m.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : undefined}
    >
      <Empty
        className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'
        data-testid='home-empty'
      >
        <EmptyHeader>
          <EmptyTitle className='text-lg'>{t('emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('emptyDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </m.div>
  );

  const quickActionsSection =
    quickActions.length > 0 ? (
      <m.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }
        }
        className='mb-10'
      >
        <h2 className='mb-4 font-heading text-sm font-medium tracking-widest text-muted-foreground uppercase'>
          {t('startSection')}
        </h2>
        <div className='grid gap-4 sm:grid-cols-2'>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.key}
                to={action.to}
                params={{ locale }}
                data-testid={`home-action-${action.key}`}
              >
                <Card className='group h-full border-border/70 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40'>
                  <CardContent className='flex items-start gap-4 p-5'>
                    <span className='rounded-lg border border-border/60 bg-background p-2.5 text-primary'>
                      <Icon className='size-5' />
                    </span>
                    <div>
                      <h3 className='font-heading text-base font-medium'>
                        {t(`actions.${action.key}.title`)}
                      </h3>
                      <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>
                        {t(`actions.${action.key}.description`)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </m.section>
    ) : null;

  const browseSection =
    browseEntries.length > 0 ? (
      <m.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <h2 className='mb-4 font-heading text-sm font-medium tracking-widest text-muted-foreground uppercase'>
          {t('browseSection')}
        </h2>
        <div className='flex flex-wrap gap-2'>
          {browseEntries.map((entry) => {
            const Icon = entry.icon;
            return (
              <Button
                key={entry.key}
                variant='outline'
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
      </m.section>
    ) : null;

  return (
    <AppShell variant='catalog'>
      <LazyMotion features={domAnimation}>
        <div className='mx-auto max-w-5xl px-6 py-10 pb-20'>
          <m.header
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
            className='mb-10'
          >
            <p className='mb-3 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
              {t('eyebrow')}
            </p>
            <h1 className='font-display text-balance text-4xl font-semibold tracking-tight md:text-5xl'>
              {t('title')}
            </h1>
            <p className='mt-3 max-w-lg text-base leading-relaxed text-muted-foreground'>
              {t('subtitle')}
            </p>
          </m.header>

          {hasData ? (
            <>
              {quickActionsSection}
              {browseSection}
              {hasAnyAction ? null : emptyState}
            </>
          ) : (
            loadingState
          )}
        </div>
      </LazyMotion>
    </AppShell>
  );
}
