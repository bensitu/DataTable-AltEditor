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

test.each([true, undefined, null, false, '', 'Reserved'])(
  'interprets custom validation result %j and supports correction',
  async (result) => {
    const validate = vi.fn(() => result);
    const save = vi.fn(async () => undefined);
    const { editor, field } = create({
      columns: [{ data: 'name', title: 'Name', editorValidate: validate }],
      onEditRow: save,
    });
    editor.openEditDialog(0);
    await editor._editRowData();
    const valid = result === true || result == null;
    expect(save).toHaveBeenCalledTimes(valid ? 1 : 0);
    expect(validate).toHaveBeenCalledTimes(1);
    if (!valid) {
      expect(field('name').getAttribute('aria-invalid')).toBe('true');
      expect(
        $(editor.modal_selector).find('.altEditor-field-error').text()
      ).toBe(result || 'Invalid field value');
      validate.mockReturnValue(true);
      field('name').value = 'Ann';
      $(field('name')).trigger('input');
      await editor._editRowData();
      expect(save).toHaveBeenCalledTimes(1);
    }
  }
);

test('awaits validators once, isolates their snapshots and prevents persistence until all pass', async () => {
  let resolve;
  const name = vi.fn((value, context) => {
    expect(value).toBe('Ann');
    expect(context.field).toBe('name');
    expect(context.operation).toBe('edit');
    expect(context.originalRowData.name).toBe('Alice');
    context.values.email = 'mutated';
    context.originalRowData.name = 'mutated';
    return new Promise((accept) => {
      resolve = accept;
    });
  });
  const email = vi.fn((_value, context) => {
    expect(context.values.email).toBe('alice@example.com');
    expect(context.originalRowData.name).toBe('Alice');
    return true;
  });
  const save = vi.fn(async () => undefined);
  const { editor, field, table } = create({
    columns: [
      { data: 'name', title: 'Name', editorValidate: name },
      { data: 'email', title: 'Email', editorValidate: email },
    ],
    onEditRow: save,
  });
  editor.openEditDialog(0);
  field('name').value = 'Ann';
  const pending = editor._editRowData();
  await flush();
  editor._editRowData();
  expect(name).toHaveBeenCalledTimes(1);
  expect(email).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
  resolve(true);
  await pending;
  expect(save).toHaveBeenCalledTimes(1);
  expect(table.row(0).data().name).toBe('Ann');
  expect(table.row(0).data().email).toBe('alice@example.com');
});

test.each(['close', 'destroy'])(
  'ignores validation completion after %s',
  async (action) => {
    let resolve;
    const save = vi.fn();
    const { editor, field } = create({
      columns: [
        {
          data: 'name',
          title: 'Name',
          editorValidate: () =>
            new Promise((accept) => {
              resolve = accept;
            }),
        },
      ],
      onEditRow: save,
    });
    editor.openEditDialog(0);
    const pending = editor._editRowData();
    await flush();
    if (action === 'destroy') editor.destroy();
    else {
      editor._handleDialogClosed();
      editor.openAddDialog();
    }
    resolve('Old error');
    await pending;
    expect(save).not.toHaveBeenCalled();
    expect(document.querySelector('.altEditor-field-error')).toBeNull();
    if (action === 'close') expect(field('name').value).toBe('');
  }
);

test('shows validator execution failures globally and preserves native validation priority', async () => {
  const validate = vi.fn(() =>
    Promise.reject('Validation service unavailable')
  );
  const save = vi.fn();
  const { editor, field } = create({
    columns: [
      { data: 'name', title: 'Name', required: true, editorValidate: validate },
    ],
    onAddRow: save,
  });
  editor.openAddDialog();
  await editor._addRowData();
  expect(validate).not.toHaveBeenCalled();
  expect(field('name').getAttribute('aria-invalid')).toBe('true');
  field('name').value = 'Ann';
  await editor._addRowData();
  expect($(editor.modal_selector).find('.altEditor-feedback').text()).toContain(
    'Validation service unavailable'
  );
  validate.mockImplementation(() => {
    throw new Error('Service error');
  });
  await editor._addRowData();
  expect($(editor.modal_selector).find('.altEditor-feedback').text()).toContain(
    'Service error'
  );
  expect(save).not.toHaveBeenCalled();
  expect(editor._submitting).toBe(false);
});

test('validates only editable rendered fields and reports multiple invalid fields', async () => {
  const skipped = vi.fn();
  const { editor } = create({
    data: [
      { name: 'Alice', email: 'alice@example.com', id: 'a', fixed: 'fixed' },
    ],
    columns: [
      { data: 'name', title: 'Name', editorValidate: () => 'Invalid name' },
      {
        data: 'email',
        title: 'Email',
        editorValidate: async () => 'Invalid email',
      },
      { data: 'id', title: 'ID', type: 'hidden', editorValidate: skipped },
      {
        data: 'fixed',
        title: 'Fixed',
        readonly: true,
        editorValidate: skipped,
      },
      {
        data: 'id',
        title: 'Disabled',
        disabled: true,
        editorValidate: skipped,
      },
      {
        data: 'fixed',
        title: 'Omitted',
        editable: false,
        editorValidate: skipped,
      },
    ],
  });
  editor.openEditDialog(0);
  await editor._editRowData();
  expect(skipped).not.toHaveBeenCalled();
  expect($(editor.modal_selector).find('.altEditor-field-error')).toHaveLength(
    2
  );
});

test('inline async validation blocks duplicate submission and permits correction after redraw', async () => {
  let resolve;
  const validate = vi.fn((_value, context) => {
    expect(context.operation).toBe('inline-edit');
    return new Promise((accept) => {
      resolve = accept;
    });
  });
  const save = vi.fn(async () => undefined);
  const { editor, table } = create({
    columns: [{ data: 'name', title: 'Name', editorValidate: validate }],
    onInlineEditRow: save,
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  editor.commitInlineEdit();
  expect(editor.commitInlineEdit()).toBe(false);
  table.draw();
  resolve('Reserved');
  await flush();
  expect(save).not.toHaveBeenCalled();
  const control = document.querySelector('.alteditor-inline-control');
  expect(control.disabled).toBe(false);
  control.value = 'Ann';
  editor.commitInlineEdit();
  resolve(true);
  await flush();
  expect(save).toHaveBeenCalledTimes(1);
  expect(table.row(0).data().name).toBe('Ann');
});
