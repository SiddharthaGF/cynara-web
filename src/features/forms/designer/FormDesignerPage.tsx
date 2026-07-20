import type { JSX } from 'react';

import { SidebarProvider } from '@/components/ui/sidebar.tsx';

import { FormDesignerLayout } from './FormDesignerLayout.tsx';

interface FormDesignerPageProps {
  code: string;
}

export function FormDesignerPage({ code }: FormDesignerPageProps): JSX.Element {
  return (
    <SidebarProvider defaultOpen>
      <FormDesignerLayout code={code} />
    </SidebarProvider>
  );
}
