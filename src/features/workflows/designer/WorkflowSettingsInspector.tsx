import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';

interface WorkflowSettingsInspectorProps {
  inputs: string[];
  readOnly: boolean;
  onAddInput: () => void;
  onRemoveInput: (index: number) => void;
  onUpdateInput: (index: number, value: string) => void;
}

export function WorkflowSettingsInspector({
  inputs,
  readOnly,
  onAddInput,
  onRemoveInput,
  onUpdateInput,
}: WorkflowSettingsInspectorProps): JSX.Element {
  const { t } = useTranslation('workflows');

  // Rows have no ids, so stable client ids avoid remounting the input on value
  // Edits (focus loss) and stay stable when a middle row is removed.
  const [rowIds, setRowIds] = useState<number[]>(() =>
    inputs.map((_, index) => index),
  );

  function handleAddInput(): void {
    setRowIds((current) => [
      ...current,
      current.length === 0 ? 0 : Math.max(...current) + 1,
    ]);
    onAddInput();
  }

  function handleRemoveInput(index: number): void {
    setRowIds((current) => current.filter((_, i) => i !== index));
    onRemoveInput(index);
  }

  return (
    <div className='grid gap-4'>
      <div className='grid gap-1'>
        <h3 className='text-sm font-medium'>{t('inspector.settings.title')}</h3>
        <p className='text-xs leading-relaxed text-muted-foreground'>
          {t('inspector.settings.description')}
        </p>
      </div>

      <div className='grid gap-1.5'>
        <p className='text-[0.625rem] font-medium tracking-widest text-muted-foreground uppercase'>
          {t('inspector.settings.inputs')}
        </p>
        <p className='-mt-1 text-xs leading-relaxed text-muted-foreground'>
          {t('inspector.settings.inputsDescription')}
        </p>
      </div>

      {inputs.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          {t('inspector.settings.empty')}
        </p>
      ) : (
        <ul className='grid gap-2'>
          {inputs.map((input, index) => (
            <li
              key={rowIds[index]}
              className='flex items-center gap-2'
            >
              <Field className='min-w-0 flex-1'>
                <FieldLabel htmlFor={`workflow-input-${index}`}>
                  {t('inspector.settings.inputs')} {index + 1}
                </FieldLabel>
                <FieldContent>
                  <div className='flex items-center gap-1.5'>
                    <Input
                      id={`workflow-input-${index}`}
                      className='font-mono text-xs'
                      value={input}
                      disabled={readOnly}
                      placeholder={t('inspector.settings.inputPlaceholder')}
                      onChange={(event) => {
                        onUpdateInput(index, event.target.value);
                      }}
                    />
                    {readOnly ? null : (
                      <button
                        type='button'
                        className='rounded p-1 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring'
                        aria-label={t('inspector.settings.removeInput')}
                        onClick={() => {
                          handleRemoveInput(index);
                        }}
                      >
                        <X className='size-3.5' />
                      </button>
                    )}
                  </div>
                </FieldContent>
              </Field>
            </li>
          ))}
        </ul>
      )}

      {readOnly ? null : (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-fit'
          onClick={handleAddInput}
        >
          <Plus className='size-3.5' />
          {t('inspector.settings.addInput')}
        </Button>
      )}
    </div>
  );
}
