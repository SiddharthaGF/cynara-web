import type { JSX } from 'react';

import { buildLayout } from '@/features/forms/model/formDraft.ts';
import { cn } from '@/lib/utils.ts';

import { buildRendererContext } from './buildRendererContext.ts';
import { FormLayoutRenderer } from './FormLayoutRenderer.tsx';
import type { FormSnapshot } from './types.ts';
import type { UseFormRendererReturn } from './useFormRenderer.ts';

interface FormRendererViewProps {
  model: FormSnapshot;
  renderer: UseFormRendererReturn;
  className?: string;
}

export function FormRendererView({
  model,
  renderer,
  className,
}: FormRendererViewProps): JSX.Element {
  const context = buildRendererContext(model, renderer);
  const layout = model.ui.layout ?? [];

  return (
    <form
      className={cn('grid gap-6', className)}
      action={() => {
        renderer.triggerValidation();
      }}
      noValidate
    >
      {layout.length > 0 ? (
        <FormLayoutRenderer
          model={model}
          layout={layout}
          context={context}
        />
      ) : (
        <FormLayoutRenderer
          model={model}
          layout={buildLayout(model.clinical.fields)}
          context={context}
        />
      )}
    </form>
  );
}

export { useFormRenderer } from './useFormRenderer.ts';
export type { FormSnapshot, FormValues, ConfigWarning } from './types.ts';
