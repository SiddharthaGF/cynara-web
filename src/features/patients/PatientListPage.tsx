import type { JSX } from 'react';

import { AppShell } from '@/components/app-shell.tsx';
import { PatientSearchWorkspace } from '@/features/patients/PatientSearchWorkspace.tsx';

export function PatientListPage(): JSX.Element {
  return (
    <AppShell variant='catalog'>
      <PatientSearchWorkspace
        route='/$locale/patients'
        framing={{
          titleKey: 'search.title',
          subtitleKey: 'search.subtitle',
          cardTitleKey: 'search.resultsTitle',
        }}
        register
      />
    </AppShell>
  );
}
