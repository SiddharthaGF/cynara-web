const SIDEBAR_COOKIE_NAME = 'sidebar_state';

export function parseSidebarStateCookie(
  cookieHeader: string | null,
  defaultOpen = true,
): boolean {
  if (!cookieHeader) {
    return defaultOpen;
  }

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SIDEBAR_COOKIE_NAME}=`));

  if (!cookie) {
    return defaultOpen;
  }

  const value = cookie.slice(SIDEBAR_COOKIE_NAME.length + 1);
  return value === 'true' || (value !== 'false' && defaultOpen);
}
