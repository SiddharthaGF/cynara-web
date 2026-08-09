import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Field, FieldContent, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import type {
  WorkflowAssignee,
  WorkflowNode,
} from '@/features/workflows/types.ts';

interface WorkflowNodeAssignmentSettingsProps {
  assignee: WorkflowAssignee;
  readOnly: boolean;
  onChangeNode: (patch: Partial<WorkflowNode>) => void;
}

/** Who performs a task: role, discipline, and actor, at least one required. */
export function WorkflowNodeAssignmentSettings({
  assignee,
  readOnly,
  onChangeNode,
}: WorkflowNodeAssignmentSettingsProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
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
  );
}
