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
    sseEvent({ type: 'phase', phase: 'message' }),
    sseEvent({ type: 'message', delta: ASSISTANT_MESSAGE }),
    sseEvent({ type: 'phase', phase: 'schema' }),
    sseEvent({
      type: 'done',
      result: {
        summary: ASSISTANT_SUMMARY,
        assistantMessage: ASSISTANT_MESSAGE,
        thinking: null,
        clinicalSchemaJson: JSON.stringify(APPLIED_CLINICAL),
        uiSchemaJson: JSON.stringify(APPLIED_UI),
        rulesSchemaJson: JSON.stringify(APPLIED_RULES),
      },
    }),
  ].join('');
}

/**
 * Intercept only the AI chat stream. Forms CRUD, draft load, and autosave
 * still hit the real cynara-api via the Vite proxy.
 */
export async function mockAiChatStream(page: Page): Promise<void> {
  const body = buildMockAiChatSse();
  await page.route('**/api/ai/forms/*/chat/stream', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
      body,
    });
  });
}

export interface CreatedForm {
  code: string;
  definitionId: string;
}

/** Create a unique draft form against the real API (through the Vite proxy). */
export async function createFormViaApi(
  request: APIRequestContext,
  baseURL: string,
): Promise<CreatedForm> {
  const code = `e2e-ai-${Date.now()}`;
  const response = await request.post(`${baseURL}/api/formDefinitions`, {
    headers: {
      Accept: JSON_API,
      'Content-Type': JSON_API,
      'X-Actor-Id': ACTOR,
    },
    data: {
      data: {
        type: 'formDefinitions',
        attributes: {
          code,
          name: `E2E AI chat ${code}`,
          initialClinicalSchemaJson: JSON.stringify(INITIAL_CLINICAL),
          initialUiSchemaJson: JSON.stringify(INITIAL_UI),
          initialRulesSchemaJson: JSON.stringify(INITIAL_RULES),
        },
      },
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
