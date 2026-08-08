import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ClipboardList,
  Hospital,
  LayoutDashboard,
  UserRound,
  Users,
  Workflow,
} from 'lucide-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listPatients, type PatientDto } from '@/api/patients.ts';
import { queryKeys } from '@/api/query-keys.ts';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIN_QUERY_LENGTH = 2;

/**
 * Global command palette (Ctrl/⌘+K). Lists workspace navigation grouped by
 * capability and live patient search results. Navigation and selection close
 * the palette; keyboard state is cleaned up on unmount.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps): JSX.Element {
  const { t } = useTranslation('common');
  const { locale } = useParams({ from: '/$locale' });
  const navigate = useNavigate();
  const { can } = useCapabilities();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  const canReadPatients = can('read', 'Patient');
  const canReadCatalog = can('read', 'Catalog');
  const canReadWorkflows = can('read', 'Workflow');
  const canReadAdmin = can('read', 'Workspace') || canReadCatalog;

  const navigationItems = [
    {
      key: 'home',
      to: '/$locale',
      icon: LayoutDashboard,
      label: t('nav.home'),
      visible: true,
    },
    {
      key: 'patients',
      to: '/$locale/patients',
      icon: Users,
      label: t('nav.patients'),
      visible: canReadPatients,
    },
    {
      key: 'forms',
      to: '/$locale/forms',
      icon: ClipboardList,
      label: t('nav.forms'),
      visible: canReadCatalog,
    },
    {
      key: 'workflows',
      to: '/$locale/workflows',
      icon: Workflow,
      label: t('nav.workflows'),
      visible: canReadWorkflows,
    },
    {
      key: 'administration',
      to: '/$locale/admin',
      icon: Hospital,
      label: t('nav.administration'),
      visible: canReadAdmin,
    },
  ].filter((item) => item.visible);

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('commandPalette.title')}
      description={t('commandPalette.description')}
    >
      <CommandInput
        placeholder={t('commandPalette.placeholder')}
        aria-label={t('commandPalette.placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t('commandPalette.noResults')}</CommandEmpty>

        <CommandGroup heading={t('commandPalette.goTo')}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.key}
                value={item.key}
                onSelect={() => {
                  handleClose();
                  void navigate({
                    to: item.to,
                    params: { locale },
                  });
                }}
              >
                <Icon />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {canReadPatients ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('commandPalette.patients')}>
              <PatientResults
                query={query}
                onSelected={(patientId) => {
                  handleClose();
                  void navigate({
                    to: '/$locale/patients/$id',
                    params: { locale, id: patientId },
                  });
                }}
              />
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

function PatientResults({
  query,
  onSelected,
}: {
  query: string;
  onSelected: (patientId: string) => void;
}): JSX.Element {
  const { t } = useTranslation('common');
  const trimmed = query.trim();
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;

  const { data, isError } = useQuery({
    queryKey: queryKeys.patients.list({
      familyName: trimmed,
      pageSize: 5,
      page: 1,
    }),
    queryFn: async () =>
      listPatients({
        familyName: trimmed,
        pageSize: 5,
        page: 1,
      }),
    enabled,
    placeholderData: (previous) => previous,
  });

  if (!enabled) {
    return (
      <p className='px-2 py-2 text-xs text-muted-foreground'>
        {t('commandPalette.minQuery')}
      </p>
    );
  }

  if (isError) {
    return (
      <p className='px-2 py-2 text-xs text-muted-foreground'>
        {t('commandPalette.patientError')}
      </p>
    );
  }

  const patients = (data?.patients ?? []).filter(
    (patient): patient is PatientDto => patient.id !== undefined,
  );

  if (patients.length === 0) {
    return (
      <p className='px-2 py-2 text-xs text-muted-foreground'>
        {t('commandPalette.noPatientResults')}
      </p>
    );
  }

  return (
    <>
      {patients.map((patient) => (
        <CommandItem
          key={patient.id}
          value={`patient-${patient.id}`}
          onSelect={() => {
            onSelected(patient.id);
          }}
        >
          <UserRound />
          <span>
            {patient.givenName} {patient.familyName}
          </span>
          <CommandShortcut>{patient.mrn}</CommandShortcut>
        </CommandItem>
      ))}
    </>
  );
}
