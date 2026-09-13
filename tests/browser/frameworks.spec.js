import { expect, test } from '@playwright/test';

for (const framework of ['bootstrap4', 'foundation-sites']) {
  test(`compatibility with ${framework}`, async ({ page }) => {
    await page.goto('/tests/browser/table.html');
    await page.evaluate(() => {
      delete window.bootstrap;
      delete jQuery.fn.modal;
    });
    if (framework === 'bootstrap4') {
      await page.addScriptTag({
        url: '/node_modules/bootstrap4/dist/js/bootstrap.bundle.js',
      });
    } else {
      await page
        .locator('link[href*="bootstrap/dist/css"]')
        .evaluate((link) => link.remove());
      await page.addStyleTag({
        url: '/node_modules/foundation-sites/dist/css/foundation.css',
      });
      await page.addScriptTag({
        url: '/node_modules/foundation-sites/dist/js/foundation.js',
      });
    }
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    if (framework === 'foundation-sites') {
      await page.evaluate(() => {
        document.documentElement.dataset.alteditorTheme = 'dark';
        const unrelated = document.createElement('div');
        unrelated.className = 'reveal';
        unrelated.id = 'other-dialog';
        document.body.appendChild(unrelated);
      });
      const modal = page.locator('.altEditor-modal');
      await expect(modal).toHaveCSS('background-color', 'rgb(24, 34, 49)');
      await expect(modal).toHaveCSS('border-top-color', 'rgb(82, 97, 120)');
      await expect(page.locator('#other-dialog')).toHaveCSS(
        'background-color',
        'rgb(254, 254, 254)'
      );
      await page.evaluate(() => {
        document.documentElement.dataset.alteditorTheme = 'light';
      });
      await expect(modal).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await modal.evaluate((element) => {
        element.style.setProperty('--alteditor-surface', 'rgb(20, 40, 30)');
      });
      await expect(modal).toHaveCSS('background-color', 'rgb(20, 40, 30)');
      await expect(modal.locator('.modal-content')).toHaveCSS(
        'background-color',
        'rgb(20, 40, 30)'
      );
    }
    await page.locator('.modal [name="name"]').fill('Carol');
    await page.evaluate(() => {
      table.altEditor().onAddRow = (_editor, values, success) => {
        window.finishSave = () => success(values);
      };
    });
    await page.locator('.modal button[type="submit"]').click();
    await expect(page.locator('.altEditor-close')).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal')).toBeVisible();
    await page.evaluate(() => window.finishSave());
    await expect(page.locator('tbody')).toContainText('Carol');
    await expect(page.locator('.modal')).toBeHidden();
    await page.evaluate(() => table.altEditor().destroy());
    await expect(page.locator('.altEditor-modal')).toHaveCount(0);
  });
}

test('explicit Foundation dialogs work while Bootstrap is also loaded', async ({
  page,
}) => {
  await page.goto('/tests/browser/table.html');
  await page.addStyleTag({
    url: '/node_modules/foundation-sites/dist/css/foundation.css',
  });
  await page.addScriptTag({
    url: '/node_modules/foundation-sites/dist/js/foundation.js',
  });
  await page.evaluate(() => {
    table.altEditor().c.dialog.framework = 'foundation';
    table.altEditor().openAddDialog();
  });
  const dialog = page.locator('.altEditor-modal');
  await expect(dialog).toBeVisible();
  await dialog.locator('[name="name"]').fill('Carol');
  await dialog.locator('[type="submit"]').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('tbody')).toContainText('Carol');
});
