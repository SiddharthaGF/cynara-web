/**
 * Builds the one-time invitation accept link for the current frontend
 * origin. Pure helper kept outside the dialog module so the component
 * file exports only components.
 */
export function buildAcceptLink(
  origin: string,
  locale: string,
  token: string,
): string {
  return `${origin}/${locale}/invitations/accept?token=${encodeURIComponent(token)}`;
}
