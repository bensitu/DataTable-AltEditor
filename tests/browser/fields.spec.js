import { expect, test } from '@playwright/test';

test('independent fields preserve structured values through dialog saves', async ({
  page,
}) => {
  await page.goto('/tests/browser/table.html');
  await page.evaluate(() => {
    table.destroy();
    table = new DataTable('#table', {
      data: [
        {
          id: 'alice',
          name: 'Alice',
          email: 'alice@example.com',
          roles: [{ id: 1, label: 'Reader' }],
        },
      ],
      rowId: 'id',
      columns: [
        { data: 'name', title: 'Name', render: DataTable.render.text() },
      ],
      altEditor: {
        fields: [
          { name: 'email', title: 'Email', type: 'email', required: true },
          {
            name: 'roles',
            title: 'Roles',
            type: 'select',
            multiple: true,
            options: [
              { id: 1, text: 'Reader' },
              { id: 2, text: 'Writer' },
            ],
            getValue: (roles) => roles.map((role) => role.id),
            setValue: (ids) =>
              ids.map((id) => ({
                id: Number(id),
                label: id === '1' ? 'Reader' : 'Writer',
              })),
          },
        ],
      },
    });
    table.altEditor().openEditDialog(0);
  });
  const modal = page.locator('.altEditor-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('[name="name"]')).toHaveCount(0);
  await expect(modal.getByLabel('Email:')).toHaveValue('alice@example.com');
  await modal.getByLabel('Email:').fill('ann@example.com');
  await modal.getByLabel('Roles:').selectOption(['1', '2']);
  await modal.locator('button[type="submit"]').click();
  await expect(modal).toBeHidden();
  expect(await page.evaluate(() => table.row(0).data())).toEqual({
    id: 'alice',
    name: 'Alice',
    email: 'ann@example.com',
    roles: [
      { id: 1, label: 'Reader' },
      { id: 2, label: 'Writer' },
    ],
  });
  await page.evaluate(() => table.altEditor().openEditDialog(0));
  await expect(modal.getByLabel('Roles:')).toHaveValues(['1', '2']);
});
