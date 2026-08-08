const CODE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

/**
 * Best-effort code generated from a human name, e.g. "Intake assessment" →
 * "intake-assessment". Returns '' when the name cannot produce a code.
 */
export function slugifyCode(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  if (!slug) {
    return '';
  }
  const prefixed = /^[0-9]/.test(slug) ? `form-${slug}` : slug;
  return CODE_PATTERN.test(prefixed) ? prefixed : '';
}
