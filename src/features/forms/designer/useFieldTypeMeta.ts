import { useTranslation } from 'react-i18next';

import { getFieldTypeMeta } from '@/features/forms/designer/fieldTypeMeta.ts';
import type { FieldTypeMeta } from '@/features/forms/designer/fieldTypeMeta.ts';
import type { FieldType } from '@/features/forms/types.ts';

export function useFieldTypeMeta(type: FieldType): FieldTypeMeta {
  const { t } = useTranslation('designer');
  const base = getFieldTypeMeta(type);

  return {
    ...base,
    label: t(`fieldTypes.${type}.label`, { defaultValue: base.label }),
    description: t(`fieldTypes.${type}.description`, {
      defaultValue: base.description,
    }),
  };
}

export function useFieldGroupLabel(group: FieldTypeMeta['group']): string {
  const { t } = useTranslation('designer');
  return t(`fieldGroups.${group}`);
}
