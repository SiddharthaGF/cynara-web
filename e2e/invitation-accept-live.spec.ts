import { expect } from '@playwright/test';

import { test } from './fixtures/test';

/**
 * LIVE backend validation for the invitation lifecycle (no stubs):
 * create an invitation as admin, accept the link as an anonymous visitor,
 * then assert the admin list shows "Aceptada" for that row.
 *
 * Run: pnpm exec playwright test e2e/invitation-accept-live.spec.ts --project=chromium
 */
test.describe('live invitation lifecycle (admin create -> accept -> list)', () => {
  test('accepted invitation shows Aceptada in the admin list', async ({
    page,
  }) => {
    const stamp = Date.now().toString(36);
    const email = `e2e-acc-${stamp}@cynara.dev`;
    const actorId = `e2e-acc-${stamp}`;

    // 1. Admin creates the invitation.
    await page.goto('/es/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Invitaciones' }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Crear invitación' }).click();
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Nombre').fill('E2e');
    await page.getByLabel('Apellido').fill('Accept');
    await page.getByLabel('ID de actor').fill(actorId);

    const language = page.getByLabel('Idioma');
    await language.click();
    await page.getByRole('option', { name: 'Español' }).click();

    await page.getByRole('button', { name: 'Continuar' }).click();

    // Step 2: pick the Doctor preset, then create.
    await page.getByRole('button', { name: 'Médico' }).click();
    await page.getByRole('button', { name: 'Crear invitación' }).click();

    // 2. Capture the one-time accept link from the copy dialog.
    const linkInput = page.getByLabel('Enlace de invitación');
    await expect(linkInput).toBeVisible({ timeout: 30_000 });
    const link = await linkInput.inputValue();
    expect(link).toContain('/es/invitations/accept?token=');
    const token = new URL(link).searchParams.get('token');
    expect(token, 'accept link must carry a token').toBeTruthy();

    await page.getByRole('button', { name: 'Listo' }).click();

    // 3. Accept as an anonymous visitor.
    await page.goto(`/es/invitations/accept?token=${token}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Definí tu contraseña' }),
    ).toBeVisible({ timeout: 30_000 });
    // Let SSR hydration attach the form handler so the submit goes through
    // React (which preventDefaults + calls the server fn) instead of a
    // Native GET submit that drops the token from the URL.
    await page.waitForTimeout(2_000);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('E2e!Test99');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Todo listo' })).toBeVisible(
      { timeout: 30_000 },
    );

    // 4. Back to the admin list: the row must read Aceptada.
    await page.goto('/es/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Invitaciones' }),
    ).toBeVisible({ timeout: 30_000 });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const row = page.locator('tbody tr', { hasText: email });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByText('Aceptada', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('invitation without names asks for them at acceptance', async ({
    page,
  }) => {
    const stamp = Date.now().toString(36);
    const email = `e2e-noname-${stamp}@cynara.dev`;
    const actorId = `e2e-noname-${stamp}`;

    await page.goto('/es/admin/invitations/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Invitaciones' }),
    ).toBeVisible({ timeout: 30_000 });

    // Admin leaves Nombre/Apellido empty on purpose.
    await page.getByRole('button', { name: 'Crear invitación' }).click();
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('ID de actor').fill(actorId);
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.getByRole('button', { name: 'Médico' }).click();
    await page.getByRole('button', { name: 'Crear invitación' }).click();

    const linkInput = page.getByLabel('Enlace de invitación');
    await expect(linkInput).toBeVisible({ timeout: 30_000 });
    const token = new URL(await linkInput.inputValue()).searchParams.get(
      'token',
    );
    expect(token, 'accept link must carry a token').toBeTruthy();
    await page.getByRole('button', { name: 'Listo' }).click();

    // Accept with password only: the backend asks for names, the form
    // Reveals the fields with localized guidance.
    await page.goto(`/es/invitations/accept?token=${token}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('heading', { name: 'Definí tu contraseña' }),
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2_000);
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('E2e!Test99');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    const nameBox = page.getByRole('textbox', { name: 'Nombre', exact: true });
    await expect(nameBox).toBeVisible({ timeout: 30_000 });
    await nameBox.fill('Sin');
    await page
      .getByRole('textbox', { name: 'Apellido', exact: true })
      .fill('Nombre');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Todo listo' })).toBeVisible(
      { timeout: 30_000 },
    );
  });
});
