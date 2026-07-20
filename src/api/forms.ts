import { ApiError, apiRequest } from '@/api/client.ts';
import type { FormSummary, FormVersion } from '@/features/forms/types.ts';

interface ApiFormSummary {
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  editableVersionId: string | null;
  editableStatus: string | null;
  editableRowVersion: number | null;
  publishedVersions: string[];
}

interface ApiFormVersion {
  id: string;
  code: string;
  version: string | null;
  status: string;
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
  contentHash: string | null;
  dependencyMetadataJson: string | null;
  rowVersion: number;
  createdAt: string;
  submittedForReviewAt: string | null;
  publishedAt: string | null;
  retiredAt: string | null;
}

function mapSummary(item: ApiFormSummary): FormSummary {
  return {
    code: item.code,
    name: item.name,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    editableVersionId: item.editableVersionId,
    editableStatus: item.editableStatus,
    editableRowVersion: item.editableRowVersion,
    publishedVersions: item.publishedVersions,
  };
}

function mapVersion(item: ApiFormVersion): FormVersion {
  return {
    id: item.id,
    code: item.code,
    version: item.version,
    status: item.status,
    clinicalSchemaJson: item.clinicalSchemaJson,
    uiSchemaJson: item.uiSchemaJson,
    rulesSchemaJson: item.rulesSchemaJson,
    contentHash: item.contentHash,
    dependencyMetadataJson: item.dependencyMetadataJson,
    rowVersion: item.rowVersion,
    createdAt: item.createdAt,
    submittedForReviewAt: item.submittedForReviewAt,
    publishedAt: item.publishedAt,
    retiredAt: item.retiredAt,
  };
}

export async function listForms(): Promise<FormSummary[]> {
  const items = await apiRequest<ApiFormSummary[]>('/api/forms');
  return items.map(mapSummary);
}

export async function createForm(input: {
  code: string;
  name: string;
  clinicalSchemaJson: string;
  uiSchemaJson?: string | null;
  rulesSchemaJson?: string | null;
}): Promise<FormSummary> {
  const created = await apiRequest<ApiFormSummary>('/api/forms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return mapSummary(created);
}

export async function getFormDraft(code: string): Promise<FormVersion> {
  const version = await apiRequest<ApiFormVersion>(`/api/forms/${code}/draft`);
  return mapVersion(version);
}

export async function updateFormDraft(
  code: string,
  input: {
    clinicalSchemaJson: string;
    uiSchemaJson: string | null;
    rulesSchemaJson: string | null;
    rowVersion: number;
  },
): Promise<FormVersion> {
  const version = await apiRequest<ApiFormVersion>(`/api/forms/${code}/draft`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return mapVersion(version);
}

export interface FormAiStatus {
  configured: boolean;
  model: string | null;
  baseUrlConfigured: boolean;
}

export interface FormAiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface FormAiChatResult {
  summary: string;
  assistantMessage: string;
  thinking: string | null;
  clinicalSchemaJson: string;
  uiSchemaJson: string;
  rulesSchemaJson: string;
}

export async function getFormAiStatus(): Promise<FormAiStatus> {
  const status = await apiRequest<FormAiStatus>('/api/ai/status');
  return status;
}

export interface FormAiChatInput {
  messages: FormAiChatMessage[];
  locale: string;
  /** Field ids cited with @ in the latest user message. */
  focusedFieldIds?: string[];
  /** Field types cited with # (e.g. text, textarea). */
  focusedFieldTypes?: string[];
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
}

export type FormAiStreamEvent =
  | { type: 'thinking'; delta: string }
  | { type: 'message'; delta: string }
  | { type: 'done'; result: FormAiChatResult }
  | { type: 'error'; message: string };

export async function chatFormDraftAi(
  code: string,
  input: FormAiChatInput,
  options?: { signal?: AbortSignal },
): Promise<FormAiChatResult> {
  const result = await apiRequest<FormAiChatResult>(
    `/api/forms/${code}/draft/ai-chat`,
    {
      method: 'POST',
      body: JSON.stringify(input),
      signal: options?.signal,
    },
  );
  return result;
}

/** ChatGPT-style SSE: thinking/message deltas, then done with schemas. */
export async function* streamFormDraftAi(
  code: string,
  input: FormAiChatInput,
  options?: { signal?: AbortSignal },
): AsyncGenerator<FormAiStreamEvent> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('X-Actor-Id', 'designer-user');
  headers.set('Accept', 'text/event-stream');

  const response = await fetch(`/api/forms/${code}/draft/ai-chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
    signal: options?.signal,
  });

  if (!response.ok) {
    let title = response.statusText;
    let detail = `Request failed with status ${response.status}`;
    const bodyText = await response.text();
    if (bodyText) {
      try {
        const problem = JSON.parse(bodyText) as {
          title?: string;
          detail?: string;
        };
        title = problem.title ?? title;
        detail = problem.detail ?? detail;
      } catch {
        detail = bodyText;
      }
    }
    throw new ApiError(response.status, title, detail);
  }

  if (!response.body) {
    throw new ApiError(500, 'Empty stream', 'AI stream returned no body.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') {
          continue;
        }
        let event: FormAiStreamEvent;
        try {
          event = JSON.parse(data) as FormAiStreamEvent;
        } catch {
          continue;
        }
        yield event;
        if (event.type === 'done' || event.type === 'error') {
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function isRequestAborted(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  return false;
}
