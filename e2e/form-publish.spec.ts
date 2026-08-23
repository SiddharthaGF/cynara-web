import { expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

import { createFormViaApi } from './fixtures/ai-chat-mock.ts';
import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';
import { test } from './fixtures/test';
import { apiHeaders, apiOrigin } from './lib/auth';

interface ReviewVersion {
  id: string;
  rowVersion: number;
}

/** Returns the lifecycle statuses of every version of a form definition. */
async function getFormVersionStatuses(
  request: APIRequestContext,
  baseURL: string,
  definitionId: string,
): Promise<string[]> {
  const origin = apiOrigin(baseURL);
  const document = await request.get(
    `${origin}/api/formDefinitions/${definitionId}?include=versions`,
    { headers: await apiHeaders() },
  );
  if (!document.ok()) {
    throw new Error(
      `Failed to load form definition (${document.status()}): ${await document.text()}`,
    );
  }
  const doc = (await document.json()) as {
    included?: Array<{
      type?: string;
      attributes?: { status?: string };
    }>;
  };
  return (doc.included ?? [])
    .filter((item) => item.type === 'formVersions')
    .map((item) => item.attributes?.status ?? '');
}

/** Moves the freshly created draft into the review state via the real API. */
async function submitDraftForReview(
  request: APIRequestContext,
  baseURL: string,
  definitionId: string,
): Promise<ReviewVersion> {
  const origin = apiOrigin(baseURL);
  const document = await request.get(
    `${origin}/api/formDefinitions/${definitionId}?include=versions`,
    { headers: await apiHeaders() },
  );
  if (!document.ok()) {
    throw new Error(
      `Failed to load form definition (${document.status()}): ${await document.text()}`,
    );
  }
  const doc = (await document.json()) as {
    included?: Array<{
      id?: string;
      type?: string;
      attributes?: { status?: string; rowVersion?: number };
    }>;
  };
  const editable = doc.included?.find(
    (item) =>
      item.type === 'formVersions' &&
      item.id !== undefined &&
      (item.attributes?.status === 'draft' ||
        item.attributes?.status === 'review'),
  );
  if (!editable?.id || editable.attributes?.rowVersion === undefined) {
    throw new Error('submitDraftForReview: editable draft version not found');
  }
  const response = await request.post(
    `${origin}/api/formVersions/${editable.id}/submit-review?rowVersion=${editable.attributes.rowVersion}`,
    { headers: await apiHeaders() },
  );
  if (!response.ok()) {
    throw new Error(
      `Failed to submit review (${response.status()}): ${await response.text()}`,
    );
  }
  return { id: editable.id, rowVersion: editable.attributes.rowVersion };
}

async function openDesigner(page: Page, formCode: string): Promise<void> {
  await page.goto(`/en/forms/${formCode}/designer/`, {
    waitUntil: 'domcontentloaded',
  });
  // The designer canvas exposes question cards that keep `data-field-id`.
  await expect(page.locator('[data-field-id]').first()).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('Form lifecycle publishing', () => {
  test.beforeEach(async ({ page }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
  });

  test('publishes a draft straight from the designer', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code, definitionId } = await createFormViaApi(request, baseURL!);
    await openDesigner(page, code);

    const publishTrigger = page.getByRole('button', { name: 'Publish' });
    await expect(publishTrigger).toBeVisible();
    await publishTrigger.click();

    const publishDialog = page.getByRole('dialog');
    await expect(publishDialog).toBeVisible();
    // The confirmation must explain the consequences of publishing.
    await expect(publishDialog).toContainText('Publish this form?');
    await expect(publishDialog).toContainText(
      'Existing documents keep the version they were started with',
    );

    await publishDialog.getByRole('button', { name: 'Publish' }).click();

    const publishedDialog = page.getByRole('dialog');
    await expect(publishedDialog).toBeVisible({ timeout: 30_000 });
    await expect(publishedDialog).toContainText('Form published');

    await publishedDialog
      .getByRole('button', { name: 'Back to forms' })
      .click();
    await expect(page).toHaveURL(/\/en\/forms(\?.*)?$/);
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible();

    // The backend moved the version to published with no editable draft.
    const statuses = await getFormVersionStatuses(
      request,
      baseURL!,
      definitionId,
    );
    expect(statuses).toContain('published');
    expect(
      statuses.some((status) => status === 'draft' || status === 'review'),
    ).toBe(false);
  });

  test('creating a form lands directly in the designer', async ({ page }) => {
    await page.goto('/en/forms', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('New draft', { exact: true })).toBeVisible();

    const code = `e2e-create-${Date.now()}`;
    await page.getByLabel('Code').fill(code);
    await page.getByLabel('Name').fill(`E2E create ${code}`);
    await page.getByRole('button', { name: 'Create form' }).click();

    await expect(page.locator('[data-field-id]').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(
      new RegExp(`/en/forms/${code}/designer/[^/]+`),
    );
  });

  test('deleting a question confirms and explains the consequence', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code } = await createFormViaApi(request, baseURL!);
    await openDesigner(page, code);

    // Select the seeded "Clinical notes" field to reveal its action menu.
    await page.getByRole('button', { name: 'Clinical notes' }).click();
    const actionsMenu = page.getByRole('button', { name: 'Question actions' });
    await expect(actionsMenu).toBeVisible();

    await actionsMenu.click();
    await page.getByRole('menuitem', { name: 'Delete question' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // The confirmation must explain the consequence of an irreversible delete.
    await expect(dialog).toContainText('Delete this question?');
    await expect(dialog).toContainText('This action cannot be undone');

    // Cancel keeps the field.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-field-id]')).toHaveCount(1);

    // Confirming removes the question from the draft.
    await actionsMenu.click();
    await page.getByRole('menuitem', { name: 'Delete question' }).click();
    await dialog.getByRole('button', { name: 'Delete question' }).click();
    await expect(page.locator('[data-field-id]')).toHaveCount(0);
  });

  test('review state shows publish and back-to-draft controls', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code, definitionId } = await createFormViaApi(request, baseURL!);
    await submitDraftForReview(request, baseURL!, definitionId);
    await openDesigner(page, code);

    await expect(page.getByText('In review', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();

    const backToDraft = page.getByRole('button', { name: 'Back to draft' });
    await expect(backToDraft).toBeVisible();
    await backToDraft.click();

    const withdrawDialog = page.getByRole('dialog').filter({
      hasText: 'Return to draft?',
    });
    await expect(withdrawDialog).toBeVisible();
    await withdrawDialog
      .getByRole('button', { name: 'Return to draft' })
      .click();

    // The draft is editable again: the lifecycle badge switches to Draft and
    // The AI chat trigger (gated on read-only) re-enables.
    await expect(page.getByText('Draft', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'AI chat' })).toBeEnabled({
      timeout: 30_000,
    });
  });
});
