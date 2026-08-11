import type { TFunction } from 'i18next';
import {
  Copy,
  GitBranch,
  LayoutGrid,
  ListPlus,
  Maximize2,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu.tsx';
import type { WorkflowNodeType } from '@/features/workflows/types.ts';

import type { WorkflowContextMenuTarget } from './contextMenuTarget.ts';

export type WorkflowContextMenuAction =
  | { type: 'add-task' }
  | { type: 'add-decision' }
  | { type: 'add-step-after'; nodeId: string }
  | { type: 'add-branch'; nodeId: string }
  | { type: 'insert-step'; edgeKey: string }
  | { type: 'duplicate-node'; nodeId: string }
  | { type: 'edit-node'; nodeId: string }
  | { type: 'delete-node'; nodeId: string }
  | { type: 'edit-edge'; edgeKey: string }
  | { type: 'delete-edge'; edgeKey: string }
  | { type: 'auto-layout' }
  | { type: 'fit-view' };

interface WorkflowCanvasContextMenuProps {
  target: WorkflowContextMenuTarget;
  nodeType: WorkflowNodeType | null;
  /** True when the node can still accept another outgoing transition. */
  canAddStepAfter: boolean;
  readOnly: boolean;
  onSelect: (action: WorkflowContextMenuAction) => void;
}

interface MenuItem {
  key: string;
  label: string;
  icon: typeof Plus;
  action: WorkflowContextMenuAction;
  destructive?: boolean;
}

type MenuItemOrSeparator = MenuItem | 'separator';

/**
 * Items of the workflow canvas context menu. The menu itself is a shadcn
 * `ContextMenu` wrapping the canvas in `WorkflowCanvas`, so this component only
 * renders the popup content for whatever was right-clicked (or long-pressed):
 * the empty pane, a node, or a transition.
 */
export function WorkflowCanvasContextMenu({
  target,
  nodeType,
  canAddStepAfter,
  readOnly,
  onSelect,
}: WorkflowCanvasContextMenuProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const items = buildMenuItems(target, nodeType, canAddStepAfter, readOnly, t);

  return (
    <ContextMenuContent
      aria-label={t('canvas.contextMenu')}
      className='w-56'
    >
      {items.map((item) =>
        item === 'separator' ? (
          <ContextMenuSeparator key='separator' />
        ) : (
          <ContextMenuItem
            key={item.key}
            variant={item.destructive ? 'destructive' : 'default'}
            onClick={() => {
              onSelect(item.action);
            }}
          >
            <item.icon />
            {item.label}
          </ContextMenuItem>
        ),
      )}
    </ContextMenuContent>
  );
}

function buildMenuItems(
  target: WorkflowContextMenuTarget,
  nodeType: WorkflowNodeType | null,
  canAddStepAfter: boolean,
  readOnly: boolean,
  t: TFunction,
): MenuItemOrSeparator[] {
  const items: MenuItemOrSeparator[] = [];
  if (target.kind === 'pane') {
    if (!readOnly) {
      items.push(
        {
          key: 'add-task',
          label: t('canvas.addTask'),
          icon: Plus,
          action: { type: 'add-task' },
        },
        {
          key: 'add-decision',
          label: t('canvas.addDecision'),
          icon: GitBranch,
          action: { type: 'add-decision' },
        },
        'separator',
      );
    }
    items.push(
      {
        key: 'auto-layout',
        label: t('canvas.autoLayout'),
        icon: LayoutGrid,
        action: { type: 'auto-layout' },
      },
      {
        key: 'fit-view',
        label: t('canvas.fitView'),
        icon: Maximize2,
        action: { type: 'fit-view' },
      },
    );
    return items;
  }
  if (target.kind === 'node') {
    if (!readOnly && nodeType && nodeType !== 'end') {
      if (nodeType === 'decision') {
        items.push({
          key: 'add-branch',
          label: t('canvas.addBranch'),
          icon: GitBranch,
          action: { type: 'add-branch', nodeId: target.nodeId },
        });
      } else if (canAddStepAfter) {
        items.push({
          key: 'add-step-after',
          label: t('canvas.addStep'),
          icon: Plus,
          action: { type: 'add-step-after', nodeId: target.nodeId },
        });
      }
    }
    items.push({
      key: 'edit-node',
      label: t('canvas.nodeSettings'),
      icon: Settings2,
      action: { type: 'edit-node', nodeId: target.nodeId },
    });
    if (!readOnly) {
      items.push(
        {
          key: 'duplicate-node',
          label: t('canvas.duplicate'),
          icon: Copy,
          action: { type: 'duplicate-node', nodeId: target.nodeId },
        },
        'separator',
        {
          key: 'delete-node',
          label: t('canvas.deleteNode'),
          icon: Trash2,
          destructive: true,
          action: { type: 'delete-node', nodeId: target.nodeId },
        },
      );
    }
    return items;
  }
  if (!readOnly) {
    items.push({
      key: 'insert-step',
      label: t('canvas.insertStepHere'),
      icon: ListPlus,
      action: { type: 'insert-step', edgeKey: target.edgeKey },
    });
  }
  items.push({
    key: 'edit-edge',
    label: t('canvas.editTransition'),
    icon: Settings2,
    action: { type: 'edit-edge', edgeKey: target.edgeKey },
  });
  if (!readOnly) {
    items.push('separator', {
      key: 'delete-edge',
      label: t('canvas.deleteTransition'),
      icon: Trash2,
      destructive: true,
      action: { type: 'delete-edge', edgeKey: target.edgeKey },
    });
  }
  return items;
}
