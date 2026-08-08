import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowUpRight,
  Building2,
  ClipboardList,
  Hospital,
  Layers,
  ListTree,
} from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface HubSection {
  to:
    | '/$locale/admin/workspace'
    | '/$locale/admin/facilities'
    | '/$locale/admin/clinical-areas'
    | '/$locale/admin/disciplines'
    | '/$locale/admin/documents';
  icon: typeof Hospital;
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
}

const HUB_SECTIONS: readonly HubSection[] = [
  {
    to: '/$locale/admin/workspace',
    icon: Hospital,
    titleKey: 'hub.sections.workspace.title',
    descriptionKey: 'hub.sections.workspace.description',
    actionKey: 'hub.sections.workspace.action',
  },
  {
    to: '/$locale/admin/facilities',
    icon: Building2,
    titleKey: 'hub.sections.facilities.title',
    descriptionKey: 'hub.sections.facilities.description',
    actionKey: 'hub.sections.facilities.action',
  },
  {
    to: '/$locale/admin/clinical-areas',
    icon: Layers,
    titleKey: 'hub.sections.clinicalAreas.title',
    descriptionKey: 'hub.sections.clinicalAreas.description',
    actionKey: 'hub.sections.clinicalAreas.action',
  },
  {
    to: '/$locale/admin/disciplines',
    icon: ListTree,
    titleKey: 'hub.sections.disciplines.title',
    descriptionKey: 'hub.sections.disciplines.description',
    actionKey: 'hub.sections.disciplines.action',
  },
  {
    to: '/$locale/admin/documents',
    icon: ClipboardList,
    titleKey: 'hub.sections.documents.title',
    descriptionKey: 'hub.sections.documents.description',
    actionKey: 'hub.sections.documents.action',
  },
];

export function AdminHubPage(): JSX.Element {
  const { t } = useTranslation('hospital');
  const { locale } = useParams({ from: '/$locale' });
  const reduceMotion = useReducedMotion();
  const { can } = useCapabilities();

  const canReadWorkspace = can('read', 'Workspace');
  const canReadCatalog = can('read', 'Catalog');

  const sections = HUB_SECTIONS.filter((section) =>
    section.to === '/$locale/admin/workspace'
      ? canReadWorkspace
      : canReadCatalog,
  );

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
            <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
              <Hospital className='size-3' />
              {t('hub.eyebrow')}
            </p>
            <h1 className='font-display text-balance text-4xl font-semibold tracking-tight md:text-5xl'>
              {t('hub.title')}
              {t('hub.titleAccent') ? (
                <span className='text-primary'>{t('hub.titleAccent')}</span>
              ) : null}
            </h1>
            <p className='mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground'>
              {t('hub.subtitle')}
            </p>
          </m.header>

          <m.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
            }
            className='grid gap-4 sm:grid-cols-2'
          >
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.to}
                  to={section.to}
                  params={{ locale }}
                  className='group rounded-2xl border border-border/70 bg-card/60 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
                >
                  <Card className='h-full border-0 bg-transparent shadow-none'>
                    <CardHeader>
                      <div className='mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground'>
                        <Icon className='size-5' />
                      </div>
                      <CardTitle className='font-heading text-lg'>
                        {t(section.titleKey)}
                      </CardTitle>
                      <CardDescription>
                        {t(section.descriptionKey)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant='ghost'
                        size='sm'
                        nativeButton={false}
                        className='px-0 text-primary'
                        render={
                          <span className='inline-flex items-center gap-1.5'>
                            {t(section.actionKey)}
                            <ArrowUpRight className='size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
                          </span>
                        }
                      />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </m.div>
        </div>
      </LazyMotion>
    </AppShell>
  );
}
