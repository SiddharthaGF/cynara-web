import {
  Building2,
  Check,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
} from 'lucide-react';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Field, FieldError } from '@/components/ui/field.tsx';
import {
  matchPreset,
  PERMISSION_GROUPS,
  scopesForPreset,
  toggleScope,
  type AccessPresetId,
} from '@/features/invitations/invitationAccessPresets.ts';
import type { CapabilityCode } from '@/lib/capabilities.ts';
import { cn } from '@/lib/utils.ts';

const PRESET_META = [
  { id: 'doctor', icon: Stethoscope },
  { id: 'admin', icon: ShieldCheck },
  { id: 'custom', icon: SlidersHorizontal },
] as const;

interface CreateInvitationAccessStepProps {
  hospitalName: string | null;
  capabilities: CapabilityCode[];
  capabilitiesError?: string;
  personSummary: string;
  onCapabilitiesChange: (next: CapabilityCode[]) => void;
  onEditPerson: () => void;
}

/**
 * Friendly groups of capabilities behind the Doctor preset. The technical
 * scope strings still come from `PERMISSION_GROUPS`; we only choose which
 * groups to surface in the Doctor summary.
 */
const DOCTOR_GROUP_KEYS: readonly string[] = [
  'patients',
  'encounters',
  'clinicalDocuments',
  'forms',
];

/**
 * Access step of the create-invitation wizard. The presets fill the same
 * capability set the form already supports; the payload shape is unchanged.
 *
 * UX principle: a non-technical user should pick the kind of person they are
 * inviting, not configure scopes. Custom is hidden behind an explicit choice
 * and only renders the granular editor when selected.
 */
