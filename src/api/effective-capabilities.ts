import {
  ACTOR_HEADER_NAME,
  ApiError,
  DEFAULT_ACTOR_ID,
  HOSPITAL_HEADER_NAME,
  apiRequest,
  resolveHospitalCode,
} from '@/api/client.ts';
import { JSON_API_MEDIA } from '@/api/json-api.ts';

/** Effective capability set for the current actor within the resolved hospital. */
export interface EffectiveCapabilitiesDto {
  actorId: string | null;
  capabilities: string[];
}

function capabilitiesHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  headers.set('Accept', JSON_API_MEDIA);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', JSON_API_MEDIA);
  }
  if (!headers.has(HOSPITAL_HEADER_NAME)) {
    headers.set(HOSPITAL_HEADER_NAME, resolveHospitalCode());
  }
  if (!headers.has(ACTOR_HEADER_NAME)) {
    headers.set(ACTOR_HEADER_NAME, DEFAULT_ACTOR_ID);
  }
  return headers;
}

export async function getEffectiveCapabilities(): Promise<EffectiveCapabilitiesDto> {
  return apiRequest<EffectiveCapabilitiesDto>('/api/me/capabilities', {
    headers: capabilitiesHeaders(),
  });
}

export function isCapabilitiesForbiddenError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}
