import type { TFunction } from 'i18next';

import type {
  ClinicalField,
  ComponentSummary,
} from '@/features/forms/types.ts';
import type { SyncedTanstackForm } from '@/lib/useSyncedTanstackForm.ts';

import type { ClinicalFormValues } from './fieldInspectorFormUtils.ts';

export interface ClinicalFieldSectionProps {
  field: ClinicalField;
  form: SyncedTanstackForm<ClinicalFormValues>;
  t: TFunction<'designer'>;
}

export interface ClinicalComponentRefFieldsProps extends ClinicalFieldSectionProps {
  components: ComponentSummary[];
}
