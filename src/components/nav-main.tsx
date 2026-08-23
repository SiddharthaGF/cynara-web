import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { NavGroup, NavTarget } from '@/components/app-shell.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar.tsx';

interface NavMainProps {
  groups: NavGroup[];
  locale: string;
  activeByTarget: Record<NavTarget, boolean>;
}

export function NavMain({
  groups,
  locale,
  activeByTarget,
}: NavMainProps): JSX.Element {
  const { t } = useTranslation('common');

  return (
    <>
      {groups.map((group) => (
        <Collapsible
          key={group.labelKey}
          defaultOpen
          className='group/collapsible'
        >
          <SidebarGroup>
            <CollapsibleTrigger
              render={
                <SidebarGroupLabel className='cursor-pointer'>
                  {t(group.labelKey)}
                  <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                </SidebarGroupLabel>
              }
            />
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.entries.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <SidebarMenuItem key={entry.to}>
                        <SidebarMenuButton
                          render={
                            <Link
                              to={entry.to}
                              params={{ locale }}
                            />
                          }
                          isActive={activeByTarget[entry.to]}
                          tooltip={t(entry.labelKey)}
                        >
                          <Icon />
                          <span>{t(entry.labelKey)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      ))}
    </>
  );
}
