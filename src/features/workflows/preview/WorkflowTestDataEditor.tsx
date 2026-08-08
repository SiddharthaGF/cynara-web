import { Braces } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Field, FieldContent, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import type { SimulationValue } from '@/features/workflows/simulation/evaluateWorkflowExpression.ts';
import type { SimulationInputType } from '@/features/workflows/simulation/inferInputType.ts';
import type { WorkflowGraph } from '@/features/workflows/types.ts';

const INPUT_TYPES: readonly SimulationInputType[] = [
  'text',
  'number',
  'boolean',
];

interface WorkflowTestDataEditorProps {
  graph: WorkflowGraph;
  values: Readonly<Record<string, SimulationValue>>;
  inputTypes: Readonly<Record<string, SimulationInputType>>;
  onSetValue: (code: string, value: SimulationValue) => void;
  onSetInputType: (code: string, type: SimulationInputType) => void;
}

/**
 * Session-only editor for the workflow's declared data inputs. Each row lets
 * the reviewer pick the control type (inferred from the conditions by
 * default) and enter a value the simulation evaluates transitions against.
 */
export function WorkflowTestDataEditor({
  graph,
  values,
  inputTypes,
  onSetValue,
  onSetInputType,
}: WorkflowTestDataEditorProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const inputs = graph.inputs ?? [];

  if (inputs.length === 0) {
    return (
      <div className='flex flex-col items-start gap-1 rounded-lg border border-dashed border-border/70 px-3 py-4 text-left'>
        <span className='inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
          <Braces className='size-3.5' />
          {t('preview.noInputs')}
        </span>
        <p className='text-[0.7rem] leading-relaxed text-muted-foreground/80'>
          {t('preview.noInputsHint')}
        </p>
      </div>
    );
  }

  return (
    <div className='grid gap-2'>
      {inputs.map((code) => {
        const type = inputTypes[code] ?? 'text';
        return (
          <Field
            key={code}
            className='grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-2'
          >
            <FieldLabel
              htmlFor={`workflow-preview-input-${code}`}
              className='min-w-0 truncate font-mono text-xs font-medium text-foreground/90'
              title={code}
            >
              {code}
            </FieldLabel>
            <FieldContent className='min-w-0'>
              <div className='flex min-w-0 items-center gap-1.5'>
                <Select
                  value={type}
                  onValueChange={(value) => {
                    const next = INPUT_TYPES.find(
                      (candidate) => candidate === value,
                    );
                    if (next && next !== type) {
                      onSetInputType(code, next);
                      onSetValue(code, null);
                    }
                  }}
                >
                  <SelectTrigger
                    size='sm'
                    aria-label={t('preview.typeLabel', { code })}
                    className='w-fit'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INPUT_TYPES.map((candidate) => (
                      <SelectItem
                        key={candidate}
                        value={candidate}
                      >
                        {t(`preview.type.${candidate}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {type === 'boolean' ? (
                  <Switch
                    checked={values[code] === true}
                    aria-label={t('preview.valueLabel', { code })}
                    onCheckedChange={(checked) => {
                      onSetValue(code, checked);
                    }}
                  />
                ) : (
                  <Input
                    id={`workflow-preview-input-${code}`}
                    type={type === 'number' ? 'number' : 'text'}
                    inputMode={type === 'number' ? 'decimal' : undefined}
                    value={stringValue(values[code])}
                    placeholder={
                      type === 'number' ? '0' : t('preview.valuePlaceholder')
                    }
                    aria-label={t('preview.valueLabel', { code })}
                    className='h-7 text-sm'
                    onChange={(event) => {
                      onSetValue(code, parseValue(type, event.target.value));
                    }}
                  />
                )}
              </div>
            </FieldContent>
          </Field>
        );
      })}
    </div>
  );
}

function stringValue(value: SimulationValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function parseValue(type: SimulationInputType, raw: string): SimulationValue {
  if (raw === '') {
    return null;
  }
  if (type === 'number') {
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return raw;
}
