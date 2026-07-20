import { Languages } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { useLocale } from '@/hooks/use-locale.ts';
import { cn } from '@/lib/utils.ts';

interface LocaleToggleProps {
  className?: string;
}

export function LocaleToggle({ className }: LocaleToggleProps): JSX.Element {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLocale();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (value === 'en' || value === 'es') {
          setLocale(value);
        }
      }}
    >
      <SelectTrigger
        aria-label={t('locale.switch')}
        className={cn('w-[7.5rem] gap-2', className)}
        size='sm'
      >
        <Languages className='size-3.5 shrink-0 opacity-70' />
        <SelectValue>
          {locale === 'es' ? t('locale.es') : t('locale.en')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='en'>{t('locale.en')}</SelectItem>
        <SelectItem value='es'>{t('locale.es')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
