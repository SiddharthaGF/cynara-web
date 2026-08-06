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

export type CapabilitySubject =
  | 'Patient'
  | 'Encounter'
  | 'ClinicalDocument'
  | 'FormResponse'
  | 'AuditEvent'
  | 'Form'
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
  'catalog.read': { action: 'read', subject: 'Form' },
  'catalog.write': { action: 'write', subject: 'Form' },
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
export const ROUTE_CAPABILITY_REQUIREMENTS: Readonly<
  Record<string, { action: CapabilityAction; subject: CapabilitySubject }>
> = {
  '/$locale/patients/': { action: 'read', subject: 'Patient' },
  '/$locale/patients/register': { action: 'write', subject: 'Patient' },
  '/$locale/patients/$id': { action: 'read', subject: 'Patient' },
  '/$locale/patients/$id_/encounters/$encounterId': {
    action: 'read',
    subject: 'Encounter',
  },
  '/$locale/forms/': { action: 'read', subject: 'Form' },
  '/$locale/forms/$code/designer/': { action: 'write', subject: 'Form' },
  '/$locale/forms/$code/designer/$draftId': {
    action: 'write',
    subject: 'Form',
  },
};

export function capabilityRequirementForRoute(
  routeId: string,
): { action: CapabilityAction; subject: CapabilitySubject } | null {
  return ROUTE_CAPABILITY_REQUIREMENTS[routeId] ?? null;
}
