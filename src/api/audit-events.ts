import { apiRequest, type ApiRequestInit } from '@/api/client.ts';
import {
  buildPaginatedQuery,
  jsonApiGetCollection,
  attrString,
  JSON_API_MEDIA,
  type JsonApiResource,
} from '@/api/json-api.ts';

export const AUDIT_EVENTS = 'auditEvents';

export interface AuditEvent {
  id: string;
  resourceType: string;
  resourceId: string;
  action: string;
  actorId: string | null;
  occurredAt: string;
  metadataJson: string | null;
}

interface AuditEventAttributes {
  resourceType?: string;
  resourceId?: string;
  action?: string;
  actorId?: string | null;
  occurredAt?: string;
  metadataJson?: string | null;
}

function readNullableString(attributes: object, name: string): string | null {
  const value = (attributes as Record<string, unknown>)[name];
  if (value === null) {
    return null;
  }
  return typeof value === 'string' ? value : null;
}

function mapResource(
  resource: JsonApiResource<AuditEventAttributes>,
): AuditEvent {
  return {
    id: resource.id,
    resourceType: attrString(resource.attributes, 'resourceType') ?? '',
    resourceId: attrString(resource.attributes, 'resourceId') ?? '',
    action: attrString(resource.attributes, 'action') ?? '',
    actorId: readNullableString(resource.attributes, 'actorId'),
    occurredAt: attrString(resource.attributes, 'occurredAt') ?? '',
    metadataJson: readNullableString(resource.attributes, 'metadataJson'),
  };
}

export interface ListAuditEventsOptions {
  resourceType?: string;
  resourceId?: string;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
  include?: readonly string[];
}

/**
 * `auditEvents` is a read-only resource from the frontend's perspective. The
 * JSON:API contract still exposes POST/PATCH/DELETE verbs, but per the
 * backend's audit policy we MUST NOT wire them up here. Audit entries are
 * written exclusively by the cynara-api service layer in response to other
 * actions. If a future use case legitimately requires writing audit events
 * from the web client, expose a dedicated thin wrapper after a security
 * review.
 */

export async function listAuditEvents(
  options: ListAuditEventsOptions = {},
): Promise<AuditEvent[]> {
  const filters: Record<string, string | number | boolean | undefined> = {};
  if (options.resourceType) {
    filters.resourceType = options.resourceType;
  }
  if (options.resourceId) {
    filters.resourceId = options.resourceId;
  }
  const query = buildPaginatedQuery({
    include: options.include,
    filters,
    sort: options.sort ?? '-occurredAt',
    pageSize: options.pageSize,
    pageNumber: options.pageNumber,
  });
  const { data } = await jsonApiGetCollection<AuditEventAttributes>(
    `/api/${AUDIT_EVENTS}?${query}`,
  );
  return data.map((resource) => mapResource(resource));
}

export interface GetAuditEventOptions {
  etag?: string | null;
}

export async function getAuditEvent(
  id: string,
  options: GetAuditEventOptions = {},
): Promise<AuditEvent> {
  const init: ApiRequestInit = {
    headers: { Accept: JSON_API_MEDIA },
  };
  if (options.etag) {
    init.etag = options.etag;
  }
  const document = await apiRequest<{
    data:
      | JsonApiResource<AuditEventAttributes>
      | JsonApiResource<AuditEventAttributes>[];
  }>(`/api/${AUDIT_EVENTS}/${id}`, init);
  const resource = selectSingle(document.data, id);
  return mapResource(resource);
}

function selectSingle(
  data:
    | JsonApiResource<AuditEventAttributes>
    | JsonApiResource<AuditEventAttributes>[]
    | undefined,
  fallbackId: string,
): JsonApiResource<AuditEventAttributes> {
  if (Array.isArray(data)) {
    const [candidate] = data;
    if (!candidate) {
      throw new Error(`AuditEvent '${fallbackId}' was not found.`);
    }
    return candidate;
  }
  if (!data) {
    throw new Error(`AuditEvent '${fallbackId}' was not found.`);
  }
  return data;
}

export type { AuditEventAttributes };
