import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability';

export const CAPABILITY_CODES = [
  'patients.read',
  'patients.write',
  'encounters.read',
  'encounters.write',
  'clinical-documents.read',
  'clinical-documents.write',
  'form-responses.read',
  'form-responses.write',
  'audit.read',
  'catalog.read',
  'catalog.write',
  'workspace.read',
  'workspace.write',
  'capabilities.read',
  'capabilities.write',
] as const;

export type CapabilityCode = (typeof CAPABILITY_CODES)[number];

export function isCapabilityCode(value: string): value is CapabilityCode {
  return (CAPABILITY_CODES as readonly string[]).includes(value);
}

export type CapabilityAction = 'read' | 'write';

/**
 * CASL subjects. `catalog.*` protects the whole clinical catalog: published
 * form definitions (the form catalog) as well as hospital configuration
 * (facilities, clinical areas, disciplines, and the document catalog), so
 * those screens share the `Catalog` subject.
 */
export type CapabilitySubject =
  | 'Patient'
  | 'Encounter'
  | 'ClinicalDocument'
  | 'FormResponse'
  | 'AuditEvent'
  | 'Catalog'
  | 'Workspace'
  | 'CapabilityAssignment';

export type AppAbility = MongoAbility<[CapabilityAction, CapabilitySubject]>;

/** Maps each backend capability code to its CASL action + subject pair. */
export const CAPABILITY_RULE_MAP: Readonly<
  Record<
    CapabilityCode,
    { action: CapabilityAction; subject: CapabilitySubject }
  >
> = {
  'patients.read': { action: 'read', subject: 'Patient' },
  'patients.write': { action: 'write', subject: 'Patient' },
  'encounters.read': { action: 'read', subject: 'Encounter' },
  'encounters.write': { action: 'write', subject: 'Encounter' },
  'clinical-documents.read': {
    action: 'read',
    subject: 'ClinicalDocument',
  },
  'clinical-documents.write': {
    action: 'write',
    subject: 'ClinicalDocument',
  },
  'form-responses.read': { action: 'read', subject: 'FormResponse' },
  'form-responses.write': { action: 'write', subject: 'FormResponse' },
  'audit.read': { action: 'read', subject: 'AuditEvent' },
  'catalog.read': { action: 'read', subject: 'Catalog' },
  'catalog.write': { action: 'write', subject: 'Catalog' },
  'workspace.read': { action: 'read', subject: 'Workspace' },
  'workspace.write': { action: 'write', subject: 'Workspace' },
  'capabilities.read': { action: 'read', subject: 'CapabilityAssignment' },
  'capabilities.write': { action: 'write', subject: 'CapabilityAssignment' },
};

export function buildCapabilityAbility(
  capabilities: readonly string[],
): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  for (const code of capabilities) {
    if (isCapabilityCode(code)) {
      const { action, subject } = CAPABILITY_RULE_MAP[code];
      can(action, subject);
    }
  }
  return build();
}

/** Minimum CASL rule required to render each protected route, keyed by route id. */
export type RouteCapabilityRequirement = readonly {
  action: CapabilityAction;
  subject: CapabilitySubject;
}[];

export const ROUTE_CAPABILITY_REQUIREMENTS: Readonly<
  Record<string, RouteCapabilityRequirement>
> = {
  '/$locale/patients/': [{ action: 'read', subject: 'Patient' }],
  '/$locale/patients/register': [{ action: 'write', subject: 'Patient' }],
  '/$locale/patients/$id': [{ action: 'read', subject: 'Patient' }],
  '/$locale/patients/$id_/encounters/$encounterId': [
    { action: 'read', subject: 'Encounter' },
  ],
  '/$locale/patients/$id_/encounters/$encounterId_/documents/$documentId': [
    { action: 'read', subject: 'ClinicalDocument' },
  ],
  '/$locale/forms/': [{ action: 'read', subject: 'Catalog' }],
  '/$locale/forms/$code/designer/': [{ action: 'write', subject: 'Catalog' }],
  '/$locale/forms/$code/designer/$draftId': [
    { action: 'write', subject: 'Catalog' },
  ],
  '/$locale/admin/': [
    // The admin hub mixes workspace and catalog sections, so either read capability grants access; each section enforces its own write capability.
    { action: 'read', subject: 'Workspace' },
    { action: 'read', subject: 'Catalog' },
  ],
  '/$locale/admin/workspace': [{ action: 'read', subject: 'Workspace' }],
  '/$locale/admin/facilities': [{ action: 'read', subject: 'Catalog' }],
  '/$locale/admin/clinical-areas': [{ action: 'read', subject: 'Catalog' }],
  '/$locale/admin/disciplines': [{ action: 'read', subject: 'Catalog' }],
  '/$locale/admin/documents': [{ action: 'read', subject: 'Catalog' }],
};

/**
 * Any single requirement in the list is enough. The array form lets routes
 * shared by multiple capability domains (e.g. the admin hub) accept either.
 */
export function canSatisfyRouteRequirement(
  requirement: RouteCapabilityRequirement | null | undefined,
  can: (action: CapabilityAction, subject: CapabilitySubject) => boolean,
): boolean {
  if (!requirement || requirement.length === 0) {
    return true;
  }
  return requirement.some(({ action, subject }) => can(action, subject));
}

export function capabilityRequirementForRoute(
  routeId: string,
): RouteCapabilityRequirement | null {
  return ROUTE_CAPABILITY_REQUIREMENTS[routeId] ?? null;
}
