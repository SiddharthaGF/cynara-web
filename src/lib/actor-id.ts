/**
 * Slug a human name into a stable internal identifier. Mirrors the format
 * the platform already uses elsewhere (lowercase, dot or dash between
 * tokens, no diacritics). Empty when the name has no usable letters or
 * digits, so callers can fall back to the email username.
 *
 * Examples:
 *   "Juan Pérez"        -> "juan.perez"
 *   "  María José  "    -> "maria.jose"
 *   "Aïda López-Smith"  -> "aida.lopez-smith"
 *   "---"               -> ""
 */
export function slugifyActorId(value: string): string {
  const slug = value
    .normalize('NFD')
    .replaceAll(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return slug;
}

/**
 * Derive the default actor id from an email address: the sanitized
 * local-part (before the "@"). Empty when the email has no usable
 * local-part yet (e.g. while the admin is still typing).
 *
 * Examples:
 *   "Juan.Perez@hospital.dev" -> "juan.perez"
 *   "aida_99@x.org"           -> "aida-99"
 *   "not-an-email"            -> "not-an-email"
 *   ""                        -> ""
 *
 * The result is a suggestion only; the admin can always override the input.
 */
export function deriveActorIdFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  return slugifyActorId(local);
}
