import type { APIRequestContext, Page } from '@playwright/test';

import {
  APPLIED_CLINICAL,
  APPLIED_RULES,
  APPLIED_UI,
  ASSISTANT_MESSAGE,
  ASSISTANT_SUMMARY,
  INITIAL_CLINICAL,
  INITIAL_RULES,
  INITIAL_UI,
} from './form-schemas.ts';

const JSON_API = 'application/vnd.api+json';
const ACTOR = 'designer-user';

function sseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** Build the mocked AI chat SSE body (deterministic schema apply). */
export function buildMockAiChatSse(): string {
  return [
    sseEvent({ phase: 'message', type: 'phase' }),
    sseEvent({ delta: ASSISTANT_MESSAGE, type: 'message' }),
    sseEvent({ phase: 'schema', type: 'phase' }),
    sseEvent({
      result: {
        assistantMessage: ASSISTANT_MESSAGE,
        clinicalSchemaJson: JSON.stringify(APPLIED_CLINICAL),
        rulesSchemaJson: JSON.stringify(APPLIED_RULES),
        summary: ASSISTANT_SUMMARY,
        thinking: null,
        uiSchemaJson: JSON.stringify(APPLIED_UI),
      },
      type: 'done',
    }),
  ].join('');
}

/**
 * Intercept only the AI chat stream. Forms CRUD, draft load, and autosave
 * still hit the real cynara-api via the Vite proxy.
 */
export async function mockAiChatStream(page: Page): Promise<void> {
  // The chat composer is gated on `GET /api/ai/status` reporting the provider
  // As configured. The seeded API deliberately has no API key, so stub the
  // Status to keep the flow deterministic (the stream itself is already
  // Mocked below).
  await page.route('**/api/ai/status', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        apiKeyConfigured: true,
        apiKeyMasked: '****',
        baseUrl: 'https://api.openai.com/v1',
        baseUrlConfigured: true,
        configured: true,
        jsonObject: true,
        model: 'gpt-4o-mini',
        source: 'database',
      }),
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  });

  const body = buildMockAiChatSse();
  await page.route('**/api/ai/forms/*/chat/stream', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      body,
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
      },
      status: 200,
    });
  });
}

export interface CreatedForm {
  code: string;
  definitionId: string;
}

/** Create a unique draft form against the real API. */
export async function createFormViaApi(
  request: APIRequestContext,
  baseURL: string,
): Promise<CreatedForm> {
  const apiOrigin = process.env.VITE_API_ORIGIN?.replace(/\/$/u, '') || baseURL;
  const code = `e2e-ai-${Date.now()}`;
  const response = await request.post(`${apiOrigin}/api/formDefinitions`, {
    data: {
      data: {
        attributes: {
          code,
          initialClinicalSchemaJson: JSON.stringify(INITIAL_CLINICAL),
          initialRulesSchemaJson: JSON.stringify(INITIAL_RULES),
          initialUiSchemaJson: JSON.stringify(INITIAL_UI),
          name: `E2E AI chat ${code}`,
        },
        type: 'formDefinitions',
      },
    },
    headers: {
      'Accept': JSON_API,
      'Content-Type': JSON_API,
      'X-Actor-Id': ACTOR,
      'X-Hospital-Code': process.env.VITE_HOSPITAL_CODE ?? 'default',
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create form (${response.status()}): ${await response.text()}`,
    );
  }

  const document = (await response.json()) as {
    data?: { id?: string };
  };
  const definitionId = document.data?.id;
  if (!definitionId) {
    throw new Error('createFormViaApi: missing form definition id');
  }

  return { code, definitionId };
}
