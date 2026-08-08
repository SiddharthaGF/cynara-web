import { contractHeaders } from '@/api/client-runtime.ts';
import {
  ACTOR_HEADER_NAME,
  ApiError,
  DEFAULT_ACTOR_ID,
  HOSPITAL_HEADER_NAME,
  performRequest,
  resolveHospitalCode,
} from '@/api/client.ts';
import { parseFormAiStreamEvent } from '@/api/formAiStreamParser.ts';
import { resolveFormDefinitionId } from '@/api/forms.ts';
import { postFormAiChat as sdkPostFormAiChat } from '@/api/generated';
import type { FormAiChatResponse } from '@/api/generated';

export interface FormAiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Non-stream chat result. Field names mirror the generated
 * `formAiChatResponse` schema; the contract models them as optional, so the
 * app-facing shape promotes them to required like the other DTOs.
 */
export type FormAiChatResult = Required<
  Pick<
    FormAiChatResponse,
    | 'summary'
    | 'assistantMessage'
    | 'thinking'
    | 'clinicalSchemaJson'
    | 'uiSchemaJson'
    | 'rulesSchemaJson'
  >
> & {
  /**
   * Diagnostic metadata emitted by the backend. The only field we currently
   * care about is `fallback.outcome` (the honesty-net layer from B3 surfaces
   * any discarded schema parts here), but we keep the wider record so we can
   * pick up new fields without a contract change.
   */
  notes?: {
    fallback?: {
      outcome: string;
      droppedLayers?: readonly string[];
    };
  };
};

export interface FormAiChatInput {
  messages: FormAiChatMessage[];
  locale: string;
  focusedFieldIds?: string[];
  focusedFieldTypes?: string[];
  clinicalSchemaJson: string;
  uiSchemaJson: string | null;
  rulesSchemaJson: string | null;
}

export type FormAiStreamEvent =
  | { type: 'phase'; phase: 'message' | 'schema' }
  | { type: 'thinking'; delta: string }
  | { type: 'message'; delta: string }
  | { type: 'done'; result: FormAiChatResult }
  | { type: 'error'; message: string };

export interface StreamFormDraftAiOptions {
  signal?: AbortSignal;
}

export interface StreamFormDraftAiByIdOptions {
  formDefinitionId: string;
  input: FormAiChatInput;
  options?: StreamFormDraftAiOptions;
}

export interface StreamFormDraftAiByCodeOptions {
  code: string;
  input: FormAiChatInput;
  options?: StreamFormDraftAiOptions;
}

/**
 * Non-streaming chat completion over the SDK. The contract omits `requestBody`
 * for `POST /api/ai/forms/{formDefinitionId}/chat` (CYN-55), so the generated
 * SDK types the body as `never`; the payload below matches what the streaming
 * endpoint accepts, and the narrow cast bridges the typing. The chat endpoint
 * is non-resource RPC (application/json), so it overrides the JSON:API default
 * content type the transport configures for JSON:API mutations.
 */
// Public API client for the non-streaming AI chat endpoint. Kept as a facade
// Export even though the current UI drives chat through the SSE stream.
// react-doctor-disable-next-line deslop/unused-export
export async function postFormAiChat(
  formDefinitionId: string,
  input: FormAiChatInput,
): Promise<FormAiChatResult> {
  const { data } = await sdkPostFormAiChat({
    path: { formDefinitionId },
    headers: { ...contractHeaders(), 'Content-Type': 'application/json' },
    body: input,
  } as never);
  return {
    summary: data.summary ?? '',
    assistantMessage: data.assistantMessage ?? '',
    thinking: data.thinking ?? null,
    clinicalSchemaJson: data.clinicalSchemaJson ?? '',
    uiSchemaJson: data.uiSchemaJson ?? '',
    rulesSchemaJson: data.rulesSchemaJson ?? '',
  };
}

function isStreamOptions(
  value: unknown,
): value is StreamFormDraftAiByIdOptions {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.formDefinitionId === 'string';
}

function isStreamByCodeOptions(
  value: unknown,
): value is StreamFormDraftAiByCodeOptions {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string';
}

