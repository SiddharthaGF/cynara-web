import { afterEach, describe, expect, it, vi } from 'vitest';

import { stubFetchWithCapture } from '@/api/__tests__/hospital-test-utils.ts';
import { streamFormDraftAi } from '@/api/form-ai-chat.ts';

function sseDoneResponse(): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          [
            'data: {"type":"done","result":{',
            '"summary":"ok",',
            '"assistantMessage":"Hola",',
            '"thinking":null,',
            '"clinicalSchemaJson":"{}",',
            '"uiSchemaJson":"",',
            '"rulesSchemaJson":""',
            '}}\n\n',
          ].join(''),
        ),
      );
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('form AI chat streaming', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends tenant and actor headers on the SSE request', async () => {
    const captured = stubFetchWithCapture(() => sseDoneResponse());

    const eventTypes: string[] = [];
    const stream = streamFormDraftAi({
      formDefinitionId: 'form-1',
      input: {
        messages: [{ role: 'user', content: 'Agrega un campo' }],
        locale: 'es',
        clinicalSchemaJson: '{}',
        uiSchemaJson: null,
        rulesSchemaJson: null,
      },
    });
    for await (const event of stream) {
      eventTypes.push(event.type);
    }

    expect(captured.method).toBe('POST');
    expect(captured.url).toContain('/api/ai/forms/form-1/chat/stream');
    expect(captured.headers.get('X-Hospital-Code')).toBe('test-hospital');
    expect(captured.headers.get('X-Actor-Id')).toBe('designer-user');
    expect(eventTypes).toStrictEqual(['done']);
  });
});
