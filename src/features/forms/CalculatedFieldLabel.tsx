import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

export function CalculatedFieldLabelSuffix(): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <span className='font-normal italic text-muted-foreground'>
      {' '}
      - {t('validationRules.calculated')}
    </span>
  );
}
