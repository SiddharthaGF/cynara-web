import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { isIncompleteExpression } from '@/features/workflows/model/workflowExpression.ts';
import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
  WorkflowNode,
} from '@/features/workflows/types.ts';
import { cn } from '@/lib/utils.ts';

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
          <>
            <p className='-mt-1 text-xs text-muted-foreground'>
              {t('inspector.edgeNotSelected')}
            </p>
            <ul className='grid gap-2'>
              {outgoing.map((edge) => {
                const isDefault = !edge.condition && node.type === 'decision';
                const key = `${edge.from}\u0000${edge.to}`;
                const label = edge.label?.trim() || nodeName(edge.to);
                return (
                  <li
                    key={`${edge.from}-${edge.to}`}
                    className={cn(
                      'group grid cursor-pointer gap-1.5 rounded-lg border border-border/70 bg-card/40 p-2 transition-[border-color,background-color,box-shadow] outline-none',
                      'hover:border-primary/40 hover:bg-card hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                    role='button'
                    tabIndex={0}
                    aria-label={t('canvas.editTransition')}
                    title={t('inspector.edgeNotSelected')}
                    onClick={() => {
                      onSelectEdge(key);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) {
                        return;
                      }
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectEdge(key);
                      }
                    }}
                  >
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <ArrowRight className='size-3.5 shrink-0 text-muted-foreground' />
                      <span className='min-w-0 flex-1 truncate text-sm'>
                        {label}
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
                        <ConditionText expression={edge.condition} />
                      ) : null}
                      <Pencil
                        aria-hidden
                        className='size-3 shrink-0 text-muted-foreground/60 opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'
                      />
                    </div>
                    <div className='flex items-center justify-between gap-2 pl-5'>
                      <code className='truncate font-mono text-[0.625rem] text-muted-foreground/70'>
                        → {nodeName(edge.to)}
                      </code>
                      {readOnly ? null : (
                        <button
                          type='button'
                          className='rounded p-0.5 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring'
                          aria-label={t('canvas.deleteTransition')}
                          title={t('canvas.deleteTransition')}
                          onClick={(event) => {
                            event.stopPropagation();
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
          </>
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

/**
 * Compact human-readable rendering of a transition condition. Raw field codes
 * stay visible for precision, while comparison operators and literal values
 * read in plain language (e.g. `triage.severity equals "low"`).
 */
function ConditionText({
  expression,
}: {
  expression: WorkflowExpression;
}): JSX.Element {
  const { t } = useTranslation('workflows');
  return (
    <span className='hidden max-w-[10rem] truncate font-mono text-[0.625rem] text-muted-foreground sm:block'>
      {describeLocalizedExpression(expression, t)}
    </span>
  );
}

function describeLocalizedExpression(
  expression: WorkflowExpression,
  t: ReturnType<typeof useTranslation<'workflows'>>['t'],
): string {
  if ('ref' in expression && expression.ref) {
    return expression.ref;
  }
  if ('lit' in expression) {
    return `"${String(expression.lit)}"`;
  }
  if ('op' in expression && expression.op) {
    if (isIncompleteExpression(expression)) {
      return '';
    }
    const { op } = expression;
    const parts = expression.args.map((arg) =>
      describeLocalizedExpression(arg, t),
    );
    if (op === 'and' || op === 'or') {
      return parts.join(` ${op} `);
    }
    if (op === 'not') {
      return `${t('condition.not')} ${parts.join(' ')}`;
    }
    return parts.join(` ${t(`condition.operators.${op}`)} `);
  }
  return '';
}
