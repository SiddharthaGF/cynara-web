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
    super(`Server unavailable (env: ${seen})`);
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
