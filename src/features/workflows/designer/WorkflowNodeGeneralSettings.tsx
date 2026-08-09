import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

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

interface WorkflowNodeGeneralSettingsProps {
  node: WorkflowNode;
  readOnly: boolean;
  onChangeNode: (patch: Partial<WorkflowNode>) => void;
  onChangeNodeType: (type: WorkflowNodeType) => void;
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

/**
 * Shared node identity fields: name, description, type, and id. The name edit
 * re-ids the node through onCommitName on blur or Enter.
 */
export function WorkflowNodeGeneralSettings({
  node,
  readOnly,
  onChangeNode,
  onChangeNodeType,
  onCommitName,
}: WorkflowNodeGeneralSettingsProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const isStart = node.type === 'start';

  return (
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
            <FieldDescription>{t('inspector.changeTypeHint')}</FieldDescription>
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
  );
}
