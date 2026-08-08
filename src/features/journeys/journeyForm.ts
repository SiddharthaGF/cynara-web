import type { TFunction } from 'i18next';

import type {
  JourneyHistoryEvent,
  JourneyHistoryEventMetadata,
  PatientJourney,
} from '@/api/pipelines.ts';

export const JOURNEY_STATUSES: readonly string[] = [
  'running',
  'completed',
  'canceled',
  'enteredInError',
] as const;

export function formatJourneyStatus(status: string, t: TFunction): string {
  if (JOURNEY_STATUSES.includes(status)) {
    return t(`status.${status}`);
  }
  return status;
}

export function journeyStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'running': {
      return 'default';
    }
    case 'completed': {
      return 'secondary';
    }
    case 'canceled': {
      return 'outline';
    }
    case 'enteredInError': {
      return 'destructive';
    }
    default: {
      return 'outline';
    }
  }
}

export function isTerminalJourney(status: string): boolean {
  return (
    status === 'completed' ||
    status === 'canceled' ||
    status === 'enteredInError'
  );
}

export function formatJourneyDateTime(
  iso: string | null | undefined,
  language: string,
): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Parses the free-form metadata recorded on an immutable progression event.
 * Unknown or malformed payloads degrade to an empty object so the timeline
 * never crashes on a future server change.
 */
export function parseHistoryMetadata(
  event: JourneyHistoryEvent,
): JourneyHistoryEventMetadata {
  if (!event.metadataJson) {
    return {};
  }
  try {
    const parsed = JSON.parse(
      event.metadataJson,
    ) as JourneyHistoryEventMetadata;
    return parsed;
  } catch {
    return {};
  }
}

/** Human label for a node of the pinned graph, preferring the name. */
export function journeyNodeLabel(
  journey: PatientJourney,
  nodeId: string,
  t: TFunction,
): string {
  const node = journey.graph.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return nodeId;
  }
  const name = node.name?.trim();
  if (name) {
    return name;
  }
  return t(`node.unnamed`, { type: t(`node.${node.type}`) });
}

/**
 * Human label for the next step of a running care path, derived from the
 * outgoing edges of the pinned graph at the current node. Returns null for
 * terminal journeys or when the graph has no outgoing edge to suggest.
 */
export function journeyNextNodeLabel(
  journey: PatientJourney,
  t: TFunction,
): string | null {
  if (isTerminalJourney(journey.status)) {
    return null;
  }
  const edge = journey.graph.edges.find(
    (item) => item.from === journey.currentNodeId,
  );
  if (!edge) {
    return null;
  }
  return journeyNodeLabel(journey, edge.to, t);
}
