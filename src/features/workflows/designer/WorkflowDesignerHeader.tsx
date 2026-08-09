import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

interface WorkflowDesignerHeaderProps {
  nodeCount: number;
}

export function WorkflowDesignerHeader({
  nodeCount,
}: WorkflowDesignerHeaderProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <header className='flex shrink-0 items-end justify-between gap-4 border-b border-border/60 px-4 py-3 md:px-6'>
      <div className='grid min-w-0 gap-0.5'>
        <p className='text-[0.625rem] font-medium tracking-[0.14em] text-primary uppercase'>
          {t('header.workflowDraft')}
        </p>
        <h1 className='truncate font-heading text-xl font-medium tracking-tight'>
          {t('canvas.title')}
        </h1>
      </div>
      <span className='shrink-0 font-mono text-xs text-muted-foreground'>
        {t('canvas.nodesCount', { count: nodeCount })}
      </span>
    </header>
  );
}
