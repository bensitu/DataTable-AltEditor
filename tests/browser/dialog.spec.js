import { expect, test } from '@playwright/test';

test('adds, edits and deletes through Bootstrap dialogs', async ({ page }) => {
  await page.goto('/tests/browser/table.html');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.locator('.modal [name="name"]').fill('Carol');
  await page.locator('.modal button[type="submit"]').click();
  await expect(page.locator('tbody')).toContainText('Carol');
  await expect(page.locator('.modal')).toBeHidden();
  await page.getByRole('cell', { name: 'Alice', exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('.modal [name="name"]').fill('Ann');
  await page.locator('.modal button[type="submit"]').click();
  await expect(page.locator('tbody')).toContainText('Ann');
  await expect(page.locator('.modal')).toBeHidden();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.locator('.modal button[type="submit"]').click();
  await expect(page.locator('tbody')).not.toContainText('Ann');
});
