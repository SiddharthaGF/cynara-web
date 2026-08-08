import { ArrowRight, Trash2 } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
} from '@/features/workflows/types.ts';

import { ConditionEditor } from './ConditionEditor.tsx';

interface WorkflowEdgeSettingsProps {
  edge: WorkflowEdge;
  graph: WorkflowGraph;
  inputs: string[];
  readOnly: boolean;
  onChangeLabel: (label: string) => void;
  onSetCondition: (condition: WorkflowExpression | undefined) => void;
  onRemove: () => void;
}

export function WorkflowEdgeSettings({
  edge,
  graph,
  inputs,
  readOnly,
  onChangeLabel,
  onSetCondition,
  onRemove,
}: WorkflowEdgeSettingsProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const source = graph.nodes.find((node) => node.id === edge.from);
  const target = graph.nodes.find((node) => node.id === edge.to);
  const isDecisionSource = source?.type === 'decision';
  const isDefault = !edge.condition && isDecisionSource;

  return (
    <div className='grid gap-8'>
      <section className='grid gap-4'>
        <h3 className='text-sm font-medium'>{t('inspector.transitions')}</h3>
        <div className='flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2'>
          <span className='min-w-0 flex-1 truncate text-sm text-muted-foreground'>
            {source?.name?.trim() || source?.id || edge.from}
          </span>
          <ArrowRight className='size-3.5 shrink-0 text-muted-foreground/60' />
          <span className='min-w-0 flex-1 truncate text-sm'>
            {target?.name?.trim() || target?.id || edge.to}
          </span>
        </div>

        <Field>
          <FieldLabel htmlFor='workflow-edge-label'>
            {t('inspector.label')}
          </FieldLabel>
          <FieldContent>
            <Input
              id='workflow-edge-label'
              value={edge.label ?? ''}
              disabled={readOnly}
              placeholder={t('inspector.labelPlaceholder')}
              onChange={(event) => {
                onChangeLabel(event.target.value);
              }}
            />
          </FieldContent>
        </Field>
      </section>

      <section className='grid gap-4'>
        <div className='grid gap-1'>
          <h3 className='text-sm font-medium'>{t('inspector.condition')}</h3>
          {isDefault ? (
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {t('inspector.defaultBranchHint')}
            </p>
          ) : (
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {t('inspector.conditionDescription')}
            </p>
          )}
        </div>

        {isDecisionSource ? (
          <ConditionEditor
            value={edge.condition}
            inputs={inputs}
            readOnly={readOnly}
            onChange={onSetCondition}
          />
        ) : (
          <div className='grid gap-2'>
            {edge.condition ? (
              <>
                <p className='text-xs leading-relaxed text-destructive'>
                  {t('issues.NON_DECISION_CONDITION')}
                </p>
                {readOnly ? null : (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='w-fit'
                    onClick={() => {
                      onSetCondition(undefined);
                    }}
                  >
                    {t('inspector.removeCondition')}
                  </Button>
                )}
              </>
            ) : (
              <Badge
                variant='outline'
                className='w-fit font-normal text-muted-foreground'
              >
                {t('inspector.defaultBranch')}
              </Badge>
            )}
          </div>
        )}
      </section>

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
            {t('canvas.deleteEdgeTitle')}
          </Button>
        </section>
      )}

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('canvas.deleteEdgeTitle')}</DialogTitle>
            <DialogDescription>
              {t('canvas.deleteEdgeDescription')}
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
                onRemove();
              }}
            >
              {t('canvas.deleteEdgeTitle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