export function CreateInvitationAccessStep({
  hospitalName,
  capabilities,
  capabilitiesError,
  personSummary,
  onCapabilitiesChange,
  onEditPerson,
}: CreateInvitationAccessStepProps): JSX.Element {
  const { t } = useTranslation('invitations');
  const [customizing, setCustomizing] = useState(false);
  const [showDoctorDetails, setShowDoctorDetails] = useState(false);
  const [showAdminDetails, setShowAdminDetails] = useState(false);

  const matched = matchPreset(capabilities);
  const selectedCapabilities = useMemo(
    () => new Set(capabilities),
    [capabilities],
  );
  const activePreset: AccessPresetId = customizing
    ? 'custom'
    : (matched ?? 'custom');

  const selectPreset = (preset: AccessPresetId): void => {
    if (preset === 'custom') {
      setCustomizing(true);
      return;
    }
    setCustomizing(false);
    setShowDoctorDetails(false);
    setShowAdminDetails(false);
    onCapabilitiesChange([...scopesForPreset(preset)]);
  };

  const handleToggle = (scope: CapabilityCode, checked: boolean): void => {
    setCustomizing(true);
    onCapabilitiesChange(toggleScope(capabilities, scope, checked));
  };

  const accessLabel =
    activePreset === 'custom'
      ? t('create.presets.custom.title')
      : t(`create.presets.${activePreset}.title`);

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5'>
        <Building2 className='size-4 shrink-0 text-muted-foreground' />
        <div className='min-w-0'>
          <p className='text-xs text-muted-foreground'>
            {t('create.workspaceSection')}
          </p>
          <p className='truncate text-sm font-medium'>
            {hospitalName ?? t('create.hospitalPlaceholder')}
          </p>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <p className='text-sm font-medium'>{t('create.accessLevel')}</p>
        <div
          className='grid gap-2 sm:grid-cols-3'
          role='group'
          aria-label={t('create.accessLevel')}
        >
          {PRESET_META.map((preset) => {
            const selected = activePreset === preset.id;
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type='button'
                aria-pressed={selected}
                onClick={() => {
                  selectPreset(preset.id);
                }}
                className={cn(
                  'flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors',
                  'hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                  selected
                    ? 'border-primary/60 bg-background'
                    : 'border-border/70 bg-background',
                )}
              >
                <Icon
                  className={cn(
                    'size-5',
                    selected ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <span className='text-sm font-medium'>
                  {t(`create.presets.${preset.id}.title`)}
                </span>
                <span className='text-xs leading-snug text-muted-foreground'>
                  {t(`create.presets.${preset.id}.description`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activePreset === 'doctor' ? (
        <DoctorSummary
          expanded={showDoctorDetails}
          onToggleDetails={() => {
            setShowDoctorDetails((current) => !current);
          }}
        />
      ) : null}

      {activePreset === 'admin' ? (
        <AdminSummary
          expanded={showAdminDetails}
          onToggleDetails={() => {
            setShowAdminDetails((current) => !current);
          }}
        />
      ) : null}

      {activePreset === 'custom' ? (
        <Field>
          <div className='flex flex-col gap-2'>
            {PERMISSION_GROUPS.map((group) => (
              <PermissionGroup
                key={group.key}
                groupKey={group.key}
                state={getGroupState(group.scopes, selectedCapabilities)}
                selectedCapabilities={selectedCapabilities}
                onToggle={handleToggle}
              />
            ))}
          </div>
          <FieldError errors={[{ message: capabilitiesError }]} />
        </Field>
      ) : (
        <FieldError errors={[{ message: capabilitiesError }]} />
      )}

      <div className='kardex flex flex-col gap-2 p-3'>
        <p className='text-sm font-medium'>{t('create.summaryTitle')}</p>
        <dl className='flex flex-col gap-2 text-sm'>
          <div className='flex items-center justify-between gap-2'>
            <dt className='text-muted-foreground'>
              {t('create.summaryPerson')}
            </dt>
            <dd className='flex min-w-0 items-center gap-1'>
              <span className='truncate font-medium'>{personSummary}</span>
              <Button
                type='button'
                variant='link'
                size='sm'
                onClick={onEditPerson}
              >
                {t('create.summaryEdit')}
              </Button>
            </dd>
          </div>
          <div className='flex items-center justify-between gap-2'>
            <dt className='text-muted-foreground'>
              {t('create.summaryWorkspace')}
            </dt>
            <dd className='truncate font-medium'>
              {hospitalName ?? t('create.hospitalPlaceholder')}
            </dd>
          </div>
          <div className='flex items-center justify-between gap-2'>
            <dt className='text-muted-foreground'>
              {t('create.summaryAccess')}
            </dt>
            <dd className='truncate font-medium'>{accessLabel}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

type GroupState = 'all' | 'some' | 'none';

function getGroupState(
  groupScopes: readonly CapabilityCode[],
  selected: ReadonlySet<CapabilityCode>,
): GroupState {
  const matched = groupScopes.filter((scope) => selected.has(scope)).length;
  if (matched === 0) {
    return 'none';
  }
  if (matched === groupScopes.length) {
    return 'all';
  }
  return 'some';
}

const STATE_LABEL: Record<GroupState, string> = {
  all: 'create.states.all',
  some: 'create.states.some',
  none: 'create.states.none',
};

function DoctorSummary({
  expanded,
  onToggleDetails,
}: {
  expanded: boolean;
  onToggleDetails: () => void;
}): JSX.Element {
  const { t } = useTranslation('invitations');
  const groups = DOCTOR_GROUP_KEYS.map((key) =>
    PERMISSION_GROUPS.find((group) => group.key === key),
  ).filter(
    (group): group is (typeof PERMISSION_GROUPS)[number] => group !== undefined,
  );

  return (
    <div className='flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 p-3'>
      <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {t('create.includedTitle')}
      </p>
      <ul className='flex flex-col gap-1.5'>
        {groups.map((group) => (
          <li
            key={group.key}
            className='flex items-center gap-2 text-sm'
          >
            <Check className='size-4 shrink-0 text-primary' />
            <span>{t(`create.groups.${group.key}`)}</span>
          </li>
        ))}
      </ul>
      <Button
        type='button'
        variant='link'
        size='sm'
        className='self-start px-0'
        onClick={onToggleDetails}
        aria-expanded={expanded}
      >
        {expanded ? t('create.hidePermissions') : t('create.viewPermissions')}
      </Button>
      {expanded ? (
        <ul className='mt-1 flex flex-col gap-1 border-t pt-2 text-sm'>
          {groups.flatMap((group) =>
            group.scopes.map((scope) => (
              <li
                key={scope}
                className='flex items-center gap-2 text-muted-foreground'
              >
                <Check className='size-3.5 shrink-0' />
                <span>
                  {scope.endsWith('.write')
                    ? t('create.editLabel')
                    : t('create.viewLabel')}
                  {' · '}
                  {t(`create.groups.${group.key}`)}
                </span>
              </li>
            )),
          )}
        </ul>
      ) : null}
    </div>
  );
}

function AdminSummary({
  expanded,
  onToggleDetails,
}: {
  expanded: boolean;
  onToggleDetails: () => void;
}): JSX.Element {
  const { t } = useTranslation('invitations');
  return (
    <div className='flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 p-3'>
      <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {t('create.fullAccessTitle')}
      </p>
      <p className='text-sm text-muted-foreground'>
        {t('create.fullAccessDescription')}
      </p>
      <Button
        type='button'
        variant='link'
        size='sm'
        className='self-start px-0'
        onClick={onToggleDetails}
        aria-expanded={expanded}
      >
        {expanded ? t('create.hidePermissions') : t('create.viewPermissions')}
      </Button>
      {expanded ? (
        <ul className='mt-1 flex flex-col gap-1 border-t pt-2 text-sm'>
          {PERMISSION_GROUPS.map((group) => (
            <li
              key={group.key}
              className='flex items-center gap-2 text-muted-foreground'
            >
              <Check className='size-3.5 shrink-0' />
              <span>{t(`create.groups.${group.key}`)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PermissionGroup({
  groupKey,
  state,
  selectedCapabilities,
  onToggle,
}: {
  groupKey: string;
  state: GroupState;
  selectedCapabilities: ReadonlySet<CapabilityCode>;
  onToggle: (scope: CapabilityCode, checked: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation('invitations');
  const group = PERMISSION_GROUPS.find((item) => item.key === groupKey);
  if (group === undefined) {
    return <></>;
  }
  return (
    <div className='flex flex-col gap-2 rounded-xl border border-border/70 p-3'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-sm font-medium'>
          {t(`create.groups.${groupKey}`)}
        </span>
        <Badge
          variant='secondary'
          className={cn(
            state === 'all' && 'status-tone-success border',
            state === 'some' && 'status-tone-review border',
          )}
        >
          {t(STATE_LABEL[state])}
        </Badge>
      </div>
      <div className='flex flex-col gap-1.5'>
        {group.scopes.map((scope) => (
          <label
            key={scope}
            className='flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-muted/50'
          >
            <Checkbox
              checked={selectedCapabilities.has(scope)}
              onCheckedChange={(checked) => {
                onToggle(scope, checked);
              }}
            />
            <span>
              {scope.endsWith('.write')
                ? t('create.editLabel')
                : t('create.viewLabel')}
              {' · '}
              {t(`create.groups.${groupKey}`)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
