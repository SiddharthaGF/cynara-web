import { Link, useParams } from '@tanstack/react-router';
import {
  Building2,
  ChevronRight,
  ClipboardList,
  Hospital,
  Layers,
  ListTree,
} from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { PageHeader } from '@/components/page-header.tsx';
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
}

const HUB_SECTIONS: readonly HubSection[] = [
  {
    to: '/$locale/admin/workspace',
    icon: Hospital,
    titleKey: 'hub.sections.workspace.title',
    descriptionKey: 'hub.sections.workspace.description',
  },
  {
    to: '/$locale/admin/facilities',
    icon: Building2,
    titleKey: 'hub.sections.facilities.title',
    descriptionKey: 'hub.sections.facilities.description',
  },
  {
    to: '/$locale/admin/clinical-areas',
    icon: Layers,
    titleKey: 'hub.sections.clinicalAreas.title',
    descriptionKey: 'hub.sections.clinicalAreas.description',
  },
  {
    to: '/$locale/admin/disciplines',
    icon: ListTree,
    titleKey: 'hub.sections.disciplines.title',
    descriptionKey: 'hub.sections.disciplines.description',
  },
  {
    to: '/$locale/admin/documents',
    icon: ClipboardList,
    titleKey: 'hub.sections.documents.title',
    descriptionKey: 'hub.sections.documents.description',
  },
];

export function AdminHubPage(): JSX.Element {
  const { t } = useTranslation(['hospital', 'common']);
  const { locale } = useParams({ from: '/$locale' });
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
      <div className='mx-auto max-w-3xl px-6 py-6 pb-12'>
        <PageBreadcrumbs
          className='mb-4'
          items={[
            {
              label: t('common:nav.home'),
              link: (
                <Link
                  to='/$locale'
                  params={{ locale }}
                />
              ),
            },
            { label: t('hub.title') },
          ]}
        />
        <PageHeader
          className='mb-6'
          title={t('hub.title')}
          subtitle={t('hub.subtitle')}
        />

        <ul className='divide-y divide-border rounded-lg border border-border/60 bg-card/60'>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.to}>
                <Link
                  to={section.to}
                  params={{ locale }}
                  className='group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring'
                >
                  <Icon className='size-4 shrink-0 text-muted-foreground' />
                  <span className='min-w-0 flex-1'>
                    <span className='block font-medium'>
                      {t(section.titleKey)}
                    </span>
                    <span className='block text-sm text-muted-foreground'>
                      {t(section.descriptionKey)}
                    </span>
                  </span>
                  <ChevronRight className='size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5' />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
