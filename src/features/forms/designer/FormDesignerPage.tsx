import type { JSX } from 'react';

import type { FormVersion } from '@/features/forms/types.ts';

import { FormDesignerLayout } from './FormDesignerLayout.tsx';

interface FormDesignerPageProps {
  code: string;
  initialDraft: FormVersion;
}

export function FormDesignerPage({
  code,
  initialDraft,
}: FormDesignerPageProps): JSX.Element {
  return (
    <FormDesignerLayout
      code={code}
      initialDraft={initialDraft}
    />
  );
}
