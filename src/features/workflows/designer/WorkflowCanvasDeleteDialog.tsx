import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';

/** Pending canvas deletion confirmed through the shared inspector dialog. */
export type WorkflowCanvasDeleteTarget =
  | { kind: 'node'; nodeId: string }
  | { kind: 'edge'; edgeKey: string };

interface WorkflowCanvasDeleteDialogProps {
  pendingDelete: WorkflowCanvasDeleteTarget | null;
  onCancel: () => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (edgeKey: string) => void;
}

/**
 * Destructive confirmation for deleting a canvas node or transition, opened
 * from the context menu (or the long-press menu on touch devices).
 */
export function WorkflowCanvasDeleteDialog({
  pendingDelete,
  onCancel,
  onRemoveNode,
  onRemoveEdge,
}: WorkflowCanvasDeleteDialogProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <Dialog
      open={pendingDelete !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent data-testid='workflow-delete-confirm'>
        <DialogHeader>
          <DialogTitle>
            {pendingDelete?.kind === 'node'
              ? t('canvas.deleteNodeTitle')
              : t('canvas.deleteEdgeTitle')}
          </DialogTitle>
          <DialogDescription>
            {pendingDelete?.kind === 'node'
              ? t('canvas.deleteNodeDescription')
              : t('canvas.deleteEdgeDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant='ghost'
            data-testid='workflow-delete-confirm-cancel'
            onClick={onCancel}
          >
            {t('versionHistory.close')}
          </Button>
          <Button
            variant='destructive'
            data-testid='workflow-delete-confirm-submit'
            onClick={() => {
              if (pendingDelete?.kind === 'node') {
                onRemoveNode(pendingDelete.nodeId);
              } else if (pendingDelete?.kind === 'edge') {
                onRemoveEdge(pendingDelete.edgeKey);
              }
              onCancel();
            }}
          >
            {pendingDelete?.kind === 'node'
              ? t('canvas.deleteNode')
              : t('canvas.deleteTransition')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
