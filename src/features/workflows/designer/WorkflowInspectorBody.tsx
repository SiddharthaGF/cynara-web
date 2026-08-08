import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import type { InspectorMode } from '@/features/workflows/designer/WorkflowInspector.tsx';
import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
} from '@/features/workflows/types.ts';

import { WorkflowEdgeSettings } from './WorkflowEdgeSettings.tsx';
import { WorkflowNodeSettings } from './WorkflowNodeSettings.tsx';
import { WorkflowSettingsInspector } from './WorkflowSettingsInspector.tsx';
import { WorkflowTransitionsSection } from './WorkflowTransitionsSection.tsx';

export interface WorkflowInspectorBodyProps {
  mode: InspectorMode;
  graph: WorkflowGraph;
  inputs: string[];
  readOnly: boolean;
  selectedNode: WorkflowNode | null;
  selectedEdge: { edge: WorkflowEdge; index: number } | null;
  onChangeNode: (patch: Partial<WorkflowNode>) => void;
  onChangeNodeType: (type: WorkflowNodeType) => void;
  onRemoveNode: () => void;
  outgoing: WorkflowEdge[];
  incoming: WorkflowEdge[];
  availableTargets: WorkflowNode[];
  onAddEdge: (to: string) => void;
  onSelectEdge: (key: string) => void;
  onRemoveEdge: (key: string) => void;
  onChangeEdgeLabel: (key: string, label: string) => void;
  onSetEdgeCondition: (
    key: string,
    condition: WorkflowExpression | undefined,
  ) => void;
  onAddInput: () => void;
  onRemoveInput: (index: number) => void;
  onUpdateInput: (index: number, value: string) => void;
}

type NodeTab = 'node' | 'transitions';

export function WorkflowInspectorBody({
  mode,
  graph,
  inputs,
  readOnly,
  selectedNode,
  selectedEdge,
  onChangeNode,
  onChangeNodeType,
  onRemoveNode,
  outgoing,
  incoming,
  availableTargets,
  onAddEdge,
  onSelectEdge,
  onRemoveEdge,
  onChangeEdgeLabel,
  onSetEdgeCondition,
  onAddInput,
  onRemoveInput,
  onUpdateInput,
}: WorkflowInspectorBodyProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const [activeTab, setActiveTab] = useState<NodeTab>('node');

  if (mode === 'edge' && selectedEdge) {
    return (
      <div className='flex-1 overflow-hidden'>
        <ScrollArea className='h-full'>
          <div className='flex flex-col gap-7 px-4 py-5 sm:px-5'>
            <WorkflowEdgeSettings
              edge={selectedEdge.edge}
              graph={graph}
              inputs={inputs}
              readOnly={readOnly}
              onChangeLabel={(label) => {
                onChangeEdgeLabel(
                  `${selectedEdge.edge.from}\u0000${selectedEdge.edge.to}`,
                  label,
                );
              }}
              onSetCondition={(condition) => {
                onSetEdgeCondition(
                  `${selectedEdge.edge.from}\u0000${selectedEdge.edge.to}`,
                  condition,
                );
              }}
              onRemove={() => {
                onRemoveEdge(
                  `${selectedEdge.edge.from}\u0000${selectedEdge.edge.to}`,
                );
              }}
            />
            <p className='text-[11px] leading-relaxed text-muted-foreground/70'>
              {t('inspector.scopeNote')}
            </p>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (mode === 'node' && selectedNode) {
    return (
      <div className='flex h-full min-h-0 flex-col'>
        <div className='shrink-0 px-4 pt-3 pb-2 sm:px-5'>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              const next = String(value);
              if (next === 'node' || next === 'transitions') {
                setActiveTab(next);
              }
            }}
          >
            <TabsList
              variant='line'
              className='grid h-9 w-full grid-cols-2 rounded-none bg-transparent px-1'
              aria-label={t('inspector.tabNavLabel')}
            >
              <TabsTrigger
                value='node'
                className='px-4'
              >
                {t('inspector.tabs.node')}
              </TabsTrigger>
              <TabsTrigger
                value='transitions'
                className='px-4'
              >
                {t('inspector.tabs.transitions')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className='flex-1 overflow-hidden'>
          <ScrollArea className='h-full'>
            <div className='flex flex-col gap-7 px-4 py-5 sm:px-5'>
              {activeTab === 'node' ? (
                <WorkflowNodeSettings
                  node={selectedNode}
                  readOnly={readOnly}
                  onChangeNode={onChangeNode}
                  onChangeNodeType={onChangeNodeType}
                  onRemoveNode={onRemoveNode}
                />
              ) : (
                <WorkflowTransitionsSection
                  node={selectedNode}
                  graph={graph}
                  outgoing={outgoing}
                  incoming={incoming}
                  availableTargets={availableTargets}
                  readOnly={readOnly}
                  onAddEdge={onAddEdge}
                  onSelectEdge={onSelectEdge}
                  onRemoveEdge={onRemoveEdge}
                />
              )}
              <p className='text-[11px] leading-relaxed text-muted-foreground/70'>
                {t('inspector.scopeNote')}
              </p>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 overflow-hidden'>
      <ScrollArea className='h-full'>
        <div className='flex flex-col gap-7 px-4 py-5 sm:px-5'>
          <WorkflowSettingsInspector
            inputs={inputs}
            readOnly={readOnly}
            onAddInput={onAddInput}
            onRemoveInput={onRemoveInput}
            onUpdateInput={onUpdateInput}
          />
          <p className='text-[11px] leading-relaxed text-muted-foreground/70'>
            {t('inspector.scopeNote')}
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
