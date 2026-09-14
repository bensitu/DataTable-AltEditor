import { expect, test } from '@playwright/test';

test('native templates retain keyboard focus and save and delete records with other framework styles loaded', async ({
  page,
}) => {
  await page.goto('/tests/browser/table.html');
  await page.addStyleTag({
    url: '/node_modules/foundation-sites/dist/css/foundation.css',
  });
  await page.evaluate(() => {
    table.altEditor().destroy();
    const template = document.createElement('template');
    template.innerHTML =
      '<fieldset><legend>Profile</legend><div data-alteditor-field="name"></div></fieldset>';
    window.editor = table.altEditor({
      dialog: {
        framework: 'native',
        templates: { add: template, edit: template },
        deleteDetails: ({ rows }) => rows.map((row) => row.name).join(', '),
      },
    });
  });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const dialog = page.locator('.altEditor-native');
  const input = dialog.locator('[name="name"]');
  await expect(input).toBeFocused();
  await expect(dialog).not.toHaveClass(/(^|\s)(modal|reveal)(\s|$)/);
  await input.fill('Carol');
  await page.evaluate(() => {
    editor.onAddRow = (_editor, values, success) => {
      window.finishSave = () => success(values);
    };
  });
  await input.press('Enter');
  await expect(dialog.locator('.altEditor-close')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await page.evaluate(() => finishSave());
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Add', exact: true })
  ).toBeFocused();
  await page.evaluate(() => editor.openEditDialog(2));
  await expect(input).toHaveValue('Carol');
  await input.fill('Caroline');
  await input.press('Enter');
  await expect(page.locator('tbody')).toContainText('Caroline');
  await page.evaluate(() => editor.openDeleteDialog([0, 2]));
  await expect(dialog.locator('.altEditor-delete-details')).toHaveText(
    'Alice, Caroline'
  );
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => table.rows().count())).toBe(1);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => {
    document.documentElement.dataset.alteditorTheme = 'dark';
    editor.openAddDialog();
  });
  await expect(dialog).toHaveCSS('background-color', 'rgb(24, 34, 49)');
  const box = await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  await dialog
    .getByRole('button', { name: 'Close', exact: true })
    .last()
    .click();
  await expect(dialog).toBeHidden();
});

for (const framework of ['bootstrap', 'native']) {
  test(`${framework} releases a failed field callback and permits reopening`, async ({
    page,
  }) => {
    await page.goto('/tests/browser/table.html');
    await page.evaluate((framework) => {
      table.altEditor().destroy();
      table.column(0).init().editorOnChange = () => {
        throw new Error('Field unavailable');
      };
      window.editor = table.altEditor({ dialog: { framework } });
      window.openResult = editor.openEditDialog(0);
    }, framework);
    expect(await page.evaluate(() => openResult)).toBe(false);
    await expect(page.locator('.altEditor-modal')).toBeHidden();
    await expect.poll(() => page.evaluate(() => !!editor._closing)).toBe(false);
    await expect(page.locator('.altEditor-message')).toContainText(
      'Field unavailable'
    );
    await page.evaluate(() => {
      delete table.column(0).init().editorOnChange;
      editor.openEditDialog(0);
    });
    await expect(page.locator('.altEditor-modal [name="name"]')).toHaveValue(
      'Alice'
    );
    await page.locator('.altEditor-modal [name="name"]').fill('Ann');
    await page.locator('.altEditor-modal [type="submit"]').click();
    await expect(page.locator('.altEditor-modal')).toBeHidden();
    await expect(page.locator('tbody')).toContainText('Ann');
  });
}
