import { Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { SidebarTrigger } from '@/components/ui/sidebar.tsx';

interface SiteHeaderProps {
  currentSection: string | null;
  locale: string;
  onSearch: () => void;
}

export function SiteHeader({
  currentSection,
  locale,
  onSearch,
}: SiteHeaderProps): JSX.Element {
  const { t } = useTranslation('common');
  const section = currentSection ?? t('appName');

  return (
    <header className='flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-card/70 px-3 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4'>
      <div className='flex min-w-0 items-center gap-2'>
        <SidebarTrigger className='-ml-1 text-muted-foreground' />
        <Separator
          orientation='vertical'
          className='mr-1 data-vertical:h-4'
        />
        <PageBreadcrumbs
          items={[
            {
              key: 'home',
              label: t('appName'),
              link: (
                <Link
                  to='/$locale'
                  params={{ locale }}
                />
              ),
            },
            { key: 'section', label: section },
          ]}
          className='min-w-0'
        />
      </div>
      <div className='ml-auto flex items-center gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onSearch}
          aria-label={t('search.trigger')}
          className='text-muted-foreground'
        >
          <Search data-icon='inline-start' />
          <span className='hidden md:inline'>{t('search.trigger')}</span>
          <kbd className='pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground'>
            ⌘K
          </kbd>
        </Button>
      </div>
    </header>
  );
}
