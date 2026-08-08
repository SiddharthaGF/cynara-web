import { Plus, X } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  createComparison,
  createGroup,
  editableToExpression,
  expressionToEditable,
  isComparisonComplete,
  type EditableCondition,
  type EditableGroup,
} from '@/features/workflows/model/conditionModel.ts';
import { isComparisonOperator } from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowComparisonOp,
  WorkflowExpression,
} from '@/features/workflows/types.ts';
import { cn } from '@/lib/utils.ts';

const COMPARISON_OPS: readonly WorkflowComparisonOp[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
];

interface ConditionEditorProps {
  value: WorkflowExpression | undefined;
  inputs: string[];
  readOnly?: boolean;
  onChange: (expression: WorkflowExpression | undefined) => void;
}

export function ConditionEditor({
  value,
  inputs,
  readOnly = false,
  onChange,
}: ConditionEditorProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const [draft, setDraft] = useState<EditableCondition>(() =>
    value ? expressionToEditable(value) : createGroup('and'),
  );

  function commit(next: EditableCondition): void {
    setDraft(next);
    if (isConditionComplete(next)) {
      const expression = editableToExpression(next);
      onChange(expression);
    }
  }

  return (
    <div className='grid gap-2'>
      <ConditionNode
        condition={draft}
        inputs={inputs}
        readOnly={readOnly}
        onChange={commit}
      />
      {readOnly ? null : (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-full'
          onClick={() => {
            if (draft.kind === 'group') {
              commit({
                kind: 'group',
                combinator: draft.combinator,
                items: [...draft.items, createComparison()],
              });
            } else {
              commit({
                kind: 'group',
                combinator: 'and',
                items: [draft, createComparison()],
              });
            }
          }}
        >
          <Plus className='size-3.5' />
          {t('condition.addCondition')}
        </Button>
      )}
    </div>
  );
}

function isConditionComplete(condition: EditableCondition): boolean {
  switch (condition.kind) {
    case 'comparison': {
      return isComparisonComplete(condition);
    }
    case 'group': {
      return (
        condition.items.length > 0 && condition.items.every(isConditionComplete)
      );
    }
    case 'not': {
      return isConditionComplete(condition.item);
    }
    default: {
      return false;
    }
  }
}

interface ConditionNodeProps {
  condition: EditableCondition;
  inputs: string[];
  readOnly: boolean;
  onChange: (next: EditableCondition) => void;
}

function ConditionNode({
  condition,
  inputs,
  readOnly,
  onChange,
}: ConditionNodeProps): JSX.Element {
  const { t } = useTranslation('workflows');

  if (condition.kind === 'comparison') {
    return (
      <ComparisonRow
        refValue={condition.ref}
        op={condition.op}
        value={condition.value}
        inputs={inputs}
        readOnly={readOnly}
        onChange={(patch) => {
          onChange({ ...condition, ...patch });
        }}
      />
    );
  }

  if (condition.kind === 'not') {
    return (
      <div className='grid gap-1.5 rounded-lg border border-border/70 bg-muted/20 p-2'>
        <div className='flex items-center justify-between gap-2'>
          <span className='text-[0.625rem] font-medium tracking-widest text-muted-foreground uppercase'>
            {t('condition.not')}
          </span>
          {readOnly ? null : (
            <button
              type='button'
              className='rounded p-0.5 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
              aria-label={t('condition.remove')}
              onClick={() => {
                onChange(createGroup('and'));
              }}
            >
              <X className='size-3.5' />
            </button>
          )}
        </div>
        <ConditionNode
          condition={condition.item}
          inputs={inputs}
          readOnly={readOnly}
          onChange={(next) => {
            onChange({ kind: 'not', item: next });
          }}
        />
      </div>
    );
  }

  return (
    <GroupEditor
      group={condition}
      inputs={inputs}
      readOnly={readOnly}
      onChange={onChange}
    />
  );
}

function GroupEditor({
  group,
  inputs,
  readOnly,
  onChange,
}: {
  group: EditableGroup;
  inputs: string[];
  readOnly: boolean;
  onChange: (next: EditableGroup) => void;
}): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <div className='grid gap-2 rounded-lg border border-border/70 bg-card/40 p-2'>
      <div className='flex items-center justify-between gap-2'>
        <div
          className='inline-flex overflow-hidden rounded-md border border-border/70 text-[0.625rem] font-medium'
          role='group'
          aria-label={t('condition.allOf')}
        >
          {(['and', 'or'] as const).map((combinator) => (
            <button
              key={combinator}
              type='button'
              disabled={readOnly}
              className={cn(
                'px-2 py-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none',
                group.combinator === combinator
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted',
              )}
              onClick={() => {
                onChange({ ...group, combinator });
              }}
            >
              {t(combinator === 'and' ? 'condition.allOf' : 'condition.anyOf')}
            </button>
          ))}
        </div>
        {readOnly ? null : (
          <button
            type='button'
            className='rounded p-0.5 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
            aria-label={t('condition.remove')}
            onClick={() => {
              onChange({
                kind: 'group',
                combinator: 'and',
                items: [createComparison()],
              });
            }}
          >
            <X className='size-3.5' />
          </button>
        )}
      </div>
      <div className='grid gap-2'>
        {group.items.map((item, index) => (
          <div
            key={index}
            className='grid gap-2'
          >
            <ConditionNode
              condition={item}
              inputs={inputs}
              readOnly={readOnly}
              onChange={(next) => {
                const items = [...group.items];
                items[index] = next;
                onChange({ ...group, items });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ComparisonRowProps {
  refValue: string;
  op: WorkflowComparisonOp;
  value: string;
  inputs: string[];
  readOnly: boolean;
  onChange: (patch: {
    ref?: string;
    op?: WorkflowComparisonOp;
    value?: string;
  }) => void;
}

function ComparisonRow({
  refValue,
  op,
  value,
  inputs,
  readOnly,
  onChange,
}: ComparisonRowProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <div className='grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5'>
      <Select
        value={refValue || null}
        disabled={readOnly}
        onValueChange={(nextValue) => {
          onChange({ ref: nextValue ?? '' });
        }}
      >
        <SelectTrigger
          size='sm'
          className='w-full'
          aria-label={t('condition.field')}
        >
          <SelectValue placeholder={t('condition.selectInput')} />
        </SelectTrigger>
        <SelectContent>
          {inputs.map((input) => (
            <SelectItem
              key={input}
              value={input}
            >
              {input}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={op}
        disabled={readOnly}
        onValueChange={(nextValue) => {
          if (nextValue && isComparisonOperator(nextValue)) {
            onChange({ op: nextValue });
          }
        }}
      >
        <SelectTrigger
          size='sm'
          className='w-full'
          aria-label={t('condition.operator')}
        >
          <SelectValue>{t(`condition.operators.${op}`)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COMPARISON_OPS.map((operator) => (
            <SelectItem
              key={operator}
              value={operator}
            >
              {t(`condition.operators.${operator}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className='min-w-0'
        value={value}
        disabled={readOnly}
        aria-label={t('condition.value')}
        placeholder={t('condition.valuePlaceholder')}
        onChange={(event) => {
          onChange({ value: event.target.value });
        }}
      />

      {readOnly ? null : (
        <button
          type='button'
          className='rounded p-1 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
          aria-label={t('condition.remove')}
          onClick={() => {
            onChange({ ref: '', op: 'eq', value: '' });
          }}
        >
          <X className='size-3.5' />
        </button>
      )}
    </div>
  );
}
