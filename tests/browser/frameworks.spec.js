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
      await page.addStyleTag({
        url: '/node_modules/foundation-sites/dist/css/foundation.css',
      });
      await page.addScriptTag({
        url: '/node_modules/foundation-sites/dist/js/foundation.js',
      });
    }
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.locator('.modal [name="name"]').fill('Carol');
    await page.locator('.modal button[type="submit"]').click();
    await expect(page.locator('tbody')).toContainText('Carol');
    await expect(page.locator('.modal')).toBeHidden();
    await page.evaluate(() => table.altEditor().destroy());
    await expect(page.locator('.altEditor-modal')).toHaveCount(0);
  });
}
