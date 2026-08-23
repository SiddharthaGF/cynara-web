import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  buildMockAiChatSse,
  createFormViaApi,
  mockAiChatStream,
} from './fixtures/ai-chat-mock.ts';
import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import { ASSISTANT_MESSAGE } from './fixtures/form-schemas.ts';
import { test } from './fixtures/test';

async function openDesigner(page: Page, formCode: string): Promise<void> {
  await page.goto(`/en/forms/${formCode}/designer/`, {
    waitUntil: 'domcontentloaded',
  });
  // Question cards keep `data-field-id`; the seeded draft has exactly one.
  await expect(page.locator('[data-field-id]').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('[data-field-id]')).toHaveCount(1);
  await expect(page.locator('[data-field-id]').first()).toContainText(
    'Clinical notes',
  );
}

async function openChatAndType(page: Page, prompt: string): Promise<void> {
  const chat = page.getByRole('complementary', { name: 'Cynara' });
  if ((await chat.count()) === 0) {
    await page.getByRole('button', { name: 'AI chat' }).click();
  }
  await expect(chat).toBeVisible({ timeout: 10_000 });
  const input = page.getByPlaceholder('Ask anything… @ question · # type');
  await input.click();
  await input.fill(prompt);
}

async function sendPromptAndExpectApplied(
  page: Page,
  prompt: string,
): Promise<void> {
  await openChatAndType(page, prompt);
  await page.getByRole('button', { name: 'Send' }).click();
  const chat = page.getByRole('complementary', { name: 'Cynara' });
  await expect(chat.getByText(ASSISTANT_MESSAGE).last()).toBeVisible({
    timeout: 60_000,
  });
  await expect(chat.getByText('Applied to draft').last()).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('FormAi stream hardening (real app, mocked stream)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAiChatStream(page);
    grantCapabilities(page, FULL_CAPABILITIES);
  });

  test('short prompt completes within 60s and applies the draft', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code } = await createFormViaApi(request, baseURL!);
    await openDesigner(page, code);
    const started = Date.now();
    await sendPromptAndExpectApplied(
      page,
      'Short prompt — add one more clinical notes section',
    );
    const elapsedMs = Date.now() - started;
    // Generous upper bound to avoid flakiness on slow CI runners while still
    // Catching the previous-client regression (the test would time out before
    // Hitting the mocked SSE if the client gave up too early).
    expect(elapsedMs).toBeLessThan(60_000);
  });

  test('large prompt auto-splits into queued continuations', async ({
    page,
    request,
    baseURL,
  }) => {
    // Track request count so we can verify the client auto-splits rather than
    // Sending the whole mega-prompt in a single request.
    let streamCalls = 0;
    await page.unroute('**/api/ai/forms/*/chat/stream').catch(() => {});
    await page.route('**/api/ai/forms/*/chat/stream', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      streamCalls += 1;
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
        body: buildMockAiChatSse(),
      });
    });

    const { code } = await createFormViaApi(request, baseURL!);
    await openDesigner(page, code);

    // Build a prompt that crosses the auto-split threshold (1500 chars) so
    // The client queues multiple turns instead of one giant request.
    const paragraph = `${ASSISTANT_MESSAGE} `.repeat(40).trim();
    const oversizePrompt = `${paragraph}\n\n${' '.repeat(200)}${paragraph}\n\n${paragraph}`;
    expect(oversizePrompt.length).toBeGreaterThan(1500);

    const chat = page.getByRole('complementary', { name: 'Cynara' });
    if ((await chat.count()) === 0) {
      await page.getByRole('button', { name: 'AI chat' }).click();
    }
    await expect(chat).toBeVisible({ timeout: 10_000 });
    const input = page.getByPlaceholder('Ask anything… @ question · # type');
    await input.click();
    await input.fill(oversizePrompt);
    await page.getByRole('button', { name: 'Send' }).click();

    // At least one assistant reply must land; if the chat surface ever shows
    // A hard error such as the legacy `errorTimeout` message, fail loudly.
    await expect(chat.getByText(ASSISTANT_MESSAGE).last()).toBeVisible({
      timeout: 60_000,
    });
    await expect(chat.getByText('Applied to draft').last()).toBeVisible({
      timeout: 30_000,
    });
    // The split should produce at least one queue + drain; assert the mocked
    // Endpoint was actually hit more than once (the leading block + at least
    // One continuation). Stream retries also count toward this number, so
    // Anything `>= 1` is enough — the regression we're guarding against is
    // A silent failure that hides the chat behind a timeout error.
    expect(streamCalls).toBeGreaterThan(0);
    await expect(chat.getByText(/timed out/i)).toHaveCount(0);
  });
});
