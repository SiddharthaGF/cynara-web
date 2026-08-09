import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { PatientDto } from '@/api/patients.ts';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import { PatientDocumentsTimeline } from '@/features/documents/PatientDocumentsTimeline.tsx';
import { PatientEncountersPanel } from '@/features/encounters/PatientEncountersPanel.tsx';
import { PatientJourneyPanel } from '@/features/journeys/PatientJourneyPanel.tsx';
import type { PatientDetailTab } from '@/features/patients/patientDetailSearch.ts';
import { PatientOverview } from '@/features/patients/PatientOverview.tsx';
import { PatientView } from '@/features/patients/PatientView.tsx';

interface PatientDetailTabsProps {
  patient: PatientDto;
  locale: string;
  tab: PatientDetailTab;
  canCreateEncounter: boolean;
  onTabChange: (tab: PatientDetailTab) => void;
  onNewEncounter: () => void;
}

export function PatientDetailTabs({
  patient,
  locale,
  tab,
  canCreateEncounter,
  onTabChange,
  onNewEncounter,
}: PatientDetailTabsProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api', 'common']);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        onTabChange(value as PatientDetailTab);
      }}
    >
      <TabsList>
        <TabsTrigger
          value='overview'
          data-testid='hc-tab-overview'
        >
          {t('detail.tabs.overview')}
        </TabsTrigger>
        <TabsTrigger
          value='encounters'
          data-testid='hc-tab-encounters'
        >
          {t('detail.tabs.encounters')}
        </TabsTrigger>
        <TabsTrigger
          value='documents'
          data-testid='hc-tab-documents'
        >
          {t('detail.tabs.documents')}
        </TabsTrigger>
        <TabsTrigger
          value='journeys'
          data-testid='hc-tab-journeys'
        >
          {t('detail.tabs.journeys')}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value='overview'
        className='mt-6'
      >
        <PatientView patient={patient} />
        <PatientOverview
          patientId={patient.id}
          locale={locale}
          onNewEncounter={onNewEncounter}
          onShowAllEncounters={() => onTabChange('encounters')}
          onShowAllDocuments={() => onTabChange('documents')}
        />
      </TabsContent>

      <TabsContent
        value='encounters'
        className='mt-6'
      >
        <PatientEncountersPanel
          patientId={patient.id}
          locale={locale}
          onNewEncounter={onNewEncounter}
        />
      </TabsContent>

      <TabsContent
        value='documents'
        className='mt-6'
      >
        <PatientDocumentsTimeline
          patientId={patient.id}
          locale={locale}
          onNewEncounter={canCreateEncounter ? onNewEncounter : undefined}
        />
      </TabsContent>

      <TabsContent
        value='journeys'
        className='mt-6'
      >
        <PatientJourneyPanel
          patientId={patient.id}
          locale={locale}
          onNewEncounter={onNewEncounter}
        />
      </TabsContent>
    </Tabs>
  );
}
