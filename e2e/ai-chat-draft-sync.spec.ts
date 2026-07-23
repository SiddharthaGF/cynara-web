import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  createFormViaApi,
  mockAiChatStream,
} from './fixtures/ai-chat-mock.ts';
import {
  APPLIED_FIELD_ORDER,
  APPLIED_LABELS,
  ASSISTANT_MESSAGE,
} from './fixtures/form-schemas.ts';

async function openDesigner(page: Page, formCode: string): Promise<void> {
  await page.goto(`/en/forms/${formCode}/designer/`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('designer-field-list')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('designer-field')).toHaveCount(1);
  await expect(page.getByTestId('designer-field').first()).toContainText(
    'Clinical notes',
  );
}

async function ensureChatOpen(page: Page): Promise<Locator> {
  const chat = page.getByTestId('ai-chat-panel');
  if ((await chat.count()) === 0) {
    await page.getByTestId('ai-chat-open').click();
  }
  await expect(chat).toBeVisible({ timeout: 10_000 });
  return chat;
}

async function sendAiPrompt(page: Page, prompt: string): Promise<void> {
  const chat = await ensureChatOpen(page);
  const input = page.getByTestId('ai-chat-input');
  await input.click();
  await input.fill(prompt);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(chat.getByText(ASSISTANT_MESSAGE).last()).toBeVisible({
    timeout: 30_000,
  });
  await expect(chat.getByText('Applied to draft').last()).toBeVisible({
    timeout: 15_000,
  });
}

async function closePreview(page: Page): Promise<void> {
  const close = page.getByRole('button', { name: /close/i }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await expect(page.getByTestId('preview-form')).toHaveCount(0);
}

async function fieldIds(locator: Locator): Promise<string[]> {
  const count = await locator.count();
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = await locator.nth(index).getAttribute('data-field-id');
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

async function designerFieldIds(page: Page): Promise<string[]> {
  return fieldIds(page.getByTestId('designer-field'));
}

async function previewFieldIds(page: Page): Promise<string[]> {
  return fieldIds(
    page.getByTestId('preview-form').getByTestId('preview-field'),
  );
}

async function expectLabelsInOrder(
  root: Locator,
  labels: readonly string[],
): Promise<void> {
  for (const [index, label] of labels.entries()) {
    await expect(root.nth(index)).toContainText(label);
  }
}

test.describe('AI chat draft sync (real app, mocked stream)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAiChatStream(page);
  });

  test('applies chat schema to designer and preview in designer order', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code } = await createFormViaApi(request, baseURL!);
    await openDesigner(page, code);

    await sendAiPrompt(
      page,
      'Create a form for bariatric patient follow-up',
    );

    await expect(page.getByTestId('designer-field')).toHaveCount(
      APPLIED_FIELD_ORDER.length,
      { timeout: 15_000 },
    );
    expect(await designerFieldIds(page)).toEqual([...APPLIED_FIELD_ORDER]);
    await expectLabelsInOrder(
      page.getByTestId('designer-field'),
      APPLIED_LABELS,
    );

    await page.getByTestId('form-preview-open').click();
    const previewForm = page.getByTestId('preview-form');
    await expect(previewForm).toBeVisible();
    await expect(previewForm.getByTestId('preview-field')).toHaveCount(
      APPLIED_FIELD_ORDER.length,
    );
    expect(await previewFieldIds(page)).toEqual([...APPLIED_FIELD_ORDER]);
    await expectLabelsInOrder(
      previewForm.getByTestId('preview-field'),
      APPLIED_LABELS,
    );
  });

  test('keeps designer and preview aligned after repeated chat applies', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code } = await createFormViaApi(request, baseURL!);
    await openDesigner(page, code);
    await sendAiPrompt(page, 'Build the bariatric follow-up form');

    await expect(page.getByTestId('designer-field')).toHaveCount(
      APPLIED_FIELD_ORDER.length,
    );

    await page.getByTestId('form-preview-open').click();
    await expect(page.getByTestId('preview-form')).toBeVisible();
    expect(await previewFieldIds(page)).toEqual([...APPLIED_FIELD_ORDER]);

    await closePreview(page);

    await sendAiPrompt(page, 'Keep the same follow-up fields');
    await expect(page.getByTestId('designer-field')).toHaveCount(
      APPLIED_FIELD_ORDER.length,
    );
    expect(await designerFieldIds(page)).toEqual([...APPLIED_FIELD_ORDER]);

    await page.getByTestId('form-preview-open').click();
    expect(await previewFieldIds(page)).toEqual([...APPLIED_FIELD_ORDER]);
  });
});
