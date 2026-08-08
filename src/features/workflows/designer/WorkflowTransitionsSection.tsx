import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { describeExpression } from '@/features/workflows/model/workflowExpression.ts';
import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from '@/features/workflows/types.ts';

interface WorkflowTransitionsSectionProps {
  node: WorkflowNode;
  graph: WorkflowGraph;
  outgoing: WorkflowEdge[];
  incoming: WorkflowEdge[];
  availableTargets: WorkflowNode[];
  readOnly: boolean;
  onAddEdge: (to: string) => void;
  onSelectEdge: (key: string) => void;
  onRemoveEdge: (key: string) => void;
}

export function WorkflowTransitionsSection({
  node,
  graph,
  outgoing,
  incoming,
  availableTargets,
  readOnly,
  onAddEdge,
  onSelectEdge,
  onRemoveEdge,
}: WorkflowTransitionsSectionProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const nodeName = (id: string): string => {
    const target = graph.nodes.find((item) => item.id === id);
    return target?.name?.trim() || target?.id || id;
  };
  // Start and task nodes allow a single outgoing transition; only decisions branch repeatedly.
  const canAddTransition = node.type === 'decision' || outgoing.length === 0;

  return (
    <div className='grid gap-8'>
      <section className='grid gap-3'>
        <h3 className='text-sm font-medium'>{t('inspector.outgoing')}</h3>
        {outgoing.length === 0 ? (
          <p className='text-xs text-muted-foreground'>
            {t('inspector.noOutgoing')}
          </p>
        ) : (
          <ul className='grid gap-2'>
            {outgoing.map((edge) => {
              const isDefault = !edge.condition && node.type === 'decision';
              const key = `${edge.from}\u0000${edge.to}`;
              return (
                <li
                  key={`${edge.from}-${edge.to}`}
                  className='grid gap-1.5 rounded-lg border border-border/70 bg-card/40 p-2'
                >
                  <button
                    type='button'
                    className='flex min-w-0 items-center gap-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    onClick={() => {
                      onSelectEdge(key);
                    }}
                  >
                    <ArrowRight className='size-3.5 shrink-0 text-muted-foreground' />
                    <span className='min-w-0 flex-1 truncate text-sm'>
                      {edge.label?.trim() || nodeName(edge.to)}
                    </span>
                    {isDefault ? (
                      <Badge
                        variant='secondary'
                        className='font-normal'
                      >
                        {t('inspector.defaultBranch')}
                      </Badge>
                    ) : null}
                    {edge.condition ? (
                      <span className='hidden max-w-[10rem] truncate font-mono text-[0.625rem] text-muted-foreground sm:block'>
                        {describeExpression(edge.condition)}
                      </span>
                    ) : null}
                  </button>
                  <div className='flex items-center justify-between gap-2 pl-5'>
                    <code className='truncate font-mono text-[0.625rem] text-muted-foreground/70'>
                      → {nodeName(edge.to)}
                    </code>
                    {readOnly ? null : (
                      <button
                        type='button'
                        className='rounded p-0.5 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring'
                        aria-label={t('edge.delete')}
                        onClick={() => {
                          onRemoveEdge(key);
                        }}
                      >
                        <Trash2 className='size-3.5' />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {readOnly || node.type === 'end' || !canAddTransition ? null : (
          <div className='grid gap-1.5'>
            <Select
              value=''
              disabled={readOnly}
              onValueChange={(value) => {
                if (value) {
                  onAddEdge(value);
                }
              }}
            >
              <SelectTrigger
                aria-label={t('inspector.target')}
                className='w-full'
              >
                <SelectValue placeholder={t('inspector.targetPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.length === 0 ? (
                  <SelectItem
                    value='__none'
                    disabled
                  >
                    {t('inspector.noTargets')}
                  </SelectItem>
                ) : (
                  availableTargets.map((target) => (
                    <SelectItem
                      key={target.id}
                      value={target.id}
                    >
                      {target.name?.trim() || target.id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <span className='flex items-center gap-1 pl-0.5 text-xs text-muted-foreground'>
              <Plus className='size-3' />
              {t('inspector.addTransition')}
            </span>
          </div>
        )}
      </section>

      {incoming.length > 0 ? (
        <section className='grid gap-3'>
          <h3 className='text-sm font-medium'>{t('inspector.incoming')}</h3>
          <ul className='grid gap-2'>
            {incoming.map((edge) => (
              <li
                key={`${edge.from}-${edge.to}`}
                className='flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5'
              >
                <span className='min-w-0 flex-1 truncate text-sm text-muted-foreground'>
                  {nodeName(edge.from)}
                </span>
                <ArrowRight className='size-3 shrink-0 text-muted-foreground/60' />
                <code className='font-mono text-[0.625rem] text-muted-foreground'>
                  {node.id}
                </code>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className='text-xs text-muted-foreground'>
          {t('inspector.noIncoming')}
        </p>
      )}
    </div>
  );
}
