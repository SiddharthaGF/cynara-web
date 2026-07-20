import type { JSX } from 'react';
import type { TFunction } from 'i18next';

import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Field,
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
import { MAX_DECIMAL_PLACES } from '@/lib/number-format.ts';
import { Textarea } from '@/components/ui/textarea.tsx';
import type {
  ClinicalField,
  ComponentSummary,
} from '@/features/forms/types.ts';
import type { SyncedTanstackForm } from '@/lib/useSyncedTanstackForm.ts';

import {
  ChoiceOptionsEditor,
  ComponentDependencyHint,
} from './FieldInspectorFieldEditors.tsx';
import type { ClinicalFormValues } from './fieldInspectorFormUtils.ts';

interface ClinicalFieldSectionProps {
  field: ClinicalField;
  form: SyncedTanstackForm<ClinicalFormValues>;
  t: TFunction<'designer'>;
}

export function ClinicalDescriptionField({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element {
  return (
    <form.Field name='description'>
      {(fieldApi) => (
        <Field>
          <FieldLabel htmlFor={`${field.id}-description`}>
            {t('inspector.clinicalDescription')}
          </FieldLabel>
          <Textarea
            id={`${field.id}-description`}
            rows={2}
            name={fieldApi.name}
            value={fieldApi.state.value}
            onBlur={fieldApi.handleBlur}
            onChange={(event) => {
              fieldApi.handleChange(event.target.value);
            }}
          />
          <FieldDescription>
            {t('inspector.clinicalDescriptionHelp')}
          </FieldDescription>
        </Field>
      )}
    </form.Field>
  );
}

export function ClinicalDefaultValueFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type === 'boolean') {
    return (
      <form.Field name='defaultBoolean'>
        {(fieldApi) => (
          <Field orientation='horizontal'>
            <Checkbox
              id={`${field.id}-default`}
              checked={fieldApi.state.value}
              onCheckedChange={(checked) => {
                fieldApi.handleChange(checked);
              }}
            />
            <FieldLabel htmlFor={`${field.id}-default`}>
              {t('inspector.defaultValue')}
            </FieldLabel>
          </Field>
        )}
      </form.Field>
    );
  }

  if (field.type === 'choice') {
    return (
      <form.Subscribe selector={(state) => state.values.options}>
        {(options) => (
          <form.Field name='defaultChoice'>
            {(fieldApi) => (
              <Field>
                <FieldLabel>{t('inspector.defaultValue')}</FieldLabel>
                <Select
                  value={fieldApi.state.value}
                  onValueChange={(value) => {
                    fieldApi.handleChange(value ?? '');
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t('inspector.noDefault')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=''>{t('inspector.noDefault')}</SelectItem>
                    {options.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        )}
      </form.Subscribe>
    );
  }

  if (
    field.type === 'group' ||
    field.type === 'repeater' ||
    field.type === 'component-ref'
  ) {
    return null;
  }

  return (
    <form.Field name='defaultText'>
      {(fieldApi) => (
        <Field>
          <FieldLabel htmlFor={`${field.id}-default`}>
            {t('inspector.defaultValue')}
          </FieldLabel>
          <Input
            id={`${field.id}-default`}
            name={fieldApi.name}
            type={
              field.type === 'number' || field.type === 'integer'
                ? 'number'
                : 'text'
            }
            value={fieldApi.state.value}
            onBlur={fieldApi.handleBlur}
            onChange={(event) => {
              fieldApi.handleChange(event.target.value);
            }}
          />
        </Field>
      )}
    </form.Field>
  );
}

export function ClinicalCommonFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element {
  return (
    <>
      <form.Field name='readOnly'>
        {(fieldApi) => (
          <Field orientation='horizontal'>
            <Checkbox
              id={`${field.id}-readonly`}
              checked={fieldApi.state.value}
              onCheckedChange={(checked) => {
                fieldApi.handleChange(checked);
              }}
            />
            <FieldLabel htmlFor={`${field.id}-readonly`}>
              {t('inspector.readOnly')}
            </FieldLabel>
          </Field>
        )}
      </form.Field>

      <form.Field name='code'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-code`}>
              {t('inspector.fieldCode')}
            </FieldLabel>
            <Input
              id={`${field.id}-code`}
              name={fieldApi.name}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
            <FieldDescription>{t('inspector.fieldCodeHelp')}</FieldDescription>
          </Field>
        )}
      </form.Field>
    </>
  );
}

export function ClinicalTextConstraintFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type !== 'text' && field.type !== 'textarea') {
    return null;
  }

  return (
    <>
      <form.Field name='minLength'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-min-length`}>
              {t('inspector.minLength')}
            </FieldLabel>
            <Input
              id={`${field.id}-min-length`}
              name={fieldApi.name}
              type='number'
              min={0}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name='maxLength'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-max-length`}>
              {t('inspector.maxLength')}
            </FieldLabel>
            <Input
              id={`${field.id}-max-length`}
              name={fieldApi.name}
              type='number'
              min={1}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
          </Field>
        )}
      </form.Field>
      {field.type === 'text' ? (
        <form.Field name='pattern'>
          {(fieldApi) => (
            <Field>
              <FieldLabel htmlFor={`${field.id}-pattern`}>
                {t('inspector.pattern')}
              </FieldLabel>
              <Input
                id={`${field.id}-pattern`}
                name={fieldApi.name}
                value={fieldApi.state.value}
                placeholder='^[A-Z0-9]+$'
                onBlur={fieldApi.handleBlur}
                onChange={(event) => {
                  fieldApi.handleChange(event.target.value);
                }}
              />
              <FieldDescription>{t('inspector.patternHelp')}</FieldDescription>
            </Field>
          )}
        </form.Field>
      ) : null}
    </>
  );
}

export function ClinicalNumberConstraintFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type !== 'number' && field.type !== 'integer') {
    return null;
  }

  return (
    <>
      <form.Field name='minimum'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-minimum`}>
              {t('inspector.min')}
            </FieldLabel>
            <Input
              id={`${field.id}-minimum`}
              name={fieldApi.name}
              type='number'
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name='maximum'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-maximum`}>
              {t('inspector.max')}
            </FieldLabel>
            <Input
              id={`${field.id}-maximum`}
              name={fieldApi.name}
              type='number'
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
          </Field>
        )}
      </form.Field>
      {field.type === 'number' ? (
        <>
          <form.Field name='multipleOf'>
            {(fieldApi) => (
              <Field>
                <FieldLabel htmlFor={`${field.id}-multiple-of`}>
                  {t('inspector.multipleOf')}
                </FieldLabel>
                <Input
                  id={`${field.id}-multiple-of`}
                  name={fieldApi.name}
                  type='number'
                  min={0}
                  step='any'
                  value={fieldApi.state.value}
                  onBlur={fieldApi.handleBlur}
                  onChange={(event) => {
                    fieldApi.handleChange(event.target.value);
                  }}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name='decimalPlaces'>
            {(fieldApi) => (
              <Field>
                <FieldLabel>{t('inspector.decimalPlaces')}</FieldLabel>
                <Select
                  value={
                    fieldApi.state.value === '' ? 'auto' : fieldApi.state.value
                  }
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }
                    fieldApi.handleChange(value === 'auto' ? '' : value);
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='auto'>
                      {t('inspector.decimalPlacesAuto')}
                    </SelectItem>
                    {Array.from({ length: MAX_DECIMAL_PLACES + 1 }, (_, index) => (
                      <SelectItem
                        key={index}
                        value={String(index)}
                      >
                        {index}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t('inspector.decimalPlacesHelp')}
                </FieldDescription>
              </Field>
            )}
          </form.Field>
        </>
      ) : null}
    </>
  );
}

export function ClinicalChoiceConstraintFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type !== 'choice') {
    return null;
  }

  return (
    <>
      <form.Field name='options'>
        {(fieldApi) => (
          <ChoiceOptionsEditor
            options={fieldApi.state.value}
            onChange={fieldApi.handleChange}
          />
        )}
      </form.Field>
      <form.Field name='allowMultiple'>
        {(fieldApi) => (
          <Field orientation='horizontal'>
            <Checkbox
              id={`${field.id}-allow-multiple`}
              checked={fieldApi.state.value}
              onCheckedChange={(checked) => {
                fieldApi.handleChange(checked);
              }}
            />
            <FieldLabel htmlFor={`${field.id}-allow-multiple`}>
              {t('inspector.allowMultiple')}
            </FieldLabel>
          </Field>
        )}
      </form.Field>
    </>
  );
}

export function ClinicalRepeaterConstraintFields({
  field,
  form,
  t,
}: ClinicalFieldSectionProps): JSX.Element | null {
  if (field.type !== 'repeater') {
    return null;
  }

  return (
    <>
      <form.Field name='minItems'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-min-items`}>
              {t('inspector.minItems')}
            </FieldLabel>
            <Input
              id={`${field.id}-min-items`}
              name={fieldApi.name}
              type='number'
              min={0}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name='maxItems'>
        {(fieldApi) => (
          <Field>
            <FieldLabel htmlFor={`${field.id}-max-items`}>
              {t('inspector.maxItems')}
            </FieldLabel>
            <Input
              id={`${field.id}-max-items`}
              name={fieldApi.name}
              type='number'
              min={1}
              value={fieldApi.state.value}
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
          </Field>
        )}
      </form.Field>
    </>
  );
}

interface ClinicalComponentRefFieldsProps extends ClinicalFieldSectionProps {
  components: ComponentSummary[];
}

export function ClinicalComponentRefFields({
  field,
  form,
  components,
  t,
}: ClinicalComponentRefFieldsProps): JSX.Element | null {
  if (field.type !== 'component-ref') {
    return null;
  }

  return (
    <>
      <form.Field name='componentCode'>
        {(fieldApi) => (
          <Field>
            <FieldLabel>{t('inspector.clinicalBlock')}</FieldLabel>
            <Select
              value={fieldApi.state.value}
              onValueChange={(value) => {
                fieldApi.handleChange(value ?? '');
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder={t('inspector.selectBlock')} />
              </SelectTrigger>
              <SelectContent>
                {components.map((component) => (
                  <SelectItem
                    key={component.code}
                    value={component.code}
                  >
                    {component.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>
      <form.Field name='componentVersion'>
        {(fieldApi) => (
          <Field>
            <FieldLabel>{t('inspector.version')}</FieldLabel>
            <Select
              value={fieldApi.state.value}
              onValueChange={(value) => {
                fieldApi.handleChange(value ?? '');
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder={t('inspector.latestDraft')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>{t('inspector.latestDraft')}</SelectItem>
                {components
                  .find((item) => item.code === field.componentCode)
                  ?.publishedVersions.map((version) => (
                    <SelectItem
                      key={version}
                      value={version}
                    >
                      {version}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>
      <ComponentDependencyHint
        field={field}
        components={components}
      />
    </>
  );
}
