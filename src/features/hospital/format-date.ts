const ADMIN_DATE_OPTIONS = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  // Server timestamps are UTC ISO strings; formatting in UTC keeps the rendered value identical between SSR and browser.
  timeZone: 'UTC',
} as const satisfies Intl.DateTimeFormatOptions;

const adminDateFormatters: Record<string, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat('en', ADMIN_DATE_OPTIONS),
  es: new Intl.DateTimeFormat('es', ADMIN_DATE_OPTIONS),
};

/** Formats an ISO timestamp as a locale-aware date, deterministic across SSR and client. */
export function formatAdminDate(iso: string, locale: string): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const language = locale.split('-')[0] ?? 'en';
  const formatter = adminDateFormatters[language] ?? adminDateFormatters.en;
  return formatter.format(date);
}
