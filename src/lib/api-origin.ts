interface ApiOriginCandidate {
  readonly name: string;
  readonly value: string | undefined;
}

const API_ORIGIN_CANDIDATES: readonly ApiOriginCandidate[] = [
  { name: 'VITE_API_ORIGIN', value: import.meta.env.VITE_API_ORIGIN },
  { name: 'API_ORIGIN', value: import.meta.env.API_ORIGIN },
];

export class ApiOriginUnavailableError extends Error {
  public readonly candidates: readonly ApiOriginCandidate[];

  public constructor(candidates: readonly ApiOriginCandidate[]) {
    const seen = candidates
      .map(({ name, value }) => `${name}=${JSON.stringify(value)}`)
      .join(', ');

    super(
      [
        'Cannot resolve the cynara-api origin: no VITE_API_ORIGIN or API_ORIGIN ' +
          'is set for this environment.',
        `Observed: ${seen}`,
        '',
        'To fix:',
        '  - Local dev: set VITE_API_ORIGIN in .env (see .env.example) or ' +
          'export it in your shell before `pnpm dev` / `pnpm build`.',
        '  - Production / preview: set the [vars] block in wrangler.toml or ' +
          'a Cloudflare build variable.',
        '  - See docs/local-development.md for the full setup walkthrough.',
      ].join('\n'),
    );

    this.name = 'ApiOriginUnavailableError';
    this.candidates = candidates;
  }
}

export function getApiOrigin(): string {
  for (const candidate of API_ORIGIN_CANDIDATES) {
    const { value } = candidate;
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim().replace(/\/$/u, '');
    }
  }
  throw new ApiOriginUnavailableError(API_ORIGIN_CANDIDATES);
}

export function buildApiUrl(path: string): string {
  return new URL(path, `${getApiOrigin()}/`).href;
}
