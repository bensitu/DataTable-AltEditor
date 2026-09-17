import { expect, test } from '@playwright/test';

for (const framework of ['bootstrap', 'native']) {
  test(`${framework} validates before saving and links recoverable field errors`, async ({
    page,
  }) => {
    await page.goto('/tests/browser/table.html');
    await page.evaluate((framework) => {
      table.destroy();
      window.table = new DataTable('#table', {
        data: [{ name: 'Alice' }],
        columns: [
          {
            data: 'name',
            title: 'Name',
            required: true,
            editorValidate(value) {
              return Promise.resolve(
                value === 'invalid' ? 'Choose another name' : true
              );
            },
          },
        ],
        altEditor: {
          dialog: { framework },
          onEditRow() {
            return Promise.reject({
              fieldErrors: { name: 'Name is reserved' },
            });
          },
        },
      });
      table.altEditor().openEditDialog(0);
    }, framework);
    const dialog = page.locator('.altEditor-modal');
    const name = dialog.locator('[name="name"]');
    const save = dialog.locator('[type="submit"]');
    await name.fill('');
    await save.click();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.locator('.altEditor-field-error')).toBeVisible();
    await name.fill('invalid');
    await save.click();
    await expect(dialog.locator('.altEditor-field-error')).toHaveText(
      'Choose another name'
    );
    await expect(name).toBeFocused();
    await name.fill('Ann');
    await expect(name).not.toHaveAttribute('aria-invalid');
    await save.click();
    await expect(dialog.locator('.altEditor-field-error')).toHaveText(
      'Name is reserved'
    );
    const id = await dialog
      .locator('.altEditor-field-error')
      .getAttribute('id');
    await expect(name).toHaveAttribute('aria-describedby', id);
    await page.evaluate(() => {
      table.altEditor().onEditRow = async () => undefined;
    });
    await name.fill('Carol');
    await save.click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('tbody')).toContainText('Carol');
  });
}
