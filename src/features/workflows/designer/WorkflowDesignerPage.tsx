import type { JSX } from 'react';

import type { WorkflowVersion } from '@/features/workflows/types.ts';

import { WorkflowDesignerLayout } from './WorkflowDesignerLayout.tsx';

interface WorkflowDesignerPageProps {
  code: string;
  initialDraft: WorkflowVersion;
}

export function WorkflowDesignerPage({
  code,
  initialDraft,
}: WorkflowDesignerPageProps): JSX.Element {
  return (
    <WorkflowDesignerLayout
      code={code}
      initialDraft={initialDraft}
    />
  );
}
