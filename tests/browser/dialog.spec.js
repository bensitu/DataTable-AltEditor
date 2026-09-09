import { expect, test } from '@playwright/test';

test('dialog controls fit desktop and mobile viewports', async ({ page }) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/tests/browser/table.html');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const modal = page.locator('.altEditor-modal');
    await expect(modal).toBeVisible();
    const close = modal.locator('.altEditor-close');
    const titleBox = await modal.locator('.modal-title').boundingBox();
    const closeBox = await close.boundingBox();
    const contentBox = await modal.locator('.modal-content').boundingBox();
    expect(closeBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
    expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(width);
    expect(contentBox.x).toBeGreaterThanOrEqual(0);
    expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(width);
    if (width < 576) {
      const label = await modal.locator('.altEditor-label').boundingBox();
      const input = await modal.locator('input[name="name"]').boundingBox();
      expect(input.y).toBeGreaterThanOrEqual(label.y + label.height);
    }
    await close.click();
    await expect(modal).toBeHidden();
  }
});

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
