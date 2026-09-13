import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/table.html');
  await page.evaluate(() => {
    table.altEditor().c.inlineEdit.enabled = true;
    table.altEditor().onInlineEditRow = (_editor, values, success, error) =>
      values.name === 'error' ? error('Try another value') : success(values);
  });
});

test('double-click edits, Enter saves, Escape cancels, and validation permits retry', async ({
  page,
}) => {
  await page.getByRole('cell', { name: 'Alice', exact: true }).dblclick();
  const input = page.locator('.alteditor-inline-control');
  await input.fill('');
  await input.press('Enter');
  await expect(input).toBeVisible();
  await input.fill('error');
  await input.press('Enter');
  await expect(page.locator('.alteditor-inline-error')).toHaveText(
    'Try another value'
  );
  await input.fill('Ann');
  await input.press('Enter');
  await expect(input).toHaveCount(0);
  await page.getByRole('cell', { name: 'Ann', exact: true }).dblclick();
  await input.fill('Other');
  await input.press('Escape');
  await expect(page.locator('tbody')).toContainText('Ann');
});

test('composition Enter does not save and sorting or paging removes unsaved controls', async ({
  page,
}) => {
  await page.getByRole('cell', { name: 'Alice', exact: true }).dblclick();
  const input = page.locator('.alteditor-inline-control');
  await input.fill('東京');
  await input.dispatchEvent('compositionstart');
  await input.press('Enter');
  await expect(input).toBeVisible();
  await input.dispatchEvent('compositionend');
  await input.press('Enter');
  await expect(input).toHaveCount(0);
  await page.getByRole('cell', { name: '東京', exact: true }).dblclick();
  await page.evaluate(() => table.order([0, 'desc']).draw());
  await expect(input).toHaveCount(0);
  await page.getByRole('cell', { name: '東京', exact: true }).dblclick();
  await page.evaluate(() => table.page.len(1).page(1).draw('page'));
  await expect(input).toHaveCount(0);
});

test('Tab and Shift+Tab navigate only after persistence succeeds', async ({
  page,
}) => {
  await page.evaluate(() => {
    table.destroy();
    document.querySelector('#table').innerHTML = '';
    window.table = new DataTable('#table', {
      data: [{ name: 'Alice', age: 30 }],
      columns: [
        { data: 'name', title: 'Name' },
        { data: 'age', title: 'Age', type: 'number' },
      ],
      altEditor: { inlineEdit: true },
      onInlineEditRow: (_editor, values, success) => {
        window.finishSave = () => success(values);
      },
    });
  });
  await page.getByRole('cell', { name: 'Alice', exact: true }).dblclick();
  const input = page.locator('.alteditor-inline-control');
  await input.fill('Ann');
  await input.press('Tab');
  await expect(input).toBeDisabled();
  await page.evaluate(() => finishSave());
  await expect(input).toHaveAttribute('type', 'number');
  await input.press('Shift+Tab');
  await page.evaluate(() => finishSave());
  await expect(input).toHaveValue('Ann');
});

test('blur cancels by default and submits once when configured', async ({
  page,
}) => {
  await page.getByRole('cell', { name: 'Alice', exact: true }).dblclick();
  const input = page.locator('.alteditor-inline-control');
  await input.fill('Ann');
  await page.locator('input[type="search"]').focus();
  await expect(input).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Alice');
  await page.evaluate(() => {
    table.altEditor().c.inlineEdit.submitOnBlur = true;
  });
  await page.getByRole('cell', { name: 'Alice', exact: true }).dblclick();
  await input.fill('Ann');
  await page.locator('input[type="search"]').focus();
  await expect(input).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Ann');
});

test('rendered selects remain interactive and are skipped by inline navigation', async ({
  page,
}) => {
  await page.evaluate(() => {
    table.destroy();
    document.querySelector('#table').innerHTML = '';
    window.table = new DataTable('#table', {
      data: [{ name: 'Alice', status: 'Active', note: 'First' }],
      columns: [
        { data: 'name', title: 'Name' },
        {
          data: 'status',
          title: 'Status',
          render(data, type) {
            if (type !== 'display') return data;
            return (
              '<select aria-label="Status">' +
              ['Active', 'Inactive']
                .map(
                  (value) =>
                    '<option' +
                    (value === data ? ' selected' : '') +
                    '>' +
                    value +
                    '</option>'
                )
                .join('') +
              '</select>'
            );
          },
        },
        { data: 'note', title: 'Note' },
      ],
      altEditor: { inlineEdit: true },
    });
    $('#table').on('change', 'select', function () {
      table.cell(this.closest('td')).data(this.value).draw(false);
    });
  });
  const select = page.getByRole('combobox', { name: 'Status', exact: true });
  await select.selectOption('Inactive');
  expect(await page.evaluate(() => table.cell(0, 1).data())).toBe('Inactive');
  await select.dispatchEvent('dblclick');
  expect(await page.evaluate(() => table.altEditor().isInlineEditing())).toBe(
    false
  );
  expect(
    await page.evaluate(() =>
      table.altEditor().startInlineEdit({ row: 0, column: 1 })
    )
  ).toBe(false);
  await page.getByRole('cell', { name: 'Alice', exact: true }).dblclick();
  const input = page.locator('.alteditor-inline-control');
  await input.fill('Ann');
  await input.press('Tab');
  await expect(input).toHaveValue('First');
  await input.press('Shift+Tab');
  await expect(input).toHaveValue('Ann');
  await input.press('Escape');
  await expect(select).toHaveValue('Inactive');
  await page.evaluate(() => table.search('Inactive').draw());
  await expect(select).toHaveValue('Inactive');
});

test('keeps active editors independent across tables', async ({ page }) => {
  await page.evaluate(() => {
    const node = document.createElement('table');
    node.id = 'second';
    document.body.appendChild(node);
    new DataTable(node, {
      data: [['Tokyo']],
      columns: [{ title: 'City' }],
      altEditor: { inlineEdit: true },
    });
  });
  await page.getByRole('cell', { name: 'Alice', exact: true }).dblclick();
  await page.locator('#table .alteditor-inline-control').fill('Ann');
  await page.getByRole('cell', { name: 'Tokyo', exact: true }).dblclick();
  await page.locator('#second .alteditor-inline-control').fill('Osaka');
  await page.locator('#second .alteditor-inline-control').press('Enter');
  await expect(page.locator('#table tbody')).toContainText('Alice');
  await expect(page.locator('#second tbody')).toContainText('Osaka');
});
