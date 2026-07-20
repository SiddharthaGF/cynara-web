import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field.tsx';
import { findFieldById } from '@/features/forms/model/formDraft.ts';
import type { ClinicalField, FormDraftModel, LayoutNode } from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { FormFieldControl } from './FormFieldControl.tsx';
import { getRepeaterRows } from './formValues.ts';
import { widthClass } from './layoutUtils.ts';
import type { FormRendererContext } from './types.ts';

interface FormLayoutRendererProps {
  model: FormDraftModel;
  layout: LayoutNode[];
  context: FormRendererContext;
  repeaterPath?: {
    repeaterCode: string;
    rowIndex: number;
  };
}

export function FormLayoutRenderer({
  model,
  layout,
  context,
  repeaterPath,
}: FormLayoutRendererProps): JSX.Element {
  return (
    <div className='grid grid-cols-12 gap-4'>
      {layout.map((node) => (
        <LayoutNodeRenderer
          key={layoutNodeKey(node)}
          node={node}
          model={model}
          context={context}
          repeaterPath={repeaterPath}
        />
      ))}
    </div>
  );
}

function LayoutNodeRenderer({
  node,
  model,
  context,
  repeaterPath,
}: {
  node: LayoutNode;
  model: FormDraftModel;
  context: FormRendererContext;
  repeaterPath?: {
    repeaterCode: string;
    rowIndex: number;
  };
}): JSX.Element | null {
  if (node.type === 'section') {
    return (
      <section className='col-span-full grid gap-4'>
        <h3 className='font-heading text-base font-medium'>{node.title}</h3>
        <FormLayoutRenderer
          model={model}
          layout={node.children}
          context={context}
          repeaterPath={repeaterPath}
        />
      </section>
    );
  }

  if (node.type === 'field') {
    const field = findFieldById(model.clinical.fields, node.fieldId);
    if (!field || field.type === 'group' || field.type === 'repeater') {
      return null;
    }
    return (
      <FormFieldControl
        field={field}
        presentation={model.ui.fields[field.id]}
        context={context}
        repeaterPath={repeaterPath}
      />
    );
  }

  if (node.type === 'group') {
    const field = findFieldById(model.clinical.fields, node.fieldId);
    if (field?.type !== 'group') {
      return null;
    }
    return (
      <GroupLayoutControl
        field={field}
        layout={node.children}
        model={model}
        context={context}
      />
    );
  }

  if (node.type === 'repeater') {
    const field = findFieldById(model.clinical.fields, node.fieldId);
    if (field?.type !== 'repeater') {
      return null;
    }
    return (
      <RepeaterLayoutControl
        field={field}
        itemTemplate={node.itemTemplate}
        model={model}
        context={context}
      />
    );
  }

  return null;
}

function GroupLayoutControl({
  field,
  layout,
  model,
  context,
}: {
  field: ClinicalField;
  layout: LayoutNode[];
  model: FormDraftModel;
  context: FormRendererContext;
}): JSX.Element | null {
  const visible = context.evaluation.visibility[field.id] ?? true;
  if (!visible) {
    return null;
  }

  const presentation = model.ui.fields[field.id];

  return (
    <FieldSet className={cn('col-span-full', widthClass(presentation?.width))}>
      <FieldLegend>{presentation?.label ?? field.id}</FieldLegend>
      {presentation?.helpText ? (
        <FieldDescription>{presentation.helpText}</FieldDescription>
      ) : null}
      <FieldGroup>
        <FormLayoutRenderer
          model={model}
          layout={layout}
          context={context}
        />
      </FieldGroup>
    </FieldSet>
  );
}

function RepeaterLayoutControl({
  field,
  itemTemplate,
  model,
  context,
}: {
  field: ClinicalField;
  itemTemplate: LayoutNode[];
  model: FormDraftModel;
  context: FormRendererContext;
}): JSX.Element | null {
  const { t } = useTranslation('designer');
  const visible = context.evaluation.visibility[field.id] ?? true;
  if (!visible) {
    return null;
  }

  const presentation = model.ui.fields[field.id];
  const rows = getRepeaterRows(context.values, field.code);
  const errors = context.fieldErrors[field.id] ?? [];
  const canAdd =
    !context.readOnly &&
    (field.maxItems === undefined || rows.length < field.maxItems);

  return (
    <FieldSet className={cn('col-span-full', widthClass(presentation?.width))}>
      <div className='flex items-center justify-between gap-3'>
        <FieldLegend>{presentation?.label ?? field.id}</FieldLegend>
        {canAdd ? (
          <button
            type='button'
            className='text-sm text-primary hover:underline'
            onClick={() => {
              context.onAddRepeaterRow(field.code);
            }}
          >
            {t('formPreview.addRow')}
          </button>
        ) : null}
      </div>
      {presentation?.helpText ? (
        <FieldDescription>{presentation.helpText}</FieldDescription>
      ) : null}
      <div className='grid gap-4'>
        {rows.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t('formPreview.noRows')}</p>
        ) : null}
        {rows.map((_, rowIndex) => (
          <div
            key={`${field.id}-${rowIndex}`}
            className='rounded-lg border bg-card p-4'
          >
            <div className='mb-3 flex items-center justify-between gap-2'>
              <p className='text-sm font-medium'>
                {t('formPreview.rowLabel', { index: rowIndex + 1 })}
              </p>
              {!context.readOnly &&
              (field.minItems === undefined || rows.length > field.minItems) ? (
                <button
                  type='button'
                  className='text-sm text-destructive hover:underline'
                  onClick={() => {
                    context.onRemoveRepeaterRow(field.code, rowIndex);
                  }}
                >
                  {t('formPreview.removeRow')}
                </button>
              ) : null}
            </div>
            <FieldGroup>
              <FormLayoutRenderer
                model={model}
                layout={itemTemplate}
                context={context}
                repeaterPath={{
                  repeaterCode: field.code,
                  rowIndex,
                }}
              />
            </FieldGroup>
          </div>
        ))}
      </div>
      {context.showValidation && errors.length > 0 ? (
        <FieldError errors={errors.map((message) => ({ message }))} />
      ) : null}
    </FieldSet>
  );
}

function layoutNodeKey(node: LayoutNode): string {
  if (node.type === 'section') {
    return `section:${node.title}`;
  }
  return `${node.type}:${node.fieldId}`;
}
