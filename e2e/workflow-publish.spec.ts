import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
} from './fixtures/capabilities.ts';

const WORKFLOW_CAPABILITIES = [
  ...FULL_CAPABILITIES,
  'workflows.read',
  'workflows.write',
];

const JSON_API = 'application/vnd.api+json';
const ACTOR = 'designer-user';

/**
 * Guarded workflow used by every publish assertion: `start -> triage ->
 * (high-priority task when pain-score >= 7, otherwise the default low-priority
 * task) -> end`. The task nodes pin a published form so the graph passes
 * validation and can be published.
 */
const INITIAL_WORKFLOW_SCHEMA = {
  $schema: 'https://cynara.dev/schemas/v1/workflow-schema.schema.json',
  schemaVersion: '1.0.0',
  inputs: ['assessment.pain-score'],
  nodes: [
    { id: 'start', type: 'start', name: 'Start' },
    { id: 'triage', type: 'decision', name: 'Triage' },
    {
      id: 'low-task',
      type: 'task',
      name: 'Low priority',
      formCode: 'demo-showcase',
      formVersion: '1.0.0',
      assignee: { role: 'nurse' },
    },
    {
      id: 'high-task',
      type: 'task',
      name: 'High priority',
      formCode: 'demo-showcase',
      formVersion: '1.0.0',
      assignee: { role: 'physician' },
    },
    { id: 'end', type: 'end', name: 'End' },
  ],
  edges: [
    { from: 'start', to: 'triage' },
    {
      from: 'triage',
      to: 'high-task',
      condition: {
        op: 'gte',
        args: [{ ref: 'assessment.pain-score' }, { lit: 7 }],
      },
    },
    { from: 'triage', to: 'low-task', label: 'Default path' },
    { from: 'low-task', to: 'end' },
    { from: 'high-task', to: 'end' },
  ],
};

function apiHeaders(): Record<string, string> {
  return {
    'Accept': JSON_API,
    'Content-Type': JSON_API,
    'X-Actor-Id': ACTOR,
    'X-Hospital-Code': process.env.VITE_HOSPITAL_CODE ?? 'default',
  };
}

/**
 * Resolve the cynara-api origin. Playwright runs outside Vite, so it cannot
 * see the `.dev.vars` that the dev server reads; parse it as a fallback so
 * fixture CRUD goes straight to the API instead of the Vite dev server.
 */
function apiOrigin(baseURL: string): string {
  const envOrigin = process.env.VITE_API_ORIGIN;
  if (envOrigin) {
    return envOrigin.replace(/\/$/u, '');
  }
  try {
    const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
    const devVars = readFileSync(devVarsPath, 'utf8');
    const match = /^VITE_API_ORIGIN\s*=\s*(.+?)\s*$/mu.exec(devVars);
    if (match?.[1]) {
      return match[1].replace(/\/$/u, '');
    }
  } catch {
    // `.dev.vars` is optional; fall back to the Vite dev server base URL.
  }
  return baseURL;
}

/** Creates a unique guarded workflow against the real API. */
async function createWorkflowViaApi(
  request: APIRequestContext,
  baseURL: string,
): Promise<{ code: string; definitionId: string }> {
  const code = `e2e-wfpub-${Date.now()}`;
  const response = await request.post(
    `${apiOrigin(baseURL)}/api/workflowDefinitions`,
    {
      data: {
        data: {
          attributes: {
            code,
            initialWorkflowSchemaJson: JSON.stringify(INITIAL_WORKFLOW_SCHEMA),
            name: `E2E workflow publish ${code}`,
          },
          type: 'workflowDefinitions',
        },
      },
      headers: apiHeaders(),
    },
  );
  if (!response.ok()) {
    throw new Error(
      `Failed to create workflow (${response.status()}): ${await response.text()}`,
    );
  }
  const document = (await response.json()) as {
    data?: { id?: string };
  };
  const definitionId = document.data?.id;
  if (!definitionId) {
    throw new Error('createWorkflowViaApi: created workflow id not returned');
  }
  return { code, definitionId };
}

/** Returns the lifecycle statuses of every version of a workflow definition. */
async function getWorkflowVersionStatuses(
  request: APIRequestContext,
  baseURL: string,
  definitionId: string,
): Promise<string[]> {
  const document = await request.get(
    `${apiOrigin(baseURL)}/api/workflowDefinitions/${definitionId}?include=versions`,
    { headers: apiHeaders() },
  );
  if (!document.ok()) {
    throw new Error(
      `Failed to load workflow definition (${document.status()}): ${await document.text()}`,
    );
  }
  const doc = (await document.json()) as {
    included?: Array<{
      type?: string;
      attributes?: { status?: string };
    }>;
  };
  return (doc.included ?? [])
    .filter((item) => item.type === 'workflowVersions')
    .map((item) => item.attributes?.status ?? '');
}

