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
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Separator } from '@/components/ui/separator.tsx';
import type { WorkflowNodeType } from '@/features/workflows/types.ts';
import { cn } from '@/lib/utils.ts';

export type WorkflowContextMenuTarget =
  | { kind: 'pane'; x: number; y: number }
  | { kind: 'node'; nodeId: string; x: number; y: number }
  | { kind: 'edge'; edgeKey: string; x: number; y: number };

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
  onClose: () => void;
}

interface MenuItem {
  key: string;
  label: string;
  icon: typeof Plus;
  action: WorkflowContextMenuAction;
  destructive?: boolean;
}

type MenuItemOrSeparator = MenuItem | 'separator';

const MENU_WIDTH = 224;
const MENU_MAX_HEIGHT = 320;

/**
 * Floating context menu for the workflow canvas. It is rendered at the pointer
 * position (clamped to the viewport) and offers quick node/transition actions
 * depending on what was right-clicked: the empty pane, a node, or a transition.
 */
export function WorkflowCanvasContextMenu({
  target,
  nodeType,
  canAddStepAfter,
  readOnly,
  onSelect,
  onClose,
}: WorkflowCanvasContextMenuProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const items = buildMenuItems(target, nodeType, canAddStepAfter, readOnly, t);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const left =
    typeof window === 'undefined'
      ? 0
      : Math.max(8, Math.min(target.x, window.innerWidth - MENU_WIDTH - 8));
  const top =
    typeof window === 'undefined'
      ? 0
      : Math.max(
          8,
          Math.min(target.y, window.innerHeight - MENU_MAX_HEIGHT - 8),
        );

  return (
    <>
      <div
        className='fixed inset-0 z-40'
        aria-hidden='true'
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        role='menu'
        aria-label={t('canvas.contextMenu')}
        className='fixed z-50 max-h-[360px] w-56 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10'
        style={{ left, top }}
      >
        {items.map((item) =>
          item === 'separator' ? (
            <Separator
              key='separator'
              className='-mx-1 my-1'
            />
          ) : (
            <MenuButton
              key={item.key}
              item={item}
              onSelect={onSelect}
            />
          ),
        )}
      </div>
    </>
  );
}

function MenuButton({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: (action: WorkflowContextMenuAction) => void;
}): JSX.Element {
  const Icon = item.icon;
  return (
    <button
      type='button'
      role='menuitem'
      className={cn(
        "flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-foreground outline-none select-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        item.destructive &&
          'text-destructive hover:bg-destructive/10 hover:text-destructive',
      )}
      onClick={() => {
        onSelect(item.action);
      }}
    >
      <Icon />
      {item.label}
    </button>
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
