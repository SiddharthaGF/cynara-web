export type SectionId = 'presentation' | 'clinical' | 'rules';

const SECTION_IDS: readonly SectionId[] = [
  'presentation',
  'clinical',
  'rules',
] as const;

export function isSectionId(value: unknown): value is SectionId {
  return SECTION_IDS.includes(value as SectionId);
}
