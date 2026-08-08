import { expect, test } from '@playwright/test';

import {
  FULL_CAPABILITIES,
  grantCapabilities,
  stubEmptyFormsCatalog,
} from './fixtures/capabilities.ts';

test.describe('home dashboard and sidebar groups (UX phase 2)', () => {
  test('shows quick actions and browse links with full capabilities', async ({
    page,
  }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('home-action-registerPatient')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('home-action-newEncounter')).toBeVisible();
    await expect(page.getByTestId('home-action-createForm')).toBeVisible();
    await expect(page.getByTestId('home-action-createWorkflow')).toBeVisible();
    await expect(page.getByTestId('home-browse-patients')).toBeVisible();
    await expect(page.getByTestId('home-browse-forms')).toBeVisible();
    await expect(page.getByTestId('home-browse-administration')).toBeVisible();
    await expect(page.getByTestId('home-browse-workflows')).toHaveCount(0);
  });

  test('hides create actions without write capabilities', async ({ page }) => {
    grantCapabilities(page, ['patients.read', 'catalog.read']);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('home-browse-patients')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('home-action-registerPatient')).toHaveCount(
      0,
    );
    await expect(page.getByTestId('home-action-newEncounter')).toHaveCount(0);
    await expect(page.getByTestId('home-action-createForm')).toHaveCount(0);
  });

  test('shows the empty state without any capabilities', async ({ page }) => {
    grantCapabilities(page, []);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('home-empty')).toBeVisible({
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
    await expect(page.getByTestId('home-action-registerPatient')).toContainText(
      'Registrar un paciente',
    );
    await expect(page.getByTestId('home-browse-patients')).toContainText(
      'Pacientes',
    );
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
    const groupLabels = sidebar.locator('[data-slot="sidebar-group-label"]');
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
    await expect(page.getByTestId('home-action-registerPatient')).toBeVisible();
  });

  test('root path lands on the home dashboard, not the forms catalog', async ({
    page,
  }) => {
    grantCapabilities(page, FULL_CAPABILITIES);
    stubEmptyFormsCatalog(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.getByTestId('home-action-registerPatient')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('home-action-createForm')).toBeVisible();
  });
});
