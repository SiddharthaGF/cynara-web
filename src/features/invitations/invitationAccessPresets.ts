import { CAPABILITY_CODES, type CapabilityCode } from '@/lib/capabilities.ts';

export type AccessPresetId = 'doctor' | 'admin' | 'custom';

export interface PermissionGroup {
  /** Locale key suffix under `create.groups`. */
  key: string;
  scopes: readonly CapabilityCode[];
}

/**
 * Friendly permission groups shown in the custom access editor. Technical
 * scope strings stay in code; labels come from the locale files.
 */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  { key: 'patients', scopes: ['patients.read', 'patients.write'] },
  { key: 'encounters', scopes: ['encounters.read', 'encounters.write'] },
  {
    key: 'clinicalDocuments',
    scopes: ['clinical-documents.read', 'clinical-documents.write'],
  },
  { key: 'forms', scopes: ['form-responses.read', 'form-responses.write'] },
  { key: 'audit', scopes: ['audit.read'] },
  { key: 'catalog', scopes: ['catalog.read', 'catalog.write'] },
  { key: 'workflows', scopes: ['workflows.read', 'workflows.write'] },
  { key: 'pipelines', scopes: ['pipelines.read', 'pipelines.write'] },
  { key: 'tasks', scopes: ['tasks.read', 'tasks.write'] },
  { key: 'workspace', scopes: ['workspace.read', 'workspace.write'] },
  { key: 'capabilities', scopes: ['capabilities.read', 'capabilities.write'] },
  { key: 'users', scopes: ['users.read'] },
  {
    key: 'invitations',
    scopes: ['user-invitations.read', 'user-invitations.write'],
  },
];

/**
 * Read/write scopes over clinical resources behind the Doctor preset. Kept a
 * strict subset of the catalog so the preset never grants administrative
 * capabilities (workspace, catalog, capabilities, users, invitations).
 */
export const DOCTOR_SCOPES: readonly CapabilityCode[] = [
  'patients.read',
  'patients.write',
  'encounters.read',
  'encounters.write',
  'clinical-documents.read',
  'clinical-documents.write',
  'form-responses.read',
  'form-responses.write',
  'tasks.read',
  'tasks.write',
];

/** The Administrator preset grants every capability the form supports. */
export const ADMIN_SCOPES: readonly CapabilityCode[] = CAPABILITY_CODES;

export function scopesForPreset(
  preset: Exclude<AccessPresetId, 'custom'>,
): readonly CapabilityCode[] {
  return preset === 'doctor' ? DOCTOR_SCOPES : ADMIN_SCOPES;
}

function sameScopeSet(
  first: readonly CapabilityCode[],
  second: readonly CapabilityCode[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }
  const remaining = new Set<CapabilityCode>(first);
  for (const scope of second) {
    if (!remaining.delete(scope)) {
      return false;
    }
  }
  return remaining.size === 0;
}

/**
 * Matches a capability selection back to a preset. Returns null when the
 * selection is empty or hand-picked, which the wizard renders as Custom.
 */
export function matchPreset(
  scopes: readonly CapabilityCode[],
): Exclude<AccessPresetId, 'custom'> | null {
  if (sameScopeSet(scopes, DOCTOR_SCOPES)) {
    return 'doctor';
  }
  if (sameScopeSet(scopes, ADMIN_SCOPES)) {
    return 'admin';
  }
  return null;
}

/** Immutable capability toggle; read and write stay independent. */
export function toggleScope(
  current: readonly CapabilityCode[],
  scope: CapabilityCode,
  checked: boolean,
): CapabilityCode[] {
  if (checked) {
    return current.includes(scope) ? [...current] : [...current, scope];
  }
  return current.filter((item) => item !== scope);
}
