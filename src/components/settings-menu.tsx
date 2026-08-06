import {
  ComputerIcon,
  Languages,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AiSettingsDialog } from '@/components/ai-settings-dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import { useTheme } from '@/hooks/use-theme.ts';
import type { AppLocale } from '@/lib/locale.ts';
import type { ThemePreference } from '@/lib/theme.ts';
import { cn } from '@/lib/utils.ts';

interface SettingsMenuProps {
  className?: string;
  /**
   * When true, renders the trigger as a full-width row with the icon and the
   * localized "Settings" label, matching the visual weight of the other
   * sidebar menu buttons. When false, renders a compact icon-only trigger
   * sized to the collapsed sidebar (3rem).
   */
  showLabel?: boolean;
}

/**
 * Combines locale + theme toggles into a single menu so neither has to live
 * in the main header. Two sub-menus (Language / Theme) keep the active
 * value visible in the parent row, mirroring how shadcn settings menus
 * typically work.
 */
export function SettingsMenu({
  className,
  showLabel = false,
}: SettingsMenuProps): JSX.Element {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLocale();
  const { preference, setPreference, theme } = useTheme();
  const { can } = useCapabilities();
  const [aiOpen, setAiOpen] = useState(false);

  const canManageAi = can('read', 'Workspace');

  const localeLabel = locale === 'es' ? t('locale.es') : t('locale.en');

  function getThemeLabel(): string {
    if (preference === 'system') {
      return t('theme.system');
    }
    return theme === 'dark' ? t('theme.dark') : t('theme.light');
  }

  function getThemeIcon(): typeof ComputerIcon {
    if (preference === 'system') {
      return ComputerIcon;
    }
    return theme === 'dark' ? Moon : Sun;
  }

  const themeLabel = getThemeLabel();
  const ThemeIcon = getThemeIcon();

  const triggerButton = (
    <Button
      type='button'
      variant='ghost'
      size={showLabel ? 'sm' : 'icon-sm'}
      aria-label={t('settings.open')}
      className={cn(
        'text-muted-foreground',
        showLabel && 'w-full justify-start gap-2',
        className,
      )}
    >
      <Settings className='size-4' />
      {showLabel ? <span>{t('settings.open')}</span> : null}
    </Button>
  );

  return (
    <>
      <DropdownMenu>
        {showLabel ? (
          <DropdownMenuTrigger render={triggerButton} />
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={<DropdownMenuTrigger render={triggerButton} />}
            />
            <TooltipContent side='bottom'>{t('settings.open')}</TooltipContent>
          </Tooltip>
        )}
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
              <ThemeIcon className='size-4' />
              <span>{t('settings.theme')}</span>
              <span className='ml-auto text-xs text-muted-foreground'>
                {themeLabel}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={preference}
                onValueChange={(value) => {
                  if (
                    value === 'light' ||
                    value === 'dark' ||
                    value === 'system'
                  ) {
                    setPreference(value as ThemePreference);
                  }
                }}
              >
                <DropdownMenuRadioItem value='light'>
                  <Sun className='size-4' />
                  {t('theme.light')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value='dark'>
                  <Moon className='size-4' />
                  {t('theme.dark')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value='system'>
                  <ComputerIcon className='size-4' />
                  {t('theme.system')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {canManageAi ? (
            <DropdownMenuItem
              onClick={() => {
                setAiOpen(true);
              }}
            >
              <Sparkles className='size-4' />
              {t('settings.ai.menu')}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AiSettingsDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
      />
    </>
  );
}
