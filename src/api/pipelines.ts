import { contractHeaders } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  getPipelineJourney as sdkGetPipelineJourney,
  type JourneyDto as JourneyDtoContract,
  type PipelineHistoryDto as PipelineHistoryDtoContract,
} from '@/api/generated';

/**
 * Projection of one node of the pinned workflow graph. Conditions are omitted;
 * the branch taken is recorded in the progression history.
 */
export interface JourneyGraphNode {
  id: string;
  type: string;
  name: string | null;
}

/** Projection of one edge of the pinned workflow graph. */
export interface JourneyGraphEdge {
  from: string;
  to: string;
  label: string | null;
}

/**
 * The workflow graph exactly as pinned at pipeline start, projected from the
 * immutable published version for historical rendering.
 */
export interface JourneyGraph {
  nodes: JourneyGraphNode[];
  edges: JourneyGraphEdge[];
}

/** One append-only progression event on a pipeline. */
export interface JourneyHistoryEvent {
  id: string;
  pipelineId: string;
  sequence: number;
  action: string;
  actorId: string | null;
  occurredAt: string;
  metadataJson: string | null;
}

/**
 * Typed view of the free-form metadata recorded on a progression event.
 * Not every event carries every field; the server appends the fields that
 * describe the transition that just happened.
 */
export interface JourneyHistoryEventMetadata {
  workflowCode?: string;
  workflowVersion?: string;
  workflowVersionId?: string;
  subjectType?: string;
  subjectId?: string;
  patientId?: string;
  encounterId?: string | null;
  currentNodeId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  edgeLabel?: string | null;
  reason?: string | null;
}

/**
 * One patient journey: a pipeline bound to a patient or encounter record,
 * rendered from the exact published workflow version at start time with the
 * immutable progression history.
 */
export interface PatientJourney {
  pipelineId: string;
  workflowCode: string;
  workflowVersion: string;
  workflowVersionId: string;
  workflowSchemaVersion: string;
  subjectType: string;
  subjectId: string;
  patientId: string;
  encounterId: string | null;
  status: string;
  currentNodeId: string;
  startedAt: string;
  endedAt: string | null;
  graph: JourneyGraph;
  history: JourneyHistoryEvent[];
}

/** The full pipeline journey for one patient record, ordered by start time. */
export interface PatientJourneyResponse {
  patientId: string;
  journeys: PatientJourney[];
}

/** The full pipeline journey for one encounter, ordered by start time. */
export interface EncounterJourneyResponse {
  encounterId: string;
  journeys: PatientJourney[];
}

function mapJourney(dto: JourneyDtoContract): PatientJourney {
  return {
    pipelineId: dto.pipelineId ?? '',
    workflowCode: dto.workflowCode ?? '',
    workflowVersion: dto.workflowVersion ?? '',
    workflowVersionId: dto.workflowVersionId ?? '',
    workflowSchemaVersion: dto.workflowSchemaVersion ?? '',
    subjectType: dto.subjectType ?? '',
    subjectId: dto.subjectId ?? '',
    patientId: dto.patientId ?? '',
    encounterId: dto.encounterId ?? null,
    status: dto.status ?? '',
    currentNodeId: dto.currentNodeId ?? '',
    startedAt: dto.startedAt ?? '',
    endedAt: dto.endedAt ?? null,
    graph: {
      nodes: (dto.graph?.nodes ?? []).map((node) => ({
        id: node.id ?? '',
        type: node.type ?? '',
        name: node.name ?? null,
      })),
      edges: (dto.graph?.edges ?? []).map((edge) => ({
        from: edge.from ?? '',
        to: edge.to ?? '',
        label: edge.label ?? null,
      })),
    },
    // The API orders history by sequence; keep the wire order as-is.
    history: (dto.history ?? []).map(mapHistoryEvent),
  };
}

function mapHistoryEvent(dto: PipelineHistoryDtoContract): JourneyHistoryEvent {
  return {
    id: dto.id ?? '',
    pipelineId: dto.pipelineId ?? '',
    sequence: dto.sequence ?? 0,
    action: dto.action ?? '',
    actorId: dto.actorId ?? null,
    occurredAt: dto.occurredAt ?? '',
    metadataJson: dto.metadataJson ?? null,
  };
}

/**
 * Fetches the pipeline journey for a patient record. The response includes
 * patient-bound pipelines as well as pipelines bound to the patient's
 * encounters, ordered by start time.
 */
export async function getPatientJourney(
  patientId: string,
): Promise<PatientJourneyResponse> {
  const { data } = await sdkGetPipelineJourney({
    query: { patientId },
    headers: contractHeaders(),
  });
  return {
    patientId: data.patientId ?? '',
    journeys: (data.journeys ?? []).map(mapJourney),
  };
}

/**
 * Fetches the pipeline journey for a single encounter. The contract models
 * the patient response shape, so the returned subject id is taken from the
 * request rather than the wire payload.
 */
export async function getEncounterJourney(
  encounterId: string,
): Promise<EncounterJourneyResponse> {
  const { data } = await sdkGetPipelineJourney({
    query: { encounterId },
    headers: contractHeaders(),
  });
  return {
    encounterId,
    journeys: (data.journeys ?? []).map(mapJourney),
  };
}

export function isForbiddenPipelineError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}