export function streamFormDraftAi(
  options: StreamFormDraftAiByIdOptions | StreamFormDraftAiByCodeOptions,
): AsyncGenerator<FormAiStreamEvent>;
/**
 * Backwards-compatible positional entry point used by the existing designer
 * streaming code: `(code, input, options)`. Prefer the object overloads so
 * the call site is self-documenting.
 */
export function streamFormDraftAi(
  code: string,
  input: FormAiChatInput,
  options?: StreamFormDraftAiOptions,
): AsyncGenerator<FormAiStreamEvent>;
export function streamFormDraftAi(
  first: string | StreamFormDraftAiByIdOptions | StreamFormDraftAiByCodeOptions,
  maybeInput?: FormAiChatInput,
  maybeOptions?: StreamFormDraftAiOptions,
): AsyncGenerator<FormAiStreamEvent> {
  if (typeof first === 'string') {
    if (!maybeInput) {
      throw new Error('streamFormDraftAi(code, input) requires input.');
    }
    return streamFromCode(first, maybeInput, maybeOptions);
  }
  if (isStreamOptions(first)) {
    return streamFromId(first.formDefinitionId, first.input, first.options);
  }
  if (isStreamByCodeOptions(first)) {
    return streamFromCode(first.code, first.input, first.options);
  }
  throw new Error(
    'streamFormDraftAi requires either a formDefinitionId or a code.',
  );
}

async function* streamFromId(
  formDefinitionId: string,
  input: FormAiChatInput,
  options: StreamFormDraftAiOptions | undefined,
): AsyncGenerator<FormAiStreamEvent> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'text/event-stream');
  headers.set(HOSPITAL_HEADER_NAME, resolveHospitalCode());
  headers.set(ACTOR_HEADER_NAME, DEFAULT_ACTOR_ID);

  const path = `/api/ai/forms/${formDefinitionId}/chat/stream`;
  const context = { path, method: 'POST', url: '' };
  const response = await performRequest(path, context, {
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
          errors?: { title?: string; detail?: string }[];
        };
        const firstError = problem.errors?.[0];
        title = firstError?.title ?? problem.title ?? title;
        detail = firstError?.detail ?? problem.detail ?? detail;
      } catch {
        detail = bodyText;
      }
    }
    throw new ApiError(response.status, title, detail);
  }

  if (!response.body) {
    throw new ApiError(500, 'Empty stream', 'AI stream returned no body.');
  }

  yield* readAiStream(response.body as ReadableStream<Uint8Array>);
}

async function* streamFromCode(
  code: string,
  input: FormAiChatInput,
  options: StreamFormDraftAiOptions | undefined,
): AsyncGenerator<FormAiStreamEvent> {
  const formDefinitionId = await resolveFormDefinitionId(code);
  yield* streamFromId(formDefinitionId, input, options);
}

async function* readAiStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<FormAiStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawTerminal = false;
  let lastAssistantDelta = '';

  const processLine = (line: string): FormAiStreamEvent | null => {
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }
    const payload = trimmed.startsWith('data:')
      ? trimmed.slice(5).trim()
      : trimmed;
    const event = parseFormAiStreamEvent(payload);
    if (!event) {
      return null;
    }
    if (event.type === 'message') {
      lastAssistantDelta = event.delta;
    }
    if (event.type === 'done' || event.type === 'error') {
      sawTerminal = true;
    }
    return event;
  };

  const processLines = (rawLines: string[]): FormAiStreamEvent[] => {
    const out: FormAiStreamEvent[] = [];
    for (const line of rawLines) {
      const ev = processLine(line);
      if (ev) {
        out.push(ev);
      }
    }
    return out;
  };

  try {
    while (true) {
      // Stream chunks must be read sequentially.
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        for (const ev of processLines(buffer.split('\n'))) {
          yield ev;
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      let terminalSeen = false;
      for (const ev of processLines(lines)) {
        yield ev;
        if (ev.type === 'done' || ev.type === 'error') {
          terminalSeen = true;
        }
      }
      if (terminalSeen) {
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!sawTerminal) {
    yield {
      type: 'done',
      result: {
        summary: '',
        assistantMessage: lastAssistantDelta,
        thinking: null,
        clinicalSchemaJson: '',
        uiSchemaJson: '',
        rulesSchemaJson: '',
      },
    };
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
