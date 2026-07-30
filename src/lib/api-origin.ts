import { createIsomorphicFn } from '@tanstack/react-start';

interface ApiOriginCandidate {
  readonly name: string;
  readonly value: string | undefined;
}

const EMPTY_STRING_LENGTH = 0;
const TENANT_FALLBACK = 'default';

export class ApiOriginUnavailableError extends Error {
  public readonly candidates: readonly ApiOriginCandidate[];

  public constructor(candidates: readonly ApiOriginCandidate[]) {
    const seen = candidates
      .map(({ name, value }) => `${name}=${JSON.stringify(value)}`)
      .join(', ');

    super(
      [
        'Cannot resolve the cynara-api origin: VITE_API_ORIGIN is not set.',
        `Observed: ${seen}`,
        '',
        'To fix:',
        '  - Local dev: copy .env.example to .env (or set VITE_API_ORIGIN ' +
          'directly).',
        '  - Production: set VITE_API_ORIGIN at build time.',
      ].join('\n'),
    );

    this.name = 'ApiOriginUnavailableError';
    this.candidates = candidates;
  }
}

function normalizeOrigin(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === EMPTY_STRING_LENGTH) {
    return undefined;
  }
  return trimmed.replace(/\/$/u, '');
}

function resolveApiOriginServer(): string | undefined {
  const cloudflareEnv = (
    globalThis as { Cloudflare?: { env?: { VITE_API_ORIGIN?: string } } }
  ).Cloudflare?.env?.VITE_API_ORIGIN;
  if (cloudflareEnv !== undefined) {
    return normalizeOrigin(cloudflareEnv);
  }
  const nodeEnv = (
    globalThis as { process?: { env?: { VITE_API_ORIGIN?: string } } }
  ).process?.env?.VITE_API_ORIGIN;
  return normalizeOrigin(nodeEnv);
}

function resolveApiOriginClient(): string | undefined {
  const raw: string | undefined = import.meta.env.VITE_API_ORIGIN;
  return normalizeOrigin(raw);
}

const resolveApiOrigin = createIsomorphicFn()
  .server(resolveApiOriginServer)
  .client(resolveApiOriginClient);

function resolveHospitalCodeServer(): string | undefined {
  const cloudflareEnv = (
    globalThis as { Cloudflare?: { env?: { VITE_HOSPITAL_CODE?: string } } }
  ).Cloudflare?.env?.VITE_HOSPITAL_CODE;
  if (cloudflareEnv !== undefined) {
    return normalizeOrigin(cloudflareEnv);
  }
  const nodeEnv = (
    globalThis as { process?: { env?: { VITE_HOSPITAL_CODE?: string } } }
  ).process?.env?.VITE_HOSPITAL_CODE;
  return normalizeOrigin(nodeEnv);
}

function resolveHospitalCodeClient(): string | undefined {
  const raw: string | undefined = import.meta.env.VITE_HOSPITAL_CODE;
  return normalizeOrigin(raw);
}

const resolveHospitalCodeOrigin = createIsomorphicFn()
  .server(resolveHospitalCodeServer)
  .client(resolveHospitalCodeClient);

export function getApiOrigin(): string {
  const candidate = resolveApiOrigin();
  const seen: ApiOriginCandidate[] = [
    {
      name: 'env.VITE_API_ORIGIN',
      value: candidate,
    },
  ];
  if (candidate) {
    return candidate;
  }
  throw new ApiOriginUnavailableError(seen);
}

export function buildApiUrl(path: string): string {
  return new URL(path, `${getApiOrigin()}/`).href;
}

export function resolveHospitalCode(): string {
  return resolveHospitalCodeOrigin() ?? TENANT_FALLBACK;
}
