import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  cancelClinicalDocument as sdkCancelClinicalDocument,
  completeClinicalDocument as sdkCompleteClinicalDocument,
  enterClinicalDocumentInError as sdkEnterClinicalDocumentInError,
  getClinicalDocument as sdkGetClinicalDocument,
  listClinicalDocuments as sdkListClinicalDocuments,
  startClinicalDocument as sdkStartClinicalDocument,
  type ClinicalDocumentDto as ClinicalDocumentDtoContract,
  type ClinicalDocumentListResponse as ClinicalDocumentListResponseContract,
  type ListClinicalDocumentsData,
} from '@/api/generated';

/**
 * Read model for a clinical document instance. Derived from the generated
 * contract type with the fields the app relies on as always-present promoted
 * to required.
 */
export type ClinicalDocumentDto = Required<ClinicalDocumentDtoContract>;
export type ClinicalDocumentListResponse =
  ClinicalDocumentListResponseContract & {
    documents: ClinicalDocumentDto[];
  };

/** Lifecycle status returned by the clinical document API. */
export type ClinicalDocumentStatus = NonNullable<
  ClinicalDocumentDtoContract['status']
>;

export type ListClinicalDocumentsParams = NonNullable<
  ListClinicalDocumentsData['query']
>;

export interface StartClinicalDocumentInput {
  documentDefinitionId: string;
  encounterId: string;
}

export interface TransitionClinicalDocumentInput {
  rowVersion: number;
  /** Required when entering a document in error. */
  reason?: string | null;
}

export async function listClinicalDocuments(
  params: ListClinicalDocumentsParams = {},
): Promise<ClinicalDocumentListResponse> {
  const { data } = await sdkListClinicalDocuments({
    query: params,
    headers: contractHeaders(),
  });
  return {
    ...data,
    documents: (data.documents ?? []).map(requireDto),
  };
}

export async function getClinicalDocument(
  id: string,
): Promise<ClinicalDocumentDto> {
  const { data } = await sdkGetClinicalDocument({
    path: { id },
    headers: contractHeaders(),
  });
  return requireDto(data);
}

/**
 * CYN-55: the contract omits `requestBody` for `POST /api/clinicalDocuments`,
 * so the generated SDK types its options `body` as `never` while the API
 * accepts the documented `StartClinicalDocumentRequest` payload below.
 */
export async function startClinicalDocument(
  input: StartClinicalDocumentInput,
): Promise<ClinicalDocumentDto> {
  const body: Record<string, unknown> = {
    documentDefinitionId: input.documentDefinitionId,
    encounterId: input.encounterId,
  };
  const { data } = await sdkStartClinicalDocument({
    headers: contractHeaders(),
    body,
  } as never);
  return requireDto(data);
}

export async function completeClinicalDocument(
  id: string,
  input: TransitionClinicalDocumentInput,
): Promise<ClinicalDocumentDto> {
  return transitionClinicalDocument(id, sdkCompleteClinicalDocument, input);
}

export async function cancelClinicalDocument(
  id: string,
  input: TransitionClinicalDocumentInput,
): Promise<ClinicalDocumentDto> {
  return transitionClinicalDocument(id, sdkCancelClinicalDocument, input);
}

export async function enterClinicalDocumentInError(
  id: string,
  input: TransitionClinicalDocumentInput,
): Promise<ClinicalDocumentDto> {
  return transitionClinicalDocument(id, sdkEnterClinicalDocumentInError, input);
}

/**
 * CYN-55: same `requestBody` gap as `startClinicalDocument` for the
 * transition endpoints (`/complete`, `/cancel`, `/enter-in-error`).
 */
async function transitionClinicalDocument(
  id: string,
  sdk: typeof sdkCompleteClinicalDocument,
  input: TransitionClinicalDocumentInput,
): Promise<ClinicalDocumentDto> {
  const body: Record<string, unknown> = {
    rowVersion: input.rowVersion,
  };
  if (input.reason !== undefined && input.reason !== null) {
    body.reason = input.reason;
  }
  const { data } = await sdk({
    path: { id },
    headers: contractHeaders(),
    body,
  } as never);
  return requireDto(data);
}

export function isForbiddenClinicalDocumentError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

export function isStaleClinicalDocumentError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function isInProgressClinicalDocument(
  status: ClinicalDocumentStatus | undefined,
): boolean {
  return status === 'inProgress';
}

export function isTerminalClinicalDocument(
  status: ClinicalDocumentStatus | undefined,
): boolean {
  return (
    status === 'completed' ||
    status === 'canceled' ||
    status === 'enteredInError'
  );
}
