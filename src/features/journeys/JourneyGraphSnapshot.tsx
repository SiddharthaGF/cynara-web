import { ArrowRight } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { PatientJourney } from '@/api/pipelines.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { nodeTypeIcon } from '@/features/workflows/designer/flow/nodeVisuals.ts';
import type { WorkflowNodeType } from '@/features/workflows/types.ts';
import { cn } from '@/lib/utils.ts';

import {
  formatJourneyDateTime,
  isTerminalJourney,
  journeyNodeLabel,
  parseHistoryMetadata,
} from './journeyForm.ts';

interface JourneyGraphSnapshotProps {
  journey: PatientJourney;
  language: string;
}

interface PathStep {
  nodeId: string;
  enteredVia?: string | null;
  at: string;
  actorId: string | null;
}

export type JourneyNodeState = 'completed' | 'current' | 'pending';

/**
 * Historical rendering of the pinned workflow graph. The graph is projected
 * from the exact published version at pipeline start; the path highlights the
 * nodes actually visited and the current cursor.
 */
export function JourneyGraphSnapshot({
  journey,
  language,
}: JourneyGraphSnapshotProps): JSX.Element {
  const { t } = useTranslation('journeys');
  const path = buildVisitedPath(journey);
  const visited = new Set(path.map((step) => step.nodeId));
  const nodeStates = new Map(
    journey.graph.nodes.map((node) => [
      node.id,
      nodeStateFor(node.id, journey, visited),
    ]),
  );

  if (journey.graph.nodes.length === 0) {
    return (
      <p className='rounded-lg border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground'>
        {t('snapshot.noGraph')}
      </p>
    );
  }

  return (
    <div className='space-y-4'>
      <div>
        <p className='text-xs font-medium text-muted-foreground'>
          {t('snapshot.description', {
            version: journey.workflowVersion || t('card.versionUnknown'),
          })}
        </p>
      </div>

      {path.length > 0 ? (
        <section>
          <p className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            {t('snapshot.path')}
          </p>
          <ol className='space-y-0'>
            {path.map((step, index) => (
              <li
                key={step.nodeId}
                className='relative flex gap-3 pb-3 last:pb-0'
              >
                {index < path.length - 1 ? (
                  <span
                    aria-hidden='true'
                    className='absolute top-6 bottom-0 left-3.5 w-px bg-border/70'
                  />
                ) : null}
                <span
                  className={cn(
                    'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border',
                    stepIsCurrent(step.nodeId, journey)
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border/70 bg-card',
                  )}
                >
                  <PathIcon
                    nodeType={journeyNodeType(journey, step.nodeId)}
                    isCurrent={stepIsCurrent(step.nodeId, journey)}
                  />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium'>
                      {journeyNodeLabel(journey, step.nodeId, t)}
                    </span>
                    <NodeStateBadge
                      state={nodeStateFor(step.nodeId, journey, visited)}
                    />
                  </div>
                  {step.enteredVia?.trim() ? (
                    <p className='text-xs text-muted-foreground'>
                      {t('timeline.via', { label: step.enteredVia.trim() })}
                    </p>
                  ) : null}
                  <p className='mt-0.5 text-xs text-muted-foreground'>
                    {formatJourneyDateTime(step.at, language)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section>
        <p className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
          {t('snapshot.nodes')}
        </p>
        <ul className='flex flex-wrap gap-1.5'>
          {journey.graph.nodes.map((node) => (
            <li key={node.id}>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs',
                  nodeStates.get(node.id) === 'current'
                    ? 'border-primary/50 bg-primary/5 font-medium'
                    : 'border-border/70 bg-card',
                )}
                data-state={nodeStates.get(node.id)}
              >
                <NodeTypeGlyph type={journeyNodeType(journey, node.id)} />
                <span>{journeyNodeLabel(journey, node.id, t)}</span>
                <NodeStateBadge state={nodeStates.get(node.id) ?? 'pending'} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {journey.graph.edges.length > 0 ? (
        <section>
          <p className='mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
            {t('snapshot.edges')}
          </p>
          <ul className='flex flex-wrap gap-1.5'>
            {journey.graph.edges.map((edge) => (
              <li
                key={`${edge.from}-${edge.to}`}
                className='inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-xs text-muted-foreground'
              >
                <span>{journeyNodeLabel(journey, edge.from, t)}</span>
                <ArrowRight className='size-3 shrink-0' />
                <span>{journeyNodeLabel(journey, edge.to, t)}</span>
                {edge.label?.trim() ? (
                  <span className='font-medium text-foreground/80'>
                    · {edge.label.trim()}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function buildVisitedPath(journey: PatientJourney): PathStep[] {
  const steps: PathStep[] = [];
  for (const event of journey.history) {
    const meta = parseHistoryMetadata(event);
    if (event.action === 'pipeline.started' && meta.currentNodeId) {
      steps.push({
        nodeId: meta.currentNodeId,
        at: event.occurredAt,
        actorId: event.actorId,
      });
    } else if (
      (event.action === 'pipeline.advanced' ||
        event.action === 'pipeline.completed') &&
      meta.toNodeId
    ) {
      steps.push({
        nodeId: meta.toNodeId,
        enteredVia: meta.edgeLabel ?? null,
        at: event.occurredAt,
        actorId: event.actorId,
      });
    }
  }
  if (
    journey.currentNodeId &&
    (steps.length === 0 || steps.at(-1)?.nodeId !== journey.currentNodeId)
  ) {
    steps.push({
      nodeId: journey.currentNodeId,
      at: journey.endedAt ?? journey.startedAt,
      actorId: null,
    });
  }
  return steps;
}

function nodeStateFor(
  nodeId: string,
  journey: PatientJourney,
  visited: ReadonlySet<string>,
): JourneyNodeState {
  const isCurrent =
    nodeId === journey.currentNodeId && !isTerminalJourney(journey.status);
  if (isCurrent) {
    return 'current';
  }
  return visited.has(nodeId) ? 'completed' : 'pending';
}

function stepIsCurrent(nodeId: string, journey: PatientJourney): boolean {
  return nodeId === journey.currentNodeId && !isTerminalJourney(journey.status);
}

function journeyNodeType(
  journey: PatientJourney,
  nodeId: string,
): WorkflowNodeType {
  const type = journey.graph.nodes.find((node) => node.id === nodeId)?.type;
  if (type === 'start' || type === 'end' || type === 'decision') {
    return type;
  }
  return 'task';
}

function PathIcon({
  nodeType,
  isCurrent,
}: {
  nodeType: WorkflowNodeType;
  isCurrent: boolean;
}): JSX.Element {
  const Icon = nodeTypeIcon(nodeType);
  return (
    <Icon
      className={cn(
        'size-3.5',
        isCurrent ? 'text-primary' : 'text-muted-foreground',
      )}
    />
  );
}

function NodeTypeGlyph({ type }: { type: WorkflowNodeType }): JSX.Element {
  const Icon = nodeTypeIcon(type);
  return <Icon className='size-3 shrink-0 text-muted-foreground' />;
}

function NodeStateBadge({ state }: { state: JourneyNodeState }): JSX.Element {
  const { t } = useTranslation('journeys');
  return (
    <Badge
      variant={stateVariant(state)}
      className='px-1.5 text-[0.6rem] font-normal'
    >
      {t(`snapshot.state_${state}`)}
    </Badge>
  );
}

function stateVariant(
  state: JourneyNodeState,
): 'default' | 'secondary' | 'outline' {
  if (state === 'current') {
    return 'default';
  }
  if (state === 'completed') {
    return 'secondary';
  }
  return 'outline';
}
