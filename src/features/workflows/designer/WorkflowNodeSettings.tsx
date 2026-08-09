import { Trash2 } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
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
import type {
  WorkflowNode,
  WorkflowNodeType,
} from '@/features/workflows/types.ts';

import { usePublishedFormOptions } from './usePublishedFormOptions.ts';
import { WorkflowNodeAssignmentSettings } from './WorkflowNodeAssignmentSettings.tsx';
import { WorkflowNodeFormSettings } from './WorkflowNodeFormSettings.tsx';
import { WorkflowNodeGeneralSettings } from './WorkflowNodeGeneralSettings.tsx';

interface WorkflowNodeSettingsProps {
  node: WorkflowNode;
  readOnly: boolean;
  onChangeNode: (patch: Partial<WorkflowNode>) => void;
  onChangeNodeType: (type: WorkflowNodeType) => void;
  onRemoveNode: () => void;
  /** Re-ids the node from its name when the name edit commits. */
  onCommitName: (name: string) => void;
}

export function WorkflowNodeSettings({
  node,
  readOnly,
  onChangeNode,
  onChangeNodeType,
  onRemoveNode,
  onCommitName,
}: WorkflowNodeSettingsProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isTask = node.type === 'task';
  const assignee = node.type === 'task' ? (node.assignee ?? {}) : {};
  const formOptionsQuery = usePublishedFormOptions();
  const formOptions = formOptionsQuery.data ?? [];
  const formCode = node.type === 'task' ? node.formCode : undefined;
  const formVersion = node.type === 'task' ? node.formVersion : undefined;

  return (
    <div className='grid gap-8'>
      <WorkflowNodeGeneralSettings
        node={node}
        readOnly={readOnly}
        onChangeNode={onChangeNode}
        onChangeNodeType={onChangeNodeType}
        onCommitName={onCommitName}
      />
      {isTask ? (
        <>
          <WorkflowNodeAssignmentSettings
            assignee={assignee}
            readOnly={readOnly}
            onChangeNode={onChangeNode}
          />
          <WorkflowNodeFormSettings
            formCode={formCode}
            formVersion={formVersion}
            readOnly={readOnly}
            formOptions={formOptions}
            onChangeNode={onChangeNode}
          />
        </>
      ) : null}
      {readOnly ? null : (
        <section>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            <Trash2 className='size-3.5' />
            {t('canvas.deleteNode')}
          </Button>
        </section>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('canvas.deleteNodeTitle')}</DialogTitle>
            <DialogDescription>
              {t('canvas.deleteNodeDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='ghost'
              onClick={() => {
                setConfirmOpen(false);
              }}
            >
              {t('versionHistory.close')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                setConfirmOpen(false);
                onRemoveNode();
              }}
            >
              {t('canvas.deleteNode')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
