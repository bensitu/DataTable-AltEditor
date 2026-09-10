import { expect, test } from '@playwright/test';

test('editor themes are customizable and leave unrelated controls unchanged', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/tests/browser/table.html');
  const unrelated = await page.evaluate(() => {
    const input = document.createElement('input');
    input.className = 'form-control';
    document.body.append(input);
    const stylesheet = document.querySelector('link[href*="altEditor.css"]');
    function appearance() {
      const style = getComputedStyle(input);
      return [style.color, style.backgroundColor, style.border, style.width];
    }
    stylesheet.disabled = true;
    const before = appearance();
    stylesheet.disabled = false;
    return { before, after: appearance() };
  });
  expect(unrelated.after).toEqual(unrelated.before);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const content = page.locator('.altEditor-modal .modal-content');
  await expect(content).toHaveCSS('background-color', 'rgb(24, 34, 49)');
  await page.evaluate(() => {
    document.documentElement.dataset.alteditorTheme = 'light';
  });
  await expect(content).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.evaluate(() => {
    document
      .querySelector('.altEditor-modal')
      .style.setProperty('--alteditor-surface', '#123456');
  });
  await expect(content).toHaveCSS('background-color', 'rgb(18, 52, 86)');
});

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
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.altEditor-message [role="alert"]')).toBeVisible();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.modal [name="name"]')).toBeFocused();
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
