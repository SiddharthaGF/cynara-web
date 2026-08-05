import { ApiError, performRequest } from '@/api/client.ts';
import { resolveFormDefinitionId } from '@/api/forms.ts';

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
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof value[key] === 'string') {
      return value[key];
    }
  }
  return '';
}

function readNullableString(
  value: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string') {
      return candidate;
    }
    if (candidate === null) {
      return null;
    }
  }
  return null;
}

function readNotes(
  result: Record<string, unknown>,
): FormAiChatResult['notes'] | undefined {
  const candidate = result.notes ?? result.Notes;
  if (!isRecord(candidate)) {
    return undefined;
  }
  const { fallback } = candidate;
  if (!isRecord(fallback)) {
    return Object.keys(candidate).length > 0 ? {} : undefined;
  }
  const outcome = readString(fallback, 'outcome', 'Outcome');
  const droppedLayersRaw = fallback.droppedLayers ?? fallback.DroppedLayers;
  const droppedLayers = Array.isArray(droppedLayersRaw)
    ? droppedLayersRaw.filter(
        (item): item is string => typeof item === 'string',
      )
    : undefined;
  return {
    fallback: {
      outcome: outcome.length > 0 ? outcome : 'unknown',
      droppedLayers,
    },
  };
}

function parseFormAiStreamEvent(data: string): FormAiStreamEvent | null {
  if (!data || data === '[DONE]') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(data);
    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      return null;
    }

    if (parsed.type === 'phase') {
      if (parsed.phase === 'message' || parsed.phase === 'schema') {
        return { type: 'phase', phase: parsed.phase };
      }
      return null;
    }
    if (parsed.type === 'thinking' || parsed.type === 'message') {
      return typeof parsed.delta === 'string'
        ? { type: parsed.type, delta: parsed.delta }
        : null;
    }
    if (parsed.type === 'error') {
      return typeof parsed.message === 'string'
        ? { type: 'error', message: parsed.message }
        : null;
    }
    if (parsed.type === 'done' && isRecord(parsed.result)) {
      const result = {
        summary: readString(parsed.result, 'summary', 'Summary'),
        assistantMessage: readString(
          parsed.result,
          'assistantMessage',
          'AssistantMessage',
        ),
        thinking: readNullableString(parsed.result, 'thinking', 'Thinking'),
        clinicalSchemaJson: readString(
          parsed.result,
          'clinicalSchemaJson',
          'ClinicalSchemaJson',
        ),
        uiSchemaJson: readString(parsed.result, 'uiSchemaJson', 'UiSchemaJson'),
        rulesSchemaJson: readString(
          parsed.result,
          'rulesSchemaJson',
          'RulesSchemaJson',
        ),
        notes: readNotes(parsed.result),
      };
      return { type: 'done', result };
    }
  } catch {
    return null;
  }
  return null;
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
