import { expect } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
  stubEmptyFormsCatalog,
} from './fixtures/capabilities.ts';
import { test } from './fixtures/test';

test.describe('home dashboard and sidebar groups (UX phase 2)', () => {
  test('shows quick actions and browse links with full capabilities', async ({
    page,
  }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('link', { name: 'Register a patient' }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('link', { name: 'Start a consultation' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Design a form' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Design a workflow' }),
    ).toBeVisible();
    const content = page.getByRole('main');
    await expect(
      content.getByRole('button', { name: 'Patients' }),
    ).toBeVisible();
    await expect(content.getByRole('button', { name: 'Forms' })).toBeVisible();
    await expect(
      content.getByRole('button', { name: 'Administration' }),
    ).toBeVisible();
    await expect(
      content.getByRole('button', { name: 'Workflows' }),
    ).toHaveCount(0);
  });

  test('hides create actions without write capabilities', async ({ page }) => {
    grantCapabilities(page, ['patients.read', 'catalog.read']);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const content = page.getByRole('main');
    await expect(content.getByRole('button', { name: 'Patients' })).toBeVisible(
      {
        timeout: 30_000,
      },
    );
    await expect(
      page.getByRole('link', { name: 'Register a patient' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Start a consultation' }),
    ).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Design a form' })).toHaveCount(
      0,
    );
  });

  test('shows the empty state without any capabilities', async ({ page }) => {
    grantCapabilities(page, []);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText('Nothing to do yet', { exact: true }),
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test('renders Spanish labels on the home dashboard', async ({ page }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
    await page.goto('/es/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /¿Qué querés hacer hoy\?/ }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('link', { name: 'Registrar un paciente' }),
    ).toContainText('Registrar un paciente');
    await expect(
      page.getByRole('main').getByRole('button', { name: 'Pacientes' }),
    ).toContainText('Pacientes');
  });

  test('sidebar groups and entries follow capabilities', async ({ page }) => {
    grantCapabilities(page, [
      ...FULL_CAPABILITIES,
      'workflows.read',
      'workflows.write',
    ]);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar.getByRole('link', { name: 'Home' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(sidebar.getByRole('link', { name: 'Patients' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Forms' })).toBeVisible();
    await expect(
      sidebar.getByRole('link', { name: 'Workflows' }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole('link', { name: 'Administration' }),
    ).toBeVisible();
    // Group labels render through the collapsible trigger in the current
    // Shell markup.
    const groupLabels = sidebar.locator('[data-slot="collapsible-trigger"]');
    await expect(groupLabels.filter({ hasText: 'Care' })).toBeVisible();
    await expect(
      groupLabels.filter({ hasText: 'Configuration' }),
    ).toBeVisible();
  });

  test('hides clinical nav entries without patient capability', async ({
    page,
  }) => {
    grantCapabilities(page, ['catalog.read']);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar.getByRole('link', { name: 'Home' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(sidebar.getByRole('link', { name: 'Patients' })).toHaveCount(
      0,
    );
    await expect(sidebar.getByRole('link', { name: 'Forms' })).toBeVisible();
  });

  test('brand link returns to the home dashboard', async ({ page }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
    stubEmptyFormsCatalog(page);
    await page.goto('/en/forms/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'Cynara' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('link', { name: 'Cynara' }).click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(
      page.getByRole('link', { name: 'Register a patient' }),
    ).toBeVisible();
  });

  test('root path lands on the home dashboard, not the forms catalog', async ({
    page,
  }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
    stubEmptyFormsCatalog(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(
      page.getByRole('link', { name: 'Register a patient' }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('link', { name: 'Design a form' }),
    ).toBeVisible();
  });
});
