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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import type {
  WorkflowNode,
  WorkflowNodeType,
} from '@/features/workflows/types.ts';

import { nodeTypeColor, nodeTypeIcon } from './flow/nodeVisuals.ts';
import { usePublishedFormOptions } from './usePublishedFormOptions.ts';

interface WorkflowNodeSettingsProps {
  node: WorkflowNode;
  readOnly: boolean;
  onChangeNode: (patch: Partial<WorkflowNode>) => void;
  onChangeNodeType: (type: WorkflowNodeType) => void;
  onRemoveNode: () => void;
  /** Re-ids the node from its name when the name edit commits. */
  onCommitName: (name: string) => void;
}

const NODE_TYPES: readonly WorkflowNodeType[] = [
  'start',
  'task',
  'decision',
  'end',
];

function NodeTypeIconWithAccent({
  type,
}: {
  type: WorkflowNodeType;
}): JSX.Element {
  const Icon = nodeTypeIcon(type);
  return <Icon className={nodeTypeColor(type)} />;
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
  const isStart = node.type === 'start';
  const assignee = node.type === 'task' ? (node.assignee ?? {}) : {};
  const formOptionsQuery = usePublishedFormOptions();
  const formOptions = formOptionsQuery.data ?? [];
  const formCode = node.type === 'task' ? node.formCode : undefined;
  const formVersion = node.type === 'task' ? node.formVersion : undefined;
  const selectedForm = formOptions.find((option) => option.code === formCode);
  const publishedVersions = selectedForm?.publishedVersions ?? [];

  return (
    <div className='grid gap-8'>
      <section className='grid gap-4'>
        <h3 className='text-sm font-medium'>{t('inspector.general')}</h3>
        <Field>
          <FieldLabel htmlFor='workflow-node-name'>
            {t('inspector.name')}
          </FieldLabel>
          <FieldContent>
            <Input
              id='workflow-node-name'
              value={node.name ?? ''}
              disabled={readOnly}
              placeholder={t('inspector.namePlaceholder')}
              onBlur={() => {
                onCommitName(node.name ?? '');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onCommitName(node.name ?? '');
                }
              }}
              onChange={(event) => {
                const { value } = event.target;
                onChangeNode({ name: value.trim() ? value : undefined });
              }}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor='workflow-node-description'>
            {t('inspector.description')}
          </FieldLabel>
          <FieldContent>
            <Textarea
              id='workflow-node-description'
              value={node.description ?? ''}
              disabled={readOnly}
              placeholder={t('inspector.descriptionPlaceholder')}
              onChange={(event) => {
                const { value } = event.target;
                onChangeNode({ description: value.trim() ? value : undefined });
              }}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel htmlFor='workflow-node-type'>
            {t('inspector.type')}
          </FieldLabel>
          <FieldContent>
            <Select
              value={node.type}
              disabled={readOnly || isStart}
              onValueChange={(value) => {
                if (value && NODE_TYPES.includes(value)) {
                  onChangeNodeType(value);
                }
              }}
            >
              <SelectTrigger
                id='workflow-node-type'
                className='w-full'
              >
                <SelectValue>
                  <NodeTypeIconWithAccent type={node.type} />
                  {t(`node.${node.type}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {NODE_TYPES.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                  >
                    <NodeTypeIconWithAccent type={type} />
                    {t(`node.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isStart ? null : (
              <FieldDescription>
                {t('inspector.changeTypeHint')}
              </FieldDescription>
            )}
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>{t('inspector.idLabel')}</FieldLabel>
          <FieldContent>
            <code className='w-fit rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground/80'>
              {node.id}
            </code>
          </FieldContent>
        </Field>
      </section>

      {isTask ? (
        <>
          <section className='grid gap-4'>
            <h3 className='text-sm font-medium'>{t('inspector.assignment')}</h3>
            <p className='-mt-2 text-xs leading-relaxed text-muted-foreground'>
              {t('inspector.assignmentDescription')}
            </p>
            <Field>
              <FieldLabel htmlFor='workflow-node-role'>
                {t('inspector.role')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id='workflow-node-role'
                  value={assignee.role ?? ''}
                  disabled={readOnly}
                  placeholder={t('inspector.rolePlaceholder')}
                  onChange={(event) => {
                    const { value } = event.target;
                    onChangeNode({
                      assignee: {
                        ...assignee,
                        role: value.trim() ? value : undefined,
                      },
                    });
                  }}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor='workflow-node-discipline'>
                {t('inspector.discipline')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id='workflow-node-discipline'
                  value={assignee.discipline ?? ''}
                  disabled={readOnly}
                  placeholder={t('inspector.disciplinePlaceholder')}
                  onChange={(event) => {
                    const { value } = event.target;
                    onChangeNode({
                      assignee: {
                        ...assignee,
                        discipline: value.trim() ? value : undefined,
                      },
                    });
                  }}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor='workflow-node-actor'>
                {t('inspector.actor')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id='workflow-node-actor'
                  value={assignee.actor ?? ''}
                  disabled={readOnly}
                  placeholder={t('inspector.actorPlaceholder')}
                  onChange={(event) => {
                    const { value } = event.target;
                    onChangeNode({
                      assignee: {
                        ...assignee,
                        actor: value.trim() ? value : undefined,
                      },
                    });
                  }}
                />
              </FieldContent>
            </Field>
          </section>

          <section className='grid gap-4'>
            <h3 className='text-sm font-medium'>
              {t('inspector.referencedForm')}
            </h3>
            <p className='-mt-2 text-xs leading-relaxed text-muted-foreground'>
              {t('inspector.referencedFormDescription')}
            </p>
            <Field>
              <FieldLabel htmlFor='workflow-node-form-code'>
                {t('inspector.formCode')}
              </FieldLabel>
              <FieldContent>
                <Select
                  value={formCode ?? ''}
                  disabled={readOnly}
                  onValueChange={(code) => {
                    if (!code) {
                      return;
                    }
                    const form = formOptions.find(
                      (option) => option.code === code,
                    );
                    // Picking a form pins the latest published version so the
                    // Task is ready to publish without an extra selection.
                    const latestVersion =
                      form?.publishedVersions.at(-1)?.version;
                    onChangeNode({
                      formCode: code,
                      formVersion: latestVersion ?? undefined,
                    });
                  }}
                >
                  <SelectTrigger
                    id='workflow-node-form-code'
                    className='w-full'
                  >
                    <SelectValue placeholder={t('inspector.selectForm')} />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.map((option) => (
                      <SelectItem
                        key={option.code}
                        value={option.code}
                      >
                        {option.name || option.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor='workflow-node-form-version'>
                {t('inspector.formVersion')}
              </FieldLabel>
              <FieldContent>
                {publishedVersions.length > 0 ? (
                  <Select
                    value={formVersion ?? ''}
                    disabled={readOnly}
                    onValueChange={(version) => {
                      if (version) {
                        onChangeNode({ formVersion: version });
                      }
                    }}
                  >
                    <SelectTrigger
                      id='workflow-node-form-version'
                      className='w-full'
                    >
                      <SelectValue placeholder={t('inspector.selectVersion')} />
                    </SelectTrigger>
                    <SelectContent>
                      {publishedVersions.map((published) => (
                        <SelectItem
                          key={published.version}
                          value={published.version}
                        >
                          {published.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className='text-xs leading-relaxed text-muted-foreground'>
                    {t('inspector.noPublishedVersions')}
                  </p>
                )}
              </FieldContent>
            </Field>
          </section>
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
