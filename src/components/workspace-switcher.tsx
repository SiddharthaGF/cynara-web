import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, Check, Hospital, LoaderCircle } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { queryKeys } from '@/api/query-keys.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import { getHospitals, selectHospital } from '@/server/auth.ts';
import type { HospitalMembership } from '@/server/hospital-workspace.ts';

interface WorkspaceSwitcherProps {
  workspaceCode: string | null;
  workspaceName: string | null;
  memberships: HospitalMembership[];
}

export function WorkspaceSwitcher({
  workspaceCode,
  workspaceName,
  memberships,
}: WorkspaceSwitcherProps): JSX.Element {
  const { t } = useTranslation('common');
  const { isMobile } = useSidebar();
  const [switchingCode, setSwitchingCode] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState(false);
  const membershipsQuery = useQuery({
    queryKey: queryKeys.hospitals.memberships(),
    queryFn: getHospitals,
    initialData: memberships,
    staleTime: Infinity,
  });
  const displayName = workspaceName ?? t('appName');

  async function handleSwitch(code: string): Promise<void> {
    setSwitchingCode(code);
    setSwitchError(false);
    try {
      await selectHospital({ data: code });
      window.location.reload();
    } catch {
      setSwitchingCode(null);
      setSwitchError(true);
    }
  }

  function renderMemberships(): JSX.Element | JSX.Element[] {
    if (membershipsQuery.isLoading) {
      return (
        <DropdownMenuLabel className='flex items-center gap-2 text-sm'>
          <LoaderCircle className='animate-spin' />
          {t('workspace.loading')}
        </DropdownMenuLabel>
      );
    }

    if (membershipsQuery.isError) {
      return (
        <DropdownMenuLabel
          role='alert'
          className='text-sm text-destructive'
        >
          {t('workspace.loadFailed')}
        </DropdownMenuLabel>
      );
    }

    if (membershipsQuery.data?.length === 0) {
      return (
        <DropdownMenuLabel className='text-sm text-muted-foreground'>
          {t('workspace.noMemberships')}
        </DropdownMenuLabel>
      );
    }

    return (
      membershipsQuery.data?.map((membership) => {
        const isSwitching = switchingCode === membership.code;
        const isCurrent = membership.code === workspaceCode;
        let icon: JSX.Element = <Hospital />;
        if (isSwitching) {
          icon = <LoaderCircle className='animate-spin' />;
        } else if (isCurrent) {
          icon = <Check />;
        }

        return (
          <DropdownMenuItem
            key={membership.code}
            disabled={switchingCode !== null}
            onClick={(event) => {
              event.preventDefault();
              void handleSwitch(membership.code);
            }}
          >
            {icon}
            <span className='min-w-0 flex-1 truncate'>{membership.name}</span>
          </DropdownMenuItem>
        );
      }) ?? []
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size='lg'
                tooltip={t('workspace.current')}
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              />
            }
            aria-label={t('workspace.current')}
          >
            <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
              <Hospital />
            </div>
            <span className='grid min-w-0 flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-medium'>{displayName}</span>
              <span className='truncate text-xs'>{t('workspace.current')}</span>
            </span>
            <ChevronsUpDown className='ml-auto' />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
            className='w-56 rounded-lg'
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className='text-xs text-muted-foreground'>
                {t('workspace.switch')}
              </DropdownMenuLabel>
              {renderMemberships()}
              {switchError ? (
                <DropdownMenuLabel
                  role='alert'
                  className='text-sm text-destructive'
                >
                  {t('workspace.switchFailed')}
                </DropdownMenuLabel>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
