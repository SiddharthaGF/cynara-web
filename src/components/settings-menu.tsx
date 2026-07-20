import { Languages, Moon, Settings, Sun } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { useLocale } from '@/hooks/use-locale.ts';
import { useTheme } from '@/hooks/use-theme.ts';
import type { AppLocale } from '@/lib/locale.ts';
import type { Theme } from '@/lib/theme.ts';
import { cn } from '@/lib/utils.ts';

interface SettingsMenuProps {
  className?: string;
}

/**
 * Combines locale + theme toggles into a single menu so neither has to live
 * in the main header. Two sub-menus (Language / Theme) keep the active
 * value visible in the parent row, mirroring how shadcn settings menus
 * typically work.
 */
export function SettingsMenu({ className }: SettingsMenuProps): JSX.Element {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();

  const localeLabel = locale === 'es' ? t('locale.es') : t('locale.en');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={t('settings.open')}
            className={cn('text-muted-foreground', className)}
          />
        }
      >
        <Settings className='size-4' />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-56'
      >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className='size-4' />
            <span>{t('settings.language')}</span>
            <span className='ml-auto text-xs text-muted-foreground'>
              {localeLabel}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(value) => {
                if (value === 'en' || value === 'es') {
                  setLocale(value as AppLocale);
                }
              }}
            >
              <DropdownMenuRadioItem value='en'>
                {t('locale.en')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='es'>
                {t('locale.es')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {theme === 'dark' ? (
              <Moon className='size-4' />
            ) : (
              <Sun className='size-4' />
            )}
            <span>{t('settings.theme')}</span>
            <span className='ml-auto text-xs text-muted-foreground'>
              {theme === 'dark' ? t('theme.dark') : t('theme.light')}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => {
                setTheme(value as Theme);
              }}
            >
              <DropdownMenuRadioItem value='light'>
                {t('theme.light')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='dark'>
                {t('theme.dark')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
