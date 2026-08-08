const CODE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

/**
 * Strips accents and other combining marks so accented names produce clean
 * slugs ("Evaluación de dolor" → "evaluacion-de-dolor" instead of
 * "evaluaci-n-de-dolor"). NFD separates the base letter from the combining
 * mark; removing the marks keeps the letter.
 */
function stripDiacritics(value: string): string {
  return value.normalize('NFD').replaceAll(/\p{M}/gu, '');
}

/**
 * Best-effort code generated from a human name, e.g. "Intake assessment" →
 * "intake-assessment". Returns '' when the name cannot produce a code.
 */
export function slugifyCode(value: string): string {
  const slug = stripDiacritics(value)
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
