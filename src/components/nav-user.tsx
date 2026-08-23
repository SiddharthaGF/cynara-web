import { Link } from '@tanstack/react-router';
import {
  ChevronUp,
  ComputerIcon,
  Languages,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AiSettingsDialog } from '@/components/ai-settings-dialog.tsx';
import { Avatar, AvatarFallback } from '@/components/ui/avatar.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { useLocale } from '@/hooks/use-locale.ts';
import { useTheme } from '@/hooks/use-theme.ts';
import type { AppLocale } from '@/lib/locale.ts';
import type { ThemePreference } from '@/lib/theme.ts';

function actorInitials(actorId: string | null): string {
  if (!actorId) {
    return '?';
  }
  const first = actorId.trim().charAt(0).toUpperCase();
  return first || '?';
}

function themeLabel(
  preference: ThemePreference,
  theme: 'light' | 'dark',
  t: (key: string) => string,
): string {
  if (preference === 'system') {
    return t('theme.system');
  }
  return theme === 'dark' ? t('theme.dark') : t('theme.light');
}

function themeIcon(
  preference: ThemePreference,
  theme: 'light' | 'dark',
): typeof ComputerIcon {
  if (preference === 'system') {
    return ComputerIcon;
  }
  return theme === 'dark' ? Moon : Sun;
}

export function NavUser(): JSX.Element {
  const { t } = useTranslation('common');
  const { t: tAuth } = useTranslation('auth');
  const { locale, setLocale } = useLocale();
  const { preference, setPreference, theme } = useTheme();
  const { can, actorId } = useCapabilities();
  const { isMobile } = useSidebar();
  const [aiOpen, setAiOpen] = useState(false);

  const canManageAi = can('read', 'Workspace');
  const canReadWorkspace = canManageAi;
  const localeLabel = locale === 'es' ? t('locale.es') : t('locale.en');
  const currentThemeLabel = themeLabel(preference, theme, t);
  const ThemeIcon = themeIcon(preference, theme);
  const displayName = actorId ?? t('user.account');

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size='lg'
                  tooltip={isMobile ? undefined : t('user.menuLabel')}
                />
              }
              aria-label={t('user.menuLabel')}
            >
              <Avatar className='size-8 rounded-lg'>
                <AvatarFallback className='rounded-lg bg-primary/10 font-semibold text-primary'>
                  {actorInitials(actorId)}
                </AvatarFallback>
              </Avatar>
              <span className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{displayName}</span>
                <span className='truncate text-xs text-muted-foreground'>
                  {t('user.accountDescription')}
                </span>
              </span>
              <ChevronUp className='ml-auto' />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              side={isMobile ? 'bottom' : 'top'}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className='font-normal'>
                  <span className='block truncate font-medium'>
                    {displayName}
                  </span>
                  <span className='block truncate text-xs text-muted-foreground'>
                    {t('user.accountDescription')}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {canReadWorkspace ? (
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      to='/$locale/admin/workspace'
                      params={{ locale }}
                    />
                  }
                >
                  <Settings />
                  {t('user.workspaceSettings')}
                </DropdownMenuItem>
              ) : null}

              {canManageAi ? (
                <DropdownMenuItem
                  onClick={() => {
                    setAiOpen(true);
                  }}
                >
                  <Sparkles />
                  {t('settings.ai.menu')}
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages />
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
                  <ThemeIcon />
                  <span>{t('settings.theme')}</span>
                  <span className='ml-auto text-xs text-muted-foreground'>
                    {currentThemeLabel}
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
                      <Sun />
                      {t('theme.light')}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value='dark'>
                      <Moon />
                      {t('theme.dark')}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value='system'>
                      <ComputerIcon />
                      {t('theme.system')}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                nativeButton={false}
                render={
                  <Link
                    to='/$locale/logout'
                    params={{ locale }}
                  />
                }
              >
                <LogOut />
                {tAuth('logout.title')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <AiSettingsDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
      />
    </>
  );
}