/** Moves the freshly created draft into the review state via the real API. */
async function submitDraftForReview(
  request: APIRequestContext,
  baseURL: string,
  definitionId: string,
): Promise<void> {
  const document = await request.get(
    `${apiOrigin(baseURL)}/api/workflowDefinitions/${definitionId}?include=versions`,
    { headers: apiHeaders() },
  );
  if (!document.ok()) {
    throw new Error(
      `Failed to load workflow definition (${document.status()}): ${await document.text()}`,
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
      item.type === 'workflowVersions' &&
      item.id !== undefined &&
      item.attributes?.status === 'draft',
  );
  if (!editable?.id || editable.attributes?.rowVersion === undefined) {
    throw new Error('submitDraftForReview: editable draft version not found');
  }
  const response = await request.post(
    `${apiOrigin(baseURL)}/api/workflowVersions/${editable.id}/submit-review?rowVersion=${editable.attributes.rowVersion}`,
    { headers: apiHeaders() },
  );
  if (!response.ok()) {
    throw new Error(
      `Failed to submit review (${response.status()}): ${await response.text()}`,
    );
  }
}

async function openDesigner(page: Page, code: string): Promise<void> {
  await page.goto(`/en/workflows/${code}/designer`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('.react-flow')).toBeVisible({
    timeout: 30_000,
  });
}

test.describe('Workflow lifecycle publishing', () => {
  test.beforeEach(async ({ page }) => {
    grantCapabilities(page, WORKFLOW_CAPABILITIES);
  });

  test('publishes a draft straight from the workflow designer', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code, definitionId } = await createWorkflowViaApi(
      request,
      baseURL!,
    );
    await openDesigner(page, code);

    const publishTrigger = page.getByRole('button', { name: 'Publish' });
    await expect(publishTrigger).toBeVisible();
    await publishTrigger.click();

    const publishDialog = page.getByRole('dialog');
    await expect(publishDialog).toBeVisible();
    // The confirmation must explain the consequences of publishing.
    await expect(publishDialog).toContainText('Publish this workflow?');
    await expect(publishDialog).toContainText(
      'Consultations already in progress keep following the version they started with',
    );

    await publishDialog.getByRole('button', { name: 'Publish' }).click();

    const publishedDialog = page.getByRole('dialog');
    await expect(publishedDialog).toBeVisible({ timeout: 30_000 });
    await expect(publishedDialog).toContainText('Workflow published');

    await publishedDialog
      .getByRole('button', { name: 'Back to workflows' })
      .click();
    await expect(page).toHaveURL(/\/en\/workflows(\?.*)?$/);

    // The backend moved the version to published with no editable draft.
    const statuses = await getWorkflowVersionStatuses(
      request,
      baseURL!,
      definitionId,
    );
    expect(statuses).toContain('published');
    expect(
      statuses.some((status) => status === 'draft' || status === 'review'),
    ).toBe(false);
  });

  test('creating a workflow lands directly in the designer', async ({
    page,
  }) => {
    await page.goto('/en/workflows', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Code')).toBeVisible();

    const code = `e2e-wfcreate-${Date.now()}`;
    await page.getByLabel('Code').fill(code);
    await page.getByLabel('Name').fill(`E2E create ${code}`);
    await page.getByRole('button', { name: 'Create workflow' }).click();

    await expect(page.locator('.react-flow')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(new RegExp(`/en/workflows/${code}/designer`));
  });

  test('deleting a node from the context menu confirms the consequence', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code } = await createWorkflowViaApi(request, baseURL!);
    await openDesigner(page, code);

    const lowPriority = page.locator('.react-flow__node').filter({
      hasText: 'Low priority',
    });
    await expect(lowPriority).toBeVisible();
    await lowPriority.click({ button: 'right' });

    await page.getByRole('menuitem', { name: 'Delete node' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // The confirmation must explain the consequence of deleting a node.
    await expect(dialog).toContainText('Delete this node?');
    await expect(dialog).toContainText(
      'also removes every connected transition',
    );

    // Cancel keeps the node in the graph.
    await dialog
      .locator('[data-slot="dialog-footer"]')
      .getByRole('button', { name: 'Close' })
      .click();
    await expect(lowPriority).toHaveCount(1);

    // Confirming removes the node and its transitions.
    await lowPriority.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete node' }).click();
    await dialog.getByRole('button', { name: 'Delete node' }).click();
    await expect(lowPriority).toHaveCount(0);
  });

  test('review state shows publish and back-to-draft controls', async ({
    page,
    request,
    baseURL,
  }) => {
    const { code, definitionId } = await createWorkflowViaApi(
      request,
      baseURL!,
    );
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
    // The canvas "Add" control (gated on read-only) reappears.
    await expect(page.getByText('Draft', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible({
      timeout: 30_000,
    });
  });
});
