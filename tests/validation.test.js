import $ from 'jquery';
import DataTable from 'datatables.net';
import '../src/index.js';
import { afterEach, expect, test, vi } from 'vitest';

const tables = [];
function create(options = {}) {
  const node = document.createElement('table');
  document.body.appendChild(node);
  const table = new DataTable(node, {
    data: [{ name: 'Alice', email: 'alice@example.com', id: 'a' }],
    columns: [
      { data: 'name', title: 'Name' },
      { data: 'email', title: 'Email' },
      { data: 'id', title: 'ID', type: 'hidden' },
    ],
    altEditor: { inlineEdit: true },
    ...options,
  });
  tables.push(table);
  const editor = table.altEditor();
  editor.internalOpenDialog = (_selector, fill) => fill();
  editor.internalCloseDialog = () => editor._handleDialogClosed();
  return {
    table,
    editor,
    field: (name) =>
      $(editor.modal_selector)
        .find('[name]')
        .filter(function () {
          return this.name === name;
        })[0],
  };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
afterEach(() => {
  tables.splice(0).forEach((table) => table.destroy());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

test('renders field failures as text, preserves descriptions and clears only corrected fields', async () => {
  const { editor, field } = create({
    onEditRow: async () => {
      throw {
        message: 'Correct the fields',
        fieldErrors: {
          name: '<b>Reserved</b>',
          email: 'Already registered',
          id: 'ID rejected',
          missing: 'Missing field',
        },
      };
    },
  });
  editor.openEditDialog(0);
  field('name').setAttribute('aria-describedby', 'existing-help');
  field('name').setAttribute('aria-invalid', 'false');
  await editor._editRowData();
  await flush();
  const modal = $(editor.modal_selector);
  expect(modal.find('.altEditor-field-error')).toHaveLength(2);
  expect(modal.find('.altEditor-field-error b')).toHaveLength(0);
  const id = field('name').getAttribute('aria-describedby').split(' ')[1];
  expect(document.getElementById(id).textContent).toBe('<b>Reserved</b>');
  expect(field('name').getAttribute('aria-invalid')).toBe('true');
  expect(modal.find('.altEditor-feedback').text()).toContain(
    'ID rejected\nMissing field'
  );
  field('name').dispatchEvent(new Event('input', { bubbles: true }));
  expect(field('name').getAttribute('aria-describedby')).toBe('existing-help');
  expect(field('name').getAttribute('aria-invalid')).toBe('false');
  expect(modal.find('.altEditor-field-error')).toHaveLength(1);
  editor._handleDialogClosed();
  expect(modal.find('.altEditor-field-error')).toHaveLength(0);
  editor.openAddDialog();
  expect(field('email').hasAttribute('aria-invalid')).toBe(false);
});

test('maps template and Select2 errors to controls and falls back for disabled fields', async () => {
  const template = document.createElement('template');
  template.innerHTML =
    '<section><div data-alteditor-field="name"></div><div data-alteditor-field="email"></div></section>';
  const { editor, field } = create({
    altEditor: { dialog: { templates: { edit: template } } },
    onEditRow: (_editor, _values, _success, error) =>
      error({
        fieldErrors: { name: 'Choose another', email: 'Cannot change email' },
      }),
  });
  editor.openEditDialog(0);
  field('email').disabled = true;
  $(field('name'))
    .addClass('select2-hidden-accessible')
    .after(
      '<span class="select2-container"><span class="select2-selection" tabindex="0"></span></span>'
    );
  await editor._editRowData();
  expect(
    $(editor.modal_selector).find('.select2-selection').attr('aria-invalid')
  ).toBe('true');
  expect($(editor.modal_selector).find('.altEditor-feedback').text()).toContain(
    'Cannot change email'
  );
  $(field('name')).trigger('change');
  expect(
    $(editor.modal_selector).find('.select2-selection').attr('aria-invalid')
  ).toBeUndefined();
});

test('inline structured failures retain an editable control and show unrelated errors', async () => {
  const { editor, table } = create({
    onInlineEditRow: async () => {
      throw { fieldErrors: { name: 'Reserved', email: 'Email invalid' } };
    },
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  editor.commitInlineEdit();
  await flush();
  expect(
    document.querySelector('.alteditor-inline-error').textContent
  ).toContain('Reserved');
  expect(document.querySelector('.altEditor-message').textContent).toContain(
    'Email invalid'
  );
  const control = document.querySelector('.alteditor-inline-control');
  expect(control.disabled).toBe(false);
  control.value = 'Ann';
  control.dispatchEvent(new Event('change'));
  expect(control.hasAttribute('aria-invalid')).toBe(false);
  editor.onInlineEditRow = async () => undefined;
  editor.commitInlineEdit();
  await flush();
  expect(table.row(0).data().name).toBe('Ann');
});
