import { Plus, Trash2 } from 'lucide-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { TooltipIconButton } from '@/components/ui/tooltip-button.tsx';
import type {
  ChoiceOption,
  ClinicalField,
  ComponentSummary,
} from '@/features/forms/types.ts';

export function ChoiceOptionsEditor({
  options,
  onChange,
}: {
  options: ChoiceOption[];
  onChange: (options: ChoiceOption[]) => void;
}): JSX.Element {
  const { t } = useTranslation('designer');
  const [rowKeys, setRowKeys] = useState(() =>
    options.map(() => crypto.randomUUID()),
  );

  useEffect(() => {
    setRowKeys((previous) => {
      if (previous.length === options.length) {
        return previous;
      }

      if (previous.length < options.length) {
        return [
          ...previous,
          ...Array.from({ length: options.length - previous.length }, () =>
            crypto.randomUUID(),
          ),
        ];
      }

      return previous.slice(0, options.length);
    });
  }, [options.length]);

  return (
    <Field>
      <FieldLabel>{t('inspector.choiceOptions')}</FieldLabel>
      <div className='grid gap-2'>
        {options.map((option, index) => (
          <div
            key={rowKeys[index]}
            className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'
          >
            <Input
              placeholder={t('inspector.optionValue')}
              value={option.value}
              onChange={(event) => {
                const next = [...options];
                next[index] = { ...option, value: event.target.value };
                onChange(next);
              }}
            />
            <Input
              placeholder={t('inspector.optionLabel')}
              value={option.label}
              onChange={(event) => {
                const next = [...options];
                next[index] = { ...option, label: event.target.value };
                onChange(next);
              }}
            />
            <TooltipIconButton
              type='button'
              variant='ghost'
              size='icon-sm'
              label={t('inspector.removeOption')}
              disabled={options.length <= 1}
              onClick={() => {
                onChange(options.filter((_, itemIndex) => itemIndex !== index));
                setRowKeys((previous) =>
                  previous.filter((_, itemIndex) => itemIndex !== index),
                );
              }}
            >
              <Trash2 />
            </TooltipIconButton>
          </div>
        ))}
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='w-fit'
          onClick={() => {
            onChange([
              ...options,
              {
                value: `option-${options.length + 1}`,
                label: `Option ${options.length + 1}`,
              },
            ]);
            setRowKeys((previous) => [...previous, crypto.randomUUID()]);
          }}
        >
          <Plus />
          {t('inspector.addOption')}
        </Button>
      </div>
    </Field>
  );
}

export function ComponentDependencyHint({
  field,
  components,
}: {
  field: ClinicalField;
  components: ComponentSummary[];
}): JSX.Element | null {
  const { t } = useTranslation('designer');
  const component = components.find(
    (item) => item.code === field.componentCode,
  );
  if (!field.componentCode) {
    return null;
  }
  if (!component) {
    return (
      <FieldDescription className='text-warning-foreground'>
        {t('inspector.blockNotFound')}
      </FieldDescription>
    );
  }
  if (!field.componentVersion) {
    return (
      <FieldDescription className='text-warning-foreground'>
        {t('inspector.pinVersion')}
      </FieldDescription>
    );
  }
  if (!component.publishedVersions.includes(field.componentVersion)) {
    return (
      <FieldDescription className='text-warning-foreground'>
        {t('inspector.versionNotPublished', {
          version: field.componentVersion,
        })}
      </FieldDescription>
    );
  }
  return (
    <FieldDescription className='text-primary'>
      {t('inspector.linkedTo', {
        name: component.name,
        version: field.componentVersion,
      })}
    </FieldDescription>
  );
}
