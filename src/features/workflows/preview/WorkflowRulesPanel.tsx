import { GitBranch, TriangleAlert } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { describeExpression } from '@/features/workflows/model/workflowExpression.ts';
import { edgeKey } from '@/features/workflows/model/workflowGraph.ts';
import type { WorkflowBranchEvaluation } from '@/features/workflows/simulation/simulateWorkflow.ts';
import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from '@/features/workflows/types.ts';

import { WorkflowNodeTypeBadge } from '../designer/WorkflowNodeTypeBadge.tsx';

interface WorkflowRulesPanelProps {
  graph: WorkflowGraph;
  /** Branch evaluations recorded by the latest simulation walk. */
  evaluations: ReadonlyMap<string, WorkflowBranchEvaluation>;
  hasBlockingIssues: boolean;
}

/**
 * Transition/rule inspection for the preview. Lists every decision node's
 * outgoing branches with a human-readable condition and how the latest walk
 * evaluated each one against the current test data. Branches of decisions the
 * walk never reached show as "not reached".
 */
export function WorkflowRulesPanel({
  graph,
  evaluations,
  hasBlockingIssues,
}: WorkflowRulesPanelProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const decisions = graph.nodes.filter(
    (node): node is Extract<WorkflowNode, { type: 'decision' }> =>
      node.type === 'decision',
  );
  const edgesBySource = new Map<string, WorkflowEdge[]>();
  for (const edge of graph.edges) {
    const list = edgesBySource.get(edge.from);
    if (list) {
      list.push(edge);
    } else {
      edgesBySource.set(edge.from, [edge]);
    }
  }

  if (decisions.length === 0) {
    return (
      <div className='flex flex-col items-start gap-1 rounded-lg border border-dashed border-border/70 px-3 py-4'>
        <span className='inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
          <GitBranch className='size-3.5' />
          {t('preview.noRules')}
        </span>
        <p className='text-[0.7rem] leading-relaxed text-muted-foreground/80'>
          {t('preview.noRulesHint')}
        </p>
      </div>
    );
  }

  return (
    <div className='grid gap-4'>
      {hasBlockingIssues ? (
        <div className='flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400'>
          <TriangleAlert className='mt-0.5 size-3.5 shrink-0' />
          <p>{t('preview.validationNotice')}</p>
        </div>
      ) : null}

      <div className='grid gap-4'>
        {decisions.map((decision) => (
          <section
            key={decision.id}
            className='grid gap-2'
          >
            <header className='flex items-center gap-2'>
              <WorkflowNodeTypeBadge type='decision' />
              <h3 className='min-w-0 truncate text-sm font-medium'>
                {decision.name?.trim() ??
                  t('node.unnamed', { type: t('node.decision') })}
              </h3>
            </header>
            <ul className='grid gap-1.5'>
              {(edgesBySource.get(decision.id) ?? []).map((edge) => (
                <BranchRow
                  key={edgeKey(edge.from, edge.to)}
                  edge={edge}
                  evaluation={evaluations.get(edgeKey(edge.from, edge.to))}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function BranchRow({
  edge,
  evaluation,
}: {
  edge: WorkflowEdge;
  evaluation: WorkflowBranchEvaluation | undefined;
}): JSX.Element {
  const { t } = useTranslation('workflows');
  const isDefault = edge.condition === undefined;
  const conditionText = isDefault
    ? null
    : describeExpression(edge.condition ?? { lit: null }) || null;
  const label =
    edge.label?.trim() ??
    (isDefault ? t('inspector.defaultBranch') : conditionText);

  const status = statusFor(evaluation);

  return (
    <li className='flex items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-2.5 py-2'>
      <span className='min-w-0 flex-1'>
        <p className='truncate text-[0.8rem] font-medium text-foreground'>
          {label}
        </p>
        {!isDefault && conditionText ? (
          <code className='mt-0.5 block truncate font-mono text-[0.6rem] text-muted-foreground'>
            {conditionText}
          </code>
        ) : null}
      </span>
      <Badge
        variant={status.variant}
        className='shrink-0 px-1.5 text-[0.6rem] font-normal'
      >
        {t(status.key)}
      </Badge>
    </li>
  );
}

function statusFor(evaluation: WorkflowBranchEvaluation | undefined): {
  key: 'preview.true' | 'preview.false' | 'preview.notReached';
  variant: 'default' | 'secondary' | 'outline';
} {
  if (evaluation === undefined || !evaluation.evaluated) {
    return { key: 'preview.notReached', variant: 'outline' };
  }
  if (evaluation.taken) {
    return { key: 'preview.true', variant: 'default' };
  }
  return { key: 'preview.false', variant: 'secondary' };
}
