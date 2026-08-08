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
 * Guarded workflow used by every preview assertion: `start -> triage ->
 * (high-priority task when pain-score >= 7, otherwise the default low-priority
 * task) -> end`.
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
      description: 'Routine evaluation.',
      formCode: 'demo-showcase',
      formVersion: '1.0.0',
      assignee: { role: 'nurse' },
    },
    {
      id: 'high-task',
      type: 'task',
      name: 'High priority',
      description: 'Urgent physician review.',
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

/** Create a unique guarded workflow against the real API. */
async function createWorkflowViaApi(
  request: APIRequestContext,
  baseURL: string,
): Promise<string> {
  const code = `e2e-wf-${Date.now()}`;
  const response = await request.post(
    `${apiOrigin(baseURL)}/api/workflowDefinitions`,
    {
      data: {
        data: {
          attributes: {
            code,
            initialWorkflowSchemaJson: JSON.stringify(INITIAL_WORKFLOW_SCHEMA),
            name: `E2E workflow preview ${code}`,
          },
          type: 'workflowDefinitions',
        },
      },
      headers: {
        'Accept': JSON_API,
        'Content-Type': JSON_API,
        'X-Actor-Id': ACTOR,
        'X-Hospital-Code': process.env.VITE_HOSPITAL_CODE ?? 'default',
      },
    },
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to create workflow (${response.status()}): ${await response.text()}`,
    );
  }
  return code;
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

test.describe('workflow preview simulation (CYN-72)', () => {
  test('simulates both branches of a guarded decision against test data', async ({
    page,
    request,
    baseURL,
  }) => {
    const code = await createWorkflowViaApi(request, baseURL!);
    grantCapabilities(page, WORKFLOW_CAPABILITIES);
    await page.goto(`/en/workflows/${code}/designer`, {
      waitUntil: 'domcontentloaded',
    });

    const previewOpen = page.getByTestId('workflow-preview-open');
    await expect(previewOpen).toBeVisible({ timeout: 30_000 });
    await previewOpen.click();
    await expect(page.getByRole('tab', { name: 'Simulation' })).toBeVisible({
      timeout: 10_000,
    });

    // Test-data editor: the declared input is pre-typed as Number from the
    // `assessment.pain-score >= 7` guard.
    const input = page.getByLabel('Value of assessment.pain-score');
    await expect(input).toBeVisible();
    await expect(
      page.getByLabel('Type of assessment.pain-score'),
    ).toContainText(/number/i);

    // Pain score >= 7 -> urgent physician review.
    await input.fill('8');
    await page.getByRole('button', { name: 'Run' }).click();
    const dialog = page.locator('.preview-modal');
    await expect(
      dialog.getByText(
        'Simulation completed — the workflow reached an end node.',
      ),
    ).toBeVisible({ timeout: 10_000 });
    const highTaskStep = dialog
      .getByRole('button', { name: /High priority/ })
      .last();
    await expect(highTaskStep).toBeVisible();
    await expect(highTaskStep.getByText('physician')).toBeVisible();
    await expect(dialog.getByText(/of 4/)).toBeVisible();

    // Pain score < 7 -> nurse low-priority task (default branch).
    await input.fill('3');
    await page.getByRole('button', { name: 'Run' }).click();
    const lowTaskStep = dialog
      .getByRole('button', { name: /Low priority/ })
      .last();
    await expect(lowTaskStep).toBeVisible({ timeout: 10_000 });
    await expect(lowTaskStep.getByText('nurse')).toBeVisible();
    await expect(lowTaskStep.getByText(/via Default path/)).toBeVisible();

    // Rules tab: the decision guard shows the latest evaluation.
    await dialog.getByRole('tab', { name: 'Rules' }).click();
    await expect(dialog.getByRole('heading', { name: 'Triage' })).toBeVisible();
    await expect(dialog.getByRole('code').first()).toContainText(
      'assessment.pain-score gte 7',
    );
    const rulesPanel = dialog.locator('[role="tabpanel"]:visible');
    await expect(rulesPanel.getByText('false', { exact: true })).toBeVisible();
    await expect(rulesPanel.getByText('true', { exact: true })).toBeVisible();
    await expect(
      rulesPanel.getByText('Default path', { exact: true }),
    ).toBeVisible();
  });

  test('renders in the Spanish locale on a mobile sheet', async ({
    page,
    request,
    baseURL,
  }) => {
    const code = await createWorkflowViaApi(request, baseURL!);
    grantCapabilities(page, WORKFLOW_CAPABILITIES);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/es/workflows/${code}/designer`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId('workflow-preview-open')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId('workflow-preview-open').click();

    const sheet = page.locator('[role="dialog"]:visible');
    await expect(sheet.getByRole('tab', { name: 'Simulación' })).toBeVisible({
      timeout: 10_000,
    });
    const input = page.getByLabel('Valor de assessment.pain-score');
    await expect(input).toBeVisible();
    await input.fill('5');
    await page.getByRole('button', { name: 'Ejecutar' }).click();
    const lowTaskStep = sheet
      .getByRole('button', { name: /Low priority/ })
      .last();
    await expect(lowTaskStep).toBeVisible({ timeout: 10_000 });
    await expect(lowTaskStep.getByText('nurse')).toBeVisible();
    await expect(sheet.getByText(/de 4/)).toBeVisible();
  });
});
