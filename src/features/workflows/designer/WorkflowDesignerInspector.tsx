import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';

import type { WorkflowDesignerLayout } from './useWorkflowDesignerLayout.ts';
import type { InspectorMode } from './WorkflowInspector.tsx';
import { WorkflowInspector } from './WorkflowInspector.tsx';
import { WorkflowNodeTypeBadge } from './WorkflowNodeTypeBadge.tsx';

interface WorkflowDesignerInspectorProps {
  layout: WorkflowDesignerLayout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEdge: (key: string | null) => void;
  onClose: () => void;
}

export function WorkflowDesignerInspector({
  layout,
  open,
  onOpenChange,
  onSelectEdge,
  onClose,
}: WorkflowDesignerInspectorProps): JSX.Element {
  const { t } = useTranslation('workflows');

  const mode: InspectorMode = (() => {
    if (layout.selectedEdge) {
      return 'edge';
    }
    if (layout.selectedNode) {
      return 'node';
    }
    return 'workflow';
  })();

  const nodeTitle = ((): string => {
    const name = layout.selectedNode?.name?.trim();
    if (name) {
      return name;
    }
    const type = layout.selectedNode ? layout.selectedNode.type : 'task';
    return t('node.unnamed', { type: t(`node.${type}`) });
  })();
  const edgeTitle =
    layout.selectedEdge?.edge.label?.trim() || t('inspector.transitions');

  const title = ((): string => {
    if (mode === 'edge') {
      return edgeTitle;
    }
    if (mode === 'node') {
      return nodeTitle;
    }
    return t('inspector.workflowSettings');
  })();

  const subtitle = ((): string | null => {
    if (mode === 'node' && layout.selectedNode) {
      return layout.selectedNode.id;
    }
    if (mode === 'edge' && layout.selectedEdge) {
      return `${layout.selectedEdge.edge.from} → ${layout.selectedEdge.edge.to}`;
    }
    return null;
  })();

  const inspectorKey = ((): string => {
    if (mode === 'edge' && layout.selectedEdge) {
      return `edge-${layout.selectedEdge.edge.from}-${layout.selectedEdge.edge.to}`;
    }
    if (mode === 'node' && layout.selectedNode) {
      return `node-${layout.selectedNode.id}`;
    }
    return 'workflow';
  })();

  const badges = ((): JSX.Element | undefined => {
    if (mode === 'node' && layout.selectedNode) {
      return <WorkflowNodeTypeBadge type={layout.selectedNode.type} />;
    }
    if (mode === 'edge' && layout.selectedEdge) {
      return (
        <Badge
          variant='secondary'
          className='font-normal'
        >
          {layout.selectedEdge.edge.condition
            ? t('inspector.condition')
            : t('inspector.defaultBranch')}
        </Badge>
      );
    }
    return undefined;
  })();

  return (
    <WorkflowInspector
      key={inspectorKey}
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={title}
      subtitle={subtitle}
      badges={badges}
      bodyProps={{
        graph: layout.draft.graph,
        inputs: layout.draft.graph.inputs ?? [],
        readOnly: layout.draft.isReadOnly,
        selectedNode: layout.selectedNode,
        selectedEdge: layout.selectedEdge,
        onChangeNode: (patch) => {
          if (layout.selectedNode) {
            layout.handleUpdateNode(layout.selectedNode.id, patch);
          }
        },
        onChangeNodeType: (type) => {
          if (layout.selectedNode) {
            layout.handleChangeNodeType(layout.selectedNode.id, type);
          }
        },
        onCommitNodeName: (nodeId, name) => {
          layout.handleCommitNodeName(nodeId, name);
        },
        onRemoveNode: () => {
          if (layout.selectedNode) {
            layout.handleRemoveNode(layout.selectedNode.id);
            onClose();
          }
        },
        outgoing: layout.outgoing,
        incoming: layout.incoming,
        availableTargets: layout.availableTargets,
        onAddEdge: (to) => {
          if (layout.selectedNode) {
            layout.handleAddEdge(layout.selectedNode.id, to);
          }
        },
        onSelectEdge: (key) => {
          onSelectEdge(key);
        },
        onRemoveEdge: (key) => {
          layout.handleRemoveEdge(key);
          onClose();
        },
        onChangeEdgeLabel: (key, label) => {
          layout.handleUpdateEdgeLabel(key, label);
        },
        onSetEdgeCondition: (key, condition) => {
          layout.handleSetEdgeCondition(key, condition);
        },
        onAddInput: layout.handleAddInput,
        onRemoveInput: layout.handleRemoveInput,
        onUpdateInput: layout.handleUpdateInput,
      }}
    />
  );
}
