import type {
  FormAiChatResult,
  FormAiStreamEvent,
} from '@/api/form-ai-chat.ts';

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

export function parseFormAiStreamEvent(data: string): FormAiStreamEvent | null {
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
