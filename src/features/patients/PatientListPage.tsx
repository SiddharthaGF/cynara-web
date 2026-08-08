import { Users } from 'lucide-react';
import { LazyMotion, domAnimation } from 'motion/react';
import type { JSX } from 'react';

import { AppShell } from '@/components/app-shell.tsx';
import { PatientSearchWorkspace } from '@/features/patients/PatientSearchWorkspace.tsx';

export function PatientListPage(): JSX.Element {
  return (
    <AppShell variant='catalog'>
      <LazyMotion features={domAnimation}>
        <PatientSearchWorkspace
          route='/$locale/patients'
          framing={{
            eyebrowKey: 'search.eyebrow',
            titleKey: 'search.title',
            titleAccentKey: 'search.titleAccent',
            subtitleKey: 'search.subtitle',
            cardTitleKey: 'search.resultsTitle',
            icon: Users,
          }}
          register
        />
      </LazyMotion>
    </AppShell>
  );
}
