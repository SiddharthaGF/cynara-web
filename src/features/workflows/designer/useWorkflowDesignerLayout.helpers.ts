import {
  edgeIndex,
  edgeKey,
  outgoingEdges,
} from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowGraph,
  WorkflowNode,
} from '@/features/workflows/types.ts';

const OPEN_OVERLAY_SELECTOR =
  '[data-slot="select-content"][data-open], [data-slot="dropdown-menu-content"][data-open], [data-slot="popover-content"][data-open], [data-slot="dialog-content"]';

/** True when a select/popover/dialog overlay is open and owns the keys. */
function hasOpenOverlay(): boolean {
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

/** Clears the current selection unless a focused overlay is consuming keys. */
export function createEscapeKeyHandler(
  clearSelection: () => void,
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || hasOpenOverlay()) {
      return;
    }
    clearSelection();
  };
}

/** Minimal draft surface the editor shortcuts operate on. */
export interface ShortcutKeyHandlerDraft {
  readonly isReadOnly: boolean;
  readonly redo: () => void;
  readonly saveNow: () => Promise<boolean>;
  readonly undo: () => void;
}

// Ctrl/Cmd+S/Z/Y shortcuts; undo/redo act on the whole graph even in inspector
// Inputs (typing bursts coalesce into one history step), but yield to overlays.
export function createShortcutKeyHandler(
  draft: ShortcutKeyHandlerDraft,
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent): void => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || event.altKey) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      if (!draft.isReadOnly) {
        void draft.saveNow();
      }
      return;
    }
    if (hasOpenOverlay()) {
      return;
    }
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        draft.redo();
      } else {
        draft.undo();
      }
      return;
    }
    if (key === 'y' && !event.shiftKey) {
      event.preventDefault();
      draft.redo();
    }
  };
}

/** Remaps an edge key so a renamed node keeps its edges and selection. */
export function remapEdgeKey(
  key: string,
  fromId: string,
  toId: string,
): string {
  const [from, to] = key.split('\u0000');
  return edgeKey(from === fromId ? toId : from, to === fromId ? toId : to);
}

/** Nodes the given node may still connect to, excluding self and current targets. */
export function targetOptions(
  graph: WorkflowGraph,
  node: WorkflowNode,
): WorkflowNode[] {
  const existingTargets = new Set(
    outgoingEdges(graph, node.id).map((edge) => edge.to),
  );
  return graph.nodes.filter(
    (candidate) =>
      candidate.id !== node.id && !existingTargets.has(candidate.id),
  );
}

/** Index of the edge encoded in `key`, or -1 when it no longer exists. */
export function edgeIndexFromKey(graph: WorkflowGraph, key: string): number {
  const [from, to] = key.split('\u0000');
  return edgeIndex(graph, from, to);
}
